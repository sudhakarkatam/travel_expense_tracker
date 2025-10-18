import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { getCurrencySymbol } from '@/constants/currencies';
import { getCategoryInfo, EXPENSE_CATEGORIES } from '@/constants/categories';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Lightbulb } from 'lucide-react-native';
import * as Icons from 'lucide-react-native';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { trips, expenses } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('all');

  const analytics = useMemo(() => {
    const now = new Date();
    let filteredExpenses = expenses;

    if (selectedPeriod === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredExpenses = expenses.filter(e => new Date(e.date) >= weekAgo);
    } else if (selectedPeriod === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredExpenses = expenses.filter(e => new Date(e.date) >= monthAgo);
    }

    const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const avgPerExpense = filteredExpenses.length > 0 ? totalSpent / filteredExpenses.length : 0;

    const byCategory: Record<string, number> = {};
    filteredExpenses.forEach(expense => {
      const category = getCategoryInfo(expense.category).label;
      byCategory[category] = (byCategory[category] || 0) + expense.amount;
    });

    const categoryData = Object.entries(byCategory)
      .map(([name, amount]) => ({ name, amount, percentage: (amount / totalSpent) * 100 }))
      .sort((a, b) => b.amount - a.amount);

    const tripSpending = trips.map(trip => {
      const tripExpenses = filteredExpenses.filter(e => e.tripId === trip.id);
      const spent = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        trip,
        spent,
        percentage: trip.budget > 0 ? (spent / trip.budget) * 100 : 0,
      };
    }).sort((a, b) => b.spent - a.spent);

    const dailySpending: Record<string, number> = {};
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      dailySpending[date] = (dailySpending[date] || 0) + expense.amount;
    });

    const dailyData = Object.entries(dailySpending)
      .map(([date, amount]) => ({ date, amount }))
      .slice(-7);

    const maxDaily = Math.max(...Object.values(dailySpending), 1);

    return {
      totalSpent,
      avgPerExpense,
      expenseCount: filteredExpenses.length,
      categoryData,
      tripSpending,
      dailyData,
      maxDaily,
    };
  }, [expenses, trips, selectedPeriod]);

  const getCategoryIcon = (categoryLabel: string) => {
    const category = EXPENSE_CATEGORIES.find(c => c.label === categoryLabel);
    if (!category) return Icons.MoreHorizontal;
    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ size: number; color: string }>>)[category.icon];
    return IconComponent || Icons.MoreHorizontal;
  };

  const getCategoryColor = (categoryLabel: string) => {
    const category = EXPENSE_CATEGORIES.find(c => c.label === categoryLabel);
    return category?.color || '#A8DADC';
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.periodSelector}>
          {(['week', 'month', 'all'] as const).map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period === 'week' ? 'Last 7 Days' : period === 'month' ? 'Last 30 Days' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <DollarSign size={24} color="#6366F1" />
            </View>
            <Text style={styles.statValue}>
              ${analytics.totalSpent.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <TrendingUp size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>
              {analytics.expenseCount}
            </Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Calendar size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>
              ${analytics.avgPerExpense.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Avg per Expense</Text>
          </View>
        </View>

        {expenses.length > 3 && (
          <TouchableOpacity
            style={styles.insightsCard}
            onPress={() => router.push('/insights')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.insightsGradient}
            >
              <Lightbulb size={32} color="#FFFFFF" />
              <View style={styles.insightsContent}>
                <Text style={styles.insightsTitle}>Get AI Insights</Text>
                <Text style={styles.insightsSubtitle}>
                  Smart recommendations based on your spending
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          
          {analytics.categoryData.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No expenses yet</Text>
            </View>
          ) : (
            analytics.categoryData.map((item, index) => {
              const IconComponent = getCategoryIcon(item.name);
              const color = getCategoryColor(item.name);

              return (
                <View key={index} style={styles.categoryCard}>
                  <View style={[styles.categoryIcon, { backgroundColor: `${color}20` }]}>
                    <IconComponent size={20} color={color} />
                  </View>

                  <View style={styles.categoryInfo}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>{item.name}</Text>
                      <Text style={styles.categoryAmount}>
                        ${item.amount.toFixed(0)}
                      </Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${item.percentage}%`,
                            backgroundColor: color,
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.categoryPercentage}>
                      {item.percentage.toFixed(1)}% of total
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Spending</Text>
          
          {analytics.dailyData.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No data available</Text>
            </View>
          ) : (
            <View style={styles.chartCard}>
              <View style={styles.chart}>
                {analytics.dailyData.map((item, index) => {
                  const height = (item.amount / analytics.maxDaily) * 120;

                  return (
                    <View key={index} style={styles.chartBar}>
                      <View style={styles.chartBarContainer}>
                        <View
                          style={[
                            styles.chartBarFill,
                            {
                              height: Math.max(height, 4),
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={['#6366F1', '#8B5CF6']}
                            style={styles.chartBarGradient}
                          />
                        </View>
                      </View>
                      <Text style={styles.chartLabel}>{item.date.split(' ')[0]}</Text>
                      <Text style={styles.chartAmount}>${item.amount.toFixed(0)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending by Trip</Text>

          {analytics.tripSpending.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No trips yet</Text>
            </View>
          ) : (
            analytics.tripSpending.map((item, index) => (
              <View key={index} style={styles.tripCard}>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripName}>{item.trip.name}</Text>
                  <Text style={styles.tripAmount}>
                    {getCurrencySymbol(item.trip.currency)}{item.spent.toFixed(0)}
                  </Text>
                </View>

                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(item.percentage, 100)}%`,
                        backgroundColor: item.percentage > 90 ? '#EF4444' : '#6366F1',
                      },
                    ]}
                  />
                </View>

                <Text style={styles.tripBudget}>
                  {item.percentage.toFixed(0)}% of {getCurrencySymbol(item.trip.currency)}
                  {item.trip.budget.toFixed(0)} budget
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

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
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
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
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  categoryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1E293B',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1E293B',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#64748B',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 160,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarContainer: {
    width: '80%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 120,
    marginBottom: 8,
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  chartBarGradient: {
    flex: 1,
  },
  chartLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  chartAmount: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#1E293B',
    marginTop: 2,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1E293B',
  },
  tripAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1E293B',
  },
  tripBudget: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  insightsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  insightsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  insightsContent: {
    flex: 1,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  insightsSubtitle: {
    fontSize: 13,
    color: '#E0E7FF',
  },
});
