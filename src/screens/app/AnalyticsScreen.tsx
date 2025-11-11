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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EmptyAnalyticsState } from "@/components/EmptyState";
import { formatCurrency } from "@/utils/currencyFormatter";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 48; // Account for padding

export default function AnalyticsScreen({ navigation }: any) {
  const { trips, expenses } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<
    "7d" | "30d" | "90d" | "all"
  >("30d");
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "trends" | "categories"
  >("overview");

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

  const totalSpent = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const avgPerTrip = trips.length > 0 ? totalSpent / trips.length : 0;
  const avgPerExpense =
    filteredExpenses.length > 0 ? totalSpent / filteredExpenses.length : 0;

  const hasData = filteredExpenses.length > 0;

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#8b5cf6",
    },
  };

  const pieChartData = categoryBreakdown.slice(0, 6).map((category) => ({
    name: category.category,
    population: category.amount,
    color: category.color,
    legendFontColor: "#6b7280",
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

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Track your spending patterns</Text>
      </View>
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(["7d", "30d", "90d", "all"] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.selectedPeriodButton,
          ]}
          onPress={() => setSelectedPeriod(period)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.selectedPeriodButtonText,
            ]}
          >
            {period === "all" ? "All" : period.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabSelector = () => (
    <View style={styles.tabSelector}>
      {[
        { key: "overview", label: "Overview", icon: "analytics-outline" },
        { key: "trends", label: "Trends", icon: "trending-up-outline" },
        { key: "categories", label: "Categories", icon: "pie-chart-outline" },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabButton,
            selectedTab === tab.key && styles.selectedTabButton,
          ]}
          onPress={() => setSelectedTab(tab.key as any)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={tab.icon as any}
            size={20}
            color={selectedTab === tab.key ? "#8b5cf6" : "#9ca3af"}
          />
          <Text
            style={[
              styles.tabButtonText,
              selectedTab === tab.key && styles.selectedTabButtonText,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSummaryCards = () => (
    <View style={styles.summaryCards}>
      <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
        <Ionicons name="wallet-outline" size={28} color="#8b5cf6" />
        <Text style={styles.summaryValue}>
          {formatCurrency(totalSpent, { compact: true })}
        </Text>
        <Text style={styles.summaryLabel}>Total Spent</Text>
      </View>

      <View style={styles.summaryCard}>
        <Ionicons name="airplane-outline" size={24} color="#3b82f6" />
        <Text style={styles.summaryValue}>{trips.length}</Text>
        <Text style={styles.summaryLabel}>Trips</Text>
      </View>

      <View style={styles.summaryCard}>
        <Ionicons name="receipt-outline" size={24} color="#10b981" />
        <Text style={styles.summaryValue}>{filteredExpenses.length}</Text>
        <Text style={styles.summaryLabel}>Expenses</Text>
      </View>
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
            <View key={insight.title} style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Ionicons
                  name={insight.icon as any}
                  size={20}
                  color={
                    insight.type === "warning"
                      ? "#f59e0b"
                      : insight.type === "success"
                        ? "#10b981"
                        : insight.type === "info"
                          ? "#3b82f6"
                          : "#ef4444"
                  }
                />
              </View>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightDescription} numberOfLines={2}>
                {insight.description}
              </Text>
              {insight.value !== undefined && (
                <Text style={styles.insightValue}>
                  {formatCurrency(insight.value)}
                </Text>
              )}
            </View>
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
        <Text style={styles.sectionTitle}>📊 Quick Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg per Trip</Text>
            <Text style={styles.statValue}>{formatCurrency(avgPerTrip)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg per Expense</Text>
            <Text style={styles.statValue}>
              {formatCurrency(avgPerExpense)}
            </Text>
          </View>
          {categoryBreakdown.length > 0 && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Top Category</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {categoryBreakdown[0].category}
              </Text>
            </View>
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
                  <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
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

  if (!hasData) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {renderHeader()}
        <EmptyAnalyticsState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderPeriodSelector()}
        {renderTabSelector()}

        {selectedTab === "overview" && renderOverviewTab()}
        {selectedTab === "trends" && renderTrendsTab()}
        {selectedTab === "categories" && renderCategoriesTab()}

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  selectedPeriodButton: {
    backgroundColor: "#ffffff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  selectedPeriodButtonText: {
    color: "#8b5cf6",
  },
  tabSelector: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
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
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  selectedTabButton: {
    backgroundColor: "#f3f4f6",
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9ca3af",
  },
  selectedTabButtonText: {
    color: "#8b5cf6",
  },
  summaryCards: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
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
  summaryCardPrimary: {
    backgroundColor: "#f5f3ff",
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
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
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
});
