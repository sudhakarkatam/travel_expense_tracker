import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const IMAGE_DIRECTORY = `${FileSystem.documentDirectory}images/`;

// Ensure images directory exists
export const ensureImageDirectory = async () => {
  const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIRECTORY, { intermediates: true });
  }
};

export const saveImage = async (uri: string, type: 'cover' | 'receipt'): Promise<string> => {
  try {
    await ensureImageDirectory();
    
    const fileName = `${type}_${Date.now()}.jpg`;
    const newUri = `${IMAGE_DIRECTORY}${fileName}`;
    
    await FileSystem.copyAsync({
      from: uri,
      to: newUri,
    });
    
    return newUri;
  } catch (error) {
    console.error('Error saving image:', error);
    throw new Error('Failed to save image');
  }
};

export const deleteImage = async (path: string): Promise<void> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(path);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(path);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
};

export const getImageUri = (path: string): string => {
  return path;
};

export const pickImage = async (type: 'cover' | 'receipt'): Promise<string | null> => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please grant permission to access your photo library to select images.',
        [{ text: 'OK' }]
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: type === 'cover',
      aspect: type === 'cover' ? [16, 9] : undefined,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    Alert.alert(
      'Error',
      'Failed to pick image. Please make sure you have granted photo library permissions.',
      [{ text: 'OK' }]
    );
    return null;
  }
};

export const takePhoto = async (): Promise<string | null> => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please grant permission to access your camera to take photos.',
        [{ text: 'OK' }]
      );
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    Alert.alert(
      'Error',
      'Failed to take photo. Please make sure you have granted camera permissions.',
      [{ text: 'OK' }]
    );
    return null;
  }
};

export const pickMultipleImages = async (): Promise<string[]> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please grant permission to access your photo library to select images.',
        [{ text: 'OK' }]
      );
      return [];
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets.map(asset => asset.uri).filter(uri => uri != null);
    }
    return [];
  } catch (error) {
    console.error('Error picking images:', error);
    Alert.alert(
      'Error',
      'Failed to pick images. Please make sure you have granted photo library permissions.',
      [{ text: 'OK' }]
    );
    return [];
  }
};
