import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/contexts/AppContext";
import { calculateSplit, validateSplit } from "@/utils/splitCalculations";

interface SplitExpenseScreenProps {
  navigation: any;
  route: any;
}

export default function SplitExpenseScreen({ navigation, route }: SplitExpenseScreenProps) {
  const { tripId, expenseData } = route.params;
  const { getTrip, addExpense } = useApp();
  const trip = getTrip(tripId);

  const [formData, setFormData] = useState({
    amount: expenseData?.amount?.toString() || "",
    description: expenseData?.description || "",
    category: expenseData?.category || "food",
    date: expenseData?.date || new Date().toISOString().split("T")[0],
    notes: expenseData?.notes || "",
    splitType: "equal" as "equal" | "percentage" | "custom",
    paidBy: trip?.participants?.[0]?.id || "",
    splitBetween: [] as string[],
    customAmounts: {} as Record<string, string>,
    percentages: {} as Record<string, string>,
  });

  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (trip && trip.participants && trip.participants.length > 0) {
      setFormData((prev) => ({
        ...prev,
        paidBy: trip.participants[0].id,
        splitBetween: trip.participants.map((p) => p.id),
      }));
    }
  }, [trip]);

  const handleInputChange = (field: string, value: any) => {
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

    try {
      const customValues =
        formData.splitType === "custom"
          ? Object.fromEntries(
              Object.entries(formData.customAmounts).map(([id, amount]) => [
                id,
                parseFloat(amount) || 0,
              ]),
            )
          : undefined;

      return calculateSplit(
        amount,
        formData.splitType,
        participants,
        customValues,
      );
    } catch (error) {
      return [];
    }
  };

  const handleSaveExpense = async () => {
    if (
      !formData.amount ||
      !formData.description ||
      !formData.paidBy ||
      formData.splitBetween.length === 0
    ) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    setIsCalculating(true);
    try {
      const amount = parseFloat(formData.amount);
      const validation = validateSplit(
        amount,
        formData.splitType,
        formData.splitBetween.map((id) => ({
          userId: id,
          userName:
            trip?.participants?.find((p) => p.id === id)?.name || "Unknown",
          amount: 0,
          isPaid: false,
          settlementStatus: "pending" as const,
        })),
        formData.splitType === "custom"
          ? Object.fromEntries(
              Object.entries(formData.customAmounts).map(([id, amount]) => [
                id,
                parseFloat(amount) || 0,
              ]),
            )
          : undefined,
      );

      if (!validation.isValid) {
        Alert.alert("Validation Error", validation.errors.join("\n"));
        return;
      }

      const splitParticipants = calculateSplitAmounts();

      await addExpense({
        tripId,
        amount,
        description: formData.description,
        notes: formData.notes || undefined,
        category: formData.category,
        date: formData.date,
        currency: trip?.currency || "USD",
        receiptImages: [],
        paidBy: formData.paidBy,
        splitBetween: splitParticipants,
        splitType: formData.splitType,
      });

      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to save expense. Please try again.");
    } finally {
      setIsCalculating(false);
    }
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

  const splitAmounts = calculateSplitAmounts();
  const totalSplit = splitAmounts.reduce((sum, split) => sum + split.amount, 0);
  const isValidSplit =
    Math.abs(totalSplit - parseFloat(formData.amount || "0")) < 0.01;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Split Expense</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
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
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={styles.input}
              placeholder="What did you pay for?"
              value={formData.description}
              onChangeText={(value) => handleInputChange("description", value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Who Paid *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.participantSelector}
            >
              {trip.participants.map((participant) => (
                <TouchableOpacity
                  key={participant.id}
                  style={[
                    styles.participantChip,
                    formData.paidBy === participant.id && styles.selectedChip,
                  ]}
                  onPress={() => handleInputChange("paidBy", participant.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      formData.paidBy === participant.id &&
                        styles.selectedChipText,
                    ]}
                  >
                    {participant.name}
                  </Text>
                </TouchableOpacity>
              ))}
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
              {(trip.participants || []).map((participant) => (
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
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                    <Text style={styles.participantName}>
                      {participant.name}
                    </Text>
                  </View>

                  {formData.splitBetween.includes(participant.id) && (
                    <View style={styles.amountInput}>
                      {formData.splitType === "custom" && (
                        <TextInput
                          style={styles.customAmountInput}
                          placeholder="$0.00"
                          value={formData.customAmounts[participant.id] || ""}
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
                          {splitAmounts
                            .find((s) => s.userId === participant.id)
                            ?.amount.toFixed(2) || "0.00"}
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {formData.splitType !== "equal" && (
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Split Summary</Text>
              <Text
                style={[
                  styles.totalAmount,
                  !isValidSplit && styles.invalidAmount,
                ]}
              >
                Total: ${totalSplit.toFixed(2)} / ${formData.amount || "0.00"}
              </Text>
              {!isValidSplit && (
                <Text style={styles.errorText}>
                  Split amounts do not match total
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!isValidSplit || isCalculating) && styles.disabledButton,
            ]}
            onPress={handleSaveExpense}
            disabled={!isValidSplit || isCalculating}
          >
            <Text style={styles.saveText}>
              {isCalculating ? "Saving..." : "Save Expense"}
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
  summary: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  invalidAmount: {
    color: "#ef4444",
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 20,
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
});
