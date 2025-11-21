import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject, UploadResult } from 'firebase/storage';
import { storage } from '@/config/firebase';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert } from 'react-native';

// Try to import ImageManipulator (optional dependency)
let ImageManipulator: any = null;
try {
  ImageManipulator = require('expo-image-manipulator');
} catch (e) {
  console.warn('[Storage] expo-image-manipulator not installed. Image compression will be limited.');
}

// Force base64 storage by default (since Firebase Storage requires Blaze plan)
// Set to false to use Firebase Storage (requires Blaze plan upgrade)
const FORCE_BASE64_STORAGE = true;

// Track if Storage is available (cached after first check)
let isStorageAvailable: boolean | null = null;

export interface UploadImageResult {
  url: string;
  path: string;
}

// Image size limits (in bytes)
// Image size limits (in bytes)
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5MB for Covers
const MAX_RECEIPT_SIZE = 2 * 1024 * 1024; // 2MB for Receipts
const MAX_PROFILE_SIZE = 2 * 1024 * 1024; // 2MB for Profile
const MAX_FIRESTORE_SIZE = 900 * 1024; // 900KB for Firestore base64 (1MB limit with margin)
const MAX_IMAGE_DIMENSION = 2048; // Max width or height in pixels for Storage
const MAX_FIRESTORE_DIMENSION = 1200; // Max dimension for Firestore (smaller to ensure < 900KB)

export const storageService = {
  /**
   * Check and validate image size
   * @param localUri - Local file URI
   * @param type - Type of image (cover, receipt, profile)
   * @returns File size in bytes
   */
  async validateImageSize(localUri: string, type: 'cover' | 'receipt' | 'profile' = 'cover'): Promise<number> {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    // Get file size
    const fileSize = fileInfo.size || 0;

    let limit = MAX_COVER_SIZE;
    if (type === 'receipt') limit = MAX_RECEIPT_SIZE;
    if (type === 'profile') limit = MAX_PROFILE_SIZE;

    if (fileSize > limit) {
      throw new Error(`Image size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${limit / 1024 / 1024}MB for ${type}s. Please compress or resize the image.`);
    }

    return fileSize;
  },

  /**
   * Compress and resize image for Firestore (must be < 900KB)
   * @param localUri - Local file URI
   * @returns Compressed/resized image URI
   */
  async compressForFirestore(localUri: string): Promise<string> {
    if (!ImageManipulator) {
      throw new Error('ImageManipulator not available. Please install expo-image-manipulator for image compression.');
    }

    let currentUri = localUri;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const fileInfo = await FileSystem.getInfoAsync(currentUri);
      const fileSize = fileInfo.size || 0;

      // Check if file is small enough (accounting for base64 encoding overhead ~33%)
      const base64Size = (fileSize * 4) / 3;

      if (base64Size <= MAX_FIRESTORE_SIZE) {
        console.log(`[Storage] Image compressed to ${(fileSize / 1024).toFixed(2)}KB (base64: ${(base64Size / 1024).toFixed(2)}KB)`);
        return currentUri;
      }

      attempts++;
      console.log(`[Storage] Image too large (${(base64Size / 1024).toFixed(2)}KB), compressing (attempt ${attempts}/${maxAttempts})...`);

      // Progressive compression: reduce dimension and quality with each attempt
      const dimension = Math.max(800, MAX_FIRESTORE_DIMENSION - (attempts * 200));
      const quality = Math.max(0.4, 0.8 - (attempts * 0.1));

      try {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          localUri, // Always start from original
          [
            { resize: { width: dimension } },
          ],
          {
            compress: quality,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        // Clean up previous attempt if it was different from original
        if (currentUri !== localUri && attempts > 1) {
          try {
            await FileSystem.deleteAsync(currentUri, { idempotent: true });
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        currentUri = manipulatedImage.uri;
      } catch (error) {
        console.error(`[Storage] Compression attempt ${attempts} failed:`, error);
        if (attempts === maxAttempts) {
          throw new Error(`Failed to compress image after ${maxAttempts} attempts. Image may be too large.`);
        }
      }
    }

    // Final check
    const finalInfo = await FileSystem.getInfoAsync(currentUri);
    const finalSize = finalInfo.size || 0;
    const finalBase64Size = (finalSize * 4) / 3;

    if (finalBase64Size > MAX_FIRESTORE_SIZE) {
      throw new Error(`Image too large for Firestore (${(finalBase64Size / 1024).toFixed(2)}KB). Maximum is ${(MAX_FIRESTORE_SIZE / 1024).toFixed(2)}KB.`);
    }

    return currentUri;
  },

  /**
   * Compress and resize image if needed (for Firebase Storage)
   * @param localUri - Local file URI
   * @param type - Type of image (cover, receipt, profile)
   * @returns Compressed/resized image URI
   */
  async compressImageIfNeeded(localUri: string, type: 'cover' | 'receipt' | 'profile'): Promise<string> {
    try {
      // Determine limit
      let limit = MAX_COVER_SIZE;
      if (type === 'receipt') limit = MAX_RECEIPT_SIZE;
      if (type === 'profile') limit = MAX_PROFILE_SIZE;

      // Check file size first
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      const fileSize = fileInfo.size || 0;

      // If ImageManipulator is not available, just validate size
      if (!ImageManipulator) {
        if (fileSize > limit) {
          console.warn(`[Storage] ImageManipulator not available and image is too large (${(fileSize / 1024 / 1024).toFixed(2)}MB > ${limit / 1024 / 1024}MB).`);
        }
        return localUri;
      }

      // If file is small enough, still optimize dimensions if it's huge
      if (fileSize <= limit) {
        // Optional: Resize if dimensions are massive even if file size is small?
        // For now, just return if size is within limits
        return localUri;
      }

      console.log(`[Storage] Image too large (${(fileSize / 1024 / 1024).toFixed(2)}MB > ${limit / 1024 / 1024}MB), compressing...`);

      // File is too large, compress it
      // Adjust quality based on how much we need to compress
      const ratio = limit / fileSize;
      const quality = Math.max(0.4, Math.min(0.9, ratio * 0.9));

      const width = type === 'cover' ? 1920 : 1200;

      const manipulatedImage = await ImageManipulator.manipulateAsync(
        localUri,
        [
          { resize: { width: width } },
        ],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Check if compressed image is still too large
      const compressedInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
      if (compressedInfo.size && compressedInfo.size > limit) {
        // Try more aggressive compression
        console.log(`[Storage] Still too large (${(compressedInfo.size / 1024 / 1024).toFixed(2)}MB), trying aggressive compression...`);
        const moreCompressed = await ImageManipulator.manipulateAsync(
          localUri,
          [
            { resize: { width: Math.floor(width * 0.8) } }, // Smaller dimension
          ],
          {
            compress: 0.5, // 50% quality
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
        return moreCompressed.uri;
      }

      return manipulatedImage.uri;
    } catch (error) {
      console.error('[Storage] Error compressing image:', error);
      return localUri;
    }
  },

  /**
   * Convert image to base64 for Firestore storage (fallback when Storage unavailable)
   * @param localUri - Local file URI
   * @returns Base64 data URL
   */
  async convertToBase64(localUri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      // Return as data URL (Firestore-friendly format)
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('[Storage] Error converting to base64:', error);
      throw new Error('Failed to convert image to base64');
    }
  },

  /**
   * Upload image as base64 to Firestore
   * @param localUri - Local file URI
   * @param userId - User ID
   * @param type - Type of image (cover, receipt, profile)
   * @param itemId - Optional item ID (trip ID, expense ID, etc.)
   */
  async uploadImageAsBase64(
    localUri: string,
    userId: string,
    type: 'cover' | 'receipt' | 'profile',
    itemId?: string
  ): Promise<UploadImageResult> {
    console.log(`[Storage] Using base64 storage (Firestore)...`);

    // Compress image to fit Firestore's 900KB limit
    let processedUri = localUri;
    try {
      processedUri = await this.compressForFirestore(localUri);
    } catch (compressError) {
      console.error('[Storage] Compression failed:', compressError);
      throw new Error(`Failed to compress image for Firestore: ${compressError instanceof Error ? compressError.message : 'Unknown error'}`);
    }

    // Convert to base64
    const base64Data = await this.convertToBase64(processedUri);

    // Final size check
    const sizeInBytes = (base64Data.length * 3) / 4;
    if (sizeInBytes > MAX_FIRESTORE_SIZE) {
      throw new Error(`Image too large for Firestore (${(sizeInBytes / 1024).toFixed(2)}KB). Maximum is ${(MAX_FIRESTORE_SIZE / 1024).toFixed(2)}KB.`);
    }

    // Clean up compressed file if different from original
    if (processedUri !== localUri) {
      try {
        await FileSystem.deleteAsync(processedUri, { idempotent: true });
      } catch (cleanupError) {
        console.warn('[Storage] Failed to cleanup compressed image:', cleanupError);
      }
    }

    console.log(`[Storage] ✅ Image converted to base64 (${(sizeInBytes / 1024).toFixed(2)}KB) for Firestore storage`);
    console.log(`[Storage] Base64 URL format: data:image/jpeg;base64,${base64Data.substring(0, 50)}...`);
    console.log(`[Storage] Full base64 length: ${base64Data.length} characters`);

    return {
      url: base64Data, // Return base64 data URL (format: data:image/jpeg;base64,<base64_string>)
      path: 'firestore', // Indicate it's stored in Firestore
    };
  },

  /**
   * Upload image to Firebase Storage (or convert to base64 if Storage unavailable)
   * @param localUri - Local file URI
   * @param userId - User ID
   * @param type - Type of image (cover, receipt, profile)
   * @param itemId - Optional item ID (trip ID, expense ID, etc.)
   * @param useBase64Fallback - If true, use base64 instead of Storage
   */
  async uploadImage(
    localUri: string,
    userId: string,
    type: 'cover' | 'receipt' | 'profile',
    itemId?: string,
    useBase64Fallback: boolean = false
  ): Promise<UploadImageResult> {
    try {
      // Skip if already a URL (already uploaded to cloud)
      if (localUri.startsWith('http://') || localUri.startsWith('https://') || localUri.startsWith('data:')) {
        console.log(`[Storage] Image already uploaded to cloud: ${localUri.substring(0, 50)}...`);
        return {
          url: localUri,
          path: localUri.startsWith('data:') ? 'firestore' : '', // Indicate storage type
        };
      }

      // Use base64 storage by default (since Storage requires Blaze plan)
      // Only use Firebase Storage if explicitly enabled and not forcing base64
      if (FORCE_BASE64_STORAGE || useBase64Fallback) {
        console.log(`[Storage] Using base64 storage (Firestore) - Firebase Storage requires Blaze plan upgrade`);
        return await this.uploadImageAsBase64(localUri, userId, type, itemId);
      }

      console.log(`[Storage] Starting upload for ${type} image to Firebase Storage: ${localUri.substring(0, 50)}...`);

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // Compress and resize image if needed
      const processedUri = await this.compressImageIfNeeded(localUri, type);
      const finalFileInfo = await FileSystem.getInfoAsync(processedUri);
      const fileSize = finalFileInfo.size || 0;

      console.log(`[Storage] Image size: ${(fileSize / 1024).toFixed(2)}KB, uploading to Firebase Storage...`);

      // Create storage path
      const fileName = `${type}_${itemId || Date.now()}_${Date.now()}.jpg`;
      const storagePath = `users/${userId}/${type}s/${fileName}`;
      const storageRef = ref(storage, storagePath);

      let downloadURL: string;

      if (Platform.OS === 'web') {
        // Web: Use fetch to get blob
        const response = await fetch(processedUri);
        const blob = await response.blob();
        console.log(`[Storage] Uploading ${(blob.size / 1024).toFixed(2)}KB to Firebase Storage...`);
        const snapshot: UploadResult = await uploadBytes(storageRef, blob);
        downloadURL = await getDownloadURL(snapshot.ref);
        console.log(`[Storage] ✅ Upload successful! Cloud URL: ${downloadURL.substring(0, 50)}...`);
      } else {
        // React Native: Read file and upload
        try {
          // Try fetch first (works for file:// URIs)
          const response = await fetch(processedUri);
          if (response.ok) {
            const blob = await response.blob();
            console.log(`[Storage] Uploading ${(blob.size / 1024).toFixed(2)}KB to Firebase Storage...`);
            const snapshot: UploadResult = await uploadBytes(storageRef, blob);
            downloadURL = await getDownloadURL(snapshot.ref);
            console.log(`[Storage] ✅ Upload successful! Cloud URL: ${downloadURL.substring(0, 50)}...`);
          } else {
            throw new Error('Failed to fetch file');
          }
        } catch (fetchError) {
          // Fallback: Use uploadBytesResumable with Uint8Array directly
          console.log(`[Storage] Using uploadBytesResumable method...`);
          const base64 = await FileSystem.readAsStringAsync(processedUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Convert base64 to Uint8Array
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          console.log(`[Storage] Uploading ${(bytes.length / 1024).toFixed(2)}KB to Firebase Storage...`);

          // Try uploadBytesResumable with Uint8Array (not ArrayBuffer)
          // If that fails, we'll try a different approach
          try {
            const uploadTask = uploadBytesResumable(storageRef, bytes);

            // Wait for upload to complete
            await new Promise<void>((resolve, reject) => {
              uploadTask.on(
                'state_changed',
                (snapshot) => {
                  // Progress tracking (optional)
                  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                  if (progress % 25 === 0) {
                    console.log(`[Storage] Upload progress: ${progress.toFixed(0)}%`);
                  }
                },
                (error) => {
                  reject(error);
                },
                async () => {
                  try {
                    downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log(`[Storage] ✅ Upload successful! Cloud URL: ${downloadURL.substring(0, 50)}...`);
                    resolve();
                  } catch (urlError) {
                    reject(urlError);
                  }
                }
              );
            });
          } catch (resumableError) {
            // Last resort: Try uploadBytes with Uint8Array
            console.log(`[Storage] uploadBytesResumable failed, trying uploadBytes...`);
            const snapshot: UploadResult = await uploadBytes(storageRef, bytes);
            downloadURL = await getDownloadURL(snapshot.ref);
            console.log(`[Storage] ✅ Upload successful! Cloud URL: ${downloadURL.substring(0, 50)}...`);
          }
        }
      }

      // Clean up processed image if it's different from original
      if (processedUri !== localUri) {
        try {
          await FileSystem.deleteAsync(processedUri, { idempotent: true });
        } catch (cleanupError) {
          console.warn('[Storage] Failed to cleanup processed image:', cleanupError);
        }
      }

      return {
        url: downloadURL, // This is a Firebase Storage URL (https://firebasestorage.googleapis.com/...)
        path: storagePath,
      };
    } catch (error: any) {
      console.error('[Storage] ❌ Error uploading image to Firebase Storage:', error);

      // Check if error is due to Storage not being available (requires Blaze plan)
      const isStorageUnavailable = error.message?.includes('permission') ||
        error.message?.includes('billing') ||
        error.code === 'storage/unauthorized' ||
        error.code === 'storage/quota-exceeded';

      if (isStorageUnavailable) {
        // Mark Storage as unavailable for future requests
        isStorageAvailable = false;
        console.warn('[Storage] Firebase Storage unavailable. Falling back to base64 storage in Firestore...');
        // Fallback to base64 storage
        try {
          return await this.uploadImageAsBase64(localUri, userId, type, itemId);
        } catch (fallbackError) {
          throw new Error('Failed to upload image. Firebase Storage requires Blaze plan, and image is too large for Firestore.');
        }
      }

      const errorMessage = error.message || 'Failed to upload image to cloud';
      throw new Error(errorMessage);
    }
  },

  /**
   * Upload multiple images
   */
  async uploadImages(
    localUris: string[],
    userId: string,
    type: 'cover' | 'receipt' | 'profile',
    itemId?: string
  ): Promise<UploadImageResult[]> {
    if (!localUris || localUris.length === 0) {
      return [];
    }

    // Filter out invalid URIs
    const validUris = localUris.filter(uri => uri && typeof uri === 'string');

    if (validUris.length === 0) {
      return [];
    }

    const uploadPromises = validUris.map((uri, index) =>
      this.uploadImage(uri, userId, type, `${itemId}_${index}`)
    );
    return Promise.all(uploadPromises);
  },

  /**
   * Delete image from Firebase Storage
   */
  async deleteImage(storagePath: string): Promise<void> {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
      // Don't throw - image might not exist
    }
  },

  /**
   * Convert local image URIs to Firebase Storage URLs (or base64 if Storage unavailable)
   * Uploads images and returns URLs
   */
  async convertLocalImagesToUrls(
    localUris: string[] | undefined,
    userId: string,
    type: 'cover' | 'receipt' | 'profile',
    itemId?: string
  ): Promise<string[]> {
    try {
      // Handle undefined or null
      if (!localUris || !Array.isArray(localUris)) {
        return [];
      }

      // Filter out already uploaded URLs (http/https/data URLs)
      const localImages = localUris.filter(uri =>
        uri && !uri.startsWith('http') && !uri.startsWith('https') && !uri.startsWith('data:')
      );
      const existingUrls = localUris.filter(uri =>
        uri && (uri.startsWith('http') || uri.startsWith('https') || uri.startsWith('data:'))
      );

      if (localImages.length === 0) {
        return existingUrls;
      }

      // Upload local images (will automatically fallback to base64 if Storage unavailable)
      const newUrls: string[] = [];

      for (const uri of localImages) {
        try {
          // Try Firebase Storage first
          const result = await this.uploadImage(uri, userId, type, itemId, false);
          newUrls.push(result.url);
        } catch (error) {
          // If Storage fails, try base64 fallback
          try {
            console.warn(`[Storage] Firebase Storage failed, using base64 fallback for image...`);
            const base64Result = await this.uploadImage(uri, userId, type, itemId, true);
            newUrls.push(base64Result.url);
          } catch (fallbackError) {
            console.error(`[Storage] Both Storage and base64 fallback failed:`, fallbackError);
            // Skip this image
          }
        }
      }

      // Combine existing URLs with new ones
      return [...existingUrls, ...newUrls];
    } catch (error) {
      console.error('[Storage] Error converting images to URLs:', error);
      // Return original URIs if upload fails, or empty array if undefined
      return Array.isArray(localUris) ? localUris : [];
    }
  },
};

