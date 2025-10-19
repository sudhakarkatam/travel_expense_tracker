import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';
import { useApp } from '@/contexts/AppContext';
import {
  getCategoryBreakdown,
  getSpendingTrend,
  getTopExpenses,
  getTripComparison,
  getBudgetUtilization,
  getParticipantSpending,
  getSpendingInsights,
} from '@/utils/analyticsCalculations';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const { trips, expenses } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const periodDays = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    'all': 365,
  };

  const filteredExpenses = useMemo(() => {
    if (selectedPeriod === 'all') return expenses;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays[selectedPeriod]);
    
    return expenses.filter(expense => new Date(expense.date) >= cutoffDate);
  }, [expenses, selectedPeriod]);

  const categoryBreakdown = useMemo(() => getCategoryBreakdown(filteredExpenses), [filteredExpenses]);
  const spendingTrend = useMemo(() => getSpendingTrend(filteredExpenses, 'daily', periodDays[selectedPeriod]), [filteredExpenses, selectedPeriod]);
  const topExpenses = useMemo(() => getTopExpenses(filteredExpenses, 5), [filteredExpenses]);
  const tripComparison = useMemo(() => getTripComparison(trips, filteredExpenses), [trips, filteredExpenses]);
  const budgetUtilization = useMemo(() => getBudgetUtilization(trips, filteredExpenses), [trips, filteredExpenses]);
  const spendingInsights = useMemo(() => getSpendingInsights(trips, filteredExpenses), [trips, filteredExpenses]);

  const totalSpent = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const avgPerTrip = trips.length > 0 ? totalSpent / trips.length : 0;
  const topCategory = categoryBreakdown[0];

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#8b5cf6',
    },
  };

  const pieChartData = categoryBreakdown.map(category => ({
    name: category.category,
    population: category.amount,
    color: category.color,
    legendFontColor: '#333',
    legendFontSize: 12,
  }));

  const lineChartData = {
    labels: spendingTrend.slice(-7).map(day => day.dayOfWeek),
    datasets: [
      {
        data: spendingTrend.slice(-7).map(day => day.amount),
        strokeWidth: 2,
      },
    ],
  };

  const renderInsightCard = (insight: any) => (
    <View key={insight.title} style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <Ionicons 
          name={insight.icon as any} 
          size={24} 
          color={insight.type === 'warning' ? '#f59e0b' : insight.type === 'success' ? '#22c55e' : '#8b5cf6'} 
        />
        <Text style={styles.insightTitle}>{insight.title}</Text>
      </View>
      <Text style={styles.insightDescription}>{insight.description}</Text>
      {insight.value && (
        <Text style={styles.insightValue}>${insight.value.toFixed(2)}</Text>
      )}
    </View>
  );

  const renderTopExpense = ({ item }: { item: any }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseDescription}>{item.description}</Text>
        <Text style={styles.expenseCategory}>{item.category}</Text>
      </View>
      <Text style={styles.expenseAmount}>${item.amount.toFixed(2)}</Text>
    </View>
  );

  const renderTripComparison = ({ item }: { item: any }) => (
    <View style={styles.tripItem}>
      <View style={styles.tripInfo}>
        <Text style={styles.tripName}>{item.tripName}</Text>
        <Text style={styles.tripDestination}>{item.destination}</Text>
      </View>
      <View style={styles.tripStats}>
        <Text style={styles.tripSpent}>${item.totalSpent.toFixed(2)}</Text>
        <Text style={styles.tripBudget}>/ ${item.budget.toFixed(2)}</Text>
        <View style={[styles.tripProgress, { width: `${Math.min(item.percentageUsed, 100)}%` }]} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Track your spending patterns</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['7d', '30d', '90d', 'all'] as const).map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.selectedPeriodButton,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.selectedPeriodButtonText,
              ]}>
                {period === 'all' ? 'All Time' : period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Ionicons name="wallet" size={32} color="#8b5cf6" />
            <Text style={styles.summaryValue}>${totalSpent.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Total Spent</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="airplane" size={32} color="#3b82f6" />
            <Text style={styles.summaryValue}>{trips.length}</Text>
            <Text style={styles.summaryLabel}>Trips</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="receipt" size={32} color="#22c55e" />
            <Text style={styles.summaryValue}>{filteredExpenses.length}</Text>
            <Text style={styles.summaryLabel}>Expenses</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="calculator" size={32} color="#f59e0b" />
            <Text style={styles.summaryValue}>${avgPerTrip.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Avg/Trip</Text>
          </View>
        </View>

        {/* Insights */}
        {spendingInsights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insights</Text>
            <FlatList
              data={spendingInsights}
              renderItem={({ item }) => renderInsightCard(item)}
              keyExtractor={(item) => item.title}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.insightsContainer}
            />
          </View>
        )}

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending by Category</Text>
            <View style={styles.chartContainer}>
              {pieChartData.length > 0 ? (
                <PieChart
                  data={pieChartData}
                  width={screenWidth - 32}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  center={[10, 10]}
                />
              ) : (
                <View style={styles.emptyChart}>
                  <Ionicons name="pie-chart-outline" size={48} color="#d1d5db" />
                  <Text style={styles.emptyChartText}>No data to display</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Spending Trend */}
        {spendingTrend.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending Trend</Text>
            <View style={styles.chartContainer}>
              <LineChart
                data={lineChartData}
                width={screenWidth - 32}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </View>
          </View>
        )}

        {/* Top Expenses */}
        {topExpenses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Expenses</Text>
            <FlatList
              data={topExpenses}
              renderItem={renderTopExpense}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Trip Comparison */}
        {tripComparison.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Comparison</Text>
            <FlatList
              data={tripComparison}
              renderItem={renderTripComparison}
              keyExtractor={(item) => item.tripId}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Budget Utilization */}
        {budgetUtilization.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget Utilization</Text>
            <View style={styles.budgetContainer}>
              {budgetUtilization.map(trip => (
                <View key={trip.tripId} style={styles.budgetItem}>
                  <Text style={styles.budgetTripName}>{trip.tripName}</Text>
                  <View style={styles.budgetBar}>
                    <View 
                      style={[
                        styles.budgetProgress, 
                        { 
                          width: `${Math.min(trip.percentage, 100)}%`,
                          backgroundColor: trip.isOverBudget ? '#ef4444' : '#8b5cf6',
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.budgetText}>
                    ${trip.used.toFixed(2)} / ${(trip.used + trip.remaining).toFixed(2)} ({trip.percentage.toFixed(1)}%)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  selectedPeriodButton: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedPeriodButtonText: {
    color: '#8b5cf6',
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  insightsContainer: {
    paddingHorizontal: 4,
  },
  insightCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  insightDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyChart: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  chart: {
    borderRadius: 16,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  expenseCategory: {
    fontSize: 14,
    color: '#666',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  tripItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripInfo: {
    marginBottom: 8,
  },
  tripName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tripDestination: {
    fontSize: 14,
    color: '#666',
  },
  tripStats: {
    position: 'relative',
  },
  tripSpent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  tripBudget: {
    fontSize: 14,
    color: '#666',
  },
  tripProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: '#8b5cf6',
    borderRadius: 1,
  },
  budgetContainer: {
    gap: 12,
  },
  budgetItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  budgetTripName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  budgetBar: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  budgetProgress: {
    height: '100%',
    borderRadius: 4,
  },
  budgetText: {
    fontSize: 14,
    color: '#666',
  },
});