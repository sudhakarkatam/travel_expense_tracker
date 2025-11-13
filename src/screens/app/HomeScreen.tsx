import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Searchbar, Surface, ProgressBar } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import { generateTripSummary } from "@/utils/tripSummary";
import { getTripStatus, formatCountdown, TripStatus } from "@/utils/tripStatus";
import { EmptyTripsState } from "@/components/EmptyState";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Chip } from "@/components/ui/Chip";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { Image } from "expo-image";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeScreen({ navigation, route }: any) {
  const theme = useTheme();
  const { trips, expenses, deleteTrip } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState(route?.params?.returnSearchQuery || "");
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  useEffect(() => {
    if (route?.params?.returnSearchQuery !== undefined) {
      setSearchQuery(route.params.returnSearchQuery);
      navigation.setParams({ returnSearchQuery: undefined });
    }
  }, [route?.params?.returnSearchQuery, navigation]);

  const formatCurrency = (amount: number, currency: string = "USD") => {
    const symbols: Record<string, string> = {
      USD: "$",
      INR: "₹",
      EUR: "€",
      GBP: "£",
    };
    return `${symbols[currency] || "$"}${amount.toFixed(2)}`;
  };

  const filteredTrips = useMemo(() => {
    let filtered = [...trips];

    if (statusFilter !== "all") {
      filtered = filtered.filter((trip) => {
        const summary = generateTripSummary(trip, expenses);
        const statusInfo = getTripStatus(trip, summary.totalSpent);
        return statusInfo.status === statusFilter;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (trip) =>
          trip.name.toLowerCase().includes(query) ||
          trip.destination.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    return filtered;
  }, [trips, expenses, statusFilter, searchQuery]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const renderTripCard = (trip: any, index: number) => {
    const summary = generateTripSummary(trip, expenses);
    const budget = trip.budget || 0.01;
    const progressPercentage = Math.min((summary.totalSpent / budget) * 100, 100);
    const statusInfo = getTripStatus(trip, summary.totalSpent);
    const isOverBudget = statusInfo.isOverBudget;
    const isNearLimit = statusInfo.isNearBudget;

    const progressColor = isOverBudget
      ? theme.colors.error
      : isNearLimit
      ? "#FF9500"
      : theme.colors.primary;

    return (
      <MotiView
        key={trip.id}
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: "timing",
          duration: 300,
          delay: index * 50,
        }}
        style={styles.cardWrapper}
      >
        <AnimatedCard
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            navigation.navigate("TripDetail", {
              tripId: trip.id,
              returnSearchQuery: searchQuery,
            });
          }}
          variant="elevated"
          elevation={2}
          style={styles.tripCard}
        >
          {/* Cover Image */}
          <View style={styles.coverContainer}>
            {trip.coverImage ? (
              <Image
                source={{ uri: trip.coverImage }}
                style={styles.coverImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.coverPlaceholder}
              >
                <Ionicons name="airplane" size={40} color="#FFFFFF" />
              </LinearGradient>
            )}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.7)"]}
              style={styles.imageGradient}
            />
            
            {/* Status Badge */}
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      statusInfo.status === "active"
                        ? "#34C759"
                        : statusInfo.status === "upcoming"
                        ? "#FF9500"
                        : "#8E8E93",
                  },
                ]}
              />
              <Text style={styles.statusText}>
                {statusInfo.status === "active"
                  ? "Active"
                  : statusInfo.status === "upcoming"
                  ? statusInfo.daysUntilStart !== undefined
                    ? formatCountdown(statusInfo.daysUntilStart)
                    : "Upcoming"
                  : "Completed"}
              </Text>
            </View>

            {/* Trip Info Overlay */}
            <View style={styles.overlayContent}>
              <Text style={styles.tripName} numberOfLines={1}>
                {trip.name}
              </Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color="#FFFFFF" />
                <Text style={styles.destination} numberOfLines={1}>
                  {trip.destination}
                </Text>
              </View>
            </View>
          </View>

          {/* Card Content */}
          <View style={styles.cardContent}>
            {/* Date Row */}
            <View style={styles.dateRow}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}>
                {new Date(trip.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                -{" "}
                {new Date(trip.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>

            {/* Budget Progress */}
            <View style={styles.progressSection}>
              <View style={styles.budgetRow}>
                <View>
                  <Text style={[styles.budgetLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Spent
                  </Text>
                  <Text style={[styles.budgetAmount, { color: theme.colors.onSurface }]}>
                    {formatCurrency(summary.totalSpent, trip.currency)}
                  </Text>
                </View>
                <View style={styles.budgetRight}>
                  <Text style={[styles.budgetLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Budget
                  </Text>
                  <Text style={[styles.budgetAmount, { color: theme.colors.onSurface }]}>
                    {formatCurrency(budget, trip.currency)}
                  </Text>
                </View>
              </View>
              <ProgressBar
                progress={progressPercentage / 100}
                color={progressColor}
                style={styles.progressBar}
              />
              <Text
                style={[
                  styles.progressText,
                  {
                    color:
                      progressPercentage > 100
                        ? theme.colors.error
                        : progressPercentage > 80
                        ? "#FF9500"
                        : theme.colors.onSurfaceVariant,
                  },
                ]}
              >
                {progressPercentage.toFixed(0)}% of budget used
              </Text>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons
                  name="receipt-outline"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
                  {summary.expenseCount}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Expenses
                </Text>
              </View>
              {trip.isGroup && (
                <View style={styles.statItem}>
                  <Ionicons
                    name="people-outline"
                    size={18}
                    color={theme.colors.secondary}
                  />
                  <Text style={[styles.statValue, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {trip.members?.length || 1}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                    Members
                  </Text>
                </View>
              )}
              <View style={styles.statItem}>
                <Ionicons
                  name="wallet-outline"
                  size={18}
                  color={theme.colors.tertiary}
                />
                <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
                  {formatCurrency(
                    budget - summary.totalSpent > 0
                      ? budget - summary.totalSpent
                      : 0,
                    trip.currency
                  )}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Remaining
                </Text>
              </View>
            </View>
          </View>
        </AnimatedCard>
      </MotiView>
    );
  };

  if (trips.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            My Trips
          </Text>
        </View>
        <EmptyTripsState
          onAddTrip={() => navigation.navigate("AddTrip")}
        />
        <FloatingActionButton
          icon="add"
          onPress={() => navigation.navigate("AddTrip")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          My Trips
        </Text>
        <View style={styles.headerActions}>
          <AnimatedButton
            mode="text"
            icon="search"
            onPress={() => {
              setIsSearchVisible(!isSearchVisible);
              if (!isSearchVisible) {
                // Focus search when opening
                setTimeout(() => {
                  // Searchbar will auto-focus when visible
                }, 100);
              } else {
                // Clear search when closing
                setSearchQuery("");
              }
            }}
            label=""
            style={styles.searchButton}
          />
        </View>
      </Surface>

      {/* Search Bar */}
      {isSearchVisible && (
        <MotiView
          from={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 64 }}
          style={styles.searchContainer}
        >
          <Searchbar
            placeholder="Search trips..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            icon="magnify"
            onClearIconPress={() => {
              setSearchQuery("");
              setIsSearchVisible(false);
            }}
            style={styles.searchbar}
            autoFocus
          />
        </MotiView>
      )}

      {/* Combined ScrollView for Filters and Trips */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
          style={styles.chipsScrollView}
        >
          <Chip
            label="All"
            selected={statusFilter === "all"}
            onPress={() => {
              setStatusFilter("all");
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            variant="flat"
          />
          <Chip
            label="Active"
            selected={statusFilter === "active"}
            onPress={() => {
              setStatusFilter("active");
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            variant="flat"
          />
          <Chip
            label="Upcoming"
            selected={statusFilter === "upcoming"}
            onPress={() => {
              setStatusFilter("upcoming");
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            variant="flat"
          />
          <Chip
            label="Completed"
            selected={statusFilter === "completed"}
            onPress={() => {
              setStatusFilter("completed");
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            variant="flat"
          />
        </ScrollView>

        {/* Trips List */}
        {filteredTrips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="search-outline"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              No trips found
            </Text>
            <AnimatedButton
              mode="outlined"
              label="Clear Filters"
              onPress={() => {
                setStatusFilter("all");
                setSearchQuery("");
              }}
            />
          </View>
        ) : (
          <View style={styles.tripsContainer}>
            {filteredTrips.map((trip, index) => renderTripCard(trip, index))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton
        icon="add"
        onPress={() => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          navigation.navigate("AddTrip");
        }}
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
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  searchButton: {
    minWidth: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchbar: {
    borderRadius: 12,
    elevation: 0,
  },
  chipsScrollView: {
    maxHeight: 60,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  tripsContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    gap: 16,
  },
  cardWrapper: {
    width: '100%',
  },
  tripCard: {
    overflow: "hidden",
  },
  coverContainer: {
    height: 200,
    width: "100%",
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  overlayContent: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  tripName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  destination: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardContent: {
    padding: 16,
    gap: 16,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "500",
  },
  progressSection: {
    gap: 8,
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  budgetLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 20,
    fontWeight: "700",
  },
  budgetRight: {
    alignItems: "flex-end",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F3F4F6",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
