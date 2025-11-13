import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Surface } from 'react-native-paper';
import { ocrService, OCRResult } from '@/services/ocrService';
import { pickImage, takePhoto } from '@/utils/imageStorage';

export default function ScanReceiptScreen({ navigation }: any) {
  const theme = useTheme();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<OCRResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [editingData, setEditingData] = useState({
    amount: '',
    description: '',
    merchant: '',
  });

  const handleTakePhoto = async () => {
    try {
      setIsScanning(true);
      const imageUri = await takePhoto();
      if (imageUri) {
        setCapturedImage(imageUri);
        await processReceipt(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handlePickImage = async () => {
    try {
      setIsScanning(true);
      const imageUri = await pickImage('receipt');
      if (imageUri) {
        setCapturedImage(imageUri);
        await processReceipt(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const processReceipt = async (imageUri: string) => {
    try {
      setIsScanning(true);
      const result = await ocrService.scanReceipt(imageUri);
      setScanResult(result);
      
      // Pre-fill editing data
      setEditingData({
        amount: result.amount?.toString() || '',
        description: result.description || '',
        merchant: result.merchant || '',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to process receipt. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCreateExpense = () => {
    if (!editingData.amount || !editingData.description) {
      Alert.alert('Error', 'Please fill in amount and description.');
      return;
    }

    // Navigate to AddExpense with pre-filled data
    navigation.navigate('AddExpense', {
      prefillData: {
        amount: parseFloat(editingData.amount),
        description: editingData.description,
        merchant: editingData.merchant,
        receiptImage: capturedImage,
      },
    });
  };

  const handleRetakePhoto = () => {
    setCapturedImage(null);
    setScanResult(null);
    setEditingData({ amount: '', description: '', merchant: '' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]} elevation={1}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Scan Receipt</Text>
        <View style={{ width: 24 }} />
      </Surface>

      <ScrollView style={styles.content}>
        {!capturedImage ? (
          <View style={styles.placeholder}>
            <Ionicons name="camera" size={64} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.placeholderTitle, { color: theme.colors.onSurface }]}>Receipt Scanner</Text>
            <Text style={[styles.placeholderText, { color: theme.colors.onSurfaceVariant }]}>
              Take a photo of your receipt to automatically extract expense details
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.scanButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleTakePhoto}
                disabled={isScanning}
              >
                <Ionicons name="camera" size={20} color={theme.colors.onPrimary} />
                <Text style={[styles.scanButtonText, { color: theme.colors.onPrimary }]}>
                  {isScanning ? 'Scanning...' : 'Take Photo'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.pickButton, { backgroundColor: theme.colors.surfaceVariant }]}
                onPress={handlePickImage}
                disabled={isScanning}
              >
                <Ionicons name="image" size={20} color={theme.colors.primary} />
                <Text style={[styles.pickButtonText, { color: theme.colors.primary }]}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: capturedImage }} style={styles.receiptImage} />
              <TouchableOpacity style={[styles.retakeButton, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]} onPress={handleRetakePhoto}>
                <Ionicons name="refresh" size={20} color={theme.colors.onPrimary} />
              </TouchableOpacity>
            </View>

            {scanResult && (
              <Surface style={[styles.ocrResults, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
                <Text style={[styles.resultsTitle, { color: theme.colors.onSurface }]}>Extracted Information</Text>
                
                <View style={styles.confidenceContainer}>
                  <Text style={[styles.confidenceText, { color: theme.colors.onSurfaceVariant }]}>
                    Confidence: {scanResult.confidence.toFixed(1)}%
                  </Text>
                  <View style={[
                    styles.confidenceBar,
                    { width: `${scanResult.confidence}%`, backgroundColor: theme.colors.primary }
                  ]} />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.onSurface }]}>Amount *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, color: theme.colors.onSurface }]}
                    value={editingData.amount}
                    onChangeText={(value) => setEditingData(prev => ({ ...prev, amount: value }))}
                    placeholder="$ 0.00"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.onSurface }]}>Description *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, color: theme.colors.onSurface }]}
                    value={editingData.description}
                    onChangeText={(value) => setEditingData(prev => ({ ...prev, description: value }))}
                    placeholder="What did you buy?"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.onSurface }]}>Merchant</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, color: theme.colors.onSurface }]}
                    value={editingData.merchant}
                    onChangeText={(value) => setEditingData(prev => ({ ...prev, merchant: value }))}
                    placeholder="Store name"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                  />
                </View>

                {scanResult.tax && scanResult.tax > 0 && (
                  <View style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Ionicons name="receipt-outline" size={16} color={theme.colors.primary} />
                    <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>Tax: ${scanResult.tax.toFixed(2)}</Text>
                  </View>
                )}

                {scanResult.items && scanResult.items.length > 0 && (
                  <View style={[styles.itemsContainer, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.itemsTitle, { color: theme.colors.onSurface }]}>Items Found ({scanResult.items.length}):</Text>
                    {scanResult.items.slice(0, 3).map((item, index) => (
                      <View key={index} style={styles.itemRow}>
                        <Text style={[styles.itemName, { color: theme.colors.onSurfaceVariant }]}>{item.name}</Text>
                        <Text style={[styles.itemPrice, { color: theme.colors.onSurface }]}>${item.price.toFixed(2)}</Text>
                      </View>
                    ))}
                    {scanResult.items.length > 3 && (
                      <Text style={[styles.moreItemsText, { color: theme.colors.primary }]}>+{scanResult.items.length - 3} more items</Text>
                    )}
                  </View>
                )}

                {scanResult.provider && (
                  <View style={[styles.providerBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Ionicons 
                      name={scanResult.provider === 'google-vision' ? 'cloud' : 'document-text'} 
                      size={12} 
                      color={theme.colors.primary} 
                    />
                    <Text style={[styles.providerText, { color: theme.colors.primary }]}>
                      {scanResult.provider === 'google-vision' ? 'Google Vision' : 
                       scanResult.provider === 'aws-textract' ? 'AWS Textract' : 'Tesseract OCR'}
                    </Text>
                  </View>
                )}

                {scanResult.rawText && (
                  <View style={styles.rawTextContainer}>
                    <TouchableOpacity 
                      style={styles.rawTextToggle}
                      onPress={() => setShowRawText(!showRawText)}
                    >
                      <Text style={[styles.rawTextTitle, { color: theme.colors.onSurface }]}>Raw OCR Text</Text>
                      <Ionicons 
                        name={showRawText ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={theme.colors.primary} 
                      />
                    </TouchableOpacity>
                    {showRawText && (
                      <ScrollView style={[styles.rawTextView, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                        <Text style={[styles.rawText, { color: theme.colors.onSurfaceVariant }]}>{scanResult.rawText}</Text>
                      </ScrollView>
                    )}
                  </View>
                )}
              </Surface>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.createButton, { backgroundColor: theme.colors.primary }, (!editingData.amount || !editingData.description) && { opacity: 0.5 }]}
                onPress={handleCreateExpense}
                disabled={!editingData.amount || !editingData.description}
              >
                <Ionicons name="checkmark" size={20} color={theme.colors.onPrimary} />
                <Text style={[styles.createButtonText, { color: theme.colors.onPrimary }]}>Create Expense</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  buttonContainer: {
    gap: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  pickButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  retakeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 20,
    padding: 8,
  },
  ocrResults: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  confidenceContainer: {
    marginBottom: 16,
  },
  confidenceText: {
    fontSize: 14,
    marginBottom: 8,
  },
  confidenceBar: {
    height: 4,
    borderRadius: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemsContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 13,
    flex: 1,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
  },
  moreItemsText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    gap: 6,
  },
  providerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rawTextContainer: {
    marginTop: 16,
  },
  rawTextToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rawTextTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rawTextView: {
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  rawText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  actionButtons: {
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});