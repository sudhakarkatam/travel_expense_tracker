import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import DatePickerInput from '@/components/DatePickerInput';
import { pickImage, saveImage, deleteImage } from '@/utils/imageStorage';

export default function EditTripScreen({ navigation, route }: any) {
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
      
      // If cover image was changed, save the new one
      if (formData.coverImage && !formData.coverImage.includes('images/')) {
        // Delete old image if it exists
        if (trip?.coverImage) {
          await deleteImage(trip.coverImage);
        }
        // Save new image
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
              // Delete cover image if it exists
              if (trip?.coverImage) {
                await deleteImage(trip.coverImage);
              }
              await deleteTrip(tripId);
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
    }
  };

  const handleRemoveCoverImage = () => {
    setFormData(prev => ({ ...prev, coverImage: '' }));
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
        <Text style={styles.title}>Edit Trip</Text>
        <TouchableOpacity onPress={handleDeleteTrip}>
          <Ionicons name="trash-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cover Image</Text>
            {formData.coverImage ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: formData.coverImage }} style={styles.coverImage} />
                <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveCoverImage}>
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imagePicker} onPress={handlePickCoverImage}>
                <Ionicons name="camera" size={24} color="#8b5cf6" />
                <Text style={styles.imagePickerText}>Add Cover Image</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Trip Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Summer Vacation 2025"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Destination *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Paris, France"
              value={formData.destination}
              onChangeText={(value) => handleInputChange('destination', value)}
            />
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateInput}>
              <Text style={styles.label}>Start Date</Text>
              <DatePickerInput
                value={formData.startDate}
                onChange={(value) => handleInputChange('startDate', value)}
              />
            </View>
            <View style={styles.dateInput}>
              <Text style={styles.label}>End Date</Text>
              <DatePickerInput
                value={formData.endDate}
                onChange={(value) => handleInputChange('endDate', value)}
                minimumDate={new Date(formData.startDate)}
              />
            </View>
          </View>

          <View style={styles.budgetRow}>
            <View style={styles.budgetInput}>
              <Text style={styles.label}>Budget *</Text>
              <TextInput
                style={styles.input}
                placeholder="1000"
                value={formData.budget}
                onChangeText={(value) => handleInputChange('budget', value)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.currencyInput}>
              <Text style={styles.label}>Currency</Text>
              <TextInput
                style={styles.input}
                value={formData.currency}
                onChangeText={(value) => handleInputChange('currency', value)}
                maxLength={3}
              />
            </View>
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.label}>Share expenses with friends</Text>
            <Switch
              value={formData.isGroupTrip}
              onValueChange={(value) => handleInputChange('isGroupTrip', value)}
              trackColor={{ false: '#e5e7eb', true: '#8b5cf6' }}
              thumbColor={formData.isGroupTrip ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.disabledButton]}
            onPress={handleSaveTrip}
            disabled={isLoading}
          >
            <Text style={styles.saveText}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
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
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    gap: 8,
  },
  imagePickerText: {
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  imagePreview: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
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
});
