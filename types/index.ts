export type ExpenseCategory = 
  | 'food'
  | 'transport'
  | 'accommodation'
  | 'entertainment'
  | 'shopping'
  | 'health'
  | 'other';

export interface Expense {
  id: string;
  tripId: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  date: string;
  photos: string[];
  paidBy: string;
  splitBetween: SplitParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface SplitParticipant {
  userId: string;
  userName: string;
  amount: number;
  isPaid: boolean;
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
  interval: 'monthly' | 'yearly' | 'lifetime';
  features: string[];
}
