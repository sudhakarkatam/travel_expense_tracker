import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Surface, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import DatePickerInput from '@/components/DatePickerInput';
import { TripStatus } from '@/utils/tripStatus';
import { useApp } from '@/contexts/AppContext';
import { generateTripSummary } from '@/utils/tripSummary';
import { getTripStatus } from '@/utils/tripStatus';

interface TripFiltersScreenProps {
  navigation: any;
  route: any;
}

type SortOption =
  | 'default'
  | 'date-newest'
  | 'date-oldest'
  | 'budget-high'
  | 'budget-low'
  | 'spent-high'
  | 'spent-low';

export default function TripFiltersScreen({
  navigation,
  route,
}: TripFiltersScreenProps) {
  const theme = useTheme();
  const { trips, expenses } = useApp();

  // Get initial filter values from route params or defaults
  const initialFilters = route?.params?.filters || {
    status: 'all' as TripStatus | 'all',
    sortBy: 'default' as SortOption,
    destination: '',
    startDate: '',
    endDate: '',
    year: '',
  };

  const [statusFilter, setStatusFilter] = useState<TripStatus | 'all'>(
    initialFilters.status
  );
  const [sortBy, setSortBy] = useState<SortOption>(initialFilters.sortBy);
  const [destination, setDestination] = useState(initialFilters.destination);
  const [startDate, setStartDate] = useState(initialFilters.startDate);
  const [endDate, setEndDate] = useState(initialFilters.endDate);
  const [selectedYear, setSelectedYear] = useState(initialFilters.year);

  // Calculate available years from all trips
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    trips.forEach((trip) => {
      const startYear = new Date(trip.startDate).getFullYear();
      const endYear = new Date(trip.endDate).getFullYear();
      years.add(startYear);
      years.add(endYear);
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending
  }, [trips]);

  const handleReset = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setStatusFilter('all');
    setSortBy('default');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setSelectedYear('');
  };

  const handleApply = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // Pass filters back via route params and navigate back
    const parentNavigator = navigation.getParent();
    if (parentNavigator) {
      parentNavigator.navigate('MainTabs', {
        screen: 'Home',
        params: {
          filters: {
            status: statusFilter,
            sortBy,
            destination,
            startDate,
            endDate,
            year: selectedYear,
          },
        },
      });
    }
    navigation.goBack();
  };

  const safeTheme = {
    colors: {
      background: theme?.colors?.background || '#FFFFFF',
      surface: theme?.colors?.surface || '#FFFFFF',
      surfaceVariant: theme?.colors?.surfaceVariant || '#F5F5F5',
      onSurface: theme?.colors?.onSurface || '#000000',
      onSurfaceVariant: theme?.colors?.onSurfaceVariant || '#666666',
      primary: theme?.colors?.primary || '#8b5cf6',
      onPrimary: theme?.colors?.onPrimary || '#FFFFFF',
      primaryContainer: theme?.colors?.primaryContainer || '#EDE9FE',
      onPrimaryContainer: theme?.colors?.onPrimaryContainer || '#000000',
      outline: theme?.colors?.outline || '#E5E5E5',
      outlineVariant: theme?.colors?.outlineVariant || '#E5E5E5',
    },
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: safeTheme.colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <Surface
        style={[styles.header, { backgroundColor: safeTheme.colors.surface }]}
        elevation={1}
      >
        <TouchableOpacity
          onPress={() => {
            navigation.goBack();
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={safeTheme.colors.onSurface}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: safeTheme.colors.onSurface }]}>
          Filters
        </Text>
        <TouchableOpacity
          onPress={handleApply}
          style={styles.applyButton}
        >
          <Text
            style={[
              styles.applyButtonText,
              { color: safeTheme.colors.primary },
            ]}
          >
            Apply
          </Text>
        </TouchableOpacity>
      </Surface>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trip Status Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: safeTheme.colors.onSurface },
            ]}
          >
            Trip Status
          </Text>
          <View style={styles.pillContainer}>
            {(['all', 'active', 'upcoming', 'completed'] as const).map(
              (status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => {
                    setStatusFilter(status);
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={[
                    styles.pill,
                    statusFilter === status && {
                      backgroundColor: safeTheme.colors.primary,
                    },
                    statusFilter !== status && {
                      backgroundColor: safeTheme.colors.surfaceVariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      {
                        color:
                          statusFilter === status
                            ? safeTheme.colors.onPrimary
                            : safeTheme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        {/* Sort By Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: safeTheme.colors.onSurface },
            ]}
          >
            Sort By
          </Text>
          <View style={styles.sortGrid}>
            {(
              [
                { value: 'default', label: 'Default (Active → Upcoming → Completed)' },
                { value: 'date-newest', label: 'Date (newest)' },
                { value: 'date-oldest', label: 'Date (oldest)' },
                { value: 'budget-high', label: 'Budget (high → low)' },
                { value: 'budget-low', label: 'Budget (low → high)' },
                { value: 'spent-high', label: 'Spent % (high → low)' },
                { value: 'spent-low', label: 'Spent % (low → high)' },
              ] as { value: SortOption; label: string }[]
            ).map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setSortBy(option.value);
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={[
                  styles.radioButton,
                  {
                    backgroundColor:
                      sortBy === option.value
                        ? safeTheme.colors.primaryContainer
                        : safeTheme.colors.surface,
                    borderColor:
                      sortBy === option.value
                        ? safeTheme.colors.primary
                        : safeTheme.colors.outline,
                  },
                ]}
              >
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor:
                        sortBy === option.value
                          ? safeTheme.colors.primary
                          : safeTheme.colors.outlineVariant,
                    },
                  ]}
                >
                  {sortBy === option.value && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: safeTheme.colors.primary },
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.radioLabel,
                    {
                      color:
                        sortBy === option.value
                          ? safeTheme.colors.onPrimaryContainer
                          : safeTheme.colors.onSurface,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Destination Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: safeTheme.colors.onSurface },
            ]}
          >
            Destination
          </Text>
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: safeTheme.colors.surfaceVariant,
                borderColor: safeTheme.colors.outline,
              },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={safeTheme.colors.onSurfaceVariant}
              style={styles.searchIcon}
            />
            <TextInput
              style={[
                styles.searchInput,
                { color: safeTheme.colors.onSurface },
              ]}
              placeholder="Search destination..."
              placeholderTextColor={safeTheme.colors.onSurfaceVariant}
              value={destination}
              onChangeText={setDestination}
            />
            {destination.length > 0 && (
              <TouchableOpacity
                onPress={() => setDestination('')}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={safeTheme.colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Date Range Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: safeTheme.colors.onSurface },
            ]}
          >
            Date Range
          </Text>
          <View style={styles.dateRow}>
            <View style={styles.dateInputContainer}>
              <Text
                style={[
                  styles.dateLabel,
                  { color: safeTheme.colors.onSurfaceVariant },
                ]}
              >
                Start Date
              </Text>
              <DatePickerInput
                value={startDate}
                onChange={setStartDate}
                placeholder="Select start date"
              />
            </View>
            <View style={styles.dateInputContainer}>
              <Text
                style={[
                  styles.dateLabel,
                  { color: safeTheme.colors.onSurfaceVariant },
                ]}
              >
                End Date
              </Text>
              <DatePickerInput
                value={endDate}
                onChange={setEndDate}
                placeholder="Select end date"
                minimumDate={startDate ? new Date(startDate) : undefined}
              />
            </View>
          </View>
        </View>

        {/* Year Selection Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: safeTheme.colors.onSurface },
            ]}
          >
            Year
          </Text>
          <View style={styles.yearContainer}>
            {availableYears.map((year) => (
              <TouchableOpacity
                key={year}
                onPress={() => {
                  setSelectedYear(
                    selectedYear === year.toString() ? '' : year.toString()
                  );
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={[
                  styles.yearPill,
                  selectedYear === year.toString() && {
                    backgroundColor: safeTheme.colors.primary,
                  },
                  selectedYear !== year.toString() && {
                    backgroundColor: safeTheme.colors.surfaceVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.yearPillText,
                    {
                      color:
                        selectedYear === year.toString()
                          ? safeTheme.colors.onPrimary
                          : safeTheme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
            {selectedYear && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedYear('');
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={[
                  styles.yearPill,
                  { backgroundColor: safeTheme.colors.surfaceVariant },
                ]}
              >
                <Text
                  style={[
                    styles.yearPillText,
                    { color: safeTheme.colors.onSurfaceVariant },
                  ]}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Apply Button (Fixed at Bottom) */}
      <Surface
        style={[
          styles.bottomButtonContainer,
          { backgroundColor: safeTheme.colors.surface },
        ]}
        elevation={4}
      >
        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={handleReset}
            style={[styles.resetButton, { borderColor: safeTheme.colors.outline }]}
            contentStyle={styles.resetButtonContent}
            labelStyle={[styles.resetButtonText, { color: safeTheme.colors.onSurface }]}
          >
            Reset
          </Button>
          <Button
            mode="contained"
            onPress={handleApply}
            style={[
              styles.applyButtonBottom,
              { backgroundColor: safeTheme.colors.primary },
            ]}
            contentStyle={styles.applyButtonContent}
            labelStyle={{ color: safeTheme.colors.onPrimary }}
          >
            Apply Filters
          </Button>
        </View>
      </Surface>
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
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  applyButton: {
    padding: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sortGrid: {
    gap: 12,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  yearContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  yearPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
  bottomButtonContainer: {
    padding: 16,
    paddingBottom: Platform.select({ ios: 34, android: 16 }),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 4,
  },
  resetButtonContent: {
    paddingVertical: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButtonBottom: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 4,
  },
  applyButtonContent: {
    paddingVertical: 8,
  },
});

