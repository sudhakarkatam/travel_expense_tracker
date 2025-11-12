import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
        color: '#8b5cf6',
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
        color: '#3b82f6',
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
        color: '#22c55e',
      });
    });

    // Sort by date (newest first)
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trips, expenses, settlements]);

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
    <TouchableOpacity
      style={styles.timelineItem}
      onPress={() => handleTimelineItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.timelineIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={20} color="white" />
      </View>
      
      <View style={styles.timelineContent}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>{item.title}</Text>
          {item.amount && (
            <Text style={styles.timelineAmount}>
              {formatCurrency(item.amount, { currency: 'USD' })}
            </Text>
          )}
        </View>
        
        <Text style={styles.timelineDescription}>{item.description}</Text>
        
        <View style={styles.timelineFooter}>
          <Text style={styles.timelineDate}>
            {formatDateTime(item.date)}
          </Text>
          {item.tripName && (
            <View style={styles.tripTag}>
              <Text style={styles.tripTagText}>{item.tripName}</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
    </TouchableOpacity>
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
            <Ionicons name="chevron-back" size={24} color="#8b5cf6" />
          </TouchableOpacity>
          <Text style={styles.calendarMonthName}>{monthName}</Text>
          <TouchableOpacity
            onPress={() => {
              const nextMonth = new Date(selectedMonth);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              setSelectedMonth(nextMonth);
            }}
          >
            <Ionicons name="chevron-forward" size={24} color="#8b5cf6" />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarGrid}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <View key={day} style={styles.calendarDayHeader}>
              <Text style={styles.calendarDayHeaderText}>{day}</Text>
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
                style={[styles.calendarDay, isToday && styles.calendarDayToday]}
                onPress={() => {
                  if (itemsForDate.length > 0) {
                    setViewMode('timeline');
                    setStartDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
                    setEndDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59));
                    setPresetFilter('custom');
                  }
                }}
              >
                <Text style={[styles.calendarDayNumber, isToday && styles.calendarDayNumberToday]}>
                  {date.getDate()}
                </Text>
                {itemsForDate.length > 0 && (
                  <View style={styles.calendarDayIndicator}>
                    <View style={[styles.calendarDot, { backgroundColor: itemsForDate[0].color }]} />
                    {itemsForDate.length > 1 && (
                      <Text style={styles.calendarDayCount}>+{itemsForDate.length - 1}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {Object.keys(itemsByDate).length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Activity This Month</Text>
            <Text style={styles.emptySubtitle}>Try selecting a different month or adjusting filters</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderAuditLogSection = (date: string, logs: any[]) => (
    <View key={date} style={styles.auditSection}>
      <Text style={styles.auditDateHeader}>{date}</Text>
      {logs.map(log => (
        <View key={log.id} style={styles.auditLogItem}>
          <View style={styles.auditLogIcon}>
            <Ionicons name={getAuditLogIcon(log) as any} size={16} color="#666" />
          </View>
          
          <View style={styles.auditLogContent}>
            <Text style={styles.auditLogDescription}>
              {getAuditLogDescription(log)}
            </Text>
            <Text style={styles.auditLogTime}>
              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AllExpenses', { tripId: null })}
          style={styles.showAllButton}
        >
          <Text style={styles.showAllButtonText}>Show All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search history..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'timeline' && styles.activeTab]}
          onPress={() => setActiveTab('timeline')}
        >
          <Text style={[styles.tabText, activeTab === 'timeline' && styles.activeTabText]}>
            Timeline
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'audit' && styles.activeTab]}
          onPress={() => setActiveTab('audit')}
        >
          <Text style={[styles.tabText, activeTab === 'audit' && styles.activeTabText]}>
            Audit Log
          </Text>
        </TouchableOpacity>
      </View>

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
                    presetFilter === preset && styles.activePresetFilterButton,
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
                    presetFilter === preset && styles.activePresetFilterText,
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
          <View style={styles.viewModeContainer}>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'timeline' && styles.activeViewModeButton]}
              onPress={() => setViewMode('timeline')}
            >
              <Ionicons name="list" size={18} color={viewMode === 'timeline' ? '#fff' : '#8b5cf6'} />
              <Text style={[styles.viewModeText, viewMode === 'timeline' && styles.activeViewModeText]}>
                List
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'calendar' && styles.activeViewModeButton]}
              onPress={() => setViewMode('calendar')}
            >
              <Ionicons name="calendar" size={18} color={viewMode === 'calendar' ? '#fff' : '#8b5cf6'} />
              <Text style={[styles.viewModeText, viewMode === 'calendar' && styles.activeViewModeText]}>
                Calendar
              </Text>
            </TouchableOpacity>
          </View>

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
                      isSelected && styles.activeMultiSelectFilterButton,
                    ]}
                    onPress={() => toggleTypeFilter(type)}
                  >
                    {isSelected && <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 4 }} />}
                    <Text style={[
                      styles.multiSelectFilterText,
                      isSelected && styles.activeMultiSelectFilterText,
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
              <Ionicons name="time-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No History Found</Text>
              <Text style={styles.emptySubtitle}>
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
              <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No Audit Logs</Text>
              <Text style={styles.emptySubtitle}>Activity logs will appear here</Text>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Date Range</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContainer}>
              <Text style={styles.datePickerLabel}>Start Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {startDate ? startDate.toLocaleDateString() : 'Select start date'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
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
              <Text style={styles.datePickerLabel}>End Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {endDate ? endDate.toLocaleDateString() : 'Select end date'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
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
                style={styles.clearDateButton}
                onPress={() => {
                  setStartDate(null);
                  setEndDate(null);
                  setPresetFilter('all');
                }}
              >
                <Text style={styles.clearDateText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyDateButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyDateText}>Apply</Text>
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F2F2F7',
  },
  showAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
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
    color: '#000000',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
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
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#8b5cf6',
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
    borderColor: '#d1d5db',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  activePresetFilterButton: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  presetFilterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activePresetFilterText: {
    color: 'white',
  },
  viewModeContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#f3f4f6',
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
    backgroundColor: '#8b5cf6',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8b5cf6',
  },
  activeViewModeText: {
    color: '#fff',
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
    borderColor: '#d1d5db',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  activeMultiSelectFilterButton: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  multiSelectFilterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeMultiSelectFilterText: {
    color: 'white',
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
    borderBottomColor: '#F2F2F7',
    backgroundColor: '#FFFFFF',
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
    color: '#333',
    flex: 1,
  },
  timelineAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  timelineDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timelineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineDate: {
    fontSize: 12,
    color: '#999',
  },
  tripTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tripTagText: {
    fontSize: 12,
    color: '#666',
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
    color: '#333',
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
    color: '#666',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  calendarDayToday: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  calendarDayNumber: {
    fontSize: 14,
    color: '#333',
  },
  calendarDayNumberToday: {
    fontWeight: 'bold',
    color: '#8b5cf6',
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
    color: '#666',
    fontWeight: '600',
  },
  auditSection: {
    marginBottom: 24,
  },
  auditDateHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
    color: '#333',
    marginBottom: 2,
  },
  auditLogTime: {
    fontSize: 12,
    color: '#999',
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
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  datePickerContainer: {
    marginBottom: 20,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
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
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  clearDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyDateButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
  },
  applyDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
