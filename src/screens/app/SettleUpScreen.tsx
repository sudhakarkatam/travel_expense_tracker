import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Dimensions,
  Pressable,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Surface } from "react-native-paper";
import { useApp } from "@/contexts/AppContext";
import {
  calculateBalances,
  simplifyBalances,
  suggestSettlements,
  getParticipantSpending,
} from "@/utils/splitCalculations";
import { Balance, Settlement, Participant, Trip } from "@/types";
import { formatCurrency } from "@/utils/currencyFormatter";
import { formatDateTime } from "@/utils/dateFormatter";
import EmptyState from "@/components/EmptyState"; // Correct default import

const IS_IOS = Platform.OS === "ios";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SettleUpScreenProps {
  navigation: any;
  route: any;
}

export default function SettleUpScreen({ navigation, route }: SettleUpScreenProps) {
  const theme = useTheme();
  const { tripId } = route.params;
  const {
    getTrip,
    getTripExpenses,
    settlements,
    addSettlement,
    updateSettlement,
    deleteSettlement,
    updateTrip,
  } = useApp();

  const trip: Trip | undefined = useMemo(
    () => getTrip(tripId),
    [tripId, getTrip],
  );

  const [activeTab, setActiveTab] = useState<"balances" | "history">(
    "balances",
  );
  const [isSettling, setIsSettling] = useState(false);
  const [showUserIdentificationModal, setShowUserIdentificationModal] =
    useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");

  const tripParticipants: Participant[] = useMemo(
    () => trip?.participants || [],
    [trip],
  );

  const getParticipantName = useCallback(
    (participantId: string): string => {
      const participant = tripParticipants.find((p) => p.id === participantId);
      return participant?.name || "";
    },
    [tripParticipants],
  );

  const tripExpenses = useMemo(
    () => getTripExpenses(tripId) || [],
    [tripId, getTripExpenses],
  );
  const tripSettlements = useMemo(
    () => (settlements || []).filter((s) => s.tripId === tripId),
    [settlements, tripId],
  );

  const allCalculatedBalances = useMemo(
    () => calculateBalances(tripExpenses, tripSettlements, tripParticipants),
    [tripExpenses, tripSettlements, tripParticipants],
  );

  const simplifiedBalances: Balance[] = useMemo(() => {
    // Pass tripParticipants to simplifyBalances for name resolution if needed in future,
    // though the current simplifyBalances in splitCalculations.ts only cares about IDs for transactions.
    return simplifyBalances(allCalculatedBalances, tripParticipants).filter(
      (balance) =>
        balance.amount > 0.01 && // Only show non-zero balances
        balance.from !== balance.to, // Ensure no self-owes
    );
  }, [allCalculatedBalances, tripParticipants]);

  const settlementSuggestions = useMemo(
    () => suggestSettlements(allCalculatedBalances, tripParticipants),
    [allCalculatedBalances, tripParticipants],
  );

  const participantSpending = useMemo(
    () =>
      getParticipantSpending(tripExpenses, tripSettlements, tripParticipants),
    [tripExpenses, tripSettlements, tripParticipants],
  );

  const currentUserId = useMemo(
    () => tripParticipants.find((p) => p.isCurrentUser)?.id,
    [tripParticipants],
  );

  // Set default selected member to current user
  useEffect(() => {
    if (currentUserId && !selectedMemberId) {
      setSelectedMemberId(currentUserId);
    } else if (!currentUserId && tripParticipants.length > 0 && !selectedMemberId) {
      setSelectedMemberId(tripParticipants[0].id);
    }
  }, [currentUserId, tripParticipants, selectedMemberId]);

  // Filter balances for selected member
  const filteredBalances = useMemo(() => {
    if (!selectedMemberId) return simplifiedBalances;
    return simplifiedBalances.filter(
      (balance) => balance.from === selectedMemberId || balance.to === selectedMemberId,
    );
  }, [simplifiedBalances, selectedMemberId]);

  // Filter participant spending for selected member
  const filteredParticipantSpending = useMemo(() => {
    if (!selectedMemberId) return participantSpending;
    return participantSpending.filter(
      (p) => p.participantId === selectedMemberId,
    );
  }, [participantSpending, selectedMemberId]);

  // Filter and get related expenses for selected member
  const relatedExpenses = useMemo(() => {
    if (!selectedMemberId) return [];
    return tripExpenses.filter(
      (expense) =>
        expense.paidBy === selectedMemberId ||
        expense.splitBetween.some(
          (split) => split.userId === selectedMemberId,
        ),
    );
  }, [tripExpenses, selectedMemberId]);

  // Filter related expenses by search query
  const filteredRelatedExpenses = useMemo(() => {
    if (!expenseSearchQuery.trim()) return relatedExpenses;
    const query = expenseSearchQuery.toLowerCase();
    return relatedExpenses.filter(
      (expense) =>
        expense.description.toLowerCase().includes(query) ||
        expense.category.toLowerCase().includes(query) ||
        expense.amount.toString().includes(query),
    );
  }, [relatedExpenses, expenseSearchQuery]);

  // Get expenses to display (first 10 or all if showAllExpenses is true)
  const displayedExpenses = useMemo(() => {
    if (showAllExpenses) return filteredRelatedExpenses;
    return filteredRelatedExpenses.slice(0, 10);
  }, [filteredRelatedExpenses, showAllExpenses]);

  // Effect to show identification modal if no current user is identified in a group trip
  useEffect(() => {
    if (trip?.isGroup && !currentUserId) {
      setShowUserIdentificationModal(true);
    }
  }, [trip, currentUserId]);

  const handleSettleUp = useCallback(
    async (from: string, to: string, amount: number, currency: string) => {
      const fromName = getParticipantName(from);
      const toName = getParticipantName(to);
      const settlementCurrency = currency || trip?.currency || "USD";

      Alert.alert(
        "Settle Up",
        `Mark payment of ${formatCurrency(amount, { currency: settlementCurrency })} from ${fromName} to ${toName} as completed?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark as Paid",
            onPress: async () => {
              setIsSettling(true);
              try {
                await addSettlement({
                  tripId,
                  from,
                  to,
                  amount,
                  currency: settlementCurrency,
                  notes: `Manual settlement from ${fromName} to ${toName}`,
                });
                Alert.alert("Success", "Payment marked as completed!");
              } catch (error) {
                console.error("Failed to record settlement:", error);
                Alert.alert(
                  "Error",
                  "Failed to record settlement. Please try again.",
                );
              } finally {
                setIsSettling(false);
              }
            },
          },
        ],
      );
    },
    [tripId, trip?.currency, addSettlement, getParticipantName],
  );

  const handleIdentifyUser = useCallback(
    async (participantId: string) => {
      if (!trip) return;

      const updatedParticipants = trip.participants.map((p) => ({
        ...p,
        isCurrentUser: p.id === participantId,
      }));

      await updateTrip(tripId, { participants: updatedParticipants });
      setShowUserIdentificationModal(false);
    },
    [trip, tripId, updateTrip],
  );

  const handleEditSettlement = useCallback(
    (settlement: Settlement) => {
      Alert.prompt(
        "Edit Settlement",
        `Enter new amount for payment from ${getParticipantName(settlement.from)} to ${getParticipantName(settlement.to)}:`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Update",
            onPress: async (newAmount: string | undefined) => {
              const amount = parseFloat(newAmount || "0");
              if (isNaN(amount) || amount <= 0) {
                Alert.alert("Error", "Please enter a valid amount.");
                return;
              }

              try {
                await updateSettlement(settlement.id, { amount });
                Alert.alert("Success", "Settlement updated successfully!");
              } catch (error) {
                console.error("Failed to update settlement:", error);
                Alert.alert(
                  "Error",
                  "Failed to update settlement. Please try again.",
                );
              }
            },
          },
        ],
        "plain-text",
        settlement.amount.toString(),
      );
    },
    [updateSettlement, getParticipantName],
  );

  const handleDeleteSettlement = useCallback(
    (settlementId: string) => {
      Alert.alert(
        "Delete Settlement",
        "Are you sure you want to delete this settlement? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteSettlement(settlementId);
                Alert.alert("Success", "Settlement deleted successfully!");
              } catch (error) {
                console.error("Failed to delete settlement:", error);
                Alert.alert(
                  "Error",
                  "Failed to delete settlement. Please try again.",
                );
              }
            },
          },
        ],
      );
    },
    [deleteSettlement],
  );

  const renderBalanceItem = useCallback(
    (balance: Balance, index: number) => {
      const fromName = getParticipantName(balance.from);
      const toName = getParticipantName(balance.to);

      // Only render if amounts are significant and not self-owes, and names exist
      if (
        balance.amount < 0.01 ||
        balance.from === balance.to ||
        !fromName ||
        !toName
      )
        return null;

      return (
        <Surface
          key={`${balance.from}-${balance.to}-${index}`}
          style={styles.balanceCard}
          elevation={2}
        >
          <View style={styles.balanceCardContent}>
            <View style={styles.balanceCardHeader}>
              <View style={[styles.balanceCardIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Ionicons name="arrow-forward" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.balanceCardInfo}>
                <Text style={[styles.balanceCardFrom, { color: theme.colors.onSurface }]}>{fromName}</Text>
                <View style={styles.balanceCardArrow}>
                  <Ionicons name="arrow-down" size={16} color={theme.colors.onSurfaceVariant} />
                </View>
                <Text style={[styles.balanceCardTo, { color: theme.colors.primary }]}>{toName}</Text>
              </View>
            </View>
            
            <View style={[styles.balanceCardAmount, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={[styles.balanceCardAmountLabel, { color: theme.colors.onSurfaceVariant }]}>Amount</Text>
              <Text style={[styles.balanceCardAmountValue, { color: theme.colors.primary }]}>
                {formatCurrency(balance.amount, { currency: balance.currency })}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.settleButtonCard,
              { backgroundColor: theme.colors.tertiary },
              isSettling && styles.disabledSettleButtonCard,
            ]}
            onPress={() =>
              handleSettleUp(
                balance.from,
                balance.to,
                balance.amount,
                balance.currency,
              )
            }
            disabled={isSettling}
          >
            <Ionicons name="checkmark-circle" size={22} color={theme.colors.onTertiary} />
            <Text style={[styles.settleButtonText, { color: theme.colors.onTertiary }]}>
              {isSettling ? "Settling..." : "Mark as Paid"}
            </Text>
          </TouchableOpacity>
        </Surface>
      );
    },
    [getParticipantName, handleSettleUp, isSettling, theme],
  );

  const renderSettlementItem = useCallback(
    (settlement: Settlement) => {
      const fromName = getParticipantName(settlement.from);
      const toName = getParticipantName(settlement.to);

      return (
        <Surface key={settlement.id} style={styles.settlementCard} elevation={2}>
          <View style={styles.settlementCardHeader}>
            <View style={[styles.settlementCardIcon, { backgroundColor: theme.colors.tertiaryContainer }]}>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.onTertiaryContainer} />
            </View>
            <View style={styles.settlementCardInfo}>
              <Text style={[styles.settlementCardTitle, { color: theme.colors.onSurface }]}>Payment Settled</Text>
              <Text style={[styles.settlementCardDescription, { color: theme.colors.onSurfaceVariant }]}>
                <Text style={[styles.settlementCardFrom, { color: theme.colors.onSurface }]}>{fromName}</Text> paid{" "}
                <Text style={[styles.settlementCardTo, { color: theme.colors.primary }]}>{toName}</Text>
              </Text>
            </View>
          </View>
          
          <View style={styles.settlementCardDetails}>
            <View style={styles.settlementCardAmountRow}>
              <Text style={[styles.settlementCardAmountLabel, { color: theme.colors.onSurfaceVariant }]}>Amount</Text>
              <Text style={[styles.settlementCardAmountValue, { color: theme.colors.onSurface }]}>
                {formatCurrency(settlement.amount, {
                  currency: settlement.currency,
                })}
              </Text>
            </View>
            <View style={styles.settlementCardDateRow}>
              <Ionicons name="time-outline" size={14} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.settlementCardDate, { color: theme.colors.onSurfaceVariant }]}>
                {formatDateTime(settlement.settledAt)}
              </Text>
            </View>
          </View>

          <View style={styles.settlementCardActions}>
            <TouchableOpacity
              style={styles.settlementCardActionButton}
              onPress={() => handleEditSettlement(settlement)}
            >
              <Ionicons name="pencil" size={18} color={theme.colors.primary} />
              <Text style={[styles.settlementCardActionText, { color: theme.colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settlementCardActionButton, styles.settlementCardActionButtonDanger]}
              onPress={() => handleDeleteSettlement(settlement.id)}
            >
              <Ionicons name="trash" size={18} color={theme.colors.error} />
              <Text style={[styles.settlementCardActionText, styles.settlementCardActionTextDanger, { color: theme.colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Surface>
      );
    },
    [getParticipantName, handleEditSettlement, handleDeleteSettlement, theme],
  );

  const renderParticipantBalance = useCallback(
    (participant: any) => {
      // Don't show fully settled participants in this list if their net balance is effectively zero
      if (Math.abs(participant.netBalance) < 0.01) return null;

      const isCreditor = participant.netBalance > 0;
      const isDebtor = participant.netBalance < 0;
      const isCurrentUserParticipant =
        participant.participantId === currentUserId;

      return (
        <Surface
          key={participant.participantId}
          style={[
            styles.participantBalanceItem,
            isCurrentUserParticipant &&
              [styles.highlightedParticipantBalanceItem, { backgroundColor: theme.colors.primaryContainer, borderLeftColor: theme.colors.primary }],
          ]}
          elevation={isCurrentUserParticipant ? 2 : 1}
        >
          <View style={styles.participantInfoContainer}>
            <View style={[styles.participantAvatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.participantInitial, { color: theme.colors.onPrimary }]}>
                {participant.participantName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.participantDetails}>
              <View style={styles.participantNameRow}>
                <Text style={[styles.participantName, { color: theme.colors.onSurface }]}>
                  {participant.participantName}
                </Text>
                {isCurrentUserParticipant && (
                  <View style={[styles.currentUserBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={[styles.currentUserText, { color: theme.colors.onPrimary }]}>You</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.participantSummaryText, { color: theme.colors.onSurfaceVariant }]}>
                Paid:{" "}
                {formatCurrency(participant.totalPaid, {
                  currency: trip?.currency || "USD",
                })}{" "}
                | Share:{" "}
                {formatCurrency(participant.totalOwed, {
                  currency: trip?.currency || "USD",
                })}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.netBalanceContainer,
              isCreditor && styles.owedBalance,
              isDebtor && styles.debtBalance,
            ]}
          >
            <Text
              style={[
                styles.netBalanceText,
                isCreditor && styles.owedText,
                isDebtor && styles.debtText,
              ]}
            >
              {isCreditor
                ? `+${formatCurrency(participant.netBalance, { currency: trip?.currency || "USD" })}`
                : isDebtor
                  ? `-${formatCurrency(Math.abs(participant.netBalance), { currency: trip?.currency || "USD" })}`
                  : formatCurrency(0, { currency: trip?.currency || "USD" })}
            </Text>
            <Text style={styles.netBalanceLabel}>
              {isCreditor ? "Gets Back" : isDebtor ? "Owes" : "Even"}
            </Text>
          </View>
        </Surface>
      );
    },
    [currentUserId, trip?.currency, theme],
  );

  if (!trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Settle Up</Text>
          <View style={{ width: 24 }} />
        </Surface>
        <EmptyState
          icon="alert-circle-outline"
          title="Trip Not Found"
          subtitle="The selected trip could not be loaded. Please go back and try again."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Settle Up</Text>
        <View style={{ width: 24 }} /> {/* Placeholder for right alignment */}
      </Surface>

      <Surface style={[styles.tabContainer, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "balances" && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setActiveTab("balances")}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.colors.onSurfaceVariant },
              activeTab === "balances" && { color: theme.colors.onPrimary },
            ]}
          >
            Balances
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "history" && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.colors.onSurfaceVariant },
              activeTab === "history" && { color: theme.colors.onPrimary },
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </Surface>

      {activeTab === "balances" && tripParticipants.length > 0 && (
        <View style={[styles.memberFilterContainer, { borderBottomColor: theme.colors.outlineVariant }]}>
          <Text style={[styles.memberFilterLabel, { color: theme.colors.onSurface }]}>View balances for:</Text>
          <View style={[styles.pickerContainer, { borderColor: theme.colors.outlineVariant }]}>
            <Picker
              selectedValue={selectedMemberId || ""}
              onValueChange={(value) => setSelectedMemberId(value)}
              style={styles.picker}
              dropdownIconColor={theme.colors.primary}
            >
              {tripParticipants.map((participant) => (
                <Picker.Item
                  key={participant.id}
                  label={participant.name}
                  value={participant.id}
                />
              ))}
            </Picker>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === "balances" ? (
          <>
            {selectedMemberId && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Individual Balance</Text>
                {filteredParticipantSpending.length === 0 ? (
                  <EmptyState
                    icon="people-outline"
                    title="No Balance"
                    subtitle="This member has no balance to display."
                  />
                ) : (
                  <View style={styles.listGroup}>
                    {filteredParticipantSpending.map(renderParticipantBalance)}
                  </View>
                )}
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                {selectedMemberId ? "Outstanding Payments" : "Simplified Payments"}
              </Text>
              {filteredBalances.length === 0 ? (
                <EmptyState
                  icon="checkmark-done-outline"
                  title="All Settled Up!"
                  subtitle={
                    selectedMemberId
                      ? "This member has no outstanding payments."
                      : "Everyone is squared away. No payments needed."
                  }
                />
              ) : (
                <View style={styles.listGroup}>
                  {filteredBalances.map((balance, index) =>
                    renderBalanceItem(balance, index),
                  )}
                </View>
              )}
            </View>

            {selectedMemberId && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Related Expenses</Text>
                  {relatedExpenses.length > 10 && (
                    <TouchableOpacity
                      onPress={() => setShowAllExpenses(!showAllExpenses)}
                      style={[styles.showAllButton, { backgroundColor: theme.colors.surfaceVariant }]}
                    >
                      <Text style={[styles.showAllButtonText, { color: theme.colors.primary }]}>
                        {showAllExpenses ? "Show Less" : `Show All (${relatedExpenses.length})`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {showAllExpenses && (
                  <Surface style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]} elevation={0}>
                    <View style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <Ionicons name="search-outline" size={20} color={theme.colors.onSurfaceVariant} style={styles.searchIcon} />
                      <TextInput
                        style={[styles.searchInput, { color: theme.colors.onSurface }]}
                        placeholder="Search expenses..."
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        value={expenseSearchQuery}
                        onChangeText={setExpenseSearchQuery}
                        returnKeyType="search"
                      />
                      {expenseSearchQuery.length > 0 && (
                        <TouchableOpacity 
                          onPress={() => setExpenseSearchQuery('')}
                          style={styles.clearButton}
                        >
                          <Ionicons name="close-circle" size={20} color={theme.colors.onSurfaceVariant} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </Surface>
                )}

                {displayedExpenses.length === 0 ? (
                  <EmptyState
                    icon="search-outline"
                    title={expenseSearchQuery ? "No Results" : "No Expenses"}
                    subtitle={expenseSearchQuery ? `No expenses match "${expenseSearchQuery}"` : "No related expenses found."}
                  />
                ) : (
                  <Surface style={styles.listGroup} elevation={1}>
                    {displayedExpenses.map((expense) => (
                      <TouchableOpacity
                        key={expense.id}
                        style={[styles.expenseItem, { borderBottomColor: theme.colors.outlineVariant }]}
                        onPress={() => navigation.navigate('ExpenseDetail', {
                          expenseId: expense.id,
                          tripId: trip.id,
                        })}
                      >
                        <View style={styles.expenseInfo}>
                          <Text style={[styles.expenseDescription, { color: theme.colors.onSurface }]}>
                            {expense.description || 'No description'}
                          </Text>
                          <Text style={[styles.expenseDetails, { color: theme.colors.onSurfaceVariant }]}>
                            {expense.paidBy === selectedMemberId
                              ? "You paid"
                              : `${getParticipantName(expense.paidBy) || 'Unknown'} paid`}{" "}
                            <Text>{formatCurrency(expense.amount, {
                              currency: expense.currency,
                            })}</Text>
                          </Text>
                          <Text style={[styles.expenseDate, { color: theme.colors.onSurfaceVariant }]}>
                            {formatDateTime(expense.createdAt || expense.date)}
                          </Text>
                        </View>
                        <View style={styles.expenseAmountContainer}>
                          <Text style={[styles.expenseAmount, { color: theme.colors.primary }]}>
                            {formatCurrency(expense.amount, {
                              currency: expense.currency,
                            })}
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceVariant} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </Surface>
                )}
              </View>
            )}
          </>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Settlement History</Text>
            {tripSettlements.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="No Settlements Recorded"
                subtitle="Payments you record will appear here."
              />
            ) : (
              <View style={styles.listGroup}>
                {tripSettlements.map(renderSettlementItem)}
              </View>
            )}
          </View>
        )}
        <View style={{ height: 40 }} /> {/* Bottom padding */}
      </ScrollView>

      {/* User Identification Modal */}
      <Modal
        visible={showUserIdentificationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUserIdentificationModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowUserIdentificationModal(false)}
        >
          <Surface style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} elevation={8}>
            {IS_IOS && <View style={[styles.modalHandle, { backgroundColor: theme.colors.onSurfaceVariant }]} />}

            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Identify Yourself</Text>
              <TouchableOpacity
                onPress={() => setShowUserIdentificationModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.participantList}>
              <Text style={[styles.modalDescription, { color: theme.colors.onSurfaceVariant }]}>
                Please select which member you are to properly track your
                balances and settlements.
              </Text>
              {(trip?.participants || []).map((participant) => (
                <TouchableOpacity
                  key={participant.id}
                  style={[styles.participantSelectionItem, { borderBottomColor: theme.colors.outlineVariant }]}
                  onPress={() => handleIdentifyUser(participant.id)}
                >
                  <View style={styles.participantSelectionInfo}>
                    <View style={[styles.participantSelectionAvatar, { backgroundColor: theme.colors.primary }]}>
                      <Text style={[styles.participantSelectionInitial, { color: theme.colors.onPrimary }]}>
                        {participant.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.participantSelectionDetails}>
                      <Text style={[styles.participantSelectionName, { color: theme.colors.onSurface }]}>
                        {participant.name}
                      </Text>
                      {participant.email && (
                        <Text style={[styles.participantSelectionEmail, { color: theme.colors.onSurfaceVariant }]}>
                          {participant.email}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Surface>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 12,
  },
  listGroup: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
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
  balanceCardContent: {
    marginBottom: 16,
  },
  balanceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  balanceCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  balanceCardInfo: {
    flex: 1,
  },
  balanceCardFrom: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  balanceCardArrow: {
    marginVertical: 4,
  },
  balanceCardTo: {
    fontSize: 16,
    fontWeight: "600",
  },
  balanceCardAmount: {
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  balanceCardAmountLabel: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  balanceCardAmountValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  settleButtonCard: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#10b981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  disabledSettleButtonCard: {
    opacity: 0.7,
  },
  settleButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },

  participantBalanceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F2F2F7",
  },
  participantInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#8b5cf6",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  participantInitial: {
    fontSize: 18,
    fontWeight: "bold",
  },
  participantDetails: {
    flex: 1,
  },
  highlightedParticipantBalanceItem: {
    borderLeftWidth: 4,
    borderRadius: 0,
    marginHorizontal: 0,
    paddingLeft: 16,
  },
  participantNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 6,
  },
  currentUserBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
    marginLeft: 10,
  },
  currentUserText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  participantSummaryText: {
    fontSize: 13,
  },
  netBalanceContainer: {
    alignItems: "flex-end",
  },
  netBalanceText: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  owedBalance: {
    // Styles for netBalance > 0 (gets back)
  },
  debtBalance: {
    // Styles for netBalance < 0 (owes)
  },
  owedText: {
    // Green for money to get back - use success color
  },
  debtText: {
    // Red for money owed - use error color
  },
  netBalanceLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  // Settlement History Card
  settlementCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
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
  settlementCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  settlementCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settlementCardInfo: {
    flex: 1,
  },
  settlementCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  settlementCardDescription: {
    fontSize: 15,
  },
  settlementCardFrom: {
    fontWeight: "600",
  },
  settlementCardTo: {
    fontWeight: "600",
  },
  settlementCardDetails: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  settlementCardAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  settlementCardAmountLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  settlementCardAmountValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  settlementCardDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  settlementCardDate: {
    fontSize: 13,
  },
  settlementCardActions: {
    flexDirection: "row",
    gap: 12,
  },
  settlementCardActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  settlementCardActionButtonDanger: {
    // Error background color
  },
  settlementCardActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  settlementCardActionTextDanger: {
    // Error text color
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: IS_IOS ? 34 : 20,
    maxHeight: "80%",
    width: SCREEN_WIDTH, // Ensure modal takes full width
  },
  modalHandle: {
    width: 36,
    height: 5,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  participantList: {
    maxHeight: Dimensions.get("window").height * 0.5, // Limit height
  },
  participantSelectionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  participantSelectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  participantSelectionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  participantSelectionInitial: {
    fontSize: 18,
    fontWeight: "bold",
  },
  participantSelectionDetails: {
    flex: 1,
  },
  participantSelectionName: {
    fontSize: 16,
    fontWeight: "600",
  },
  participantSelectionEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  memberFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  memberFilterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  pickerContainer: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  picker: {
    height: Platform.OS === "ios" ? 200 : 50,
  },
  expenseItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  expenseDetails: {
    fontSize: 13,
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 12,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  expenseAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  showAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  showAllButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
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
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
});
