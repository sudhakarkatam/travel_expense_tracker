import React, { useState, useMemo } from "react";
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
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { useApp } from "@/contexts/AppContext";
import { getCategoryBreakdown } from "@/utils/analyticsCalculations";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { formatCurrency } from "@/utils/currencyFormatter";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import DatePickerInput from "@/components/DatePickerInput";
import { Svg, Circle, Rect } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 32;

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
  const { expenses, trips } = useApp();

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
      success: (theme?.colors as any)?.success || '#10b981',
      warning: (theme?.colors as any)?.warning || '#F59E0B',
      info: (theme?.colors as any)?.info || '#3B82F6',
      outline: theme?.colors?.outline || (isDark ? '#4b5563' : '#E5E7EB'),
      outlineVariant: theme?.colors?.outlineVariant || (isDark ? '#374151' : '#E5E7EB'),
    },
  };

  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "custom">("30d");
  const [selectedTripId, setSelectedTripId] = useState<string>("all");
  const [currentStartDate, setCurrentStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [currentEndDate, setCurrentEndDate] = useState<Date>(new Date());
  const [showCustomRangeModal, setShowCustomRangeModal] = useState(false);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; visible: boolean; value: number; label: string } | null>(null);

  const periodDays = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };

  // Calculate date range based on selected period
  const dateRange = useMemo(() => {
    return { start: currentStartDate, end: currentEndDate };
  }, [currentStartDate, currentEndDate]);

  // Filter expenses based on date range and selected trip
  const filteredExpenses = useMemo(() => {
    const { start, end } = dateRange;
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      const matchesTrip = selectedTripId === "all" || expense.tripId === selectedTripId;
      return matchesTrip && expenseDate >= start && expenseDate <= end;
    });
  }, [expenses, dateRange, selectedTripId]);

  // Process daily spending data
  const dailySpendingData = useMemo((): DailySpending[] => {
    const { start, end } = dateRange;

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
  }, [filteredExpenses, dateRange]);

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
    const categoryBreakdown = getCategoryBreakdown(filteredExpenses);
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
  }, [dailySpendingData, filteredExpenses]);

  // Chart data
  const lineChartData = useMemo(() => {
    const labels = dailySpendingData.map((day) => {
      const date = new Date(day.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const data = dailySpendingData.map((day) => day.amount);

    // Downsample labels for readability if too many points
    const visibleLabels = labels.map((label, index) => {
      if (labels.length > 10 && index % Math.ceil(labels.length / 6) !== 0) {
        return '';
      }
      return label;
    });

    return {
      labels: visibleLabels,
      datasets: [
        {
          data: data.length > 0 ? data : [0],
          color: (opacity = 1) => safeTheme.colors.primary,
          strokeWidth: 3,
        },
      ],
      legend: ["Daily Spending"]
    };
  }, [dailySpendingData, safeTheme.colors.primary]);

  // Category bar chart data
  const categoryChartData = useMemo(() => {
    const categoryBreakdown = getCategoryBreakdown(filteredExpenses);

    return {
      labels: categoryBreakdown.slice(0, 5).map(c => c.category),
      datasets: [
        {
          data: categoryBreakdown.slice(0, 5).map(c => c.amount),
        },
      ],
    };
  }, [filteredExpenses]);

  // Category Pie Chart Data
  const pieChartData = useMemo(() => {
    const categoryBreakdown = getCategoryBreakdown(filteredExpenses);
    return categoryBreakdown.map((c, index) => ({
      name: c.category,
      population: c.amount,
      color: c.color,
      legendFontColor: safeTheme.colors.onSurfaceVariant,
      legendFontSize: 12,
    }));
  }, [filteredExpenses, safeTheme]);

  const chartConfig = {
    backgroundColor: safeTheme.colors.surface,
    backgroundGradientFrom: safeTheme.colors.surface,
    backgroundGradientTo: safeTheme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => safeTheme.colors.primary,
    labelColor: (opacity = 1) => safeTheme.colors.onSurfaceVariant,
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: safeTheme.colors.surface },
    propsForBackgroundLines: { strokeDasharray: "", stroke: safeTheme.colors.outlineVariant, strokeOpacity: 0.3 },
  };

  const handleDataPointClick = (data: any) => {
    const { x, y, value, index } = data;
    const date = dailySpendingData[index]?.date;
    const formattedDate = new Date(date).toLocaleDateString('default', { month: 'short', day: 'numeric' });

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setTooltipPos({
      x,
      y,
      visible: true,
      value,
      label: formattedDate
    });
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
    const startStr = start.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={["top"]}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[safeTheme.colors.primary, safeTheme.colors.primary + 'CC']}
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
            <TouchableOpacity
              style={styles.tripSelectorButton}
              onPress={() => setShowTripSelector(true)}
            >
              <Text style={styles.tripSelectorText}>
                {selectedTripId === "all"
                  ? "All Trips"
                  : trips.find((t) => t.id === selectedTripId)?.name || "Unknown Trip"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            <Text style={styles.headerSubtitle}>{formatDateRange()}</Text>
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
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 } as any}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Daily Spending</Text>
            <ErrorBoundary fallback={<View style={styles.chartError}><Text>Unable to load chart</Text></View>}>
              <Surface style={[styles.chartContainer, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
                {lineChartData.datasets[0].data.length > 0 && lineChartData.datasets[0].data.some(d => d > 0) ? (
                  <View>
                    <LineChart
                      data={lineChartData}
                      width={CHART_WIDTH}
                      height={220}
                      chartConfig={chartConfig}
                      bezier
                      style={styles.chart}
                      withInnerLines={true}
                      withOuterLines={false}
                      withVerticalLines={false}
                      withHorizontalLines={true}
                      withVerticalLabels={true}
                      withHorizontalLabels={true}
                      fromZero
                      onDataPointClick={handleDataPointClick}
                      decorator={() => {
                        return tooltipPos?.visible ? (
                          <View>
                            <Svg>
                              <Circle
                                cx={tooltipPos.x}
                                cy={tooltipPos.y}
                                r="6"
                                fill={safeTheme.colors.primary}
                                stroke={safeTheme.colors.surface}
                                strokeWidth="2"
                              />
                            </Svg>
                            <View style={[
                              styles.tooltip,
                              {
                                left: tooltipPos.x - 40,
                                top: tooltipPos.y - 45,
                                backgroundColor: safeTheme.colors.onSurface
                              }
                            ]}>
                              <Text style={styles.tooltipText}>{formatCurrency(tooltipPos.value)}</Text>
                              <Text style={styles.tooltipDate}>{tooltipPos.label}</Text>
                            </View>
                          </View>
                        ) : null;
                      }}
                    />
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
            <View style={[styles.insightIcon, { backgroundColor: safeTheme.colors.error + '20' }]}>
              <Ionicons name="arrow-up" size={20} color={safeTheme.colors.error} />
            </View>
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
            <View style={[styles.insightIcon, { backgroundColor: safeTheme.colors.success + '20' }]}>
              <Ionicons name="arrow-down" size={20} color={safeTheme.colors.success} />
            </View>
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
            <View style={[styles.insightIcon, { backgroundColor: safeTheme.colors.info + '20' }]}>
              <Ionicons name="calculator" size={20} color={safeTheme.colors.info} />
            </View>
            <Text style={[styles.insightLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Daily Avg</Text>
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
                  yAxisLabel=""
                  yAxisSuffix=""
                  showValuesOnTopOfBars
                />
              </Surface>
            </ErrorBoundary>
          </View>
        )}

        {/* Category Pie Chart */}
        {pieChartData.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Category Distribution</Text>
            <Surface style={[styles.chartContainer, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
              <PieChart
                data={pieChartData}
                width={CHART_WIDTH}
                height={220}
                chartConfig={chartConfig}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 0]}
                absolute
              />
            </Surface>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={showTripSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTripSelector(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTripSelector(false)}
        >
          <View style={[styles.tripSelectorModal, { backgroundColor: safeTheme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: safeTheme.colors.onSurface, marginBottom: 12 }]}>Select Trip</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity
                style={[
                  styles.tripOption,
                  selectedTripId === "all" && { backgroundColor: safeTheme.colors.primaryContainer },
                ]}
                onPress={() => {
                  setSelectedTripId("all");
                  setShowTripSelector(false);
                }}
              >
                <Text
                  style={[
                    styles.tripOptionText,
                    {
                      color: selectedTripId === "all"
                        ? safeTheme.colors.onPrimaryContainer
                        : safeTheme.colors.onSurface
                    },
                  ]}
                >
                  All Trips
                </Text>
                {selectedTripId === "all" && (
                  <Ionicons name="checkmark" size={20} color={safeTheme.colors.primary} />
                )}
              </TouchableOpacity>
              {trips.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  style={[
                    styles.tripOption,
                    selectedTripId === trip.id && { backgroundColor: safeTheme.colors.primaryContainer },
                  ]}
                  onPress={() => {
                    setSelectedTripId(trip.id);
                    setShowTripSelector(false);
                  }}
                >
                  <Text
                    style={[
                      styles.tripOptionText,
                      {
                        color: selectedTripId === trip.id
                          ? safeTheme.colors.onPrimaryContainer
                          : safeTheme.colors.onSurface
                      },
                    ]}
                  >
                    {trip.name}
                  </Text>
                  {selectedTripId === trip.id && (
                    <Ionicons name="checkmark" size={20} color={safeTheme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
  tripSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginVertical: 4,
  },
  tripSelectorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  totalContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 4,
  },
  navButton: {
    padding: 8,
  },
  periodButtons: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  periodButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  periodButtonTextActive: {
    color: '#8b5cf6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginLeft: 4,
  },
  chartContainer: {
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  chartError: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChart: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyChartText: {
    fontSize: 14,
  },
  insightsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  insightCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  insightDate: {
    fontSize: 10,
  },
  tooltip: {
    position: 'absolute',
    padding: 8,
    borderRadius: 8,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  tooltipDate: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  tripSelectorModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalContent: {
    margin: 24,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tripOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  tripOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  datePickerContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  datePickerItem: {
    gap: 8,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    borderWidth: 0,
  },
  modalButtonApply: {
    elevation: 0,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});
