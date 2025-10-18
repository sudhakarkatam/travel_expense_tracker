import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { CURRENCIES } from '@/constants/currencies';
import { Participant } from '@/types';

export default function AddTripScreen() {
  const router = useRouter();
  const { addTrip, user } = useApp();

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [isGroup, setIsGroup] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a trip name');
      return;
    }
    if (!destination.trim()) {
      Alert.alert('Error', 'Please enter a destination');
      return;
    }
    if (!budget || parseFloat(budget) <= 0) {
      Alert.alert('Error', 'Please enter a valid budget');
      return;
    }

    const participants: Participant[] = [
      {
        id: user?.id || 'user_1',
        name: user?.name || 'Me',
        isOwner: true,
      },
    ];

    const inviteCode = isGroup ? `TRIP${Date.now().toString().slice(-6)}` : undefined;

    await addTrip({
      name: name.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      budget: parseFloat(budget),
      currency,
      isGroup,
      participants,
      createdBy: user?.id || 'user_1',
      inviteCode,
    });

    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Trip Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Summer Vacation 2025"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Destination *</Text>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="e.g. Paris, France"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.label}>End Date</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.label}>Budget *</Text>
            <TextInput
              style={styles.input}
              value={budget}
              onChangeText={setBudget}
              placeholder="1000"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.label}>Currency</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
            >
              <Text style={styles.inputText}>{currency}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showCurrencyPicker && (
          <View style={styles.currencyPicker}>
            <ScrollView style={styles.currencyList} showsVerticalScrollIndicator={false}>
              {CURRENCIES.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={styles.currencyItem}
                  onPress={() => {
                    setCurrency(curr.code);
                    setShowCurrencyPicker(false);
                  }}
                >
                  <Text style={styles.currencyCode}>{curr.code}</Text>
                  <Text style={styles.currencyName}>{curr.name}</Text>
                  <Text style={styles.currencySymbol}>{curr.symbol}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.label}>Group Trip</Text>
              <Text style={styles.switchDescription}>
                Share expenses with friends
              </Text>
            </View>
            <Switch
              value={isGroup}
              onValueChange={setIsGroup}
              trackColor={{ false: '#E2E8F0', true: '#A5B4FC' }}
              thumbColor={isGroup ? '#6366F1' : '#CBD5E1'}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
          <Text style={styles.createButtonText}>Create Trip</Text>
        </TouchableOpacity>
      </View>
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
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputText: {
    fontSize: 16,
    color: '#1E293B',
  },
  currencyPicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    maxHeight: 200,
  },
  currencyList: {
    flex: 1,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1E293B',
    width: 60,
  },
  currencyName: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6366F1',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchInfo: {
    flex: 1,
  },
  switchDescription: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
