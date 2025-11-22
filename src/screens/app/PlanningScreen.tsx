import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Surface, ProgressBar, Chip, FAB, Divider } from "react-native-paper";
import { useThemeMode } from "@/contexts/ThemeContext";
import { useApp } from "@/contexts/AppContext";
import { Trip, PackingItem, ActivityItem } from "@/types";
import EmptyState from "@/components/EmptyState";
import { getTemplatesForDestination, getConditionTemplates, getRealTimeActivityTemplates } from "@/utils/destinationTemplates";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

interface PlanningScreenProps {
  navigation: any;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function PlanningScreen({ navigation }: PlanningScreenProps) {
  const theme = useTheme();
  const { isDark } = useThemeMode();

  const safeTheme = {
    colors: {
      background: theme?.colors?.background || (isDark ? '#111827' : '#FFFFFF'),
      surface: theme?.colors?.surface || (isDark ? '#1f2937' : '#FFFFFF'),
      surfaceVariant: theme?.colors?.surfaceVariant || (isDark ? '#374151' : '#F9FAFB'),
      onSurface: theme?.colors?.onSurface || (isDark ? '#f9fafb' : '#111827'),
      onSurfaceVariant: theme?.colors?.onSurfaceVariant || (isDark ? '#d1d5db' : '#6b7280'),
      primary: theme?.colors?.primary || '#8b5cf6',
      onPrimary: theme?.colors?.onPrimary || '#FFFFFF',
      primaryContainer: theme?.colors?.primaryContainer || (isDark ? '#6d28d9' : '#EDE9FE'),
      onPrimaryContainer: theme?.colors?.onPrimaryContainer || (isDark ? '#e9d5ff' : '#000000'),
      error: theme?.colors?.error || '#EF4444',
      outline: theme?.colors?.outline || (isDark ? '#4b5563' : '#E5E7EB'),
      outlineVariant: theme?.colors?.outlineVariant || (isDark ? '#374151' : '#E5E7EB'),
      secondaryContainer: theme?.colors?.secondaryContainer || '#f3f4f6',
      onSecondaryContainer: theme?.colors?.onSecondaryContainer || '#1f2937',
      tertiaryContainer: theme?.colors?.tertiaryContainer || '#e0f2fe',
      onTertiaryContainer: theme?.colors?.onTertiaryContainer || '#0369a1',
    },
  };

  const {
    trips,
    addPackingItem,
    addPackingItems,
    updatePackingItem,
    deletePackingItem,
    addActivityItem,
    addActivityItems,
    updateActivityItem,
    deleteActivityItem,
    getTripPackingItems,
    getTripActivityItems,
    getTrip,
  } = useApp();

  // Sort trips by latest
  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.startDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.startDate || 0).getTime();
      return dateB - dateA;
    });
  }, [trips]);

  const [selectedTripId, setSelectedTripId] = useState(sortedTrips[0]?.id || "");
  const [activeTab, setActiveTab] = useState<"packing" | "activities">("packing");
  const [newItemText, setNewItemText] = useState("");
  const [showTripSelector, setShowTripSelector] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItemText, setEditItemText] = useState("");

  // Modals state
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showCopyTripModal, setShowCopyTripModal] = useState(false);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [templateType, setTemplateType] = useState<"packing" | "activities">("packing");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedTemplateItems, setSelectedTemplateItems] = useState<Set<string>>(new Set());

  // Copy Trip State
  const [tripToCopyFrom, setTripToCopyFrom] = useState<Trip | null>(null);
  const [copyItems, setCopyItems] = useState<any[]>([]);
  const [selectedCopyItems, setSelectedCopyItems] = useState<Set<string>>(new Set());

  const selectedTrip = useMemo(() => getTrip(selectedTripId), [selectedTripId, getTrip]);

  useEffect(() => {
    if (!selectedTripId && sortedTrips.length > 0) {
      setSelectedTripId(sortedTrips[0].id);
    }
  }, [sortedTrips, selectedTripId]);

  const packingItems = useMemo(() => getTripPackingItems(selectedTripId), [selectedTripId, getTripPackingItems, trips]);
  const activityItems = useMemo(() => getTripActivityItems(selectedTripId), [selectedTripId, getTripActivityItems, trips]);

  const groupedPackingItems = useMemo(() => {
    const grouped: Record<string, PackingItem[]> = {};
    packingItems.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, [packingItems]);

  const packingProgress = useMemo(() => {
    if (packingItems.length === 0) return 0;
    return packingItems.filter(i => i.packed).length / packingItems.length;
  }, [packingItems]);

  const packedCount = packingItems.filter(i => i.packed).length;
  const totalPackingItems = packingItems.length;

  const templates = useMemo(() => getTemplatesForDestination(selectedTrip?.destination || ""), [selectedTrip?.destination]);
  const conditionTemplates = useMemo(() => getConditionTemplates(), []);
  const realTimeTemplates = useMemo(() => getRealTimeActivityTemplates(), []);

  const handleAddItem = async () => {
    if (!newItemText.trim() || !selectedTripId || isSubmitting) return;

    setIsSubmitting(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (activeTab === "packing") {
        await addPackingItem({
          id: generateId(),
          tripId: selectedTripId,
          name: newItemText.trim(),
          category: "General",
          packed: false,
        });
      } else {
        await addActivityItem({
          id: generateId(),
          tripId: selectedTripId,
          description: newItemText.trim(),
          completed: false,
          date: new Date().toISOString(),
        });
      }
      setNewItemText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePacked = async (item: PackingItem) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    await updatePackingItem({ ...item, packed: !item.packed });
  };

  const handleToggleActivity = async (item: ActivityItem) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    await updateActivityItem({ ...item, completed: !item.completed });
  };

  const handleEditItem = (item: any, type: "packing" | "activity") => {
    setEditingItem({ ...item, type });
    setEditItemText(type === "packing" ? item.name : item.description);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editItemText.trim() || !editingItem) return;

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (editingItem.type === "packing") {
      await updatePackingItem({ ...editingItem, name: editItemText.trim() });
    } else {
      await updateActivityItem({ ...editingItem, description: editItemText.trim() });
    }

    setEditModalVisible(false);
    setEditingItem(null);
    setEditItemText("");
  };

  const handleDeleteItem = (id: string, type: "packing" | "activity") => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (type === "packing") await deletePackingItem(id);
            else await deleteActivityItem(id);
          }
        }
      ]
    );
  };

  const handleAddTemplateItems = async () => {
    if (!selectedTemplate || !selectedTripId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const itemsToAdd = Array.from(selectedTemplateItems);
      if (templateType === "packing") {
        const templateItems = selectedTemplate.items.filter((i: any) => itemsToAdd.includes(i.name));
        const newItems = templateItems.map((item: any) => ({
          id: generateId() + Math.random().toString(36).substr(2, 5),
          tripId: selectedTripId,
          name: item.name,
          category: item.category,
          packed: false,
        }));
        await addPackingItems(newItems);
      } else {
        const templateActivities = selectedTemplate.activities.filter((a: any) => itemsToAdd.includes(a.description));
        const newActivities = templateActivities.map((activity: any) => ({
          id: generateId() + Math.random().toString(36).substr(2, 5),
          tripId: selectedTripId,
          description: activity.description,
          location: selectedTemplate.destination,
          completed: false,
          date: new Date().toISOString(),
        }));
        await addActivityItems(newActivities);
      }

      setShowTemplatesModal(false);
      setSelectedTemplate(null);
      setSelectedTemplateItems(new Set());
      Alert.alert("Success", `Added ${itemsToAdd.length} items to your list.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyItems = async () => {
    if (!tripToCopyFrom || !selectedTripId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const itemsToCopy = copyItems.filter(item => selectedCopyItems.has(item.id));

      if (activeTab === "packing") {
        const newItems = itemsToCopy.map(item => ({
          id: generateId() + Math.random().toString(36).substr(2, 5),
          tripId: selectedTripId,
          name: item.name,
          category: item.category,
          packed: false,
        }));
        await addPackingItems(newItems);
      } else {
        const newActivities = itemsToCopy.map(item => ({
          id: generateId() + Math.random().toString(36).substr(2, 5),
          tripId: selectedTripId,
          description: item.description,
          completed: false,
          date: new Date().toISOString(),
        }));
        await addActivityItems(newActivities);
      }

      setShowCopyTripModal(false);
      setTripToCopyFrom(null);
      setCopyItems([]);
      setSelectedCopyItems(new Set());
      Alert.alert("Success", `Copied ${itemsToCopy.length} items.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedTrip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: safeTheme.colors.onSurface }}>No trips found. Create a trip to start planning.</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: safeTheme.colors.primary, marginTop: 20, width: 200 }]}
          onPress={() => navigation.navigate("AddTrip")}
        >
          <Text style={{ color: safeTheme.colors.onPrimary, fontWeight: 'bold' }}>Create Trip</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: safeTheme.colors.background }}>
      {/* Header with Trip Selector */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.tripSelector, { backgroundColor: safeTheme.colors.surfaceVariant }]}
          onPress={() => setShowTripSelector(!showTripSelector)}
        >
          <Text style={[styles.tripSelectorText, { color: safeTheme.colors.onSurface }]}>{selectedTrip.name}</Text>
          <Ionicons name={showTripSelector ? "chevron-up" : "chevron-down"} size={20} color={safeTheme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      {showTripSelector && (
        <View style={[styles.tripDropdown, { backgroundColor: safeTheme.colors.surface }]}>
          <ScrollView style={{ maxHeight: 200 }}>
            {sortedTrips.map(trip => (
              <TouchableOpacity
                key={trip.id}
                style={[styles.tripOption, { backgroundColor: trip.id === selectedTripId ? safeTheme.colors.primaryContainer : 'transparent' }]}
                onPress={() => {
                  setSelectedTripId(trip.id);
                  setShowTripSelector(false);
                }}
              >
                <View>
                  <Text style={{ color: trip.id === selectedTripId ? safeTheme.colors.onPrimaryContainer : safeTheme.colors.onSurface, fontWeight: '600' }}>
                    {trip.name}
                  </Text>
                  <Text style={{ color: trip.id === selectedTripId ? safeTheme.colors.onPrimaryContainer : safeTheme.colors.onSurfaceVariant, fontSize: 12 }}>
                    {trip.destination}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor: activeTab === 'packing' ? safeTheme.colors.primary : 'transparent',
          }}
          onPress={() => setActiveTab('packing')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'packing' ? safeTheme.colors.primary : safeTheme.colors.onSurfaceVariant }]}>
            Packing List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor: activeTab === 'activities' ? safeTheme.colors.primary : 'transparent',
          }}
          onPress={() => setActiveTab('activities')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'activities' ? safeTheme.colors.primary : safeTheme.colors.onSurfaceVariant }]}>
            Activities
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'packing' && (
          <Surface style={[styles.card, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: safeTheme.colors.onSurface }]}>Progress</Text>
              <Text style={[styles.progressText, { color: safeTheme.colors.primary }]}>{Math.round(packingProgress * 100)}%</Text>
            </View>
            <ProgressBar progress={packingProgress} color={safeTheme.colors.primary} style={styles.progressBar} />
            <Text style={[styles.progressSubtext, { color: safeTheme.colors.onSurfaceVariant }]}>
              {packedCount} of {totalPackingItems} items packed
            </Text>
          </Surface>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: safeTheme.colors.secondaryContainer }]}
            onPress={() => {
              setTemplateType(activeTab);
              setShowTemplatesModal(true);
            }}
          >
            <Ionicons name="list" size={20} color={safeTheme.colors.onSecondaryContainer} />
            <Text style={[styles.actionButtonText, { color: safeTheme.colors.onSecondaryContainer }]}>Templates</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: safeTheme.colors.secondaryContainer }]}
            onPress={() => setShowCopyTripModal(true)}
          >
            <Ionicons name="copy-outline" size={20} color={safeTheme.colors.onSecondaryContainer} />
            <Text style={[styles.actionButtonText, { color: safeTheme.colors.onSecondaryContainer }]}>Copy Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: safeTheme.colors.tertiaryContainer }]}
            onPress={() => setShowAnalyzeModal(true)}
          >
            <Ionicons name="analytics-outline" size={20} color={safeTheme.colors.onTertiaryContainer} />
            <Text style={[styles.actionButtonText, { color: safeTheme.colors.onTertiaryContainer }]}>Analyze</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {activeTab === 'packing' ? (
            Object.entries(groupedPackingItems).length > 0 ? (
              Object.entries(groupedPackingItems).map(([category, items]) => (
                <View key={category} style={styles.categorySection}>
                  <Text style={[styles.categoryTitle, { color: safeTheme.colors.primary }]}>{category}</Text>
                  {items.map(item => (
                    <View
                      key={item.id}
                      style={[styles.itemRow, { backgroundColor: safeTheme.colors.surface }]}
                    >
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => handleTogglePacked(item)}
                      >
                        <Ionicons
                          name={item.packed ? "checkbox" : "square-outline"}
                          size={24}
                          color={item.packed ? safeTheme.colors.primary : safeTheme.colors.onSurfaceVariant}
                          style={styles.checkbox}
                        />
                        <Text style={[styles.itemText, {
                          color: safeTheme.colors.onSurface,
                          textDecorationLine: item.packed ? 'line-through' : 'none',
                          opacity: item.packed ? 0.5 : 1
                        }]}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => handleEditItem(item, 'packing')} style={{ padding: 8 }}>
                          <Ionicons name="pencil" size={20} color={safeTheme.colors.onSurfaceVariant} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteItem(item.id, 'packing')} style={{ padding: 8 }}>
                          <Ionicons name="trash-outline" size={20} color={safeTheme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <EmptyState
                icon="briefcase-outline"
                title="No packing items"
                subtitle="Add items manually or use templates to get started."
              />
            )
          ) : (
            activityItems.length > 0 ? (
              <View style={styles.listContainer}>
                {activityItems.map(item => (
                  <View
                    key={item.id}
                    style={[styles.itemRow, { backgroundColor: safeTheme.colors.surface }]}
                  >
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => handleToggleActivity(item)}
                    >
                      <Ionicons
                        name={item.completed ? "checkbox" : "square-outline"}
                        size={24}
                        color={item.completed ? safeTheme.colors.primary : safeTheme.colors.onSurfaceVariant}
                        style={styles.checkbox}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemText, {
                          color: safeTheme.colors.onSurface,
                          textDecorationLine: item.completed ? 'line-through' : 'none',
                          opacity: item.completed ? 0.5 : 1
                        }]}>
                          {item.description}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Ionicons name="location-outline" size={12} color={safeTheme.colors.onSurfaceVariant} />
                          <Text style={{ color: safeTheme.colors.onSurfaceVariant, fontSize: 12 }}>
                            {item.location || selectedTrip.destination}
                          </Text>
                          <Text style={{ color: safeTheme.colors.onSurfaceVariant, fontSize: 12 }}>•</Text>
                          <Text style={[styles.itemDate, { color: safeTheme.colors.onSurfaceVariant, marginTop: 0 }]}>
                            {new Date(item.date).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => handleEditItem(item, 'activity')} style={{ padding: 8 }}>
                        <Ionicons name="pencil" size={20} color={safeTheme.colors.onSurfaceVariant} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteItem(item.id, 'activity')} style={{ padding: 8 }}>
                        <Ionicons name="trash-outline" size={20} color={safeTheme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="calendar-outline"
                title="No activities planned"
                subtitle="Add activities manually or use templates to get started."
              />
            )
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
      >
        <Surface style={[styles.inputContainer, { backgroundColor: safeTheme.colors.surface }]} elevation={4}>
          <TextInput
            style={[styles.input, { backgroundColor: safeTheme.colors.surfaceVariant, color: safeTheme.colors.onSurface }]}
            placeholder={activeTab === 'packing' ? "Add item..." : "Add activity..."}
            placeholderTextColor={safeTheme.colors.onSurfaceVariant}
            value={newItemText}
            onChangeText={setNewItemText}
            onSubmitEditing={handleAddItem}
          />
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: safeTheme.colors.primary }]}
            onPress={handleAddItem}
          >
            <Ionicons name="add" size={24} color={safeTheme.colors.onPrimary} />
          </TouchableOpacity>
        </Surface>
      </KeyboardAvoidingView>

      <Modal
        visible={showTemplatesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (selectedTemplate) {
            setSelectedTemplate(null);
          } else {
            setShowTemplatesModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: safeTheme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: safeTheme.colors.outlineVariant }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {selectedTemplate && (
                  <TouchableOpacity onPress={() => setSelectedTemplate(null)}>
                    <Ionicons name="arrow-back" size={24} color={safeTheme.colors.onSurface} />
                  </TouchableOpacity>
                )}
                <Text style={[styles.modalTitle, { color: safeTheme.colors.onSurface }]}>
                  {selectedTemplate ? selectedTemplate.destination : (templateType === 'packing' ? 'Packing Templates' : 'Activity Templates')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowTemplatesModal(false)}>
                <Ionicons name="close" size={24} color={safeTheme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {!selectedTemplate ? (
              <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: 16 }}>
                {templateType === 'packing' ? (
                  <>
                    <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface, fontSize: 16, marginTop: 0 }]}>Trip Styles</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
                      {conditionTemplates?.map((template, index) => (
                        <TouchableOpacity
                          key={template.destination || index}
                          style={[styles.templateCard, { backgroundColor: safeTheme.colors.surfaceVariant }]}
                          onPress={() => setSelectedTemplate(template)}
                        >
                          <Ionicons name={template.icon as any} size={24} color={safeTheme.colors.primary} />
                          <View>
                            <Text style={[styles.templateName, { color: safeTheme.colors.onSurface }]}>{template.destination}</Text>
                            <Text style={[styles.templateCount, { color: safeTheme.colors.onSurfaceVariant }]}>{template?.items?.length || 0} items</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface, fontSize: 16, marginTop: 24 }]}>Destination Guides</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
                      {templates?.packing?.length > 0 ? (
                        templates.packing.map((template: any, index: number) => (
                          <TouchableOpacity
                            key={template.destination || index}
                            style={[styles.templateCard, { backgroundColor: safeTheme.colors.surfaceVariant }]}
                            onPress={() => setSelectedTemplate(template)}
                          >
                            <Ionicons name="map" size={24} color={safeTheme.colors.primary} />
                            <View>
                              <Text style={[styles.templateName, { color: safeTheme.colors.onSurface }]}>{template.destination}</Text>
                              <Text style={[styles.templateCount, { color: safeTheme.colors.onSurfaceVariant }]}>{template?.items?.length || 0} items</Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={{ color: safeTheme.colors.onSurfaceVariant, fontStyle: 'italic' }}>No specific guides for this destination.</Text>
                      )}
                    </ScrollView>
                  </>
                ) : (
                  <>
                    <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface, fontSize: 16, marginTop: 0 }]}>Suggested Activities</Text>
                    <View style={{ gap: 12 }}>
                      {/* Destination specific activities */}
                      {templates?.activities?.length > 0 && (
                        <>
                          <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface, fontSize: 14, marginTop: 8, marginBottom: 8 }]}>For {selectedTrip?.destination}</Text>
                          {templates.activities.map((template, index) => (
                            <TouchableOpacity
                              key={template.destination || index}
                              style={[styles.itemRow, { backgroundColor: safeTheme.colors.surfaceVariant }]}
                              onPress={() => setSelectedTemplate(template)}
                            >
                              <Ionicons name={template.icon as any} size={24} color={safeTheme.colors.primary} style={{ marginRight: 12 }} />
                              <View>
                                <Text style={[styles.itemText, { color: safeTheme.colors.onSurface, fontWeight: '600' }]}>{template.destination}</Text>
                                <Text style={{ color: safeTheme.colors.onSurfaceVariant, fontSize: 12 }}>{template?.activities?.length || 0} activities</Text>
                              </View>
                              <Ionicons name="chevron-forward" size={20} color={safeTheme.colors.onSurfaceVariant} />
                            </TouchableOpacity>
                          ))}
                        </>
                      )}

                      <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface, fontSize: 14, marginTop: 16, marginBottom: 8 }]}>General Activities</Text>
                      {realTimeTemplates?.map((template, index) => (
                        <TouchableOpacity
                          key={template.destination || index}
                          style={[styles.itemRow, { backgroundColor: safeTheme.colors.surfaceVariant }]}
                          onPress={() => setSelectedTemplate(template)}
                        >
                          <Ionicons name={template.icon as any} size={24} color={safeTheme.colors.primary} style={{ marginRight: 12 }} />
                          <View>
                            <Text style={[styles.itemText, { color: safeTheme.colors.onSurface, fontWeight: '600' }]}>{template.destination}</Text>
                            <Text style={{ color: safeTheme.colors.onSurfaceVariant, fontSize: 12 }}>{template?.activities?.length || 0} activities</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={safeTheme.colors.onSurfaceVariant} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </ScrollView>
            ) : (
              <>
                <FlatList
                  data={templateType === 'packing' ? selectedTemplate?.items : selectedTemplate?.activities}
                  keyExtractor={(item, index) => (templateType === 'packing' ? item.name : item.description) + index}
                  renderItem={({ item }) => {
                    const itemName = templateType === 'packing' ? item.name : item.description;
                    const isSelected = selectedTemplateItems.has(itemName);
                    return (
                      <TouchableOpacity
                        style={[styles.templateItemRow, { borderBottomColor: safeTheme.colors.outlineVariant }]}
                        onPress={() => {
                          const newSet = new Set(selectedTemplateItems);
                          if (newSet.has(itemName)) newSet.delete(itemName);
                          else newSet.add(itemName);
                          setSelectedTemplateItems(newSet);
                        }}
                      >
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={24}
                          color={isSelected ? safeTheme.colors.primary : safeTheme.colors.onSurfaceVariant}
                          style={{ marginRight: 12 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.templateItemName, { color: safeTheme.colors.onSurface }]}>{itemName}</Text>
                          {templateType === 'packing' && (
                            <Text style={[styles.templateItemCategory, { color: safeTheme.colors.onSurfaceVariant }]}>{item.category}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
                <View style={[styles.modalFooter, { borderTopColor: safeTheme.colors.outlineVariant }]}>
                  <TouchableOpacity
                    style={[styles.selectAllButton, { borderColor: safeTheme.colors.outline }]}
                    onPress={() => {
                      const items = templateType === 'packing' ? (selectedTemplate?.items || []) : (selectedTemplate?.activities || []);
                      const allNames = items.map((i: any) => templateType === 'packing' ? i.name : i.description);
                      if (selectedTemplateItems.size === allNames.length && allNames.length > 0) {
                        setSelectedTemplateItems(new Set());
                      } else {
                        setSelectedTemplateItems(new Set(allNames));
                      }
                    }}
                  >
                    <Text style={{ color: safeTheme.colors.onSurface }}>
                      {selectedTemplateItems.size === (templateType === 'packing' ? (selectedTemplate?.items?.length || 0) : (selectedTemplate?.activities?.length || 0)) && selectedTemplateItems.size > 0 ? "Deselect All" : "Select All"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addSelectedButton, { backgroundColor: safeTheme.colors.primary, opacity: selectedTemplateItems.size === 0 ? 0.5 : 1 }]}
                    onPress={handleAddTemplateItems}
                    disabled={selectedTemplateItems.size === 0}
                  >
                    <Text style={{ color: safeTheme.colors.onPrimary, fontWeight: 'bold' }}>
                      Add {selectedTemplateItems.size} Items
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCopyTripModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCopyTripModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: safeTheme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: safeTheme.colors.outlineVariant }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {tripToCopyFrom && (
                  <TouchableOpacity onPress={() => {
                    setTripToCopyFrom(null);
                    setCopyItems([]);
                    setSelectedCopyItems(new Set());
                  }}>
                    <Ionicons name="arrow-back" size={24} color={safeTheme.colors.onSurface} />
                  </TouchableOpacity>
                )}
                <Text style={[styles.modalTitle, { color: safeTheme.colors.onSurface }]}>
                  {tripToCopyFrom ? `Copy from ${tripToCopyFrom.name}` : 'Copy from Trip'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCopyTripModal(false)}>
                <Ionicons name="close" size={24} color={safeTheme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {!tripToCopyFrom ? (
              <FlatList
                data={sortedTrips.filter(t => t.id !== selectedTripId)}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.tripItem, { borderBottomColor: safeTheme.colors.outlineVariant }]}
                    onPress={() => {
                      setTripToCopyFrom(item);
                      const items = activeTab === 'packing'
                        ? getTripPackingItems(item.id)
                        : getTripActivityItems(item.id);
                      setCopyItems(items);
                    }}
                  >
                    <View>
                      <Text style={[styles.tripItemName, { color: safeTheme.colors.onSurface, fontWeight: '600' }]}>{item.name}</Text>
                      <Text style={{ color: safeTheme.colors.onSurfaceVariant, fontSize: 12 }}>{item.destination}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={safeTheme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: safeTheme.colors.onSurfaceVariant }}>No other trips to copy from.</Text>
                  </View>
                }
              />
            ) : (
              <>
                <FlatList
                  data={copyItems}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => {
                    const isSelected = selectedCopyItems.has(item.id);
                    return (
                      <TouchableOpacity
                        style={[styles.templateItemRow, { borderBottomColor: safeTheme.colors.outlineVariant }]}
                        onPress={() => {
                          const newSet = new Set(selectedCopyItems);
                          if (newSet.has(item.id)) newSet.delete(item.id);
                          else newSet.add(item.id);
                          setSelectedCopyItems(newSet);
                        }}
                      >
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={24}
                          color={isSelected ? safeTheme.colors.primary : safeTheme.colors.onSurfaceVariant}
                          style={{ marginRight: 12 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.templateItemName, { color: safeTheme.colors.onSurface }]}>
                            {activeTab === 'packing' ? item.name : item.description}
                          </Text>
                          {activeTab === 'packing' && (
                            <Text style={[styles.templateItemCategory, { color: safeTheme.colors.onSurfaceVariant }]}>{item.category}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ color: safeTheme.colors.onSurfaceVariant }}>No items found in this trip.</Text>
                    </View>
                  }
                />
                <View style={[styles.modalFooter, { borderTopColor: safeTheme.colors.outlineVariant }]}>
                  <TouchableOpacity
                    style={[styles.selectAllButton, { borderColor: safeTheme.colors.outline }]}
                    onPress={() => {
                      if (selectedCopyItems.size === copyItems.length) {
                        setSelectedCopyItems(new Set());
                      } else {
                        setSelectedCopyItems(new Set(copyItems.map(i => i.id)));
                      }
                    }}
                  >
                    <Text style={{ color: safeTheme.colors.onSurface }}>
                      {selectedCopyItems.size === copyItems.length ? "Deselect All" : "Select All"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addSelectedButton, { backgroundColor: safeTheme.colors.primary, opacity: selectedCopyItems.size === 0 ? 0.5 : 1 }]}
                    onPress={handleCopyItems}
                    disabled={selectedCopyItems.size === 0}
                  >
                    <Text style={{ color: safeTheme.colors.onPrimary, fontWeight: 'bold' }}>
                      Copy {selectedCopyItems.size} Items
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Placeholder for Analyze Modal */}
      <Modal
        visible={showAnalyzeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAnalyzeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: safeTheme.colors.background, height: '40%', justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="analytics" size={48} color={safeTheme.colors.primary} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 16, color: safeTheme.colors.onSurface }}>Analysis Coming Soon</Text>
            <Text style={{ color: safeTheme.colors.onSurfaceVariant, marginTop: 8 }}>This feature is under development.</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: safeTheme.colors.primary, marginTop: 24, width: 120 }]}
              onPress={() => setShowAnalyzeModal(false)}
            >
              <Text style={{ color: safeTheme.colors.onPrimary, fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: safeTheme.colors.surface, height: 'auto', padding: 20 }]}>
            <Text style={[styles.modalTitle, { color: safeTheme.colors.onSurface, marginBottom: 16 }]}>Edit Item</Text>
            <TextInput
              style={[styles.input, { backgroundColor: safeTheme.colors.surfaceVariant, color: safeTheme.colors.onSurface, marginBottom: 20 }]}
              value={editItemText}
              onChangeText={setEditItemText}
              autoFocus
              onSubmitEditing={handleSaveEdit}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={{ padding: 10 }}
              >
                <Text style={{ color: safeTheme.colors.onSurfaceVariant }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={{ backgroundColor: safeTheme.colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
              >
                <Text style={{ color: safeTheme.colors.onPrimary, fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tripSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tripSelectorText: {
    fontSize: 16,
    fontWeight: "600",
  },
  tripDropdown: {
    position: "absolute",
    top: 70,
    left: 16,
    right: 16,
    borderRadius: 12,
    zIndex: 100,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tripOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  progressText: {
    fontSize: 16,
    fontWeight: "700",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 12,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  categorySection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 12,
  },
  itemText: {
    fontSize: 16,
  },
  itemDate: {
    fontSize: 12,
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "80%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalBody: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 12,
  },
  templatesScroll: {
    marginBottom: 24,
  },
  templateCard: {
    width: 140,
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    gap: 8,
  },
  templateName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  templateCount: {
    fontSize: 12,
  },
  templateItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  templateItemName: {
    fontSize: 16,
    fontWeight: "500",
  },
  templateItemCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  selectAllButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  addSelectedButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  tripItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  tripItemName: {
    fontSize: 16,
    marginBottom: 4,
  },
});
