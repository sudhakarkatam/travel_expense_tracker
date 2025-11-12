import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ocrService, OCRResult } from '@/services/ocrService';
import { pickImage, takePhoto } from '@/utils/imageStorage';

export default function ScanReceiptScreen({ navigation }: any) {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan Receipt</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {!capturedImage ? (
          <View style={styles.placeholder}>
            <Ionicons name="camera" size={64} color="#ccc" />
            <Text style={styles.placeholderTitle}>Receipt Scanner</Text>
            <Text style={styles.placeholderText}>
              Take a photo of your receipt to automatically extract expense details
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.scanButton}
                onPress={handleTakePhoto}
                disabled={isScanning}
              >
                <Ionicons name="camera" size={20} color="white" />
                <Text style={styles.scanButtonText}>
                  {isScanning ? 'Scanning...' : 'Take Photo'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.pickButton}
                onPress={handlePickImage}
                disabled={isScanning}
              >
                <Ionicons name="image" size={20} color="#8b5cf6" />
                <Text style={styles.pickButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: capturedImage }} style={styles.receiptImage} />
              <TouchableOpacity style={styles.retakeButton} onPress={handleRetakePhoto}>
                <Ionicons name="refresh" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {scanResult && (
              <View style={styles.ocrResults}>
                <Text style={styles.resultsTitle}>Extracted Information</Text>
                
                <View style={styles.confidenceContainer}>
                  <Text style={styles.confidenceText}>
                    Confidence: {scanResult.confidence.toFixed(1)}%
                  </Text>
                  <View style={[
                    styles.confidenceBar,
                    { width: `${scanResult.confidence}%` }
                  ]} />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Amount *</Text>
                  <TextInput
                    style={styles.input}
                    value={editingData.amount}
                    onChangeText={(value) => setEditingData(prev => ({ ...prev, amount: value }))}
                    placeholder="$ 0.00"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description *</Text>
                  <TextInput
                    style={styles.input}
                    value={editingData.description}
                    onChangeText={(value) => setEditingData(prev => ({ ...prev, description: value }))}
                    placeholder="What did you buy?"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Merchant</Text>
                  <TextInput
                    style={styles.input}
                    value={editingData.merchant}
                    onChangeText={(value) => setEditingData(prev => ({ ...prev, merchant: value }))}
                    placeholder="Store name"
                  />
                </View>

                {scanResult.tax && scanResult.tax > 0 && (
                  <View style={styles.infoCard}>
                    <Ionicons name="receipt-outline" size={16} color="#8b5cf6" />
                    <Text style={styles.infoText}>Tax: ${scanResult.tax.toFixed(2)}</Text>
                  </View>
                )}

                {scanResult.items && scanResult.items.length > 0 && (
                  <View style={styles.itemsContainer}>
                    <Text style={styles.itemsTitle}>Items Found ({scanResult.items.length}):</Text>
                    {scanResult.items.slice(0, 3).map((item, index) => (
                      <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                      </View>
                    ))}
                    {scanResult.items.length > 3 && (
                      <Text style={styles.moreItemsText}>+{scanResult.items.length - 3} more items</Text>
                    )}
                  </View>
                )}

                {scanResult.provider && (
                  <View style={styles.providerBadge}>
                    <Ionicons 
                      name={scanResult.provider === 'google-vision' ? 'cloud' : 'document-text'} 
                      size={12} 
                      color="#8b5cf6" 
                    />
                    <Text style={styles.providerText}>
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
                      <Text style={styles.rawTextTitle}>Raw OCR Text</Text>
                      <Ionicons 
                        name={showRawText ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#8b5cf6" 
                      />
                    </TouchableOpacity>
                    {showRawText && (
                      <ScrollView style={styles.rawTextView}>
                        <Text style={styles.rawText}>{scanResult.rawText}</Text>
                      </ScrollView>
                    )}
                  </View>
                )}
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={handleCreateExpense}
                disabled={!editingData.amount || !editingData.description}
              >
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.createButtonText}>Create Expense</Text>
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  pickButtonText: {
    color: '#8b5cf6',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  ocrResults: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  confidenceContainer: {
    marginBottom: 16,
  },
  confidenceText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  itemsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  itemPrice: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  moreItemsText: {
    fontSize: 12,
    color: '#8b5cf6',
    marginTop: 4,
    fontStyle: 'italic',
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    gap: 6,
  },
  providerText: {
    fontSize: 12,
    color: '#8b5cf6',
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
    color: '#333',
  },
  rawTextView: {
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  rawText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  actionButtons: {
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});