import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SectionList,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Surface, Chip, IconButton } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useThemeMode } from "@/contexts/ThemeContext";
import { useApp } from "@/contexts/AppContext";
import EmptyState from "@/components/EmptyState";
import { MotiView } from "moti";
import { Expense } from "@/types";
import { formatDateTime, formatRelativeDateTime } from "@/utils/dateFormatter";
import { formatCurrency } from "@/utils/currencyFormatter";

export default function AllExpensesScreen({ navigation, route }: { navigation: any, route: any }) {
  const theme = useTheme();
  const { isDark } = useThemeMode();
  const { expenses, categories, trips, user } = useApp();
  const tripId = route.params?.tripId;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);

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
      outline: theme?.colors?.outline || (isDark ? '#4b5563' : '#E5E7EB'),
      outlineVariant: theme?.colors?.outlineVariant || (isDark ? '#374151' : '#E5E7EB'),
      secondaryContainer: theme?.colors?.secondaryContainer || '#f3f4f6',
      onSecondaryContainer: theme?.colors?.onSecondaryContainer || '#1f2937',
    },
  };

  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    // Strict filtering by tripId if provided
    if (tripId) {
      filtered = filtered.filter(e => e.tripId === tripId);
    }

    return filtered
      .filter((expense) => {
        const matchesSearch = expense.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory
          ? expense.category === selectedCategory
          : true;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === "date") {
          return sortOrder === "asc"
            ? new Date(a.date).getTime() - new Date(b.date).getTime()
            : new Date(b.date).getTime() - new Date(a.date).getTime();
        } else {
          return sortOrder === "asc"
            ? a.amount - b.amount
            : b.amount - a.amount;
        }
      });
  }, [expenses, searchQuery, selectedCategory, sortBy, sortOrder, tripId]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filteredExpenses.forEach((expense) => {
      const dateObj = new Date(expense.date);
      const dateKey = dateObj.toDateString();

      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(expense);
    });

    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    return Object.entries(groups)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()) // Sort groups by date descending
      .map(([date, items]) => {
        let title = date;
        if (date === today) title = "Today";
        else if (date === yesterdayStr) title = "Yesterday";
        else {
          title = new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
        }

        return { title, data: items };
      });
  }, [filteredExpenses]);

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId) || categories.find(c => c.name.toLowerCase() === categoryId.toLowerCase());
    return category?.color || safeTheme.colors.primary;
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId) || categories.find(c => c.name.toLowerCase() === categoryId.toLowerCase());
    return category?.icon || "tag";
  };

  const getTripName = (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId);
    return trip?.name || "Unknown Trip";
  };

  const renderExpenseItem = ({ item, index }: { item: Expense; index: number }) => {
    const trip = trips.find(t => t.id === item.tripId);
    const currentUserParticipant = trip?.participants.find(p => p.isCurrentUser);
    const currentUserIdInTrip = currentUserParticipant?.id || user?.id;
    const isPayer = item.paidBy === currentUserIdInTrip;

    return (
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300, delay: index * 50 } as any}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('ExpenseDetail', { expenseId: item.id, tripId: item.tripId })}
          activeOpacity={0.7}
        >
          <Surface style={[styles.expenseCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <View style={[styles.iconContainer, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
              <Ionicons name={getCategoryIcon(item.category) as any} size={24} color={getCategoryColor(item.category)} />
            </View>

            <View style={styles.expenseDetails}>
              <Text style={[styles.expenseDescription, { color: safeTheme.colors.onSurface }]} numberOfLines={1}>
                {item.description}
              </Text>
              <View style={styles.metaContainer}>
                <Text style={[styles.expenseMeta, { color: safeTheme.colors.onSurfaceVariant }]}>
                  {formatDateTime(item.createdAt || item.date, { includeTime: true, timeFormat: '12h' })}
                </Text>
                {!tripId && (
                  <>
                    <Text style={[styles.dotSeparator, { color: safeTheme.colors.onSurfaceVariant }]}>•</Text>
                    <Text style={[styles.expenseMeta, { color: safeTheme.colors.onSurfaceVariant }]}>
                      {getTripName(item.tripId)}
                    </Text>
                  </>
                )}
              </View>
              <Text style={[styles.payerText, { color: safeTheme.colors.onSurfaceVariant }]}>
                {isPayer ? "You paid" : "Someone else paid"}
              </Text>
            </View>

            <View style={styles.amountContainer}>
              <Text style={[styles.expenseAmount, { color: safeTheme.colors.onSurface }]}>
                {formatCurrency(item.amount)}
              </Text>
              {item.receiptImages && item.receiptImages.length > 0 && (
                <Ionicons name="attach" size={16} color={safeTheme.colors.onSurfaceVariant} style={styles.attachIcon} />
              )}
            </View>
          </Surface>
        </TouchableOpacity>
      </MotiView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={safeTheme.colors.background} />

      <Surface style={[styles.header, { backgroundColor: safeTheme.colors.surface }]} elevation={2}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={safeTheme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: safeTheme.colors.onSurface }]}>
            {tripId ? "Trip Expenses" : "All Expenses"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: safeTheme.colors.surfaceVariant }]}>
          <Ionicons name="search" size={20} color={safeTheme.colors.onSurfaceVariant} />
          <TextInput
            style={[styles.searchInput, { color: safeTheme.colors.onSurface }]}
            placeholder="Search expenses..."
            placeholderTextColor={safeTheme.colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={safeTheme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Toggle */}
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={[styles.filterToggleText, { color: safeTheme.colors.primary }]}>
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Text>
          <Ionicons name={showFilters ? "chevron-up" : "funnel"} size={16} color={safeTheme.colors.primary} />
        </TouchableOpacity>

        {/* Filters Section */}
        {showFilters && (
          <MotiView from={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ type: 'timing', duration: 300 } as any}>
            <View style={styles.filtersSection}>
              <Text style={[styles.filterLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Sort By</Text>
              <View style={styles.sortRow}>
                <Chip
                  selected={sortBy === "date"}
                  onPress={() => {
                    if (sortBy === "date") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else setSortBy("date");
                  }}
                  style={styles.chip}
                  showSelectedOverlay
                  mode="outlined"
                >
                  Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                </Chip>
                <Chip
                  selected={sortBy === "amount"}
                  onPress={() => {
                    if (sortBy === "amount") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else setSortBy("amount");
                  }}
                  style={styles.chip}
                  showSelectedOverlay
                  mode="outlined"
                >
                  Amount {sortBy === "amount" && (sortOrder === "asc" ? "↑" : "↓")}
                </Chip>
              </View>

              <Text style={[styles.filterLabel, { color: safeTheme.colors.onSurfaceVariant, marginTop: 12 }]}>Category</Text>
              <View style={styles.categoryRow}>
                <Chip
                  selected={selectedCategory === null}
                  onPress={() => setSelectedCategory(null)}
                  style={styles.chip}
                  showSelectedOverlay
                  mode="outlined"
                >
                  All
                </Chip>
                {categories.map((cat) => (
                  <Chip
                    key={cat.id}
                    selected={selectedCategory === cat.id}
                    onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    style={styles.chip}
                    showSelectedOverlay
                    mode="outlined"
                  >
                    {cat.name}
                  </Chip>
                ))}
              </View>
            </View>
          </MotiView>
        )}
      </Surface>

      <SectionList
        sections={groupedExpenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpenseItem}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: safeTheme.colors.background }]}>
            <Text style={[styles.sectionHeaderText, { color: safeTheme.colors.onSurfaceVariant }]}>{title}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="receipt-outline"
              title="No Expenses Found"
              subtitle={searchQuery || selectedCategory ? "Try adjusting your filters." : "You haven't added any expenses yet."}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: 'center',
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filtersSection: {
    marginTop: 8,
    paddingBottom: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  sectionHeader: {
    paddingVertical: 8,
    marginBottom: 4,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  expenseDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  expenseMeta: {
    fontSize: 12,
  },
  dotSeparator: {
    marginHorizontal: 4,
    fontSize: 12,
  },
  payerText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  attachIcon: {
    marginTop: 2,
  },
  emptyContainer: {
    marginTop: 60,
  },
});
