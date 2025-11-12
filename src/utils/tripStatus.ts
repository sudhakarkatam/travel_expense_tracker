import { Trip } from '@/types';

export type TripStatus = 'upcoming' | 'active' | 'completed';

export interface TripStatusInfo {
  status: TripStatus;
  daysUntilStart?: number;
  daysUntilEnd?: number;
  isOverBudget: boolean;
  isNearBudget: boolean;
}

export function getTripStatus(trip: Trip, totalSpent: number): TripStatusInfo {
  const now = new Date();
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  
  // Set time to midnight for accurate day comparison
  now.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  let status: TripStatus;
  let daysUntilStart: number | undefined;
  let daysUntilEnd: number | undefined;

  if (now < startDate) {
    status = 'upcoming';
    daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } else if (now >= startDate && now <= endDate) {
    status = 'active';
    daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } else {
    status = 'completed';
  }

  const budget = trip.budget || 0.01;
  const progressPercentage = (totalSpent / budget) * 100;
  const isOverBudget = totalSpent > trip.budget;
  const isNearBudget = progressPercentage >= 80 && !isOverBudget;

  return {
    status,
    daysUntilStart,
    daysUntilEnd,
    isOverBudget,
    isNearBudget,
  };
}

export function formatCountdown(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `${days} days`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    if (remainingDays === 0) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`;
  }
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  if (remainingDays === 0) return `${months} ${months === 1 ? 'month' : 'months'}`;
  return `${months} ${months === 1 ? 'month' : 'months'} ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`;
}

