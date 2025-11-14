import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  Dimensions,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Searchbar, Surface } from "react-native-paper";
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
import { FABMenu } from "@/components/ui/FABMenu";
import { Image } from "expo-image";
import { formatCurrency } from "@/utils/currencyFormatter";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = 16;
const GRID_GAP = 12;
const GRID_CARD_WIDTH = (SCREEN_WIDTH - GRID_GAP) / 2;

type SortOption =
  | "date-newest"
  | "date-oldest"
  | "budget-high"
  | "budget-low"
  | "spent-high"
  | "spent-low";

interface HomeScreenProps {
  navigation: any;
  route: any;
}

export default function HomeScreen({ navigation, route }: HomeScreenProps) {
  const theme = useTheme();
  const { trips, expenses } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState(
    route?.params?.returnSearchQuery || ""
  );
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Filter state from route params
  const [filters, setFilters] = useState<{
    status: TripStatus | "all";
    sortBy: SortOption;
    destination: string;
    startDate: string;
    endDate: string;
    year: string;
  }>({
    status: "all",
    sortBy: "date-newest",
    destination: "",
    startDate: "",
    endDate: "",
    year: "",
  });

  useEffect(() => {
    if (route?.params?.returnSearchQuery !== undefined) {
      setSearchQuery(route.params.returnSearchQuery);
      navigation.setParams({ returnSearchQuery: undefined });
    }
    if (route?.params?.filters) {
      const newFilters = route.params.filters;
      setFilters(newFilters);
      setStatusFilter(newFilters.status);
      setSearchQuery(newFilters.destination || "");
      navigation.setParams({ filters: undefined });
    }
  }, [route?.params, navigation]);

  const formatDateRange = (startDate: string, endDate: string): string => {
    if (!startDate || !endDate) {
      return "Dates unavailable";
    }
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startMonth = start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const endMonth = end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${startMonth} – ${endMonth}`;
    } catch {
      return "Dates unavailable";
    }
  };

  const filteredTrips = useMemo(() => {
    let filtered = [...trips];

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((trip) => {
        const summary = generateTripSummary(trip, expenses);
        const statusInfo = getTripStatus(trip, summary.totalSpent);
        return statusInfo.status === filters.status;
      });
    }

    // Destination search (from filters or search query)
    const destinationQuery = filters.destination || searchQuery;
    if (destinationQuery.trim()) {
      const query = destinationQuery.toLowerCase();
      filtered = filtered.filter(
        (trip) =>
          trip.name.toLowerCase().includes(query) ||
          trip.destination.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      filtered = filtered.filter((trip) => {
        const tripStart = new Date(trip.startDate);
        const tripEnd = new Date(trip.endDate);
        // Trip overlaps with selected range
        return (
          (tripStart >= startDate && tripStart <= endDate) ||
          (tripEnd >= startDate && tripEnd <= endDate) ||
          (tripStart <= startDate && tripEnd >= endDate)
        );
      });
    }

    // Year filter
    if (filters.year) {
      const year = parseInt(filters.year);
      filtered = filtered.filter((trip) => {
        const tripStartYear = new Date(trip.startDate).getFullYear();
        const tripEndYear = new Date(trip.endDate).getFullYear();
        return tripStartYear === year || tripEndYear === year;
      });
    }

    // Apply sort by option
    if (filters.sortBy === "date-newest") {
      filtered.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    } else if (filters.sortBy === "date-oldest") {
      filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    } else if (filters.sortBy === "budget-high") {
      filtered.sort((a, b) => (b.budget || 0) - (a.budget || 0));
    } else if (filters.sortBy === "budget-low") {
      filtered.sort((a, b) => (a.budget || 0) - (b.budget || 0));
    } else if (filters.sortBy === "spent-high") {
      filtered.sort((a, b) => {
        const aSummary = generateTripSummary(a, expenses);
        const bSummary = generateTripSummary(b, expenses);
        const aPercentage = ((aSummary.totalSpent / (a.budget || 0.01)) * 100);
        const bPercentage = ((bSummary.totalSpent / (b.budget || 0.01)) * 100);
        return bPercentage - aPercentage;
      });
    } else if (filters.sortBy === "spent-low") {
      filtered.sort((a, b) => {
        const aSummary = generateTripSummary(a, expenses);
        const bSummary = generateTripSummary(b, expenses);
        const aPercentage = ((aSummary.totalSpent / (a.budget || 0.01)) * 100);
        const bPercentage = ((bSummary.totalSpent / (b.budget || 0.01)) * 100);
        return aPercentage - bPercentage;
      });
    } else {
      // Default: Priority: Active > Upcoming > Completed (then by date if same status)
      filtered.sort((a, b) => {
        const aSummary = generateTripSummary(a, expenses);
        const bSummary = generateTripSummary(b, expenses);
        const aStatus = getTripStatus(a, aSummary.totalSpent).status;
        const bStatus = getTripStatus(b, bSummary.totalSpent).status;

        // Status priority: active (0) > upcoming (1) > completed (2)
        const statusPriority: Record<TripStatus, number> = {
          active: 0,
          upcoming: 1,
          completed: 2,
        };

        const aPriority = statusPriority[aStatus];
        const bPriority = statusPriority[bStatus];

        // If different statuses, sort by priority
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        // If same status, sort by latest date (newest first)
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      });
    }

    return filtered;
  }, [trips, expenses, filters, searchQuery]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const renderFullWidthCard = (trip: any, index: number) => {
    const summary = generateTripSummary(trip, expenses);
    const budget = trip.budget || 0.01;
    const progressPercentage = (summary.totalSpent / budget) * 100;
    const statusInfo = getTripStatus(trip, summary.totalSpent);
    const progressColor =
      progressPercentage > 100
        ? theme.colors.error
        : progressPercentage > 80
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
        style={styles.fullWidthCardWrapper}
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
          elevation={0}
          style={styles.tripCard}
          contentStyle={{ padding: 0 }}
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
                colors={[
                  theme?.colors?.primary || "#8b5cf6",
                  theme?.colors?.secondary || "#06b6d4",
                ]}
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

            {/* Status Badge - Top Right */}
            <View
              style={[
                styles.statusBadgePill,
                {
                  backgroundColor:
                    statusInfo.status === "upcoming"
                      ? "rgba(139, 92, 246, 0.9)"
                      : statusInfo.status === "active"
                      ? "rgba(52, 199, 89, 0.9)"
                      : "rgba(142, 142, 147, 0.9)",
                },
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {statusInfo.status === "upcoming"
                  ? "Upcoming"
                  : statusInfo.status === "active"
                  ? "Active"
                  : "Completed"}
              </Text>
            </View>

            {/* Trip Info Overlay - Bottom */}
            <View style={styles.overlayContent}>
              <Text style={styles.tripName} numberOfLines={1}>
                {trip.name}
              </Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color="#FFFFFF" />
                <Text style={styles.destination} numberOfLines={1}>
                  {trip.destination || "No destination"}
                </Text>
              </View>
              {/* Dates - Always shown */}
              <Text style={styles.overlayDate}>
                {formatDateRange(trip.startDate, trip.endDate)}
              </Text>
            </View>
          </View>

          {/* Card Content - Progress Section */}
          <View style={[styles.cardContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.progressBarContainer}>
              <LinearGradient
                colors={[progressColor, progressColor + "DD"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressBarGradient,
                  { width: `${Math.min(progressPercentage, 100)}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.onSurface }]}>
              Spent {formatCurrency(summary.totalSpent, { currency: trip.currency || "USD" })} / Budget{" "}
              {formatCurrency(budget, { currency: trip.currency || "USD" })} • {progressPercentage.toFixed(0)}% used
            </Text>
          </View>
        </AnimatedCard>
      </MotiView>
    );
  };

  const renderGridCard = ({ item: trip, index }: { item: any; index: number }) => {
    const summary = generateTripSummary(trip, expenses);
    const budget = trip.budget || 0.01;
    const progressPercentage = (summary.totalSpent / budget) * 100;
    const statusInfo = getTripStatus(trip, summary.totalSpent);
    const progressColor =
      progressPercentage > 100
        ? theme.colors.error
        : progressPercentage > 80
        ? "#FF9500"
        : theme.colors.primary;

    return (
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "timing",
          duration: 300,
          delay: index * 30,
        }}
        style={styles.gridCardWrapper}
      >
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            navigation.navigate("TripDetail", {
              tripId: trip.id,
              returnSearchQuery: searchQuery,
            });
          }}
          activeOpacity={0.9}
          style={styles.gridTripCard}
        >
          {/* Cover Image */}
          <View style={styles.gridCoverContainer}>
            {trip.coverImage ? (
              <Image
                source={{ uri: trip.coverImage }}
                style={styles.gridCoverImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <LinearGradient
                colors={[
                  theme?.colors?.primary || "#8b5cf6",
                  theme?.colors?.secondary || "#06b6d4",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gridCoverPlaceholder}
              >
                <Ionicons name="airplane" size={24} color="#FFFFFF" />
              </LinearGradient>
            )}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.7)"]}
              style={styles.gridImageGradient}
            />

            {/* Status Badge - Top Right */}
            <View
              style={[
                styles.gridStatusBadgePill,
                {
                  backgroundColor:
                    statusInfo.status === "upcoming"
                      ? "rgba(139, 92, 246, 0.9)"
                      : statusInfo.status === "active"
                      ? "rgba(52, 199, 89, 0.9)"
                      : "rgba(142, 142, 147, 0.9)",
                },
              ]}
            >
              <Text style={styles.gridStatusBadgeText}>
                {statusInfo.status === "upcoming"
                  ? "Upcoming"
                  : statusInfo.status === "active"
                  ? "Active"
                  : "Completed"}
              </Text>
            </View>

            {/* Trip Info Overlay - Bottom */}
            <View style={styles.gridOverlayContent}>
              <Text style={styles.gridTripName} numberOfLines={1}>
                {trip.name}
              </Text>
              <View style={styles.gridLocationRow}>
                <Ionicons name="location" size={10} color="#FFFFFF" />
                <Text style={styles.gridDestination} numberOfLines={1}>
                  {trip.destination || "No destination"}
                </Text>
              </View>
              {/* Dates - Always shown */}
              <Text style={styles.gridOverlayDate}>
                {formatDateRange(trip.startDate, trip.endDate)}
              </Text>
            </View>
          </View>

          {/* Card Content - Progress Section */}
          <View style={[styles.gridCardContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.gridProgressBarContainer}>
              <LinearGradient
                colors={[progressColor, progressColor + "DD"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.gridProgressBarGradient,
                  { width: `${Math.min(progressPercentage, 100)}%` },
                ]}
              />
            </View>
            <Text
              style={[
                styles.gridProgressText,
                { color: theme.colors.onSurface },
              ]}
              numberOfLines={1}
            >
              {formatCurrency(summary.totalSpent, {
                currency: trip.currency || "USD",
              })} / {formatCurrency(budget, { currency: trip.currency || "USD" })} — {progressPercentage.toFixed(0)}% used
            </Text>
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  };

  if (trips.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            My Trips
          </Text>
        </View>
        <EmptyTripsState onAddTrip={() => navigation.navigate("AddTrip")} />
        <FABMenu
          items={[
            {
              icon: "add",
              label: "New Trip",
              onPress: () => navigation.navigate("AddTrip"),
              variant: "primary",
            },
          ]}
          mainIcon="add"
        />
      </SafeAreaView>
    );
  }

  const firstThreeTrips = filteredTrips.slice(0, 3);
  const remainingTrips = filteredTrips.slice(3);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <Surface
        style={[styles.header, { backgroundColor: theme.colors.surface }]}
        elevation={1}
      >
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
                setTimeout(() => {}, 100);
              } else {
                setSearchQuery("");
              }
            }}
            label=""
            style={styles.searchButton}
          />
          <AnimatedButton
            mode="text"
            icon="filter"
            onPress={() => {
              navigation.navigate("TripFilters", {
                filters: {
                  status: filters.status,
                  sortBy: filters.sortBy,
                  destination: filters.destination || searchQuery,
                  startDate: filters.startDate,
                  endDate: filters.endDate,
                  year: filters.year,
                },
              });
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            label=""
            style={styles.filterButton}
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
            tintColor={theme?.colors?.primary || "#8b5cf6"}
            colors={[theme?.colors?.primary || "#8b5cf6"]}
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
              setFilters({ ...filters, status: "all" });
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
              setFilters({ ...filters, status: "active" });
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
              setFilters({ ...filters, status: "upcoming" });
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
              setFilters({ ...filters, status: "completed" });
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
                setFilters({
                  status: "all",
                  sortBy: "date-newest",
                  destination: "",
                  startDate: "",
                  endDate: "",
                  year: "",
                });
              }}
            />
          </View>
        ) : (
          <View style={styles.tripsContainer}>
            {/* First 3 trips - Full Width */}
            {firstThreeTrips.map((trip, index) =>
              renderFullWidthCard(trip, index)
            )}

            {/* Remaining trips - Grid Layout */}
            {remainingTrips.length > 0 && (
              <FlatList
                data={remainingTrips}
                renderItem={renderGridCard}
                numColumns={2}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.gridContainer}
                columnWrapperStyle={styles.gridRow}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button Menu */}
      <FABMenu
        items={[
          {
            icon: "add",
            label: "New Trip",
            onPress: () => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              navigation.navigate("AddTrip");
            },
            variant: "primary",
          },
        ]}
        mainIcon="add"
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
  filterButton: {
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
    paddingHorizontal: 0,
    paddingTop: 0,
    gap: 16,
  },
  // Full Width Card Styles
  fullWidthCardWrapper: {
    width: "100%",
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  tripCard: {
    overflow: "hidden",
    borderRadius: 20,
    width: "100%",
    margin: 0,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  coverContainer: {
    height: 240,
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
    height: "70%",
  },
  statusBadgePill: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  overlayContent: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  tripName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: -0.5,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  destination: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  overlayDate: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    opacity: 0.95,
  },
  cardContent: {
    padding: 16,
    gap: 10,
    backgroundColor: "transparent",
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  progressBarGradient: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  // Grid Card Styles
  gridContainer: {
    gap: GRID_GAP,
    paddingHorizontal: 0,
  },
  gridRow: {
    justifyContent: "space-between",
    gap: GRID_GAP,
    paddingHorizontal: 0,
  },
  gridCardWrapper: {
    width: GRID_CARD_WIDTH,
    paddingLeft: CARD_PADDING / 2,
    paddingRight: CARD_PADDING / 2,
  },
  gridTripCard: {
    overflow: "hidden",
    borderRadius: 20,
    margin: 0,
    padding: 0,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 0,
  },
  gridCoverContainer: {
    height: 160,
    width: "100%",
    position: "relative",
  },
  gridCoverImage: {
    width: "100%",
    height: "100%",
  },
  gridCoverPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  gridImageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  gridStatusBadgePill: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  gridStatusBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  gridOverlayContent: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  gridTripName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: -0.2,
  },
  gridLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  gridDestination: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flex: 1,
  },
  gridOverlayDate: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    opacity: 0.95,
  },
  gridCardContent: {
    padding: 10,
    margin: 0,
    gap: 6,
    backgroundColor: "transparent",
  },
  gridProgressBarContainer: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
    marginBottom: 4,
  },
  gridProgressBarGradient: {
    height: "100%",
    borderRadius: 2,
  },
  gridProgressText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
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
