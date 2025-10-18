import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { CURRENCIES } from '@/constants/currencies';
import { exportToCSV, exportSummary } from '@/utils/export';
import {
  User,
  Crown,
  Download,
  Trash2,
  ChevronRight,
  Mail,
  Cloud,
  LogIn,
  LogOut,
  Scan,
  ArrowLeftRight,
  Lightbulb,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cloudSyncService } from '@/services/cloudSync';
import { authService } from '@/services/auth';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateUser, trips, expenses, deleteTrip, settlements } = useApp();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name || 'Me');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    const status = await cloudSyncService.getSyncStatus();
    setLastSyncTime(status.lastSyncAt || null);
  };

  const handleSaveName = async () => {
    if (name.trim()) {
      await updateUser({ name: name.trim() });
      setEditingName(false);
    }
  };

  const handleCloudSync = async () => {
    if (!user?.isPro) {
      Alert.alert(
        'Pro Feature',
        'Cloud sync is available for Pro members only',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/premium') },
        ]
      );
      return;
    }

    setSyncing(true);
    try {
      await cloudSyncService.syncData(trips, expenses, settlements);
      await loadSyncStatus();
      Alert.alert('Success', 'Your data has been synced to the cloud');
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Error', 'Failed to sync data');
    } finally {
      setSyncing(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!user?.isPro) {
      Alert.alert('Pro Feature', 'Cloud restore is available for Pro members only');
      return;
    }

    Alert.alert(
      'Restore from Cloud',
      'This will replace your local data with cloud backup. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            setSyncing(true);
            try {
              const cloudData = await cloudSyncService.restoreFromCloud();
              if (cloudData) {
                Alert.alert('Success', 'Data restored from cloud backup');
              } else {
                Alert.alert('No Backup', 'No cloud backup found');
              }
            } catch (error) {
              console.error('Restore error:', error);
              Alert.alert('Error', 'Failed to restore data');
            } finally {
              setSyncing(false);
            }
          },
        },
      ]
    );
  };

  const handleSignIn = () => {
    router.push('/auth/login');
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await authService.signOut();
            await updateUser({ email: undefined, isPro: false });
            Alert.alert('Signed Out', 'You have been signed out successfully');
          },
        },
      ]
    );
  };

  const handleExportAll = async () => {
    if (trips.length === 0) {
      Alert.alert('No Data', 'You have no trips to export');
      return;
    }

    if (trips.length === 1) {
      const tripExpenses = expenses.filter(e => e.tripId === trips[0].id);
      await exportSummary(trips[0], tripExpenses);
      return;
    }

    Alert.alert(
      'Export All Trips',
      'Select export format',
      [
        {
          text: 'Summary',
          onPress: async () => {
            const trip = trips[0];
            const tripExpenses = expenses.filter(e => e.tripId === trip.id);
            await exportSummary(trip, tripExpenses);
          },
        },
        {
          text: 'CSV',
          onPress: async () => {
            const trip = trips[0];
            const tripExpenses = expenses.filter(e => e.tripId === trip.id);
            await exportToCSV(trip, tripExpenses);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleExportCSV = async () => {
    if (trips.length === 0) {
      Alert.alert('No Data', 'You have no trips to export');
      return;
    }

    const trip = trips[0];
    const tripExpenses = expenses.filter(e => e.tripId === trip.id);
    await exportToCSV(trip, tripExpenses);
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all trips and expenses? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const trip of trips) {
                await deleteTrip(trip.id);
              }
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear all data');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!user?.isPro && (
          <TouchableOpacity
            style={styles.proCard}
            onPress={() => router.push('/premium')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.proGradient}
            >
              <Crown size={32} color="#FFFFFF" />
              <Text style={styles.proTitle}>Upgrade to Pro</Text>
              <Text style={styles.proSubtitle}>
                Unlock cloud sync, group trips & more
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {user?.isPro && (
          <View style={styles.proStatusCard}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.proStatusGradient}
            >
              <Crown size={24} color="#FFFFFF" />
              <Text style={styles.proStatusText}>Pro Member</Text>
            </LinearGradient>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <User size={20} color="#6366F1" />
                </View>
                <Text style={styles.settingLabel}>Name</Text>
              </View>

              {editingName ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={name}
                    onChangeText={setName}
                    autoFocus
                    onBlur={handleSaveName}
                    onSubmitEditing={handleSaveName}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.settingRight}
                  onPress={() => setEditingName(true)}
                >
                  <Text style={styles.settingValue}>{user?.name}</Text>
                  <ChevronRight size={20} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {user?.email ? (
              <>
                <View style={[styles.settingRow, styles.settingRowBorder]}>
                  <View style={styles.settingLeft}>
                    <View style={styles.iconContainer}>
                      <Mail size={20} color="#6366F1" />
                    </View>
                    <Text style={styles.settingLabel}>Email</Text>
                  </View>
                  <Text style={styles.settingValue}>{user.email}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.settingRow, styles.settingRowBorder]}
                  onPress={handleSignOut}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                      <LogOut size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.settingLabel}>Sign Out</Text>
                  </View>
                  <ChevronRight size={20} color="#94A3B8" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.settingRow, styles.settingRowBorder]}
                onPress={handleSignIn}
              >
                <View style={styles.settingLeft}>
                  <View style={styles.iconContainer}>
                    <LogIn size={20} color="#10B981" />
                  </View>
                  <Text style={styles.settingLabel}>Sign In</Text>
                </View>
                <ChevronRight size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {user?.isPro && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cloud Sync</Text>

            <View style={styles.card}>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={handleCloudSync}
                disabled={syncing}
              >
                <View style={styles.settingLeft}>
                  <View style={styles.iconContainer}>
                    {syncing ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <Cloud size={20} color="#6366F1" />
                    )}
                  </View>
                  <View>
                    <Text style={styles.settingLabel}>Sync Now</Text>
                    {lastSyncTime && (
                      <Text style={styles.settingSubtext}>
                        Last: {new Date(lastSyncTime).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
                <ChevronRight size={20} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingRow, styles.settingRowBorder]}
                onPress={handleRestoreFromCloud}
                disabled={syncing}
              >
                <View style={styles.settingLeft}>
                  <View style={styles.iconContainer}>
                    <Download size={20} color="#6366F1" />
                  </View>
                  <Text style={styles.settingLabel}>Restore from Cloud</Text>
                </View>
                <ChevronRight size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
        )
        }

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pro Tools</Text>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => router.push('/scan-receipt')}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Scan size={20} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Scan Receipt</Text>
                  {!user?.isPro && (
                    <Text style={styles.settingProBadge}>🔒 Pro</Text>
                  )}
                </View>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingRow, styles.settingRowBorder]}
              onPress={() => router.push('/currency-converter')}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <ArrowLeftRight size={20} color="#F59E0B" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Currency Converter</Text>
                  {!user?.isPro && (
                    <Text style={styles.settingProBadge}>🔒 Pro</Text>
                  )}
                </View>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingRow, styles.settingRowBorder]}
              onPress={() => router.push('/insights')}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Lightbulb size={20} color="#6366F1" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>AI Insights</Text>
                  {!user?.isPro && (
                    <Text style={styles.settingProBadge}>🔒 Pro</Text>
                  )}
                </View>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Export</Text>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleExportAll}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Download size={20} color="#10B981" />
                </View>
                <Text style={styles.settingLabel}>Export Summary</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingRow, styles.settingRowBorder]}
              onPress={handleExportCSV}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Download size={20} color="#10B981" />
                </View>
                <Text style={styles.settingLabel}>Export to CSV</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>

          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{trips.length}</Text>
              <Text style={styles.statLabel}>Total Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{expenses.length}</Text>
              <Text style={styles.statLabel}>Total Expenses</Text>
            </View>
          </View>
        </View>

        {user?.proUsage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pro Usage</Text>

            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.iconContainer}>
                    <Scan size={20} color="#10B981" />
                  </View>
                  <Text style={styles.settingLabel}>Receipt Scans</Text>
                </View>
                <Text style={styles.settingValue}>
                  {user.proUsage.receiptScans} / {user.isPro ? '∞' : user.proUsage.receiptScansLimit}
                </Text>
              </View>

              <View style={[styles.settingRow, styles.settingRowBorder]}>
                <View style={styles.settingLeft}>
                  <View style={styles.iconContainer}>
                    <Cloud size={20} color="#6366F1" />
                  </View>
                  <Text style={styles.settingLabel}>Cloud Sync</Text>
                </View>
                <Text style={styles.settingValue}>
                  {user.proUsage.cloudSyncEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>

              {!user.isPro && (
                <View style={[styles.settingRow, styles.settingRowBorder]}>
                  <View style={styles.settingLeft}>
                    <Text style={styles.usageResetText}>
                      Free tier resets monthly ({new Date(user.proUsage.lastResetDate).toLocaleDateString()})
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleClearAllData}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                  <Trash2 size={20} color="#EF4444" />
                </View>
                <Text style={[styles.settingLabel, { color: '#EF4444' }]}>
                  Clear All Data
                </Text>
              </View>
              <ChevronRight size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Travel Expense Tracker v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Built with ❤️ for travelers
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  proCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  proGradient: {
    padding: 24,
    alignItems: 'center',
  },
  proTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
  },
  proSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    textAlign: 'center',
  },
  proStatusCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  proStatusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  proStatusText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1E293B',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 15,
    color: '#64748B',
  },
  settingSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  settingProBadge: {
    fontSize: 11,
    color: '#6366F1',
    marginTop: 2,
  },
  nameEditRow: {
    flex: 1,
    marginLeft: 8,
  },
  nameInput: {
    fontSize: 15,
    color: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#6366F1',
    paddingVertical: 4,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  usageResetText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic' as const,
  },
});
