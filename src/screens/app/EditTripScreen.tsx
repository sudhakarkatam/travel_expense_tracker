import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Surface, Switch, TextInput, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useApp } from '@/contexts/AppContext';
import DatePickerInput from '@/components/DatePickerInput';
import { pickImage, saveImage, deleteImage } from '@/utils/imageStorage';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { AnimatedInput } from '@/components/ui/AnimatedInput';

interface EditTripScreenProps {
  navigation: any;
  route: any;
}

export default function EditTripScreen({ navigation, route }: EditTripScreenProps) {
  const theme = useTheme();
  
  // Safe defaults for theme colors to prevent runtime errors
  const safeTheme = {
    colors: {
      background: theme?.colors?.background || '#FFFFFF',
      surface: theme?.colors?.surface || '#FFFFFF',
      surfaceVariant: theme?.colors?.surfaceVariant || '#F5F5F5',
      onSurface: theme?.colors?.onSurface || '#000000',
      onSurfaceVariant: theme?.colors?.onSurfaceVariant || '#666666',
      primary: theme?.colors?.primary || '#8b5cf6',
      onPrimary: theme?.colors?.onPrimary || '#FFFFFF',
      primaryContainer: theme?.colors?.primaryContainer || '#EDE9FE',
      onPrimaryContainer: theme?.colors?.onPrimaryContainer || '#000000',
      error: theme?.colors?.error || '#EF4444',
      outline: theme?.colors?.outline || '#E5E5E5',
      outlineVariant: theme?.colors?.outlineVariant || '#E5E5E5',
    },
  };
  const { updateTrip, deleteTrip, getTrip } = useApp();
  const { tripId } = route.params;
  const trip = getTrip(tripId);

  const [formData, setFormData] = useState({
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
    currency: 'USD',
    isGroupTrip: false,
    coverImage: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (trip) {
      setFormData({
        name: trip.name,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        budget: trip.budget.toString(),
        currency: trip.currency,
        isGroupTrip: trip.isGroup || false,
        coverImage: trip.coverImage || '',
      });
    }
  }, [trip]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveTrip = async () => {
    if (!formData.name.trim() || !formData.destination.trim() || !formData.budget.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      let coverImagePath = formData.coverImage;
      
      if (formData.coverImage && !formData.coverImage.includes('images/')) {
        if (trip?.coverImage) {
          await deleteImage(trip.coverImage);
        }
        coverImagePath = await saveImage(formData.coverImage, 'cover');
      }

      await updateTrip(tripId, {
        name: formData.name.trim(),
        destination: formData.destination.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        budget: parseFloat(formData.budget),
        currency: formData.currency,
        isGroup: formData.isGroupTrip,
        coverImage: coverImagePath,
      });
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update trip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This action cannot be undone and will also delete all associated expenses.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (trip?.coverImage) {
                await deleteImage(trip.coverImage);
              }
              await deleteTrip(tripId);
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete trip. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handlePickCoverImage = async () => {
    const imageUri = await pickImage('cover');
    if (imageUri) {
      setFormData(prev => ({ ...prev, coverImage: imageUri }));
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleRemoveCoverImage = () => {
    setFormData(prev => ({ ...prev, coverImage: '' }));
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (!trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: safeTheme.colors.error }]}>Trip not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={['top']}>
      <Surface style={styles.header} elevation={1}>
        <AnimatedButton
          mode="text"
          icon="arrow-back"
          onPress={() => {
            navigation.goBack();
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          label=""
          style={styles.backButton}
        />
        <Text style={[styles.title, { color: safeTheme.colors.onSurface }]}>Edit Trip</Text>
        <AnimatedButton
          mode="text"
          icon="trash-outline"
          onPress={handleDeleteTrip}
          variant="error"
          style={styles.deleteButton}
        />
      </Surface>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
        >
          <AnimatedCard variant="elevated" elevation={2} style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: safeTheme.colors.onSurface }]}>Cover Image</Text>
              {formData.coverImage ? (
                <MotiView
                  from={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                  style={styles.imagePreview}
                >
                  <Image source={{ uri: formData.coverImage }} style={styles.coverImage} contentFit="cover" />
                  <TouchableOpacity 
                    style={[styles.removeImageButton, { backgroundColor: safeTheme.colors.errorContainer }]} 
                    onPress={handleRemoveCoverImage}
                  >
                    <Ionicons name="close-circle" size={24} color={safeTheme.colors.error} />
                  </TouchableOpacity>
                </MotiView>
              ) : (
                <AnimatedCard
                  variant="outlined"
                  onPress={handlePickCoverImage}
                  style={styles.imagePicker}
                >
                  <Ionicons name="camera" size={32} color={safeTheme.colors.primary} />
                  <Text style={[styles.imagePickerText, { color: safeTheme.colors.primary }]}>
                    Add Cover Image
                  </Text>
                </AnimatedCard>
              )}
            </View>

            <AnimatedInput
              label="Trip Name"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="e.g. Summer Vacation 2025"
              left={<TextInput.Icon icon={() => <Ionicons name="airplane-outline" size={20} />} />}
              style={styles.input}
            />

            <AnimatedInput
              label="Destination"
              value={formData.destination}
              onChangeText={(value) => handleInputChange('destination', value)}
              placeholder="e.g. Paris, France"
              left={<TextInput.Icon icon={() => <Ionicons name="location-outline" size={20} />} />}
              style={styles.input}
            />

            <View style={styles.dateRow}>
              <View style={styles.dateInput}>
                <Text style={[styles.label, { color: safeTheme.colors.onSurface }]}>Start Date</Text>
                <DatePickerInput
                  value={formData.startDate}
                  onChange={(value) => handleInputChange('startDate', value)}
                />
              </View>
              <View style={styles.dateInput}>
                <Text style={[styles.label, { color: safeTheme.colors.onSurface }]}>End Date</Text>
                <DatePickerInput
                  value={formData.endDate}
                  onChange={(value) => handleInputChange('endDate', value)}
                  minimumDate={new Date(formData.startDate)}
                />
              </View>
            </View>

            <View style={styles.budgetRow}>
              <View style={styles.budgetInput}>
                <AnimatedInput
                  label="Budget"
                  value={formData.budget}
                  onChangeText={(value) => handleInputChange('budget', value)}
                  placeholder="1000"
                  keyboardType="numeric"
                  left={<TextInput.Icon icon={() => <Ionicons name="wallet-outline" size={20} />} />}
                  style={styles.input}
                />
              </View>
              <View style={styles.currencyInput}>
                <AnimatedInput
                  label="Currency"
                  value={formData.currency}
                  onChangeText={(value) => handleInputChange('currency', value)}
                  maxLength={3}
                  left={<TextInput.Icon icon={() => <Ionicons name="cash-outline" size={20} />} />}
                  style={styles.input}
                />
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.switchGroup}>
              <View style={styles.switchLabelContainer}>
                <Ionicons name="people-outline" size={20} color={safeTheme.colors.primary} />
                <Text style={[styles.switchLabel, { color: safeTheme.colors.onSurface }]}>
                  Share expenses with friends
                </Text>
              </View>
              <Switch
                value={formData.isGroupTrip}
                onValueChange={(value) => {
                  handleInputChange('isGroupTrip', value);
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                color={safeTheme.colors.primary}
              />
            </View>
          </AnimatedCard>

          <View style={styles.actions}>
            <AnimatedButton
              mode="outlined"
              label="Cancel"
              onPress={() => {
                navigation.goBack();
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              variant="secondary"
              style={styles.cancelButton}
            />

            <AnimatedButton
              mode="contained"
              label={isLoading ? 'Saving...' : 'Save Changes'}
              onPress={handleSaveTrip}
              loading={isLoading}
              disabled={isLoading}
              variant="primary"
              fullWidth
              style={styles.saveButton}
            />
          </View>
        </MotiView>
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
    minWidth: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  deleteButton: {
    minWidth: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateInput: {
    flex: 1,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  budgetInput: {
    flex: 2,
  },
  currencyInput: {
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  switchLabel: {
    fontSize: 16,
    flex: 1,
  },
  imagePicker: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
    borderStyle: 'dashed',
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '500',
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 200,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    padding: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
