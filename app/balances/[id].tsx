import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ArrowRight, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp, useTripData } from '@/contexts/AppContext';
import { getCurrencySymbol } from '@/constants/currencies';
import { getTotalOwed, getTotalOwedToYou } from '@/utils/balance';

export default function BalancesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addSettlement, user } = useApp();
  const tripData = useTripData(id);

  if (!tripData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Trip not found</Text>
      </View>
    );
  }

  const { trip, balances } = tripData;

  const myBalances = balances.filter(
    b => b.from === user?.id || b.to === user?.id
  );

  const totalIOwe = getTotalOwed(balances, user?.id || '');
  const totalOwedToMe = getTotalOwedToYou(balances, user?.id || '');
  const netBalance = totalOwedToMe - totalIOwe;

  const handleSettleUp = (from: string, to: string, amount: number) => {
    const fromParticipant = trip.participants.find(p => p.id === from);
    const toParticipant = trip.participants.find(p => p.id === to);

    Alert.alert(
      'Settle Up',
      `Mark ${getCurrencySymbol(trip.currency)}${amount.toFixed(2)} as paid from ${fromParticipant?.name} to ${toParticipant?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle',
          onPress: async () => {
            await addSettlement({
              tripId: trip.id,
              from,
              to,
              amount,
              currency: trip.currency,
            });
            Alert.alert('Success', 'Payment settled!');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Balances',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={netBalance >= 0 ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryTitle}>
              {netBalance > 0 ? 'You are owed' : netBalance < 0 ? 'You owe' : 'All settled up!'}
            </Text>
            <Text style={styles.summaryAmount}>
              {getCurrencySymbol(trip.currency)}{Math.abs(netBalance).toFixed(2)}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>You owe</Text>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {getCurrencySymbol(trip.currency)}{totalIOwe.toFixed(2)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Owed to you</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {getCurrencySymbol(trip.currency)}{totalOwedToMe.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Balances</Text>

          {myBalances.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={48} color="#10B981" />
              <Text style={styles.emptyText}>All settled up!</Text>
              <Text style={styles.emptySubtext}>
                You have no pending balances
              </Text>
            </View>
          ) : (
            myBalances.map((balance, index) => {
              const isYouOwing = balance.from === user?.id;
              const otherPersonId = isYouOwing ? balance.to : balance.from;
              const otherPerson = trip.participants.find(p => p.id === otherPersonId);

              return (
                <View key={index} style={styles.balanceCard}>
                  <View style={styles.balanceInfo}>
                    <Text style={styles.balanceName}>
                      {isYouOwing ? 'You owe' : 'owes you'}
                    </Text>
                    <Text style={styles.balanceOther}>
                      {isYouOwing ? otherPerson?.name : otherPerson?.name}
                    </Text>
                  </View>

                  <View style={styles.balanceRight}>
                    <Text
                      style={[
                        styles.balanceAmount,
                        { color: isYouOwing ? '#EF4444' : '#10B981' },
                      ]}
                    >
                      {getCurrencySymbol(balance.currency)}{balance.amount.toFixed(2)}
                    </Text>

                    {isYouOwing && (
                      <TouchableOpacity
                        style={styles.settleButton}
                        onPress={() =>
                          handleSettleUp(balance.from, balance.to, balance.amount)
                        }
                      >
                        <Text style={styles.settleButtonText}>Settle</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Balances</Text>

          {balances.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={48} color="#10B981" />
              <Text style={styles.emptyText}>All settled up!</Text>
              <Text style={styles.emptySubtext}>
                Everyone in the group has been paid back
              </Text>
            </View>
          ) : (
            balances.map((balance, index) => {
              const fromPerson = trip.participants.find(p => p.id === balance.from);
              const toPerson = trip.participants.find(p => p.id === balance.to);

              return (
                <View key={index} style={styles.balanceCard}>
                  <View style={styles.balanceFlow}>
                    <Text style={styles.balanceFlowName}>
                      {fromPerson?.name}
                    </Text>
                    <ArrowRight size={20} color="#94A3B8" />
                    <Text style={styles.balanceFlowName}>
                      {toPerson?.name}
                    </Text>
                  </View>

                  <Text style={styles.balanceAmount}>
                    {getCurrencySymbol(balance.currency)}{balance.amount.toFixed(2)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            • Balances are calculated based on who paid and how expenses were split
          </Text>
          <Text style={styles.infoText}>
            • When you settle up, the balance is marked as paid
          </Text>
          <Text style={styles.infoText}>
            • The app simplifies balances to minimize transactions
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    color: '#64748B',
  },
  summaryCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  summaryGradient: {
    padding: 24,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#10B981',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  balanceInfo: {
    flex: 1,
  },
  balanceName: {
    fontSize: 14,
    color: '#64748B',
  },
  balanceOther: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1E293B',
    marginTop: 2,
  },
  balanceRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1E293B',
  },
  settleButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  settleButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  balanceFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  balanceFlowName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1E293B',
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    marginBottom: 4,
    lineHeight: 18,
  },
});
