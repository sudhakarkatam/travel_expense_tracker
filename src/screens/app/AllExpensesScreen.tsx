import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import EmptyState from '@/components/EmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { generateTripSummary } from '@/utils/tripSummary';
import { formatCurrency } from '@/utils/currencyFormatter';
import { formatDateTime } from '@/utils/dateFormatter';

export default function AllExpensesScreen({ navigation, route }: any) {
  const { trips, expenses, deleteExpense, categories } = useApp();
  const { tripId } = route.params || {};
  const trip = tripId ? trips.find(t => t.id === tripId) : null;
  const showAllTrips = !tripId || tripId === null;
  
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category' | 'trip'>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | 'all'>('all');


  // Get all expenses (from single trip or all trips)
  const allExpenses = useMemo(() => {
    if (showAllTrips) {
      return expenses;
    } else if (trip) {
      const summary = generateTripSummary(trip, expenses);
      return summary?.expenses || [];
    }
    return [];
  }, [expenses, trip, showAllTrips]);

  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = [...allExpenses];
    
    // Filter by category
    if (selectedCategoryFilter !== 'all') {
      filtered = filtered.filter(expense => expense.category === selectedCategoryFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(expense => {
        const tripName = trips.find(t => t.id === expense.tripId)?.name || '';
        return expense.description.toLowerCase().includes(query) ||
               expense.category.toLowerCase().includes(query) ||
               expense.amount.toString().includes(query) ||
               tripName.toLowerCase().includes(query);
      });
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'date':
        return filtered.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      case 'amount':
        return filtered.sort((a, b) => b.amount - a.amount);
      case 'category':
        return filtered.sort((a, b) => a.category.localeCompare(b.category));
      case 'trip':
        return filtered.sort((a, b) => {
          const tripA = trips.find(t => t.id === a.tripId)?.name || '';
          const tripB = trips.find(t => t.id === b.tripId)?.name || '';
          return tripA.localeCompare(tripB);
        });
      default:
        return filtered;
    }
  }, [allExpenses, searchQuery, sortBy, selectedCategoryFilter, trips, showAllTrips]);

  // Get unique categories for filter
  const uniqueCategories = useMemo(() => {
    const cats = new Set(allExpenses.map(e => e.category));
    return Array.from(cats).sort();
  }, [allExpenses]);

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || 'receipt-outline';
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#6b7280';
  };

  const getExpenseTrip = (expense: any) => {
    return trips.find(t => t.id === expense.tripId);
  };

  const renderExpenseItem = (expense: any) => {
    const expenseTrip = getExpenseTrip(expense);
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
          tripId: expense.tripId 
        })}
        onLongPress={handleLongPress}
      >
        <View style={styles.expenseIcon}>
          <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(expense.category) }]}>
            <Ionicons name={getCategoryIcon(expense.category) as any} size={20} color="white" />
          </View>
        </View>
        
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDescription}>{expense.description || 'No description'}</Text>
          <View style={styles.expenseMeta}>
            <Text style={styles.expenseCategory}>{expense.category || 'Uncategorized'}</Text>
            {showAllTrips && expenseTrip ? (
              <Text style={styles.expenseTripName}>{expenseTrip.name || ''}</Text>
            ) : null}
            <Text style={styles.expenseDate}>
              {formatDateTime(expense.createdAt || expense.date)}
            </Text>
          </View>
          {expense.receiptImages && expense.receiptImages.length > 0 && (
            <View style={styles.receiptIndicator}>
              <Ionicons name="camera" size={12} color="#8b5cf6" />
              <Text style={styles.receiptText}>{expense.receiptImages.length} photo{expense.receiptImages.length > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.expenseAmount}>
          <Text style={styles.amountText}>
            {formatCurrency(expense.amount, { currency: expense.currency || expenseTrip?.currency || 'INR' })}
          </Text>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>All Expenses</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Trip Selector Dropdown */}
      <View style={styles.tripSelectorContainer}>
        <Text style={styles.tripSelectorLabel}>Select Trip</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={showAllTrips ? 'all' : (tripId || 'all')}
            onValueChange={(value) => {
              if (value === 'all') {
                navigation.navigate('AllExpenses', { tripId: null });
              } else {
                navigation.navigate('AllExpenses', { tripId: value });
              }
            }}
            style={styles.picker}
            dropdownIconColor="#8b5cf6"
          >
            <Picker.Item 
              label={`All Trips (${allExpenses.length} expenses)`} 
              value="all" 
            />
            {trips.map((t) => {
              const tripExpenses = expenses.filter(e => e.tripId === t.id);
              return (
                <Picker.Item
                  key={t.id}
                  label={`${t.name} (${tripExpenses.length} expenses)`}
                  value={t.id}
                />
              );
            })}
          </Picker>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search expenses..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters & Sort */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersHeader}>
          <Ionicons name="filter-outline" size={18} color="#8E8E93" />
          <Text style={styles.filtersHeaderText}>Filters & Sort</Text>
        </View>
        
        <View style={styles.filtersContent}>
          {uniqueCategories.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedCategoryFilter}
                  onValueChange={(value) => setSelectedCategoryFilter(value)}
                  style={styles.filterPicker}
                  dropdownIconColor="#8b5cf6"
                >
                  <Picker.Item label="All Categories" value="all" />
                  {uniqueCategories.map((cat) => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionLabel}>Sort By</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={sortBy}
                onValueChange={(value) => setSortBy(value)}
                style={styles.filterPicker}
                dropdownIconColor="#8b5cf6"
              >
                <Picker.Item label="Date (Newest First)" value="date" />
                <Picker.Item label="Amount (Highest First)" value="amount" />
                <Picker.Item label="Category (A-Z)" value="category" />
                {showAllTrips && (
                  <Picker.Item label="Trip (A-Z)" value="trip" />
                )}
              </Picker>
            </View>
          </View>
        </View>
      </View>

      {/* Expenses List */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredAndSortedExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons 
              name={searchQuery || selectedCategoryFilter !== 'all' ? "search-outline" : "receipt-outline"} 
              size={64} 
              color="#d1d5db" 
            />
            <Text style={styles.emptyTitle}>
              {searchQuery || selectedCategoryFilter !== 'all' ? "No Results Found" : "No Expenses Yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || selectedCategoryFilter !== 'all'
                ? "Try adjusting your filters or search query" 
                : showAllTrips 
                  ? "Start tracking expenses in your trips"
                  : "Start tracking your expenses for this trip"}
            </Text>
          </View>
        ) : (
          <View style={styles.expensesList}>
            {filteredAndSortedExpenses.map(renderExpenseItem)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  backButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  tripSelectorContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  tripSelectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  pickerContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#000000',
  },
  filterPicker: {
    height: 50,
    color: '#000000',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginRight: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    gap: 6,
  },
  activeSortButton: {
    backgroundColor: '#8b5cf6',
  },
  sortButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  activeSortButtonText: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  expensesList: {
    paddingHorizontal: 16,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  expenseIcon: {
    marginRight: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
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
  },
  expenseDate: {
    fontSize: 12,
    color: '#999',
  },
  expenseTripName: {
    fontSize: 12,
    color: '#8b5cf6',
    marginLeft: 8,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
    paddingBottom: 16,
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  filtersHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  filtersContent: {
    paddingTop: 12,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  filterSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 10,
    letterSpacing: 0.5,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#8b5cf6',
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
