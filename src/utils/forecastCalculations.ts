import { Expense } from '@/types';

export interface SpendingForecast {
  period: string;
  predictedAmount: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface HeatMapData {
  date: string;
  amount: number;
  intensity: number; // 0-1 scale
}

/**
 * Calculate spending forecast based on historical data
 */
export function calculateSpendingForecast(
  expenses: Expense[],
  daysAhead: number = 30
): SpendingForecast[] {
  if (expenses.length < 7) {
    return [];
  }

  // Group expenses by day
  const dailySpending: Record<string, number> = {};
  expenses.forEach(expense => {
    const date = new Date(expense.date).toISOString().split('T')[0];
    dailySpending[date] = (dailySpending[date] || 0) + expense.amount;
  });

  // Calculate average daily spending
  const dates = Object.keys(dailySpending).sort();
  const recentDates = dates.slice(-30); // Last 30 days
  const recentAmounts = recentDates.map(date => dailySpending[date] || 0);
  
  const avgDaily = recentAmounts.reduce((sum, amt) => sum + amt, 0) / recentAmounts.length;
  
  // Calculate trend (simple linear regression)
  const n = recentAmounts.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  recentAmounts.forEach((amount, index) => {
    const x = index;
    const y = amount;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const trend: 'increasing' | 'decreasing' | 'stable' = 
    slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
  
  // Generate forecast
  const forecasts: SpendingForecast[] = [];
  const today = new Date();
  
  for (let i = 1; i <= daysAhead; i += 7) {
    const forecastDate = new Date(today);
    forecastDate.setDate(today.getDate() + i);
    
    // Predict based on trend
    const predictedDaily = avgDaily + (slope * (recentAmounts.length + i));
    const predictedAmount = Math.max(0, predictedDaily * 7); // Weekly forecast
    
    // Confidence decreases over time
    const confidence = Math.max(0.3, 1 - (i / (daysAhead * 2)));
    
    forecasts.push({
      period: forecastDate.toISOString().split('T')[0],
      predictedAmount,
      confidence,
      trend,
    });
  }
  
  return forecasts;
}

/**
 * Generate heat map data for spending visualization
 */
export function generateHeatMapData(
  expenses: Expense[],
  startDate: Date,
  endDate: Date
): HeatMapData[] {
  const data: HeatMapData[] = [];
  const dailySpending: Record<string, number> = {};
  
  // Aggregate expenses by date
  expenses.forEach(expense => {
    const expenseDate = new Date(expense.date);
    if (expenseDate >= startDate && expenseDate <= endDate) {
      const dateKey = expenseDate.toISOString().split('T')[0];
      dailySpending[dateKey] = (dailySpending[dateKey] || 0) + expense.amount;
    }
  });
  
  // Find max spending for normalization
  const maxSpending = Math.max(...Object.values(dailySpending), 1);
  
  // Generate data for each day in range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    const amount = dailySpending[dateKey] || 0;
    const intensity = amount / maxSpending;
    
    data.push({
      date: dateKey,
      amount,
      intensity,
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
}

