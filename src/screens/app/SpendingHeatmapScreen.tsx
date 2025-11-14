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
import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/utils/currencyFormatter";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import DatePickerInput from "@/components/DatePickerInput";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DAY_BOX_SIZE = (SCREEN_WIDTH - 64) / 7; // 7 days per week

interface SpendingHeatmapScreenProps {
  navigation: any;
}

interface HeatmapDay {
  date: string;
  amount: number;
  intensity: number; // 0-1 normalized
  expenseCount: number;
  dayOfWeek: number; // 0-6
  isToday: boolean;
  isCurrentMonth: boolean;
}

export default function SpendingHeatmapScreen({ navigation }: SpendingHeatmapScreenProps) {
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

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "custom">("month");
  const [showCustomRangeModal, setShowCustomRangeModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Process heatmap data for current month
  const heatmapData = useMemo((): HeatmapDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const today = new Date();
    
    // Aggregate daily spending
    const dailySpending: Record<string, number> = {};
    const dailyExpenseCount: Record<string, number> = {};
    
    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);
      if (expenseDate.getMonth() === month && expenseDate.getFullYear() === year) {
        const dateKey = expenseDate.toISOString().split('T')[0];
        dailySpending[dateKey] = (dailySpending[dateKey] || 0) + expense.amount;
        dailyExpenseCount[dateKey] = (dailyExpenseCount[dateKey] || 0) + 1;
      }
    });
    
    // Find max for normalization
    const maxSpending = Math.max(...Object.values(dailySpending), 1);
    
    // Generate heatmap data
    const heatmapData: HeatmapDay[] = [];
    
    // Add empty days before month starts
    for (let i = 0; i < firstDay; i++) {
      heatmapData.push({
        date: '',
        amount: 0,
        intensity: 0,
        expenseCount: 0,
        dayOfWeek: i,
        isToday: false,
        isCurrentMonth: false,
      });
    }
    
    // Add month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toISOString().split('T')[0];
      const amount = dailySpending[dateKey] || 0;
      const intensity = amount / maxSpending;
      const todayKey = today.toISOString().split('T')[0];
      
      heatmapData.push({
        date: dateKey,
        amount,
        intensity,
        expenseCount: dailyExpenseCount[dateKey] || 0,
        dayOfWeek: date.getDay(),
        isToday: dateKey === todayKey,
        isCurrentMonth: true,
      });
    }
    
    return heatmapData;
  }, [expenses, currentMonth]);

  // Calculate insights
  const insights = useMemo(() => {
    const monthDays = heatmapData.filter(d => d.isCurrentMonth);
    const amounts = monthDays.map(d => d.amount);
    const totalSpent = amounts.reduce((sum, amt) => sum + amt, 0);
    const maxAmount = Math.max(...amounts, 0);
    const minAmount = Math.min(...amounts.filter(a => a > 0), 0);
    const maxDay = monthDays.find(d => d.amount === maxAmount);
    const minDay = monthDays.find(d => d.amount === minAmount && d.amount > 0);
    const avgPerDay = monthDays.length > 0 ? totalSpent / monthDays.length : 0;
    const daysWithSpending = monthDays.filter(d => d.amount > 0).length;
    
    // Most active day of week
    const dayOfWeekSpending: Record<number, number> = {};
    monthDays.forEach(day => {
      if (day.amount > 0) {
        dayOfWeekSpending[day.dayOfWeek] = (dayOfWeekSpending[day.dayOfWeek] || 0) + day.amount;
      }
    });
    const mostActiveDay = Object.entries(dayOfWeekSpending)
      .sort(([, a], [, b]) => b - a)[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return {
      totalSpent,
      maxDay,
      minDay,
      avgPerDay,
      daysWithSpending,
      mostActiveDay: mostActiveDay ? dayNames[parseInt(mostActiveDay[0])] : 'N/A',
    };
  }, [heatmapData]);

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    // Don't go beyond current month
    const today = new Date();
    if (newMonth.getMonth() > today.getMonth() || newMonth.getFullYear() > today.getFullYear()) {
      return;
    }
    setCurrentMonth(newMonth);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleCurrentMonth = () => {
    setCurrentMonth(new Date());
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDayPress = (day: HeatmapDay) => {
    if (!day.isCurrentMonth || day.amount === 0) return;
    setSelectedDay(day);
    setShowDayModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const getDayColor = (intensity: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return safeTheme.colors.surfaceVariant;
    if (intensity === 0) return safeTheme.colors.surfaceVariant;
    
    if (intensity > 0.7) return safeTheme.colors.error;
    if (intensity > 0.4) return safeTheme.colors.warning;
    if (intensity > 0.1) return safeTheme.colors.primary + '80';
    return safeTheme.colors.primary + '40';
  };

  const getDayOpacity = (intensity: number) => {
    if (intensity === 0) return 0.1;
    return 0.3 + (intensity * 0.7);
  };

  const monthYearLabel = currentMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' });

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
            <Text style={styles.headerTitle}>Spending Heatmap</Text>
            <Text style={styles.headerSubtitle}>{monthYearLabel}</Text>
          </View>
          <View style={styles.backButton} />
        </View>

        {/* Total Spent */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total for Month</Text>
          <Text style={styles.totalAmount}>{formatCurrency(insights.totalSpent)}</Text>
        </View>

        {/* Navigation Controls */}
        <View style={styles.navControls}>
          <TouchableOpacity
            onPress={handlePreviousMonth}
            style={styles.navButton}
          >
            <Ionicons name="chevron-back" size={20} color={safeTheme.colors.onPrimary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleCurrentMonth}
            style={styles.currentMonthButton}
          >
            <Text style={styles.currentMonthText}>Current</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNextMonth}
            style={styles.navButton}
            disabled={currentMonth.getMonth() >= new Date().getMonth() && currentMonth.getFullYear() >= new Date().getFullYear()}
          >
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={
                currentMonth.getMonth() >= new Date().getMonth() && currentMonth.getFullYear() >= new Date().getFullYear()
                  ? safeTheme.colors.onPrimary + '60'
                  : safeTheme.colors.onPrimary
              } 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Heatmap Grid */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Daily Spending Intensity</Text>
            
            <Surface style={[styles.heatmapContainer, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
              {/* Day Labels */}
              <View style={styles.dayLabelsRow}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <View key={index} style={styles.dayLabel}>
                    <Text style={[styles.dayLabelText, { color: safeTheme.colors.onSurfaceVariant }]}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Heatmap Grid */}
              <View style={styles.heatmapGrid}>
                {heatmapData.map((day, index) => {
                  const color = getDayColor(day.intensity, day.isCurrentMonth);
                  const opacity = day.isCurrentMonth ? getDayOpacity(day.intensity) : 0.1;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleDayPress(day)}
                      disabled={!day.isCurrentMonth || day.amount === 0}
                      style={[
                        styles.heatmapDay,
                        {
                          backgroundColor: color,
                          opacity,
                          borderWidth: day.isToday ? 2 : 0,
                          borderColor: safeTheme.colors.primary,
                        },
                      ]}
                    >
                      {day.isCurrentMonth && (
                        <>
                          <Text style={[styles.heatmapDayNumber, { color: safeTheme.colors.onSurface }]}>
                            {day.date ? new Date(day.date).getDate() : ''}
                          </Text>
                          {day.amount > 0 && (
                            <View style={styles.heatmapDayIndicator} />
                          )}
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                <Text style={[styles.legendText, { color: safeTheme.colors.onSurfaceVariant }]}>Less</Text>
                <View style={styles.legendColors}>
                  <View style={[styles.legendColor, { backgroundColor: safeTheme.colors.surfaceVariant }]} />
                  <View style={[styles.legendColor, { backgroundColor: safeTheme.colors.primary + '40' }]} />
                  <View style={[styles.legendColor, { backgroundColor: safeTheme.colors.warning }]} />
                  <View style={[styles.legendColor, { backgroundColor: safeTheme.colors.error }]} />
                </View>
                <Text style={[styles.legendText, { color: safeTheme.colors.onSurfaceVariant }]}>More</Text>
              </View>
            </Surface>
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

        {/* Additional Stats */}
        <View style={styles.statsSection}>
          <Surface style={[styles.statCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <Ionicons name="calendar-outline" size={20} color={safeTheme.colors.primary} />
            <Text style={[styles.statLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Days with Spending</Text>
            <Text style={[styles.statValue, { color: safeTheme.colors.onSurface }]}>{insights.daysWithSpending}</Text>
          </Surface>

          <Surface style={[styles.statCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <Ionicons name="time-outline" size={20} color={safeTheme.colors.primary} />
            <Text style={[styles.statLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Most Active Day</Text>
            <Text style={[styles.statValue, { color: safeTheme.colors.onSurface }]} numberOfLines={1}>
              {insights.mostActiveDay}
            </Text>
          </Surface>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Day Details Modal */}
      <Modal
        visible={showDayModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.dayModalContent, { backgroundColor: safeTheme.colors.surface }]}>
            {selectedDay && (
              <>
                <View style={styles.dayModalHeader}>
                  <Text style={[styles.dayModalTitle, { color: safeTheme.colors.onSurface }]}>
                    {new Date(selectedDay.date).toLocaleDateString('default', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDayModal(false)}>
                    <Ionicons name="close" size={24} color={safeTheme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.dayModalStats}>
                  <View style={styles.dayModalStatItem}>
                    <Text style={[styles.dayModalStatLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Total Spent</Text>
                    <Text style={[styles.dayModalStatValue, { color: safeTheme.colors.onSurface }]}>
                      {formatCurrency(selectedDay.amount)}
                    </Text>
                  </View>
                  <View style={styles.dayModalStatItem}>
                    <Text style={[styles.dayModalStatLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Transactions</Text>
                    <Text style={[styles.dayModalStatValue, { color: safeTheme.colors.onSurface }]}>
                      {selectedDay.expenseCount}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.viewExpensesButton, { backgroundColor: safeTheme.colors.primary }]}
                  onPress={() => {
                    setShowDayModal(false);
                    // Navigate to expenses filtered by date
                    navigation.navigate('AllExpenses', { 
                      dateFilter: selectedDay.date 
                    });
                  }}
                >
                  <Text style={[styles.viewExpensesButtonText, { color: safeTheme.colors.onPrimary }]}>
                    View Expenses
                  </Text>
                </TouchableOpacity>
              </>
            )}
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
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  currentMonthButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  currentMonthText: {
    fontSize: 14,
    fontWeight: '600',
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
  heatmapContainer: {
    borderRadius: 16,
    padding: 16,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabel: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },
  heatmapDay: {
    width: DAY_BOX_SIZE,
    height: DAY_BOX_SIZE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heatmapDayNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  heatmapDayIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  legendText: {
    fontSize: 12,
  },
  legendColors: {
    flexDirection: 'row',
    gap: 4,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
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
    gap: 12,
    paddingHorizontal: 24,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
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
  bottomPadding: {
    height: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayModalContent: {
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
  },
  dayModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dayModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  dayModalStats: {
    gap: 16,
    marginBottom: 20,
  },
  dayModalStatItem: {
    gap: 4,
  },
  dayModalStatLabel: {
    fontSize: 12,
  },
  dayModalStatValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  viewExpensesButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewExpensesButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

