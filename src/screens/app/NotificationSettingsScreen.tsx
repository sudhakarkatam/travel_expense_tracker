import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { Trip } from '@/types';
import { notificationService } from '@/services/notificationService';

interface NotificationSettingsScreenProps {
  navigation: any;
}

export default function NotificationSettingsScreen({ navigation }: NotificationSettingsScreenProps) {
  const { trips, updateTrip } = useApp();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    const initialized = await notificationService.initialize();
    setIsInitialized(initialized);
    if (!initialized) {
      Alert.alert(
        'Permissions Required',
        'Please enable notifications in your device settings to receive trip alerts and reminders.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleToggleTripNotifications = async (trip: Trip) => {
    await updateTrip(trip.id, {
      notificationsEnabled: !trip.notificationsEnabled,
    });
  };

  const handleTogglePreference = async (
    trip: Trip,
    preference: 'budgetAlerts' | 'dailySummaries' | 'settlementReminders' | 'activityReminders'
  ) => {
    const currentPrefs = trip.notificationPreferences || {
      budgetAlerts: true,
      dailySummaries: false,
      settlementReminders: true,
      activityReminders: false,
    };

    const updatedPrefs = {
      ...currentPrefs,
      [preference]: !currentPrefs[preference],
    };

    await updateTrip(trip.id, {
      notificationPreferences: updatedPrefs,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Notification Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isInitialized && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={24} color="#FF9500" />
            <Text style={styles.warningText}>
              Notifications are disabled. Please enable them in your device settings.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Notifications</Text>
          <Text style={styles.sectionDescription}>
            Manage notifications for each trip individually
          </Text>

          {trips.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="airplane-outline" size={48} color="#8E8E93" />
              <Text style={styles.emptyText}>No trips yet</Text>
              <Text style={styles.emptySubtext}>Create a trip to manage notifications</Text>
            </View>
          ) : (
            trips.map((trip) => (
              <View key={trip.id} style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripName}>{trip.name}</Text>
                    <Text style={styles.tripDestination}>{trip.destination}</Text>
                  </View>
                  <Switch
                    value={trip.notificationsEnabled !== false}
                    onValueChange={() => handleToggleTripNotifications(trip)}
                    trackColor={{ false: '#E5E5EA', true: '#8b5cf6' }}
                    thumbColor={trip.notificationsEnabled !== false ? '#fff' : '#f4f3f4'}
                  />
                </View>

                {trip.notificationsEnabled !== false && (
                  <View style={styles.preferencesContainer}>
                    <Text style={styles.preferencesTitle}>Notification Types</Text>

                    <View style={styles.preferenceRow}>
                      <View style={styles.preferenceInfo}>
                        <Ionicons name="cash-outline" size={20} color="#8b5cf6" />
                        <View style={styles.preferenceTextContainer}>
                          <Text style={styles.preferenceLabel}>Budget Alerts</Text>
                          <Text style={styles.preferenceDescription}>
                            Get notified when you reach 80% or exceed your budget
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={trip.notificationPreferences?.budgetAlerts !== false}
                        onValueChange={() => handleTogglePreference(trip, 'budgetAlerts')}
                        trackColor={{ false: '#E5E5EA', true: '#8b5cf6' }}
                        thumbColor={trip.notificationPreferences?.budgetAlerts !== false ? '#fff' : '#f4f3f4'}
                      />
                    </View>

                    <View style={styles.preferenceRow}>
                      <View style={styles.preferenceInfo}>
                        <Ionicons name="bar-chart-outline" size={20} color="#8b5cf6" />
                        <View style={styles.preferenceTextContainer}>
                          <Text style={styles.preferenceLabel}>Daily Summaries</Text>
                          <Text style={styles.preferenceDescription}>
                            Receive daily spending summaries during active trips
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={trip.notificationPreferences?.dailySummaries === true}
                        onValueChange={() => handleTogglePreference(trip, 'dailySummaries')}
                        trackColor={{ false: '#E5E5EA', true: '#8b5cf6' }}
                        thumbColor={trip.notificationPreferences?.dailySummaries === true ? '#fff' : '#f4f3f4'}
                      />
                    </View>

                    <View style={styles.preferenceRow}>
                      <View style={styles.preferenceInfo}>
                        <Ionicons name="swap-horizontal-outline" size={20} color="#8b5cf6" />
                        <View style={styles.preferenceTextContainer}>
                          <Text style={styles.preferenceLabel}>Settlement Reminders</Text>
                          <Text style={styles.preferenceDescription}>
                            Reminders for pending settlements
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={trip.notificationPreferences?.settlementReminders !== false}
                        onValueChange={() => handleTogglePreference(trip, 'settlementReminders')}
                        trackColor={{ false: '#E5E5EA', true: '#8b5cf6' }}
                        thumbColor={trip.notificationPreferences?.settlementReminders !== false ? '#fff' : '#f4f3f4'}
                      />
                    </View>

                    <View style={styles.preferenceRow}>
                      <View style={styles.preferenceInfo}>
                        <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
                        <View style={styles.preferenceTextContainer}>
                          <Text style={styles.preferenceLabel}>Activity Reminders</Text>
                          <Text style={styles.preferenceDescription}>
                            Get reminded 2 hours before planned activities
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={trip.notificationPreferences?.activityReminders === true}
                        onValueChange={() => handleTogglePreference(trip, 'activityReminders')}
                        trackColor={{ false: '#E5E5EA', true: '#8b5cf6' }}
                        thumbColor={trip.notificationPreferences?.activityReminders === true ? '#fff' : '#f4f3f4'}
                      />
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  tripCard: {
    backgroundColor: '#F9F9FB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  tripDestination: {
    fontSize: 14,
    color: '#8E8E93',
  },
  preferencesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  preferencesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
    marginBottom: 12,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  preferenceInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
    gap: 12,
  },
  preferenceTextContainer: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
});

