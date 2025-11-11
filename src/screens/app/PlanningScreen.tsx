import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SectionList,
  Platform,
  Alert,
  Switch,
  Modal,
  Pressable,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/contexts/AppContext";
import { Trip, PackingItem, ActivityItem } from "@/types";
import EmptyState from "@/components/EmptyState";

// Helper for unique IDs (can be replaced by a proper ID generation library like uuid)
const generateId = () => Math.random().toString(36).substr(2, 9);

// Packing templates
const PACKING_TEMPLATES = [
  {
    name: "Essentials",
    icon: "star",
    items: [
      { name: "Passport", category: "Documents" },
      { name: "Wallet", category: "Essentials" },
      { name: "Phone charger", category: "Electronics" },
      { name: "Keys", category: "Essentials" },
      { name: "Travel insurance", category: "Documents" },
    ],
  },
  {
    name: "Clothes",
    icon: "shirt",
    items: [
      { name: "T-shirts", category: "Clothes" },
      { name: "Pants", category: "Clothes" },
      { name: "Underwear", category: "Clothes" },
      { name: "Socks", category: "Clothes" },
      { name: "Jacket", category: "Clothes" },
    ],
  },
  {
    name: "Electronics",
    icon: "laptop",
    items: [
      { name: "Laptop", category: "Electronics" },
      { name: "Camera", category: "Electronics" },
      { name: "Power bank", category: "Electronics" },
      { name: "Headphones", category: "Electronics" },
      { name: "Adapter", category: "Electronics" },
    ],
  },
  {
    name: "Toiletries",
    icon: "water",
    items: [
      { name: "Toothbrush", category: "Toiletries" },
      { name: "Toothpaste", category: "Toiletries" },
      { name: "Shampoo", category: "Toiletries" },
      { name: "Soap", category: "Toiletries" },
      { name: "Towel", category: "Toiletries" },
    ],
  },
  {
    name: "Documents",
    icon: "document-text",
    items: [
      { name: "Tickets", category: "Documents" },
      { name: "Hotel booking", category: "Documents" },
      { name: "ID card", category: "Documents" },
      { name: "Credit cards", category: "Documents" },
      { name: "Emergency contacts", category: "Documents" },
    ],
  },
];

// India-specific activity templates
const INDIA_ACTIVITY_TEMPLATES = [
  {
    name: "Delhi",
    icon: "location",
    activities: [
      { description: "Visit Red Fort", date: "" },
      { description: "Explore India Gate", date: "" },
      { description: "See Qutub Minar", date: "" },
      { description: "Visit Lotus Temple", date: "" },
      { description: "Shop at Chandni Chowk", date: "" },
    ],
  },
  {
    name: "Mumbai",
    icon: "location",
    activities: [
      { description: "Visit Gateway of India", date: "" },
      { description: "Walk along Marine Drive", date: "" },
      { description: "Explore Elephanta Caves", date: "" },
      { description: "Visit Chhatrapati Shivaji Terminus", date: "" },
      { description: "Try street food at Juhu Beach", date: "" },
    ],
  },
  {
    name: "Goa",
    icon: "location",
    activities: [
      { description: "Relax at Calangute Beach", date: "" },
      { description: "Visit Fort Aguada", date: "" },
      { description: "Explore Spice Plantations", date: "" },
      { description: "See Basilica of Bom Jesus", date: "" },
      { description: "Enjoy water sports", date: "" },
    ],
  },
  {
    name: "Rajasthan",
    icon: "location",
    activities: [
      { description: "Visit Jaipur Palace", date: "" },
      { description: "Explore Udaipur Lake", date: "" },
      { description: "See Jaisalmer Fort", date: "" },
      { description: "Visit Jodhpur Blue City", date: "" },
      { description: "Experience camel safari", date: "" },
    ],
  },
  {
    name: "Kerala",
    icon: "location",
    activities: [
      { description: "Backwaters houseboat tour", date: "" },
      { description: "Visit tea gardens in Munnar", date: "" },
      { description: "Relax at Varkala Beach", date: "" },
      { description: "Explore Periyar Wildlife Sanctuary", date: "" },
      { description: "Watch Kathakali performance", date: "" },
    ],
  },
  {
    name: "Activities",
    icon: "star",
    activities: [
      { description: "Temple visit", date: "" },
      { description: "Street food tour", date: "" },
      { description: "Heritage walk", date: "" },
      { description: "Wildlife safari", date: "" },
      { description: "Yoga session", date: "" },
      { description: "Ayurvedic spa", date: "" },
      { description: "Local market shopping", date: "" },
    ],
  },
];

export default function PlanningScreen({ navigation }: any) {
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

  // Sort trips by latest (most recent first)
  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.startDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.startDate || 0).getTime();
      return dateB - dateA; // Latest first
    });
  }, [trips]);

  const [selectedTripId, setSelectedTripId] = useState(sortedTrips[0]?.id || "");
  const [activeTab, setActiveTab] = useState<"packing" | "activities">(
    "packing",
  );
  const [newPackingItemText, setNewPackingItemText] = useState("");
  const [newPackingItemCategory, setNewPackingItemCategory] = useState("");
  const [newActivityItemText, setNewActivityItemText] = useState("");
  const [newActivityItemDate, setNewActivityItemDate] = useState(""); // YYYY-MM-DD
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showPackingTemplatesModal, setShowPackingTemplatesModal] = useState(false);
  const [showActivityTemplatesModal, setShowActivityTemplatesModal] = useState(false);
  const [showTemplateItemsModal, setShowTemplateItemsModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedTemplateItems, setSelectedTemplateItems] = useState<Set<string>>(new Set());

  const selectedTrip: Trip | undefined = useMemo(
    () => getTrip(selectedTripId),
    [selectedTripId, getTrip],
  );
  const packingItems: PackingItem[] = useMemo(
    () => getTripPackingItems(selectedTripId),
    [selectedTripId, getTripPackingItems],
  );
  const activityItems: ActivityItem[] = useMemo(
    () => getTripActivityItems(selectedTripId),
    [selectedTripId, getTripActivityItems],
  );

  const groupedPackingItems = useMemo(() => {
    const grouped = packingItems.reduce(
      (acc, item) => {
        const category = item.category || "Uncategorized";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      },
      {} as Record<string, PackingItem[]>,
    );

    return Object.keys(grouped).map((category) => ({
      title: category,
      data: grouped[category].sort((a, b) =>
        a.packed === b.packed ? 0 : a.packed ? 1 : -1,
      ), // Packed items at bottom
    }));
  }, [packingItems]);

  const groupedActivityItems = useMemo(() => {
    const grouped = activityItems.reduce(
      (acc, item) => {
        const date = item.date || "No Date";
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(item);
        return acc;
      },
      {} as Record<string, ActivityItem[]>,
    );

    return Object.keys(grouped).map((date) => ({
      title: date,
      data: grouped[date].sort((a, b) =>
        a.completed === b.completed ? 0 : a.completed ? 1 : -1,
      ), // Completed items at bottom
    }));
  }, [activityItems]);

  const handleAddPackingItem = useCallback(() => {
    if (!selectedTripId || !newPackingItemText.trim()) {
      Alert.alert("Error", "Please enter an item name.");
      return;
    }
    const newItem: PackingItem = {
      id: generateId(),
      tripId: selectedTripId,
      name: newPackingItemText.trim(),
      category: newPackingItemCategory.trim() || "Essentials",
      packed: false,
    };
    addPackingItem(newItem);
    setNewPackingItemText("");
    setNewPackingItemCategory("");
  }, [
    selectedTripId,
    newPackingItemText,
    newPackingItemCategory,
    addPackingItem,
  ]);

  const handleTogglePacked = useCallback(
    (item: PackingItem) => {
      updatePackingItem({ ...item, packed: !item.packed });
    },
    [updatePackingItem],
  );

  const handleDeletePackingItem = useCallback(
    (id: string) => {
      Alert.alert(
        "Delete Item",
        "Are you sure you want to delete this packing item?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            onPress: () => deletePackingItem(id),
            style: "destructive",
          },
        ],
      );
    },
    [deletePackingItem],
  );

  const handleAddActivityItem = useCallback(() => {
    if (!selectedTripId || !newActivityItemText.trim()) {
      Alert.alert("Error", "Please enter an activity description.");
      return;
    }
    if (
      !newActivityItemDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(newActivityItemDate)
    ) {
      Alert.alert("Error", "Please enter a valid date (YYYY-MM-DD).");
      return;
    }
    const newItem: ActivityItem = {
      id: generateId(),
      tripId: selectedTripId,
      description: newActivityItemText.trim(),
      date: newActivityItemDate,
      completed: false,
    };
    addActivityItem(newItem);
    setNewActivityItemText("");
    setNewActivityItemDate("");
  }, [
    selectedTripId,
    newActivityItemText,
    newActivityItemDate,
    addActivityItem,
  ]);

  const handleToggleActivityCompleted = useCallback(
    (item: ActivityItem) => {
      updateActivityItem({ ...item, completed: !item.completed });
    },
    [updateActivityItem],
  );

  const handleDeleteActivityItem = useCallback(
    (id: string) => {
      Alert.alert(
        "Delete Activity",
        "Are you sure you want to delete this activity?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            onPress: () => deleteActivityItem(id),
            style: "destructive",
          },
        ],
      );
    },
    [deleteActivityItem],
  );

  const handleAddTemplate = useCallback(
    (template: typeof PACKING_TEMPLATES[0]) => {
      if (!selectedTripId) {
        Alert.alert("Error", "Please select a trip first.");
        return;
      }
      template.items.forEach((item) => {
        const newItem: PackingItem = {
          id: generateId(),
          tripId: selectedTripId,
          name: item.name,
          category: item.category,
          packed: false,
        };
        addPackingItem(newItem);
      });
      Alert.alert("Success", `Added ${template.items.length} items from ${template.name} template.`);
    },
    [selectedTripId, addPackingItem],
  );

  const handleAddActivityTemplate = useCallback(
    (template: typeof INDIA_ACTIVITY_TEMPLATES[0]) => {
      if (!selectedTripId) {
        Alert.alert("Error", "Please select a trip first.");
        return;
      }
      const startDate = selectedTrip?.startDate
        ? new Date(selectedTrip.startDate)
        : new Date();
      template.activities.forEach((activity, index) => {
        const activityDate = new Date(startDate);
        activityDate.setDate(startDate.getDate() + index);
        const newItem: ActivityItem = {
          id: generateId(),
          tripId: selectedTripId,
          description: activity.description,
          date: activity.date || activityDate.toISOString().split("T")[0],
          completed: false,
        };
        addActivityItem(newItem);
      });
      Alert.alert("Success", `Added ${template.activities.length} activities from ${template.name} template.`);
    },
    [selectedTripId, selectedTrip, addActivityItem],
  );

  const handleCopyPackingList = useCallback(
    (sourceTripId: string) => {
      if (!selectedTripId || !sourceTripId || sourceTripId === selectedTripId) {
        Alert.alert("Error", "Please select a different trip to copy from.");
        return;
      }
      const sourcePackingItems = getTripPackingItems(sourceTripId);
      if (sourcePackingItems.length === 0) {
        Alert.alert("Info", "The selected trip has no packing items to copy.");
        setShowCopyModal(false);
        return;
      }
      let copiedCount = 0;
      sourcePackingItems.forEach((item) => {
        const newItem: PackingItem = {
          id: generateId(),
          tripId: selectedTripId,
          name: item.name,
          category: item.category,
          packed: false, // Reset packed status
        };
        addPackingItem(newItem);
        copiedCount++;
      });
      Alert.alert("Success", `Copied ${copiedCount} items from ${getTrip(sourceTripId)?.name || "trip"}.`);
      setShowCopyModal(false);
    },
    [selectedTripId, getTripPackingItems, addPackingItem, getTrip],
  );

  // Update selectedTripId when sortedTrips changes (e.g., new trip added)
  useEffect(() => {
    if (sortedTrips.length > 0 && !sortedTrips.find(t => t.id === selectedTripId)) {
      setSelectedTripId(sortedTrips[0].id);
    }
  }, [sortedTrips, selectedTripId]);

  const renderTripSelector = () => (
    <View style={styles.tripSelectorContainer}>
      <Text style={styles.tripSelectorLabel}>Select Trip</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedTripId || ""}
          onValueChange={(value) => setSelectedTripId(value)}
          style={styles.picker}
          dropdownIconColor="#8b5cf6"
        >
          {sortedTrips.map((trip) => (
            <Picker.Item
              key={trip.id}
              label={`${trip.name} (${trip.startDate ? new Date(trip.startDate).toLocaleDateString() : 'No date'})`}
              value={trip.id}
            />
          ))}
        </Picker>
      </View>
    </View>
  );

  const renderPackingItem = ({ item }: { item: PackingItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemContent}>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={item.packed ? "#f5dd4b" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={() => handleTogglePacked(item)}
          value={item.packed}
        />
        <Text style={[styles.itemName, item.packed && styles.itemPacked]}>
          {item.name}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleDeletePackingItem(item.id)}>
        <Ionicons name="trash-outline" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  const renderActivityItem = ({ item }: { item: ActivityItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemContent}>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={item.completed ? "#f5dd4b" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={() => handleToggleActivityCompleted(item)}
          value={item.completed}
        />
        <Text style={[styles.itemName, item.completed && styles.itemPacked]}>
          {item.description}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleDeleteActivityItem(item.id)}>
        <Ionicons name="trash-outline" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  if (trips.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Planning</Text>
          <Text style={styles.subtitle}>Organize your trips</Text>
        </View>
        <EmptyState
          icon="airplane-outline"
          title="No Trips Yet"
          subtitle="Create a trip to start planning your packing and activities."
          actionText="Create New Trip"
          onActionPress={() => navigation.navigate("AddTrip")}
        />
      </SafeAreaView>
    );
  }

  if (!selectedTrip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Planning</Text>
          <Text style={styles.subtitle}>Organize your trips</Text>
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Trip Not Found"
          subtitle="The selected trip could not be loaded. Please select another."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Planning</Text>
          <Text style={styles.subtitle}>Organize your trips</Text>
        </View>

        {renderTripSelector()}

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "packing" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("packing")}
          >
            <Ionicons
              name={activeTab === "packing" ? "briefcase" : "briefcase-outline"}
              size={20}
              color={activeTab === "packing" ? "#fff" : "#8b5cf6"}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "packing" && styles.tabButtonTextActive,
              ]}
            >
              Packing List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "activities" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("activities")}
          >
            <Ionicons
              name={
                activeTab === "activities" ? "clipboard" : "clipboard-outline"
              }
              size={20}
              color={activeTab === "activities" ? "#fff" : "#8b5cf6"}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "activities" && styles.tabButtonTextActive,
              ]}
            >
              Activities
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "packing" && (
          <View style={styles.tabContent}>
            <View style={styles.templatesSection}>
              <View style={styles.templatesHeader}>
                <Text style={styles.templatesTitle}>Quick Add</Text>
                <View style={styles.templateButtonsRow}>
                  <TouchableOpacity
                    style={styles.templateModalButton}
                    onPress={() => setShowPackingTemplatesModal(true)}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#8b5cf6" />
                    <Text style={styles.templateModalButtonText}>Templates</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => setShowCopyModal(true)}
                  >
                    <Ionicons name="copy-outline" size={18} color="#8b5cf6" />
                    <Text style={styles.copyButtonText}>Copy from Trip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="New packing item (e.g., T-shirt)"
                value={newPackingItemText}
                onChangeText={setNewPackingItemText}
                onSubmitEditing={handleAddPackingItem}
              />
              <TextInput
                style={styles.input}
                placeholder="Category (e.g., Clothes, Electronics)"
                value={newPackingItemCategory}
                onChangeText={setNewPackingItemCategory}
                onSubmitEditing={handleAddPackingItem}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddPackingItem}
              >
                <Ionicons name="add" size={24} color="#fff" />
                <Text style={styles.addButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {packingItems.length === 0 ? (
              <EmptyState
                icon="briefcase-outline"
                title="Empty Packing List"
                subtitle="Add items you need to pack for this trip."
              />
            ) : (
              <SectionList
                sections={groupedPackingItems}
                keyExtractor={(item) => item.id}
                renderItem={renderPackingItem}
                renderSectionHeader={({ section: { title } }) => (
                  <Text style={styles.sectionHeader}>{title}</Text>
                )}
                stickySectionHeadersEnabled={false}
                scrollEnabled={false} // Disable inner scroll, outer ScrollView handles it
                style={styles.list}
              />
            )}
          </View>
        )}

        {activeTab === "activities" && (
          <View style={styles.tabContent}>
            <View style={styles.templatesSection}>
              <View style={styles.templatesHeader}>
                <Text style={styles.templatesTitle}>Quick Add</Text>
                <TouchableOpacity
                  style={styles.templateModalButton}
                  onPress={() => setShowActivityTemplatesModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#8b5cf6" />
                  <Text style={styles.templateModalButtonText}>Templates</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="New activity (e.g., Visit Eiffel Tower)"
                value={newActivityItemText}
                onChangeText={setNewActivityItemText}
                onSubmitEditing={handleAddActivityItem}
              />
              <TextInput
                style={styles.input}
                placeholder="Date (YYYY-MM-DD)"
                value={newActivityItemDate}
                onChangeText={setNewActivityItemDate}
                onSubmitEditing={handleAddActivityItem}
                keyboardType="numeric" // Consider using a date picker in a real app
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddActivityItem}
              >
                <Ionicons name="add" size={24} color="#fff" />
                <Text style={styles.addButtonText}>Add Activity</Text>
              </TouchableOpacity>
            </View>

            {activityItems.length === 0 ? (
              <EmptyState
                icon="clipboard-outline"
                title="No Activities Planned"
                subtitle="Add activities to your itinerary for this trip."
              />
            ) : (
              <SectionList
                sections={groupedActivityItems}
                keyExtractor={(item) => item.id}
                renderItem={renderActivityItem}
                renderSectionHeader={({ section: { title } }) => (
                  <Text style={styles.sectionHeader}>{title}</Text>
                )}
                stickySectionHeadersEnabled={false}
                scrollEnabled={false} // Disable inner scroll, outer ScrollView handles it
                style={styles.list}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Copy Packing List Modal */}
      <Modal
        visible={showCopyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCopyModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCopyModal(false)}
        >
          <View style={styles.modalContent}>
            {Platform.OS === "ios" && <View style={styles.modalHandle} />}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Copy Packing List</Text>
              <TouchableOpacity
                onPress={() => setShowCopyModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              Select a trip to copy packing items from:
            </Text>
            <ScrollView style={styles.modalList}>
              {sortedTrips
                .filter((trip) => trip.id !== selectedTripId)
                .map((trip) => {
                  const sourceItems = getTripPackingItems(trip.id);
                  return (
                    <TouchableOpacity
                      key={trip.id}
                      style={styles.modalTripItem}
                      onPress={() => handleCopyPackingList(trip.id)}
                    >
                      <View style={styles.modalTripInfo}>
                        <Text style={styles.modalTripName}>{trip.name}</Text>
                        <Text style={styles.modalTripDetails}>
                          {sourceItems.length} items • {trip.destination}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Packing Templates Modal */}
      <Modal
        visible={showPackingTemplatesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPackingTemplatesModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPackingTemplatesModal(false)}
        >
          <View style={styles.modalContent}>
            {Platform.OS === "ios" && <View style={styles.modalHandle} />}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Packing Templates</Text>
              <TouchableOpacity
                onPress={() => setShowPackingTemplatesModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              Select templates to add items to your packing list:
            </Text>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
              {PACKING_TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.name}
                  style={styles.templateModalItem}
                  onPress={() => {
                    if (template.items.length > 1) {
                      setSelectedTemplate(template);
                      setSelectedTemplateItems(new Set());
                      setShowPackingTemplatesModal(false);
                      setShowTemplateItemsModal(true);
                    } else {
                      handleAddTemplate(template);
                      setShowPackingTemplatesModal(false);
                    }
                  }}
                >
                  <View style={styles.templateModalItemIcon}>
                    <Ionicons name={template.icon as any} size={24} color="#8b5cf6" />
                  </View>
                  <View style={styles.templateModalItemInfo}>
                    <Text style={styles.templateModalItemName}>{template.name}</Text>
                    <Text style={styles.templateModalItemCount}>
                      {template.items.length} items
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Activity Templates Modal */}
      <Modal
        visible={showActivityTemplatesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActivityTemplatesModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowActivityTemplatesModal(false)}
        >
          <View style={styles.modalContent}>
            {Platform.OS === "ios" && <View style={styles.modalHandle} />}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Activity Templates</Text>
              <TouchableOpacity
                onPress={() => setShowActivityTemplatesModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              Select templates to add activities to your itinerary:
            </Text>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
              {INDIA_ACTIVITY_TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.name}
                  style={styles.templateModalItem}
                  onPress={() => {
                    if (template.activities.length > 1) {
                      setSelectedTemplate(template);
                      setSelectedTemplateItems(new Set());
                      setShowActivityTemplatesModal(false);
                      setShowTemplateItemsModal(true);
                    } else {
                      handleAddActivityTemplate(template);
                      setShowActivityTemplatesModal(false);
                    }
                  }}
                >
                  <View style={styles.templateModalItemIcon}>
                    <Ionicons name={template.icon as any} size={24} color="#8b5cf6" />
                  </View>
                  <View style={styles.templateModalItemInfo}>
                    <Text style={styles.templateModalItemName}>{template.name}</Text>
                    <Text style={styles.templateModalItemCount}>
                      {template.activities.length} activities
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Template Items Selection Modal */}
      <Modal
        visible={showTemplateItemsModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowTemplateItemsModal(false);
          setSelectedTemplate(null);
          setSelectedTemplateItems(new Set());
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowTemplateItemsModal(false);
            setSelectedTemplate(null);
            setSelectedTemplateItems(new Set());
          }}
        >
          <View style={styles.modalContent}>
            {Platform.OS === "ios" && <View style={styles.modalHandle} />}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedTemplate?.name || 'Select Items'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowTemplateItemsModal(false);
                  setSelectedTemplate(null);
                  setSelectedTemplateItems(new Set());
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              Select items to add (tap to select/deselect):
            </Text>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
              {selectedTemplate?.items?.map((item: any, index: number) => {
                const itemKey = item.name || item.description || index.toString();
                const isSelected = selectedTemplateItems.has(itemKey);
                return (
                  <TouchableOpacity
                    key={itemKey}
                    style={[styles.templateItemRow, isSelected && styles.templateItemRowSelected]}
                    onPress={() => {
                      const newSelected = new Set(selectedTemplateItems);
                      if (isSelected) {
                        newSelected.delete(itemKey);
                      } else {
                        newSelected.add(itemKey);
                      }
                      setSelectedTemplateItems(newSelected);
                    }}
                  >
                    <View style={styles.templateItemCheckbox}>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" />
                      )}
                      {!isSelected && (
                        <Ionicons name="ellipse-outline" size={24} color="#8E8E93" />
                      )}
                    </View>
                    <View style={styles.templateItemInfo}>
                      <Text style={styles.templateItemName}>
                        {item.name || item.description}
                      </Text>
                      {item.category && (
                        <Text style={styles.templateItemCategory}>{item.category}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
              {selectedTemplate?.activities?.map((activity: any, index: number) => {
                const itemKey = activity.description || index.toString();
                const isSelected = selectedTemplateItems.has(itemKey);
                return (
                  <TouchableOpacity
                    key={itemKey}
                    style={[styles.templateItemRow, isSelected && styles.templateItemRowSelected]}
                    onPress={() => {
                      const newSelected = new Set(selectedTemplateItems);
                      if (isSelected) {
                        newSelected.delete(itemKey);
                      } else {
                        newSelected.add(itemKey);
                      }
                      setSelectedTemplateItems(newSelected);
                    }}
                  >
                    <View style={styles.templateItemCheckbox}>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" />
                      )}
                      {!isSelected && (
                        <Ionicons name="ellipse-outline" size={24} color="#8E8E93" />
                      )}
                    </View>
                    <View style={styles.templateItemInfo}>
                      <Text style={styles.templateItemName}>{activity.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.templateItemsFooter}>
              <TouchableOpacity
                style={[styles.templateItemsAddButton, selectedTemplateItems.size === 0 && styles.templateItemsAddButtonDisabled]}
                onPress={() => {
                  if (selectedTemplateItems.size > 0 && selectedTemplate) {
                    if (selectedTemplate.items) {
                      // Packing items
                      const itemsToAdd = selectedTemplate.items.filter((item: any, index: number) => {
                        const itemKey = item.name || index.toString();
                        return selectedTemplateItems.has(itemKey);
                      });
                      itemsToAdd.forEach((item: any) => {
                        if (selectedTripId) {
                          addPackingItem({
                            id: generateId(),
                            tripId: selectedTripId,
                            name: item.name,
                            category: item.category || "Other",
                            isPacked: false,
                          });
                        }
                      });
                    } else if (selectedTemplate.activities) {
                      // Activity items
                      const activitiesToAdd = selectedTemplate.activities.filter((activity: any, index: number) => {
                        const itemKey = activity.description || index.toString();
                        return selectedTemplateItems.has(itemKey);
                      });
                      activitiesToAdd.forEach((activity: any) => {
                        if (selectedTripId && selectedTrip) {
                          const activityDate = activity.date || selectedTrip.startDate;
                          addActivityItem({
                            id: generateId(),
                            tripId: selectedTripId,
                            description: activity.description,
                            date: activityDate,
                            isCompleted: false,
                          });
                        }
                      });
                    }
                    setShowTemplateItemsModal(false);
                    setSelectedTemplate(null);
                    setSelectedTemplateItems(new Set());
                  }
                }}
                disabled={selectedTemplateItems.size === 0}
              >
                <Text style={[styles.templateItemsAddButtonText, selectedTemplateItems.size === 0 && styles.templateItemsAddButtonTextDisabled]}>
                  Add Selected ({selectedTemplateItems.size})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#8E8E93",
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  tripSelectorContainer: {
    marginBottom: 20,
  },
  tripSelectorLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  picker: {
    height: Platform.OS === "ios" ? 200 : 50,
    backgroundColor: "#FFFFFF",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E5E5EA",
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: "#8b5cf6",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  tabContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  inputGroup: {
    marginBottom: 20,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#F9F9FB",
    color: "#000000",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: "#F2F2F7",
    paddingVertical: 5,
    paddingHorizontal: 5, // Match list padding if any
  },
  list: {
    // Add any specific list styling here
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9F9FB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 16,
    color: "#000000",
    marginLeft: 10,
    flex: 1,
  },
  itemPacked: {
    textDecorationLine: "line-through",
    color: "#8E8E93",
  },
  templatesSection: {
    marginBottom: 20,
  },
  templatesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  templatesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  templateButtonsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  templateModalButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
  },
  templateModalButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  templatesScroll: {
    marginHorizontal: -16,
  },
  templatesScrollContent: {
    paddingHorizontal: 16,
  },
  templateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
    marginLeft: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    gap: 6,
  },
  templateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: "#C7C7CC",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 15,
    color: "#333333",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalList: {
    maxHeight: 400,
  },
  modalTripItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  modalTripInfo: {
    flex: 1,
  },
  modalTripName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  modalTripDetails: {
    fontSize: 13,
    color: "#8E8E93",
  },
  modalListContent: {
    paddingBottom: 20,
  },
  templateModalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  templateModalItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  templateModalItemInfo: {
    flex: 1,
  },
  templateModalItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  templateModalItemCount: {
    fontSize: 13,
    color: "#8E8E93",
  },
  templateItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
    backgroundColor: "#FFFFFF",
  },
  templateItemRowSelected: {
    backgroundColor: "#F2F2F7",
  },
  templateItemCheckbox: {
    marginRight: 12,
  },
  templateItemInfo: {
    flex: 1,
  },
  templateItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  templateItemCategory: {
    fontSize: 13,
    color: "#8E8E93",
  },
  templateItemsFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
    backgroundColor: "#FFFFFF",
  },
  templateItemsAddButton: {
    backgroundColor: "#8b5cf6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  templateItemsAddButtonDisabled: {
    backgroundColor: "#E5E5EA",
  },
  templateItemsAddButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  templateItemsAddButtonTextDisabled: {
    color: "#8E8E93",
  },
});
