import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { generateTripSummary } from '@/utils/tripSummary';

export default function TripDetailScreen({ navigation, route }: any) {
  const { trips, expenses, deleteExpense } = useApp();
  const { tripId } = route.params;
  const trip = trips.find(t => t.id === tripId);
  const summary = trip ? generateTripSummary(trip, expenses) : null;
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  if (!trip || !summary) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Trip not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleShareInvite = () => {
    const inviteCode = `TRIP${trip.id.slice(-6).toUpperCase()}`;
    Alert.alert(
      'Share Invite',
      `Invite Code: ${inviteCode}\n\nShare this code with friends to let them join your trip!`,
      [{ text: 'Copy Code', onPress: () => console.log('Code copied') }]
    );
  };

  const renderExpenseItem = (expense: any) => {
    const handleLongPress = () => {
      Alert.alert(
        'Expense Options',
        `What would you like to do with "${expense.description}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Edit',
            onPress: () => navigation.navigate('EditExpense', { 
              expenseId: expense.id, 
              tripId: trip.id 
            }),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Delete Expense',
                `Are you sure you want to delete "${expense.description}"?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteExpense(expense.id),
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
        key={expense.id} 
        style={styles.expenseItem}
        onPress={() => navigation.navigate('ExpenseDetail', { 
          expenseId: expense.id, 
          tripId: trip.id 
        })}
        onLongPress={handleLongPress}
      >
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDescription}>{expense.description}</Text>
          <Text style={styles.expenseCategory}>{expense.category}</Text>
          <Text style={styles.expenseDate}>{new Date(expense.date).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{trip.name}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditTrip', { tripId: trip.id })}>
          <Ionicons name="pencil-outline" size={24} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Cover Image Hero Section */}
        {trip.coverImage ? (
          <View style={styles.coverImageContainer}>
            <Image source={{ uri: trip.coverImage }} style={styles.coverImage} />
            <View style={styles.coverImageOverlay}>
              <Text style={styles.coverImageTitle}>{trip.name}</Text>
              <Text style={styles.coverImageSubtitle}>{trip.destination}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.coverImagePlaceholder}>
            <View style={styles.placeholderContent}>
              <Ionicons name="airplane" size={48} color="white" />
              <Text style={styles.placeholderTitle}>{trip.name}</Text>
              <Text style={styles.placeholderSubtitle}>{trip.destination}</Text>
            </View>
          </View>
        )}

        <View style={styles.budgetCard}>
          <View style={styles.budgetSection}>
            <Text style={styles.budgetLabel}>Spent</Text>
            <Text style={styles.budgetAmount}>${summary.totalSpent.toFixed(2)}</Text>
          </View>
          <View style={styles.budgetSection}>
            <Text style={styles.budgetLabel}>Remaining</Text>
            <Text style={styles.budgetAmount}>${summary.remainingBudget.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min((summary.totalSpent / trip.budget) * 100, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {((summary.totalSpent / trip.budget) * 100).toFixed(0)}% of ${trip.budget.toFixed(2)} budget used
          </Text>
        </View>

        <View style={styles.inviteSection}>
          <Text style={styles.sectionTitle}>Invite Friends</Text>
          <View style={styles.participantInfo}>
            <Text style={styles.participantText}>1 participant</Text>
          </View>
          <View style={styles.inviteCodeContainer}>
            <Text style={styles.inviteCode}>Invite Code TRIP{trip.id.slice(-6).toUpperCase()}</Text>
            <TouchableOpacity style={styles.copyButton}>
              <Ionicons name="copy-outline" size={16} color="#8b5cf6" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareInvite}>
            <Text style={styles.shareButtonText}>Share Invite</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.expensesSection}>
          <Text style={styles.sectionTitle}>Expenses ({summary.expenses.length})</Text>
          {summary.expenses.length === 0 ? (
            <View style={styles.emptyExpenses}>
              <Ionicons name="trending-up-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No expenses yet</Text>
              <Text style={styles.emptySubtext}>Start tracking by adding your first expense</Text>
            </View>
          ) : (
            <>
              {(showAllExpenses ? summary.expenses : summary.expenses.slice(0, 5)).map(renderExpenseItem)}
              {summary.expenses.length > 5 && !showAllExpenses && (
                <TouchableOpacity 
                  style={styles.showAllButton}
                  onPress={() => setShowAllExpenses(true)}
                >
                  <Text style={styles.showAllText}>
                    Show All ({summary.expenses.length} expenses)
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#8b5cf6" />
                </TouchableOpacity>
              )}
              {showAllExpenses && summary.expenses.length > 5 && (
                <TouchableOpacity 
                  style={styles.showLessButton}
                  onPress={() => setShowAllExpenses(false)}
                >
                  <Text style={styles.showLessText}>Show Less</Text>
                  <Ionicons name="chevron-up" size={16} color="#8b5cf6" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('ManageMembers', { tripId: trip.id })}
        >
          <Ionicons name="people-outline" size={20} color="#8b5cf6" />
          <Text style={styles.actionText}>Members</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('SettleUp', { tripId: trip.id })}
        >
          <Ionicons name="card-outline" size={20} color="#8b5cf6" />
          <Text style={styles.actionText}>Settle</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.addButton]}
          onPress={() => navigation.navigate('AddExpense', { tripId: trip.id })}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={[styles.actionText, styles.addButtonText]}>Add</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  budgetCard: {
    flexDirection: 'row',
    backgroundColor: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  budgetSection: {
    flex: 1,
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  progressContainer: {
    marginBottom: 24,
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
  inviteSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  participantInfo: {
    marginBottom: 12,
  },
  participantText: {
    fontSize: 14,
    color: '#666',
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  inviteCode: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  copyButton: {
    padding: 4,
  },
  shareButton: {
    backgroundColor: '#8b5cf6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  expensesSection: {
    marginBottom: 24,
  },
  emptyExpenses: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  expenseCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: '#999',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    marginLeft: 8,
  },
  addButtonText: {
    color: 'white',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
  coverImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  coverImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  coverImageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  coverImageSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  coverImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderContent: {
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
    marginBottom: 4,
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
  },
  showAllText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  showLessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
  },
  showLessText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
  },
});
