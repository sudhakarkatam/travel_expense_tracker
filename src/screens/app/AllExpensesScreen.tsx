import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { generateTripSummary } from '@/utils/tripSummary';

export default function AllExpensesScreen({ navigation, route }: any) {
  const { trips, expenses, deleteExpense, categories } = useApp();
  const { tripId } = route.params;
  const trip = trips.find(t => t.id === tripId);
  const summary = trip ? generateTripSummary(trip, expenses) : null;
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date');

  if (!trip || !summary) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>All Expenses</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Trip not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSort = (type: 'date' | 'amount' | 'category') => {
    setSortBy(type);
  };

  const getSortedExpenses = () => {
    const sortedExpenses = [...summary.expenses];
    
    switch (sortBy) {
      case 'date':
        return sortedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'amount':
        return sortedExpenses.sort((a, b) => b.amount - a.amount);
      case 'category':
        return sortedExpenses.sort((a, b) => a.category.localeCompare(b.category));
      default:
        return sortedExpenses;
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || 'receipt-outline';
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#6b7280';
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
        <View style={styles.expenseIcon}>
          <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(expense.category) }]}>
            <Ionicons name={getCategoryIcon(expense.category) as any} size={20} color="white" />
          </View>
        </View>
        
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDescription}>{expense.description}</Text>
          <View style={styles.expenseMeta}>
            <Text style={styles.expenseCategory}>{expense.category}</Text>
            <Text style={styles.expenseDate}>{new Date(expense.date).toLocaleDateString()}</Text>
          </View>
          {expense.receiptImages && expense.receiptImages.length > 0 && (
            <View style={styles.receiptIndicator}>
              <Ionicons name="camera" size={12} color="#8b5cf6" />
              <Text style={styles.receiptText}>{expense.receiptImages.length} photo{expense.receiptImages.length > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.expenseAmount}>
          <Text style={styles.amountText}>₹{expense.amount.toFixed(2)}</Text>
          {expense.splitBetween && expense.splitBetween.length > 0 && (
            <View style={styles.splitIndicator}>
              <Ionicons name="people" size={12} color="#666" />
              <Text style={styles.splitText}>{expense.splitBetween.length}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const sortedExpenses = getSortedExpenses();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>All Expenses</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Trip Info */}
      <View style={styles.tripInfo}>
        <Text style={styles.tripName}>{trip.name}</Text>
        <Text style={styles.tripDestination}>{trip.destination}</Text>
        <Text style={styles.expenseCount}>{summary.expenses.length} expenses</Text>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity 
            style={[styles.sortButton, sortBy === 'date' && styles.activeSortButton]}
            onPress={() => handleSort('date')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'date' && styles.activeSortButtonText]}>
              Date
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sortButton, sortBy === 'amount' && styles.activeSortButton]}
            onPress={() => handleSort('amount')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'amount' && styles.activeSortButtonText]}>
              Amount
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sortButton, sortBy === 'category' && styles.activeSortButton]}
            onPress={() => handleSort('category')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'category' && styles.activeSortButtonText]}>
              Category
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Expenses List */}
      <ScrollView style={styles.content}>
        {sortedExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Expenses Yet</Text>
            <Text style={styles.emptySubtitle}>Start tracking your expenses for this trip</Text>
          </View>
        ) : (
          <View style={styles.expensesList}>
            {sortedExpenses.map(renderExpenseItem)}
          </View>
        )}
      </ScrollView>
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
  tripInfo: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tripName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tripDestination: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  expenseCount: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sortLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  activeSortButton: {
    backgroundColor: '#8b5cf6',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeSortButtonText: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  expensesList: {
    padding: 16,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  expenseIcon: {
    marginRight: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'capitalize',
  },
  expenseDate: {
    fontSize: 12,
    color: '#999',
  },
  receiptIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  receiptText: {
    fontSize: 11,
    color: '#8b5cf6',
  },
  expenseAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  splitIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  splitText: {
    fontSize: 11,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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
});
