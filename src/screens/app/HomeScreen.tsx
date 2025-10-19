import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { generateTripSummary } from '@/utils/tripSummary';
import { EmptyTripsState } from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';

export default function HomeScreen({ navigation }: any) {
  const { trips, expenses, deleteTrip } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const renderTripCard = (trip: any) => {
    const summary = generateTripSummary(trip, expenses);
    const progressPercentage = (summary.totalSpent / trip.budget) * 100;

    const handleLongPress = () => {
      Alert.alert(
        'Trip Options',
        `What would you like to do with "${trip.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Edit',
            onPress: () => navigation.navigate('EditTrip', { tripId: trip.id }),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Delete Trip',
                `Are you sure you want to delete "${trip.name}"? This will also delete all associated expenses.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteTrip(trip.id),
                  },
                ]
              );
            },
          },
        ]
      );
    };

    return (
      <TouchableOpacity 
        key={trip.id}
        style={styles.tripCard}
        onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
        onLongPress={handleLongPress}
      >
        {trip.coverImage ? (
          <Image source={{ uri: trip.coverImage }} style={styles.tripCoverImage} />
        ) : (
          <View style={styles.tripCoverPlaceholder}>
            <Ionicons name="airplane" size={32} color="#8b5cf6" />
          </View>
        )}
        
        <View style={styles.tripContent}>
          <View style={styles.tripHeader}>
            <View style={styles.tripInfo}>
              <Text style={styles.tripName}>{trip.name}</Text>
              <Text style={styles.tripDestination}>{trip.destination}</Text>
            </View>
            <View style={styles.tripBadge}>
              <Text style={styles.badgeText}>Group</Text>
            </View>
          </View>
        
        <View style={styles.tripDates}>
          <Text style={styles.dateText}>
            {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.tripStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Spent</Text>
            <Text style={styles.statValue}>${summary.totalSpent.toFixed(2)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Budget</Text>
            <Text style={styles.statValue}>${trip.budget.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(progressPercentage, 100)}%` }]} />
        </View>
          <Text style={styles.progressText}>
            {progressPercentage.toFixed(0)}% of ${trip.budget.toFixed(2)} budget used
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#8b5cf6"
            colors={['#8b5cf6']}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Trips</Text>
        </View>

        {trips.length === 0 ? (
          <EmptyTripsState onAddTrip={() => navigation.navigate('AddTrip')} />
        ) : (
          <View style={styles.tripsList}>
            {trips.map(renderTripCard)}
          </View>
        )}

      </ScrollView>

      {/* Fixed floating action buttons */}
      <View style={styles.floatingActions}>
        <TouchableOpacity 
          style={styles.fabSecondary}
          onPress={() => navigation.navigate('History')}
        >
          <Ionicons name="time-outline" size={24} color="#8b5cf6" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.fabPrimary}
          onPress={() => navigation.navigate('AddTrip')}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  tripsList: {
    marginBottom: 20,
  },
  tripCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  tripCoverImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  tripCoverPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripContent: {
    padding: 16,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tripInfo: {
    flex: 1,
  },
  tripName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tripDestination: {
    fontSize: 14,
    color: '#666',
  },
  tripBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  tripDates: {
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  floatingActions: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    gap: 12,
    alignItems: 'flex-end',
  },
  fabPrimary: {
    backgroundColor: '#8b5cf6',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabSecondary: {
    backgroundColor: 'white',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
