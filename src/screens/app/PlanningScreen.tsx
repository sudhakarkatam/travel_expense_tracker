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
  BackHandler,
  KeyboardAvoidingView,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Surface, ProgressBar, Chip, Badge, FAB, Divider } from "react-native-paper";
import { useThemeMode } from "@/contexts/ThemeContext";
import { useApp } from "@/contexts/AppContext";
import { Trip, PackingItem, ActivityItem } from "@/types";
import EmptyState from "@/components/EmptyState";
import { getTemplatesForDestination, getConditionTemplates } from "@/utils/destinationTemplates";
import { MotiView, AnimatePresence } from "moti";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

// Helper for unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

interface PlanningScreenProps {
  navigation: any;
}

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
    },
  };

  const {
    trips,
    addPackingItem,
    updatePackingItem,
    deletePackingItem,
    addActivityItem,
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

  // Modals state
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templateType, setTemplateType] = useState<"packing" | "activities">("packing");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedTemplateItems, setSelectedTemplateItems] = useState<Set<string>>(new Set());

  const selectedTrip = useMemo(() => getTrip(selectedTripId), [selectedTripId, getTrip]);

  const packingItems = useMemo(() => getTripPackingItems(selectedTripId), [selectedTripId, getTripPackingItems]);
  const activityItems = useMemo(() => getTripActivityItems(selectedTripId), [selectedTripId, getTripActivityItems]);

  // Derived state
  const packedCount = packingItems.filter(i => i.packed).length;
  const totalPackingItems = packingItems.length;
  const packingProgress = totalPackingItems > 0 ? packedCount / totalPackingItems : 0;

  const groupedPackingItems = useMemo(() => {
    const groups: Record<string, PackingItem[]> = {};
    packingItems.forEach(item => {
      const category = item.category || "Uncategorized";
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    return groups;
  }, [packingItems]);

  // Templates
  const templates = useMemo(() => {
    if (!selectedTrip) return { packing: [], activities: [] };
    return getTemplatesForDestination(selectedTrip.destination, selectedTrip.destination); // Passing destination as country fallback
  }, [selectedTrip]);

  const conditionTemplates = useMemo(() => getConditionTemplates(), []);

  const handleAddItem = async () => {
    if (!newItemText.trim() || !selectedTripId) return;

    if (activeTab === "packing") {
      await addPackingItem({
        tripId: selectedTripId,
        name: newItemText.trim(),
        category: "Essentials", // Default category
        packed: false,
      });
    } else {
      await addActivityItem({
        tripId: selectedTripId,
        description: newItemText.trim(),
        completed: false,
        date: new Date().toISOString(),
      });
    }
    setNewItemText("");
  };

  const handleTogglePacked = async (item: PackingItem) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    await updatePackingItem(item.id, { packed: !item.packed });
  };

  const handleToggleActivity = async (item: ActivityItem) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    await updateActivityItem(item.id, { completed: !item.completed });
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
    if (!selectedTemplate || !selectedTripId) return;

    const itemsToAdd = Array.from(selectedTemplateItems);
    if (templateType === "packing") {
      const templateItems = selectedTemplate.items.filter((i: any) => itemsToAdd.includes(i.name));
      for (const item of templateItems) {
        await addPackingItem({
          tripId: selectedTripId,
          name: item.name,
          category: item.category,
          packed: false,
        });
      }
    } else {
      const templateActivities = selectedTemplate.activities.filter((a: any) => itemsToAdd.includes(a.description));
      for (const activity of templateActivities) {
        await addActivityItem({
          tripId: selectedTripId,
          description: activity.description,
          completed: false,
          date: new Date().toISOString(), // Or specific date if available
        });
      }
    }

    setShowTemplatesModal(false);
    setSelectedTemplate(null);
    setSelectedTemplateItems(new Set());
    Alert.alert("Success", `Added ${itemsToAdd.length} items to your list.`);
  };

  if (!selectedTrip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={{ color: safeTheme.colors.onSurface }}>No trips found. Create a trip to start planning.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={['top']}>
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
        <TouchableOpacity
          style={[styles.tripSelector, { backgroundColor: safeTheme.colors.surfaceVariant }]}
          onPress={() => setShowTripSelector(true)}
        >
          <View>
            <Text style={[styles.tripLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Planning for</Text>
            <Text style={[styles.tripName, { color: safeTheme.colors.onSurface }]}>{selectedTrip.name}</Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={safeTheme.colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "packing" && styles.activeTab, { borderBottomColor: activeTab === "packing" ? safeTheme.colors.primary : 'transparent' }]}
            onPress={() => setActiveTab("packing")}
          >
            <Text style={[styles.tabText, { color: activeTab === "packing" ? safeTheme.colors.primary : safeTheme.colors.onSurfaceVariant }]}>Packing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "activities" && styles.activeTab, { borderBottomColor: activeTab === "activities" ? safeTheme.colors.primary : 'transparent' }]}
            onPress={() => setActiveTab("activities")}
          >
            <Text style={[styles.tabText, { color: activeTab === "activities" ? safeTheme.colors.primary : safeTheme.colors.onSurfaceVariant }]}>Activities</Text>
          </TouchableOpacity>
        </View>
      </Surface>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>

          {/* Packing Tab Content */}
          {activeTab === "packing" && (
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300 } as any}>
              {/* Progress Card */}
              <Surface style={[styles.card, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: safeTheme.colors.onSurface }]}>Packing Progress</Text>
                  <Text style={[styles.progressText, { color: safeTheme.colors.primary }]}>
                    {Math.round(packingProgress * 100)}%
                  </Text>
                </View>
                <ProgressBar progress={packingProgress} color={safeTheme.colors.primary} style={styles.progressBar} />
                <Text style={[styles.progressSubtext, { color: safeTheme.colors.onSurfaceVariant }]}>
                  {packedCount} of {totalPackingItems} items packed
                </Text>
              </Surface>

              {/* Smart Suggestions / Templates */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Smart Suggestions</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
                  {/* Destination Templates */}
                  {templates.packing.map((template, index) => (
                    <TouchableOpacity
                      key={`dest-${index}`}
                      style={[styles.templateCard, { backgroundColor: safeTheme.colors.primaryContainer }]}
                      onPress={() => {
                        setTemplateType("packing");
                        setSelectedTemplate(template);
                        setShowTemplatesModal(true);
                      }}
                    >
                      <Ionicons name={template.icon as any} size={24} color={safeTheme.colors.onPrimaryContainer} />
                      <Text style={[styles.templateName, { color: safeTheme.colors.onPrimaryContainer }]}>{template.destination}</Text>
                      <Text style={[styles.templateCount, { color: safeTheme.colors.onPrimaryContainer }]}>{template.items.length} items</Text>
                    </TouchableOpacity>
                  ))}

                  {/* Condition Templates */}
                  {conditionTemplates.map((template, index) => (
                    <TouchableOpacity
                      key={`cond-${index}`}
                      style={[styles.templateCard, { backgroundColor: safeTheme.colors.secondaryContainer }]}
                      onPress={() => {
                        setTemplateType("packing");
                        setSelectedTemplate(template);
                        setShowTemplatesModal(true);
                      }}
                    >
                      <Ionicons name={template.icon as any} size={24} color={safeTheme.colors.onSecondaryContainer} />
                      <Text style={[styles.templateName, { color: safeTheme.colors.onSecondaryContainer }]}>{template.destination}</Text>
                      <Text style={[styles.templateCount, { color: safeTheme.colors.onSecondaryContainer }]}>{template.items.length} items</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Packing List */}
              {Object.keys(groupedPackingItems).length === 0 ? (
                <EmptyState
                  icon="briefcase-outline"
                  title="Empty Packing List"
                  subtitle="Start adding items or use a template!"
                />
              ) : (
                Object.entries(groupedPackingItems).map(([category, items]) => (
                  <View key={category} style={styles.categorySection}>
                    <Text style={[styles.categoryTitle, { color: safeTheme.colors.primary }]}>{category}</Text>
                    {items.map((item) => (
                      <Surface key={item.id} style={[styles.itemRow, { backgroundColor: safeTheme.colors.surface }]} elevation={0}>
                        <TouchableOpacity
                          style={styles.checkbox}
                          onPress={() => handleTogglePacked(item)}
                        >
                          <Ionicons
                            name={item.packed ? "checkbox" : "square-outline"}
                            size={24}
                            color={item.packed ? safeTheme.colors.primary : safeTheme.colors.onSurfaceVariant}
                          />
                        </TouchableOpacity>
                        <Text style={[
                          styles.itemText,
                          { color: safeTheme.colors.onSurface },
                          item.packed && { textDecorationLine: 'line-through', color: safeTheme.colors.onSurfaceVariant }
                        ]}>
                          {item.name}
                        </Text>
                        <TouchableOpacity onPress={() => handleDeleteItem(item.id, "packing")}>
                          <Ionicons name="trash-outline" size={20} color={safeTheme.colors.error} />
                        </TouchableOpacity>
                      </Surface>
                    ))}
                  </View>
                ))
              )}
            </MotiView>
          )}

          {/* Activities Tab Content */}
          {activeTab === "activities" && (
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300 } as any}>
              {/* Suggestions */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Top Places & Activities</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
                  {templates.activities.map((template, index) => (
                    <TouchableOpacity
                      key={`act-${index}`}
                      style={[styles.templateCard, { backgroundColor: safeTheme.colors.primaryContainer }]}
                      onPress={() => {
                        setTemplateType("activities");
                        setSelectedTemplate(template);
                        setShowTemplatesModal(true);
                      }}
                    >
                      <Ionicons name={template.icon as any} size={24} color={safeTheme.colors.onPrimaryContainer} />
                      <Text style={[styles.templateName, { color: safeTheme.colors.onPrimaryContainer }]}>{template.destination}</Text>
                      <Text style={[styles.templateCount, { color: safeTheme.colors.onPrimaryContainer }]}>{template.activities.length} places</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Activities List */}
              {activityItems.length === 0 ? (
                <EmptyState
                  icon="map-outline"
                  title="No Activities Planned"
                  subtitle="Add places you want to visit!"
                />
              ) : (
                <View style={styles.listContainer}>
                  {activityItems.map((item) => (
                    <Surface key={item.id} style={[styles.itemRow, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => handleToggleActivity(item)}
                      >
                        <Ionicons
                          name={item.completed ? "checkbox" : "square-outline"}
                          size={24}
                          color={item.completed ? safeTheme.colors.primary : safeTheme.colors.onSurfaceVariant}
                        />
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          styles.itemText,
                          { color: safeTheme.colors.onSurface },
                          item.completed && { textDecorationLine: 'line-through', color: safeTheme.colors.onSurfaceVariant }
                        ]}>
                          {item.description}
                        </Text>
                        {item.date && (
                          <Text style={[styles.itemDate, { color: safeTheme.colors.onSurfaceVariant }]}>
                            {new Date(item.date).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteItem(item.id, "activity")}>
                        <Ionicons name="trash-outline" size={20} color={safeTheme.colors.error} />
                      </TouchableOpacity>
                    </Surface>
                  ))}
                </View>
              )}
            </MotiView>
          )}
        </ScrollView>

        {/* Quick Add Input */}
        <Surface style={[styles.inputContainer, { backgroundColor: safeTheme.colors.surface }]} elevation={4}>
          <TextInput
            style={[styles.input, { color: safeTheme.colors.onSurface, backgroundColor: safeTheme.colors.surfaceVariant }]}
            placeholder={activeTab === "packing" ? "Add item (e.g. Toothbrush)" : "Add activity (e.g. Visit Museum)"}
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

      {/* Trip Selector Modal */}
      <Modal visible={showTripSelector} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Surface style={[styles.modalContent, { backgroundColor: safeTheme.colors.surface }]} elevation={5}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: safeTheme.colors.onSurface }]}>Select Trip</Text>
              <TouchableOpacity onPress={() => setShowTripSelector(false)}>
                <Ionicons name="close" size={24} color={safeTheme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={sortedTrips}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.tripItem, item.id === selectedTripId && { backgroundColor: safeTheme.colors.primaryContainer }]}
                  onPress={() => {
                    setSelectedTripId(item.id);
                    setShowTripSelector(false);
                  }}
                >
                  <Text style={[styles.tripItemName, { color: item.id === selectedTripId ? safeTheme.colors.onPrimaryContainer : safeTheme.colors.onSurface }]}>
                    {item.name}
                  </Text>
                  {item.id === selectedTripId && (
                    <Ionicons name="checkmark" size={20} color={safeTheme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </Surface>
        </View>
      </Modal>

      {/* Templates Modal */}
      <Modal visible={showTemplatesModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: safeTheme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: safeTheme.colors.outlineVariant }]}>
            <Text style={[styles.modalTitle, { color: safeTheme.colors.onSurface }]}>
              {selectedTemplate?.destination} {templateType === "packing" ? "Items" : "Activities"}
            </Text>
            <TouchableOpacity onPress={() => setShowTemplatesModal(false)}>
              <Text style={{ color: safeTheme.colors.primary, fontSize: 16, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {templateType === "packing" ? (
              selectedTemplate?.items.map((item: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.templateItemRow, { borderBottomColor: safeTheme.colors.outlineVariant }]}
                  onPress={() => {
                    const newSet = new Set(selectedTemplateItems);
                    if (newSet.has(item.name)) newSet.delete(item.name);
                    else newSet.add(item.name);
                    setSelectedTemplateItems(newSet);
                  }}
                >
                  <Ionicons
                    name={selectedTemplateItems.has(item.name) ? "checkbox" : "square-outline"}
                    size={24}
                    color={selectedTemplateItems.has(item.name) ? safeTheme.colors.primary : safeTheme.colors.onSurfaceVariant}
                  />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.templateItemName, { color: safeTheme.colors.onSurface }]}>{item.name}</Text>
                    <Text style={[styles.templateItemCategory, { color: safeTheme.colors.onSurfaceVariant }]}>{item.category}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              selectedTemplate?.activities.map((activity: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.templateItemRow, { borderBottomColor: safeTheme.colors.outlineVariant }]}
                  onPress={() => {
                    const newSet = new Set(selectedTemplateItems);
                    if (newSet.has(activity.description)) newSet.delete(activity.description);
                    else newSet.add(activity.description);
                    setSelectedTemplateItems(newSet);
                  }}
                >
                  <Ionicons
                    name={selectedTemplateItems.has(activity.description) ? "checkbox" : "square-outline"}
                    size={24}
                    color={selectedTemplateItems.has(activity.description) ? safeTheme.colors.primary : safeTheme.colors.onSurfaceVariant}
                  />
                  <Text style={[styles.templateItemName, { color: safeTheme.colors.onSurface, marginLeft: 12 }]}>{activity.description}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: safeTheme.colors.outlineVariant, backgroundColor: safeTheme.colors.surface }]}>
            <TouchableOpacity
              style={[styles.selectAllButton, { borderColor: safeTheme.colors.outline }]}
              onPress={() => {
                if (templateType === "packing") {
                  const allItems = selectedTemplate?.items.map((i: any) => i.name) || [];
                  if (selectedTemplateItems.size === allItems.length) setSelectedTemplateItems(new Set());
                  else setSelectedTemplateItems(new Set(allItems));
                } else {
                  const allActivities = selectedTemplate?.activities.map((a: any) => a.description) || [];
                  if (selectedTemplateItems.size === allActivities.length) setSelectedTemplateItems(new Set());
                  else setSelectedTemplateItems(new Set(allActivities));
                }
              }}
            >
              <Text style={{ color: safeTheme.colors.onSurface }}>
                {selectedTemplateItems.size > 0 ? "Deselect All" : "Select All"}
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
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 8,
    paddingBottom: 0,
  },
  tripSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  tripLabel: {
    fontSize: 12,
  },
  tripName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    marginRight: 24,
    paddingBottom: 12,
    borderBottomWidth: 2,
  },
  activeTab: {
    // Border color handled in inline style
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressSubtext: {
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  templatesScroll: {
    flexGrow: 0,
  },
  templateCard: {
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 140,
    height: 100,
    justifyContent: 'space-between',
  },
  templateName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  templateCount: {
    fontSize: 12,
    opacity: 0.8,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 12,
  },
  itemText: {
    fontSize: 16,
    flex: 1,
  },
  itemDate: {
    fontSize: 12,
    marginTop: 2,
  },
  listContainer: {
    gap: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    marginRight: 12,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tripItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  tripItemName: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalBody: {
    flex: 1,
  },
  templateItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  templateItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  templateItemCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  modalFooter: {
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
  },
  selectAllButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  addSelectedButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
});
