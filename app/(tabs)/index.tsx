import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, MapPin, Calendar, UserPlus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/contexts/AppContext';
import { getCurrencySymbol } from '@/constants/currencies';

export default function TripsScreen() {
  const router = useRouter();
  const { trips, expenses, isLoading, user } = useApp();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const getTripSpent = (tripId: string): number => {
    return expenses
      .filter(e => e.tripId === tripId)
      .reduce((sum, e) => sum + e.amount, 0);
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
              <Text style={styles.proTitle}>✨ Upgrade to Pro</Text>
              <Text style={styles.proSubtitle}>
                Cloud sync, group trips & more
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {trips.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Plane size={64} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>
              Start your journey by creating your first trip
            </Text>
          </View>
        ) : (
          <View style={styles.tripsGrid}>
            {trips.map((trip) => {
              const spent = getTripSpent(trip.id);

              const percentage = trip.budget > 0 ? (spent / trip.budget) * 100 : 0;

              return (
                <TouchableOpacity
                  key={trip.id}
                  style={styles.tripCard}
                  onPress={() => router.push(`/trip/${trip.id}`)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#F8FAFC', '#F1F5F9']}
                    style={styles.tripGradient}
                  >
                    <View style={styles.tripHeader}>
                      <Text style={styles.tripName} numberOfLines={1}>
                        {trip.name}
                      </Text>
                      {trip.isGroup && (
                        <View style={styles.groupBadge}>
                          <Text style={styles.groupBadgeText}>Group</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.tripInfo}>
                      <MapPin size={14} color="#64748B" />
                      <Text style={styles.tripDestination} numberOfLines={1}>
                        {trip.destination}
                      </Text>
                    </View>

                    <View style={styles.tripInfo}>
                      <Calendar size={14} color="#64748B" />
                      <Text style={styles.tripDate}>
                        {new Date(trip.startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' - '}
                        {new Date(trip.endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>

                    <View style={styles.budgetSection}>
                      <View style={styles.budgetRow}>
                        <Text style={styles.budgetLabel}>Spent</Text>
                        <Text style={styles.budgetSpent}>
                          {getCurrencySymbol(trip.currency)}
                          {spent.toFixed(0)}
                        </Text>
                      </View>
                      <View style={styles.budgetRow}>
                        <Text style={styles.budgetLabel}>Budget</Text>
                        <Text style={styles.budgetTotal}>
                          {getCurrencySymbol(trip.currency)}
                          {trip.budget.toFixed(0)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.progressBarContainer}>
                      <View 
                        style={[
                          styles.progressBar,
                          { 
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: percentage > 90 ? '#EF4444' : '#6366F1',
                          },
                        ]} 
                      />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fabSecondary}
          onPress={() => router.push('/join-trip')}
          activeOpacity={0.8}
        >
          <UserPlus size={24} color="#6366F1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/add-trip')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Plus size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Plane({ size, color }: { size: number; color: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.6, color }}>✈️</Text>
    </View>
  );
}

const { width } = Dimensions.get('window');
const cardWidth = width > 600 ? (width - 48) / 2 : width - 32;

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
    paddingBottom: 100,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    color: '#64748B',
  },
  proCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  proGradient: {
    padding: 20,
  },
  proTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  proSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  tripsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  tripCard: {
    width: cardWidth,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 0,
  },
  tripGradient: {
    padding: 16,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tripName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1E293B',
    flex: 1,
  },
  groupBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  groupBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  tripInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tripDestination: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  tripDate: {
    fontSize: 13,
    color: '#64748B',
  },
  budgetSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  budgetLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  budgetSpent: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1E293B',
  },
  budgetTotal: {
    fontSize: 13,
    color: '#64748B',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'flex-end',
    gap: 12,
  },
  fabSecondary: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fab: {
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
