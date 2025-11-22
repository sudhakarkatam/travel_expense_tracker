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
  Modal,
  BackHandler,
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
import { EmptyTripsState, EmptySearchState } from "@/components/EmptyState";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { FABMenu } from "@/components/ui/FABMenu";
import { Image } from "expo-image";
import { formatCurrency } from "@/utils/currencyFormatter";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = 16;

type SortOption =
  | "default"
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
  const [searchQuery, setSearchQuery] = useState(
    route?.params?.returnSearchQuery || ""
  );
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<{
    status: TripStatus | "all";
    sortBy: SortOption;
    destination: string;
    startDate: string;
    endDate: string;
    year: string;
  }>({
    status: "all",
    sortBy: "default",
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
      setSearchQuery(newFilters.destination || "");
      navigation.setParams({ filters: undefined });
    }
  }, [route?.params, navigation]);

  useEffect(() => {
    const onBackPress = () => {
      if (isSearchVisible) {
        setIsSearchVisible(false);
        setSearchQuery("");
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => backHandler.remove();
  }, [isSearchVisible]);

  const formatDateRange = (startDate: string, endDate: string): string => {
    if (!startDate || !endDate) return "Dates unavailable";
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
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

    // Search
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(
        (trip) =>
          trip.name.toLowerCase().includes(query) ||
          trip.destination.toLowerCase().includes(query)
      );
    }

    // Sort
    if (filters.sortBy === "date-newest") {
      filtered.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    } else if (filters.sortBy === "date-oldest") {
      filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    } else if (filters.sortBy === "budget-high") {
      filtered.sort((a, b) => (b.budget || 0) - (a.budget || 0));
    } else if (filters.sortBy === "budget-low") {
      filtered.sort((a, b) => (a.budget || 0) - (b.budget || 0));
    } else {
      // Default sort
      filtered.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }

    return filtered;
  }, [trips, expenses, filters, searchQuery]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const renderTripCard = ({ item: trip, index }: { item: any; index: number }) => {
    const summary = generateTripSummary(trip, expenses);
    const budget = trip.budget || 0.01;
    const progressPercentage = (summary.totalSpent / budget) * 100;
    const statusInfo = getTripStatus(trip, summary.totalSpent);
    const progressColor = progressPercentage > 100 ? theme.colors.error : progressPercentage > 80 ? "#FF9500" : theme.colors.primary;
    const isGridItem = index >= 3;

    const statusColor = statusInfo.status === "active" ? "#4ADE80" : statusInfo.status === "upcoming" ? "#FACC15" : "#9CA3AF";

    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 300, delay: index * 50 } as any}
        style={[styles.fullWidthCardWrapper, isGridItem ? { flex: 1, marginBottom: 16 } : undefined] as any}
      >
        <AnimatedCard
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("TripDetail", { tripId: trip.id, returnSearchQuery: searchQuery });
          }}
          variant="elevated"
          elevation={0}
          style={[styles.tripCard, isGridItem ? { height: 220 } : undefined] as any}
          contentStyle={{ padding: 0, height: isGridItem ? "100%" : undefined }}
        >
          <View style={[styles.coverContainer, isGridItem ? { height: 120 } : undefined] as any}>
            {trip.coverImage ? (
              <Image source={{ uri: trip.coverImage }} style={styles.coverImage} contentFit="cover" transition={200} />
            ) : (
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.coverPlaceholder}
              >
                <Ionicons name="airplane" size={isGridItem ? 30 : 40} color="#FFFFFF" />
              </LinearGradient>
            )}
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.imageGradient} />

            <View style={[styles.statusBadgePill, isGridItem ? { top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 4 } : undefined] as any}>
              <Text style={[styles.statusBadgeText, { color: statusColor }, isGridItem ? { fontSize: 10 } : undefined]}>{statusInfo.status === "upcoming" ? "Upcoming" : statusInfo.status === "active" ? "Active" : "Completed"}</Text>
            </View>

            <View style={[styles.overlayContent, isGridItem ? { bottom: 8, left: 8, right: 8 } : undefined] as any}>
              <Text style={[styles.tripName, isGridItem ? { fontSize: 16 } : undefined]} numberOfLines={1}>{trip.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={isGridItem ? 12 : 14} color="#FFFFFF" />
                <Text style={[styles.destination, isGridItem ? { fontSize: 12 } : undefined]} numberOfLines={1}>{trip.destination || "No destination"}</Text>
              </View>
              <Text style={[styles.overlayDate, isGridItem ? { fontSize: 10 } : undefined]}>{formatDateRange(trip.startDate, trip.endDate)}</Text>
            </View>
          </View>

          <View style={[styles.cardContent, { backgroundColor: theme.colors.surface, flex: isGridItem ? 1 : 0, justifyContent: 'center' }]}>
            <View style={styles.progressBarContainer}>
              <LinearGradient
                colors={[progressColor, progressColor + "DD"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarGradient, { width: `${Math.min(progressPercentage, 100)}%` }]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.onSurface, marginTop: 4 }]} numberOfLines={2}>
              {isGridItem ? (
                `${progressPercentage.toFixed(0)}% used`
              ) : (
                `Spent ${formatCurrency(summary.totalSpent, { currency: trip.currency || "USD" })} / Budget ${formatCurrency(budget, { currency: trip.currency || "USD" })} • ${progressPercentage.toFixed(0)}% used`
              )}
            </Text>
          </View>
        </AnimatedCard>
      </MotiView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        {isSearchVisible ? (
          <Searchbar
            placeholder="Search trips..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            autoFocus
            icon="arrow-left"
            onIconPress={() => {
              setIsSearchVisible(false);
              setSearchQuery("");
            }}
          />
        ) : (
          <>
            <View>
              <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>My Trips</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {trips.length} {trips.length === 1 ? "adventure" : "adventures"} planned
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setIsSearchVisible(true)}
                style={[styles.iconButton, { backgroundColor: theme.colors.surfaceVariant }]}
              >
                <Ionicons name="search" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowFilterModal(true);
                }}
                style={[styles.iconButton, { backgroundColor: theme.colors.surfaceVariant }]}
              >
                <Ionicons name="options" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <FlatList
        data={filteredTrips.slice(3)}
        renderItem={({ item, index }) => renderTripCard({ item, index: index + 3 })}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.tripsContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        numColumns={2}
        columnWrapperStyle={{ gap: 16 }}
        ListHeaderComponent={
          <>
            {filteredTrips.slice(0, 3).map((trip, index) => (
              <View key={trip.id} style={{ marginBottom: 20 }}>
                {renderTripCard({ item: trip, index })}
              </View>
            ))}
          </>
        }
        ListEmptyComponent={
          filteredTrips.length === 0 ? (
            searchQuery ? <EmptySearchState query={searchQuery} /> : <EmptyTripsState onAddTrip={() => navigation.navigate("AddTrip")} />
          ) : null
        }
      />

      <FABMenu
        items={[
          {
            icon: "airplane",
            label: "New Trip",
            onPress: () => navigation.navigate("AddTrip"),
          },
          {
            icon: "receipt",
            label: "Add Expense",
            onPress: () => navigation.navigate("AddExpense"),
          },
        ]}
      />

      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Status</Text>
              <View style={styles.filterOptions}>
                {(["all", "active", "upcoming", "completed"] as const).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOption,
                      {
                        backgroundColor: filters.status === status ? theme.colors.primaryContainer : theme.colors.surface,
                        borderColor: filters.status === status ? theme.colors.primary : theme.colors.outline,
                      },
                    ]}
                    onPress={() => setFilters({ ...filters, status })}
                  >
                    <Text style={[styles.filterOptionText, { color: filters.status === status ? theme.colors.onPrimaryContainer : theme.colors.onSurface }]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                    {filters.status === status && <Ionicons name="checkmark" size={20} color={theme.colors.onPrimaryContainer} />}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface, marginTop: 20 }]}>Sort By</Text>
              <View style={styles.filterOptions}>
                {[
                  { label: "Default", value: "default" },
                  { label: "Date (Newest)", value: "date-newest" },
                  { label: "Date (Oldest)", value: "date-oldest" },
                  { label: "Budget (High to Low)", value: "budget-high" },
                  { label: "Budget (Low to High)", value: "budget-low" },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      {
                        backgroundColor: filters.sortBy === option.value ? theme.colors.primaryContainer : theme.colors.surface,
                        borderColor: filters.sortBy === option.value ? theme.colors.primary : theme.colors.outline,
                      },
                    ]}
                    onPress={() => setFilters({ ...filters, sortBy: option.value as SortOption })}
                  >
                    <Text style={[styles.filterOptionText, { color: filters.sortBy === option.value ? theme.colors.onPrimaryContainer : theme.colors.onSurface }]}>
                      {option.label}
                    </Text>
                    {filters.sortBy === option.value && <Ionicons name="checkmark" size={20} color={theme.colors.onPrimaryContainer} />}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={{ color: theme.colors.onPrimary, fontSize: 16, fontWeight: "600" }}>Apply Filters</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  searchBar: {
    flex: 1,
    elevation: 0,
    backgroundColor: "transparent",
  },
  tripsContainer: {
    padding: 20,
    paddingBottom: 100,
    gap: 20,
  },
  fullWidthCardWrapper: {
    width: "100%",
    marginBottom: 0,
  },
  tripCard: {
    overflow: "hidden",
    borderRadius: 20,
    width: "100%",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
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
  statusBadgePill: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  overlayContent: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  tripName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  destination: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  overlayDate: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.9,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardContent: {
    padding: 16,
    gap: 8,
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  progressBarGradient: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "70%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 16,
  },
  applyButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
});
