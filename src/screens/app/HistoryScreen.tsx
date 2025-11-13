import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Surface } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApp } from '@/contexts/AppContext';
import { formatDateTime } from '@/utils/dateFormatter';
import { formatCurrency } from '@/utils/currencyFormatter';

interface TimelineItem {
  id: string;
  type: 'expense' | 'trip' | 'settlement';
  title: string;
  description: string;
  amount?: number;
  date: string;
  tripName?: string;
  icon: string;
  color: string;
}

type ViewMode = 'timeline' | 'calendar';
type PresetFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

export default function HistoryScreen({ navigation }: any) {
  const theme = useTheme();
  const { trips = [], expenses = [], settlements = [], auditLogs = [] } = useApp();
  const [activeTab, setActiveTab] = useState<'timeline' | 'audit'>('timeline');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<'expense' | 'trip' | 'settlement'>>(new Set(['expense', 'trip', 'settlement']));
  const [presetFilter, setPresetFilter] = useState<PresetFilter>('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add expenses
    expenses.forEach(expense => {
      const trip = trips.find(t => t.id === expense.tripId);
      items.push({
        id: expense.id,
        type: 'expense',
        title: expense.description,
        description: `${expense.category} • ${trip?.name || 'Unknown Trip'}`,
        amount: expense.amount,
        date: expense.createdAt,
        tripName: trip?.name,
        icon: 'receipt',
        color: theme.colors.primary,
      });
    });

    // Add trips
    trips.forEach(trip => {
      items.push({
        id: trip.id,
        type: 'trip',
        title: trip.name,
        description: `${trip.destination} • Budget: $${trip.budget}`,
        date: trip.createdAt,
        tripName: trip.name,
        icon: 'airplane',
        color: theme.colors.info,
      });
    });

    // Add settlements
    settlements.forEach(settlement => {
      const trip = trips.find(t => t.id === settlement.tripId);
      items.push({
        id: settlement.id,
        type: 'settlement',
        title: 'Payment Settled',
        description: `${settlement.from} paid ${settlement.to} • ${trip?.name || 'Unknown Trip'}`,
        amount: settlement.amount,
        date: settlement.settledAt,
        tripName: trip?.name,
        icon: 'checkmark-circle',
        color: theme.colors.success,
      });
    });

    // Sort by date (newest first)
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trips, expenses, settlements, theme]);

  const applyPresetFilter = (preset: PresetFilter) => {
    const now = new Date();
    setPresetFilter(preset);

    switch (preset) {
      case 'today':
        setStartDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
        setEndDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59));
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        setStartDate(weekStart);
        setEndDate(now);
        break;
      case 'month':
        setStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
        setEndDate(now);
        break;
      case 'year':
        setStartDate(new Date(now.getFullYear(), 0, 1));
        setEndDate(now);
        break;
      case 'all':
      default:
        setStartDate(null);
        setEndDate(null);
        break;
    }
  };

  const filteredTimelineItems = useMemo(() => {
    let filtered = timelineItems;

    // Filter by selected types
    if (selectedTypes.size > 0 && selectedTypes.size < 3) {
      filtered = filtered.filter(item => selectedTypes.has(item.type));
    }

    // Filter by date range
    if (startDate || endDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date);
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        return true;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tripName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [timelineItems, selectedTypes, startDate, endDate, searchQuery]);

  // Group items by date for calendar view
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, TimelineItem[]> = {};
    filteredTimelineItems.forEach(item => {
      const dateKey = new Date(item.date).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });
    return grouped;
  }, [filteredTimelineItems]);

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const getItemsForDate = (date: Date) => {
    const dateKey = date.toDateString();
    return itemsByDate[dateKey] || [];
  };

  const toggleTypeFilter = (type: 'expense' | 'trip' | 'settlement') => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedTypes(newSelected);
  };

  const groupedAuditLogs = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    auditLogs.forEach(log => {
      const date = new Date(log.timestamp).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(log);
    });

    // Sort logs within each day by timestamp
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });

    return grouped;
  }, [auditLogs]);

  const getAuditLogDescription = (log: any) => {
    switch (log.action) {
      case 'created':
        return `Created ${log.entityType} "${log.changes.name || log.changes.description || 'Unknown'}"`;
      case 'updated':
        const changes = Object.keys(log.changes).join(', ');
        return `Updated ${log.entityType} (${changes})`;
      case 'deleted':
        return `Deleted ${log.entityType} "${log.changes.name || 'Unknown'}"`;
      default:
        return `${log.action} ${log.entityType}`;
    }
  };

  const getAuditLogIcon = (log: any) => {
    switch (log.action) {
      case 'created':
        return 'add-circle';
      case 'updated':
        return 'pencil';
      case 'deleted':
        return 'trash';
      default:
        return 'information-circle';
    }
  };

  const handleTimelineItemPress = (item: TimelineItem) => {
    if (item.type === 'expense') {
      const expense = expenses.find(e => e.id === item.id);
      if (expense) {
        navigation.navigate('ExpenseDetail', {
          expenseId: item.id,
          tripId: expense.tripId,
        });
      }
    } else if (item.type === 'trip') {
      navigation.navigate('TripDetail', { tripId: item.id });
    } else if (item.type === 'settlement') {
      const settlement = settlements.find(s => s.id === item.id);
      if (settlement) {
        navigation.navigate('SettleUp', { tripId: settlement.tripId });
      }
    }
  };

  const renderTimelineItem = ({ item }: { item: TimelineItem }) => (
    <Surface
      style={[styles.timelineItem, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}
      elevation={1}
    >
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
        onPress={() => handleTimelineItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.timelineIcon, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon as any} size={20} color={theme.colors.onPrimary} />
        </View>
        
        <View style={styles.timelineContent}>
          <View style={styles.timelineHeader}>
            <Text style={[styles.timelineTitle, { color: theme.colors.onSurface }]}>{item.title}</Text>
            {item.amount && (
              <Text style={[styles.timelineAmount, { color: theme.colors.primary }]}>
                {formatCurrency(item.amount, { currency: 'USD' })}
              </Text>
            )}
          </View>
          
          <Text style={[styles.timelineDescription, { color: theme.colors.onSurfaceVariant }]}>{item.description}</Text>
          
          <View style={styles.timelineFooter}>
            <Text style={[styles.timelineDate, { color: theme.colors.onSurfaceVariant }]}>
              {formatDateTime(item.date)}
            </Text>
            {item.tripName && (
              <View style={[styles.tripTag, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={[styles.tripTagText, { color: theme.colors.onSurfaceVariant }]}>{item.tripName}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
      </TouchableOpacity>
    </Surface>
  );

  const renderCalendarView = () => {
    const days = getDaysInMonth(selectedMonth);
    const monthName = selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
      <ScrollView style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() => {
              const prevMonth = new Date(selectedMonth);
              prevMonth.setMonth(prevMonth.getMonth() - 1);
              setSelectedMonth(prevMonth);
            }}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.calendarMonthName, { color: theme.colors.onSurface }]}>{monthName}</Text>
          <TouchableOpacity
            onPress={() => {
              const nextMonth = new Date(selectedMonth);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              setSelectedMonth(nextMonth);
            }}
          >
            <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarGrid}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <View key={day} style={styles.calendarDayHeader}>
              <Text style={[styles.calendarDayHeaderText, { color: theme.colors.onSurfaceVariant }]}>{day}</Text>
            </View>
          ))}

          {days.map((date, index) => {
            if (!date) {
              return <View key={`empty-${index}`} style={styles.calendarDay} />;
            }

            const itemsForDate = getItemsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <TouchableOpacity
                key={date.toISOString()}
                style={[styles.calendarDay, isToday && [styles.calendarDayToday, { backgroundColor: theme.colors.surfaceVariant }]]}
                onPress={() => {
                  if (itemsForDate.length > 0) {
                    setViewMode('timeline');
                    setStartDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
                    setEndDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59));
                    setPresetFilter('custom');
                  }
                }}
              >
                <Text style={[styles.calendarDayNumber, { color: theme.colors.onSurface }, isToday && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                  {date.getDate()}
                </Text>
                {itemsForDate.length > 0 && (
                  <View style={styles.calendarDayIndicator}>
                    <View style={[styles.calendarDot, { backgroundColor: itemsForDate[0].color }]} />
                    {itemsForDate.length > 1 && (
                      <Text style={[styles.calendarDayCount, { color: theme.colors.onSurfaceVariant }]}>+{itemsForDate.length - 1}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {Object.keys(itemsByDate).length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No Activity This Month</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>Try selecting a different month or adjusting filters</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderAuditLogSection = (date: string, logs: any[]) => (
    <View key={date} style={styles.auditSection}>
      <Text style={[styles.auditDateHeader, { color: theme.colors.onSurface, borderBottomColor: theme.colors.outlineVariant }]}>{date}</Text>
      {logs.map(log => (
        <View key={log.id} style={styles.auditLogItem}>
          <View style={styles.auditLogIcon}>
            <Ionicons name={getAuditLogIcon(log) as any} size={16} color={theme.colors.onSurfaceVariant} />
          </View>
          
          <View style={styles.auditLogContent}>
            <Text style={[styles.auditLogDescription, { color: theme.colors.onSurface }]}>
              {getAuditLogDescription(log)}
            </Text>
            <Text style={[styles.auditLogTime, { color: theme.colors.onSurfaceVariant }]}>
              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]} elevation={1}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>History</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AllExpenses', { tripId: null })}
          style={styles.showAllButton}
        >
          <Text style={[styles.showAllButtonText, { color: theme.colors.primary }]}>Show All</Text>
        </TouchableOpacity>
      </Surface>

      <View style={[styles.searchContainer, { borderBottomColor: theme.colors.outlineVariant }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
          <Ionicons name="search-outline" size={20} color={theme.colors.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.onSurface }]}
            placeholder="Search history..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Surface style={[styles.tabContainer, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'timeline' && [styles.activeTab, { backgroundColor: theme.colors.surface }]]}
          onPress={() => setActiveTab('timeline')}
        >
          <Text style={[styles.tabText, { color: theme.colors.onSurfaceVariant }, activeTab === 'timeline' && { color: theme.colors.primary }]}>
            Timeline
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'audit' && [styles.activeTab, { backgroundColor: theme.colors.surface }]]}
          onPress={() => setActiveTab('audit')}
        >
          <Text style={[styles.tabText, { color: theme.colors.onSurfaceVariant }, activeTab === 'audit' && { color: theme.colors.primary }]}>
            Audit Log
          </Text>
        </TouchableOpacity>
      </Surface>

      {activeTab === 'timeline' && (
        <>
          {/* Preset Filters */}
          <View style={styles.presetFilterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['all', 'today', 'week', 'month', 'year', 'custom'] as PresetFilter[]).map(preset => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetFilterButton,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
                    presetFilter === preset && [styles.activePresetFilterButton, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }],
                  ]}
                  onPress={() => {
                    if (preset === 'custom') {
                      setShowFilterModal(true);
                    } else {
                      applyPresetFilter(preset);
                    }
                  }}
                >
                  <Text style={[
                    styles.presetFilterText,
                    { color: theme.colors.onSurfaceVariant },
                    presetFilter === preset && { color: theme.colors.onPrimary },
                  ]}>
                    {preset === 'all' ? 'All Time' :
                     preset === 'today' ? 'Today' :
                     preset === 'week' ? 'This Week' :
                     preset === 'month' ? 'This Month' :
                     preset === 'year' ? 'This Year' : 'Custom'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* View Mode Toggle */}
          <Surface style={[styles.viewModeContainer, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'timeline' && [styles.activeViewModeButton, { backgroundColor: theme.colors.primary }]]}
              onPress={() => setViewMode('timeline')}
            >
              <Ionicons name="list" size={18} color={viewMode === 'timeline' ? theme.colors.onPrimary : theme.colors.primary} />
              <Text style={[styles.viewModeText, { color: theme.colors.primary }, viewMode === 'timeline' && { color: theme.colors.onPrimary }]}>
                List
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'calendar' && [styles.activeViewModeButton, { backgroundColor: theme.colors.primary }]]}
              onPress={() => setViewMode('calendar')}
            >
              <Ionicons name="calendar" size={18} color={viewMode === 'calendar' ? theme.colors.onPrimary : theme.colors.primary} />
              <Text style={[styles.viewModeText, { color: theme.colors.primary }, viewMode === 'calendar' && { color: theme.colors.onPrimary }]}>
                Calendar
              </Text>
            </TouchableOpacity>
          </Surface>

          {/* Multi-select Type Filters */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['expense', 'trip', 'settlement'] as const).map(type => {
                const isSelected = selectedTypes.has(type);
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.multiSelectFilterButton,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
                      isSelected && [styles.activeMultiSelectFilterButton, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }],
                    ]}
                    onPress={() => toggleTypeFilter(type)}
                  >
                    {isSelected && <Ionicons name="checkmark-circle" size={16} color={theme.colors.onPrimary} style={{ marginRight: 4 }} />}
                    <Text style={[
                      styles.multiSelectFilterText,
                      { color: theme.colors.onSurfaceVariant },
                      isSelected && { color: theme.colors.onPrimary },
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}s
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}

      <View style={styles.content}>
        {activeTab === 'timeline' ? (
          viewMode === 'calendar' ? (
            renderCalendarView()
          ) : filteredTimelineItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No History Found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {searchQuery || presetFilter !== 'all' ? 'Try adjusting your search or filters' : 'Your activity history will appear here'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredTimelineItems}
              renderItem={renderTimelineItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.timelineListContent}
            />
          )
        ) : (
          Object.keys(groupedAuditLogs).length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No Audit Logs</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>Activity logs will appear here</Text>
            </View>
          ) : (
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.auditLogContent}
            >
              {Object.entries(groupedAuditLogs).map(([date, logs]) => 
                renderAuditLogSection(date, logs)
              )}
            </ScrollView>
          )
        )}
      </View>

      {/* Date Range Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} elevation={8}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Custom Date Range</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContainer}>
              <Text style={[styles.datePickerLabel, { color: theme.colors.onSurface }]}>Start Date</Text>
              <TouchableOpacity
                style={[styles.datePickerButton, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={[styles.datePickerText, { color: theme.colors.onSurface }]}>
                  {startDate ? startDate.toLocaleDateString() : 'Select start date'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowStartDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setStartDate(selectedDate);
                      setPresetFilter('custom');
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.datePickerContainer}>
              <Text style={[styles.datePickerLabel, { color: theme.colors.onSurface }]}>End Date</Text>
              <TouchableOpacity
                style={[styles.datePickerButton, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={[styles.datePickerText, { color: theme.colors.onSurface }]}>
                  {endDate ? endDate.toLocaleDateString() : 'Select end date'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowEndDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setEndDate(selectedDate);
                      setPresetFilter('custom');
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.clearDateButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
                onPress={() => {
                  setStartDate(null);
                  setEndDate(null);
                  setPresetFilter('all');
                }}
              >
                <Text style={[styles.clearDateText, { color: theme.colors.onSurfaceVariant }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyDateButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={[styles.applyDateText, { color: theme.colors.onPrimary }]}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Surface>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  showAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  showAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    // Color applied inline
  },
  presetFilterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  presetFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  activePresetFilterButton: {
    // Colors applied inline
  },
  presetFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activePresetFilterText: {
    // Color applied inline
  },
  viewModeContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  activeViewModeButton: {
    // Colors applied inline
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeViewModeText: {
    // Color applied inline
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  multiSelectFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  activeMultiSelectFilterButton: {
    // Colors applied inline
  },
  multiSelectFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeMultiSelectFilterText: {
    // Color applied inline
  },
  content: {
    flex: 1,
    paddingHorizontal: 0,
  },
  timelineListContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  auditLogContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    marginHorizontal: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timelineAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timelineDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  timelineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineDate: {
    fontSize: 12,
  },
  tripTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tripTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  calendarContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  calendarMonthName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  calendarDayHeader: {
    width: '14.28%',
    paddingVertical: 8,
    alignItems: 'center',
  },
  calendarDayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  calendarDayToday: {
    borderRadius: 8,
  },
  calendarDayNumber: {
    fontSize: 14,
  },
  calendarDayNumberToday: {
    // Colors applied inline
  },
  calendarDayIndicator: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  calendarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  calendarDayCount: {
    fontSize: 8,
    fontWeight: '600',
  },
  auditSection: {
    marginBottom: 24,
  },
  auditDateHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  auditLogItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingLeft: 16,
  },
  auditLogIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  auditLogContent: {
    flex: 1,
  },
  auditLogDescription: {
    fontSize: 14,
    marginBottom: 2,
  },
  auditLogTime: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  datePickerContainer: {
    marginBottom: 20,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  datePickerText: {
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearDateButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearDateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyDateButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyDateText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
