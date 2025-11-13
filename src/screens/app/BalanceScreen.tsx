import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  StatusBar,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/contexts/AppContext";
import {
  calculateBalances,
  simplifyBalances,
  getParticipantSpending,
} from "@/utils/splitCalculations";
import { Settlement, Balance } from "@/types";
import { formatCurrency } from "@/utils/currencyFormatter";
import { formatDateTime } from "@/utils/dateFormatter";

const IS_IOS = Platform.OS === "ios";

interface SettlementModalData {
  from: string;
  to: string;
  amount: number;
  currency: string;
  fromName: string;
  toName: string;
}

interface BalanceScreenProps {
  route: any;
  navigation?: any;
}

export default function BalanceScreen({ route, navigation }: BalanceScreenProps) {
  const { tripId } = route?.params || {};
  const { trips, settlements, addSettlement, getTrip, getTripExpenses } =
    useApp();

  const [selectedTripId, setSelectedTripId] = useState(
    tripId || trips[0]?.id || "",
  );
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementData, setSettlementData] =
    useState<SettlementModalData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "upi" | "bank" | "other"
  >("cash");
  const [notes, setNotes] = useState("");

  const selectedTrip = getTrip(selectedTripId);
  const tripExpenses = getTripExpenses(selectedTripId);
  const tripSettlements = settlements.filter(
    (s) => s.tripId === selectedTripId,
  );

  // Get current user ID
  const currentUserId = selectedTrip?.participants?.find(
    (p) => p.isCurrentUser,
  )?.id;

  const balances = useMemo(() => {
    if (!selectedTripId || tripExpenses.length === 0) return [];
    const allBalances = calculateBalances(tripExpenses, tripSettlements);

    // Filter out self-debts and balances where user owes themselves
    return allBalances.filter((balance) => {
      // Remove if from and to are the same person
      if (balance.from === balance.to) return false;

      // Remove if current user owes themselves
      if (
        currentUserId &&
        balance.from === currentUserId &&
        balance.to === currentUserId
      ) {
        return false;
      }

      return true;
    });
  }, [tripExpenses, tripSettlements, selectedTripId, currentUserId]);

  const simplifiedBalances = useMemo(() => {
    return simplifyBalances(balances);
  }, [balances]);

  const participantSpending = useMemo(() => {
    const spending = getParticipantSpending(tripExpenses, tripSettlements);

    // Update participant names from trip data
    return spending.map((participant) => {
      const tripParticipant = selectedTrip?.participants?.find(
        (p) => p.id === participant.participantId,
      );
      return {
        ...participant,
        participantName: tripParticipant?.name || participant.participantName,
      };
    });
  }, [tripExpenses, tripSettlements, selectedTrip]);

  const getParticipantName = (participantId: string) => {
    const participant = selectedTrip?.participants?.find(
      (p) => p.id === participantId,
    );
    return participant?.name || participantId;
  };

  const handleSettleUp = (balance: any) => {
    const fromName = getParticipantName(balance.from);
    const toName = getParticipantName(balance.to);

    setSettlementData({
      from: balance.from,
      to: balance.to,
      amount: balance.amount,
      currency: balance.currency,
      fromName,
      toName,
    });
    setShowSettlementModal(true);
  };

  const confirmSettlement = async () => {
    if (!settlementData || !selectedTripId) return;

    try {
      await addSettlement({
        tripId: selectedTripId,
        from: settlementData.from,
        to: settlementData.to,
        amount: settlementData.amount,
        currency: settlementData.currency,
        notes: notes || `Payment via ${paymentMethod}`,
      });

      Alert.alert(
        "Settlement Recorded",
        `${settlementData.fromName} paid ${formatCurrency(settlementData.amount, { currency: settlementData.currency })} to ${settlementData.toName}`,
      );

      setShowSettlementModal(false);
      setSettlementData(null);
      setNotes("");
      setPaymentMethod("cash");
    } catch {
      Alert.alert("Error", "Failed to record settlement. Please try again.");
    }
  };

  const renderBalanceCard = (balance: Balance) => {
    const fromName = getParticipantName(balance.from);
    const toName = getParticipantName(balance.to);

    return (
      <View key={`${balance.from}-${balance.to}`} style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: "#FF3B30" }]}>
              <Text style={styles.avatarText}>
                {fromName[0]?.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.balanceName}>{fromName}</Text>
          </View>

          <View style={styles.arrowContainer}>
            <Ionicons name="arrow-forward" size={20} color="#8E8E93" />
            <Text style={styles.amountText}>
              {formatCurrency(balance.amount, { currency: balance.currency })}
            </Text>
          </View>

          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: "#34C759" }]}>
              <Text style={styles.avatarText}>{toName[0]?.toUpperCase()}</Text>
            </View>
            <Text style={styles.balanceName}>{toName}</Text>
          </View>
        </View>

        <View style={styles.balanceActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSettleUp(balance)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={18} color="white" />
            <Text style={styles.actionButtonText}>Mark as Settled</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderParticipantSummary = (participant: any) => {
    const isCreditor = participant.netBalance > 0;
    const isDebtor = participant.netBalance < 0;
    const isEven = Math.abs(participant.netBalance) < 0.01;

    return (
      <View key={participant.participantId} style={styles.participantCard}>
        <View style={styles.participantHeader}>
          <View
            style={[
              styles.avatarLarge,
              {
                backgroundColor: isCreditor
                  ? "#34C759"
                  : isDebtor
                    ? "#FF3B30"
                    : "#8E8E93",
              },
            ]}
          >
            <Text style={styles.avatarTextLarge}>
              {participant.participantName[0]?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.participantDetails}>
            <Text style={styles.participantNameLarge}>
              {participant.participantName}
            </Text>
            <Text style={styles.participantStatus}>
              {isCreditor &&
                `Gets back ${formatCurrency(participant.netBalance)}`}
              {isDebtor &&
                `Owes ${formatCurrency(Math.abs(participant.netBalance))}`}
              {isEven && "All settled up!"}
            </Text>
          </View>
          {isEven && (
            <Ionicons name="checkmark-circle" size={28} color="#34C759" />
          )}
        </View>

        <View style={styles.participantStats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Paid</Text>
            <Text style={styles.statValue}>
              {formatCurrency(participant.totalPaid)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Share</Text>
            <Text style={styles.statValue}>
              {formatCurrency(participant.totalOwed)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Balance</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color: isCreditor
                    ? "#34C759"
                    : isDebtor
                      ? "#FF3B30"
                      : "#8E8E93",
                },
              ]}
            >
              {formatCurrency(Math.abs(participant.netBalance))}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (trips.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Balances</Text>
          <Text style={styles.headerSubtitle}>Track your trip finances</Text>
        </View>
        <EmptyState
          icon="wallet-outline"
          title="No Trips Yet"
          subtitle="Create a trip to track balances and settlements."
          actionText="Create New Trip"
          onActionPress={() => {}} // navigation.navigate("AddTrip")
        />
      </SafeAreaView>
    );
  }

  if (!selectedTrip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Balances</Text>
          <Text style={styles.headerSubtitle}>Track your trip finances</Text>
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Trip Not Found"
          subtitle="The selected trip could not be loaded. Please select another."
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={IS_IOS ? "dark-content" : "light-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Native Header */}
      <SafeAreaView edges={["top"]} style={styles.headerContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Balances</Text>
            <Text style={styles.headerSubtitle}>
              {selectedTrip?.participants?.length || 0} participants
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Trip</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {trips.map((trip) => (
              <Pressable
                key={trip.id}
                style={({ pressed }) => [
                  styles.tripChip,
                  selectedTripId === trip.id && styles.tripChipSelected,
                  pressed && styles.tripChipPressed,
                ]}
                onPress={() => setSelectedTripId(trip.id)}
              >
                <Text
                  style={[
                    styles.tripChipText,
                    selectedTripId === trip.id && styles.tripChipTextSelected,
                  ]}
                >
                  {trip.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Participant Summaries */}
        {participantSpending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.listGroup}>
              {participantSpending.map(renderParticipantSummary)}
            </View>
          </View>
        )}

        {/* Simplified Balances */}
        {simplifiedBalances.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Outstanding Balances</Text>
            <View style={styles.listGroup}>
              {simplifiedBalances.map(renderBalanceCard)}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="checkmark-circle" size={64} color="#34C759" />
              </View>
              <Text style={styles.emptyStateTitle}>All Settled Up!</Text>
              <Text style={styles.emptyStateSubtitle}>
                Everyone has been paid back
              </Text>
            </View>
          </View>
        )}

        {/* Settlement History */}
        {tripSettlements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settlement History</Text>
            <View style={styles.listGroup}>
              {tripSettlements.map((settlement) => {
                const fromName = getParticipantName(settlement.from);
                const toName = getParticipantName(settlement.to);

                return (
                  <View key={settlement.id} style={styles.historyCard}>
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#34C759"
                    />
                    <View style={styles.historyContent}>
                      <Text style={styles.historyText}>
                        {fromName} paid {toName}
                      </Text>
                      <Text style={styles.historyAmount}>
                        {formatCurrency(settlement.amount, {
                          currency: settlement.currency,
                        })}
                      </Text>
                      <Text style={styles.historyDate}>
                        {formatDateTime(settlement.settledAt)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Bottom padding for safe scrolling */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Settlement Modal */}
      <Modal
        visible={showSettlementModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettlementModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSettlementModal(false)}
        >
          <View style={styles.modalContent}>
            {IS_IOS && <View style={styles.modalHandle} />}

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity
                onPress={() => setShowSettlementModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close-circle" size={28} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {settlementData && (
              <>
                <View style={styles.modalBody}>
                  <View style={styles.settlementSummary}>
                    <Text style={styles.settlementText}>
                      {settlementData.fromName} is paying
                    </Text>
                    <Text style={styles.settlementAmount}>
                      {formatCurrency(settlementData.amount, {
                        currency: settlementData.currency,
                      })}
                    </Text>
                    <Text style={styles.settlementText}>
                      to {settlementData.toName}
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Payment Method</Text>
                    <View style={styles.paymentMethods}>
                      {["cash", "upi", "bank", "other"].map((method) => (
                        <TouchableOpacity
                          key={method}
                          style={[
                            styles.paymentMethodButton,
                            paymentMethod === method &&
                              styles.paymentMethodButtonActive,
                          ]}
                          onPress={() =>
                            setPaymentMethod(
                              method as "cash" | "upi" | "bank" | "other",
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.paymentMethodText,
                              paymentMethod === method &&
                                styles.paymentMethodTextActive,
                            ]}
                          >
                            {method.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Notes (Optional)</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Add a note about this payment..."
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowSettlementModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={confirmSettlement}
                  >
                    <Text style={styles.confirmButtonText}>
                      Confirm Payment
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#8E8E93",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#8E8E93",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
    marginTop: 8,
  },
  listGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  tripSelector: {
    flexDirection: "row",
    marginBottom: 16,
  },
  tripChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#E5E5EA",
    marginRight: 8,
  },
  tripChipSelected: {
    backgroundColor: "#8b5cf6",
  },
  tripChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  tripChipTextSelected: {
    color: "#FFFFFF",
  },
  balanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  arrowContainer: {
    marginHorizontal: 12,
    alignItems: "center",
  },
  amountText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#8b5cf6",
    marginTop: 4,
  },
  balanceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  balanceActions: {
    marginTop: 12,
    alignItems: "flex-end", // Align button to the right
  },
  actionButton: {
    backgroundColor: "#8b5cf6",
    paddingVertical: 8, // Slightly smaller padding
    paddingHorizontal: 14, // Slightly smaller padding
    borderRadius: 8,
    flexDirection: "row", // Icon and text side by side
    alignItems: "center",
    gap: 6, // Space between icon and text
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  participantCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  participantHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarLarge: {
    width: 50, // Slightly smaller
    height: 50,
    borderRadius: 25,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTextLarge: {
    color: "#FFFFFF",
    fontSize: 20, // Slightly smaller
    fontWeight: "600",
  },
  participantDetails: {
    flex: 1,
    marginLeft: 12,
  },
  participantNameLarge: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  participantStatus: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 2,
  },
  participantStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E5EA",
    marginHorizontal: 12,
    height: "100%", // Span the height of the stats
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  historyCard: {
    backgroundColor: "#F9F9FB", // Lighter background for history
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  historyContent: {
    flex: 1,
  },
  historyText: {
    fontSize: 15,
    color: "#000000",
    marginBottom: 4,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10b981", // Green for settled amounts
  },
  historyDate: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: IS_IOS ? 34 : 20,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: "#C7C7CC",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  settlementSummary: {
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 20,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  settlementText: {
    fontSize: 16,
    color: "#8E8E93",
    marginVertical: 4,
  },
  settlementAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#8b5cf6",
    marginVertical: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  paymentMethods: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  paymentMethodButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    backgroundColor: "#FFFFFF",
  },
  paymentMethodButtonActive: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8E8E93",
  },
  paymentMethodTextActive: {
    color: "#FFFFFF",
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#000000",
    backgroundColor: "#FFFFFF",
    minHeight: 80,
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F2F2F7",
  },
  confirmButton: {
    backgroundColor: "#8b5cf6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8E8E93",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
