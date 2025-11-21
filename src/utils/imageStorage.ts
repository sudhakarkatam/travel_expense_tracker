import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import * as ImageManipulator from 'expo-image-manipulator';

const IMAGE_DIRECTORY = `${FileSystem.documentDirectory}images/`;

// Image size limits (in bytes)
const MAX_RECEIPT_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_COVER_SIZE = 5 * 1024 * 1024;   // 5MB

// Ensure images directory exists
export const ensureImageDirectory = async () => {
  const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIRECTORY, {
      intermediates: true,
    });
  }
};

const compressImage = async (uri: string, type: "cover" | "receipt"): Promise<string> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) return uri;

    const fileSize = fileInfo.size || 0;
    const limit = type === "receipt" ? MAX_RECEIPT_SIZE : MAX_COVER_SIZE;

    if (fileSize <= limit) {
      return uri;
    }

    console.log(`[ImageStorage] Image too large (${(fileSize / 1024 / 1024).toFixed(2)}MB), compressing...`);

    // Compress
    // Start with 0.8 quality and resize if needed
    // For receipts, we might want to keep resolution high but lower quality
    // For covers, we might want to limit max dimension

    const actions: ImageManipulator.Action[] = [];
    if (type === "cover") {
      actions.push({ resize: { width: 1920 } }); // Max width 1920 for covers
    } else {
      actions.push({ resize: { width: 1200 } }); // Max width 1200 for receipts
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Check new size
    const newInfo = await FileSystem.getInfoAsync(result.uri);
    console.log(`[ImageStorage] Compressed size: ${(newInfo.size || 0 / 1024 / 1024).toFixed(2)}MB`);

    return result.uri;
  } catch (error) {
    console.error("Error compressing image:", error);
    return uri; // Return original if compression fails
  }
};

export const saveImage = async (
  uri: string,
  type: "cover" | "receipt",
): Promise<string> => {
  try {
    await ensureImageDirectory();

    // Compress image first
    const compressedUri = await compressImage(uri, type);

    const fileName = `${type}_${Date.now()}.jpg`;
    const newUri = `${IMAGE_DIRECTORY}${fileName}`;

    await FileSystem.copyAsync({
      from: compressedUri,
      to: newUri,
    });

    // Clean up compressed temp file if it's different from original
    if (compressedUri !== uri) {
      try {
        await FileSystem.deleteAsync(compressedUri, { idempotent: true });
      } catch (e) {
        // Ignore
      }
    }

    return newUri;
  } catch (error) {
    console.error(
      "Error saving image:",
      error instanceof Error ? error.message : "Unknown error",
    );
    throw new Error("Failed to save image");
  }
};

export const deleteImage = async (path: string): Promise<void> => {
  try {
    // Validate path
    if (!path || typeof path !== "string") {
      console.warn("deleteImage: Invalid path provided");
      return;
    }

    // Ignore data URIs (base64 encoded images stored in Firestore)
    if (path.startsWith("data:")) {
      console.log("deleteImage: Skipping data URI (base64 image in Firestore)");
      return;
    }

    // Ignore URLs (images stored in Firebase Storage or external URLs)
    if (path.startsWith("http://") || path.startsWith("https://")) {
      console.log(
        "deleteImage: Skipping URL (Firebase Storage or external image)",
      );
      return;
    }

    // Only delete local file system paths
    if (!path.includes(FileSystem.documentDirectory || "")) {
      console.warn("deleteImage: Path is not in local file system, skipping");
      return;
    }

    // Check if file exists before trying to delete
    try {
      const fileInfo = await FileSystem.getInfoAsync(path);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(path, { idempotent: true });
        console.log("deleteImage: Successfully deleted local image");
      } else {
        console.log("deleteImage: File does not exist, nothing to delete");
      }
    } catch (innerError) {
      // If getInfoAsync fails, log but don't crash
      console.warn("deleteImage: Error checking file info:", innerError);
    }
  } catch (error) {
    console.error(
      "deleteImage: Error deleting image:",
      error instanceof Error ? error.message : "Unknown error",
    );
    // We don't throw here to prevent crashing the UI if an image cleanup fails
  }
};

export const getImageUri = (path: string): string => {
  return path;
};

export const pickImage = async (
  type: "cover" | "receipt",
): Promise<string | null> => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant permission to access your photo library to select images.",
        [{ text: "OK" }],
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: type === "cover",
      aspect: type === "cover" ? [16, 9] : undefined,
      quality: 0.8,
    });

    if (
      !result.canceled &&
      result.assets &&
      result.assets.length > 0 &&
      result.assets[0]
    ) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error(
      "Error picking image:",
      error instanceof Error ? error.message : "Unknown error",
    );
    Alert.alert(
      "Error",
      "Failed to pick image. Please make sure you have granted photo library permissions.",
      [{ text: "OK" }],
    );
    return null;
  }
};

export const takePhoto = async (): Promise<string | null> => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant permission to access your camera to take photos.",
        [{ text: "OK" }],
      );
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (
      !result.canceled &&
      result.assets &&
      result.assets.length > 0 &&
      result.assets[0]
    ) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error(
      "Error taking photo:",
      error instanceof Error ? error.message : "Unknown error",
    );
    Alert.alert(
      "Error",
      "Failed to take photo. Please make sure you have granted camera permissions.",
      [{ text: "OK" }],
    );
    return null;
  }
};

export const pickMultipleImages = async (): Promise<string[]> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant permission to access your photo library to select images.",
        [{ text: "OK" }],
      );
      return [];
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets
        .map((asset) => asset.uri)
        .filter((uri) => uri != null);
    }
    return [];
  } catch (error) {
    console.error(
      "Error picking images:",
      error instanceof Error ? error.message : "Unknown error",
    );
    Alert.alert(
      "Error",
      "Failed to pick images. Please make sure you have granted photo library permissions.",
      [{ text: "OK" }],
    );
    return [];
  }
};
