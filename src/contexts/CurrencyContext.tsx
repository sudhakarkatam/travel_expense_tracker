import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { firestoreService } from '@/services/firestoreService';
import { storage } from '@/utils/storage';

interface CurrencyContextType {
  defaultCurrency: string;
  setDefaultCurrency: (currency: string) => Promise<void>;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const DEFAULT_CURRENCY_STORAGE_KEY = '@travel_expense_tracker_default_currency';
const FALLBACK_CURRENCY = 'INR';

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [defaultCurrency, setDefaultCurrencyState] = useState<string>(FALLBACK_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);

  // Load default currency from storage
  useEffect(() => {
    const loadDefaultCurrency = async () => {
      try {
        // Try Firestore first if user is logged in
        if (user) {
          const preferences = await firestoreService.getUserPreferences(user.id);
          if (preferences?.defaultCurrency) {
            setDefaultCurrencyState(preferences.defaultCurrency);
            await storage.saveDefaultCurrency(preferences.defaultCurrency);
            setIsLoading(false);
            return;
          }
        }

        // Fallback to AsyncStorage
        const savedCurrency = await storage.getDefaultCurrency();
        if (savedCurrency) {
          setDefaultCurrencyState(savedCurrency);
        }
      } catch (error) {
        console.error('Error loading default currency:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDefaultCurrency();
  }, [user]);

  const setDefaultCurrency = async (currency: string) => {
    try {
      setDefaultCurrencyState(currency);
      await storage.saveDefaultCurrency(currency);

      // Sync to Firestore if user is logged in
      if (user) {
        await firestoreService.saveUserPreferences(user.id, {
          defaultCurrency: currency,
        });
      }
    } catch (error) {
      console.error('Error saving default currency:', error);
    }
  };

  // Don't render children until currency is loaded
  if (isLoading) {
    return null;
  }

  return (
    <CurrencyContext.Provider value={{ defaultCurrency, setDefaultCurrency, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

