export type ExpenseCategory =
  | "food"
  | "transport"
  | "accommodation"
  | "entertainment"
  | "shopping"
  | "health"
  | "other";

export interface Expense {
  id: string;
  tripId: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  notes?: string;
  date: string;
  receiptImages: string[];
  paidBy: string;
  splitBetween: SplitParticipant[];
  splitType: "equal" | "percentage" | "custom";
  createdAt: string;
  updatedAt: string;
}

export interface SplitParticipant {
  userId: string;
  userName: string;
  amount: number;
  percentage?: number;
  isPaid: boolean;
  settlementStatus: "pending" | "settled";
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  coverImage?: string;
  isGroup: boolean;
  participants: Participant[];
  createdBy: string;
  inviteCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isOwner: boolean;
  isCurrentUser: boolean;
}

export interface Balance {
  from: string;
  to: string;
  amount: number;
  currency: string;
}

export interface Settlement {
  id: string;
  tripId: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  settledAt: string;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isPro: boolean;
  proExpiresAt?: string;
  proUsage?: ProUsage;
}

export interface ProUsage {
  receiptScans: number;
  receiptScansLimit: number;
  cloudSyncEnabled: boolean;
  lastResetDate: string;
}

export interface AuditLog {
  id: string;
  entityType:
    | "trip"
    | "expense"
    | "settlement"
    | "packingItem"
    | "activityItem";
  entityId: string;
  action: "created" | "updated" | "deleted";
  changes: Record<string, any>;
  timestamp: string;
  userId: string;
}

export interface CurrencyRate {
  code: string;
  name: string;
  rate: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "monthly" | "yearly" | "lifetime";
  features: string[];
}

export interface CustomCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean; // true for built-in, false for custom
  createdAt: string;
}

export interface PackingItem {
  id: string;
  tripId: string;
  name: string;
  category: string;
  packed: boolean;
}

export interface ActivityItem {
  id: string;
  tripId: string;
  description: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}
