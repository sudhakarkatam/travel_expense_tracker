import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Upload, Scan, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { receiptScanningService } from '@/services/receiptScanning';
import { useApp } from '@/contexts/AppContext';

export default function ScanReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId?: string }>();
  const { user, trackReceiptScan, canUseProFeature } = useApp();
  
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera access');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const handleScan = async () => {
    if (!image) {
      Alert.alert('Error', 'Please select or take a photo first');
      return;
    }

    if (!canUseProFeature('receiptScan')) {
      const usage = user?.proUsage;
      const scansLeft = usage ? usage.receiptScansLimit - usage.receiptScans : 0;
      
      Alert.alert(
        user?.isPro ? 'Scan Limit' : 'Pro Feature',
        user?.isPro 
          ? 'You have reached your scan limit for this month.'
          : `You have ${scansLeft} free scans left this month. Upgrade to Pro for unlimited scans.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/premium') },
        ]
      );
      return;
    }

    const canUse = await trackReceiptScan();
    if (!canUse) {
      Alert.alert('Scan Limit', 'You have reached your scan limit. Please upgrade to Pro.');
      return;
    }

    setScanning(true);
    
    try {
      let base64Image = '';
      
      if (Platform.OS === 'web') {
        const response = await fetch(image);
        const blob = await response.blob();
        const reader = new FileReader();
        
        base64Image = await new Promise((resolve, reject) => {
          reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data.split(',')[1] || base64data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        const response = await fetch(image);
        const blob = await response.blob();
        const reader = new FileReader();
        
        base64Image = await new Promise((resolve, reject) => {
          reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data.split(',')[1] || base64data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      const scannedData = await receiptScanningService.scanReceipt(base64Image);

      Alert.alert(
        'Receipt Scanned!',
        `Amount: ${scannedData.currency} ${scannedData.amount.toFixed(2)}\n` +
        (scannedData.merchant ? `Merchant: ${scannedData.merchant}\n` : '') +
        (scannedData.category ? `Category: ${scannedData.category}` : ''),
        [
          {
            text: 'Add Expense',
            onPress: () => {
              const queryParams = new URLSearchParams({
                amount: scannedData.amount.toString(),
                currency: scannedData.currency,
                ...(params.tripId && { tripId: params.tripId }),
                ...(scannedData.category && { category: scannedData.category }),
                ...(scannedData.merchant && { description: scannedData.merchant }),
                ...(scannedData.date && { date: scannedData.date }),
                photoUri: image,
              }).toString();
              
              router.push(`/add-expense?${queryParams}`);
            },
          },
          { text: 'Scan Another', onPress: () => setImage(null) },
        ]
      );
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Scan Failed', error instanceof Error ? error.message : 'Could not scan receipt');
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Scan Receipt', headerShown: true }} />

      {!image ? (
        <View style={styles.content}>
          <View style={styles.header}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <Scan size={64} color="#FFFFFF" />
              <Text style={styles.headerTitle}>Scan Receipt</Text>
              <Text style={styles.headerSubtitle}>
                AI-powered receipt scanning to extract expenses automatically
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={takePhoto}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconContainer}>
                <Camera size={32} color="#6366F1" />
              </View>
              <Text style={styles.actionTitle}>Take Photo</Text>
              <Text style={styles.actionSubtitle}>Use your camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconContainer}>
                <Upload size={32} color="#8B5CF6" />
              </View>
              <Text style={styles.actionTitle}>Upload Image</Text>
              <Text style={styles.actionSubtitle}>From gallery</Text>
            </TouchableOpacity>
          </View>

          {user?.proUsage && (
            <View style={styles.proNotice}>
              <Text style={styles.proNoticeText}>
                {user.isPro 
                  ? '✨ Unlimited receipt scans available'
                  : `📸 ${user.proUsage.receiptScansLimit - user.proUsage.receiptScans} free scans remaining this month`
                }
              </Text>
              {!user.isPro && (
                <TouchableOpacity 
                  style={styles.upgradeLink}
                  onPress={() => router.push('/premium')}
                >
                  <Text style={styles.upgradeLinkText}>Upgrade to Pro for unlimited scans →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
            
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => setImage(null)}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScan}
              disabled={scanning}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.scanButtonGradient}
              >
                {scanning ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Scan size={20} color="#FFFFFF" />
                    <Text style={styles.scanButtonText}>Scan Receipt</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => setImage(null)}
            >
              <Text style={styles.retakeButtonText}>Choose Different Image</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  header: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
  },
  headerGradient: {
    padding: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D1FAE5',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    paddingHorizontal: 20,
    gap: 16,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  proNotice: {
    margin: 20,
    marginTop: 40,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  proNoticeText: {
    fontSize: 14,
    color: '#1E40AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  upgradeLink: {
    marginTop: 8,
  },
  upgradeLinkText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6366F1',
    textAlign: 'center',
  },
  previewContainer: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewActions: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  scanButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  scanButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  retakeButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#64748B',
  },
});
