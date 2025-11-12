import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Trip } from '@/types';
import { generateTripSummary } from '@/utils/tripSummary';
import { getTripStatus } from '@/utils/tripStatus';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationConfig {
  budgetAlerts: boolean;
  dailySummaries: boolean;
  settlementReminders: boolean;
  activityReminders: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('budget-alerts', {
          name: 'Budget Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  async scheduleBudgetAlert(
    trip: Trip,
    totalSpent: number,
    threshold: number = 80
  ): Promise<string | null> {
    try {
      const budget = trip.budget || 0.01;
      const percentage = (totalSpent / budget) * 100;

      if (percentage < threshold) {
        return null; // Don't schedule if below threshold
      }

      const isOverBudget = totalSpent > trip.budget;
      const title = isOverBudget
        ? `⚠️ Over Budget: ${trip.name}`
        : `💰 Budget Alert: ${trip.name}`;
      const body = isOverBudget
        ? `You've exceeded your budget by ${(totalSpent - budget).toFixed(2)} ${trip.currency}`
        : `You've used ${percentage.toFixed(0)}% of your budget`;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { tripId: trip.id, type: 'budget-alert' },
          sound: true,
        },
        trigger: null, // Show immediately
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling budget alert:', error);
      return null;
    }
  }

  async scheduleDailySummary(
    trip: Trip,
    totalSpent: number,
    expensesToday: number
  ): Promise<string | null> {
    try {
      const title = `📊 Daily Summary: ${trip.name}`;
      const body = `Spent ${expensesToday.toFixed(2)} ${trip.currency} today. Total: ${totalSpent.toFixed(2)} ${trip.currency}`;

      // Schedule for tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { tripId: trip.id, type: 'daily-summary' },
          sound: true,
        },
        trigger: {
          date: tomorrow,
          repeats: true,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling daily summary:', error);
      return null;
    }
  }

  async scheduleSettlementReminder(
    trip: Trip,
    amount: number,
    from: string,
    to: string
  ): Promise<string | null> {
    try {
      const title = `💸 Settlement Reminder: ${trip.name}`;
      const body = `${from} owes ${to} ${amount.toFixed(2)} ${trip.currency}`;

      // Schedule for 3 days from now at 10 AM
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 3);
      reminderDate.setHours(10, 0, 0, 0);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { tripId: trip.id, type: 'settlement-reminder', from, to, amount },
          sound: true,
        },
        trigger: {
          date: reminderDate,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling settlement reminder:', error);
      return null;
    }
  }

  async scheduleActivityReminder(
    trip: Trip,
    activityDescription: string,
    activityDate: string
  ): Promise<string | null> {
    try {
      const activityDateTime = new Date(activityDate);
      const reminderDate = new Date(activityDateTime);
      reminderDate.setHours(reminderDate.getHours() - 2); // 2 hours before

      // Don't schedule if reminder time is in the past
      if (reminderDate < new Date()) {
        return null;
      }

      const title = `📅 Activity Reminder: ${trip.name}`;
      const body = `Don't forget: ${activityDescription}`;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { tripId: trip.id, type: 'activity-reminder', activityDescription, activityDate },
          sound: true,
        },
        trigger: {
          date: reminderDate,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling activity reminder:', error);
      return null;
    }
  }

  async scheduleTripStartReminder(trip: Trip): Promise<string | null> {
    try {
      const startDate = new Date(trip.startDate);
      const reminderDate = new Date(startDate);
      reminderDate.setDate(reminderDate.getDate() - 1); // 1 day before
      reminderDate.setHours(9, 0, 0, 0);

      // Don't schedule if reminder time is in the past
      if (reminderDate < new Date()) {
        return null;
      }

      const title = `✈️ Trip Starting Tomorrow: ${trip.name}`;
      const body = `Your trip to ${trip.destination} starts tomorrow!`;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { tripId: trip.id, type: 'trip-start' },
          sound: true,
        },
        trigger: {
          date: reminderDate,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling trip start reminder:', error);
      return null;
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  async checkAndScheduleTripNotifications(
    trip: Trip,
    expenses: any[],
    config: NotificationConfig
  ): Promise<void> {
    if (trip.notificationsEnabled === false) {
      return;
    }

    const summary = generateTripSummary(trip, expenses);
    const statusInfo = getTripStatus(trip, summary.totalSpent);

    // Budget alerts
    if (config.budgetAlerts && trip.notificationPreferences?.budgetAlerts !== false) {
      const threshold80 = (trip.budget * 0.8);
      const threshold100 = trip.budget;

      if (summary.totalSpent >= threshold80 && summary.totalSpent < threshold100) {
        await this.scheduleBudgetAlert(trip, summary.totalSpent, 80);
      } else if (summary.totalSpent >= threshold100) {
        await this.scheduleBudgetAlert(trip, summary.totalSpent, 100);
      }
    }

    // Daily summaries (only for active trips)
    if (
      config.dailySummaries &&
      statusInfo.status === 'active' &&
      trip.notificationPreferences?.dailySummaries !== false
    ) {
      const today = new Date().toISOString().split('T')[0];
      const expensesToday = expenses.filter(
        (e) => e.tripId === trip.id && e.date === today
      ).reduce((sum, e) => sum + e.amount, 0);

      if (expensesToday > 0) {
        await this.scheduleDailySummary(trip, summary.totalSpent, expensesToday);
      }
    }

    // Trip start reminder (only for upcoming trips)
    if (statusInfo.status === 'upcoming' && statusInfo.daysUntilStart === 1) {
      await this.scheduleTripStartReminder(trip);
    }
  }
}

export const notificationService = NotificationService.getInstance();

