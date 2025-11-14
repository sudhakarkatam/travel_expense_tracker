import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Surface } from "react-native-paper";
import { useThemeMode } from "@/contexts/ThemeContext";
import { LineChart, BarChart } from "react-native-chart-kit";
import { useApp } from "@/contexts/AppContext";
import { getCategoryBreakdown } from "@/utils/analyticsCalculations";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { formatCurrency } from "@/utils/currencyFormatter";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import DatePickerInput from "@/components/DatePickerInput";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 48;

interface SpendingTrendsScreenProps {
  navigation: any;
}

interface DailySpending {
  date: string;
  amount: number;
  expenseCount: number;
  categories: Record<string, number>;
  topCategory: string;
}

export default function SpendingTrendsScreen({ navigation }: SpendingTrendsScreenProps) {
  const theme = useTheme();
  const { isDark } = useThemeMode();
  const { expenses } = useApp();
  
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

  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "custom">("30d");
  const [currentStartDate, setCurrentStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [currentEndDate, setCurrentEndDate] = useState<Date>(new Date());
  const [showCustomRangeModal, setShowCustomRangeModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const periodDays = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };

  // Calculate date range based on selected period
  const dateRange = useMemo(() => {
    if (selectedPeriod === "custom") {
      if (customStartDate && customEndDate) {
        return {
          start: new Date(customStartDate),
          end: new Date(customEndDate),
        };
      }
      return { start: currentStartDate, end: currentEndDate };
    }
    
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - periodDays[selectedPeriod]);
    return { start, end };
  }, [selectedPeriod, currentStartDate, currentEndDate, customStartDate, customEndDate, periodDays]);

  // Process daily spending data
  const dailySpendingData = useMemo((): DailySpending[] => {
    const { start, end } = dateRange;
    const filteredExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= start && expenseDate <= end;
    });

    // Initialize date map
    const dailyMap: Record<string, DailySpending> = {};
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyMap[dateKey] = {
        date: dateKey,
        amount: 0,
        expenseCount: 0,
        categories: {},
        topCategory: '',
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate expenses
    filteredExpenses.forEach((expense) => {
      const dateKey = expense.date.split('T')[0];
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].amount += expense.amount;
        dailyMap[dateKey].expenseCount += 1;
        dailyMap[dateKey].categories[expense.category] = 
          (dailyMap[dateKey].categories[expense.category] || 0) + expense.amount;
      }
    });

    // Find top category for each day
    Object.values(dailyMap).forEach((day) => {
      const topCategory = Object.entries(day.categories)
        .sort(([, a], [, b]) => b - a)[0];
      day.topCategory = topCategory ? topCategory[0] : '';
    });

    return Object.values(dailyMap).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [expenses, dateRange]);

  // Calculate insights
  const insights = useMemo(() => {
    const amounts = dailySpendingData.map(d => d.amount);
    const totalSpent = amounts.reduce((sum, amt) => sum + amt, 0);
    const maxAmount = Math.max(...amounts, 0);
    const minAmount = Math.min(...amounts.filter(a => a > 0), 0);
    const maxDay = dailySpendingData.find(d => d.amount === maxAmount);
    const minDay = dailySpendingData.find(d => d.amount === minAmount && d.amount > 0);
    const avgPerDay = dailySpendingData.length > 0 ? totalSpent / dailySpendingData.length : 0;
    const totalTransactions = dailySpendingData.reduce((sum, d) => sum + d.expenseCount, 0);
    
    // Most used category
    const categoryBreakdown = getCategoryBreakdown(
      expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= dateRange.start && expenseDate <= dateRange.end;
      })
    );
    const mostUsedCategory = categoryBreakdown[0];

    // Peak hour (simplified - would need time data)
    const peakHour = "2:00 PM"; // Placeholder

    return {
      totalSpent,
      maxDay,
      minDay,
      avgPerDay,
      totalTransactions,
      mostUsedCategory,
      peakHour,
    };
  }, [dailySpendingData, expenses, dateRange]);

  // Chart data - show max 7 labels at a time for better readability
  const lineChartData = useMemo(() => {
    const labels = dailySpendingData.map((day) => {
      const date = new Date(day.date);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${dayNames[date.getDay()]} ${date.getDate()}`;
    });
    
    const data = dailySpendingData.map((day) => day.amount);

    // For monthly/90d views, show only 7 labels at a time
    const maxLabels = 7;
    const shouldScroll = labels.length > maxLabels;
    
    return {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [
        {
          data: data.length > 0 ? data : [0],
          strokeWidth: 2,
        },
      ],
      shouldScroll,
      totalPoints: labels.length,
    };
  }, [dailySpendingData]);

  // Category bar chart data
  const categoryChartData = useMemo(() => {
    const categoryBreakdown = getCategoryBreakdown(
      expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= dateRange.start && expenseDate <= dateRange.end;
      })
    );

    return {
      labels: categoryBreakdown.slice(0, 5).map(c => c.category),
      datasets: [
        {
          data: categoryBreakdown.slice(0, 5).map(c => c.amount),
        },
      ],
    };
  }, [expenses, dateRange]);

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

  const handlePreviousPeriod = () => {
    const { start, end } = dateRange;
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const newEnd = new Date(start);
    newEnd.setDate(newEnd.getDate() - 1);
    const newStart = new Date(newEnd);
    newStart.setDate(newStart.getDate() - daysDiff);
    
    setCurrentStartDate(newStart);
    setCurrentEndDate(newEnd);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNextPeriod = () => {
    const { start, end } = dateRange;
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const newStart = new Date(end);
    newStart.setDate(newStart.getDate() + 1);
    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + daysDiff);
    
    // Don't go beyond today
    const today = new Date();
    if (newEnd > today) {
      newEnd.setTime(today.getTime());
    }
    if (newStart > today) return;
    
    setCurrentStartDate(newStart);
    setCurrentEndDate(newEnd);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePeriodChange = (period: "7d" | "30d" | "90d" | "custom") => {
    setSelectedPeriod(period);
    if (period === "custom") {
      setShowCustomRangeModal(true);
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - periodDays[period]);
      setCurrentStartDate(start);
      setCurrentEndDate(end);
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleApplyCustomRange = () => {
    if (!customStartDate || !customEndDate) {
      Alert.alert('Error', 'Please select both start and end dates');
      return;
    }
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    if (start > end) {
      Alert.alert('Error', 'Start date must be before end date');
      return;
    }
    setCurrentStartDate(start);
    setCurrentEndDate(end);
    setShowCustomRangeModal(false);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const formatDateRange = () => {
    const { start, end } = dateRange;
    const startStr = start.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = end.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const formatMonthYear = () => {
    const { start, end } = dateRange;
    const startMonth = start.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    const endMonth = end.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    if (startMonth === endMonth) {
      return startMonth;
    }
    return `${startMonth} - ${endMonth}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={["top"]}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[safeTheme.colors.primary, safeTheme.colors.primary + 'DD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={safeTheme.colors.onPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Spending Trends</Text>
            <Text style={styles.headerSubtitle}>{formatDateRange()}</Text>
            <Text style={styles.headerMonthYear}>{formatMonthYear()}</Text>
          </View>
          <View style={styles.backButton} />
        </View>

        {/* Total Spent */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Spent</Text>
          <Text style={styles.totalAmount}>{formatCurrency(insights.totalSpent)}</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            onPress={handlePreviousPeriod}
            style={styles.navButton}
            disabled={selectedPeriod === "custom"}
          >
            <Ionicons 
              name="chevron-back" 
              size={20} 
              color={selectedPeriod === "custom" ? safeTheme.colors.onPrimary + '60' : safeTheme.colors.onPrimary} 
            />
          </TouchableOpacity>
          
          <View style={styles.periodButtons}>
            {(["7d", "30d", "90d", "custom"] as const).map((period) => (
              <TouchableOpacity
                key={period}
                onPress={() => handlePeriodChange(period)}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive,
                  ]}
                >
                  {period === "custom" ? "Custom" : period.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleNextPeriod}
            style={styles.navButton}
            disabled={selectedPeriod === "custom" || currentEndDate >= new Date()}
          >
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={currentEndDate >= new Date() || selectedPeriod === "custom" ? safeTheme.colors.onPrimary + '60' : safeTheme.colors.onPrimary} 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Chart */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Daily Spending</Text>
            <ErrorBoundary fallback={<View style={styles.chartError}><Text>Unable to load chart</Text></View>}>
              <Surface style={[styles.chartContainer, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
                {lineChartData.datasets[0].data.length > 0 && lineChartData.datasets[0].data.some(d => d > 0) ? (
                  <View style={styles.chartWrapper}>
                    {/* Y-axis labels - fixed position */}
                    <View style={styles.yAxisContainer}>
                      {(() => {
                        const maxValue = Math.max(...lineChartData.datasets[0].data);
                        const steps = 5;
                        const stepValue = maxValue / steps;
                        return Array.from({ length: steps + 1 }, (_, i) => {
                          const value = stepValue * (steps - i);
                          return (
                            <Text key={i} style={[styles.yAxisLabel, { color: safeTheme.colors.onSurfaceVariant }]}>
                              {formatCurrency(value, { compact: true })}
                            </Text>
                          );
                        });
                      })()}
                    </View>
                    {/* Scrollable chart */}
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={true}
                      contentContainerStyle={styles.chartScrollContent}
                      style={styles.chartScrollView}
                    >
                      <LineChart
                        data={lineChartData}
                        width={Math.max(CHART_WIDTH - 60, lineChartData.labels.length * 50)}
                        height={280}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chart}
                        withInnerLines={true}
                        withOuterLines={true}
                        withVerticalLabels={false}
                        withHorizontalLabels={true}
                        fromZero
                        onDataPointClick={(data) => {
                          // Show value on click
                          const date = lineChartData.labels[data.index];
                          const value = lineChartData.datasets[0].data[data.index];
                          Alert.alert(
                            date,
                            `Amount: ${formatCurrency(value)}`,
                            [{ text: 'OK' }]
                          );
                        }}
                      />
                    </ScrollView>
                  </View>
                ) : (
                  <View style={styles.emptyChart}>
                    <Ionicons name="trending-up-outline" size={48} color={safeTheme.colors.onSurfaceVariant} />
                    <Text style={[styles.emptyChartText, { color: safeTheme.colors.onSurfaceVariant }]}>No spending data for this period</Text>
                  </View>
                )}
              </Surface>
            </ErrorBoundary>
          </View>
        </MotiView>

        {/* Insights Cards */}
        <View style={styles.insightsRow}>
          <Surface style={[styles.insightCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <Ionicons name="arrow-up-circle" size={24} color={safeTheme.colors.error} />
            <Text style={[styles.insightLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Highest Day</Text>
            {insights.maxDay ? (
              <>
                <Text style={[styles.insightValue, { color: safeTheme.colors.onSurface }]}>
                  {formatCurrency(insights.maxDay.amount)}
                </Text>
                <Text style={[styles.insightDate, { color: safeTheme.colors.onSurfaceVariant }]}>
                  {new Date(insights.maxDay.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                </Text>
              </>
            ) : (
              <Text style={[styles.insightValue, { color: safeTheme.colors.onSurfaceVariant }]}>No data</Text>
            )}
          </Surface>

          <Surface style={[styles.insightCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <Ionicons name="arrow-down-circle" size={24} color={safeTheme.colors.success} />
            <Text style={[styles.insightLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Lowest Day</Text>
            {insights.minDay ? (
              <>
                <Text style={[styles.insightValue, { color: safeTheme.colors.onSurface }]}>
                  {formatCurrency(insights.minDay.amount)}
                </Text>
                <Text style={[styles.insightDate, { color: safeTheme.colors.onSurfaceVariant }]}>
                  {new Date(insights.minDay.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                </Text>
              </>
            ) : (
              <Text style={[styles.insightValue, { color: safeTheme.colors.onSurfaceVariant }]}>No data</Text>
            )}
          </Surface>

          <Surface style={[styles.insightCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <Ionicons name="calculator-outline" size={24} color={safeTheme.colors.info} />
            <Text style={[styles.insightLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Average</Text>
            <Text style={[styles.insightValue, { color: safeTheme.colors.onSurface }]}>
              {formatCurrency(insights.avgPerDay)}
            </Text>
            <Text style={[styles.insightDate, { color: safeTheme.colors.onSurfaceVariant }]}>Per day</Text>
          </Surface>
        </View>

        {/* Category Breakdown Chart */}
        {categoryChartData.labels.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Category Breakdown</Text>
            <ErrorBoundary fallback={<View style={styles.chartError}><Text>Unable to load chart</Text></View>}>
              <Surface style={[styles.chartContainer, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
                <BarChart
                  data={categoryChartData}
                  width={CHART_WIDTH}
                  height={220}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  withInnerLines={false}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  fromZero
                />
              </Surface>
            </ErrorBoundary>
          </View>
        )}

        {/* Additional Stats */}
        <View style={styles.statsSection}>
          <Surface style={[styles.statCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <Ionicons name="receipt-outline" size={20} color={safeTheme.colors.primary} />
            <Text style={[styles.statLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Total Transactions</Text>
            <Text style={[styles.statValue, { color: safeTheme.colors.onSurface }]}>{insights.totalTransactions}</Text>
          </Surface>

          {insights.mostUsedCategory && (
            <Surface style={[styles.statCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
              <Ionicons name="pie-chart-outline" size={20} color={safeTheme.colors.primary} />
              <Text style={[styles.statLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Top Category</Text>
              <Text style={[styles.statValue, { color: safeTheme.colors.onSurface }]} numberOfLines={1}>
                {insights.mostUsedCategory.category}
              </Text>
              <Text style={[styles.statSubValue, { color: safeTheme.colors.primary }]}>
                {insights.mostUsedCategory.percentage.toFixed(1)}%
              </Text>
            </Surface>
          )}

          <Surface style={[styles.statCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <Ionicons name="time-outline" size={20} color={safeTheme.colors.primary} />
            <Text style={[styles.statLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Peak Hour</Text>
            <Text style={[styles.statValue, { color: safeTheme.colors.onSurface }]}>{insights.peakHour}</Text>
          </Surface>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Custom Range Modal */}
      <Modal
        visible={showCustomRangeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomRangeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: safeTheme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: safeTheme.colors.onSurface }]}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setShowCustomRangeModal(false)}>
                <Ionicons name="close" size={24} color={safeTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerItem}>
                <Text style={[styles.datePickerLabel, { color: safeTheme.colors.onSurface }]}>Start Date</Text>
                <DatePickerInput
                  value={customStartDate || new Date().toISOString().split('T')[0]}
                  onChange={(value) => setCustomStartDate(value)}
                />
              </View>
              
              <View style={styles.datePickerItem}>
                <Text style={[styles.datePickerLabel, { color: safeTheme.colors.onSurface }]}>End Date</Text>
                <DatePickerInput
                  value={customEndDate || new Date().toISOString().split('T')[0]}
                  onChange={(value) => setCustomEndDate(value)}
                  minimumDate={customStartDate ? new Date(customStartDate) : undefined}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { backgroundColor: safeTheme.colors.surfaceVariant }]}
                onPress={() => setShowCustomRangeModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: safeTheme.colors.onSurface }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonApply, { backgroundColor: safeTheme.colors.primary }]}
                onPress={handleApplyCustomRange}
              >
                <Text style={[styles.modalButtonText, { color: safeTheme.colors.onPrimary }]}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  headerMonthYear: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    fontWeight: '500',
  },
  chartWrapper: {
    flexDirection: 'row',
    position: 'relative',
  },
  yAxisContainer: {
    width: 50,
    height: 280,
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingVertical: 20,
    alignItems: 'flex-end',
  },
  yAxisLabel: {
    fontSize: 10,
    textAlign: 'right',
  },
  totalContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  periodButtons: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  chartContainer: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  chartScrollView: {
    borderRadius: 12,
    flex: 1,
  },
  chartScrollContent: {
    paddingRight: 16,
  },
  chart: {
    borderRadius: 12,
  },
  chartWithOverlay: {
    position: 'relative',
  },
  dataPointTooltip: {
    position: 'absolute',
    padding: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tooltipDate: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyChart: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    marginTop: 12,
  },
  chartError: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  insightsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginTop: 24,
  },
  insightCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  insightLabel: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  insightDate: {
    fontSize: 11,
  },
  statsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 24,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  statSubValue: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  datePickerContainer: {
    gap: 20,
    marginBottom: 24,
  },
  datePickerItem: {
    gap: 8,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {},
  modalButtonApply: {},
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

