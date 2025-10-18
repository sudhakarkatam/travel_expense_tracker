import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { getCurrencySymbol } from '@/constants/currencies';
import { ExpenseCategory, SplitParticipant } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X, Scan } from 'lucide-react-native';
import * as Icons from 'lucide-react-native';
import { generateText } from '@rork/toolkit-sdk';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const { addExpense, user, trips, getTrip } = useApp();

  const trip = tripId ? getTrip(tripId) : null;

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedTripId, setSelectedTripId] = useState(tripId || trips[0]?.id || '');
  const [splitBetween, setSplitBetween] = useState<string[]>([user?.id || 'user_1']);
  const [isScanning, setIsScanning] = useState(false);

  const selectedTrip = getTrip(selectedTripId);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const handleScanReceipt = async () => {
    if (!photos || photos.length === 0) {
      Alert.alert('No photo', 'Please add a photo first to scan');
      return;
    }

    setIsScanning(true);
    try {
      const imageUri = photos[photos.length - 1];
      let base64Image = imageUri;

      if (!imageUri.startsWith('data:')) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const reader = new FileReader();
        base64Image = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const result = await generateText({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                image: base64Image,
              },
              {
                type: 'text',
                text: 'Extract the total amount and description from this receipt. Return in format: "Amount: X.XX | Description: short description". If you cannot read the receipt, just say "Cannot read receipt".',
              },
            ],
          },
        ],
      });

      const match = result.match(/Amount:\s*([0-9.]+).*Description:\s*(.+)/i);
      if (match) {
        setAmount(match[1]);
        setDescription(match[2].trim());
        Alert.alert('Success', 'Receipt scanned successfully!');
      } else {
        Alert.alert('Scan failed', 'Could not extract data from receipt');
      }
    } catch (error) {
      console.error('OCR error:', error);
      Alert.alert('Error', 'Failed to scan receipt');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const toggleParticipant = (participantId: string) => {
    if (splitBetween.includes(participantId)) {
      if (splitBetween.length > 1) {
        setSplitBetween(splitBetween.filter(id => id !== participantId));
      }
    } else {
      setSplitBetween([...splitBetween, participantId]);
    }
  };

  const handleCreate = async () => {
    if (!selectedTripId) {
      Alert.alert('Error', 'Please select a trip');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    const amountValue = parseFloat(amount);
    const splitAmount = amountValue / splitBetween.length;

    const splitParticipants: SplitParticipant[] = splitBetween.map(participantId => {
      const participant = selectedTrip?.participants.find(p => p.id === participantId);
      return {
        userId: participantId,
        userName: participant?.name || 'Unknown',
        amount: splitAmount,
        isPaid: participantId === user?.id,
      };
    });

    await addExpense({
      tripId: selectedTripId,
      amount: amountValue,
      currency: selectedTrip?.currency || 'USD',
      category,
      description: description.trim(),
      date,
      photos,
      paidBy: user?.id || 'user_1',
      splitBetween: splitParticipants,
    });

    router.back();
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ size: number; color: string }>>)[iconName];
    return IconComponent || Icons.MoreHorizontal;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Trip *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tripSelector}>
            {trips.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.tripChip,
                  selectedTripId === t.id && styles.tripChipSelected,
                ]}
                onPress={() => {
                  setSelectedTripId(t.id);
                  setSplitBetween([user?.id || 'user_1']);
                }}
              >
                <Text
                  style={[
                    styles.tripChipText,
                    selectedTripId === t.id && styles.tripChipTextSelected,
                  ]}
                >
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Amount *</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>
              {getCurrencySymbol(selectedTrip?.currency || 'USD')}
            </Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="What did you pay for?"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {EXPENSE_CATEGORIES.map((cat) => {
              const IconComponent = getCategoryIcon(cat.icon);
              const isSelected = category === cat.id;

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    { borderColor: cat.color },
                    isSelected && { backgroundColor: `${cat.color}20` },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <IconComponent size={20} color={cat.color} />
                  <Text style={[styles.categoryLabel, { color: cat.color }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Photos</Text>
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
              <Camera size={20} color="#6366F1" />
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
              <Image
                source={{ uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjEgMTVWMTlBMiAyIDAgMCAxIDE5IDIxSDVBMiAyIDAgMCAxIDMgMTlWMTVNMTcgOEwxMiAzTTEyIDNMNyA4TTEyIDNWMTUiIHN0cm9rZT0iIzYzNjZGMSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=' }}
                style={{ width: 20, height: 20, tintColor: '#6366F1' }}
              />
              <Text style={styles.photoButtonText}>Upload</Text>
            </TouchableOpacity>
            {photos.length > 0 && (
              <TouchableOpacity 
                style={[styles.photoButton, isScanning && styles.photoButtonDisabled]} 
                onPress={handleScanReceipt}
                disabled={isScanning}
              >
                <Scan size={20} color={isScanning ? '#94A3B8' : '#6366F1'} />
                <Text style={[styles.photoButtonText, isScanning && styles.photoButtonTextDisabled]}>
                  {isScanning ? 'Scanning...' : 'Scan Receipt'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {selectedTrip?.isGroup && selectedTrip.participants.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.label}>Split Between</Text>
            <View style={styles.participantsGrid}>
              {selectedTrip.participants.map((participant) => {
                const isSelected = splitBetween.includes(participant.id);
                return (
                  <TouchableOpacity
                    key={participant.id}
                    style={[
                      styles.participantChip,
                      isSelected && styles.participantChipSelected,
                    ]}
                    onPress={() => toggleParticipant(participant.id)}
                  >
                    <Text
                      style={[
                        styles.participantName,
                        isSelected && styles.participantNameSelected,
                      ]}
                    >
                      {participant.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.splitInfo}>
              {splitBetween.length} {splitBetween.length === 1 ? 'person' : 'people'} •{' '}
              {getCurrencySymbol(selectedTrip.currency)}
              {amount ? (parseFloat(amount) / splitBetween.length).toFixed(2) : '0.00'} per person
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
          <Text style={styles.createButtonText}>Add Expense</Text>
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
    marginBottom: 24,
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
  tripSelector: {
    flexDirection: 'row',
  },
  tripChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  tripChipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  tripChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  tripChipTextSelected: {
    color: '#FFFFFF',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingLeft: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: '#6366F1',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600' as const,
    color: '#1E293B',
    padding: 16,
    paddingLeft: 0,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    marginRight: 8,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoButtonDisabled: {
    opacity: 0.5,
  },
  photoButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6366F1',
  },
  photoButtonTextDisabled: {
    color: '#94A3B8',
  },
  photoList: {
    flexDirection: 'row',
  },
  photoItem: {
    position: 'relative',
    marginRight: 12,
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  participantChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  participantChipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  participantNameSelected: {
    color: '#FFFFFF',
  },
  splitInfo: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
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
