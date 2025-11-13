import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/contexts/AppContext";
import { LineChart, BarChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

interface InsightsScreenProps {
  navigation: any;
}

interface Insight {
  id: string;
  type: "success" | "warning" | "info" | "danger";
  icon: string;
  title: string;
  description: string;
  value?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface SpendingPattern {
  category: string;
  trend: "up" | "down" | "stable";
  changePercent: number;
  recommendation: string;
}

export default function InsightsScreen({ navigation }: InsightsScreenProps) {
  const { trips, expenses } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<
    "week" | "month" | "trip"
  >("month");

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    switch (selectedPeriod) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "trip":
        // Get date of oldest trip
        if (trips.length > 0) {
          const oldestTrip = trips.reduce((oldest, trip) =>
            new Date(trip.startDate) < new Date(oldest.startDate)
              ? trip
              : oldest,
          );
          startDate = new Date(oldestTrip.startDate);
        }
        break;
    }

    return { start: startDate, end: now };
  }, [selectedPeriod, trips]);

  // Filter expenses by date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= dateRange.start && expenseDate <= dateRange.end;
    });
  }, [expenses, dateRange]);

  // Calculate total spending
  const totalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  // Calculate average daily spend
  const avgDailySpend = useMemo(() => {
    const days =
      Math.ceil(
        (dateRange.end.getTime() - dateRange.start.getTime()) /
          (1000 * 60 * 60 * 24),
      ) || 1;
    return totalSpent / days;
  }, [totalSpent, dateRange]);

  // Get spending by day of week
  const spendingByDayOfWeek = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const spending = new Array(7).fill(0);
    const counts = new Array(7).fill(0);

    filteredExpenses.forEach((expense) => {
      const day = new Date(expense.date).getDay();
      spending[day] += expense.amount;
      counts[day]++;
    });

    return days.map((day, idx) => ({
      day,
      amount: counts[idx] > 0 ? spending[idx] / counts[idx] : 0,
      totalAmount: spending[idx],
      count: counts[idx],
    }));
  }, [filteredExpenses]);

  // Calculate spending by category
  const categorySpending = useMemo(() => {
    const categoryMap: Record<string, number> = {};

    filteredExpenses.forEach((expense) => {
      categoryMap[expense.category] =
        (categoryMap[expense.category] || 0) + expense.amount;
    });

    return Object.entries(categoryMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  // Detect spending patterns
  const spendingPatterns = useMemo((): SpendingPattern[] => {
    // Compare current period with previous period
    const patterns: SpendingPattern[] = [];

    categorySpending.forEach((current) => {
      // This is simplified - in real app, compare with previous period
      const trend: "up" | "down" | "stable" =
        current.amount > avgDailySpend * 3
          ? "up"
          : current.amount < avgDailySpend
            ? "down"
            : "stable";

      let recommendation = "";
      if (trend === "up") {
        recommendation = `Your ${current.category} spending is high. Consider setting a limit.`;
      } else if (trend === "down") {
        recommendation = `Great job managing ${current.category} expenses!`;
      } else {
        recommendation = `${current.category} spending is consistent.`;
      }

      patterns.push({
        category: current.category,
        trend,
        changePercent: 0, // Would calculate actual change in real implementation
        recommendation,
      });
    });

    return patterns;
  }, [categorySpending, avgDailySpend]);

  // Generate AI insights
  const insights = useMemo((): Insight[] => {
    const insights: Insight[] = [];

    // Budget insights
    const activeTrips = trips.filter((trip) => {
      const now = new Date();
      return new Date(trip.endDate) >= now && new Date(trip.startDate) <= now;
    });

    activeTrips.forEach((trip) => {
      const tripExpenses = expenses.filter((e) => e.tripId === trip.id);
      const tripSpent = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
      const budgetUsed = (tripSpent / trip.budget) * 100;

      if (budgetUsed > 90) {
        insights.push({
          id: `budget-warning-${trip.id}`,
          type: "danger",
          icon: "warning",
          title: "Budget Alert",
          description: `You've used ${budgetUsed.toFixed(0)}% of budget for ${trip.name}`,
          value: tripSpent,
          action: {
            label: "View Trip",
            onPress: () =>
              navigation.navigate("TripDetail", { tripId: trip.id }),
          },
        });
      } else if (budgetUsed > 70) {
        insights.push({
          id: `budget-caution-${trip.id}`,
          type: "warning",
          icon: "alert-circle",
          title: "Budget Watch",
          description: `${budgetUsed.toFixed(0)}% of budget used for ${trip.name}`,
          value: trip.budget - tripSpent,
        });
      }
    });

    // High spending day
    const maxSpendingDay = spendingByDayOfWeek.reduce((max, day) =>
      day.totalAmount > max.totalAmount ? day : max,
    );

    if (maxSpendingDay.totalAmount > 0) {
      insights.push({
        id: "high-spending-day",
        type: "info",
        icon: "calendar",
        title: "Peak Spending Day",
        description: `You spend most on ${maxSpendingDay.day}s`,
        value: maxSpendingDay.totalAmount,
      });
    }

    // Top category
    if (categorySpending.length > 0) {
      const topCategory = categorySpending[0];
      const percentage = (topCategory.amount / totalSpent) * 100;

      insights.push({
        id: "top-category",
        type: "info",
        icon: "pie-chart",
        title: "Top Spending Category",
        description: `${topCategory.category} accounts for ${percentage.toFixed(0)}% of spending`,
        value: topCategory.amount,
      });
    }

    // Unusual expense detection
    if (filteredExpenses.length > 0) {
      const amounts = filteredExpenses.map((e) => e.amount);
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const unusual = filteredExpenses.filter((e) => e.amount > avg * 3);

      if (unusual.length > 0) {
        insights.push({
          id: "unusual-expenses",
          type: "warning",
          icon: "eye",
          title: "Unusual Expenses Detected",
          description: `${unusual.length} expense${unusual.length > 1 ? "s" : ""} significantly higher than average`,
          action: {
            label: "Review",
            onPress: () => navigation.navigate("AllExpenses"),
          },
        });
      }
    }

    // Savings opportunity
    if (avgDailySpend > 50) {
      const potentialSavings = avgDailySpend * 0.2; // 20% savings goal
      insights.push({
        id: "savings-opportunity",
        type: "success",
        icon: "cash",
        title: "Savings Opportunity",
        description: `Save $${potentialSavings.toFixed(2)}/day by reducing spending 20%`,
        value: potentialSavings * 30,
      });
    }

    // Positive feedback
    if (filteredExpenses.length > 10 && insights.length === 0) {
      insights.push({
        id: "good-job",
        type: "success",
        icon: "checkmark-circle",
        title: "Great Job!",
        description: "Your spending is well-balanced and within budget",
      });
    }

    return insights;
  }, [
    trips,
    expenses,
    filteredExpenses,
    categorySpending,
    spendingByDayOfWeek,
    totalSpent,
    avgDailySpend,
    navigation,
  ]);

  // Predict future spending
  const prediction = useMemo(() => {
    if (filteredExpenses.length < 3) return null;

    const daysRemaining = 30 - new Date().getDate();
    const predictedTotal = avgDailySpend * daysRemaining + totalSpent;

    return {
      estimated: predictedTotal,
      confidence: filteredExpenses.length > 20 ? "high" : "medium",
      daysRemaining,
    };
  }, [filteredExpenses, avgDailySpend, totalSpent]);

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#8b5cf6",
    },
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "success":
        return "#22c55e";
      case "warning":
        return "#f59e0b";
      case "danger":
        return "#ef4444";
      default:
        return "#8b5cf6";
    }
  };

  const renderInsightCard = (insight: Insight) => (
    <View
      key={insight.id}
      style={[
        styles.insightCard,
        { borderLeftColor: getInsightColor(insight.type) },
      ]}
    >
      <View style={styles.insightHeader}>
        <View
          style={[
            styles.insightIcon,
            { backgroundColor: getInsightColor(insight.type) + "20" },
          ]}
        >
          <Ionicons
            name={insight.icon as any}
            size={24}
            color={getInsightColor(insight.type)}
          />
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={styles.insightDescription}>{insight.description}</Text>
          {insight.value !== undefined && (
            <Text style={styles.insightValue}>
              {formatCurrency(insight.value)}
            </Text>
          )}
        </View>
      </View>
      {insight.action && (
        <TouchableOpacity
          style={styles.insightAction}
          onPress={insight.action.onPress}
        >
          <Text style={styles.insightActionText}>{insight.action.label}</Text>
          <Ionicons name="arrow-forward" size={16} color="#8b5cf6" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPatternCard = (pattern: SpendingPattern) => (
    <View key={pattern.category} style={styles.patternCard}>
      <View style={styles.patternHeader}>
        <Text style={styles.patternCategory}>{pattern.category}</Text>
        <View style={styles.trendBadge}>
          <Ionicons
            name={
              pattern.trend === "up"
                ? "trending-up"
                : pattern.trend === "down"
                  ? "trending-down"
                  : "remove"
            }
            size={16}
            color={
              pattern.trend === "up"
                ? "#ef4444"
                : pattern.trend === "down"
                  ? "#22c55e"
                  : "#6b7280"
            }
          />
          <Text
            style={[
              styles.trendText,
              {
                color:
                  pattern.trend === "up"
                    ? "#ef4444"
                    : pattern.trend === "down"
                      ? "#22c55e"
                      : "#6b7280",
              },
            ]}
          >
            {pattern.trend === "up"
              ? "High"
              : pattern.trend === "down"
                ? "Low"
                : "Stable"}
          </Text>
        </View>
      </View>
      <Text style={styles.patternRecommendation}>{pattern.recommendation}</Text>
    </View>
  );

  if (trips.length === 0 || expenses.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Data Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add expenses to see personalized insights
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate("AddExpense")}
          >
            <Text style={styles.emptyButtonText}>Add First Expense</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Smart Insights</Text>
          <Text style={styles.subtitle}>AI-powered spending analysis</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(["week", "month", "trip"] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonSelected,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextSelected,
                ]}
              >
                {period === "week"
                  ? "This Week"
                  : period === "month"
                    ? "This Month"
                    : "All Trips"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="wallet" size={24} color="#8b5cf6" />
            <Text style={styles.statValue}>{formatCurrency(totalSpent)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#3b82f6" />
            <Text style={styles.statValue}>
              {formatCurrency(avgDailySpend)}
            </Text>
            <Text style={styles.statLabel}>Daily Average</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="receipt" size={24} color="#22c55e" />
            <Text style={styles.statValue}>{filteredExpenses.length}</Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>
              {categorySpending.length > 0
                ? categorySpending[0].category
                : "N/A"}
            </Text>
            <Text style={styles.statLabel}>Top Category</Text>
          </View>
        </View>

        {/* Prediction Card */}
        {prediction && (
          <View style={styles.predictionCard}>
            <View style={styles.predictionHeader}>
              <Ionicons name="bulb" size={24} color="#f59e0b" />
              <Text style={styles.predictionTitle}>Spending Forecast</Text>
            </View>
            <Text style={styles.predictionAmount}>
              {formatCurrency(prediction.estimated)}
            </Text>
            <Text style={styles.predictionLabel}>
              Estimated total by month end ({prediction.daysRemaining} days
              remaining)
            </Text>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {prediction.confidence === "high"
                  ? "High Confidence"
                  : "Medium Confidence"}
              </Text>
            </View>
          </View>
        )}

        {/* Insights Section */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Key Insights</Text>
            {insights.map(renderInsightCard)}
          </View>
        )}

        {/* Spending Patterns */}
        {spendingPatterns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Spending Patterns</Text>
            {spendingPatterns.slice(0, 3).map(renderPatternCard)}
          </View>
        )}

        {/* Day of Week Chart */}
        {spendingByDayOfWeek.some((d) => d.amount > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Spending by Day</Text>
            <View style={styles.chartContainer}>
              <BarChart
                data={{
                  labels: spendingByDayOfWeek.map((d) => d.day),
                  datasets: [
                    {
                      data: spendingByDayOfWeek.map((d) => d.amount || 0.1),
                    },
                  ],
                }}
                width={screenWidth - 32}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisLabel="$"
                yAxisSuffix=""
                fromZero
              />
            </View>
            <Text style={styles.chartNote}>
              Average spending per transaction by day of week
            </Text>
          </View>
        )}

        {/* Category Breakdown */}
        {categorySpending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏷️ Category Breakdown</Text>
            {categorySpending.map((cat, idx) => {
              const percentage = (cat.amount / totalSpent) * 100;
              return (
                <View key={cat.category} style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>
                      {idx + 1}. {cat.category}
                    </Text>
                    <Text style={styles.categoryAmount}>
                      {formatCurrency(cat.amount)}
                    </Text>
                  </View>
                  <View style={styles.categoryBar}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        { width: `${percentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryPercentage}>
                    {percentage.toFixed(1)}% of total
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Recommendations</Text>
          <View style={styles.recommendationCard}>
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            <Text style={styles.recommendationText}>
              Track every expense to get more accurate insights
            </Text>
          </View>
          <View style={styles.recommendationCard}>
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            <Text style={styles.recommendationText}>
              Set daily budgets to stay on track
            </Text>
          </View>
          <View style={styles.recommendationCard}>
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            <Text style={styles.recommendationText}>
              Review spending weekly to identify patterns
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  periodButtonSelected: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  periodButtonTextSelected: {
    color: "#8b5cf6",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  predictionCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  predictionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  predictionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  predictionAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#f59e0b",
    marginBottom: 8,
  },
  predictionLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  confidenceBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  insightCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  insightAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  insightActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  patternCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  patternHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  patternCategory: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trendText: {
    fontSize: 14,
    fontWeight: "500",
  },
  patternRecommendation: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  chartContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    borderRadius: 16,
  },
  chartNote: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  categoryItem: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  categoryBar: {
    height: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  categoryBarFill: {
    height: "100%",
    backgroundColor: "#8b5cf6",
    borderRadius: 4,
  },
  categoryPercentage: {
    fontSize: 12,
    color: "#666",
  },
  recommendationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});
