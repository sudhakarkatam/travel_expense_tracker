import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = '@travel_expenses_auth';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'google' | 'email';
  isPro: boolean;
  proExpiresAt?: string;
}

export const authService = {
  async signInWithGoogle(): Promise<AuthUser> {
    console.log('Google Sign In initiated');
    
    const mockUser: AuthUser = {
      id: `google_${Date.now()}`,
      name: 'Google User',
      email: 'user@gmail.com',
      provider: 'google',
      isPro: false,
    };

    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));
    return mockUser;
  },

  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    console.log('Email Sign In:', email);
    
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const mockUser: AuthUser = {
      id: `email_${Date.now()}`,
      name: email.split('@')[0],
      email,
      provider: 'email',
      isPro: false,
    };

    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));
    return mockUser;
  },

  async signUp(email: string, password: string, name: string): Promise<AuthUser> {
    console.log('Sign Up:', email, name);
    
    if (!email || !password || !name) {
      throw new Error('All fields are required');
    }

    const mockUser: AuthUser = {
      id: `email_${Date.now()}`,
      name,
      email,
      provider: 'email',
      isPro: false,
    };

    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));
    return mockUser;
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const userData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  async signOut(): Promise<void> {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  },

  async updateProfile(updates: Partial<AuthUser>): Promise<void> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) throw new Error('No user signed in');
    
    const updatedUser = { ...currentUser, ...updates };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
  },
};
