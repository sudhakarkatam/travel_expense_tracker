import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/contexts/AppContext";
import DatePickerInput from "@/components/DatePickerInput";
import {
  saveImage,
  deleteImage,
  pickMultipleImages,
} from "@/utils/imageStorage";
import type { ExpenseCategory } from "@/types";

const CATEGORIES = [
  { id: "food", name: "Food & Drinks", color: "#ef4444", icon: "restaurant" },
  { id: "transport", name: "Transport", color: "#22c55e", icon: "car" },
  { id: "accommodation", name: "Accommodation", color: "#6366f1", icon: "bed" },
  {
    id: "entertainment",
    name: "Entertainment",
    color: "#f59e0b",
    icon: "game-controller",
  },
  { id: "shopping", name: "Shopping", color: "#ec4899", icon: "bag" },
  { id: "other", name: "Other", color: "#6b7280", icon: "ellipsis-horizontal" },
];

interface EditExpenseScreenProps {
  navigation: any;
  route: any;
}

export default function EditExpenseScreen({
  navigation,
  route,
}: EditExpenseScreenProps) {
  const { updateExpense, deleteExpense, getTrip, getTripExpenses } = useApp();
  const { expenseId, tripId } = route.params;
  const expense = getTripExpenses(tripId).find((e) => e.id === expenseId);
  const trip = getTrip(tripId);

  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    notes: "",
    category: "food",
    date: "",
    receiptImages: [] as string[],
    splitType: "equal" as "equal" | "percentage" | "custom",
    isSplitExpense: false,
    paidBy: "",
    splitBetween: [] as string[],
    customAmounts: {} as Record<string, string>,
    percentages: {} as Record<string, string>,
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (expense) {
      const hasSplitData =
        expense.splitBetween && expense.splitBetween.length > 0;
      const customAmounts: Record<string, string> = {};
      const percentages: Record<string, string> = {};

      if (hasSplitData) {
        expense.splitBetween.forEach((split) => {
          customAmounts[split.userId] = split.amount.toString();
          if (split.percentage) {
            percentages[split.userId] = split.percentage.toString();
          }
        });
      }

      // Find current user first, fallback to existing paidBy
      const currentUser = trip?.participants?.find((p) => p.isCurrentUser);
      const defaultPaidBy = currentUser?.id || expense.paidBy || "";

      setFormData({
        amount: expense.amount.toString(),
        description: expense.description,
        notes: expense.notes || "",
        category: expense.category,
        date: expense.date,
        receiptImages: expense.receiptImages || [],
        splitType: expense.splitType || "equal",
        isSplitExpense: hasSplitData,
        paidBy: defaultPaidBy,
        splitBetween: hasSplitData
          ? expense.splitBetween.map((s) => s.userId)
          : [],
        customAmounts,
        percentages,
      });
    }
  }, [expense, trip]);

  const handleInputChange = (
    field: string,
    value: string | string[] | boolean,
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

  const handleSaveExpense = async () => {
    if (!formData.amount.trim()) {
      Alert.alert("Error", "Please enter an amount.");
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
                navigation.navigate("ManageMembers", { tripId: tripId }),
            },
          ],
        );
        return;
      }
    }

    setIsLoading(true);
    try {
      // Handle receipt images
      const savedImages: string[] = [];
      for (const imageUri of formData.receiptImages) {
        // Check if image is already saved (local path, data URI, or cloud URL)
        const isAlreadySaved =
          imageUri.includes("images/") ||
          imageUri.startsWith("data:") ||
          imageUri.startsWith("http://") ||
          imageUri.startsWith("https://");

        if (isAlreadySaved) {
          // Already saved, keep as is
          savedImages.push(imageUri);
        } else {
          // New image, save it
          const savedPath = await saveImage(imageUri, "receipt");
          savedImages.push(savedPath);
        }
      }

      // Delete removed images (only local files, not data URIs or cloud URLs)
      if (expense?.receiptImages) {
        for (const oldImage of expense.receiptImages) {
          if (!formData.receiptImages.includes(oldImage)) {
            // Only delete if it's a local file (not data URI or cloud URL)
            if (
              !oldImage.startsWith("data:") &&
              !oldImage.startsWith("http://") &&
              !oldImage.startsWith("https://")
            ) {
              await deleteImage(oldImage);
            }
          }
        }
      }

      const splitParticipants = formData.isSplitExpense
        ? calculateSplitAmounts()
        : [];

      await updateExpense(expenseId, {
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        notes: formData.notes.trim(),
        category: formData.category as ExpenseCategory,
        date: formData.date,
        receiptImages: savedImages,
        paidBy: formData.isSplitExpense ? formData.paidBy : "current_user",
        splitBetween: splitParticipants,
        splitType: formData.isSplitExpense ? formData.splitType : "equal",
      });

      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Failed to update expense. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExpense = () => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete receipt images (only local files, not data URIs or cloud URLs)
              for (const imageUri of formData.receiptImages) {
                if (
                  imageUri.includes("images/") &&
                  !imageUri.startsWith("data:") &&
                  !imageUri.startsWith("http://") &&
                  !imageUri.startsWith("https://")
                ) {
                  await deleteImage(imageUri);
                }
              }
              await deleteExpense(expenseId);
              navigation.goBack();
            } catch (err) {
              Alert.alert(
                "Error",
                "Failed to delete expense. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleAddReceiptImages = async () => {
    const images = await pickMultipleImages();
    if (images.length > 0) {
      setFormData((prev) => ({
        ...prev,
        receiptImages: [...prev.receiptImages, ...images],
      }));
    }
  };

  const handleRemoveReceiptImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      receiptImages: prev.receiptImages.filter((_, i) => i !== index),
    }));
  };

  const handleTakePhoto = async () => {
    const { takePhoto } = await import("@/utils/imageStorage");
    const imageUri = await takePhoto();
    if (imageUri) {
      setFormData((prev) => ({
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
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
                onChangeText={(value) => handleInputChange("amount", value)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What did you pay for? (optional)"
                value={formData.description}
                onChangeText={(value) =>
                  handleInputChange("description", value)
                }
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
                onChangeText={(value) => handleInputChange("notes", value)}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((category) => (
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
                      color={
                        formData.category === category.id ? "white" : "#666"
                      }
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          color:
                            formData.category === category.id
                              ? "white"
                              : "#666",
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
              <Text style={styles.label}>Date</Text>
              <DatePickerInput
                value={formData.date}
                onChange={(value) => handleInputChange("date", value)}
              />
            </View>

            {/* Split Expense Toggle */}
            <View style={styles.inputGroup}>
              <View style={styles.splitToggleContainer}>
                <View style={styles.splitToggleLabel}>
                  <Ionicons name="people" size={20} color="#8b5cf6" />
                  <Text style={styles.splitToggleText}>Split Expense</Text>
                </View>
                <Switch
                  value={formData.isSplitExpense}
                  onValueChange={(value) =>
                    handleInputChange("isSplitExpense", value)
                  }
                  trackColor={{ false: "#f3f4f6", true: "#e9d5ff" }}
                  thumbColor={formData.isSplitExpense ? "#8b5cf6" : "#9ca3af"}
                />
              </View>
            </View>

            {/* Split Expense Fields */}
            {formData.isSplitExpense && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Who Paid? *</Text>
                  <View style={styles.participantGrid}>
                    {trip.participants.map((participant) => (
                      <TouchableOpacity
                        key={participant.id}
                        style={[
                          styles.participantButton,
                          {
                            backgroundColor:
                              formData.paidBy === participant.id
                                ? "#8b5cf6"
                                : "#f3f4f6",
                          },
                        ]}
                        onPress={() =>
                          handleInputChange("paidBy", participant.id)
                        }
                      >
                        <View style={styles.participantContent}>
                          <Text
                            style={[
                              styles.participantText,
                              {
                                color:
                                  formData.paidBy === participant.id
                                    ? "white"
                                    : "#666",
                              },
                            ]}
                          >
                            {participant.name}
                          </Text>
                          {participant.isCurrentUser && (
                            <View style={styles.currentUserBadge}>
                              <Text style={styles.currentUserText}>You</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Split Type</Text>
                  <View style={styles.splitTypeContainer}>
                    {(["equal", "percentage", "custom"] as const).map(
                      (type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.splitTypeButton,
                            {
                              backgroundColor:
                                formData.splitType === type
                                  ? "#8b5cf6"
                                  : "#f3f4f6",
                            },
                          ]}
                          onPress={() => handleSplitTypeChange(type)}
                        >
                          <Text
                            style={[
                              styles.splitTypeText,
                              {
                                color:
                                  formData.splitType === type
                                    ? "white"
                                    : "#666",
                              },
                            ]}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Split Between *</Text>
                  <View style={styles.participantGrid}>
                    {trip.participants.map((participant) => (
                      <TouchableOpacity
                        key={participant.id}
                        style={[
                          styles.participantButton,
                          {
                            backgroundColor: formData.splitBetween.includes(
                              participant.id,
                            )
                              ? "#8b5cf6"
                              : "#f3f4f6",
                          },
                        ]}
                        onPress={() => handleParticipantToggle(participant.id)}
                      >
                        <View style={styles.participantContent}>
                          <Text
                            style={[
                              styles.participantText,
                              {
                                color: formData.splitBetween.includes(
                                  participant.id,
                                )
                                  ? "white"
                                  : "#666",
                              },
                            ]}
                          >
                            {participant.name}
                          </Text>
                          {participant.isCurrentUser && (
                            <View style={styles.currentUserBadge}>
                              <Text style={styles.currentUserText}>You</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {formData.splitType === "custom" && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Custom Amounts</Text>
                    {formData.splitBetween.map((participantId) => {
                      const participant = trip.participants.find(
                        (p) => p.id === participantId,
                      );
                      return (
                        <View
                          key={participantId}
                          style={styles.customAmountRow}
                        >
                          <Text style={styles.customAmountLabel}>
                            {participant?.name}
                          </Text>
                          <TextInput
                            style={styles.customAmountInput}
                            placeholder="0.00"
                            value={formData.customAmounts[participantId] || ""}
                            onChangeText={(value) =>
                              handleCustomAmountChange(participantId, value)
                            }
                            keyboardType="numeric"
                          />
                        </View>
                      );
                    })}
                  </View>
                )}

                {formData.splitType === "percentage" && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Percentages</Text>
                    {formData.splitBetween.map((participantId) => {
                      const participant = trip.participants.find(
                        (p) => p.id === participantId,
                      );
                      return (
                        <View
                          key={participantId}
                          style={styles.customAmountRow}
                        >
                          <Text style={styles.customAmountLabel}>
                            {participant?.name}
                          </Text>
                          <TextInput
                            style={styles.customAmountInput}
                            placeholder="0"
                            value={formData.percentages[participantId] || ""}
                            onChangeText={(value) =>
                              handlePercentageChange(participantId, value)
                            }
                            keyboardType="numeric"
                          />
                          <Text style={styles.percentageSymbol}>%</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}

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
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera" size={20} color="#8b5cf6" />
                  <Text style={styles.imageButtonText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={handleAddReceiptImages}
                >
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
                {isLoading ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardView: {
    flex: 1,
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
  tripInfo: {
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  tripText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
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
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  imageItem: {
    position: "relative",
  },
  receiptImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "white",
    borderRadius: 10,
  },
  imageButtons: {
    flexDirection: "row",
    gap: 12,
  },
  imageButton: {
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
  imageButtonText: {
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
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  disabledButton: {
    backgroundColor: "#d1d5db",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#666",
  },
  splitToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  splitToggleLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  splitToggleText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  participantGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  participantButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  participantText: {
    fontSize: 14,
    fontWeight: "500",
  },
  splitTypeContainer: {
    flexDirection: "row",
    gap: 8,
  },
  splitTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  splitTypeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  customAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  customAmountLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  customAmountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: "right",
    marginLeft: 8,
  },
  percentageSymbol: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  participantContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  currentUserBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  currentUserText: {
    fontSize: 10,
    color: "white",
    fontWeight: "600",
  },
});
