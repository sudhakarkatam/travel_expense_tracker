import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import DatePickerInput from '@/components/DatePickerInput';
import { pickImage, saveImage, deleteImage, pickMultipleImages } from '@/utils/imageStorage';

const CATEGORIES = [
  { id: 'food', name: 'Food & Drinks', color: '#ef4444', icon: 'restaurant' },
  { id: 'transport', name: 'Transport', color: '#22c55e', icon: 'car' },
  { id: 'accommodation', name: 'Accommodation', color: '#6366f1', icon: 'bed' },
  { id: 'entertainment', name: 'Entertainment', color: '#f59e0b', icon: 'game-controller' },
  { id: 'shopping', name: 'Shopping', color: '#ec4899', icon: 'bag' },
  { id: 'other', name: 'Other', color: '#6b7280', icon: 'ellipsis-horizontal' },
];

export default function EditExpenseScreen({ navigation, route }: any) {
  const { updateExpense, deleteExpense, getTrip, getTripExpenses } = useApp();
  const { expenseId, tripId } = route.params;
  const expense = getTripExpenses(tripId).find(e => e.id === expenseId);
  const trip = getTrip(tripId);

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    notes: '',
    category: 'food',
    date: '',
    receiptImages: [] as string[],
    splitType: 'equal' as 'equal' | 'percentage' | 'custom',
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (expense) {
      setFormData({
        amount: expense.amount.toString(),
        description: expense.description,
        notes: expense.notes || '',
        category: expense.category,
        date: expense.date,
        receiptImages: expense.receiptImages || [],
        splitType: expense.splitType || 'equal',
      });
    }
  }, [expense]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveExpense = async () => {
    if (!formData.amount.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      // Handle receipt images
      const savedImages: string[] = [];
      for (const imageUri of formData.receiptImages) {
        if (imageUri.includes('images/')) {
          // Already saved
          savedImages.push(imageUri);
        } else {
          // New image, save it
          const savedPath = await saveImage(imageUri, 'receipt');
          savedImages.push(savedPath);
        }
      }

      // Delete removed images
      if (expense?.receiptImages) {
        for (const oldImage of expense.receiptImages) {
          if (!formData.receiptImages.includes(oldImage)) {
            await deleteImage(oldImage);
          }
        }
      }

      await updateExpense(expenseId, {
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        notes: formData.notes.trim(),
        category: formData.category,
        date: formData.date,
        receiptImages: savedImages,
        splitType: formData.splitType,
      });
      
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update expense. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExpense = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete receipt images
              for (const imageUri of formData.receiptImages) {
                if (imageUri.includes('images/')) {
                  await deleteImage(imageUri);
                }
              }
              await deleteExpense(expenseId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAddReceiptImages = async () => {
    const images = await pickMultipleImages();
    if (images.length > 0) {
      setFormData(prev => ({
        ...prev,
        receiptImages: [...prev.receiptImages, ...images],
      }));
    }
  };

  const handleRemoveReceiptImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      receiptImages: prev.receiptImages.filter((_, i) => i !== index),
    }));
  };

  const handleTakePhoto = async () => {
    const { takePhoto } = await import('@/utils/imageStorage');
    const imageUri = await takePhoto();
    if (imageUri) {
      setFormData(prev => ({
        ...prev,
        receiptImages: [...prev.receiptImages, imageUri],
      }));
    }
  };

  if (!expense || !trip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Expense not found</Text>
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
        <Text style={styles.title}>Edit Expense</Text>
        <TouchableOpacity onPress={handleDeleteExpense}>
          <Ionicons name="trash-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Trip</Text>
            <View style={styles.tripInfo}>
              <Text style={styles.tripText}>{trip.name}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount *</Text>
            <TextInput
              style={styles.input}
              placeholder="$ 0.00"
              value={formData.amount}
              onChangeText={(value) => handleInputChange('amount', value)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What did you pay for?"
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes (optional)"
              value={formData.notes}
              onChangeText={(value) => handleInputChange('notes', value)}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    { backgroundColor: formData.category === category.id ? category.color : '#f3f4f6' }
                  ]}
                  onPress={() => handleInputChange('category', category.id)}
                >
                  <Ionicons 
                    name={category.icon as any} 
                    size={20} 
                    color={formData.category === category.id ? 'white' : '#666'} 
                  />
                  <Text style={[
                    styles.categoryText,
                    { color: formData.category === category.id ? 'white' : '#666' }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <DatePickerInput
              value={formData.date}
              onChange={(value) => handleInputChange('date', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Receipt Images</Text>
            <View style={styles.imageGrid}>
              {formData.receiptImages.map((uri, index) => (
                <View key={index} style={styles.imageItem}>
                  <Image source={{ uri }} style={styles.receiptImage} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveReceiptImage(index)}
                  >
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.imageButtons}>
              <TouchableOpacity style={styles.imageButton} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={20} color="#8b5cf6" />
                <Text style={styles.imageButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageButton} onPress={handleAddReceiptImages}>
                <Ionicons name="cloud-upload" size={20} color="#8b5cf6" />
                <Text style={styles.imageButtonText}>Upload</Text>
              </TouchableOpacity>
            </View>
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
            onPress={handleSaveExpense}
            disabled={isLoading}
          >
            <Text style={styles.saveText}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  tripInfo: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  tripText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  imageItem: {
    position: 'relative',
  },
  receiptImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    gap: 8,
  },
  imageButtonText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
    paddingBottom: 20,
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
