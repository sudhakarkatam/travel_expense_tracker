import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { generateTripSummary } from '@/utils/tripSummary';
import { PDFExportService } from '@/services/pdfExport';
import { formatDateTime } from '@/utils/dateFormatter';
import * as Sharing from 'expo-sharing';

export default function TripDetailScreen({ navigation, route }: any) {
  const { trips, expenses, deleteExpense, settlements, getTripBalances } = useApp();
  const { tripId } = route.params;
  const trip = trips.find(t => t.id === tripId);
  const summary = trip ? generateTripSummary(trip, expenses) : null;
  const [isExporting, setIsExporting] = useState(false);

  const handleExportTrip = async () => {
    if (!trip || !summary) return;
    
    setIsExporting(true);
    try {
      const tripExpenses = expenses.filter(expense => expense.tripId === trip.id);
      const tripSettlements = settlements.filter(settlement => settlement.tripId === trip.id);
      const tripBalances = getTripBalances(trip.id);
      
      const totalSpent = tripExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const remainingBudget = trip.budget - totalSpent;
      
      const categoryBreakdown = tripExpenses.reduce((breakdown, expense) => {
        breakdown[expense.category] = (breakdown[expense.category] || 0) + expense.amount;
        return breakdown;
      }, {} as Record<string, number>);

      const tripSummary = {
        trip: trip,
        expenses: tripExpenses,
        totalSpent,
        remainingBudget,
        categoryBreakdown,
        settlements: tripSettlements,
        balances: tripBalances,
      };

      const pdfUri = await PDFExportService.generateComprehensiveTripPDF(tripSummary);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${trip.name} - Comprehensive Report`,
        });
      } else {
        Alert.alert('Success', 'Comprehensive trip PDF generated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export trip PDF. Please try again.');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

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
            <Text style={styles.expenseDate}>
              {formatDateTime(expense.createdAt || expense.date)}
            </Text>
        </View>
        <Text style={styles.expenseAmount}>₹{expense.amount.toFixed(2)}</Text>
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
        <Text style={styles.title}>{trip.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={handleExportTrip}
            disabled={isExporting}
            style={styles.headerActionButton}
          >
            <Ionicons 
              name={isExporting ? "hourglass-outline" : "document-attach-outline"} 
              size={24} 
              color={isExporting ? "#999" : "#8b5cf6"} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('EditTrip', { tripId: trip.id })}>
            <Ionicons name="pencil-outline" size={24} color="#8b5cf6" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
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
            <Text style={styles.budgetAmount}>₹{summary.totalSpent.toFixed(2)}</Text>
          </View>
          <View style={styles.budgetSection}>
            <Text style={styles.budgetLabel}>Remaining</Text>
            <Text style={styles.budgetAmount}>₹{summary.remainingBudget.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min((summary.totalSpent / trip.budget) * 100, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {((summary.totalSpent / trip.budget) * 100).toFixed(0)}% of ₹{trip.budget.toFixed(2)} budget used
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

        {/* Expense Summary Card */}
        <View style={styles.expenseSummaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="receipt-outline" size={20} color="#8b5cf6" />
              <Text style={styles.summaryValue}>{summary.expenses.length}</Text>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="wallet-outline" size={20} color="#22c55e" />
              <Text style={styles.summaryValue}>₹{summary.totalSpent.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Total Amount</Text>
            </View>
          </View>
        </View>

        <View style={styles.expensesSection}>
          <View style={styles.expensesHeader}>
            <Text style={styles.sectionTitle}>Expenses ({summary.expenses.length})</Text>
            {summary.expenses.length > 0 && (
              <TouchableOpacity 
                style={styles.showAllHeaderButton}
                onPress={() => navigation.navigate('AllExpenses', { tripId: trip.id })}
              >
                <Text style={styles.showAllHeaderText}>Show All</Text>
                <Ionicons name="chevron-forward" size={16} color="#8b5cf6" />
              </TouchableOpacity>
            )}
          </View>
          {summary.expenses.length === 0 ? (
            <View style={styles.emptyExpenses}>
              <Ionicons name="trending-up-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No expenses yet</Text>
              <Text style={styles.emptySubtext}>Start tracking by adding your first expense</Text>
            </View>
          ) : (
            <>
              {summary.expenses.slice(0, 5).map(renderExpenseItem)}
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
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionButton: {
    padding: 4,
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
  },
  scrollContent: {
    paddingBottom: 16,
    paddingTop: 0,
  },
  budgetCard: {
    flexDirection: 'row',
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 16,
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
    marginHorizontal: 16,
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
    marginHorizontal: 16,
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
    marginHorizontal: 16,
  },
  expensesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  showAllHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  showAllHeaderText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
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
    marginTop: 0,
    width: '100%',
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
    marginTop: 0,
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
  expenseSummaryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    marginHorizontal: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#e5e7eb',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
