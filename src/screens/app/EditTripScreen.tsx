import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useTheme,
  Surface,
  Switch,
  TextInput,
  Divider,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useApp } from "@/contexts/AppContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import DatePickerInput from "@/components/DatePickerInput";
import { pickImage, saveImage, deleteImage } from "@/utils/imageStorage";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { AnimatedInput } from "@/components/ui/AnimatedInput";
import CurrencyBottomSheet from "@/components/modals/CurrencyBottomSheet";
import { getCurrencyByCode } from "@/constants/currencies";

interface EditTripScreenProps {
  navigation: any;
  route: any;
}

export default function EditTripScreen({
  navigation,
  route,
}: EditTripScreenProps) {
  const theme = useTheme();

  // Safe defaults for theme colors to prevent runtime errors
  const safeTheme = {
    colors: {
      background: theme?.colors?.background || "#FFFFFF",
      surface: theme?.colors?.surface || "#FFFFFF",
      surfaceVariant: theme?.colors?.surfaceVariant || "#F5F5F5",
      onSurface: theme?.colors?.onSurface || "#000000",
      onSurfaceVariant: theme?.colors?.onSurfaceVariant || "#666666",
      primary: theme?.colors?.primary || "#8b5cf6",
      onPrimary: theme?.colors?.onPrimary || "#FFFFFF",
      primaryContainer: theme?.colors?.primaryContainer || "#EDE9FE",
      onPrimaryContainer: theme?.colors?.onPrimaryContainer || "#000000",
      error: theme?.colors?.error || "#EF4444",
      outline: theme?.colors?.outline || "#E5E5E5",
      outlineVariant: theme?.colors?.outlineVariant || "#E5E5E5",
    },
  };
  const { updateTrip, deleteTrip, getTrip } = useApp();
  const { defaultCurrency } = useCurrency();
  const { tripId } = route.params;
  const trip = getTrip(tripId);

  const [formData, setFormData] = useState({
    name: "",
    destination: "",
    startDate: "",
    endDate: "",
    budget: "",
    currency: defaultCurrency || "INR",
    tripCurrency: defaultCurrency || "INR",
    exchangeRateToDefault: "",
    isGroupTrip: false,
    coverImage: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  useEffect(() => {
    if (trip) {
      const tripCurrency =
        trip.tripCurrency || trip.currency || defaultCurrency || "INR";
      setFormData({
        name: trip.name,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        budget: trip.budget.toString(),
        currency: tripCurrency,
        tripCurrency: tripCurrency,
        exchangeRateToDefault: trip.exchangeRateToDefault?.toString() || "",
        isGroupTrip: trip.isGroup || false,
        coverImage: trip.coverImage || "",
      });
    }
  }, [trip, defaultCurrency]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveTrip = async () => {
    if (
      !formData.name.trim() ||
      !formData.destination.trim() ||
      !formData.budget.trim()
    ) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    // Validate exchange rate if currency differs from default
    if (formData.tripCurrency !== defaultCurrency) {
      if (
        !formData.exchangeRateToDefault ||
        parseFloat(formData.exchangeRateToDefault) <= 0
      ) {
        Alert.alert(
          "Error",
          "Please enter a valid exchange rate to your default currency.",
        );
        return;
      }
    }

    setIsLoading(true);
    try {
      let coverImagePath = formData.coverImage;

      // Check if user is uploading a new image (not data URI, not https URL, not existing local path)
      const isNewImage =
        formData.coverImage &&
        !formData.coverImage.startsWith("data:") &&
        !formData.coverImage.startsWith("http://") &&
        !formData.coverImage.startsWith("https://") &&
        !formData.coverImage.includes("images/");

      if (isNewImage) {
        // Delete old image only if it's a local file (not data URI or cloud URL)
        if (
          trip?.coverImage &&
          !trip.coverImage.startsWith("data:") &&
          !trip.coverImage.startsWith("http://") &&
          !trip.coverImage.startsWith("https://")
        ) {
          await deleteImage(trip.coverImage);
        }
        // Save the new image
        coverImagePath = await saveImage(formData.coverImage, "cover");
      }

      await updateTrip(tripId, {
        name: formData.name.trim(),
        destination: formData.destination.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        budget: parseFloat(formData.budget),
        currency: formData.tripCurrency,
        tripCurrency: formData.tripCurrency,
        exchangeRateToDefault:
          formData.tripCurrency !== defaultCurrency &&
          formData.exchangeRateToDefault
            ? parseFloat(formData.exchangeRateToDefault)
            : undefined,
        isGroup: formData.isGroupTrip,
        coverImage: coverImagePath,
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Failed to update trip. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      "Delete Trip",
      "Are you sure you want to delete this trip? This action cannot be undone and will also delete all associated expenses.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Only delete local file images, not data URIs or cloud URLs
              if (
                trip?.coverImage &&
                !trip.coverImage.startsWith("data:") &&
                !trip.coverImage.startsWith("http://") &&
                !trip.coverImage.startsWith("https://")
              ) {
                await deleteImage(trip.coverImage);
              }
              await deleteTrip(tripId);
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning,
                );
              }
              navigation.goBack();
            } catch (err) {
              Alert.alert("Error", "Failed to delete trip. Please try again.");
            }
          },
        },
      ],
    );
  };

  const handlePickCoverImage = async () => {
    const imageUri = await pickImage("cover");
    if (imageUri) {
      setFormData((prev) => ({ ...prev, coverImage: imageUri }));
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleRemoveCoverImage = () => {
    setFormData((prev) => ({ ...prev, coverImage: "" }));
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (!trip) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: safeTheme.colors.background },
        ]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: safeTheme.colors.error }]}>
            Trip not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: safeTheme.colors.background },
      ]}
      edges={["top"]}
    >
      <Surface style={styles.header} elevation={1}>
        <AnimatedButton
          mode="text"
          icon="arrow-back"
          onPress={() => {
            navigation.goBack();
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          label=""
          style={styles.backButton}
        />
        <Text style={[styles.title, { color: safeTheme.colors.onSurface }]}>
          Edit Trip
        </Text>
        <AnimatedButton
          mode="text"
          icon="trash-outline"
          label=""
          onPress={handleDeleteTrip}
          variant="error"
          style={styles.deleteButton}
        />
      </Surface>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
          >
            <AnimatedCard variant="elevated" elevation={2} style={styles.card}>
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.label, { color: safeTheme.colors.onSurface }]}
                >
                  Cover Image
                </Text>
                {formData.coverImage ? (
                  <MotiView
                    from={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    style={styles.imagePreview}
                  >
                    <Image
                      source={{ uri: formData.coverImage }}
                      style={styles.coverImage}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      style={[
                        styles.removeImageButton,
                        { backgroundColor: "#FEE2E2" },
                      ]}
                      onPress={handleRemoveCoverImage}
                    >
                      <Ionicons
                        name="close-circle"
                        size={24}
                        color={safeTheme.colors.error}
                      />
                    </TouchableOpacity>
                  </MotiView>
                ) : (
                  <AnimatedCard
                    variant="outlined"
                    onPress={handlePickCoverImage}
                    style={styles.imagePicker}
                  >
                    <Ionicons
                      name="camera"
                      size={32}
                      color={safeTheme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.imagePickerText,
                        { color: safeTheme.colors.primary },
                      ]}
                    >
                      Add Cover Image
                    </Text>
                  </AnimatedCard>
                )}
              </View>

              <AnimatedInput
                label="Trip Name"
                value={formData.name}
                onChangeText={(value) => handleInputChange("name", value)}
                placeholder="e.g. Summer Vacation 2025"
                left={
                  <TextInput.Icon
                    icon={() => <Ionicons name="airplane-outline" size={20} />}
                  />
                }
                style={styles.input}
              />

              <AnimatedInput
                label="Destination"
                value={formData.destination}
                onChangeText={(value) =>
                  handleInputChange("destination", value)
                }
                placeholder="e.g. Paris, France"
                left={
                  <TextInput.Icon
                    icon={() => <Ionicons name="location-outline" size={20} />}
                  />
                }
                style={styles.input}
              />

              <View style={styles.dateRow}>
                <View style={styles.dateInput}>
                  <Text
                    style={[
                      styles.label,
                      { color: safeTheme.colors.onSurface },
                    ]}
                  >
                    Start Date
                  </Text>
                  <DatePickerInput
                    value={formData.startDate}
                    onChange={(value) => handleInputChange("startDate", value)}
                  />
                </View>
                <View style={styles.dateInput}>
                  <Text
                    style={[
                      styles.label,
                      { color: safeTheme.colors.onSurface },
                    ]}
                  >
                    End Date
                  </Text>
                  <DatePickerInput
                    value={formData.endDate}
                    onChange={(value) => handleInputChange("endDate", value)}
                    minimumDate={new Date(formData.startDate)}
                  />
                </View>
              </View>

              <View style={styles.budgetRow}>
                <View style={styles.budgetInput}>
                  <AnimatedInput
                    label="Budget"
                    value={formData.budget}
                    onChangeText={(value) => handleInputChange("budget", value)}
                    placeholder="1000"
                    keyboardType="numeric"
                    left={
                      <TextInput.Icon
                        icon={() => (
                          <Ionicons name="wallet-outline" size={20} />
                        )}
                      />
                    }
                    style={styles.input}
                  />
                </View>
                <TouchableOpacity
                  style={styles.currencyInput}
                  onPress={() => {
                    setShowCurrencyModal(true);
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <View
                    style={[
                      styles.currencyButton,
                      {
                        backgroundColor: safeTheme.colors.surfaceVariant,
                        borderColor: safeTheme.colors.outlineVariant,
                      },
                    ]}
                  >
                    {(() => {
                      const currency = getCurrencyByCode(formData.tripCurrency);
                      return (
                        <>
                          <Text style={styles.currencyFlag}>
                            {currency?.flag || "💱"}
                          </Text>
                          <Text
                            style={[
                              styles.currencyCodeText,
                              { color: safeTheme.colors.onSurface },
                            ]}
                          >
                            {currency?.code || formData.tripCurrency}
                          </Text>
                          <Ionicons
                            name="chevron-down"
                            size={16}
                            color={safeTheme.colors.onSurfaceVariant}
                            style={styles.currencyChevron}
                          />
                        </>
                      );
                    })()}
                  </View>
                </TouchableOpacity>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.switchGroup}>
                <View style={styles.switchLabelContainer}>
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={safeTheme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.switchLabel,
                      { color: safeTheme.colors.onSurface },
                    ]}
                  >
                    Share expenses with friends
                  </Text>
                </View>
                <Switch
                  value={formData.isGroupTrip}
                  onValueChange={(value) => {
                    handleInputChange("isGroupTrip", value);
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  color={safeTheme.colors.primary}
                />
              </View>
            </AnimatedCard>

            <View style={styles.actions}>
              <AnimatedButton
                mode="outlined"
                label="Cancel"
                onPress={() => {
                  navigation.goBack();
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                variant="secondary"
                style={styles.cancelButton}
              />

              <AnimatedButton
                mode="contained"
                label={isLoading ? "Saving..." : "Save Changes"}
                onPress={handleSaveTrip}
                loading={isLoading}
                disabled={isLoading}
                variant="primary"
                fullWidth
                style={styles.saveButton}
              />
            </View>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Currency Selection Bottom Sheet */}
      <CurrencyBottomSheet
        visible={showCurrencyModal}
        onDismiss={() => setShowCurrencyModal(false)}
        onSelect={(currencyCode) => {
          handleInputChange("tripCurrency", currencyCode);
          handleInputChange("currency", currencyCode);
          if (currencyCode === defaultCurrency) {
            handleInputChange("exchangeRateToDefault", "");
          }
        }}
        title="Choose Trip Currency"
        selectedCurrency={formData.tripCurrency}
        showExchangeRate={true}
        defaultCurrency={defaultCurrency}
        exchangeRate={formData.exchangeRateToDefault}
        onExchangeRateChange={(rate) =>
          handleInputChange("exchangeRateToDefault", rate)
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 50,
  },
  backButton: {
    minWidth: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  deleteButton: {
    minWidth: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    paddingTop: 8,
  },
  card: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  dateInput: {
    flex: 1,
  },
  budgetRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  budgetInput: {
    flex: 2,
  },
  currencyInput: {
    flex: 1,
  },
  currencyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 56,
    gap: 8,
  },
  currencyFlag: {
    fontSize: 20,
  },
  currencyCodeText: {
    fontSize: 16,
    fontWeight: "600",
  },
  currencyChevron: {
    marginLeft: 4,
  },
  divider: {
    marginVertical: 16,
  },
  switchGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  switchLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  switchLabel: {
    fontSize: 16,
    flex: 1,
  },
  imagePicker: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
    borderStyle: "dashed",
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: "500",
  },
  imagePreview: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: 200,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 12,
    padding: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
