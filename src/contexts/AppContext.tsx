import { useState, useEffect, useMemo, useCallback } from "react";
import createContextHook from "@nkzw/create-context-hook";
import {
  Trip,
  Expense,
  User,
  Settlement,
  Balance,
  AuditLog,
  CustomCategory,
  PackingItem,
  ActivityItem,
} from "@/types";
import { storage } from "@/utils/storage";
import { calculateBalances } from "@/utils/splitCalculations";
import { DEFAULT_CATEGORIES } from "@/constants/categories";

export const [AppProvider, useApp] = createContextHook(() => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [
        loadedTrips,
        loadedExpenses,
        loadedUser,
        loadedSettlements,
        loadedAuditLogs,
        loadedCategories,
        loadedPackingItems,
        loadedActivityItems,
      ] = await Promise.all([
        storage.getTrips(),
        storage.getExpenses(),
        storage.getUser(),
        storage.getSettlements(),
        storage.getAuditLogs(),
        storage.getCategories(),
        storage.getPackingItems(),
        storage.getActivityItems(),
      ]);

      setTrips(loadedTrips);
      setExpenses(loadedExpenses);
      setSettlements(loadedSettlements);
      setAuditLogs(loadedAuditLogs);
      setPackingItems(loadedPackingItems);
      setActivityItems(loadedActivityItems);

      // Initialize categories with defaults if none exist
      if (loadedCategories.length === 0) {
        setCategories(DEFAULT_CATEGORIES);
        await storage.saveCategories(DEFAULT_CATEGORIES);
      } else {
        setCategories(loadedCategories);
      }

      if (loadedUser) {
        setUser(loadedUser);
      } else {
        const newUser: User = {
          id: `user_${Date.now()}`,
          name: "Me",
          isPro: false,
        };
        setUser(newUser);
        await storage.saveUser(newUser);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const logAction = useCallback(
    async (
      entityType: "trip" | "expense" | "settlement",
      entityId: string,
      action: "created" | "updated" | "deleted",
      changes: Record<string, any>,
    ) => {
      if (!user) return;

      const auditLog: AuditLog = {
        id: `audit_${Date.now()}`,
        entityType,
        entityId,
        action,
        changes,
        timestamp: new Date().toISOString(),
        userId: user.id,
      };

      const updatedAuditLogs = [...auditLogs, auditLog];
      setAuditLogs(updatedAuditLogs);
      await storage.saveAuditLogs(updatedAuditLogs);
    },
    [auditLogs, user],
  );

  const addTrip = useCallback(
    async (trip: Omit<Trip, "id" | "createdAt" | "updatedAt">) => {
      const newTrip: Trip = {
        ...trip,
        id: `trip_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedTrips = [...trips, newTrip];
      setTrips(updatedTrips);
      await storage.saveTrips(updatedTrips);

      await logAction("trip", newTrip.id, "created", {
        name: newTrip.name,
        destination: newTrip.destination,
      });
      return newTrip;
    },
    [trips, logAction],
  );

  const updateTrip = useCallback(
    async (tripId: string, updates: Partial<Trip>) => {
      const originalTrip = trips.find((t) => t.id === tripId);
      if (!originalTrip) return;

      const updatedTrips = trips.map((trip) =>
        trip.id === tripId
          ? { ...trip, ...updates, updatedAt: new Date().toISOString() }
          : trip,
      );
      setTrips(updatedTrips);
      await storage.saveTrips(updatedTrips);

      await logAction("trip", tripId, "updated", updates);
    },
    [trips, logAction],
  );

  const deleteTrip = useCallback(
    async (tripId: string) => {
      const tripToDelete = trips.find((t) => t.id === tripId);
      const updatedTrips = trips.filter((trip) => trip.id !== tripId);
      const updatedExpenses = expenses.filter(
        (expense) => expense.tripId !== tripId,
      );
      const updatedSettlements = settlements.filter(
        (settlement) => settlement.tripId !== tripId,
      );

      setTrips(updatedTrips);
      setExpenses(updatedExpenses);
      setSettlements(updatedSettlements);

      await Promise.all([
        storage.saveTrips(updatedTrips),
        storage.saveExpenses(updatedExpenses),
        storage.saveSettlements(updatedSettlements),
      ]);

      if (tripToDelete) {
        await logAction("trip", tripId, "deleted", { name: tripToDelete.name });
      }
    },
    [trips, expenses, settlements, logAction],
  );

  const addExpense = useCallback(
    async (expense: Omit<Expense, "id" | "createdAt" | "updatedAt">) => {
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
    },
    [expenses],
  );

  const updateExpense = useCallback(
    async (expenseId: string, updates: Partial<Expense>) => {
      const updatedExpenses = expenses.map((expense) =>
        expense.id === expenseId
          ? { ...expense, ...updates, updatedAt: new Date().toISOString() }
          : expense,
      );
      setExpenses(updatedExpenses);
      await storage.saveExpenses(updatedExpenses);
    },
    [expenses],
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      const updatedExpenses = expenses.filter(
        (expense) => expense.id !== expenseId,
      );
      setExpenses(updatedExpenses);
      await storage.saveExpenses(updatedExpenses);
    },
    [expenses],
  );

  const addSettlement = useCallback(
    async (settlement: Omit<Settlement, "id" | "settledAt">) => {
      const newSettlement: Settlement = {
        ...settlement,
        id: `settlement_${Date.now()}`,
        settledAt: new Date().toISOString(),
      };

      const updatedSettlements = [...settlements, newSettlement];
      setSettlements(updatedSettlements);
      await storage.saveSettlements(updatedSettlements);
      await logAction("settlement", newSettlement.id, "created", settlement);
      return newSettlement;
    },
    [settlements, logAction],
  );

  const updateSettlement = useCallback(
    async (settlementId: string, updates: Partial<Settlement>) => {
      const updatedSettlements = settlements.map((settlement) =>
        settlement.id === settlementId
          ? { ...settlement, ...updates }
          : settlement,
      );
      setSettlements(updatedSettlements);
      await storage.saveSettlements(updatedSettlements);
      await logAction("settlement", settlementId, "updated", updates);
    },
    [settlements, logAction],
  );

  const deleteSettlement = useCallback(
    async (settlementId: string) => {
      const updatedSettlements = settlements.filter(
        (s) => s.id !== settlementId,
      );
      setSettlements(updatedSettlements);
      await storage.saveSettlements(updatedSettlements);
      await logAction("settlement", settlementId, "deleted", {});
    },
    [settlements, logAction],
  );

  const getTrip = useCallback(
    (tripId: string): Trip | undefined => {
      return trips.find((trip) => trip.id === tripId);
    },
    [trips],
  );

  const getTripExpenses = useCallback(
    (tripId: string): Expense[] => {
      return expenses.filter((expense) => expense.tripId === tripId);
    },
    [expenses],
  );

  const getTripBalances = useCallback(
    (tripId: string): Balance[] => {
      const tripExpenses = expenses.filter((e) => e.tripId === tripId);
      const tripSettlements = settlements.filter((s) => s.tripId === tripId);
      return calculateBalances(tripExpenses, tripSettlements);
    },
    [expenses, settlements],
  );

  const updateUser = useCallback(
    async (updates: Partial<User>) => {
      if (!user) return;

      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      await storage.saveUser(updatedUser);
    },
    [user],
  );

  const upgradeToPro = useCallback(
    async (expiresAt?: string) => {
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
    },
    [user],
  );

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
    const daysSinceReset = Math.floor(
      (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24),
    );

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

  const canUseProFeature = useCallback(
    (feature: "receiptScan" | "cloudSync" | "groupTrips" | "aiInsights") => {
      if (!user) return false;
      if (user.isPro) return true;

      const usage = user.proUsage;
      if (!usage) return false;

      switch (feature) {
        case "receiptScan":
          return usage.receiptScans < usage.receiptScansLimit;
        case "cloudSync":
        case "groupTrips":
        case "aiInsights":
          return false;
        default:
          return false;
      }
    },
    [user],
  );

  const addCategory = useCallback(
    async (category: Omit<CustomCategory, "id" | "createdAt">) => {
      const newCategory: CustomCategory = {
        ...category,
        id: `category_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      const updatedCategories = [...categories, newCategory];
      setCategories(updatedCategories);
      await storage.saveCategories(updatedCategories);
      return newCategory;
    },
    [categories],
  );

  const updateCategory = useCallback(
    async (categoryId: string, updates: Partial<CustomCategory>) => {
      const updatedCategories = categories.map((category) =>
        category.id === categoryId ? { ...category, ...updates } : category,
      );
      setCategories(updatedCategories);
      await storage.saveCategories(updatedCategories);
    },
    [categories],
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      const categoryToDelete = categories.find((c) => c.id === categoryId);
      if (categoryToDelete?.isDefault) {
        throw new Error("Cannot delete default categories");
      }

      const updatedCategories = categories.filter(
        (category) => category.id !== categoryId,
      );
      setCategories(updatedCategories);
      await storage.saveCategories(updatedCategories);
    },
    [categories],
  );

  // Packing Items
  const addPackingItem = useCallback(
    async (item: PackingItem) => {
      const updatedItems = [...packingItems, item];
      setPackingItems(updatedItems);
      await storage.savePackingItems(updatedItems);
    },
    [packingItems],
  );

  const updatePackingItem = useCallback(
    async (item: PackingItem) => {
      const updatedItems = packingItems.map((i) =>
        i.id === item.id ? item : i,
      );
      setPackingItems(updatedItems);
      await storage.savePackingItems(updatedItems);
    },
    [packingItems],
  );

  const deletePackingItem = useCallback(
    async (itemId: string) => {
      const updatedItems = packingItems.filter((i) => i.id !== itemId);
      setPackingItems(updatedItems);
      await storage.savePackingItems(updatedItems);
    },
    [packingItems],
  );

  const getTripPackingItems = useCallback(
    (tripId: string): PackingItem[] => {
      return packingItems.filter((item) => item.tripId === tripId);
    },
    [packingItems],
  );

  // Activity Items
  const addActivityItem = useCallback(
    async (item: ActivityItem) => {
      const updatedItems = [...activityItems, item];
      setActivityItems(updatedItems);
      await storage.saveActivityItems(updatedItems);
    },
    [activityItems],
  );

  const updateActivityItem = useCallback(
    async (item: ActivityItem) => {
      const updatedItems = activityItems.map((i) =>
        i.id === item.id ? item : i,
      );
      setActivityItems(updatedItems);
      await storage.saveActivityItems(updatedItems);
    },
    [activityItems],
  );

  const deleteActivityItem = useCallback(
    async (itemId: string) => {
      const updatedItems = activityItems.filter((i) => i.id !== itemId);
      setActivityItems(updatedItems);
      await storage.saveActivityItems(updatedItems);
    },
    [activityItems],
  );

  const getTripActivityItems = useCallback(
    (tripId: string): ActivityItem[] => {
      return activityItems.filter((item) => item.tripId === tripId);
    },
    [activityItems],
  );

  return useMemo(
    () => ({
      trips,
      expenses,
      settlements,
      auditLogs,
      categories,
      user,
      isLoading,
      addTrip,
      updateTrip,
      deleteTrip,
      addExpense,
      updateExpense,
      deleteExpense,
      addSettlement,
      updateSettlement,
      deleteSettlement,
      addCategory,
      updateCategory,
      deleteCategory,
      getTrip,
      getTripExpenses,
      getTripBalances,
      updateUser,
      upgradeToPro,
      trackReceiptScan,
      canUseProFeature,
      logAction,
      addPackingItem,
      updatePackingItem,
      deletePackingItem,
      getTripPackingItems,
      addActivityItem,
      updateActivityItem,
      deleteActivityItem,
      getTripActivityItems,
    }),
    [
      trips,
      expenses,
      settlements,
      auditLogs,
      categories,
      user,
      isLoading,
      addTrip,
      updateTrip,
      deleteTrip,
      addExpense,
      updateExpense,
      deleteExpense,
      addSettlement,
      updateSettlement,
      deleteSettlement,
      addCategory,
      updateCategory,
      deleteCategory,
      getTrip,
      getTripExpenses,
      getTripBalances,
      updateUser,
      upgradeToPro,
      trackReceiptScan,
      canUseProFeature,
      logAction,
      addPackingItem,
      updatePackingItem,
      deletePackingItem,
      getTripPackingItems,
      addActivityItem,
      updateActivityItem,
      deleteActivityItem,
      getTripActivityItems,
    ],
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
    const percentageUsed =
      trip.budget > 0 ? (totalSpent / trip.budget) * 100 : 0;

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
