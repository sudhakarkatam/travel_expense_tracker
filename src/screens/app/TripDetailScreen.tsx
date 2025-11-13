import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Surface, ProgressBar, Divider, List, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useApp } from '@/contexts/AppContext';
import { generateTripSummary } from '@/utils/tripSummary';
import { PDFExportService } from '@/services/pdfExport';
import { formatDateTime } from '@/utils/dateFormatter';
import { formatCurrency } from '@/utils/currencyFormatter';
import * as Sharing from 'expo-sharing';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { Chip } from '@/components/ui/Chip';

export default function TripDetailScreen({ navigation, route }: any) {
  const theme = useTheme();
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
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>Trip not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercentage = Math.min((summary.totalSpent / trip.budget) * 100, 100);
  const isOverBudget = summary.totalSpent > trip.budget;
  const isNearBudget = progressPercentage > 80;

  const renderExpenseItem = (expense: any, index: number) => {
    return (
      <MotiView
        key={expense.id}
        from={{ opacity: 0, translateX: -20 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 300, delay: index * 50 }}
      >
        <AnimatedCard
          variant="elevated"
          elevation={1}
          onPress={() => {
            navigation.navigate('ExpenseDetail', { 
              expenseId: expense.id, 
              tripId: trip.id 
            });
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          style={styles.expenseCard}
        >
          <List.Item
            title={expense.description || 'No description'}
            description={`${expense.category} • ${formatDateTime(expense.createdAt || expense.date)}`}
            left={(props) => (
              <List.Icon 
                {...props} 
                icon="receipt" 
                color={theme.colors.primary} 
              />
            )}
            right={() => (
              <Text style={[styles.expenseAmount, { color: theme.colors.onSurface }]}>
                {formatCurrency(expense.amount, trip.currency)}
              </Text>
            )}
            titleStyle={{ color: theme.colors.onSurface, fontWeight: '600' }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
          />
        </AnimatedCard>
      </MotiView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Surface style={styles.header} elevation={1}>
        <AnimatedButton
          mode="text"
          icon="arrow-back"
          onPress={() => {
            const returnSearchQuery = route?.params?.returnSearchQuery;
            if (returnSearchQuery) {
              navigation.navigate('Home', { returnSearchQuery });
            } else {
              navigation.goBack();
            }
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          label=""
          style={styles.backButton}
        />
        <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>
          {trip.name}
        </Text>
        <View style={styles.headerActions}>
          <AnimatedButton
            mode="text"
            icon={isExporting ? "hourglass-outline" : "document-attach-outline"}
            onPress={handleExportTrip}
            disabled={isExporting}
            label=""
            style={styles.headerActionButton}
          />
          <AnimatedButton
            mode="text"
            icon="pencil-outline"
            onPress={() => {
              navigation.navigate('EditTrip', { tripId: trip.id });
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            label=""
            style={styles.headerActionButton}
          />
        </View>
      </Surface>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
        >
          {/* Cover Image Hero Section */}
          {trip.coverImage ? (
            <View style={styles.coverImageContainer}>
              <Image source={{ uri: trip.coverImage }} style={styles.coverImage} contentFit="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.coverImageOverlay}
              >
                <Text style={styles.coverImageTitle}>{trip.name}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={16} color="#FFFFFF" />
                  <Text style={styles.coverImageSubtitle}>{trip.destination}</Text>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverImagePlaceholder}
            >
              <Ionicons name="airplane" size={48} color="#FFFFFF" />
              <Text style={styles.placeholderTitle}>{trip.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color="#FFFFFF" />
                <Text style={styles.placeholderSubtitle}>{trip.destination}</Text>
              </View>
            </LinearGradient>
          )}

          {/* Budget Card */}
          <AnimatedCard variant="elevated" elevation={2} style={styles.budgetCard}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.budgetGradient}
            >
              <View style={styles.budgetSection}>
                <Text style={styles.budgetLabel}>Spent</Text>
                <Text style={styles.budgetAmount}>
                  {formatCurrency(summary.totalSpent, trip.currency)}
                </Text>
              </View>
              <View style={styles.budgetDivider} />
              <View style={styles.budgetSection}>
                <Text style={styles.budgetLabel}>Remaining</Text>
                <Text style={[
                  styles.budgetAmount,
                  summary.remainingBudget < 0 && { color: theme.colors.error }
                ]}>
                  {formatCurrency(summary.remainingBudget, trip.currency)}
                </Text>
              </View>
            </LinearGradient>
          </AnimatedCard>

          {/* Progress Section */}
          <AnimatedCard variant="elevated" elevation={2} style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: theme.colors.onSurface }]}>
                Budget Progress
              </Text>
              <Text style={[
                styles.progressPercentage,
                { 
                  color: isOverBudget 
                    ? theme.colors.error 
                    : isNearBudget 
                    ? '#FF9500' 
                    : theme.colors.primary 
                }
              ]}>
                {progressPercentage.toFixed(0)}%
              </Text>
            </View>
            <ProgressBar
              progress={progressPercentage / 100}
              color={
                isOverBudget 
                  ? theme.colors.error 
                  : isNearBudget 
                  ? '#FF9500' 
                  : theme.colors.primary
              }
              style={styles.progressBar}
            />
            <Text style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}>
              {formatCurrency(trip.budget, trip.currency)} total budget
            </Text>
          </AnimatedCard>

          {/* Summary Stats */}
          <AnimatedCard variant="elevated" elevation={2} style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Ionicons name="receipt-outline" size={24} color={theme.colors.primary} />
                <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>
                  {summary.expenses.length}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Expenses
                </Text>
              </View>
              <Divider style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="wallet-outline" size={24} color={theme.colors.secondary} />
                <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>
                  {formatCurrency(summary.totalSpent, trip.currency)}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Total Spent
                </Text>
              </View>
            </View>
          </AnimatedCard>

          {/* Expenses Section */}
          <View style={styles.expensesSection}>
            <View style={styles.expensesHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Expenses ({summary.expenses.length})
              </Text>
              {summary.expenses.length > 0 && (
                <AnimatedButton
                  mode="text"
                  label="Show All"
                  icon="chevron-forward"
                  onPress={() => {
                    navigation.navigate('AllExpenses', { tripId: trip.id });
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  variant="primary"
                />
              )}
            </View>

            {summary.expenses.length === 0 ? (
              <AnimatedCard variant="outlined" style={styles.emptyCard}>
                <View style={styles.emptyExpenses}>
                  <Ionicons name="trending-up-outline" size={64} color={theme.colors.onSurfaceVariant} />
                  <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>
                    No expenses yet
                  </Text>
                  <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
                    Start tracking by adding your first expense
                  </Text>
                  <AnimatedButton
                    mode="contained"
                    label="Add Expense"
                    icon="add"
                    onPress={() => {
                      navigation.navigate('AddExpense', { tripId: trip.id });
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                    }}
                    variant="primary"
                    style={styles.emptyButton}
                  />
                </View>
              </AnimatedCard>
            ) : (
              <View style={styles.expensesList}>
                {summary.expenses.slice(0, 5).map((expense, index) => renderExpenseItem(expense, index))}
              </View>
            )}
          </View>
        </MotiView>
      </ScrollView>

      {/* Bottom Actions */}
      <Surface style={styles.bottomActions} elevation={4}>
        <AnimatedButton
          mode="outlined"
          label="Members"
          icon="people"
          onPress={() => {
            navigation.navigate('ManageMembers', { tripId: trip.id });
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          variant="secondary"
          style={[styles.bottomActionButton, { flex: 1, minWidth: 0 }]}
          labelStyle={{ fontSize: 13 }}
        />
        <AnimatedButton
          mode="outlined"
          label="Settle Up"
          icon="card"
          onPress={() => {
            navigation.navigate('SettleUp', { tripId: trip.id });
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          variant="secondary"
          style={[styles.bottomActionButton, { flex: 1, minWidth: 0 }]}
          labelStyle={{ fontSize: 13 }}
        />
        <AnimatedButton
          mode="contained"
          label="Add Expense"
          icon="add"
          onPress={() => {
            navigation.navigate('AddExpense', { tripId: trip.id });
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }}
          variant="primary"
          style={styles.addExpenseButton}
        />
      </Surface>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    minWidth: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    minWidth: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  coverImageContainer: {
    position: 'relative',
    height: 250,
    marginBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  coverImageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coverImageSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  coverImagePlaceholder: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 0,
  },
  placeholderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  budgetCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  budgetGradient: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
  },
  budgetSection: {
    flex: 1,
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    fontWeight: '500',
  },
  budgetAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  budgetDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },
  progressCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  summaryDivider: {
    width: 1,
    height: 60,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  expensesSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  expensesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  expensesList: {
    gap: 12,
  },
  expenseCard: {
    marginBottom: 0,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 32,
  },
  emptyExpenses: {
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 8,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  bottomActionButton: {
    flex: 1,
    minWidth: 0,
  },
  addExpenseButton: {
    flex: 1.5,
    minWidth: 0,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
