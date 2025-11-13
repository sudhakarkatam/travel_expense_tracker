import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  actionIcon?: string;
}

export default function EmptyState({
  icon = 'document-outline',
  title,
  subtitle,
  actionText,
  onActionPress,
  actionIcon = 'add',
}: EmptyStateProps) {
  const theme = useTheme();
  
  // Safe defaults for theme colors
  const safeTheme = {
    colors: {
      onSurfaceVariant: theme?.colors?.onSurfaceVariant || '#666666',
      onSurface: theme?.colors?.onSurface || '#333333',
      primary: theme?.colors?.primary || '#8b5cf6',
      onPrimary: theme?.colors?.onPrimary || '#FFFFFF',
    },
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={64} color={safeTheme.colors.onSurfaceVariant} />
      </View>
      
      <Text style={[styles.title, { color: safeTheme.colors.onSurface }]}>{title}</Text>
      
      {subtitle && (
        <Text style={[styles.subtitle, { color: safeTheme.colors.onSurfaceVariant }]}>{subtitle}</Text>
      )}
      
      {actionText && onActionPress && (
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: safeTheme.colors.primary }]} 
          onPress={onActionPress}
        >
          <Ionicons name={actionIcon as any} size={20} color={safeTheme.colors.onPrimary} />
          <Text style={[styles.actionText, { color: safeTheme.colors.onPrimary }]}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Predefined empty states for common scenarios
export function EmptyTripsState({ onAddTrip }: { onAddTrip?: () => void }) {
  return (
    <EmptyState
      icon="airplane-outline"
      title="No Trips Yet"
      subtitle="Start your journey by creating your first trip"
      actionText="Create Trip"
      onActionPress={onAddTrip}
      actionIcon="add"
    />
  );
}

export function EmptyExpensesState({ onAddExpense }: { onAddExpense?: () => void }) {
  return (
    <EmptyState
      icon="receipt-outline"
      title="No Expenses Yet"
      subtitle="Track your spending by adding your first expense"
      actionText="Add Expense"
      onActionPress={onAddExpense}
      actionIcon="add"
    />
  );
}

export function EmptySearchState({ query }: { query: string }) {
  return (
    <EmptyState
      icon="search-outline"
      title="No Results Found"
      subtitle={`No results found for "${query}"`}
    />
  );
}

export function EmptyHistoryState() {
  return (
    <EmptyState
      icon="time-outline"
      title="No History Yet"
      subtitle="Your activity history will appear here"
    />
  );
}

export function EmptyAnalyticsState() {
  return (
    <EmptyState
      icon="analytics-outline"
      title="No Analytics Data"
      subtitle="Start adding expenses to see your spending insights"
    />
  );
}

export function EmptySettlementsState() {
  return (
    <EmptyState
      icon="checkmark-circle-outline"
      title="All Settled Up!"
      subtitle="No outstanding balances to settle"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
