import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Surface } from "react-native-paper";
import { useApp } from "@/contexts/AppContext";
import { pickImage, takePhoto, saveImage } from "@/utils/imageStorage";
import { COMMON_CURRENCIES, getCurrencySymbol } from "@/constants/currencies";
import DatePickerInput from "@/components/DatePickerInput";

// Categories are now loaded from context

interface AddExpenseScreenProps {
  navigation: any;
  route: any;
}

export default function AddExpenseScreen({ navigation, route }: AddExpenseScreenProps) {
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
      error: theme?.colors?.error || '#EF4444',
      outline: theme?.colors?.outline || '#E5E5E5',
      outlineVariant: theme?.colors?.outlineVariant || '#E5E5E5',
    },
  };
  const { trips, expenses, addExpense, getTrip, categories, user } = useApp();
  const tripId =
    route?.params?.tripId || (trips && trips.length > 0 ? trips[0].id : "");
  const trip = getTrip(tripId);

  const [formData, setFormData] = useState({
    tripId: tripId,
    amount: "",
    description: "",
    notes: "",
    category: categories.length > 0 ? categories[0].id : "food",
    date: new Date().toISOString(),
    currency: "INR",
    isSplitExpense: false,
    paidBy: "",
    splitBetween: [] as string[],
    splitType: "equal" as "equal" | "percentage" | "custom",
    customAmounts: {} as Record<string, string>,
    percentages: {} as Record<string, string>,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptImages, setReceiptImages] = useState<string[]>([]);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showTripSelector, setShowTripSelector] = useState(false);

  useEffect(() => {
    if (trip && trip.participants && trip.participants.length > 0) {
      // Find current user first, fallback to first participant
      const currentUser =
        trip.participants.find((p) => p.isCurrentUser) || trip.participants[0];
      setFormData((prev) => ({
        ...prev,
        paidBy: currentUser.id,
        splitBetween: trip.participants.map((p) => p.id),
      }));
    }
  }, [trip]);

  useEffect(() => {
    if (categories.length > 0 && !formData.category) {
      setFormData((prev) => ({
        ...prev,
        category: categories[0].id,
      }));
    }
  }, [categories]);

  const handleInputChange = (
    field: string,
    value: string | boolean | string[],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSplitTypeChange = (
    splitType: "equal" | "percentage" | "custom",
  ) => {
    setFormData((prev) => ({
      ...prev,
      splitType,
      customAmounts: {},
      percentages: {},
    }));
  };

  const handleParticipantToggle = (participantId: string) => {
    setFormData((prev) => ({
      ...prev,
      splitBetween: prev.splitBetween.includes(participantId)
        ? prev.splitBetween.filter((id) => id !== participantId)
        : [...prev.splitBetween, participantId],
    }));
  };

  const handleCustomAmountChange = (participantId: string, amount: string) => {
    setFormData((prev) => ({
      ...prev,
      customAmounts: {
        ...prev.customAmounts,
        [participantId]: amount,
      },
    }));
  };

  const handlePercentageChange = (
    participantId: string,
    percentage: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      percentages: {
        ...prev.percentages,
        [participantId]: percentage,
      },
    }));
  };

  const calculateSplitAmounts = () => {
    if (!formData.amount || formData.splitBetween.length === 0) return [];

    const amount = parseFloat(formData.amount);
    const participants = formData.splitBetween.map((participantId) => {
      const participant = trip?.participants.find(
        (p) => p.id === participantId,
      );
      return {
        userId: participantId,
        userName: participant?.name || "Unknown",
        amount: 0,
        percentage: formData.percentages[participantId]
          ? parseFloat(formData.percentages[participantId])
          : undefined,
        isPaid: false,
        settlementStatus: "pending" as const,
      };
    });

    switch (formData.splitType) {
      case "equal":
        // Round to 2 decimals and distribute remainder to ensure exact total
        const n = participants.length;
        const base = Math.round((amount / n) * 100) / 100;
        const amounts = new Array(n).fill(base);
        let diffCents = Math.round(amount * 100) - Math.round(base * 100) * n;
        for (let i = 0; i < n && diffCents > 0; i++) {
          amounts[i] = Math.round((amounts[i] + 0.01) * 100) / 100;
          diffCents--;
        }
        return participants.map((p, idx) => ({ ...p, amount: amounts[idx] }));

      case "percentage": {
        const raw = participants.map(
          (p) => Math.round(((amount * (p.percentage || 0)) / 100) * 100) / 100,
        );
        let sum = raw.reduce((a, b) => a + b, 0);
        let diff = Math.round((amount - sum) * 100);
        for (let i = 0; i < raw.length && diff !== 0; i++) {
          const delta = diff > 0 ? 0.01 : -0.01;
          raw[i] = Math.round((raw[i] + delta) * 100) / 100;
          diff += diff > 0 ? -1 : 1;
        }
        return participants.map((p, idx) => ({ ...p, amount: raw[idx] }));
      }

      case "custom":
        return participants.map((p) => ({
          ...p,
          amount: parseFloat(formData.customAmounts[p.userId]) || 0,
        }));

      default:
        return participants;
    }
  };

  const handleTakePhoto = async () => {
    try {
      const imageUri = await takePhoto();
      if (imageUri) {
        const savedPath = await saveImage(imageUri, "receipt");
        setReceiptImages((prev) => [...prev, savedPath]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const handlePickPhoto = async () => {
    try {
      const imageUri = await pickImage("receipt");
      if (imageUri) {
        const savedPath = await saveImage(imageUri, "receipt");
        setReceiptImages((prev) => [...prev, savedPath]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick photo. Please try again.");
    }
  };

  const handleRemoveImage = (index: number) => {
    setReceiptImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddExpense = async () => {
    if (isSubmitting) return;

    if (!formData.amount.trim() || !formData.tripId) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (
      formData.isSplitExpense &&
      (!formData.paidBy || formData.splitBetween.length === 0)
    ) {
      Alert.alert("Error", "Please select who paid and who to split between.");
      return;
    }

    // Check if current user is identified for group trips
    if (formData.isSplitExpense && trip?.isGroup) {
      const hasCurrentUser = trip.participants?.some((p) => p.isCurrentUser);
      if (!hasCurrentUser) {
        Alert.alert(
          "Identify Yourself",
          "Please identify yourself as one of the trip members to track expenses properly. Go to Manage Members to mark yourself.",
          [
            { text: "OK", style: "default" },
            {
              text: "Go to Members",
              onPress: () =>
                navigation.navigate("ManageMembers", {
                  tripId: formData.tripId,
                }),
            },
          ],
        );
        return;
      }
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const splitParticipants = formData.isSplitExpense
        ? calculateSplitAmounts()
        : [];

      await addExpense({
        tripId: formData.tripId,
        amount: amount,
        currency: formData.currency,
        description: formData.description.trim(),
        notes: formData.notes?.trim(),
        category: formData.category as any,
        date: formData.date,
        receiptImages: receiptImages,
        paidBy: formData.isSplitExpense ? formData.paidBy : (user?.id || "current_user"),
        splitBetween: splitParticipants,
        splitType: formData.isSplitExpense ? formData.splitType : "equal",
      });

      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to add expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTrip = trips.find((trip) => trip.id === formData.tripId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Expense</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <View style={[styles.inputGroup, { zIndex: 10 }]}>
              <Text style={styles.label}>Trip</Text>
              <TouchableOpacity
                style={styles.tripSelector}
                onPress={() => setShowTripSelector(!showTripSelector)}
              >
                <Text style={styles.tripText}>
                  {selectedTrip ? selectedTrip.name : "Select a trip"}
                </Text>
                <Ionicons name={showTripSelector ? "chevron-up" : "chevron-down"} size={20} color="#666" />
              </TouchableOpacity>
              {showTripSelector && (
                <View style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  marginTop: 4,
                  maxHeight: 200,
                  elevation: 5,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                }}>
                  <ScrollView nestedScrollEnabled>
                    {trips.map(trip => (
                      <TouchableOpacity
                        key={trip.id}
                        style={{
                          padding: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: '#f3f4f6',
                          backgroundColor: trip.id === formData.tripId ? '#f3f4f6' : '#fff'
                        }}
                        onPress={() => {
                          handleInputChange("tripId", trip.id);
                          setShowTripSelector(false);
                        }}
                      >
                        <Text style={{ color: '#333', fontWeight: trip.id === formData.tripId ? '600' : '400' }}>
                          {trip.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount</Text>
              <View style={styles.amountContainer}>
                <TouchableOpacity
                  style={styles.currencyButton}
                  onPress={() => setShowCurrencyPicker(true)}
                >
                  <Text style={styles.currencyText}>
                    {getCurrencySymbol(formData.currency)}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  placeholder="0.00"
                  value={formData.amount}
                  onChangeText={(value) => handleInputChange("amount", value)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What did you pay for?"
                value={formData.description}
                onChangeText={(value) => handleInputChange("description", value)}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional details..."
                value={formData.notes}
                onChangeText={(value) => handleInputChange("notes", value)}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryGrid}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor:
                          formData.category === category.id
                            ? category.color
                            : "#f3f4f6",
                      },
                    ]}
                    onPress={() => handleInputChange("category", category.id)}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={20}
                      color={formData.category === category.id ? "white" : "#666"}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          color:
                            formData.category === category.id ? "white" : "#666",
                        },
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.splitToggleContainer}>
                <Text style={styles.label}>Split expense</Text>
                <Switch
                  value={formData.isSplitExpense}
                  onValueChange={(value) =>
                    handleInputChange("isSplitExpense", value)
                  }
                  trackColor={{ false: "#e5e7eb", true: "#8b5cf6" }}
                  thumbColor={formData.isSplitExpense ? "#fff" : "#f4f3f4"}
                />
              </View>
              <Text style={styles.splitToggleDescription}>
                Enable to split this expense between multiple people
              </Text>
            </View>

            {formData.isSplitExpense && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Who Paid</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.participantSelector}
                  >
                    {trip?.participants?.map((participant) => (
                      <TouchableOpacity
                        key={participant.id}
                        style={[
                          styles.participantChip,
                          formData.paidBy === participant.id &&
                          styles.selectedChip,
                        ]}
                        onPress={() =>
                          handleInputChange("paidBy", participant.id)
                        }
                      >
                        <View style={styles.chipContent}>
                          <Text
                            style={[
                              styles.chipText,
                              formData.paidBy === participant.id &&
                              styles.selectedChipText,
                            ]}
                          >
                            {participant.name}
                          </Text>
                          {participant.isCurrentUser && (
                            <View style={styles.currentUserChipBadge}>
                              <Text style={styles.currentUserChipText}>You</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    )) || []}
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Split Type</Text>
                  <View style={styles.splitTypeSelector}>
                    {(["equal", "percentage", "custom"] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.splitTypeButton,
                          formData.splitType === type && styles.selectedSplitType,
                        ]}
                        onPress={() => handleSplitTypeChange(type)}
                      >
                        <Text
                          style={[
                            styles.splitTypeText,
                            formData.splitType === type &&
                            styles.selectedSplitTypeText,
                          ]}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Split Between</Text>
                  <View style={styles.participantList}>
                    {(trip?.participants || []).map((participant) => (
                      <TouchableOpacity
                        key={participant.id}
                        style={styles.participantItem}
                        onPress={() => handleParticipantToggle(participant.id)}
                      >
                        <View style={styles.participantInfo}>
                          <View
                            style={[
                              styles.checkbox,
                              formData.splitBetween.includes(participant.id) &&
                              styles.checkedBox,
                            ]}
                          >
                            {formData.splitBetween.includes(participant.id) && (
                              <Ionicons
                                name="checkmark"
                                size={16}
                                color="white"
                              />
                            )}
                          </View>
                          <View style={styles.participantNameRow}>
                            <Text style={styles.participantName}>
                              {participant.name}
                            </Text>
                            {participant.isCurrentUser && (
                              <View style={styles.currentUserBadge}>
                                <Text style={styles.currentUserText}>You</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {formData.splitBetween.includes(participant.id) && (
                          <View style={styles.amountInput}>
                            {formData.splitType === "custom" && (
                              <TextInput
                                style={styles.customAmountInput}
                                placeholder="$0.00"
                                value={
                                  formData.customAmounts[participant.id] || ""
                                }
                                onChangeText={(value) =>
                                  handleCustomAmountChange(participant.id, value)
                                }
                                keyboardType="numeric"
                              />
                            )}
                            {formData.splitType === "percentage" && (
                              <TextInput
                                style={styles.percentageInput}
                                placeholder="0%"
                                value={formData.percentages[participant.id] || ""}
                                onChangeText={(value) =>
                                  handlePercentageChange(participant.id, value)
                                }
                                keyboardType="numeric"
                              />
                            )}
                            {formData.splitType === "equal" && (
                              <Text style={styles.equalAmount}>
                                $
                                {(
                                  parseFloat(formData.amount) /
                                  formData.splitBetween.length
                                ).toFixed(2)}
                              </Text>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date</Text>
              <DatePickerInput
                value={formData.date}
                onChange={(value) => handleInputChange("date", value)}
                mode="datetime"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Photos</Text>
              <View style={styles.photoButtons}>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera" size={20} color="#8b5cf6" />
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={handlePickPhoto}
                >
                  <Ionicons name="cloud-upload" size={20} color="#8b5cf6" />
                  <Text style={styles.photoButtonText}>Upload</Text>
                </TouchableOpacity>
              </View>

              {receiptImages.length > 0 && (
                <View style={styles.imagePreviewContainer}>
                  <Text style={styles.imagePreviewLabel}>Receipt Images:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.imagePreviewScroll}
                  >
                    {receiptImages.map((imageUri, index) => (
                      <View key={index} style={styles.imagePreviewItem}>
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.imagePreview}
                        />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => handleRemoveImage(index)}
                        >
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color="#ef4444"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.actions, { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingHorizontal: 16 }]}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addButton, isSubmitting && styles.disabledButton]}
            onPress={handleAddExpense}
            disabled={isSubmitting}
          >
            <Text style={styles.addText}>
              {isSubmitting ? "Adding..." : "Add Expense"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Currency Picker Modal */}
        {showCurrencyPicker && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Currency</Text>
                <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.currencyList}>
                {COMMON_CURRENCIES.slice(0, 20).map((currency: any) => (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.currencyItem,
                      formData.currency === currency.code &&
                      styles.selectedCurrencyItem,
                    ]}
                    onPress={() => {
                      setFormData((prev) => ({
                        ...prev,
                        currency: currency.code,
                      }));
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                    <View style={styles.currencyInfo}>
                      <Text style={styles.currencyCode}>{currency.code}</Text>
                      <Text style={styles.currencyName}>{currency.name}</Text>
                    </View>
                    {formData.currency === currency.code && (
                      <Ionicons name="checkmark" size={20} color="#8b5cf6" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
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
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  tripSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9fafb",
  },
  tripText: {
    fontSize: 16,
    color: "#333",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
  },
  photoButtons: {
    flexDirection: "row",
    gap: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    gap: 8,
  },
  photoButtonText: {
    fontSize: 14,
    color: "#8b5cf6",
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 20,
    paddingBottom: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  addButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
  },
  addText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  splitToggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  splitToggleDescription: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  participantSelector: {
    marginBottom: 8,
  },
  participantChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginRight: 8,
  },
  selectedChip: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  chipText: {
    fontSize: 14,
    color: "#333",
  },
  selectedChipText: {
    color: "white",
  },
  splitTypeSelector: {
    flexDirection: "row",
    gap: 8,
  },
  splitTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  selectedSplitType: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  splitTypeText: {
    fontSize: 14,
    color: "#333",
  },
  selectedSplitTypeText: {
    color: "white",
  },
  participantList: {
    gap: 8,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  participantInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#d1d5db",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkedBox: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  participantName: {
    fontSize: 16,
    color: "#333",
  },
  amountInput: {
    minWidth: 80,
    alignItems: "flex-end",
  },
  customAmountInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    textAlign: "right",
    width: 80,
  },
  percentageInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    textAlign: "right",
    width: 60,
  },
  equalAmount: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  disabledButton: {
    backgroundColor: "#d1d5db",
  },
  imagePreviewContainer: {
    marginTop: 12,
  },
  imagePreviewLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  imagePreviewScroll: {
    flexDirection: "row",
  },
  imagePreviewItem: {
    position: "relative",
    marginRight: 12,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "white",
    borderRadius: 10,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currencyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    gap: 4,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  participantAmountInput: {
    flex: 1,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    width: "90%",
    maxHeight: "70%",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  currencyList: {
    maxHeight: 400,
  },
  currencyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedCurrencyItem: {
    backgroundColor: "#f3f4f6",
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    width: 40,
    textAlign: "center",
  },
  currencyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  currencyName: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  currentUserChipBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  currentUserChipText: {
    fontSize: 10,
    color: "white",
    fontWeight: "600",
  },
  participantNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  currentUserBadge: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  currentUserText: {
    fontSize: 10,
    color: "white",
    fontWeight: "600",
  },
  keyboardView: {
    flex: 1,
  },
});
