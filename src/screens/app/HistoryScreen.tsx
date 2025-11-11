import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

export default function HistoryScreen({ navigation }: any) {
  const { trips = [], expenses = [], settlements = [], auditLogs = [] } = useApp();
  const [activeTab, setActiveTab] = useState<'timeline' | 'audit'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'trip' | 'settlement'>('all');

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

  const filteredTimelineItems = useMemo(() => {
    let filtered = timelineItems;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
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
  }, [timelineItems, filterType, searchQuery]);

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
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'expense', 'trip', 'settlement'] as const).map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterButton,
                  filterType === type && styles.activeFilterButton,
                ]}
                onPress={() => setFilterType(type)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterType === type && styles.activeFilterButtonText,
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.content}>
        {activeTab === 'timeline' ? (
          filteredTimelineItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No History Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search or filters' : 'Your activity history will appear here'}
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
    marginBottom: 16,
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
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterButtonText: {
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
});
