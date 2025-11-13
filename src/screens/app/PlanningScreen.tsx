import React, { useState, useMemo, useCallback, useEffect } from "react";
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
  Pressable,
  Animated,
  Dimensions,
  BackHandler,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Surface } from "react-native-paper";
import { useApp } from "@/contexts/AppContext";
import { Trip, PackingItem, ActivityItem } from "@/types";
import EmptyState from "@/components/EmptyState";
import { getTemplatesForDestination, getDurationBasedSuggestions, getConditionTemplates } from "@/utils/destinationTemplates";
import { TouchableNativeFeedback } from "react-native";

const { width } = Dimensions.get("window");

// Helper for unique IDs
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
      { description: "Explore Marine Drive", date: "" },
      { description: "See Elephanta Caves", date: "" },
      { description: "Visit Chhatrapati Shivaji Terminus", date: "" },
      { description: "Shop at Colaba Causeway", date: "" },
    ],
  },
  {
    name: "Goa",
    icon: "location",
    activities: [
      { description: "Relax at Baga Beach", date: "" },
      { description: "Visit Basilica of Bom Jesus", date: "" },
      { description: "Explore Spice Plantations", date: "" },
      { description: "Try water sports", date: "" },
      { description: "Visit Dudhsagar Falls", date: "" },
    ],
  },
];

interface PlanningScreenProps {
  navigation: any;
}

export default function PlanningScreen({ navigation }: PlanningScreenProps) {
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
      onError: theme?.colors?.onError || '#FFFFFF',
      outline: theme?.colors?.outline || '#E5E5E5',
      outlineVariant: theme?.colors?.outlineVariant || '#E5E5E5',
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

  // Sort trips by latest (most recent first)
  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.startDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.startDate || 0).getTime();
      return dateB - dateA;
    });
  }, [trips]);

  const [selectedTripId, setSelectedTripId] = useState(sortedTrips[0]?.id || "");
  const [activeTab, setActiveTab] = useState<"packing" | "activities" | "itinerary">("packing");
  const [newPackingItemText, setNewPackingItemText] = useState("");
  const [newActivityItemText, setNewActivityItemText] = useState("");
  const [newActivityItemDate, setNewActivityItemDate] = useState("");
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showPackingTemplatesModal, setShowPackingTemplatesModal] = useState(false);
  const [showActivityTemplatesModal, setShowActivityTemplatesModal] = useState(false);
  const [showTemplateItemsModal, setShowTemplateItemsModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedTemplateItems, setSelectedTemplateItems] = useState<Set<string>>(new Set());
  const [showAddInput, setShowAddInput] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<"location" | "category" | "general">("location");
  const [showCopyItemsModal, setShowCopyItemsModal] = useState(false);
  const [selectedCopyTrip, setSelectedCopyTrip] = useState<Trip | null>(null);
  const [selectedCopyItems, setSelectedCopyItems] = useState<Set<string>>(new Set());
  // Modal history for back button navigation
  const [modalHistory, setModalHistory] = useState<string[]>([]);

  // Handle hardware back button for modal navigation
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // If template items modal is open, check history
      if (showTemplateItemsModal) {
        if (modalHistory.length > 0) {
          // Navigate back to previous modal
          const previousModal = modalHistory[modalHistory.length - 1];
          setModalHistory(prev => prev.slice(0, -1));
          setShowTemplateItemsModal(false);
          setTimeout(() => {
            setSelectedTemplate(null);
            setSelectedTemplateItems(new Set());
            if (previousModal === 'packing') {
              setShowPackingTemplatesModal(true);
            } else if (previousModal === 'activity') {
              setShowActivityTemplatesModal(true);
            }
          }, 100);
          return true; // Prevent default back behavior
        } else {
          // No history, close modal (returns to planning tab)
          setShowTemplateItemsModal(false);
          setSelectedTemplate(null);
          setSelectedTemplateItems(new Set());
          setModalHistory([]);
          return true; // Prevent default back behavior
        }
      }
      
      // Handle other modals
      if (showCopyItemsModal) {
        // Go back to copy modal
        setShowCopyItemsModal(false);
        setSelectedCopyTrip(null);
        setSelectedCopyItems(new Set());
        setShowCopyModal(true);
        return true;
      }
      
      if (showCopyModal) {
        setShowCopyModal(false);
        return true;
      }
      
      if (showPackingTemplatesModal) {
        setShowPackingTemplatesModal(false);
        setTemplateCategory("location");
        return true;
      }
      
      if (showActivityTemplatesModal) {
        setShowActivityTemplatesModal(false);
        return true;
      }
      
      if (showAddInput) {
        setShowAddInput(false);
        return true;
      }
      
      // Let default back behavior happen (navigate away from screen)
      return false;
    });

    return () => backHandler.remove();
  }, [showTemplateItemsModal, showCopyItemsModal, showCopyModal, showPackingTemplatesModal, showActivityTemplatesModal, showAddInput, modalHistory]);

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

  // Get destination-based templates
  const destinationTemplates = useMemo(() => {
    if (!selectedTrip) return { packing: [], activities: [] };
    return getTemplatesForDestination(selectedTrip.destination);
  }, [selectedTrip]);

  // Get condition-based templates
  const conditionTemplates = useMemo(() => getConditionTemplates(), []);

  // Separate location-based and category-based templates
  const locationBasedTemplates = useMemo(() => {
    return destinationTemplates.packing.filter(t => {
      const dest = t.destination.toLowerCase();
      return t.country || 
             dest.includes(',') || 
             dest.includes(' ') ||
             ['delhi', 'mumbai', 'goa', 'paris', 'london', 'new york', 'tokyo', 'dubai'].some(loc => dest.includes(loc));
    });
  }, [destinationTemplates]);

  const categoryBasedTemplates = useMemo(() => {
    return conditionTemplates;
  }, [conditionTemplates]);

  const availablePackingTemplates = useMemo(() => {
    const allTemplates = [...locationBasedTemplates, ...categoryBasedTemplates];
    if (locationBasedTemplates.length === 0 && categoryBasedTemplates.length === 0) {
      allTemplates.push(...PACKING_TEMPLATES.map(t => ({
        destination: t.name,
        icon: t.icon,
        items: t.items,
      })));
    }
    return allTemplates;
  }, [locationBasedTemplates, categoryBasedTemplates]);

  const availableActivityTemplates = useMemo(() => {
    const allTemplates = [...destinationTemplates.activities];
    if (destinationTemplates.activities.length === 0) {
      allTemplates.push(...INDIA_ACTIVITY_TEMPLATES);
    }
    return allTemplates;
  }, [destinationTemplates]);

  // Unified packing list - unchecked on top, checked on bottom
  const sortedPackingItems = useMemo(() => {
    return [...packingItems].sort((a, b) => {
      if (a.packed === b.packed) {
        return a.name.localeCompare(b.name);
      }
      return a.packed ? 1 : -1;
    });
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
      ),
    }));
  }, [activityItems]);

  const handleAddPackingItem = useCallback(() => {
    if (!selectedTripId || !newPackingItemText.trim()) {
      return;
    }
    const newItem: PackingItem = {
      id: generateId(),
      tripId: selectedTripId,
      name: newPackingItemText.trim(),
      category: "Packing List",
      packed: false,
    };
    addPackingItem(newItem);
    setNewPackingItemText("");
    setShowAddInput(false);
  }, [selectedTripId, newPackingItemText, addPackingItem]);

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
        "Are you sure you want to delete this item?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deletePackingItem(id),
          },
        ],
      );
    },
    [deletePackingItem],
  );

  const handleAddActivityItem = useCallback(() => {
    if (!selectedTripId || !newActivityItemText.trim()) {
      return;
    }
    const activityDate = newActivityItemDate || selectedTrip?.startDate || new Date().toISOString().split('T')[0];
    const newItem: ActivityItem = {
      id: generateId(),
      tripId: selectedTripId,
      description: newActivityItemText.trim(),
      date: activityDate,
      completed: false,
    };
    addActivityItem(newItem);
    setNewActivityItemText("");
    setNewActivityItemDate("");
    setShowAddInput(false);
  }, [selectedTripId, newActivityItemText, newActivityItemDate, selectedTrip, addActivityItem]);

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
            style: "destructive",
            onPress: () => deleteActivityItem(id),
          },
        ],
      );
    },
    [deleteActivityItem],
  );

  const handleAddTemplate = useCallback(
    (template: any) => {
      if (!selectedTripId) {
        Alert.alert("Error", "Please select a trip first.");
        return;
      }
      template.items.forEach((item: any) => {
        const newItem: PackingItem = {
          id: generateId(),
          tripId: selectedTripId,
          name: item.name,
          category: "Packing List",
          packed: false,
        };
        addPackingItem(newItem);
      });
      Alert.alert("Success", `Added ${template.items.length} items from ${template.destination || template.name} template.`);
    },
    [selectedTripId, addPackingItem],
  );

  const handleAddActivityTemplate = useCallback(
    (template: any) => {
      if (!selectedTripId || !selectedTrip) {
        Alert.alert("Error", "Please select a trip first.");
        return;
      }
      template.activities.forEach((activity: any) => {
        const activityDate = activity.date || selectedTrip.startDate;
        const newItem: ActivityItem = {
          id: generateId(),
          tripId: selectedTripId,
          description: activity.description,
          date: activityDate,
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
      const trip = getTrip(sourceTripId);
      setSelectedCopyTrip(trip || null);
      setSelectedCopyItems(new Set());
      setShowCopyModal(false);
      setShowCopyItemsModal(true);
    },
    [selectedTripId, getTripPackingItems, getTrip],
  );

  // Helper to count selected items properly
  const getSelectedItemsCount = useCallback((items: any[], selectedSet: Set<string>) => {
    let count = 0;
    items.forEach((item: any, index: number) => {
      const itemKey = `item_${index}`;
      if (selectedSet.has(itemKey)) {
        count++;
      }
    });
    return count;
  }, []);

  const handleConfirmCopyItems = useCallback(() => {
    if (!selectedTripId || !selectedCopyTrip || selectedCopyItems.size === 0) {
      return;
    }
    const sourcePackingItems = getTripPackingItems(selectedCopyTrip.id);
    let copiedCount = 0;
    
    sourcePackingItems.forEach((item, index) => {
      const itemKey = `copy_item_${index}`;
      if (selectedCopyItems.has(itemKey)) {
        // Generate unique ID for each copied item
        const uniqueId = generateId();
        const newItem: PackingItem = {
          id: uniqueId,
          tripId: selectedTripId,
          name: item.name,
          category: "Packing List",
          packed: false,
        };
        addPackingItem(newItem);
        copiedCount++;
      }
    });
    
    Alert.alert("Success", `Copied ${copiedCount} item${copiedCount > 1 ? 's' : ''} from ${selectedCopyTrip?.name || 'trip'}.`);
    setShowCopyItemsModal(false);
    setSelectedCopyTrip(null);
    setSelectedCopyItems(new Set());
  }, [selectedTripId, selectedCopyTrip, selectedCopyItems, getTripPackingItems, addPackingItem]);

  // Native button component with proper TypeScript interface
  interface NativeButtonProps {
    onPress: () => void;
    children: React.ReactNode;
    style?: any;
    variant?: "primary" | "secondary" | "ghost";
  }
  
  const NativeButton = ({ onPress, children, style, variant = "primary" }: NativeButtonProps) => {
    const buttonContent = (
      <View style={[styles.nativeButton, styles[`nativeButton_${variant}`], style]}>
        {children}
      </View>
    );

    if (Platform.OS === "android") {
      return (
        <TouchableNativeFeedback
          onPress={onPress}
          background={TouchableNativeFeedback.Ripple("#00000020", false)}
        >
          {buttonContent}
        </TouchableNativeFeedback>
      );
    }

    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {buttonContent}
      </TouchableOpacity>
    );
  };

  // Render trip selector
  const renderTripSelector = () => (
    <View style={styles.tripSelectorWrapper}>
      <Text style={styles.tripSelectorLabel}>Select Trip</Text>
      <View style={styles.tripSelectorContainer}>
        <Picker
          selectedValue={selectedTripId}
          onValueChange={setSelectedTripId}
          style={styles.tripPicker}
        >
          {sortedTrips.map((trip) => (
            <Picker.Item key={trip.id} label={trip.name} value={trip.id} />
          ))}
        </Picker>
      </View>
    </View>
  );

  // Render segmented control for tabs (iOS style)
  const renderSegmentedControl = () => {
    const tabs = [
      { key: "packing", label: "Packing", icon: "bag-outline" },
      { key: "activities", label: "Activities", icon: "calendar-outline" },
      { key: "itinerary", label: "Itinerary", icon: "map-outline" },
    ];

    return (
      <View style={styles.segmentedControl}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <NativeButton
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              variant={isActive ? "primary" : "secondary"}
              style={[styles.segmentedButton, isActive && styles.segmentedButtonActive]}
            >
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={isActive ? safeTheme.colors.onPrimary : safeTheme.colors.primary}
                style={styles.segmentedIcon}
              />
              <Text style={[styles.segmentedText, isActive && styles.segmentedTextActive]}>
                {tab.label}
              </Text>
            </NativeButton>
          );
        })}
      </View>
    );
  };

  // Render packing list
  const renderPackingList = () => {
    if (sortedPackingItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="bag-outline" size={64} color={safeTheme.colors.onSurfaceVariant} />
          <Text style={[styles.emptyTitle, { color: safeTheme.colors.onSurface }]}>No items yet</Text>
          <Text style={[styles.emptySubtitle, { color: safeTheme.colors.onSurfaceVariant }]}>Tap the + button to add items</Text>
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {sortedPackingItems.map((item) => (
          <NativeButton
            key={item.id}
            onPress={() => handleTogglePacked(item)}
            variant="ghost"
            style={styles.packingItemCard}
          >
            <View style={styles.packingItemContent}>
              <View style={[styles.checkbox, item.packed && styles.checkboxChecked]}>
                {item.packed && (
                  <Ionicons name="checkmark" size={16} color={safeTheme.colors.onPrimary} />
                )}
              </View>
              <Text style={[styles.packingItemName, item.packed && styles.packingItemNameChecked]}>
                {item.name}
          </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDeletePackingItem(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.deleteIconButton}
            >
              <Ionicons name="trash-outline" size={20} color={safeTheme.colors.error} />
        </TouchableOpacity>
          </NativeButton>
        ))}
      </View>
    );
  };

  // Render activities list
  const renderActivitiesList = () => {
    if (activityItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={safeTheme.colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>No activities yet</Text>
          <Text style={styles.emptySubtitle}>Tap the + button to add activities</Text>
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {groupedActivityItems.map((section) => (
          <View key={section.title} style={styles.activitySection}>
            <Text style={styles.activitySectionTitle}>{section.title}</Text>
            {section.data.map((item) => (
              <NativeButton
                key={item.id}
                onPress={() => handleToggleActivityCompleted(item)}
                variant="ghost"
                style={styles.activityItemCard}
              >
                <View style={styles.activityItemContent}>
                  <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
                    {item.completed && (
                      <Ionicons name="checkmark" size={16} color={safeTheme.colors.onPrimary} />
                    )}
                  </View>
                  <View style={styles.activityItemText}>
                    <Text style={[styles.activityItemName, item.completed && styles.activityItemNameChecked]}>
                      {item.description}
        </Text>
      </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteActivityItem(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.deleteIconButton}
                >
                  <Ionicons name="trash-outline" size={20} color={safeTheme.colors.error} />
      </TouchableOpacity>
              </NativeButton>
            ))}
          </View>
        ))}
    </View>
  );
  };

  // Generate days for itinerary
  const itineraryDays = useMemo(() => {
    if (!selectedTrip) return [];
    const startDate = new Date(selectedTrip.startDate);
    const endDate = new Date(selectedTrip.endDate);
    const days: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, [selectedTrip]);

  // Render itinerary
  const renderItinerary = () => {
    if (!selectedTrip) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={64} color={safeTheme.colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>Select a trip</Text>
          <Text style={styles.emptySubtitle}>Choose a trip to view itinerary</Text>
        </View>
      );
    }

    if (itineraryDays.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={safeTheme.colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>No Itinerary Days</Text>
          <Text style={styles.emptySubtitle}>Set trip dates to generate itinerary</Text>
        </View>
      );
    }

    return (
      <View style={styles.itineraryContainer}>
        {itineraryDays.map((day, index) => {
          const dayKey = day.toISOString().split('T')[0];
          const dayActivities = activityItems.filter(item => item.date === dayKey);
          const isToday = dayKey === new Date().toISOString().split('T')[0];
          
          return (
            <View key={dayKey} style={styles.itineraryDayCard}>
              <View style={styles.itineraryDayHeader}>
                <View style={styles.itineraryDayInfo}>
                  <Text style={styles.itineraryDayNumber}>Day {index + 1}</Text>
                  <Text style={styles.itineraryDayDate}>
                    {day.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}
        </Text>
      </View>
                {isToday && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>Today</Text>
                  </View>
                )}
              </View>

              {dayActivities.length === 0 ? (
                <View style={styles.emptyDayActivities}>
                  <Ionicons name="add-circle-outline" size={24} color={safeTheme.colors.primary} />
                  <Text style={styles.emptyDayActivitiesText}>
                    No activities planned. Tap + to add.
                  </Text>
                </View>
              ) : (
                <View style={styles.dayActivitiesList}>
                  {dayActivities.map((activity, actIndex) => (
                    <View key={activity.id} style={styles.itineraryActivityItem}>
                      <NativeButton
                        onPress={() => handleToggleActivityCompleted(activity)}
                        variant="ghost"
                        style={styles.itineraryActivityButton}
                      >
                        <View style={styles.itineraryActivityContent}>
                          <View style={styles.itineraryActivityLeft}>
                            <View style={styles.itineraryActivityTime}>
                              <Ionicons name="time-outline" size={16} color={safeTheme.colors.primary} />
                              <Text style={styles.itineraryActivityTimeText}>
                                {actIndex + 1}
                              </Text>
                            </View>
                            <View style={styles.itineraryActivityInfo}>
                              <Text style={[styles.itineraryActivityDescription, activity.completed && styles.itineraryActivityCompleted]}>
                                {activity.description}
                              </Text>
                              {activity.completed && (
                                <View style={styles.completedBadge}>
                                  <Ionicons name="checkmark-circle" size={14} color={safeTheme.colors.success} />
                                  <Text style={styles.completedBadgeText}>Completed</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <View style={[styles.checkbox, activity.completed && styles.checkboxChecked]}>
                            {activity.completed && (
                              <Ionicons name="checkmark" size={16} color={safeTheme.colors.onPrimary} />
                            )}
                          </View>
                        </View>
                      </NativeButton>
                      <TouchableOpacity
                        onPress={() => handleDeleteActivityItem(activity.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.itineraryDeleteButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={safeTheme.colors.error} />
      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <NativeButton
                onPress={() => {
                  setNewActivityItemDate(dayKey);
                  setShowAddInput(true);
                }}
                variant="secondary"
                style={styles.addDayActivityButton}
              >
                <Ionicons name="add-circle" size={20} color={safeTheme.colors.primary} />
                <Text style={styles.addDayActivityButtonText}>Add Activity</Text>
              </NativeButton>
    </View>
  );
        })}
      </View>
    );
  };

  // Render quick actions
  const renderQuickActions = () => {
    if (activeTab === "packing") {
      return (
        <View style={styles.quickActionsContainer}>
          <NativeButton
            onPress={() => setShowPackingTemplatesModal(true)}
            variant="secondary"
            style={styles.quickActionButton}
          >
            <Ionicons name="layers-outline" size={20} color={safeTheme.colors.primary} />
            <Text style={styles.quickActionText}>Templates</Text>
          </NativeButton>
          <NativeButton
            onPress={() => setShowCopyModal(true)}
            variant="secondary"
            style={styles.quickActionButton}
          >
            <Ionicons name="copy-outline" size={20} color={safeTheme.colors.primary} />
            <Text style={styles.quickActionText}>Copy List</Text>
          </NativeButton>
        </View>
      );
    }

    if (activeTab === "activities") {
      return (
        <View style={styles.quickActionsContainer}>
          <NativeButton
            onPress={() => setShowActivityTemplatesModal(true)}
            variant="secondary"
            style={styles.quickActionButton}
          >
            <Ionicons name="layers-outline" size={20} color={safeTheme.colors.primary} />
            <Text style={styles.quickActionText}>Templates</Text>
          </NativeButton>
        </View>
      );
    }

    return null;
  };

  if (trips.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={['top']}>
        <Surface style={[styles.header, { backgroundColor: safeTheme.colors.surface, borderBottomColor: safeTheme.colors.outlineVariant }]} elevation={1}>
          <Text style={[styles.headerTitle, { color: safeTheme.colors.onSurface }]}>Planning</Text>
        </Surface>
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
      <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={['top']}>
        <Surface style={[styles.header, { backgroundColor: safeTheme.colors.surface, borderBottomColor: safeTheme.colors.outlineVariant }]} elevation={1}>
          <Text style={[styles.headerTitle, { color: safeTheme.colors.onSurface }]}>Planning</Text>
        </Surface>
        <EmptyState
          icon="alert-circle-outline"
          title="Trip Not Found"
          subtitle="The selected trip could not be loaded. Please select another."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={['top']}>
        <Surface style={[styles.header, { backgroundColor: safeTheme.colors.surface, borderBottomColor: safeTheme.colors.outlineVariant }]} elevation={1}>
        <Text style={[styles.headerTitle, { color: safeTheme.colors.onSurface }]}>Planning</Text>
        </Surface>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
          {renderTripSelector()}
        {renderSegmentedControl()}

        <View style={styles.contentSection}>
          {activeTab === "packing" && renderPackingList()}
          {activeTab === "activities" && renderActivitiesList()}
          {activeTab === "itinerary" && renderItinerary()}
        </View>

        {renderQuickActions()}
      </ScrollView>

      {/* Floating Add Button */}
      {!showAddInput && (
          <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddInput(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={safeTheme.colors.onPrimary} />
        </TouchableOpacity>
      )}

      {/* Add Input Modal */}
      <Modal
        visible={showAddInput}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddInput(false);
          setNewPackingItemText("");
          setNewActivityItemText("");
          setNewActivityItemDate("");
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowAddInput(false);
            setNewPackingItemText("");
            setNewActivityItemText("");
            setNewActivityItemDate("");
          }}
        >
          <Pressable style={styles.addInputModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.addInputHeader}>
              <Text style={styles.addInputTitle}>
                {activeTab === "packing" ? "Add Packing Item" : "Add Activity"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddInput(false);
                  setNewPackingItemText("");
                  setNewActivityItemText("");
                  setNewActivityItemDate("");
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={safeTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <View style={styles.addInputContent}>
              <View style={styles.inputWrapper}>
            <Ionicons
                  name={activeTab === "packing" ? "bag-outline" : "calendar-outline"}
              size={20}
                  color={safeTheme.colors.onSurfaceVariant}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.modernInput}
                  placeholder={activeTab === "packing" ? "Item name..." : "Activity description..."}
                  value={activeTab === "packing" ? newPackingItemText : newActivityItemText}
                  onChangeText={activeTab === "packing" ? setNewPackingItemText : setNewActivityItemText}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={activeTab === "packing" ? handleAddPackingItem : handleAddActivityItem}
                />
              </View>

              {activeTab === "activities" && (
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={20} color={safeTheme.colors.onSurfaceVariant} style={styles.inputIcon} />
                  <TextInput
                    style={styles.modernInput}
                    placeholder="Date (YYYY-MM-DD)"
                    value={newActivityItemDate}
                    onChangeText={setNewActivityItemDate}
                    keyboardType="numeric"
                  />
                </View>
              )}

              <NativeButton
                onPress={activeTab === "packing" ? handleAddPackingItem : handleAddActivityItem}
                variant="primary"
                style={styles.addButton}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </NativeButton>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Copy Packing List Modal */}
      <Modal
        visible={showCopyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCopyModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCopyModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {Platform.OS === "ios" && <View style={styles.modalHandle} />}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Copy Packing List</Text>
              <TouchableOpacity onPress={() => setShowCopyModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={safeTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.modalList}
              contentContainerStyle={styles.modalListContent}
              showsVerticalScrollIndicator={true}
            >
              {sortedTrips
                .filter((trip) => {
                  if (trip.id === selectedTripId) return false;
                  const sourceItems = getTripPackingItems(trip.id);
                  return sourceItems.length > 0;
                })
                .map((trip) => {
                  const sourceItems = getTripPackingItems(trip.id);
                  return (
                    <NativeButton
                      key={trip.id}
                      onPress={() => {
                        handleCopyPackingList(trip.id);
                      }}
                      variant="ghost"
                      style={styles.modalListItem}
                    >
                      <View style={styles.modalListItemContent}>
                        <Text style={styles.modalListItemTitle}>{trip.name}</Text>
                        <Text style={styles.modalListItemSubtitle}>
                          {sourceItems.length} item{sourceItems.length !== 1 ? 's' : ''} • {trip.destination || 'No destination'}
            </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={safeTheme.colors.onSurfaceVariant} />
                    </NativeButton>
                  );
                })}
              {sortedTrips.filter((trip) => trip.id !== selectedTripId && getTripPackingItems(trip.id).length > 0).length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="bag-outline" size={48} color={safeTheme.colors.onSurfaceVariant} />
                  <Text style={styles.emptyTitle}>No trips available</Text>
                  <Text style={styles.emptySubtitle}>No trips with packing items to copy</Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Copy Items Selection Modal */}
      <Modal
        visible={showCopyItemsModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCopyItemsModal(false);
          setSelectedCopyTrip(null);
          setSelectedCopyItems(new Set());
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowCopyItemsModal(false);
            setSelectedCopyTrip(null);
            setSelectedCopyItems(new Set());
          }}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {Platform.OS === "ios" && <View style={styles.modalHandle} />}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowCopyItemsModal(false);
                  setSelectedCopyTrip(null);
                  setSelectedCopyItems(new Set());
                  setShowCopyModal(true);
                }}
                style={styles.modalBackButton}
              >
                <Ionicons name="arrow-back" size={24} color={safeTheme.colors.onSurfaceVariant} />
          </TouchableOpacity>
              <Text style={styles.modalTitle}>
                Select Items from {selectedCopyTrip?.name || 'Trip'}
              </Text>
          <TouchableOpacity
                onPress={() => {
                  setShowCopyItemsModal(false);
                  setSelectedCopyTrip(null);
                  setSelectedCopyItems(new Set());
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={safeTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.selectAllContainer}>
              <TouchableOpacity
                onPress={() => {
                  if (!selectedCopyTrip) return;
                  const sourceItems = getTripPackingItems(selectedCopyTrip.id);
                  const allSelected = sourceItems.every((item, index) => {
                    const itemKey = `copy_item_${index}`;
                    return selectedCopyItems.has(itemKey);
                  });
                  
                  if (allSelected) {
                    setSelectedCopyItems(new Set());
                  } else {
                    const newSelected = new Set<string>();
                    sourceItems.forEach((item, index) => {
                      const itemKey = `copy_item_${index}`;
                      newSelected.add(itemKey);
                    });
                    setSelectedCopyItems(newSelected);
                  }
                }}
                style={styles.selectAllButton}
                activeOpacity={0.7}
          >
            <Ionicons
              name={
                    selectedCopyTrip && getTripPackingItems(selectedCopyTrip.id).every((item, index) => {
                      const itemKey = `copy_item_${index}`;
                      return selectedCopyItems.has(itemKey);
                    }) ? "checkbox" : "square-outline"
              }
              size={20}
                  color={safeTheme.colors.primary} 
                />
                <Text style={styles.selectAllText}>
                  {selectedCopyTrip && getTripPackingItems(selectedCopyTrip.id).every((item, index) => {
                    const itemKey = `copy_item_${index}`;
                    return selectedCopyItems.has(itemKey);
                  }) ? "Deselect All" : "Select All"}
            </Text>
          </TouchableOpacity>
        </View>

            <ScrollView 
              style={styles.modalList}
              contentContainerStyle={styles.modalListContent}
              showsVerticalScrollIndicator={true}
            >
              {selectedCopyTrip && getTripPackingItems(selectedCopyTrip.id).map((item, index) => {
                const itemKey = `copy_item_${index}`;
                const isSelected = selectedCopyItems.has(itemKey);
                return (
                  <NativeButton
                    key={item.id}
                    onPress={() => {
                      const newSelected = new Set(selectedCopyItems);
                      if (isSelected) {
                        newSelected.delete(itemKey);
                      } else {
                        newSelected.add(itemKey);
                      }
                      setSelectedCopyItems(newSelected);
                    }}
                    variant="ghost"
                    style={[styles.templateItemRow, isSelected && styles.templateItemRowSelected]}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                      {isSelected && <Ionicons name="checkmark" size={16} color={safeTheme.colors.onPrimary} />}
                    </View>
                    <View style={styles.modalListItemContent}>
                      <Text style={styles.modalListItemTitle}>{item.name}</Text>
                      {item.category && (
                        <Text style={styles.modalListItemSubtitle}>{item.category}</Text>
                      )}
                    </View>
                  </NativeButton>
                );
              })}
            </ScrollView>
            <View style={styles.templateItemsFooter}>
              <NativeButton
                onPress={handleConfirmCopyItems}
                variant="primary"
                style={[styles.templateItemsAddButton, selectedCopyItems.size === 0 && styles.templateItemsAddButtonDisabled]}
              >
                <Text style={[styles.templateItemsAddButtonText, selectedCopyItems.size === 0 && styles.templateItemsAddButtonTextDisabled]}>
                  Copy Selected ({selectedCopyItems.size})
                </Text>
              </NativeButton>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Packing Templates Modal */}
      <Modal
        visible={showPackingTemplatesModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPackingTemplatesModal(false);
          setTemplateCategory("location");
        }}
      >
        <Pressable style={styles.modalOverlay} onPress={() => {
          setShowPackingTemplatesModal(false);
          setTemplateCategory("location");
        }}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {Platform.OS === "ios" && <View style={styles.modalHandle} />}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Packing Templates</Text>
              <TouchableOpacity onPress={() => {
                setShowPackingTemplatesModal(false);
                setTemplateCategory("location");
              }} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={safeTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Template Category Tabs */}
            <View style={styles.templateTabsContainer}>
              {locationBasedTemplates.length > 0 && (
                <NativeButton
                  onPress={() => setTemplateCategory("location")}
                  variant={templateCategory === "location" ? "primary" : "secondary"}
                  style={styles.templateTab}
                >
                  <Ionicons name="location-outline" size={18} color={templateCategory === "location" ? safeTheme.colors.onPrimary : safeTheme.colors.primary} />
                  <Text style={[styles.templateTabText, templateCategory === "location" && styles.templateTabTextActive]}>
                    Location
                  </Text>
                </NativeButton>
              )}
              {categoryBasedTemplates.length > 0 && (
                <NativeButton
                  onPress={() => setTemplateCategory("category")}
                  variant={templateCategory === "category" ? "primary" : "secondary"}
                  style={styles.templateTab}
                >
                  <Ionicons name="pricetag-outline" size={18} color={templateCategory === "category" ? safeTheme.colors.onPrimary : safeTheme.colors.primary} />
                  <Text style={[styles.templateTabText, templateCategory === "category" && styles.templateTabTextActive]}>
                    Category
                  </Text>
                </NativeButton>
              )}
              {(locationBasedTemplates.length === 0 && categoryBasedTemplates.length === 0) && (
                <NativeButton
                  onPress={() => setTemplateCategory("general")}
                  variant={templateCategory === "general" ? "primary" : "secondary"}
                  style={styles.templateTab}
                >
                  <Ionicons name="grid-outline" size={18} color={templateCategory === "general" ? safeTheme.colors.onPrimary : safeTheme.colors.primary} />
                  <Text style={[styles.templateTabText, templateCategory === "general" && styles.templateTabTextActive]}>
                    General
                  </Text>
                </NativeButton>
            )}
          </View>

            <ScrollView 
              style={styles.modalList}
              contentContainerStyle={styles.modalListContent}
              showsVerticalScrollIndicator={true}
            >
              {templateCategory === "location" && locationBasedTemplates.length > 0 && (
                <>
                  {locationBasedTemplates.map((template, index) => (
                    <NativeButton
                      key={`location-${template.destination || index}`}
                      onPress={() => {
                        if (template.items && template.items.length > 1) {
                          // Ensure we have a clean state
                          setSelectedTemplateItems(new Set());
                          setSelectedTemplate(template);
                          // Add to modal history before closing current modal
                          setModalHistory(prev => {
                            const newHistory = [...prev];
                            if (!newHistory.includes('packing')) {
                              newHistory.push('packing');
                            }
                            return newHistory;
                          });
                          // Close current modal and open items modal
                          setShowPackingTemplatesModal(false);
                          setTimeout(() => {
                            setShowTemplateItemsModal(true);
                          }, 150);
                        } else if (template.items) {
                          handleAddTemplate(template);
                          setShowPackingTemplatesModal(false);
                        }
                      }}
                      variant="ghost"
                      style={styles.modalListItem}
                    >
                      <View style={styles.templateItemIcon}>
                        <Ionicons name={template.icon as any} size={24} color={safeTheme.colors.primary} />
                      </View>
                      <View style={styles.modalListItemContent}>
                        <Text style={styles.modalListItemTitle}>{template.destination}</Text>
                        <Text style={styles.modalListItemSubtitle}>{template.items?.length || 0} items</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={safeTheme.colors.onSurfaceVariant} />
                    </NativeButton>
                  ))}
                </>
              )}

              {templateCategory === "category" && categoryBasedTemplates.length > 0 && (
                <>
                  {categoryBasedTemplates.map((template, index) => (
                    <NativeButton
                      key={`category-${template.destination || index}`}
                      onPress={() => {
                        if (template.items && template.items.length > 1) {
                          // Ensure we have a clean state
                          setSelectedTemplateItems(new Set());
                          setSelectedTemplate(template);
                          // Add to modal history before closing current modal
                          setModalHistory(prev => {
                            const newHistory = [...prev];
                            if (!newHistory.includes('packing')) {
                              newHistory.push('packing');
                            }
                            return newHistory;
                          });
                          // Close current modal and open items modal
                          setShowPackingTemplatesModal(false);
                          setTimeout(() => {
                            setShowTemplateItemsModal(true);
                          }, 150);
                        } else if (template.items) {
                          handleAddTemplate(template);
                          setShowPackingTemplatesModal(false);
                        }
                      }}
                      variant="ghost"
                      style={styles.modalListItem}
                    >
                      <View style={styles.templateItemIcon}>
                        <Ionicons name={template.icon as any} size={24} color={safeTheme.colors.primary} />
                      </View>
                      <View style={styles.modalListItemContent}>
                        <Text style={styles.modalListItemTitle}>{template.destination}</Text>
                        <Text style={styles.modalListItemSubtitle}>{template.items?.length || 0} items</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={safeTheme.colors.onSurfaceVariant} />
                    </NativeButton>
                  ))}
                </>
              )}

              {templateCategory === "general" && (
                <>
                  {PACKING_TEMPLATES.map((template, index) => (
                    <NativeButton
                      key={`general-${template.name || index}`}
                      onPress={() => {
                        const templateData = {
                          destination: template.name,
                          icon: template.icon,
                          items: template.items,
                        };
                        if (template.items.length > 1) {
                          // Ensure we have a clean state
                          setSelectedTemplateItems(new Set());
                          setSelectedTemplate(templateData);
                          // Add to modal history before closing current modal
                          setModalHistory(prev => {
                            const newHistory = [...prev];
                            if (!newHistory.includes('packing')) {
                              newHistory.push('packing');
                            }
                            return newHistory;
                          });
                          // Close current modal and open items modal
                          setShowPackingTemplatesModal(false);
                          setTimeout(() => {
                            setShowTemplateItemsModal(true);
                          }, 150);
                        } else {
                          handleAddTemplate(templateData);
                          setShowPackingTemplatesModal(false);
                        }
                      }}
                      variant="ghost"
                      style={styles.modalListItem}
                    >
                      <View style={styles.templateItemIcon}>
                        <Ionicons name={template.icon as any} size={24} color={safeTheme.colors.primary} />
                      </View>
                      <View style={styles.modalListItemContent}>
                        <Text style={styles.modalListItemTitle}>{template.name}</Text>
                        <Text style={styles.modalListItemSubtitle}>{template.items.length} items</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={safeTheme.colors.onSurfaceVariant} />
                    </NativeButton>
                  ))}
                </>
              )}

              {templateCategory === "location" && locationBasedTemplates.length === 0 && 
               templateCategory === "category" && categoryBasedTemplates.length === 0 &&
               templateCategory !== "general" && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="layers-outline" size={48} color={safeTheme.colors.onSurfaceVariant} />
                  <Text style={styles.emptyTitle}>No templates available</Text>
                  <Text style={styles.emptySubtitle}>Try selecting a different category</Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Activity Templates Modal */}
      <Modal
        visible={showActivityTemplatesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActivityTemplatesModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowActivityTemplatesModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {Platform.OS === "ios" && <View style={styles.modalHandle} />}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Activity Templates</Text>
              <TouchableOpacity onPress={() => setShowActivityTemplatesModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={safeTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.modalList}
              contentContainerStyle={styles.modalListContent}
              showsVerticalScrollIndicator={true}
            >
              {availableActivityTemplates.length > 0 ? (
                availableActivityTemplates.map((template, index) => (
                <NativeButton
                  key={template.destination || `activity-template-${index}`}
                  onPress={() => {
                    if (template.activities.length > 1) {
                      // Ensure we have a clean state
                      setSelectedTemplateItems(new Set());
                      setSelectedTemplate(template);
                      // Add to modal history before closing current modal
                      setModalHistory(prev => {
                        const newHistory = [...prev];
                        if (!newHistory.includes('activity')) {
                          newHistory.push('activity');
                        }
                        return newHistory;
                      });
                      // Close current modal and open items modal
                      setShowActivityTemplatesModal(false);
                      setTimeout(() => {
                        setShowTemplateItemsModal(true);
                      }, 150);
                    } else {
                      handleAddActivityTemplate(template);
                      setShowActivityTemplatesModal(false);
                    }
                  }}
                  variant="ghost"
                  style={styles.modalListItem}
                >
                  <View style={styles.templateItemIcon}>
                    <Ionicons name={template.icon as any} size={24} color={safeTheme.colors.primary} />
                  </View>
                  <View style={styles.modalListItemContent}>
                    <Text style={styles.modalListItemTitle}>{template.destination}</Text>
                    <Text style={styles.modalListItemSubtitle}>{template.activities.length} activities</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={safeTheme.colors.onSurfaceVariant} />
                </NativeButton>
              ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color={safeTheme.colors.onSurfaceVariant} />
                  <Text style={styles.emptyTitle}>No templates available</Text>
                  <Text style={styles.emptySubtitle}>Activity templates will appear here</Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Template Items Selection Modal */}
      <Modal
        visible={showTemplateItemsModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          // Use same logic as hardware back button
          if (modalHistory.length > 0) {
            const previousModal = modalHistory[modalHistory.length - 1];
            setModalHistory(prev => prev.slice(0, -1));
            setShowTemplateItemsModal(false);
            setTimeout(() => {
              setSelectedTemplate(null);
              setSelectedTemplateItems(new Set());
              if (previousModal === 'packing') {
                setShowPackingTemplatesModal(true);
              } else if (previousModal === 'activity') {
                setShowActivityTemplatesModal(true);
              }
            }, 100);
          } else {
            setShowTemplateItemsModal(false);
            setSelectedTemplate(null);
            setSelectedTemplateItems(new Set());
            setModalHistory([]);
          }
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
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {Platform.OS === "ios" && <View style={styles.modalHandle} />}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  // Go back to previous modal state
                  const currentHistory = [...modalHistory];
                  if (currentHistory.length > 0) {
                    const previousModal = currentHistory[currentHistory.length - 1];
                    setModalHistory(currentHistory.slice(0, -1));
                    setShowTemplateItemsModal(false);
                    // Use setTimeout to ensure state updates happen in order
                    setTimeout(() => {
                      setSelectedTemplate(null);
                      setSelectedTemplateItems(new Set());
                      if (previousModal === 'packing') {
                        setShowPackingTemplatesModal(true);
                      } else if (previousModal === 'activity') {
                        setShowActivityTemplatesModal(true);
                      }
                    }, 100);
                  } else {
                    // Fallback: go to packing templates
                    setShowTemplateItemsModal(false);
                    setTimeout(() => {
                      setSelectedTemplate(null);
                      setSelectedTemplateItems(new Set());
                      setShowPackingTemplatesModal(true);
                    }, 100);
                  }
                }}
                style={styles.modalBackButton}
              >
                <Ionicons name="arrow-back" size={24} color={safeTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedTemplate?.destination || selectedTemplate?.name || 'Select Items'}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowTemplateItemsModal(false);
                  setSelectedTemplate(null);
                  setSelectedTemplateItems(new Set());
                  setModalHistory([]);
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={safeTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <View style={styles.selectAllContainer}>
              <TouchableOpacity
                onPress={() => {
                  if (!selectedTemplate) return;
                  const allItems = selectedTemplate.items || selectedTemplate.activities || [];
                  const allSelected = allItems.every((item: any, index: number) => {
                    const itemKey = `item_${index}`;
                    return selectedTemplateItems.has(itemKey);
                  });
                  
                  if (allSelected) {
                    setSelectedTemplateItems(new Set());
                  } else {
                    const newSelected = new Set<string>();
                    allItems.forEach((item: any, index: number) => {
                      const itemKey = `item_${index}`;
                      newSelected.add(itemKey);
                    });
                    setSelectedTemplateItems(newSelected);
                  }
                }}
                style={styles.selectAllButton}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={
                    selectedTemplate && (selectedTemplate.items || selectedTemplate.activities || []).every((item: any, index: number) => {
                      const itemKey = `item_${index}`;
                      return selectedTemplateItems.has(itemKey);
                    }) ? "checkbox" : "square-outline"
                  } 
                  size={20} 
                  color={safeTheme.colors.primary} 
                />
                <Text style={styles.selectAllText}>
                  {selectedTemplate && (selectedTemplate.items || selectedTemplate.activities || []).every((item: any, index: number) => {
                    const itemKey = `item_${index}`;
                    return selectedTemplateItems.has(itemKey);
                  }) ? "Deselect All" : "Select All"}
                </Text>
              </TouchableOpacity>
          </View>
            <ScrollView 
              style={styles.modalList}
              contentContainerStyle={styles.modalListContent}
              showsVerticalScrollIndicator={true}
            >
              {selectedTemplate?.items?.map((item: any, index: number) => {
                const itemKey = `item_${index}`;
                const isSelected = selectedTemplateItems.has(itemKey);
                return (
                  <NativeButton
                    key={itemKey}
                    onPress={() => {
                      const newSelected = new Set(selectedTemplateItems);
                      if (isSelected) {
                        newSelected.delete(itemKey);
                      } else {
                        newSelected.add(itemKey);
                      }
                      setSelectedTemplateItems(newSelected);
                    }}
                    variant="ghost"
                    style={[styles.templateItemRow, isSelected && styles.templateItemRowSelected]}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                      {isSelected && <Ionicons name="checkmark" size={16} color={safeTheme.colors.onPrimary} />}
                    </View>
                    <View style={styles.modalListItemContent}>
                      <Text style={styles.modalListItemTitle}>{item.name || item.description}</Text>
                      {item.category && (
                        <Text style={styles.modalListItemSubtitle}>{item.category}</Text>
                      )}
                    </View>
                  </NativeButton>
                );
              })}
              {selectedTemplate?.activities?.map((activity: any, index: number) => {
                const itemKey = `item_${index}`;
                const isSelected = selectedTemplateItems.has(itemKey);
                return (
                  <NativeButton
                    key={itemKey}
                    onPress={() => {
                      const newSelected = new Set(selectedTemplateItems);
                      if (isSelected) {
                        newSelected.delete(itemKey);
                      } else {
                        newSelected.add(itemKey);
                      }
                      setSelectedTemplateItems(newSelected);
                    }}
                    variant="ghost"
                    style={[styles.templateItemRow, isSelected && styles.templateItemRowSelected]}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                      {isSelected && <Ionicons name="checkmark" size={16} color={safeTheme.colors.onPrimary} />}
                    </View>
                    <View style={styles.modalListItemContent}>
                      <Text style={styles.modalListItemTitle}>{activity.description}</Text>
                    </View>
                  </NativeButton>
                );
              })}
      </ScrollView>
            <View style={styles.templateItemsFooter}>
              <NativeButton
                onPress={() => {
                  if (selectedTemplateItems.size > 0 && selectedTemplate) {
                    if (selectedTemplate.items && Array.isArray(selectedTemplate.items)) {
                      const itemsToAdd: any[] = [];
                      // Iterate through all items and check if they're selected using simple index-based key
                      selectedTemplate.items.forEach((item: any, index: number) => {
                        const itemKey = `item_${index}`;
                        // Double check: also verify the item has a name
                        if (selectedTemplateItems.has(itemKey) && item && item.name) {
                          itemsToAdd.push({ 
                            name: item.name,
                            category: item.category || "Packing List"
                          });
                        }
                      });
                      
                      // Add all selected items separately - ensure each item gets its own ID
                      if (itemsToAdd.length > 0 && selectedTripId) {
                        // Create all items first
                        const allNewItems = itemsToAdd.map((item: any) => ({
                          id: generateId(),
                          tripId: selectedTripId,
                          name: item.name,
                          category: "Packing List",
                          packed: false,
                        }));
                        
                        // Add all items sequentially with proper async handling
                        // Use a promise chain to ensure each item is added before the next
                        const addItemsSequentially = async () => {
                          for (const item of allNewItems) {
                            await addPackingItem(item);
                          }
                        };
                        
                        addItemsSequentially().then(() => {
                          Alert.alert("Success", `Added ${allNewItems.length} item${allNewItems.length > 1 ? 's' : ''} to your packing list.`);
                          setShowTemplateItemsModal(false);
                          setSelectedTemplate(null);
                          setSelectedTemplateItems(new Set());
                          // Clear modal history after successful add
                          setModalHistory([]);
                        }).catch((error) => {
                          console.error("Error adding items:", error);
                          Alert.alert("Error", "Failed to add some items. Please try again.");
                        });
                      } else if (itemsToAdd.length === 0) {
                        Alert.alert("Info", "No items selected. Please select items to add.");
                      }
                    } else if (selectedTemplate.activities && Array.isArray(selectedTemplate.activities)) {
                      const activitiesToAdd: any[] = [];
                      // Iterate through all activities and check if they're selected using simple index-based key
                      selectedTemplate.activities.forEach((activity: any, index: number) => {
                        const itemKey = `item_${index}`;
                        // Double check: also verify the activity has a description
                        if (selectedTemplateItems.has(itemKey) && activity && activity.description) {
                          activitiesToAdd.push({ 
                            description: activity.description,
                            date: activity.date
                          });
                        }
                      });
                      
                      // Add all selected activities separately - ensure each activity gets its own ID
                      if (activitiesToAdd.length > 0 && selectedTripId && selectedTrip) {
                        // Create all activities first
                        const allNewActivities = activitiesToAdd.map((activity: any) => ({
                          id: generateId(),
                          tripId: selectedTripId,
                          description: activity.description,
                          date: activity.date || selectedTrip.startDate,
                          completed: false,
                        }));
                        
                        // Add all activities sequentially with proper async handling
                        // Use a promise chain to ensure each activity is added before the next
                        const addActivitiesSequentially = async () => {
                          for (const activity of allNewActivities) {
                            await addActivityItem(activity);
                          }
                        };
                        
                        addActivitiesSequentially().then(() => {
                          Alert.alert("Success", `Added ${allNewActivities.length} activit${allNewActivities.length > 1 ? 'ies' : 'y'} to your itinerary.`);
                          setShowTemplateItemsModal(false);
                          setSelectedTemplate(null);
                          setSelectedTemplateItems(new Set());
                          // Clear modal history after successful add
                          setModalHistory([]);
                        }).catch((error) => {
                          console.error("Error adding activities:", error);
                          Alert.alert("Error", "Failed to add some activities. Please try again.");
                        });
                      } else if (activitiesToAdd.length === 0) {
                        Alert.alert("Info", "No activities selected. Please select activities to add.");
                      }
                    } else {
                      Alert.alert("Error", "Invalid template format.");
                    }
                  } else {
                    Alert.alert("Info", "Please select at least one item to add.");
                  }
                }}
                variant="primary"
                style={[styles.templateItemsAddButton, selectedTemplateItems.size === 0 && styles.templateItemsAddButtonDisabled]}
              >
                <Text style={[styles.templateItemsAddButtonText, selectedTemplateItems.size === 0 && styles.templateItemsAddButtonTextDisabled]}>
                  Add Selected ({selectedTemplateItems.size})
                </Text>
              </NativeButton>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  tripSelectorWrapper: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  tripSelectorLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tripSelectorContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tripPicker: {
    height: Platform.OS === "ios" ? 200 : 50,
    backgroundColor: "#FFFFFF",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  segmentedButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  segmentedButtonActive: {
    backgroundColor: "#8b5cf6",
  },
  segmentedIcon: {
    marginRight: 6,
  },
  segmentedText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  segmentedTextActive: {
    color: "#FFFFFF",
  },
  contentSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  listContainer: {
    gap: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#9CA3AF",
    marginTop: 8,
  },
  packingItemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  packingItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  packingItemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    flex: 1,
  },
  packingItemNameChecked: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
    opacity: 0.6,
  },
  deleteIconButton: {
    padding: 8,
    marginLeft: 8,
  },
  activitySection: {
    marginBottom: 24,
  },
  activitySectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  activityItemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  activityItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  activityItemText: {
    flex: 1,
  },
  activityItemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  activityItemNameChecked: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
    opacity: 0.6,
  },
  quickActionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  addInputModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "60%",
  },
  addInputHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  addInputTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  addInputContent: {
    padding: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inputIcon: {
    marginRight: 12,
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 14,
  },
  addButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "90%",
    minHeight: "50%",
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: "#D1D5DB",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBackButton: {
    padding: 4,
    marginRight: 12,
  },
  selectAllContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  selectAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    gap: 12,
  },
  selectAllText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  modalList: {
    flex: 1,
    maxHeight: Dimensions.get('window').height * 0.7,
  },
  modalListContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalListItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  modalListItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  modalListItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  modalListItemSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  templateItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  templateSectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8b5cf6",
    marginTop: 20,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  templateItemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  templateItemRowSelected: {
    backgroundColor: "#EDE9FE",
  },
  templateItemsFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  templateItemsAddButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  templateItemsAddButtonDisabled: {
    opacity: 0.5,
  },
  templateItemsAddButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  templateItemsAddButtonTextDisabled: {
    color: "#9CA3AF",
  },
  templateTabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  templateTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  templateTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  templateTabTextActive: {
    color: "#FFFFFF",
  },
  itineraryContainer: {
    gap: 16,
  },
  itineraryDayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  itineraryDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itineraryDayInfo: {
    flex: 1,
  },
  itineraryDayNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  itineraryDayDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  todayBadge: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyDayActivities: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyDayActivitiesText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  dayActivitiesList: {
    gap: 8,
    marginBottom: 12,
  },
  itineraryActivityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  itineraryActivityButton: {
    flex: 1,
  },
  itineraryDeleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  itineraryActivityContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itineraryActivityLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itineraryActivityTime: {
    flexDirection: "row",
    alignItems: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    marginRight: 12,
    gap: 4,
  },
  itineraryActivityTimeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  itineraryActivityInfo: {
    flex: 1,
  },
  itineraryActivityDescription: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 4,
  },
  itineraryActivityCompleted: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
    opacity: 0.6,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
  },
  addDayActivityButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addDayActivityButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  // Native Button Styles
  nativeButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  nativeButton_primary: {
    backgroundColor: "#8b5cf6",
  },
  nativeButton_secondary: {
    backgroundColor: "#EDE9FE",
  },
  nativeButton_ghost: {
    backgroundColor: "transparent",
  },
});
