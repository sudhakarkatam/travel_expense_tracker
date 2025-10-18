import { useState, useEffect, useMemo, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Trip, Expense, User, Settlement, Balance } from '@/types';
import { storage } from '@/utils/storage';
import { calculateBalances } from '@/utils/balance';

export const [AppProvider, useApp] = createContextHook(() => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [loadedTrips, loadedExpenses, loadedUser, loadedSettlements] = await Promise.all([
        storage.getTrips(),
        storage.getExpenses(),
        storage.getUser(),
        storage.getSettlements(),
      ]);

      setTrips(loadedTrips);
      setExpenses(loadedExpenses);
      setSettlements(loadedSettlements);

      if (loadedUser) {
        setUser(loadedUser);
      } else {
        const newUser: User = {
          id: `user_${Date.now()}`,
          name: 'Me',
          isPro: false,
        };
        setUser(newUser);
        await storage.saveUser(newUser);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTrip = useCallback(async (trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTrip: Trip = {
      ...trip,
      id: `trip_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedTrips = [...trips, newTrip];
    setTrips(updatedTrips);
    await storage.saveTrips(updatedTrips);
    return newTrip;
  }, [trips]);

  const updateTrip = useCallback(async (tripId: string, updates: Partial<Trip>) => {
    const updatedTrips = trips.map(trip =>
      trip.id === tripId
        ? { ...trip, ...updates, updatedAt: new Date().toISOString() }
        : trip
    );
    setTrips(updatedTrips);
    await storage.saveTrips(updatedTrips);
  }, [trips]);

  const deleteTrip = useCallback(async (tripId: string) => {
    const updatedTrips = trips.filter(trip => trip.id !== tripId);
    const updatedExpenses = expenses.filter(expense => expense.tripId !== tripId);
    const updatedSettlements = settlements.filter(settlement => settlement.tripId !== tripId);

    setTrips(updatedTrips);
    setExpenses(updatedExpenses);
    setSettlements(updatedSettlements);

    await Promise.all([
      storage.saveTrips(updatedTrips),
      storage.saveExpenses(updatedExpenses),
      storage.saveSettlements(updatedSettlements),
    ]);
  }, [trips, expenses, settlements]);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newExpense: Expense = {
      ...expense,
      id: `expense_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedExpenses = [...expenses, newExpense];
    setExpenses(updatedExpenses);
    await storage.saveExpenses(updatedExpenses);
    return newExpense;
  }, [expenses]);

  const updateExpense = useCallback(async (expenseId: string, updates: Partial<Expense>) => {
    const updatedExpenses = expenses.map(expense =>
      expense.id === expenseId
        ? { ...expense, ...updates, updatedAt: new Date().toISOString() }
        : expense
    );
    setExpenses(updatedExpenses);
    await storage.saveExpenses(updatedExpenses);
  }, [expenses]);

  const deleteExpense = useCallback(async (expenseId: string) => {
    const updatedExpenses = expenses.filter(expense => expense.id !== expenseId);
    setExpenses(updatedExpenses);
    await storage.saveExpenses(updatedExpenses);
  }, [expenses]);

  const addSettlement = useCallback(async (settlement: Omit<Settlement, 'id' | 'settledAt'>) => {
    const newSettlement: Settlement = {
      ...settlement,
      id: `settlement_${Date.now()}`,
      settledAt: new Date().toISOString(),
    };

    const updatedSettlements = [...settlements, newSettlement];
    setSettlements(updatedSettlements);
    await storage.saveSettlements(updatedSettlements);
    return newSettlement;
  }, [settlements]);

  const getTrip = useCallback((tripId: string): Trip | undefined => {
    return trips.find(trip => trip.id === tripId);
  }, [trips]);

  const getTripExpenses = useCallback((tripId: string): Expense[] => {
    return expenses.filter(expense => expense.tripId === tripId);
  }, [expenses]);

  const getTripBalances = useCallback((tripId: string): Balance[] => {
    return calculateBalances(expenses, settlements, tripId);
  }, [expenses, settlements]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    await storage.saveUser(updatedUser);
  }, [user]);

  const upgradeToPro = useCallback(async (expiresAt?: string) => {
    if (!user) return;
    
    const updatedUser: User = {
      ...user,
      isPro: true,
      proExpiresAt: expiresAt,
      proUsage: {
        receiptScans: 0,
        receiptScansLimit: 999999,
        cloudSyncEnabled: true,
        lastResetDate: new Date().toISOString(),
      },
    };
    setUser(updatedUser);
    await storage.saveUser(updatedUser);
  }, [user]);

  const trackReceiptScan = useCallback(async () => {
    if (!user) return false;

    const usage = user.proUsage || {
      receiptScans: 0,
      receiptScansLimit: user.isPro ? 999999 : 5,
      cloudSyncEnabled: user.isPro,
      lastResetDate: new Date().toISOString(),
    };

    const now = new Date();
    const lastReset = new Date(usage.lastResetDate);
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

    if (!user.isPro && daysSinceReset >= 30) {
      usage.receiptScans = 0;
      usage.lastResetDate = now.toISOString();
    }

    if (usage.receiptScans >= usage.receiptScansLimit) {
      return false;
    }

    usage.receiptScans++;
    const updatedUser = { ...user, proUsage: usage };
    setUser(updatedUser);
    await storage.saveUser(updatedUser);
    return true;
  }, [user]);

  const canUseProFeature = useCallback((feature: 'receiptScan' | 'cloudSync' | 'groupTrips' | 'aiInsights') => {
    if (!user) return false;
    if (user.isPro) return true;

    const usage = user.proUsage;
    if (!usage) return false;

    switch (feature) {
      case 'receiptScan':
        return usage.receiptScans < usage.receiptScansLimit;
      case 'cloudSync':
      case 'groupTrips':
      case 'aiInsights':
        return false;
      default:
        return false;
    }
  }, [user]);

  return useMemo(
    () => ({
      trips,
      expenses,
      settlements,
      user,
      isLoading,
      addTrip,
      updateTrip,
      deleteTrip,
      addExpense,
      updateExpense,
      deleteExpense,
      addSettlement,
      getTrip,
      getTripExpenses,
      getTripBalances,
      updateUser,
      upgradeToPro,
      trackReceiptScan,
      canUseProFeature,
    }),
    [
      trips,
      expenses,
      settlements,
      user,
      isLoading,
      addTrip,
      updateTrip,
      deleteTrip,
      addExpense,
      updateExpense,
      deleteExpense,
      addSettlement,
      getTrip,
      getTripExpenses,
      getTripBalances,
      updateUser,
      upgradeToPro,
      trackReceiptScan,
      canUseProFeature,
    ]
  );
});

export function useTripData(tripId: string | undefined) {
  const { getTrip, getTripExpenses, getTripBalances } = useApp();

  return useMemo(() => {
    if (!tripId) return null;

    const trip = getTrip(tripId);
    if (!trip) return null;

    const expenses = getTripExpenses(tripId);
    const balances = getTripBalances(tripId);
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = trip.budget - totalSpent;
    const percentageUsed = trip.budget > 0 ? (totalSpent / trip.budget) * 100 : 0;

    return {
      trip,
      expenses,
      balances,
      totalSpent,
      remaining,
      percentageUsed,
    };
  }, [tripId, getTrip, getTripExpenses, getTripBalances]);
}
