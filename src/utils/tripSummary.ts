import { Trip, Expense } from '@/types';

export interface TripSummary {
  trip: Trip;
  expenses: Expense[];
  totalSpent: number;
  remainingBudget: number;
  categoryBreakdown: Record<string, number>;
}

export const generateTripSummary = (trip: Trip, expenses: Expense[]): TripSummary => {
  const tripExpenses = expenses
    .filter(expense => expense.tripId === trip.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Latest first
  
  const totalSpent = tripExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remainingBudget = trip.budget - totalSpent;
  
  const categoryBreakdown = tripExpenses.reduce((breakdown, expense) => {
    const category = expense.category || 'Other';
    breakdown[category] = (breakdown[category] || 0) + expense.amount;
    return breakdown;
  }, {} as Record<string, number>);

  return {
    trip,
    expenses: tripExpenses,
    totalSpent,
    remainingBudget,
    categoryBreakdown,
  };
};

export const generateAllTripsSummary = (trips: Trip[], expenses: Expense[]): TripSummary[] => {
  return trips.map(trip => generateTripSummary(trip, expenses));
};
