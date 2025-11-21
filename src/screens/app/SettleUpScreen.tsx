import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Surface, Avatar } from "react-native-paper";
import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/utils/currencyFormatter";
import { formatDateTime } from "@/utils/dateFormatter";
import { MotiView } from "moti";

const { width } = Dimensions.get("window");

interface SettleUpScreenProps {
  navigation: any;
  route: any;
}

interface Debt {
  from: string;
  to: string;
  amount: number;
  currency: string;
}

export default function SettleUpScreen({ navigation, route }: SettleUpScreenProps) {
  const theme = useTheme();
  const { tripId } = route.params;
  const { getTrip, getTripExpenses, settlements, addSettlement, deleteSettlement, user } = useApp();

  const trip = useMemo(() => getTrip(tripId), [tripId, getTrip]);
  const expenses = useMemo(() => getTripExpenses(tripId), [tripId, getTripExpenses]);
  const tripSettlements = useMemo(() => settlements.filter(s => s.tripId === tripId), [settlements, tripId]);

  const [activeTab, setActiveTab] = useState<"balances" | "history">("balances");

  // --- Debt Calculation Logic ---
  const simplifiedDebts = useMemo(() => {
    if (!trip) return [];

    const balances: Record<string, number> = {};
    const currency = trip.currency || 'USD'; // Assuming single currency for simplicity for now

    // Initialize balances
    trip.participants.forEach(p => {
      balances[p.id] = 0;
    });

    // Process Expenses
    expenses.forEach(expense => {
      const paidBy = expense.paidBy;
      const amount = expense.amount;

      // Add to payer's balance (they are owed money)
      if (balances[paidBy] !== undefined) {
        balances[paidBy] += amount;
      }

      // Subtract from split participants (they owe money)
      // Logic depends on how split is stored. Assuming equal split for now if not specified, 
      // but ideally expense.splitBy should be used.
      // If expense.splitBy is defined, use it. Otherwise split equally among all participants?
      // Actually, usually 'splitBy' contains the list of people involved.

      const splitAmong = expense.splitBy || trip.participants.map(p => p.id);
      const splitAmount = amount / splitAmong.length;

      splitAmong.forEach(participantId => {
        if (balances[participantId] !== undefined) {
          balances[participantId] -= splitAmount;
        }
      });
    });

    // Process Settlements (already paid)
    tripSettlements.forEach(settlement => {
      if (balances[settlement.from] !== undefined) {
        balances[settlement.from] += settlement.amount;
      }
      if (balances[settlement.to] !== undefined) {
        balances[settlement.to] -= settlement.amount;
      }
    });

    // Separate into debtors and creditors
    let debtors: { id: string; amount: number }[] = [];
    let creditors: { id: string; amount: number }[] = [];

    Object.entries(balances).forEach(([id, amount]) => {
      // Round to 2 decimal places to avoid floating point errors
      const roundedAmount = Math.round(amount * 100) / 100;
      if (roundedAmount < -0.01) {
        debtors.push({ id, amount: roundedAmount });
      } else if (roundedAmount > 0.01) {
        creditors.push({ id, amount: roundedAmount });
      }
    });

    // Sort by magnitude (descending) to minimize transactions
    debtors.sort((a, b) => a.amount - b.amount); // Ascending (most negative first)
    creditors.sort((a, b) => b.amount - a.amount); // Descending (most positive first)

    const debts: Debt[] = [];
    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      // The amount to settle is the minimum of the debt or the credit
      const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

      // Round to 2 decimals
      const roundedAmount = Math.round(amount * 100) / 100;

      if (roundedAmount > 0) {
        debts.push({
          from: debtor.id,
          to: creditor.id,
          amount: roundedAmount,
          currency: currency
        });
      }

      // Adjust remaining amounts
      debtor.amount += roundedAmount;
      creditor.amount -= roundedAmount;

      // Check if settled (using small epsilon for float comparison)
      if (Math.abs(debtor.amount) < 0.01) i++;
      if (Math.abs(creditor.amount) < 0.01) j++;
    }

    return debts;
  }, [trip, expenses, tripSettlements]);

  const getParticipantName = (id: string) => {
    return trip?.participants.find(p => p.id === id)?.name || 'Unknown';
  };

  const handleSettle = (debt: Debt) => {
    Alert.alert(
      "Confirm Settlement",
      `Mark ${formatCurrency(debt.amount, { currency: debt.currency })} as paid from ${getParticipantName(debt.from)} to ${getParticipantName(debt.to)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            await addSettlement({
              tripId,
              from: debt.from,
              to: debt.to,
              amount: debt.amount,
              currency: debt.currency,
              notes: 'Settled via app',
            });
          }
        }
      ]
    );
  };

  const handleDeleteSettlement = (id: string) => {
    Alert.alert(
      "Delete Settlement",
      "Are you sure you want to delete this settlement record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSettlement(id);
          }
        }
      ]
    );
  };

  if (!trip) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Settle Up</Text>
        <View style={styles.backButton} />
      </Surface>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'balances' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('balances')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'balances' ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
            Balances
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'history' ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'balances' ? (
          simplifiedDebts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={64} color={theme.colors.primary} />
              <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>All settled up!</Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>No one owes anything.</Text>
            </View>
          ) : (
            simplifiedDebts.map((debt, index) => (
              <MotiView
                key={`${debt.from}-${debt.to}-${index}`}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: index * 100 }}
              >
                <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                  <View style={styles.cardRow}>
                    <View style={styles.participantInfo}>
                      <Avatar.Text size={40} label={getParticipantName(debt.from).charAt(0)} style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.onSurfaceVariant} />
                      <Text style={[styles.name, { color: theme.colors.onSurface }]}>{getParticipantName(debt.from)}</Text>
                    </View>

                    <View style={styles.arrowContainer}>
                      <Text style={[styles.amount, { color: theme.colors.error }]}>
                        {formatCurrency(debt.amount, { currency: debt.currency })}
                      </Text>
                      <Ionicons name="arrow-forward" size={20} color={theme.colors.onSurfaceVariant} />
                    </View>

                    <View style={styles.participantInfo}>
                      <Avatar.Text size={40} label={getParticipantName(debt.to).charAt(0)} style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.onPrimaryContainer} />
                      <Text style={[styles.name, { color: theme.colors.onSurface }]}>{getParticipantName(debt.to)}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.settleButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleSettle(debt)}
                  >
                    <Text style={[styles.settleButtonText, { color: theme.colors.onPrimary }]}>Mark as Paid</Text>
                  </TouchableOpacity>
                </Surface>
              </MotiView>
            ))
          )
        ) : (
          tripSettlements.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={64} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>No history</Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>Settlements will appear here.</Text>
            </View>
          ) : (
            tripSettlements.map((settlement, index) => (
              <Surface key={settlement.id} style={[styles.historyCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyDate, { color: theme.colors.onSurfaceVariant }]}>
                    {formatDateTime(settlement.settledAt)}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteSettlement(settlement.id)}>
                    <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
                <View style={styles.historyContent}>
                  <Text style={[styles.historyText, { color: theme.colors.onSurface }]}>
                    <Text style={{ fontWeight: 'bold' }}>{getParticipantName(settlement.from)}</Text> paid <Text style={{ fontWeight: 'bold' }}>{getParticipantName(settlement.to)}</Text>
                  </Text>
                  <Text style={[styles.historyAmount, { color: theme.colors.primary }]}>
                    {formatCurrency(settlement.amount, { currency: settlement.currency })}
                  </Text>
                </View>
              </Surface>
            ))
          )
        )}
      </ScrollView>
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  participantInfo: {
    alignItems: 'center',
    width: 80,
  },
  name: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  arrowContainer: {
    alignItems: 'center',
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  settleButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  settleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
  },
  historyCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 12,
  },
  historyContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyText: {
    fontSize: 14,
    flex: 1,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
