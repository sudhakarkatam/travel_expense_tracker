import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
  User as FirebaseUser,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'google' | 'email';
  isPro: boolean;
  proExpiresAt?: string;
}

// Convert Firebase user to app user
const mapFirebaseUser = (firebaseUser: FirebaseUser): AuthUser => {
  const providerId = firebaseUser.providerData[0]?.providerId || '';
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    email: firebaseUser.email || '',
    avatar: firebaseUser.photoURL || undefined,
    provider: providerId === 'google.com' ? 'google' : 'email',
    isPro: false, // Will be fetched from Firestore user document
  };
};

// Google OAuth configuration
const GOOGLE_CONFIG = {
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // TODO: Add iOS Client ID when available
  androidClientId: '476433030379-gdk7c6in9hub4d6osq92fh1q29pi85hi.apps.googleusercontent.com',
  webClientId: '476433030379-0fkr9offkkujnmfg000et5apssavdphe.apps.googleusercontent.com',
};

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: GOOGLE_CONFIG.webClientId, // Required for getting idToken on Android
  offlineAccess: true, // If you want to access Google API on behalf of the user FROM YOUR SERVER
  forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
  iosClientId: GOOGLE_CONFIG.iosClientId, // [iOS] if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
});

export const authService = {
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return mapFirebaseUser(userCredential.user);
    } catch (error: any) {
      const errorMessage = error.code === 'auth/user-not-found'
        ? 'No account found with this email'
        : error.code === 'auth/wrong-password'
        ? 'Incorrect password'
        : error.code === 'auth/invalid-email'
        ? 'Invalid email address'
        : error.message || 'Failed to sign in';
      throw new Error(errorMessage);
    }
  },

  async signUp(email: string, password: string, name: string): Promise<AuthUser> {
    try {
      if (!email || !password || !name) {
        throw new Error('All fields are required');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      if (name) {
        await firebaseUpdateProfile(userCredential.user, { displayName: name });
      }

      return mapFirebaseUser(userCredential.user);
    } catch (error: any) {
      const errorMessage = error.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists'
        : error.code === 'auth/invalid-email'
        ? 'Invalid email address'
        : error.code === 'auth/weak-password'
        ? 'Password is too weak'
        : error.message || 'Failed to sign up';
      throw new Error(errorMessage);
    }
  },

  async signInWithGoogle(): Promise<AuthUser> {
    try {
      if (Platform.OS === 'web') {
        // Web: Use Firebase's built-in Google provider
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        return mapFirebaseUser(result.user);
      } else {
        // Mobile: Use native Google Sign-In SDK
        // This provides better reliability and native experience
        
        console.log('[Auth] ============================================');
        console.log('[Auth] Starting native Google Sign-In...');
        console.log('[Auth] Platform:', Platform.OS);
        console.log('[Auth] Android Client ID:', GOOGLE_CONFIG.androidClientId);
        console.log('[Auth] Web Client ID:', GOOGLE_CONFIG.webClientId);
        console.log('[Auth] ============================================');
        
        try {
          // Check if Google Play Services are available
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          
          // Sign in with Google
          const userInfo = await GoogleSignin.signIn();
          
          if (!userInfo.idToken) {
            console.error('[Auth] ❌ No ID token received from Google Sign-In');
            throw new Error('No ID token received from Google. Please try again.');
          }
          
          console.log('[Auth] ✅ ID token received, creating Firebase credential...');
          console.log('[Auth] User info:', {
            email: userInfo.user.email,
            name: userInfo.user.name,
          });
          
          // Create Firebase credential using the ID token
          const credential = GoogleAuthProvider.credential(userInfo.idToken);
          
          // Sign in with Firebase
          const userCredential = await signInWithCredential(auth, credential);
          console.log('[Auth] ✅ Successfully signed in with Google');
          return mapFirebaseUser(userCredential.user);
        } catch (error: any) {
          console.error('[Auth] ❌ Google Sign-In error:', error);
          
          // Handle specific error codes
          if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            throw new Error('Google Sign-In was cancelled');
          } else if (error.code === statusCodes.IN_PROGRESS) {
            throw new Error('Google Sign-In is already in progress');
          } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            throw new Error('Google Play Services not available. Please update Google Play Services.');
          } else if (error.code === statusCodes.DEVELOPER_ERROR || error.message?.includes('DEVELOPER_ERROR')) {
            // DEVELOPER_ERROR typically means SHA-1 fingerprint is not configured
            const errorMsg = 'Google Sign-In configuration error. This usually means the SHA-1 fingerprint is not configured in Firebase Console.\n\n' +
              'To fix this:\n' +
              '1. Get your SHA-1 fingerprint:\n' +
              '   - Debug: keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android\n' +
              '   - Release: keytool -list -v -keystore YOUR_RELEASE_KEYSTORE -alias YOUR_ALIAS\n' +
              '2. Add the SHA-1 to Firebase Console > Project Settings > Your Android App\n' +
              '3. Download the updated google-services.json\n' +
              '4. Rebuild the app\n\n' +
              'For more details: https://react-native-google-signin.github.io/docs/troubleshooting';
            throw new Error(errorMsg);
          } else {
            // Provide more helpful error message
            const errorMsg = error.message || 'Failed to sign in with Google';
            if (errorMsg.includes('DEVELOPER_ERROR')) {
              throw new Error('Google Sign-In configuration error. Please check Firebase Console settings and SHA-1 fingerprint configuration.');
            }
            throw new Error(errorMsg);
          }
        }
      }
    } catch (error: any) {
      const errorMessage = error.code === 'auth/popup-closed-by-user' || 
                          error.message?.includes('cancelled') ||
                          error.message?.includes('dismissed')
        ? 'Sign-in was cancelled'
        : error.message || 'Failed to sign in with Google';
      throw new Error(errorMessage);
    }
  },

  async signOut(): Promise<void> {
    try {
      // Sign out from Google Sign-In if signed in with Google
      try {
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (isSignedIn) {
          await GoogleSignin.signOut();
        }
      } catch (googleError) {
        // Ignore Google Sign-In sign out errors (user might not be signed in with Google)
        console.log('[Auth] Google Sign-In sign out skipped:', googleError);
      }
      
      // Sign out from Firebase
      await firebaseSignOut(auth);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out');
    }
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const firebaseUser = auth.currentUser;
      return firebaseUser ? mapFirebaseUser(firebaseUser) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  async updateProfile(updates: { name?: string; avatar?: string }): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No user signed in');

      const profileUpdates: { displayName?: string; photoURL?: string } = {};
      if (updates.name) profileUpdates.displayName = updates.name;
      if (updates.avatar) profileUpdates.photoURL = updates.avatar;

      await firebaseUpdateProfile(currentUser, profileUpdates);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update profile');
    }
  },

  onAuthStateChanged(callback: (user: AuthUser | null) => void) {
    return onAuthStateChanged(auth, (firebaseUser) => {
      callback(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
    });
  },

  async resetPassword(email: string): Promise<void> {
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      const errorMessage = error.code === 'auth/user-not-found'
        ? 'No account found with this email'
        : error.message || 'Failed to send password reset email';
      throw new Error(errorMessage);
    }
  },
};
