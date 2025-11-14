import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Surface } from "react-native-paper";
import { useThemeMode } from "@/contexts/ThemeContext";
import { PieChart } from "react-native-chart-kit";
import { useApp } from "@/contexts/AppContext";
import {
  getCategoryBreakdown,
  getTopExpenses,
  getTripComparison,
  getBudgetUtilization,
  getSpendingInsights,
} from "@/utils/analyticsCalculations";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EmptyAnalyticsState } from "@/components/EmptyState";
import { formatCurrency, formatPercentageChange } from "@/utils/currencyFormatter";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 48;

interface AnalyticsScreenProps {
  navigation: any;
}

export default function AnalyticsScreen({ navigation }: AnalyticsScreenProps) {
  const theme = useTheme();
  const { isDark } = useThemeMode();
  
  const safeTheme = {
    colors: {
      background: theme?.colors?.background || (isDark ? '#111827' : '#FFFFFF'),
      surface: theme?.colors?.surface || (isDark ? '#1f2937' : '#FFFFFF'),
      surfaceVariant: theme?.colors?.surfaceVariant || (isDark ? '#374151' : '#F9FAFB'),
      onSurface: theme?.colors?.onSurface || (isDark ? '#f9fafb' : '#111827'),
      onSurfaceVariant: theme?.colors?.onSurfaceVariant || (isDark ? '#d1d5db' : '#6b7280'),
      primary: theme?.colors?.primary || '#8b5cf6',
      onPrimary: theme?.colors?.onPrimary || '#FFFFFF',
      primaryContainer: theme?.colors?.primaryContainer || (isDark ? '#6d28d9' : '#EDE9FE'),
      onPrimaryContainer: theme?.colors?.onPrimaryContainer || (isDark ? '#e9d5ff' : '#000000'),
      error: theme?.colors?.error || '#EF4444',
      success: theme?.colors?.success || '#10b981',
      warning: theme?.colors?.warning || '#F59E0B',
      info: theme?.colors?.info || '#3B82F6',
      outline: theme?.colors?.outline || (isDark ? '#4b5563' : '#E5E7EB'),
      outlineVariant: theme?.colors?.outlineVariant || (isDark ? '#374151' : '#E5E7EB'),
    },
  };
  
  const { trips, expenses } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const periodDays = useMemo(
    () => ({
      "7d": 7,
      "30d": 30,
      "90d": 90,
      all: 365,
    }),
    [],
  );

  const filteredExpenses = useMemo(() => {
    if (selectedPeriod === "all") return expenses;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays[selectedPeriod]);
    return expenses.filter((expense) => new Date(expense.date) >= cutoffDate);
  }, [expenses, selectedPeriod, periodDays]);

  const filteredTrips = useMemo(() => {
    if (selectedPeriod === "all") return trips;
    const today = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays[selectedPeriod]);
    return trips.filter((trip) => {
      const tripStartDate = new Date(trip.startDate);
      const tripEndDate = new Date(trip.endDate);
      // Include trip if it overlaps with the selected period (trip ends after cutoff and starts before today)
      return tripEndDate >= cutoffDate && tripStartDate <= today;
    });
  }, [trips, selectedPeriod, periodDays]);

  // Previous period comparison
  const previousPeriodExpenses = useMemo(() => {
    if (selectedPeriod === "all") return [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays[selectedPeriod] * 2);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - periodDays[selectedPeriod]);
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= cutoffDate && expenseDate < endDate;
    });
  }, [expenses, selectedPeriod, periodDays]);

  const categoryBreakdown = useMemo(() => getCategoryBreakdown(filteredExpenses), [filteredExpenses]);
  const topExpenses = useMemo(() => getTopExpenses(filteredExpenses, 5), [filteredExpenses]);
  const tripComparison = useMemo(() => getTripComparison(filteredTrips, filteredExpenses), [filteredTrips, filteredExpenses]);
  const budgetUtilization = useMemo(() => getBudgetUtilization(filteredTrips, filteredExpenses), [filteredTrips, filteredExpenses]);
  const spendingInsights = useMemo(() => getSpendingInsights(filteredTrips, filteredExpenses), [filteredTrips, filteredExpenses]);

  const totalSpent = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const previousTotalSpent = previousPeriodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const periodComparison = previousTotalSpent > 0 ? formatPercentageChange(totalSpent, previousTotalSpent) : null;
  const isIncrease = previousTotalSpent > 0 && totalSpent > previousTotalSpent;

  const avgPerTrip = filteredTrips.length > 0 ? totalSpent / filteredTrips.length : 0;
  const avgPerExpense = filteredExpenses.length > 0 ? totalSpent / filteredExpenses.length : 0;
  const avgPerDay = filteredExpenses.length > 0 ? totalSpent / periodDays[selectedPeriod] : 0;
  const hasData = filteredExpenses.length > 0;

  // Biggest overspend category
  const biggestOverspend = useMemo(() => {
    const overBudgetTrips = budgetUtilization.filter(t => t.isOverBudget);
    if (overBudgetTrips.length === 0) return null;
    
    const tripExpenses = overBudgetTrips.flatMap(trip => 
      filteredExpenses.filter(e => e.tripId === trip.tripId)
    );
    const categoryBreakdown = getCategoryBreakdown(tripExpenses);
    return categoryBreakdown[0] || null;
  }, [budgetUtilization, filteredExpenses]);

  // Budget burn rate
  const budgetBurnRate = useMemo(() => {
    if (filteredTrips.length === 0) return null;
    const activeTrips = filteredTrips.filter(trip => {
      const today = new Date();
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);
      return today >= startDate && today <= endDate;
    });
    
    if (activeTrips.length === 0) return null;
    
    let totalBudget = 0;
    let totalSpent = 0;
    let totalDays = 0;
    let elapsedDays = 0;
    
    activeTrips.forEach(trip => {
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);
      const today = new Date();
      const tripDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const tripElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      totalBudget += trip.budget || 0;
      totalDays += tripDays;
      elapsedDays += tripElapsed;
      
      const tripExpenses = filteredExpenses.filter(e => e.tripId === trip.id);
      totalSpent += tripExpenses.reduce((sum, e) => sum + e.amount, 0);
    });
    
    const expectedSpent = totalBudget * (elapsedDays / totalDays);
    const burnRate = expectedSpent > 0 ? (totalSpent / expectedSpent) * 100 : 0;
    
    return {
      rate: burnRate,
      isOver: burnRate > 100,
      expected: expectedSpent,
      actual: totalSpent,
    };
  }, [filteredTrips, filteredExpenses]);

  const chartConfig = {
    backgroundColor: safeTheme.colors.surface,
    backgroundGradientFrom: safeTheme.colors.surface,
    backgroundGradientTo: safeTheme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => {
      const rgb = hexToRgb(safeTheme.colors.primary);
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    },
    labelColor: (opacity = 1) => {
      const rgb = hexToRgb(safeTheme.colors.onSurfaceVariant);
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    },
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: safeTheme.colors.primary },
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 139, g: 92, b: 246 };
  };

  const pieChartData = categoryBreakdown.slice(0, 6).map((category) => ({
    name: category.category,
    population: category.amount,
    color: category.color,
    legendFontColor: safeTheme.colors.onSurfaceVariant,
    legendFontSize: 11,
  }));

  if (!hasData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={["top"]}>
        <EmptyAnalyticsState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={["top"]}>
      {/* Sticky Period Selector */}
      <View style={[styles.stickyHeader, { backgroundColor: safeTheme.colors.surface, borderBottomColor: safeTheme.colors.outlineVariant }]}>
        <View style={[styles.periodContainer, { backgroundColor: safeTheme.colors.surfaceVariant }]}>
          {(["7d", "30d", "90d", "all"] as const).map((period) => (
            <TouchableOpacity
              key={period}
              onPress={() => {
                setSelectedPeriod(period);
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={[
                styles.periodButton,
                selectedPeriod === period && { backgroundColor: safeTheme.colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  { color: selectedPeriod === period ? safeTheme.colors.onPrimary : safeTheme.colors.onSurfaceVariant },
                ]}
              >
                {period === "all" ? "All" : period.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section - Total Spent */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <LinearGradient
            colors={[safeTheme.colors.primary, safeTheme.colors.primary + 'DD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>Total Spent</Text>
              <Text style={styles.heroAmount}>{formatCurrency(totalSpent, { compact: false })}</Text>
              {periodComparison && (
                <View style={styles.comparisonRow}>
                  <Ionicons 
                    name={isIncrease ? "trending-up" : "trending-down"} 
                    size={16} 
                    color={safeTheme.colors.onPrimary} 
                  />
                  <Text style={styles.comparisonText}>
                    {periodComparison} vs previous period
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Ionicons name="airplane-outline" size={20} color={safeTheme.colors.onPrimary} />
                <Text style={styles.heroStatValue}>{filteredTrips.length}</Text>
                <Text style={styles.heroStatLabel}>Trips</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Ionicons name="receipt-outline" size={20} color={safeTheme.colors.onPrimary} />
                <Text style={styles.heroStatValue}>{filteredExpenses.length}</Text>
                <Text style={styles.heroStatLabel}>Expenses</Text>
              </View>
            </View>
          </LinearGradient>
        </MotiView>

        {/* Quick Metrics Row */}
        <View style={styles.quickMetricsRow}>
          <Surface style={[styles.metricCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <Ionicons name="calculator-outline" size={24} color={safeTheme.colors.primary} />
            <Text style={[styles.metricValue, { color: safeTheme.colors.onSurface }]}>
              {formatCurrency(avgPerTrip, { compact: true })}
            </Text>
            <Text style={[styles.metricLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Avg per Trip</Text>
          </Surface>
          <Surface style={[styles.metricCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <Ionicons name="calendar-outline" size={24} color={safeTheme.colors.info} />
            <Text style={[styles.metricValue, { color: safeTheme.colors.onSurface }]}>
              {formatCurrency(avgPerDay, { compact: true })}
            </Text>
            <Text style={[styles.metricLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Avg per Day</Text>
          </Surface>
          <Surface style={[styles.metricCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <Ionicons name="cash-outline" size={24} color={safeTheme.colors.success} />
            <Text style={[styles.metricValue, { color: safeTheme.colors.onSurface }]}>
              {formatCurrency(avgPerExpense, { compact: true })}
            </Text>
            <Text style={[styles.metricLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Avg per Expense</Text>
          </Surface>
        </View>

        {/* Spending Insights Navigation Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Spending Insights</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.insightsCardsRow}
          >
            {/* Spending Trends Card */}
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('SpendingTrends');
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              activeOpacity={0.8}
            >
              <Surface style={[styles.insightNavCard, { backgroundColor: safeTheme.colors.surface }]} elevation={2}>
                <LinearGradient
                  colors={[safeTheme.colors.primary + '20', safeTheme.colors.primary + '10']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.insightNavCardGradient}
                >
                  <View style={[styles.insightNavIconContainer, { backgroundColor: safeTheme.colors.primaryContainer }]}>
                    <Ionicons name="trending-up" size={32} color={safeTheme.colors.primary} />
                  </View>
                  <Text style={[styles.insightNavTitle, { color: safeTheme.colors.onSurface }]}>Spending Trends</Text>
                  <Text style={[styles.insightNavSubtitle, { color: safeTheme.colors.onSurfaceVariant }]}>
                    View spending patterns over time
                  </Text>
                  <View style={styles.insightNavArrow}>
                    <Ionicons name="chevron-forward" size={20} color={safeTheme.colors.primary} />
                  </View>
                </LinearGradient>
              </Surface>
            </TouchableOpacity>

            {/* Spending Heatmap Card */}
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('SpendingHeatmap');
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              activeOpacity={0.8}
            >
              <Surface style={[styles.insightNavCard, { backgroundColor: safeTheme.colors.surface }]} elevation={2}>
                <LinearGradient
                  colors={[safeTheme.colors.info + '20', safeTheme.colors.info + '10']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.insightNavCardGradient}
                >
                  <View style={[styles.insightNavIconContainer, { backgroundColor: safeTheme.colors.info + '20' }]}>
                    <Ionicons name="calendar" size={32} color={safeTheme.colors.info} />
                  </View>
                  <Text style={[styles.insightNavTitle, { color: safeTheme.colors.onSurface }]}>Spending Heatmap</Text>
                  <Text style={[styles.insightNavSubtitle, { color: safeTheme.colors.onSurfaceVariant }]}>
                    See daily spending intensity
                  </Text>
                  <View style={styles.insightNavArrow}>
                    <Ionicons name="chevron-forward" size={20} color={safeTheme.colors.info} />
                  </View>
                </LinearGradient>
              </Surface>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Spending by Category</Text>
            <ErrorBoundary fallback={<View style={styles.chartError}><Text>Unable to load chart</Text></View>}>
              <Surface style={[styles.chartContainer, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
                {pieChartData.length > 0 ? (
                  <PieChart
                    data={pieChartData}
                    width={CHART_WIDTH}
                    height={220}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    center={[10, 0]}
                    absolute
                  />
                ) : (
                  <View style={styles.emptyChart}>
                    <Ionicons name="pie-chart-outline" size={48} color={safeTheme.colors.onSurfaceVariant} />
                    <Text style={[styles.emptyChartText, { color: safeTheme.colors.onSurfaceVariant }]}>No category data</Text>
                  </View>
                )}
              </Surface>
            </ErrorBoundary>
            
            {/* Category List */}
            <View style={styles.categoryList}>
              {categoryBreakdown.slice(0, 5).map((category) => {
                const percentage = totalSpent > 0 ? (category.amount / totalSpent) * 100 : 0;
                return (
                  <Surface key={category.category} style={[styles.categoryCard, { backgroundColor: safeTheme.colors.surface }]} elevation={0}>
                    <View style={styles.categoryContent}>
                      <View style={styles.categoryLeft}>
                        <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                        <View>
                          <Text style={[styles.categoryName, { color: safeTheme.colors.onSurface }]}>{category.category}</Text>
                          <Text style={[styles.categoryCount, { color: safeTheme.colors.onSurfaceVariant }]}>
                            {category.count} {category.count === 1 ? "expense" : "expenses"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.categoryRight}>
                        <Text style={[styles.categoryAmount, { color: safeTheme.colors.onSurface }]}>
                          {formatCurrency(category.amount)}
                        </Text>
                        <Text style={[styles.categoryPercentage, { color: safeTheme.colors.primary }]}>
                          {percentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.categoryProgressBar, { backgroundColor: safeTheme.colors.surfaceVariant }]}>
                      <View
                        style={[
                          styles.categoryProgressFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: category.color,
                          },
                        ]}
                      />
                    </View>
                  </Surface>
                );
              })}
            </View>
          </View>
        )}

        {/* Budget Burn Rate */}
        {budgetBurnRate && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Budget Burn Rate</Text>
            <Surface style={[styles.burnRateCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
              <View style={styles.burnRateHeader}>
                <Ionicons 
                  name={budgetBurnRate.isOver ? "warning" : "checkmark-circle"} 
                  size={24} 
                  color={budgetBurnRate.isOver ? safeTheme.colors.error : safeTheme.colors.success} 
                />
                <View style={styles.burnRateInfo}>
                  <Text style={[styles.burnRateValue, { color: safeTheme.colors.onSurface }]}>
                    {budgetBurnRate.rate.toFixed(0)}%
                  </Text>
                  <Text style={[styles.burnRateLabel, { color: safeTheme.colors.onSurfaceVariant }]}>
                    {budgetBurnRate.isOver ? "Over budget" : "On track"}
                  </Text>
                </View>
              </View>
              <View style={[styles.burnRateProgressBar, { backgroundColor: safeTheme.colors.surfaceVariant }]}>
                <View
                  style={[
                    styles.burnRateProgressFill,
                    {
                      width: `${Math.min(budgetBurnRate.rate, 100)}%`,
                      backgroundColor: budgetBurnRate.isOver ? safeTheme.colors.error : safeTheme.colors.success,
                    },
                  ]}
                />
              </View>
              <View style={styles.burnRateDetails}>
                <View>
                  <Text style={[styles.burnRateDetailLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Expected</Text>
                  <Text style={[styles.burnRateDetailValue, { color: safeTheme.colors.onSurface }]}>
                    {formatCurrency(budgetBurnRate.expected)}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.burnRateDetailLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Actual</Text>
                  <Text style={[styles.burnRateDetailValue, { color: safeTheme.colors.onSurface }]}>
                    {formatCurrency(budgetBurnRate.actual)}
                  </Text>
                </View>
              </View>
            </Surface>
          </View>
        )}

        {/* Biggest Overspend Category */}
        {biggestOverspend && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Overspend Alert</Text>
            <Surface style={[styles.overspendCard, { backgroundColor: safeTheme.colors.errorContainer || '#FFEBEE' }]} elevation={1}>
              <View style={styles.overspendHeader}>
                <Ionicons name="warning" size={24} color={safeTheme.colors.error} />
                <View style={styles.overspendInfo}>
                  <Text style={[styles.overspendTitle, { color: safeTheme.colors.onErrorContainer || safeTheme.colors.onSurface }]}>
                    {biggestOverspend.category}
                  </Text>
                  <Text style={[styles.overspendDescription, { color: safeTheme.colors.onSurfaceVariant }]}>
                    Highest spending category in over-budget trips
                  </Text>
                </View>
              </View>
              <Text style={[styles.overspendAmount, { color: safeTheme.colors.error }]}>
                {formatCurrency(biggestOverspend.amount)}
              </Text>
            </Surface>
          </View>
        )}

        {/* Smart Insights */}
        {spendingInsights.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Smart Insights</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.insightsScroll}>
              {spendingInsights.slice(0, 5).map((insight, index) => (
                <Surface key={index} style={[styles.insightCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
                  <View style={[styles.insightIconContainer, { backgroundColor: safeTheme.colors.surfaceVariant }]}>
                    <Ionicons
                      name={insight.icon as any}
                      size={24}
                      color={
                        insight.type === "warning"
                          ? safeTheme.colors.warning
                          : insight.type === "success"
                          ? safeTheme.colors.success
                          : safeTheme.colors.info
                      }
                    />
                  </View>
                  <Text style={[styles.insightTitle, { color: safeTheme.colors.onSurface }]} numberOfLines={2}>
                    {insight.title}
                  </Text>
                  <Text style={[styles.insightDescription, { color: safeTheme.colors.onSurfaceVariant }]} numberOfLines={3}>
                    {insight.description}
                  </Text>
                </Surface>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Trip Comparison */}
        {tripComparison.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Trip Comparison</Text>
              {tripComparison.length > 3 && (
                <TouchableOpacity onPress={() => navigation.navigate('AllTripsComparison', { trips: tripComparison })}>
                  <Text style={[styles.viewAllText, { color: safeTheme.colors.primary }]}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            {tripComparison.slice(0, 3).map((trip) => (
              <Surface key={trip.tripId} style={[styles.tripCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
                <View style={styles.tripCardHeader}>
                  <View style={styles.tripCardInfo}>
                    <Text style={[styles.tripName, { color: safeTheme.colors.onSurface }]} numberOfLines={1}>
                      {trip.tripName}
                    </Text>
                    <Text style={[styles.tripDestination, { color: safeTheme.colors.onSurfaceVariant }]}>
                      {trip.destination}
                    </Text>
                  </View>
                  <Text style={[styles.tripAmount, { color: safeTheme.colors.primary }]}>
                    {formatCurrency(trip.totalSpent)}
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: safeTheme.colors.surfaceVariant }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min((trip.totalSpent / (trip.budget || trip.totalSpent)) * 100, 100)}%`,
                        backgroundColor: trip.totalSpent > trip.budget ? safeTheme.colors.error : safeTheme.colors.primary,
                      },
                    ]}
                  />
                </View>
                <View style={styles.tripStats}>
                  <View style={styles.tripStatItem}>
                    <Text style={[styles.tripStatLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Budget</Text>
                    <Text style={[styles.tripStatValue, { color: safeTheme.colors.onSurface }]}>
                      {formatCurrency(trip.budget)}
                    </Text>
                  </View>
                  <View style={styles.tripStatItem}>
                    <Text style={[styles.tripStatLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Per Day</Text>
                    <Text style={[styles.tripStatValue, { color: safeTheme.colors.onSurface }]}>
                      {formatCurrency(trip.avgPerDay)}
                    </Text>
                  </View>
                  <View style={styles.tripStatItem}>
                    <Text style={[styles.tripStatLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Days</Text>
                    <Text style={[styles.tripStatValue, { color: safeTheme.colors.onSurface }]}>
                      {trip.duration}
                    </Text>
                  </View>
                </View>
              </Surface>
            ))}
          </View>
        )}


        {/* Top Expenses */}
        {topExpenses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Top Expenses</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AllExpenses', { tripId: null })}>
                <Text style={[styles.viewAllText, { color: safeTheme.colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>
            {topExpenses.map((expense, index) => {
              const trip = trips.find(t => t.id === expense.tripId);
              return (
                <Surface key={expense.id} style={[styles.expenseCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
                  <View style={styles.expenseRank}>
                    <Text style={[styles.expenseRankText, { color: safeTheme.colors.primary }]}>#{index + 1}</Text>
                  </View>
                  <View style={styles.expenseContent}>
                    <View style={styles.expenseInfo}>
                      <Text style={[styles.expenseDescription, { color: safeTheme.colors.onSurface }]} numberOfLines={1}>
                        {expense.description || 'No description'}
                      </Text>
                      <Text style={[styles.expenseCategory, { color: safeTheme.colors.onSurfaceVariant }]}>
                        {expense.category || 'Uncategorized'}
                      </Text>
                      {trip && (
                        <Text style={[styles.expenseTrip, { color: safeTheme.colors.primary }]}>{trip.name}</Text>
                      )}
                    </View>
                    <Text style={[styles.expenseAmount, { color: safeTheme.colors.onSurface }]}>
                      {formatCurrency(expense.amount)}
                    </Text>
                  </View>
                </Surface>
              );
            })}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyHeader: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  periodContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroCard: {
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  heroContent: {
    marginBottom: 20,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  comparisonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  heroStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  heroStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  quickMetricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 24,
    marginBottom: 32,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    marginTop: -8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartContainer: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  chart: {
    borderRadius: 12,
  },
  emptyChart: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    marginTop: 12,
  },
  chartError: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  insightsCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingRight: 24,
  },
  insightNavCard: {
    width: SCREEN_WIDTH - 48,
    borderRadius: 20,
    overflow: 'hidden',
  },
  insightNavCardGradient: {
    padding: 20,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  insightNavIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  insightNavTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  insightNavSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  insightNavArrow: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  categoryList: {
    marginTop: 16,
    gap: 12,
  },
  categoryCard: {
    padding: 16,
    borderRadius: 16,
  },
  categoryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 13,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  categoryPercentage: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  burnRateCard: {
    padding: 20,
    borderRadius: 16,
  },
  burnRateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  burnRateInfo: {
    flex: 1,
  },
  burnRateValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  burnRateLabel: {
    fontSize: 14,
  },
  burnRateProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  burnRateProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  burnRateDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  burnRateDetailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  burnRateDetailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  overspendCard: {
    padding: 20,
    borderRadius: 16,
  },
  overspendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  overspendInfo: {
    flex: 1,
  },
  overspendTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  overspendDescription: {
    fontSize: 14,
  },
  overspendAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  insightsScroll: {
    paddingRight: 24,
  },
  insightCard: {
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    width: 200,
    minHeight: 160,
  },
  insightIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  insightDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  tripCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  tripName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tripDestination: {
    fontSize: 14,
  },
  tripAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  tripStatItem: {
    alignItems: 'center',
  },
  tripStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  tripStatValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  expenseCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseRankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  expenseContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 13,
    marginBottom: 2,
  },
  expenseTrip: {
    fontSize: 12,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 32,
  },
});

