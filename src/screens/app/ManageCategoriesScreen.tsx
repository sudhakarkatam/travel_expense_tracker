import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { CustomCategory } from '@/types';
import { AVAILABLE_ICONS, AVAILABLE_COLORS } from '@/constants/categories';

interface ManageCategoriesScreenProps {
  navigation: any;
}

export default function ManageCategoriesScreen({ navigation }: ManageCategoriesScreenProps) {
  const { categories, addCategory, updateCategory, deleteCategory } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: AVAILABLE_COLORS[0],
    icon: AVAILABLE_ICONS[0],
  });

  const handleAddCategory = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a category name.');
      return;
    }

    try {
      await addCategory({
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon,
        isDefault: false,
      });
      
      setShowAddModal(false);
      setFormData({ name: '', color: AVAILABLE_COLORS[0], icon: AVAILABLE_ICONS[0] });
    } catch {
      Alert.alert('Error', 'Failed to add category. Please try again.');
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !formData.name.trim()) {
      Alert.alert('Error', 'Please enter a category name.');
      return;
    }

    try {
      await updateCategory(editingCategory.id, {
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon,
      });
      
      setEditingCategory(null);
      setFormData({ name: '', color: AVAILABLE_COLORS[0], icon: AVAILABLE_ICONS[0] });
    } catch {
      Alert.alert('Error', 'Failed to update category. Please try again.');
    }
  };

  const handleDeleteCategory = (category: CustomCategory) => {
    if (category.isDefault) {
      Alert.alert('Cannot Delete', 'Default categories cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(category.id);
            } catch {
              Alert.alert('Error', 'Failed to delete category. Please try again.');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (category: CustomCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      color: category.color,
      icon: category.icon,
    });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingCategory(null);
    setFormData({ name: '', color: AVAILABLE_COLORS[0], icon: AVAILABLE_ICONS[0] });
  };

  const renderCategoryItem = (category: CustomCategory) => (
    <View key={category.id} style={styles.categoryItem}>
      <View style={styles.categoryInfo}>
        <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
          <Ionicons name={category.icon as any} size={20} color="white" />
        </View>
        <View style={styles.categoryDetails}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categoryType}>
            {category.isDefault ? 'Default' : 'Custom'}
          </Text>
        </View>
      </View>
      
      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(category)}
        >
          <Ionicons name="pencil" size={18} color="#8b5cf6" />
        </TouchableOpacity>
        
        {!category.isDefault && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteCategory(category)}
          >
            <Ionicons name="trash" size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderCategoryModal = () => (
    <Modal
      visible={showAddModal || editingCategory !== null}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={closeModal}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {editingCategory ? 'Edit Category' : 'Add Category'}
          </Text>
          <TouchableOpacity onPress={editingCategory ? handleEditCategory : handleAddCategory}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter category name"
              value={formData.name}
              onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
              {AVAILABLE_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconButton,
                    formData.icon === icon && styles.selectedIconButton,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, icon }))}
                >
                  <Ionicons 
                    name={icon as any} 
                    size={24} 
                    color={formData.icon === icon ? 'white' : '#666'} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
              {AVAILABLE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    formData.color === color && styles.selectedColorButton,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, color }))}
                >
                  {formData.color === color && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Preview</Text>
            <View style={[styles.previewCategory, { backgroundColor: formData.color }]}>
              <Ionicons name={formData.icon as any} size={20} color="white" />
              <Text style={styles.previewText}>{formData.name || 'Category Name'}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const defaultCategories = categories.filter(c => c.isDefault);
  const customCategories = categories.filter(c => !c.isDefault);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Categories</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Categories</Text>
          {defaultCategories.map(renderCategoryItem)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Categories</Text>
          {customCategories.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="add-circle-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No custom categories yet</Text>
              <Text style={styles.emptySubtext}>Tap the + button to add your first custom category</Text>
            </View>
          ) : (
            customCategories.map(renderCategoryItem)
          )}
        </View>
      </ScrollView>

      {renderCategoryModal()}
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
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  categoryType: {
    fontSize: 12,
    color: '#666',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
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
  iconScroll: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#f3f4f6',
  },
  selectedIconButton: {
    backgroundColor: '#8b5cf6',
  },
  colorScroll: {
    flexDirection: 'row',
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorButton: {
    borderColor: '#333',
  },
  previewContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  previewText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
});
