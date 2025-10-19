import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import DatePickerInput from '@/components/DatePickerInput';
import { pickImage, saveImage } from '@/utils/imageStorage';

export default function AddTripScreen({ navigation }: any) {
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
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateTrip = async () => {
    if (!formData.name.trim() || !formData.destination.trim() || !formData.budget.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      let coverImagePath = '';
      if (formData.coverImage) {
        coverImagePath = await saveImage(formData.coverImage, 'cover');
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
        participants: [],
        createdBy: 'current_user',
        inviteCode: `TRIP${Date.now().toString().slice(-6)}`,
      });
      
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>New Trip</Text>
        <View style={{ width: 24 }} />
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
            style={styles.createButton}
            onPress={handleCreateTrip}
          >
            <Text style={styles.createText}>Create Trip</Text>
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
  createButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
  },
  createText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
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
});
