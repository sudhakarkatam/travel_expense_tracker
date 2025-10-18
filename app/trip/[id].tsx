import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Plus, Users, TrendingUp, Trash2, Share2, Copy, Scan } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp, useTripData } from '@/contexts/AppContext';
import { getCurrencySymbol } from '@/constants/currencies';
import { getCategoryInfo } from '@/constants/categories';
import * as Icons from 'lucide-react-native';

export default function TripDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteExpense, deleteTrip } = useApp();
  const tripData = useTripData(id);

  const sortedExpenses = useMemo(() => {
    if (!tripData) return [];
    return [...tripData.expenses].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [tripData]);

  if (!tripData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Trip not found</Text>
      </View>
    );
  }

  const { trip, expenses, totalSpent, remaining, percentageUsed } = tripData;

  const handleDeleteTrip = () => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This will also delete all expenses.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTrip(trip.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleShareInvite = async () => {
    if (!trip.inviteCode) {
      Alert.alert('Error', 'This trip does not have an invite code');
      return;
    }

    try {
      await Share.share({
        message: `Join my trip "${trip.name}" on Travel Expense Tracker!\n\nInvite Code: ${trip.inviteCode}\n\nUse this code in the app to join the trip and split expenses.`,
        title: `Join ${trip.name}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyInviteCode = () => {
    if (!trip.inviteCode) return;
    Clipboard.setString(trip.inviteCode);
    Alert.alert('Copied!', 'Invite code copied to clipboard');
  };

  const handleDeleteExpense = (expenseId: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteExpense(expenseId),
        },
      ]
    );
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ size: number; color: string }>>)[iconName];
    return IconComponent || Icons.MoreHorizontal;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: trip.name,
          headerRight: () => (
            <TouchableOpacity onPress={handleDeleteTrip} style={styles.headerButton}>
              <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryGradient}
          >
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Spent</Text>
                <Text style={styles.summaryValue}>
                  {getCurrencySymbol(trip.currency)}{totalSpent.toFixed(0)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Remaining</Text>
                <Text style={styles.summaryValue}>
                  {getCurrencySymbol(trip.currency)}{Math.max(0, remaining).toFixed(0)}
                </Text>
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { 
                    width: `${Math.min(percentageUsed, 100)}%`,
                    backgroundColor: percentageUsed > 90 ? '#FCA5A5' : '#FFFFFF',
                  },
                ]} 
              />
            </View>

            <Text style={styles.budgetText}>
              {percentageUsed.toFixed(0)}% of {getCurrencySymbol(trip.currency)}{trip.budget.toFixed(0)} budget used
            </Text>
          </LinearGradient>
        </View>

        {trip.isGroup && trip.inviteCode && (
          <View style={styles.inviteCard}>
            <View style={styles.inviteHeader}>
              <Text style={styles.inviteTitle}>Invite Friends</Text>
              <Text style={styles.inviteSubtitle}>
                {trip.participants.length} participant{trip.participants.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.inviteCodeContainer}>
              <Text style={styles.inviteCodeLabel}>Invite Code</Text>
              <View style={styles.inviteCodeRow}>
                <Text style={styles.inviteCode}>{trip.inviteCode}</Text>
                <TouchableOpacity
                  style={styles.inviteCodeButton}
                  onPress={handleCopyInviteCode}
                >
                  <Copy size={18} color="#6366F1" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareInvite}
            >
              <Share2 size={20} color="#6366F1" />
              <Text style={styles.shareButtonText}>Share Invite</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionsRow}>
          {trip.isGroup && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/balances/${trip.id}`)}
            >
              <Users size={20} color="#6366F1" />
              <Text style={styles.actionButtonText}>Balances</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              router.push({
                pathname: '/scan-receipt',
                params: { tripId: trip.id },
              });
            }}
          >
            <Scan size={20} color="#10B981" />
            <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              router.push({
                pathname: '/add-expense',
                params: { tripId: trip.id },
              });
            }}
          >
            <Plus size={20} color="#6366F1" />
            <Text style={styles.actionButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.expensesSection}>
          <Text style={styles.sectionTitle}>Expenses ({expenses.length})</Text>

          {sortedExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <TrendingUp size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No expenses yet</Text>
              <Text style={styles.emptySubtext}>Start tracking by adding your first expense</Text>
            </View>
          ) : (
            sortedExpenses.map((expense) => {
              const categoryInfo = getCategoryInfo(expense.category);
              const IconComponent = getCategoryIcon(categoryInfo.icon);

              return (
                <TouchableOpacity
                  key={expense.id}
                  style={styles.expenseCard}
                  onLongPress={() => handleDeleteExpense(expense.id)}
                  activeOpacity={0.7}
                >
                  <View 
                    style={[
                      styles.expenseIcon,
                      { backgroundColor: `${categoryInfo.color}20` },
                    ]}
                  >
                    <IconComponent size={20} color={categoryInfo.color} />
                  </View>

                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseDescription}>
                      {expense.description}
                    </Text>
                    <Text style={styles.expenseCategory}>
                      {categoryInfo.label}
                    </Text>
                    {expense.splitBetween.length > 1 && (
                      <Text style={styles.expenseSplit}>
                        Split between {expense.splitBetween.length} people
                      </Text>
                    )}
                  </View>

                  <View style={styles.expenseRight}>
                    <Text style={styles.expenseAmount}>
                      {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(0)}
                    </Text>
                    <Text style={styles.expenseDate}>
                      {new Date(expense.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
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
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    color: '#64748B',
  },
  summaryCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  summaryGradient: {
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#E0E7FF',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#A5B4FC',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  budgetText: {
    fontSize: 13,
    color: '#E0E7FF',
    textAlign: 'center',
  },
  inviteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inviteHeader: {
    marginBottom: 12,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1E293B',
    marginBottom: 2,
  },
  inviteSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  inviteCodeContainer: {
    marginBottom: 12,
  },
  inviteCodeLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748B',
    marginBottom: 6,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  inviteCode: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#6366F1',
    letterSpacing: 2,
  },
  inviteCodeButton: {
    padding: 4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    padding: 12,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6366F1',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#6366F1',
  },
  expensesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#64748B',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expenseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1E293B',
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 13,
    color: '#64748B',
  },
  expenseSplit: {
    fontSize: 12,
    color: '#6366F1',
    marginTop: 2,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
