import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Surface, Card, Divider } from "react-native-paper";
import { PieChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import { useThemeMode } from "@/contexts/ThemeContext";
import { useApp } from "@/contexts/AppContext";
import EmptyState from "@/components/EmptyState";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";

const { width } = Dimensions.get("window");

export default function AnalyticsScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { isDark } = useThemeMode();
  const { expenses, trips, categories } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");

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
      errorContainer: theme?.colors?.errorContainer || (isDark ? '#93000a' : '#ffdad6'),
      onErrorContainer: theme?.colors?.onErrorContainer || (isDark ? '#ffdad6' : '#410002'),
      outline: theme?.colors?.outline || (isDark ? '#4b5563' : '#E5E7EB'),
      outlineVariant: theme?.colors?.outlineVariant || (isDark ? '#374151' : '#E5E7EB'),
      secondaryContainer: theme?.colors?.secondaryContainer || '#f3f4f6',
      onSecondaryContainer: theme?.colors?.onSecondaryContainer || '#1f2937',
    },
  };

  // Filter expenses based on selected period
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();

    if (selectedPeriod === "7d") cutoff.setDate(now.getDate() - 7);
    else if (selectedPeriod === "30d") cutoff.setDate(now.getDate() - 30);
    else if (selectedPeriod === "90d") cutoff.setDate(now.getDate() - 90);
    else return expenses;

    return expenses.filter((e) => new Date(e.date) >= cutoff);
  }, [expenses, selectedPeriod]);

  const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  // Calculate category breakdown
  const categoryData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const catId = e.category;
      breakdown[catId] = (breakdown[catId] || 0) + e.amount;
    });

    return Object.entries(breakdown)
      .map(([id, amount]) => {
        const category = categories.find((c) => c.id === id) || categories.find(c => c.name.toLowerCase() === id.toLowerCase());
        return {
          name: category?.name || id,
          population: amount,
          color: category?.color || "#ccc",
          legendFontColor: safeTheme.colors.onSurface,
          legendFontSize: 12,
        };
      })
      .sort((a, b) => b.population - a.population);
  }, [filteredExpenses, categories, safeTheme.colors.onSurface]);

  // Calculate comparison with previous period
  const comparison = useMemo(() => {
    const now = new Date();
    const currentStart = new Date();
    const previousStart = new Date();
    const previousEnd = new Date();

    let days = 30;
    if (selectedPeriod === "7d") days = 7;
    if (selectedPeriod === "90d") days = 90;
    if (selectedPeriod === "all") return null;

    currentStart.setDate(now.getDate() - days);
    previousStart.setDate(now.getDate() - days * 2);
    previousEnd.setDate(now.getDate() - days);

    const previousExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= previousStart && d < previousEnd;
    });

    const previousTotal = previousExpenses.reduce((sum, e) => sum + e.amount, 0);

    if (previousTotal === 0) return null;

    const diff = totalSpent - previousTotal;
    const percentage = (diff / previousTotal) * 100;

    return { diff, percentage };
  }, [expenses, totalSpent, selectedPeriod]);

  // Calculate average spending
  const averages = useMemo(() => {
    if (filteredExpenses.length === 0) return { daily: 0, perTrip: 0 };

    // Daily Average
    const dates = filteredExpenses.map(e => new Date(e.date).toDateString());
    const uniqueDays = new Set(dates).size || 1;
    const daily = totalSpent / uniqueDays;

    // Per Trip Average
    const tripIds = new Set(filteredExpenses.map(e => e.tripId));
    const perTrip = tripIds.size > 0 ? totalSpent / tripIds.size : 0;

    return { daily, perTrip };
  }, [filteredExpenses, totalSpent]);

  const EmptyAnalyticsState = () => (
    <View style={styles.emptyContainer}>
      <EmptyState
        icon="bar-chart-outline"
        title="No Data Available"
        subtitle={`No expenses found for the last ${selectedPeriod === 'all' ? 'period' : selectedPeriod}.`}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: safeTheme.colors.surface }]}>
        <Text style={[styles.headerTitle, { color: safeTheme.colors.onSurface }]}>Analytics</Text>
      </View>

      {/* Period Selector - Sticky */}
      <View style={[styles.periodSelectorContainer, { backgroundColor: safeTheme.colors.background }]}>
        <View style={[styles.periodSelector, { backgroundColor: safeTheme.colors.surfaceVariant }]}>
          {(["7d", "30d", "90d", "all"] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && { backgroundColor: safeTheme.colors.primary },
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodText,
                  { color: selectedPeriod === period ? safeTheme.colors.onPrimary : safeTheme.colors.onSurfaceVariant },
                ]}
              >
                {period === "all" ? "All Time" : period.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredExpenses.length === 0 ? (
          <EmptyAnalyticsState />
        ) : (
          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500 } as any}>

            {/* Total Spent Card */}
            <Surface style={styles.summaryCard} elevation={2}>
              <LinearGradient
                colors={[safeTheme.colors.primary, '#a78bfa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBackground}
              >
                <Text style={styles.totalLabel}>Total Spent</Text>
                <Text style={styles.totalAmount}>₹{totalSpent.toLocaleString()}</Text>
                {comparison && (
                  <View style={styles.comparisonRow}>
                    <Ionicons
                      name={comparison.percentage > 0 ? "arrow-up" : "arrow-down"}
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.comparisonText}>
                      {Math.abs(comparison.percentage).toFixed(1)}% {comparison.percentage > 0 ? "more" : "less"} than previous
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </Surface>

            {/* Shortcuts */}
            <View style={styles.metricsGrid}>
              <TouchableOpacity
                style={[styles.metricCard, { backgroundColor: safeTheme.colors.surface }]}
                onPress={() => navigation.navigate('SpendingTrends' as never)}
              >
                <View style={{ padding: 8, borderRadius: 8, backgroundColor: safeTheme.colors.primary + '20', marginBottom: 8 }}>
                  <Ionicons name="stats-chart" size={24} color={safeTheme.colors.primary} />
                </View>
                <Text style={[styles.metricValue, { fontSize: 14, marginTop: 0, color: safeTheme.colors.onSurface }]}>Trends</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.metricCard, { backgroundColor: safeTheme.colors.surface }]}
                onPress={() => navigation.navigate('SpendingHeatmap' as never)}
              >
                <View style={{ padding: 8, borderRadius: 8, backgroundColor: safeTheme.colors.secondaryContainer, marginBottom: 8 }}>
                  <Ionicons name="grid" size={24} color={safeTheme.colors.onSecondaryContainer} />
                </View>
                <Text style={[styles.metricValue, { fontSize: 14, marginTop: 0, color: safeTheme.colors.onSurface }]}>Heatmap</Text>
              </TouchableOpacity>
            </View>

            {/* Category Breakdown */}
            <Surface style={[styles.chartCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
              <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Spending by Category</Text>
              <PieChart
                data={categoryData}
                width={width - 64}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                hasLegend={false}
                center={[width / 4, 0]}
              />
              <View style={styles.legendContainer}>
                {categoryData.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                    <Text style={[styles.legendText, { color: safeTheme.colors.onSurface }]}>{item.name}</Text>
                    <Text style={[styles.legendAmount, { color: safeTheme.colors.onSurfaceVariant }]}>
                      {Math.round((item.population / totalSpent) * 100)}%
                    </Text>
                  </View>
                ))}
              </View>
            </Surface>

            {/* Smart Insights */}
            <View style={styles.section}>
              <Text style={[styles.sectionHeader, { color: safeTheme.colors.onSurface }]}>Insights</Text>

              {/* Biggest Spender */}
              <Surface style={[styles.insightCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
                <View style={[styles.insightIcon, { backgroundColor: safeTheme.colors.errorContainer }]}>
                  <Ionicons name="alert-circle-outline" size={24} color={safeTheme.colors.error} />
                </View>
                <View style={styles.insightContent}>
                  <Text style={[styles.insightTitle, { color: safeTheme.colors.onSurface }]}>Top Spending Category</Text>
                  <Text style={[styles.insightDescription, { color: safeTheme.colors.onSurfaceVariant }]}>
                    You spent the most on <Text style={{ fontWeight: 'bold', color: safeTheme.colors.onSurface }}>{categoryData[0]?.name}</Text> ({Math.round((categoryData[0]?.population / totalSpent) * 100)}%).
                  </Text>
                </View>
              </Surface>

              {/* Budget Burn Rate (Mock logic for now as we need trip budgets) */}
              <Surface style={[styles.insightCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
                <View style={[styles.insightIcon, { backgroundColor: safeTheme.colors.primary + '20' }]}>
                  <Ionicons name="trending-up-outline" size={24} color={safeTheme.colors.primary} />
                </View>
                <View style={styles.insightContent}>
                  <Text style={[styles.insightTitle, { color: safeTheme.colors.onSurface }]}>Spending Trend</Text>
                  <Text style={[styles.insightDescription, { color: safeTheme.colors.onSurfaceVariant }]}>
                    {comparison && comparison.percentage > 10
                      ? "Your spending is significantly higher than last period."
                      : "Your spending is stable compared to last period."}
                  </Text>
                </View>
              </Surface>
            </View>

          </MotiView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  periodSelectorContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  periodSelector: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  periodText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
  },
  emptyContainer: {
    marginTop: 40,
  },
  summaryCard: {
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
  },
  gradientBackground: {
    padding: 24,
  },
  totalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  totalAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  comparisonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  chartCard: {
    padding: 16,
    borderRadius: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  legendContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  legendAmount: {
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  insightCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
