import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Surface, Switch, TextInput, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useApp } from '@/contexts/AppContext';
import DatePickerInput from '@/components/DatePickerInput';
import { pickImage, saveImage } from '@/utils/imageStorage';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { AnimatedInput } from '@/components/ui/AnimatedInput';

export default function AddTripScreen({ navigation }: any) {
  const theme = useTheme();
  const { addTrip } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    destination: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    budget: '',
    currency: 'INR',
    isGroupTrip: false,
    coverImage: '',
    notificationsEnabled: true,
  });
  const [addSelfAsMember, setAddSelfAsMember] = useState(false);
  const [selfMemberName, setSelfMemberName] = useState('');
  const [notificationPreferences, setNotificationPreferences] = useState({
    budgetAlerts: true,
    dailySummaries: false,
    settlementReminders: true,
    activityReminders: false,
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateTrip = async () => {
    if (!formData.name.trim() || !formData.destination.trim() || !formData.budget.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    if (formData.isGroupTrip && addSelfAsMember && !selfMemberName.trim()) {
      Alert.alert('Error', 'Please enter your name to add yourself as a member.');
      return;
    }

    try {
      let coverImagePath = '';
      if (formData.coverImage) {
        coverImagePath = await saveImage(formData.coverImage, 'cover');
      }

      const participants = [];
      if (formData.isGroupTrip && addSelfAsMember) {
        participants.push({
          id: `member_${Date.now()}`,
          name: selfMemberName.trim(),
          email: undefined,
          avatar: undefined,
          isActive: true,
          isOwner: true,
          isCurrentUser: true,
          joinedAt: new Date().toISOString(),
        });
      }

      await addTrip({
        name: formData.name.trim(),
        destination: formData.destination.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        budget: parseFloat(formData.budget),
        currency: formData.currency,
        isGroupTrip: formData.isGroupTrip,
        coverImage: coverImagePath,
        participants: participants,
        createdBy: 'current_user',
        inviteCode: `TRIP${Date.now().toString().slice(-6)}`,
        notificationsEnabled: formData.notificationsEnabled,
        notificationPreferences: formData.notificationsEnabled ? notificationPreferences : undefined,
      });
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    }
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
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
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>New Trip</Text>
        <View style={styles.backButton} />
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
              <Text style={[styles.label, { color: theme.colors.onSurface }]}>Cover Image</Text>
              {formData.coverImage ? (
                <MotiView
                  from={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                  style={styles.imagePreview}
                >
                  <Image source={{ uri: formData.coverImage }} style={styles.coverImage} contentFit="cover" />
                  <TouchableOpacity 
                    style={[styles.removeImageButton, { backgroundColor: theme.colors.errorContainer }]} 
                    onPress={handleRemoveCoverImage}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                  </TouchableOpacity>
                </MotiView>
              ) : (
                <AnimatedCard
                  variant="outlined"
                  onPress={handlePickCoverImage}
                  style={styles.imagePicker}
                >
                  <Ionicons name="camera" size={32} color={theme.colors.primary} />
                  <Text style={[styles.imagePickerText, { color: theme.colors.primary }]}>
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
                <Text style={[styles.label, { color: theme.colors.onSurface }]}>Start Date</Text>
                <DatePickerInput
                  value={formData.startDate}
                  onChange={(value) => handleInputChange('startDate', value)}
                />
              </View>
              <View style={styles.dateInput}>
                <Text style={[styles.label, { color: theme.colors.onSurface }]}>End Date</Text>
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
                <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
                  Share expenses with friends
                </Text>
              </View>
              <Switch
                value={formData.isGroupTrip}
                onValueChange={(value) => {
                  handleInputChange('isGroupTrip', value);
                  if (!value) {
                    setAddSelfAsMember(false);
                    setSelfMemberName('');
                  }
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                color={theme.colors.primary}
              />
            </View>

            {formData.isGroupTrip && (
              <MotiView
                from={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ type: 'timing', duration: 300 }}
              >
                <View style={styles.switchGroup}>
                  <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
                    Add yourself as first member
                  </Text>
                  <Switch
                    value={addSelfAsMember}
                    onValueChange={(value) => {
                      setAddSelfAsMember(value);
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    color={theme.colors.primary}
                  />
                </View>
                
                {addSelfAsMember && (
                  <AnimatedInput
                    label="Your Name"
                    value={selfMemberName}
                    onChangeText={setSelfMemberName}
                    placeholder="Enter your name"
                    left={<TextInput.Icon icon={() => <Ionicons name="person-outline" size={20} />} />}
                    style={styles.input}
                  />
                )}
              </MotiView>
            )}

            <Divider style={styles.divider} />

            <View style={styles.switchGroup}>
              <View style={styles.switchLabelContainer}>
                <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
                  Enable Notifications
                </Text>
              </View>
              <Switch
                value={formData.notificationsEnabled}
                onValueChange={(value) => {
                  handleInputChange('notificationsEnabled', value);
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                color={theme.colors.primary}
              />
            </View>

            {formData.notificationsEnabled && (
              <MotiView
                from={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ type: 'timing', duration: 300 }}
                style={styles.notificationPreferences}
              >
                <Text style={[styles.preferencesTitle, { color: theme.colors.primary }]}>
                  Notification Preferences
                </Text>
                
                <View style={styles.switchGroup}>
                  <Text style={[styles.preferenceLabel, { color: theme.colors.onSurface }]}>Budget Alerts</Text>
                  <Switch
                    value={notificationPreferences.budgetAlerts}
                    onValueChange={(value) => {
                      setNotificationPreferences(prev => ({ ...prev, budgetAlerts: value }));
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    color={theme.colors.primary}
                  />
                </View>

                <View style={styles.switchGroup}>
                  <Text style={[styles.preferenceLabel, { color: theme.colors.onSurface }]}>Daily Summaries</Text>
                  <Switch
                    value={notificationPreferences.dailySummaries}
                    onValueChange={(value) => {
                      setNotificationPreferences(prev => ({ ...prev, dailySummaries: value }));
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    color={theme.colors.primary}
                  />
                </View>

                <View style={styles.switchGroup}>
                  <Text style={[styles.preferenceLabel, { color: theme.colors.onSurface }]}>Settlement Reminders</Text>
                  <Switch
                    value={notificationPreferences.settlementReminders}
                    onValueChange={(value) => {
                      setNotificationPreferences(prev => ({ ...prev, settlementReminders: value }));
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    color={theme.colors.primary}
                  />
                </View>

                <View style={styles.switchGroup}>
                  <Text style={[styles.preferenceLabel, { color: theme.colors.onSurface }]}>Activity Reminders</Text>
                  <Switch
                    value={notificationPreferences.activityReminders}
                    onValueChange={(value) => {
                      setNotificationPreferences(prev => ({ ...prev, activityReminders: value }));
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    color={theme.colors.primary}
                  />
                </View>
              </MotiView>
            )}
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
              label="Create Trip"
              onPress={handleCreateTrip}
              variant="primary"
              fullWidth
              style={styles.createButton}
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
  notificationPreferences: {
    marginTop: 12,
    paddingLeft: 28,
  },
  preferencesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  preferenceLabel: {
    fontSize: 15,
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
  createButton: {
    flex: 2,
  },
});
