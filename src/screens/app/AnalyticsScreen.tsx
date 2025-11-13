import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Surface } from "react-native-paper";
import { TouchableNativeFeedback } from "react-native";
import { PieChart, LineChart } from "react-native-chart-kit";
import { useApp } from "@/contexts/AppContext";
import {
  getCategoryBreakdown,
  getSpendingTrend,
  getTopExpenses,
  getTripComparison,
  getBudgetUtilization,
  getSpendingInsights,
} from "@/utils/analyticsCalculations";
import { calculateSpendingForecast, generateHeatMapData } from "@/utils/forecastCalculations";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EmptyAnalyticsState } from "@/components/EmptyState";
import { formatCurrency } from "@/utils/currencyFormatter";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 48; // Account for padding

interface AnalyticsScreenProps {
  navigation: any;
}

export default function AnalyticsScreen({ navigation }: AnalyticsScreenProps) {
  const theme = useTheme();
  
  // Safe defaults for theme colors to prevent runtime errors
  const safeTheme = {
    colors: {
      background: theme?.colors?.background || '#FFFFFF',
      surface: theme?.colors?.surface || '#FFFFFF',
      surfaceVariant: theme?.colors?.surfaceVariant || '#F5F5F5',
      onSurface: theme?.colors?.onSurface || '#000000',
      onSurfaceVariant: theme?.colors?.onSurfaceVariant || '#666666',
      primary: theme?.colors?.primary || '#8b5cf6',
      onPrimary: theme?.colors?.onPrimary || '#FFFFFF',
      primaryContainer: theme?.colors?.primaryContainer || '#EDE9FE',
      onPrimaryContainer: theme?.colors?.onPrimaryContainer || '#000000',
      error: theme?.colors?.error || '#EF4444',
      info: theme?.colors?.info || '#3B82F6',
      outline: theme?.colors?.outline || '#E5E5E5',
      outlineVariant: theme?.colors?.outlineVariant || '#E5E5E5',
    },
  };
  
  const { trips, expenses } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<
    "7d" | "30d" | "90d" | "all"
  >("30d");
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "trends" | "categories" | "forecast"
  >("overview");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTripComparison, setSelectedTripComparison] = useState<string[]>([]);

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

  // Memoized calculations with loading simulation
  const categoryBreakdown = useMemo(
    () => getCategoryBreakdown(filteredExpenses),
    [filteredExpenses],
  );

  const spendingTrend = useMemo(
    () =>
      getSpendingTrend(filteredExpenses, "daily", periodDays[selectedPeriod]),
    [filteredExpenses, selectedPeriod, periodDays],
  );

  const topExpenses = useMemo(
    () => getTopExpenses(filteredExpenses, 5),
    [filteredExpenses],
  );

  const tripComparison = useMemo(
    () => getTripComparison(trips, filteredExpenses),
    [trips, filteredExpenses],
  );

  const budgetUtilization = useMemo(
    () => getBudgetUtilization(trips, filteredExpenses),
    [trips, filteredExpenses],
  );

  const spendingInsights = useMemo(
    () => getSpendingInsights(trips, filteredExpenses),
    [trips, filteredExpenses],
  );

  // Advanced visualizations
  const spendingForecast = useMemo(
    () => calculateSpendingForecast(filteredExpenses, 30),
    [filteredExpenses],
  );

  const heatMapData = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (selectedPeriod === "all" ? 90 : periodDays[selectedPeriod]));
    return generateHeatMapData(filteredExpenses, startDate, endDate);
  }, [filteredExpenses, selectedPeriod, periodDays]);

  const totalSpent = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const avgPerTrip = trips.length > 0 ? totalSpent / trips.length : 0;
  const avgPerExpense =
    filteredExpenses.length > 0 ? totalSpent / filteredExpenses.length : 0;

  const hasData = filteredExpenses.length > 0;

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
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: safeTheme.colors.primary,
    },
  };

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 139, g: 92, b: 246 };
  };

  const pieChartData = categoryBreakdown.slice(0, 6).map((category) => ({
    name: category.category,
    population: category.amount,
    color: category.color,
    legendFontColor: safeTheme.colors.onSurfaceVariant,
    legendFontSize: 11,
  }));

  const lineChartData = {
    labels: spendingTrend.slice(-7).map((day) => day.dayOfWeek.substring(0, 3)),
    datasets: [
      {
        data:
          spendingTrend.slice(-7).length > 0
            ? spendingTrend.slice(-7).map((day) => day.amount || 0)
            : [0],
        strokeWidth: 2,
      },
    ],
  };

  // Native button component
  const NativeButton = ({ onPress, children, style, variant = "primary" }: any) => {
    const buttonContent = (
      <View style={[styles.nativeButton, styles[`nativeButton_${variant}`], style]}>
        {children}
      </View>
    );

    if (Platform.OS === "android") {
      return (
        <TouchableNativeFeedback
          onPress={onPress}
          background={TouchableNativeFeedback.Ripple("#00000020", false)}
        >
          {buttonContent}
        </TouchableNativeFeedback>
      );
    }

    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {buttonContent}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
      <Surface style={[styles.header, { backgroundColor: safeTheme.colors.surface, borderBottomColor: safeTheme.colors.outlineVariant }]} elevation={1}>
      <Text style={[styles.headerTitle, { color: safeTheme.colors.onSurface }]}>Analytics</Text>
    </Surface>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(["7d", "30d", "90d", "all"] as const).map((period) => (
        <NativeButton
          key={period}
          onPress={() => setSelectedPeriod(period)}
          variant={selectedPeriod === period ? "primary" : "secondary"}
          style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive,
            ]}
          >
            {period === "all" ? "All" : period.toUpperCase()}
          </Text>
        </NativeButton>
      ))}
    </View>
  );

  const renderTabSelector = () => (
    <View style={styles.segmentedControl}>
      {[
        { key: "overview", label: "Overview", icon: "analytics-outline" },
        { key: "trends", label: "Trends", icon: "trending-up-outline" },
        { key: "categories", label: "Categories", icon: "pie-chart-outline" },
        { key: "forecast", label: "Forecast", icon: "calendar-outline" },
      ].map((tab) => {
        const isActive = selectedTab === tab.key;
        return (
          <NativeButton
            key={tab.key}
            onPress={() => setSelectedTab(tab.key as any)}
            variant={isActive ? "primary" : "secondary"}
            style={[styles.segmentedButton, isActive && styles.segmentedButtonActive]}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={isActive ? safeTheme.colors.onPrimary : safeTheme.colors.primary}
              style={styles.segmentedIcon}
            />
            <Text style={[styles.segmentedText, isActive && styles.segmentedTextActive]}>
              {tab.label}
            </Text>
          </NativeButton>
        );
      })}
    </View>
  );

  const renderSummaryCards = () => (
    <View style={styles.summaryCards}>
      <Surface style={[styles.summaryCard, styles.summaryCardPrimary, { backgroundColor: safeTheme.colors.primaryContainer }]} elevation={2}>
        <Ionicons name="wallet-outline" size={28} color={safeTheme.colors.primary} />
        <Text style={[styles.summaryValue, { color: safeTheme.colors.onPrimaryContainer }]}>
          {formatCurrency(totalSpent, { compact: true })}
        </Text>
        <Text style={[styles.summaryLabel, { color: safeTheme.colors.onPrimaryContainer }]}>Total Spent</Text>
      </Surface>

      <Surface style={[styles.summaryCard, { backgroundColor: safeTheme.colors.surface }]} elevation={2}>
        <Ionicons name="airplane-outline" size={24} color={safeTheme.colors.info} />
        <Text style={[styles.summaryValue, { color: safeTheme.colors.onSurface }]}>{trips.length}</Text>
        <Text style={[styles.summaryLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Trips</Text>
      </Surface>

      <Surface style={[styles.summaryCard, { backgroundColor: safeTheme.colors.surface }]} elevation={2}>
        <Ionicons name="receipt-outline" size={24} color={safeTheme.colors.success || '#10b981'} />
        <Text style={[styles.summaryValue, { color: safeTheme.colors.onSurface }]}>{filteredExpenses.length}</Text>
        <Text style={[styles.summaryLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Expenses</Text>
      </Surface>
    </View>
  );

  const renderInsights = () => {
    if (spendingInsights.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Insights</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.insightsScroll}
        >
          {spendingInsights.slice(0, 5).map((insight) => (
            <Surface key={insight.title} style={[styles.insightCard, { backgroundColor: safeTheme.colors.surface }]} elevation={2}>
              <View style={[styles.insightHeader, { backgroundColor: safeTheme.colors.surfaceVariant }]}>
                <Ionicons
                  name={insight.icon as any}
                  size={20}
                  color={
                    insight.type === "warning"
                      ? safeTheme.colors.warning || '#F59E0B'
                      : insight.type === "success"
                        ? safeTheme.colors.success || '#10b981'
                        : insight.type === "info"
                          ? safeTheme.colors.info
                          : safeTheme.colors.error
                  }
                />
              </View>
              <Text style={[styles.insightTitle, { color: safeTheme.colors.onSurface }]}>{insight.title}</Text>
              <Text style={[styles.insightDescription, { color: safeTheme.colors.onSurfaceVariant }]} numberOfLines={2}>
                {insight.description}
              </Text>
              {insight.value !== undefined && (
                <Text style={[styles.insightValue, { color: safeTheme.colors.primary }]}>
                  {formatCurrency(insight.value)}
                </Text>
              )}
            </Surface>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderOverviewTab = () => (
    <>
      {renderSummaryCards()}
      {renderInsights()}

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>📊 Quick Stats</Text>
        <View style={styles.statsGrid}>
          <Surface style={[styles.statItem, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <Text style={[styles.statLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Avg per Trip</Text>
            <Text style={[styles.statValue, { color: safeTheme.colors.onSurface }]}>{formatCurrency(avgPerTrip)}</Text>
          </Surface>
          <Surface style={[styles.statItem, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <Text style={[styles.statLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Avg per Expense</Text>
            <Text style={[styles.statValue, { color: safeTheme.colors.onSurface }]}>
              {formatCurrency(avgPerExpense)}
            </Text>
          </Surface>
          {categoryBreakdown.length > 0 && (
            <Surface style={[styles.statItem, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
              <Text style={[styles.statLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Top Category</Text>
              <Text style={[styles.statValue, { color: safeTheme.colors.onSurface }]} numberOfLines={1}>
                {categoryBreakdown[0].category}
              </Text>
            </Surface>
          )}
        </View>
      </View>

      {/* Top Expenses */}
      {topExpenses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>🔝 Top Expenses</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AllExpenses', { tripId: null })}
              style={styles.showAllButton}
            >
              <Text style={styles.showAllButtonText}>Show All</Text>
            </TouchableOpacity>
          </View>
          {topExpenses.map((expense) => {
            const trip = trips.find(t => t.id === expense.tripId);
            return (
              <TouchableOpacity
                key={expense.id}
                style={styles.expenseItem}
                onPress={() => navigation.navigate('ExpenseDetail', {
                  expenseId: expense.id,
                  tripId: expense.tripId,
                })}
              >
                <View style={styles.expenseLeft}>
                  <Text style={styles.expenseDescription} numberOfLines={1}>
                    {expense.description || 'No description'}
                  </Text>
                  <Text style={styles.expenseCategory}>{expense.category || 'Uncategorized'}</Text>
                  {trip ? (
                    <Text style={styles.expenseTrip}>{trip.name || ''}</Text>
                  ) : null}
                </View>
                <View style={styles.expenseAmountContainer}>
                  <Text style={styles.expenseAmount}>
                    {formatCurrency(expense.amount, { currency: expense.currency })}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={safeTheme.colors.onSurfaceVariant} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </>
  );

  const renderTrendsTab = () => (
    <>
      {/* Spending Trend Chart */}
      {spendingTrend.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Spending Trend</Text>
          <ErrorBoundary
            fallback={
              <View style={styles.chartError}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color="#ef4444"
                />
                <Text style={styles.chartErrorText}>Unable to load chart</Text>
              </View>
            }
          >
            <View style={styles.chartContainer}>
              {lineChartData.datasets[0].data.length > 0 ? (
                <LineChart
                  data={lineChartData}
                  width={CHART_WIDTH}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  withOuterLines={true}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  fromZero
                />
              ) : (
                <View style={styles.emptyChart}>
                  <Ionicons
                    name="trending-up-outline"
                    size={48}
                    color="#d1d5db"
                  />
                  <Text style={styles.emptyChartText}>
                    No trend data available
                  </Text>
                </View>
              )}
            </View>
          </ErrorBoundary>
        </View>
      )}

      {/* Trip Comparison */}
      {tripComparison.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏝️ Trip Comparison</Text>
          {tripComparison.map((trip) => (
            <View key={trip.tripId} style={styles.tripComparisonItem}>
              <View style={styles.tripComparisonHeader}>
                <Text style={styles.tripComparisonName} numberOfLines={1}>
                  {trip.tripName}
                </Text>
                <Text style={styles.tripComparisonAmount}>
                  {formatCurrency(trip.totalSpent)}
                </Text>
              </View>
              <View style={styles.tripComparisonBar}>
                <View
                  style={[
                    styles.tripComparisonProgress,
                    {
                      width: `${Math.min((trip.totalSpent / (trip.budget || trip.totalSpent)) * 100, 100)}%`,
                      backgroundColor:
                        trip.totalSpent > trip.budget ? "#ef4444" : "#8b5cf6",
                    },
                  ]}
                />
              </View>
              <Text style={styles.tripComparisonBudget}>
                Budget: {formatCurrency(trip.budget)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Budget Utilization */}
      {budgetUtilization.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Budget Utilization</Text>
          {budgetUtilization.map((budget) => (
            <View key={budget.tripId} style={styles.budgetItem}>
              <View style={styles.budgetHeader}>
                <Text style={styles.budgetTripName} numberOfLines={1}>
                  {budget.tripName}
                </Text>
                <Text
                  style={[
                    styles.budgetPercentage,
                    budget.isOverBudget && styles.budgetOverBudget,
                  ]}
                >
                  {budget.percentage.toFixed(0)}%
                </Text>
              </View>
              <View style={styles.budgetBar}>
                <View
                  style={[
                    styles.budgetProgress,
                    {
                      width: `${Math.min(budget.percentage, 100)}%`,
                      backgroundColor: budget.isOverBudget
                        ? "#ef4444"
                        : "#10b981",
                    },
                  ]}
                />
              </View>
              <Text style={styles.budgetText}>
                {formatCurrency(budget.used)} of{" "}
                {formatCurrency(budget.used + budget.remaining)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </>
  );

  const renderCategoriesTab = () => (
    <>
      {/* Category Pie Chart */}
      {categoryBreakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Spending by Category</Text>
          <ErrorBoundary
            fallback={
              <View style={styles.chartError}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color="#ef4444"
                />
                <Text style={styles.chartErrorText}>Unable to load chart</Text>
              </View>
            }
          >
            <View style={styles.chartContainer}>
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
                  <Ionicons
                    name="pie-chart-outline"
                    size={48}
                    color="#d1d5db"
                  />
                  <Text style={styles.emptyChartText}>
                    No category data available
                  </Text>
                </View>
              )}
            </View>
          </ErrorBoundary>
        </View>
      )}

      {/* Category Breakdown List */}
      {categoryBreakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Detailed Breakdown</Text>
          {categoryBreakdown.map((category, index) => {
            const percentage =
              totalSpent > 0 ? (category.amount / totalSpent) * 100 : 0;
            return (
              <View key={category.category} style={styles.categoryItem}>
                <View style={styles.categoryLeft}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: category.color },
                    ]}
                  />
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.category}</Text>
                    <Text style={styles.categoryCount}>
                      {category.count}{" "}
                      {category.count === 1 ? "expense" : "expenses"}
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={styles.categoryAmount}>
                    {formatCurrency(category.amount)}
                  </Text>
                  <Text style={styles.categoryPercentage}>
                    {percentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </>
  );

  const renderForecastTab = () => (
    <>
      {/* Spending Forecast */}
      {spendingForecast.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔮 Spending Forecast</Text>
          <Text style={styles.sectionSubtitle}>
            Predicted spending for the next 30 days based on your trends
          </Text>
          {spendingForecast.map((forecast, index) => (
            <View key={index} style={styles.forecastItem}>
              <View style={styles.forecastHeader}>
                <Text style={styles.forecastPeriod}>
                  {new Date(forecast.period).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                </Text>
                <View style={styles.forecastTrend}>
                  <Ionicons
                    name={
                      forecast.trend === 'increasing'
                        ? 'trending-up'
                        : forecast.trend === 'decreasing'
                        ? 'trending-down'
                        : 'remove'
                    }
                    size={16}
                    color={
                      forecast.trend === 'increasing'
                        ? '#ef4444'
                        : forecast.trend === 'decreasing'
                        ? '#10b981'
                        : '#6b7280'
                    }
                  />
                  <Text style={styles.forecastConfidence}>
                    {(forecast.confidence * 100).toFixed(0)}% confidence
                  </Text>
                </View>
              </View>
              <Text style={styles.forecastAmount}>
                {formatCurrency(forecast.predictedAmount)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Heat Map */}
      {heatMapData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 Spending Heat Map</Text>
          <Text style={styles.sectionSubtitle}>
            Daily spending intensity over the selected period
          </Text>
          <View style={styles.heatMapContainer}>
            <View style={styles.heatMapGrid}>
              {heatMapData.slice(-30).map((data, index) => {
                const intensity = Math.min(data.intensity, 1);
                const opacity = 0.3 + (intensity * 0.7);
                const backgroundColor = `rgba(139, 92, 246, ${opacity})`;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.heatMapCell, { backgroundColor }]}
                    onPress={() => {
                      // Could show details for that day
                    }}
                  >
                    <Text style={styles.heatMapCellText}>
                      {new Date(data.date).getDate()}
                    </Text>
                    {data.amount > 0 && (
                      <Text style={styles.heatMapCellAmount}>
                        {formatCurrency(data.amount, { compact: true })}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.heatMapLegend}>
              <Text style={styles.heatMapLegendText}>Less</Text>
              <View style={styles.heatMapLegendGradient}>
                <View style={[styles.heatMapLegendDot, { backgroundColor: 'rgba(139, 92, 246, 0.3)' }]} />
                <View style={[styles.heatMapLegendDot, { backgroundColor: 'rgba(139, 92, 246, 0.5)' }]} />
                <View style={[styles.heatMapLegendDot, { backgroundColor: 'rgba(139, 92, 246, 0.7)' }]} />
                <View style={[styles.heatMapLegendDot, { backgroundColor: 'rgba(139, 92, 246, 1)' }]} />
              </View>
              <Text style={styles.heatMapLegendText}>More</Text>
            </View>
          </View>
        </View>
      )}

      {/* Enhanced Trip Comparison */}
      {tripComparison.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏝️ Trip Comparison</Text>
          <Text style={styles.sectionSubtitle}>
            Compare spending across your trips
          </Text>
          {tripComparison.map((trip) => (
            <TouchableOpacity
              key={trip.tripId}
              style={styles.enhancedTripComparisonItem}
              onPress={() => {
                const isSelected = selectedTripComparison.includes(trip.tripId);
                if (isSelected) {
                  setSelectedTripComparison(prev => prev.filter(id => id !== trip.tripId));
                } else {
                  setSelectedTripComparison(prev => [...prev, trip.tripId]);
                }
              }}
            >
              <View style={styles.enhancedTripHeader}>
                <View style={styles.enhancedTripInfo}>
                  <Text style={styles.enhancedTripName} numberOfLines={1}>
                    {trip.tripName}
                  </Text>
                  <Text style={styles.enhancedTripDestination}>
                    {trip.destination}
                  </Text>
                </View>
                <View style={styles.enhancedTripAmounts}>
                  <Text style={styles.enhancedTripTotal}>
                    {formatCurrency(trip.totalSpent)}
                  </Text>
                  <Text style={styles.enhancedTripAvg}>
                    {formatCurrency(trip.avgPerDay)}/day
                  </Text>
                </View>
                <Ionicons
                  name={selectedTripComparison.includes(trip.tripId) ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={24}
                  color={selectedTripComparison.includes(trip.tripId) ? safeTheme.colors.primary : safeTheme.colors.onSurfaceVariant}
                />
              </View>
              <View style={styles.enhancedTripBar}>
                <View
                  style={[
                    styles.enhancedTripProgress,
                    {
                      width: `${Math.min((trip.totalSpent / (trip.budget || trip.totalSpent)) * 100, 100)}%`,
                      backgroundColor:
                        trip.totalSpent > trip.budget ? "#ef4444" : "#8b5cf6",
                    },
                  ]}
                />
              </View>
              <View style={styles.enhancedTripFooter}>
                <Text style={styles.enhancedTripBudget}>
                  Budget: {formatCurrency(trip.budget)} • {trip.duration} days
                </Text>
                {trip.totalSpent > trip.budget && (
                  <Text style={styles.enhancedTripOverBudget}>
                    Over by {formatCurrency(trip.totalSpent - trip.budget)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );

  if (!hasData) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {renderHeader()}
        <EmptyAnalyticsState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={["top"]}>
      {renderHeader()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderPeriodSelector()}
        {renderTabSelector()}

        <View style={styles.contentSection}>
          {selectedTab === "overview" && renderOverviewTab()}
          {selectedTab === "trends" && renderTrendsTab()}
          {selectedTab === "categories" && renderCategoriesTab()}
          {selectedTab === "forecast" && renderForecastTab()}
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  contentSection: {
    paddingHorizontal: 20,
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: "#8b5cf6",
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  periodButtonTextActive: {
    color: "#FFFFFF",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  segmentedButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  segmentedButtonActive: {
    backgroundColor: "#8b5cf6",
  },
  segmentedIcon: {
    marginRight: 6,
  },
  segmentedText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  segmentedTextActive: {
    color: "#FFFFFF",
  },
  // Native Button Styles
  nativeButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  nativeButton_primary: {
    backgroundColor: "#8b5cf6",
  },
  nativeButton_secondary: {
    backgroundColor: "#EDE9FE",
  },
  nativeButton_ghost: {
    backgroundColor: "transparent",
  },
  summaryCards: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryCardPrimary: {
    backgroundColor: "#EDE9FE",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 8,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  insightsScroll: {
    paddingRight: 16,
  },
  insightCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 180,
    minHeight: 140,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  insightHeader: {
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  insightDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
    marginBottom: 8,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#8b5cf6",
    marginTop: "auto",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  chartContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  chart: {
    borderRadius: 12,
  },
  emptyChart: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChartText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 12,
  },
  chartError: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
  },
  chartErrorText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 12,
  },
  expenseItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  expenseLeft: {
    flex: 1,
    marginRight: 12,
  },
  expenseDescription: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 13,
    color: "#6b7280",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  showAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
  },
  showAllButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  expenseAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expenseTrip: {
    fontSize: 12,
    color: "#8b5cf6",
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  tripComparisonItem: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  tripComparisonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tripComparisonName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginRight: 12,
  },
  tripComparisonAmount: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  tripComparisonBar: {
    height: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 3,
    marginBottom: 6,
    overflow: "hidden",
  },
  tripComparisonProgress: {
    height: "100%",
    borderRadius: 3,
  },
  tripComparisonBudget: {
    fontSize: 12,
    color: "#6b7280",
  },
  budgetItem: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  budgetTripName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginRight: 12,
  },
  budgetPercentage: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#10b981",
  },
  budgetOverBudget: {
    color: "#ef4444",
  },
  budgetBar: {
    height: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  budgetProgress: {
    height: "100%",
    borderRadius: 4,
  },
  budgetText: {
    fontSize: 13,
    color: "#6b7280",
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: "#6b7280",
  },
  categoryRight: {
    alignItems: "flex-end",
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 2,
  },
  categoryPercentage: {
    fontSize: 12,
    color: "#8b5cf6",
    fontWeight: "600",
  },
  bottomPadding: {
    height: 32,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
    marginTop: -4,
  },
  forecastItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forecastPeriod: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  forecastTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  forecastConfidence: {
    fontSize: 12,
    color: '#6b7280',
  },
  forecastAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  heatMapContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  heatMapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },
  heatMapCell: {
    width: (SCREEN_WIDTH - 80) / 7,
    aspectRatio: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  heatMapCellText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
  heatMapCellAmount: {
    fontSize: 8,
    color: '#333',
    marginTop: 2,
  },
  heatMapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heatMapLegendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  heatMapLegendGradient: {
    flexDirection: 'row',
    gap: 4,
  },
  heatMapLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  enhancedTripComparisonItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  enhancedTripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  enhancedTripInfo: {
    flex: 1,
    marginRight: 12,
  },
  enhancedTripName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  enhancedTripDestination: {
    fontSize: 13,
    color: '#6b7280',
  },
  enhancedTripAmounts: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  enhancedTripTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  enhancedTripAvg: {
    fontSize: 12,
    color: '#6b7280',
  },
  enhancedTripBar: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  enhancedTripProgress: {
    height: '100%',
    borderRadius: 4,
  },
  enhancedTripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enhancedTripBudget: {
    fontSize: 12,
    color: '#6b7280',
  },
  enhancedTripOverBudget: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
});

