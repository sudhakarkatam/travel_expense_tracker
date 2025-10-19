import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { calculateBalances, simplifyBalances, suggestSettlements, getParticipantSpending } from '@/utils/splitCalculations';

export default function SettleUpScreen({ navigation, route }: any) {
  const { tripId } = route.params;
  const { getTrip, getTripExpenses, settlements, addSettlement } = useApp();
  const trip = getTrip(tripId);
  
  const [activeTab, setActiveTab] = useState<'balances' | 'settlements'>('balances');
  const [isSettling, setIsSettling] = useState(false);

  // Helper function to get participant name with fallback
  const getParticipantName = (participantId: string): string => {
    const participant = trip?.participants?.find(p => p.id === participantId);
    if (participant) {
      return participant.name;
    }
    
    // Fallback: try to find name from expenses
    const tripExpenses = getTripExpenses(tripId) || [];
    for (const expense of tripExpenses) {
      const splitParticipant = expense.splitBetween?.find(s => s.userId === participantId);
      if (splitParticipant) {
        return splitParticipant.userName;
      }
    }
    
    return participantId; // Last resort: return the ID
  };

  const tripExpenses = getTripExpenses(tripId) || [];
  const tripSettlements = (settlements || []).filter(s => s.tripId === tripId);

  const balances = calculateBalances(tripExpenses, tripSettlements);
  const simplifiedBalances = simplifyBalances(balances);
  const settlementSuggestions = suggestSettlements(balances);
  const participantSpending = getParticipantSpending(tripExpenses, tripSettlements);

  const handleSettleUp = async (from: string, to: string, amount: number) => {
    Alert.alert(
      'Settle Up',
      `Mark payment of ₹${amount.toFixed(2)} from ${from} to ${to} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Paid',
          onPress: async () => {
            setIsSettling(true);
            try {
              await addSettlement({
                tripId,
                from,
                to,
                amount,
                currency: trip?.currency || 'INR', // Use trip currency instead of hardcoded SGD
              });
              Alert.alert('Success', 'Payment marked as completed!');
            } catch (error) {
              Alert.alert('Error', 'Failed to record settlement. Please try again.');
            } finally {
              setIsSettling(false);
            }
          },
        },
      ]
    );
  };

  const renderBalanceItem = (balance: any, index: number) => {
    const fromName = getParticipantName(balance.from);
    const toName = getParticipantName(balance.to);
    
    return (
      <View key={`${balance.from}-${balance.to}-${index}`} style={styles.balanceItem}>
        <View style={styles.balanceInfo}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceAmount}>₹{balance.amount.toFixed(2)}</Text>
            <Text style={styles.balanceCurrency}>{balance.currency}</Text>
          </View>
          <Text style={styles.balanceDescription}>
            {fromName} owes {toName}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.settleButton, isSettling && styles.disabledSettleButton]}
          onPress={() => handleSettleUp(balance.from, balance.to, balance.amount)}
          disabled={isSettling}
        >
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            <Text style={styles.settleButtonText}>
              {isSettling ? 'Settling...' : 'Settle'}
            </Text>
          </TouchableOpacity>
      </View>
    );
  };

  const renderSettlementItem = (settlement: any) => {
    const fromName = getParticipantName(settlement.from);
    const toName = getParticipantName(settlement.to);
    
    return (
      <View key={settlement.id} style={styles.settlementItem}>
        <View style={styles.settlementInfo}>
          <View style={styles.settlementHeader}>
            <Text style={styles.settlementAmount}>₹{settlement.amount.toFixed(2)}</Text>
            <View style={styles.settledBadge}>
              <Ionicons name="checkmark" size={12} color="white" />
              <Text style={styles.settledText}>Settled</Text>
            </View>
          </View>
          <Text style={styles.settlementDescription}>
            {fromName} paid {toName}
          </Text>
          <Text style={styles.settlementDate}>
            {new Date(settlement.settledAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  };

  const renderParticipantBalance = (participant: any) => {
    const isOwed = participant.netBalance > 0;
    const isDebtor = participant.netBalance < 0;
    
    return (
      <View key={participant.participantId} style={styles.participantBalanceItem}>
        <View style={styles.participantInfo}>
          <View style={styles.participantAvatar}>
            <Text style={styles.participantInitial}>
              {participant.participantName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.participantDetails}>
            <Text style={styles.participantName}>{participant.participantName}</Text>
            <Text style={styles.participantSummary}>
              Paid: ₹{participant.totalPaid.toFixed(2)} | Owed: ₹{participant.totalOwed.toFixed(2)}
            </Text>
          </View>
        </View>
        
        <View style={[
          styles.netBalanceContainer,
          isOwed && styles.owedBalance,
          isDebtor && styles.debtBalance,
        ]}>
          <Text style={[
            styles.netBalanceText,
            isOwed && styles.owedText,
            isDebtor && styles.debtText,
          ]}>
            {isOwed ? `+₹${participant.netBalance.toFixed(2)}` : 
             isDebtor ? `-₹${Math.abs(participant.netBalance).toFixed(2)}` : 
             '₹0.00'}
          </Text>
          <Text style={styles.netBalanceLabel}>
            {isOwed ? 'Owed' : isDebtor ? 'Owes' : 'Even'}
          </Text>
        </View>
      </View>
    );
  };

  if (!trip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Trip not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Settle Up</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'balances' && styles.activeTab]}
          onPress={() => setActiveTab('balances')}
        >
          <Text style={[styles.tabText, activeTab === 'balances' && styles.activeTabText]}>
            Balances
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settlements' && styles.activeTab]}
          onPress={() => setActiveTab('settlements')}
        >
          <Text style={[styles.tabText, activeTab === 'settlements' && styles.activeTabText]}>
            Settlements
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'balances' ? (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Outstanding Balances</Text>
              {simplifiedBalances.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                  <Text style={styles.emptyTitle}>All Settled Up!</Text>
                  <Text style={styles.emptySubtitle}>No outstanding balances to settle.</Text>
                </View>
              ) : (
                simplifiedBalances.map((balance, index) => renderBalanceItem(balance, index))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Participant Balances</Text>
              {participantSpending.map((participant) => renderParticipantBalance(participant))}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settlement History</Text>
            {tripSettlements.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No Settlements Yet</Text>
                <Text style={styles.emptySubtitle}>Settlements will appear here once marked as paid.</Text>
              </View>
            ) : (
              tripSettlements.map((settlement) => renderSettlementItem(settlement))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#8b5cf6',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  balanceCurrency: {
    fontSize: 14,
    color: '#666',
  },
  balanceDescription: {
    fontSize: 14,
    color: '#666',
  },
  settleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#22c55e',
    borderRadius: 6,
    gap: 4,
  },
  settleButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  settlementItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  settlementInfo: {
    flex: 1,
  },
  settlementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  settlementAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  settledText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  settlementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  settlementDate: {
    fontSize: 12,
    color: '#999',
  },
  participantBalanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  participantInitial: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  participantSummary: {
    fontSize: 12,
    color: '#666',
  },
  netBalanceContainer: {
    alignItems: 'flex-end',
  },
  owedBalance: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  debtBalance: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  netBalanceText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  owedText: {
    color: '#22c55e',
  },
  debtText: {
    color: '#ef4444',
  },
  netBalanceLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
  disabledSettleButton: {
    backgroundColor: '#d1d5db',
    opacity: 0.6,
  },
});
