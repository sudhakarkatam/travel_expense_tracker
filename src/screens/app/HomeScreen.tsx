import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Platform,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/contexts/AppContext";
import { generateTripSummary } from "@/utils/tripSummary";
import { EmptyTripsState } from "@/components/EmptyState";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_MARGIN = 16;

export default function HomeScreen({ navigation }: any) {
  const { trips, expenses, deleteTrip } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const formatCurrency = (amount: number, currency: string = "USD") => {
    const symbols: Record<string, string> = {
      USD: "$",
      INR: "₹",
      EUR: "€",
      GBP: "£",
    };
    return `${symbols[currency] || "$"}${amount.toFixed(2)}`;
  };

  const renderTripCard = (trip: any) => {
    const summary = generateTripSummary(trip, expenses);
    const budget = trip.budget || 0.01;
    const progressPercentage = Math.min(
      (summary.totalSpent / budget) * 100,
      100,
    );
    const isOverBudget = summary.totalSpent > trip.budget;
    const isNearLimit = progressPercentage >= 80 && !isOverBudget;

    const progressColor = isOverBudget
      ? "#FF3B30"
      : isNearLimit
        ? "#FF9500"
        : "#34C759";

    const handleLongPress = () => {
      if (Platform.OS === "ios") {
        Alert.alert(
          trip.name,
          undefined,
          [
            {
              text: "Edit Trip",
              onPress: () =>
                navigation.navigate("EditTrip", { tripId: trip.id }),
            },
            {
              text: "Delete Trip",
              style: "destructive",
              onPress: () => confirmDelete(),
            },
            { text: "Cancel", style: "cancel" },
          ],
          { cancelable: true },
        );
      } else {
        Alert.alert(
          "Trip Options",
          `What would you like to do with "${trip.name}"?`,
          [
            {
              text: "Edit",
              onPress: () =>
                navigation.navigate("EditTrip", { tripId: trip.id }),
            },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => confirmDelete(),
            },
            { text: "Cancel", style: "cancel" },
          ],
        );
      }
    };

    const confirmDelete = () => {
      Alert.alert(
        "Delete Trip",
        `Are you sure you want to delete "${trip.name}"? This will also delete all associated expenses.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteTrip(trip.id),
          },
        ],
      );
    };

    return (
      <TouchableOpacity
        key={trip.id}
        style={styles.tripCard}
        onPress={() => navigation.navigate("TripDetail", { tripId: trip.id })}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        {/* Cover Image with Gradient Overlay */}
        <View style={styles.coverContainer}>
          {trip.coverImage ? (
            <>
              <Image
                source={{ uri: trip.coverImage }}
                style={styles.coverImage}
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.7)"]}
                style={styles.imageGradient}
              />
            </>
          ) : (
            <LinearGradient
              colors={["#667eea", "#764ba2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverPlaceholder}
            >
              <Ionicons
                name="airplane"
                size={48}
                color="rgba(255,255,255,0.9)"
              />
            </LinearGradient>
          )}

          {/* Trip Header Overlay */}
          <View style={styles.headerOverlay}>
            <View style={styles.tripHeaderContent}>
              <View style={styles.tripTitleContainer}>
                <Text style={styles.tripName} numberOfLines={1}>
                  {trip.name}
                </Text>
                <Text style={styles.tripDestination} numberOfLines={1}>
                  <Ionicons
                    name="location-sharp"
                    size={12}
                    color="rgba(255,255,255,0.9)"
                  />{" "}
                  {trip.destination}
                </Text>
              </View>
              {trip.isGroup && (
                <View style={styles.groupBadge}>
                  <Ionicons name="people" size={12} color="#fff" />
                  <Text style={styles.groupBadgeText}>Group</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Trip Details */}
        <View style={styles.tripDetails}>
          {/* Date Range */}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
            <Text style={styles.dateText}>
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

          {/* Budget Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Spent</Text>
                <Text
                  style={[
                    styles.statValue,
                    isOverBudget && { color: "#FF3B30" },
                  ]}
                >
                  {formatCurrency(summary.totalSpent, trip.currency || "USD")}
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Budget</Text>
                <Text style={styles.statValue}>
                  {formatCurrency(trip.budget, trip.currency || "USD")}
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Status</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: progressColor + "15" },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: progressColor },
                    ]}
                  />
                  <Text style={[styles.statusText, { color: progressColor }]}>
                    {isOverBudget ? "Over" : isNearLimit ? "Near" : "Good"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor: progressColor,
                  },
                ]}
              />
            </View>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>
                {progressPercentage.toFixed(0)}% used
              </Text>
              {isOverBudget && (
                <Text style={styles.overBudgetText}>
                  +
                  {formatCurrency(
                    summary.totalSpent - trip.budget,
                    trip.currency || "USD",
                  )}{" "}
                  over
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={Platform.OS === "ios" ? "dark-content" : "light-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Native Header */}
      <SafeAreaView edges={["top"]} style={styles.headerContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Trips</Text>
            <Text style={styles.headerSubtitle}>
              {trips.length} {trips.length === 1 ? "trip" : "trips"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate("History")}
            activeOpacity={0.6}
          >
            <Ionicons
              name="time-outline"
              size={24}
              color={Platform.OS === "ios" ? "#007AFF" : "#6200EE"}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Platform.OS === "ios" ? "#007AFF" : "#6200EE"}
            colors={["#6200EE"]}
          />
        }
      >
        {trips.length === 0 ? (
          <EmptyTripsState onAddTrip={() => navigation.navigate("AddTrip")} />
        ) : (
          trips.map(renderTripCard)
        )}

        {/* Bottom spacing for FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Native FAB */}
      <SafeAreaView edges={["bottom"]} style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddTrip")}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              Platform.OS === "ios"
                ? ["#007AFF", "#0051D5"]
                : ["#6200EE", "#3700B3"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === "ios" ? "#F2F2F7" : "#FAFAFA",
  },
  headerContainer: {
    backgroundColor: Platform.OS === "ios" ? "#F2F2F7" : "#FFFFFF",
    paddingTop: 0,
    paddingBottom: 0,
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: Platform.OS === "ios" ? "700" : "bold",
    color: "#000",
    letterSpacing: Platform.OS === "ios" ? 0.4 : 0,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#8E8E93",
    marginTop: 2,
  },
  historyButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    backgroundColor:
      Platform.OS === "ios" ? "rgba(0,122,255,0.1)" : "rgba(98,0,238,0.1)",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: CARD_MARGIN,
  },
  tripCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Platform.OS === "ios" ? 16 : 12,
    marginBottom: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  coverContainer: {
    height: 200,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  tripHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  tripTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  tripName: {
    fontSize: 24,
    fontWeight: Platform.OS === "ios" ? "700" : "bold",
    color: "#FFFFFF",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tripDestination: {
    fontSize: 15,
    color: "rgba(255,255,255,0.95)",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  groupBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    backdropFilter: "blur(10px)",
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tripDetails: {
    padding: 16,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: Platform.OS === "ios" ? "500" : "normal",
  },
  statsContainer: {
    marginBottom: 16,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 6,
    fontWeight: Platform.OS === "ios" ? "500" : "normal",
  },
  statValue: {
    fontSize: 17,
    fontWeight: Platform.OS === "ios" ? "600" : "bold",
    color: "#000",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E5EA",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressSection: {
    gap: 8,
  },
  progressBar: {
    height: Platform.OS === "ios" ? 6 : 8,
    backgroundColor: "#E5E5EA",
    borderRadius: Platform.OS === "ios" ? 3 : 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: Platform.OS === "ios" ? 3 : 4,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressText: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: Platform.OS === "ios" ? "500" : "normal",
  },
  overBudgetText: {
    fontSize: 13,
    color: "#FF3B30",
    fontWeight: "600",
  },
  fabContainer: {
    position: "absolute",
    bottom: 0,
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
