import { Trip, Expense } from '@/types';

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  color: string;
}

export interface SpendingTrend {
  date: string;
  amount: number;
  dayOfWeek: string;
}

export interface TripComparison {
  tripId: string;
  tripName: string;
  destination: string;
  totalSpent: number;
  budget: number;
  avgPerDay: number;
  duration: number;
  remainingBudget: number;
  percentageUsed: number;
}

export interface BudgetUtilization {
  tripId: string;
  tripName: string;
  used: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

export interface ParticipantSpending {
  participantId: string;
  participantName: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
  expenseCount: number;
  avgExpense: number;
}

export interface TopExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  tripName: string;
}

export interface SpendingInsight {
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success';
  value?: number;
  icon: string;
}

const CATEGORY_COLORS = {
  food: '#ef4444',
  transport: '#22c55e',
  accommodation: '#6366f1',
  entertainment: '#f59e0b',
  shopping: '#ec4899',
  health: '#06b6d4',
  other: '#6b7280',
};

export function getCategoryBreakdown(expenses: Expense[]): CategoryBreakdown[] {
  const categoryTotals: Record<string, { amount: number; count: number }> = {};
  
  expenses.forEach(expense => {
    if (!categoryTotals[expense.category]) {
      categoryTotals[expense.category] = { amount: 0, count: 0 };
    }
    categoryTotals[expense.category].amount += expense.amount;
    categoryTotals[expense.category].count += 1;
  });

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return Object.entries(categoryTotals)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      count: data.count,
      color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#6b7280',
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getSpendingTrend(
  expenses: Expense[], 
  period: 'daily' | 'weekly' | 'monthly' = 'daily',
  days: number = 30
): SpendingTrend[] {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const dateMap: Record<string, number> = {};
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Initialize date map
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dateMap[dateKey] = 0;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Aggregate expenses by date
  expenses.forEach(expense => {
    const expenseDate = new Date(expense.date);
    if (expenseDate >= startDate && expenseDate <= endDate) {
      const dateKey = expense.date;
      if (dateMap[dateKey] !== undefined) {
        dateMap[dateKey] += expense.amount;
      }
    }
  });

  // Convert to array and format
  return Object.entries(dateMap)
    .map(([date, amount]) => ({
      date,
      amount,
      dayOfWeek: dayNames[new Date(date).getDay()],
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getTopExpenses(expenses: Expense[], limit: number = 5): TopExpense[] {
  return expenses
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map(expense => ({
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      tripName: 'Unknown Trip', // Will be populated by caller
    }));
}

export function getTripComparison(trips: Trip[], expenses: Expense[]): TripComparison[] {
  return trips.map(trip => {
    const tripExpenses = expenses.filter(expense => expense.tripId === trip.id);
    const totalSpent = tripExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const duration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const avgPerDay = totalSpent / duration;
    
    return {
      tripId: trip.id,
      tripName: trip.name,
      destination: trip.destination,
      totalSpent,
      budget: trip.budget,
      avgPerDay,
      duration,
      remainingBudget: trip.budget - totalSpent,
      percentageUsed: trip.budget > 0 ? (totalSpent / trip.budget) * 100 : 0,
    };
  });
}

export function getBudgetUtilization(trips: Trip[], expenses: Expense[]): BudgetUtilization[] {
  return trips.map(trip => {
    const tripExpenses = expenses.filter(expense => expense.tripId === trip.id);
    const used = tripExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const remaining = trip.budget - used;
    const percentage = trip.budget > 0 ? (used / trip.budget) * 100 : 0;
    
    return {
      tripId: trip.id,
      tripName: trip.name,
      used,
      remaining,
      percentage,
      isOverBudget: used > trip.budget,
    };
  });
}

export function getParticipantSpending(expenses: Expense[]): ParticipantSpending[] {
  const participantMap: Record<string, {
    totalPaid: number;
    totalOwed: number;
    expenseCount: number;
    participantName: string;
  }> = {};

  expenses.forEach(expense => {
    // Track who paid
    if (!participantMap[expense.paidBy]) {
      participantMap[expense.paidBy] = {
        totalPaid: 0,
        totalOwed: 0,
        expenseCount: 0,
        participantName: 'Unknown',
      };
    }
    participantMap[expense.paidBy].totalPaid += expense.amount;
    participantMap[expense.paidBy].expenseCount += 1;

    // Track who owes
    expense.splitBetween.forEach(split => {
      if (!participantMap[split.userId]) {
        participantMap[split.userId] = {
          totalPaid: 0,
          totalOwed: 0,
          expenseCount: 0,
          participantName: split.userName,
        };
      }
      participantMap[split.userId].totalOwed += split.amount;
    });
  });

  return Object.entries(participantMap).map(([participantId, data]) => ({
    participantId,
    participantName: data.participantName,
    totalPaid: data.totalPaid,
    totalOwed: data.totalOwed,
    netBalance: data.totalOwed - data.totalPaid,
    expenseCount: data.expenseCount,
    avgExpense: data.expenseCount > 0 ? data.totalPaid / data.expenseCount : 0,
  }));
}

export function getSpendingInsights(trips: Trip[], expenses: Expense[]): SpendingInsight[] {
  const insights: SpendingInsight[] = [];
  
  if (trips.length === 0) {
    insights.push({
      title: 'No Trips Yet',
      description: 'Create your first trip to start tracking expenses',
      type: 'info',
      icon: 'airplane-outline',
    });
    return insights;
  }

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const avgExpensePerTrip = trips.length > 0 ? totalSpent / trips.length : 0;
  const categoryBreakdown = getCategoryBreakdown(expenses);
  const topCategory = categoryBreakdown[0];

  // Total spending insight
  insights.push({
    title: 'Total Spent',
    description: `Across ${trips.length} trip${trips.length !== 1 ? 's' : ''}`,
    type: 'info',
    value: totalSpent,
    icon: 'wallet-outline',
  });

  // Average per trip
  if (avgExpensePerTrip > 0) {
    insights.push({
      title: 'Average per Trip',
      description: 'Average spending per trip',
      type: 'info',
      value: avgExpensePerTrip,
      icon: 'calculator-outline',
    });
  }

  // Top spending category
  if (topCategory && topCategory.amount > 0) {
    insights.push({
      title: 'Top Category',
      description: `${topCategory.category} (${topCategory.percentage.toFixed(1)}%)`,
      type: 'info',
      value: topCategory.amount,
      icon: 'pie-chart-outline',
    });
  }

  // Budget utilization insights
  const budgetUtilization = getBudgetUtilization(trips, expenses);
  const overBudgetTrips = budgetUtilization.filter(trip => trip.isOverBudget);
  
  if (overBudgetTrips.length > 0) {
    insights.push({
      title: 'Over Budget',
      description: `${overBudgetTrips.length} trip${overBudgetTrips.length !== 1 ? 's' : ''} exceeded budget`,
      type: 'warning',
      icon: 'warning-outline',
    });
  }

  // Spending trend insight
  const spendingTrend = getSpendingTrend(expenses, 'daily', 7);
  const recentSpending = spendingTrend.slice(-7).reduce((sum, day) => sum + day.amount, 0);
  const previousSpending = spendingTrend.slice(-14, -7).reduce((sum, day) => sum + day.amount, 0);
  
  if (recentSpending > previousSpending * 1.2) {
    insights.push({
      title: 'Spending Increase',
      description: 'Recent spending is 20% higher than previous week',
      type: 'warning',
      icon: 'trending-up-outline',
    });
  } else if (recentSpending < previousSpending * 0.8) {
    insights.push({
      title: 'Spending Decrease',
      description: 'Great job! Spending is down compared to last week',
      type: 'success',
      icon: 'trending-down-outline',
    });
  }

  return insights;
}

export function getMonthlySpending(expenses: Expense[]): Record<string, number> {
  const monthlyTotals: Record<string, number> = {};
  
  expenses.forEach(expense => {
    const date = new Date(expense.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = 0;
    }
    monthlyTotals[monthKey] += expense.amount;
  });

  return monthlyTotals;
}

export function getDailySpending(expenses: Expense[], days: number = 30): Record<string, number> {
  const dailyTotals: Record<string, number> = {};
  
  expenses.forEach(expense => {
    if (dailyTotals[expense.date]) {
      dailyTotals[expense.date] += expense.amount;
    } else {
      dailyTotals[expense.date] = expense.amount;
    }
  });

  return dailyTotals;
}
