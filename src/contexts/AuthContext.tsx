import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { authService, AuthUser } from '@/services/auth';
import { storage } from '@/utils/storage';
import { firestoreService } from '@/services/firestoreService';

const AUTH_STORAGE_KEY = '@travel_expenses_auth';
const GUEST_MODE_KEY = '@travel_expenses_guest_mode';

interface AuthContextType {
  user: AuthUser | null;
  isGuest: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setGuestMode: () => Promise<void>;
  clearGuestMode: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
    
    // Listen for auth state changes
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsGuest(false);
        // Ensure guest mode is cleared when user logs in
        await storage.setGuestMode(false);
        // Trigger data reload by updating state
        console.log('[AuthContext] Auth state changed - user logged in');
      } else {
        // Check if guest mode
        const isGuest = await storage.getGuestMode();
        setIsGuest(isGuest);
        setUser(null);
        console.log('[AuthContext] Auth state changed - user logged out, guest mode:', isGuest);
      }
    });

    return () => unsubscribe();
  }, []);

  const checkAuthState = async () => {
    try {
      const [firebaseUser, guestMode] = await Promise.all([
        authService.getCurrentUser(),
        storage.getGuestMode(),
      ]);

      if (firebaseUser) {
        setUser(firebaseUser);
        setIsGuest(false);
      } else if (guestMode) {
        setIsGuest(true);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAllLocalData = async () => {
    return {
      trips: await storage.getTrips(),
      expenses: await storage.getExpenses(),
      packingItems: await storage.getPackingItems(),
      activityItems: await storage.getActivityItems(),
      settlements: await storage.getSettlements(),
      categories: await storage.getCategories(),
      auditLogs: await storage.getAuditLogs(),
    };
  };

  const loadCloudData = async (userId: string) => {
    try {
      const cloudData = await firestoreService.loadAllDataFromCloud(userId);
      
      // Save to local storage
      await Promise.all([
        storage.saveTrips(cloudData.trips),
        storage.saveExpenses(cloudData.expenses),
        storage.savePackingItems(cloudData.packingItems),
        storage.saveActivityItems(cloudData.activityItems),
        storage.saveSettlements(cloudData.settlements),
        storage.saveCategories(cloudData.categories),
        storage.saveAuditLogs(cloudData.auditLogs),
      ]);
    } catch (error) {
      console.error('Error loading cloud data:', error);
      throw error;
    }
  };

  const handleLoginWithSync = async (firebaseUser: AuthUser): Promise<void> => {
    // Check if there's local guest data
    const localTrips = await storage.getTrips();
    const hasLocalData = localTrips.length > 0;

    if (hasLocalData) {
      // Show sync prompt
      return new Promise<void>((resolve, reject) => {
        Alert.alert(
          'Sync Your Data?',
          'Would you like to sync your current data to your account?',
          [
            {
              text: 'No, Start Fresh',
              style: 'destructive',
              onPress: async () => {
                try {
                  // Clear local data
                  await storage.clearAllData();
                  // Load cloud data
                  await loadCloudData(firebaseUser.id);
                  setUser(firebaseUser);
                  setIsGuest(false);
                  await storage.setGuestMode(false);
                  resolve();
                } catch (error) {
                  reject(error);
                }
              },
            },
            {
              text: 'Yes, Sync Data',
              onPress: async () => {
                try {
                  // Merge guest data into Firestore
                  const localData = await getAllLocalData();
                  await firestoreService.mergeGuestData(firebaseUser.id, localData);
                  // Load merged data
                  await loadCloudData(firebaseUser.id);
                  setUser(firebaseUser);
                  setIsGuest(false);
                  await storage.setGuestMode(false);
                  resolve();
                } catch (error) {
                  reject(error);
                }
              },
            },
          ],
          { cancelable: false }
        );
      });
    } else {
      // No local data, just load cloud data
      await loadCloudData(firebaseUser.id);
      setUser(firebaseUser);
      setIsGuest(false);
      await storage.setGuestMode(false);
    }
  };

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const firebaseUser = await authService.signInWithEmail(email, password);
      await handleLoginWithSync(firebaseUser);
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      const firebaseUser = await authService.signUp(email, password, name);
      
      // For new signups, merge any guest data if it exists
      const localData = await getAllLocalData();
      if (localData.trips.length > 0 || localData.expenses.length > 0) {
        // Automatically merge guest data for new signups
        await firestoreService.mergeGuestData(firebaseUser.id, localData);
        await loadCloudData(firebaseUser.id);
      }
      
      setUser(firebaseUser);
      setIsGuest(false);
      await storage.setGuestMode(false);
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to sign up');
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const firebaseUser = await authService.signInWithGoogle();
      await handleLoginWithSync(firebaseUser);
    } catch (error: any) {
      console.error('Google sign in error:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
      setUser(null);
      setIsGuest(false);
      await storage.setGuestMode(false);
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  }, []);

  const setGuestMode = useCallback(async () => {
    await storage.setGuestMode(true);
    setIsGuest(true);
    setUser(null);
  }, []);

  const clearGuestMode = useCallback(async () => {
    await storage.setGuestMode(false);
    setIsGuest(false);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await authService.resetPassword(email);
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        isLoading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        setGuestMode,
        clearGuestMode,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

