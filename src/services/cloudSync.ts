import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip, Expense, Settlement } from '@/types';

const SYNC_STATUS_KEY = '@travel_expenses_sync_status';
const LAST_SYNC_KEY = '@travel_expenses_last_sync';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt?: string;
  pendingChanges: number;
  error?: string;
}

export const cloudSyncService = {
  async syncData(
    trips: Trip[],
    expenses: Expense[],
    settlements: Settlement[]
  ): Promise<void> {
    console.log('Starting cloud sync...');
    
    try {
      await this.updateSyncStatus({ isSyncing: true, pendingChanges: 0 });

      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockCloudData = {
        trips,
        expenses,
        settlements,
        syncedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('__cloud_backup__', JSON.stringify(mockCloudData));
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

      await this.updateSyncStatus({
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
        pendingChanges: 0,
      });

      console.log('Cloud sync completed successfully');
    } catch (error) {
      console.error('Cloud sync failed:', error);
      await this.updateSyncStatus({
        isSyncing: false,
        pendingChanges: 0,
        error: 'Sync failed',
      });
      throw error;
    }
  },

  async restoreFromCloud(): Promise<{
    trips: Trip[];
    expenses: Expense[];
    settlements: Settlement[];
  } | null> {
    console.log('Restoring data from cloud...');
    
    try {
      const cloudData = await AsyncStorage.getItem('__cloud_backup__');
      if (!cloudData) return null;

      const parsed = JSON.parse(cloudData);
      console.log('Data restored from cloud backup');
      
      return {
        trips: parsed.trips || [],
        expenses: parsed.expenses || [],
        settlements: parsed.settlements || [],
      };
    } catch (error) {
      console.error('Error restoring from cloud:', error);
      return null;
    }
  },

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const status = await AsyncStorage.getItem(SYNC_STATUS_KEY);
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      
      return status ? JSON.parse(status) : {
        isSyncing: false,
        lastSyncAt: lastSync || undefined,
        pendingChanges: 0,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return { isSyncing: false, pendingChanges: 0 };
    }
  },

  async updateSyncStatus(status: Partial<SyncStatus>): Promise<void> {
    const current = await this.getSyncStatus();
    const updated = { ...current, ...status };
    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated));
  },

  async clearCloudData(): Promise<void> {
    await AsyncStorage.removeItem('__cloud_backup__');
    await AsyncStorage.removeItem(SYNC_STATUS_KEY);
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
  },
};
