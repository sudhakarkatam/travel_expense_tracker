import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { firestoreService } from '@/services/firestoreService';
import { storage } from '@/utils/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@travel_expense_tracker_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const { user } = useAuth();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference from storage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        // Try Firestore first if user is logged in
        if (user) {
          const preferences = await firestoreService.getUserPreferences(user.id);
          if (preferences?.themePreference && 
              (preferences.themePreference === 'system' || 
               preferences.themePreference === 'light' || 
               preferences.themePreference === 'dark')) {
            setThemeModeState(preferences.themePreference as ThemeMode);
            await storage.saveThemePreference(preferences.themePreference as ThemeMode);
            setIsLoading(false);
            return;
          }
        }

        // Fallback to AsyncStorage
        const savedTheme = await storage.getThemePreference();
        if (savedTheme) {
          setThemeModeState(savedTheme);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, [user]);

  // Determine if dark mode should be used
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await storage.saveThemePreference(mode);

      // Sync to Firestore if user is logged in
      if (user) {
        await firestoreService.saveUserPreferences(user.id, {
          themePreference: mode,
        });
      }
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Don't render children until theme is loaded to prevent flash
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
}

