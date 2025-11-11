import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Trip,
  Expense,
  User,
  Settlement,
  AuditLog,
  CustomCategory,
  PackingItem,
  ActivityItem,
} from "@/types";

const KEYS = {
  TRIPS: "@tripwallet_trips",
  EXPENSES: "@tripwallet_expenses",
  USER: "@tripwallet_user",
  SETTLEMENTS: "@tripwallet_settlements",
  AUDIT_LOGS: "@tripwallet_audit_logs",
  CURRENCY_RATES: "@tripwallet_currency_rates",
  CATEGORIES: "@tripwallet_categories",
  PACKING_ITEMS: "@tripwallet_packing_items", // New key for packing items
  ACTIVITY_ITEMS: "@tripwallet_activity_items", // New key for activity items
} as const;

export const storage = {
  async getTrips(): Promise<Trip[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.TRIPS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading trips:", error);
      return [];
    }
  },

  async saveTrips(trips: Trip[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.TRIPS, JSON.stringify(trips));
    } catch (error) {
      console.error("Error saving trips:", error);
    }
  },

  async getExpenses(): Promise<Expense[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.EXPENSES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading expenses:", error);
      return [];
    }
  },

  async saveExpenses(expenses: Expense[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (error) {
      console.error("Error saving expenses:", error);
    }
  },

  async getUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error loading user:", error);
      return null;
    }
  },

  async saveUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error("Error saving user:", error);
    }
  },

  async getSettlements(): Promise<Settlement[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SETTLEMENTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading settlements:", error);
      return [];
    }
  },

  async saveSettlements(settlements: Settlement[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SETTLEMENTS, JSON.stringify(settlements));
    } catch (error) {
      console.error("Error saving settlements:", error);
    }
  },

  async getCurrencyRates(): Promise<Record<string, number> | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CURRENCY_RATES);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error loading currency rates:", error);
      return null;
    }
  },

  async saveCurrencyRates(rates: Record<string, number>): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CURRENCY_RATES, JSON.stringify(rates));
    } catch (error) {
      console.error("Error saving currency rates:", error);
    }
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.AUDIT_LOGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading audit logs:", error);
      return [];
    }
  },

  async saveAuditLogs(auditLogs: AuditLog[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
    } catch (error) {
      console.error("Error saving audit logs:", error);
    }
  },

  async getCategories(): Promise<CustomCategory[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CATEGORIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading categories:", error);
      return [];
    }
  },

  async saveCategories(categories: CustomCategory[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (error) {
      console.error("Error saving categories:", error);
    }
  },

  // Packing Items
  async getPackingItems(): Promise<PackingItem[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PACKING_ITEMS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading packing items:", error);
      return [];
    }
  },

  async savePackingItems(packingItems: PackingItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        KEYS.PACKING_ITEMS,
        JSON.stringify(packingItems),
      );
    } catch (error) {
      console.error("Error saving packing items:", error);
    }
  },

  // Activity Items
  async getActivityItems(): Promise<ActivityItem[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.ACTIVITY_ITEMS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading activity items:", error);
      return [];
    }
  },

  async saveActivityItems(activityItems: ActivityItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        KEYS.ACTIVITY_ITEMS,
        JSON.stringify(activityItems),
      );
    } catch (error) {
      console.error("Error saving activity items:", error);
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(KEYS));
    } catch (error) {
      console.error("Error clearing storage:", error);
    }
  },
};
