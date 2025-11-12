import Tesseract from 'tesseract.js';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface OCRResult {
  amount?: number;
  description?: string;
  merchant?: string;
  date?: string;
  tax?: number;
  items?: Array<{ name: string; price: number }>;
  confidence: number;
  rawText: string;
  provider?: 'tesseract' | 'google-vision' | 'aws-textract';
}

export interface ParsedReceipt {
  amount: number;
  description: string;
  merchant?: string;
  date?: string;
  tax?: number;
  items?: Array<{ name: string; price: number }>;
  confidence: number;
}

export type OCRProvider = 'tesseract' | 'google-vision' | 'aws-textract' | 'auto';

export class OCRService {
  private static instance: OCRService;
  private worker: Tesseract.Worker | null = null;
  private preferredProvider: OCRProvider = 'auto';

  static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  setProvider(provider: OCRProvider): void {
    this.preferredProvider = provider;
  }

  async initializeWorker(): Promise<void> {
    if (!this.worker) {
      this.worker = await Tesseract.createWorker('eng');
      // Configure for better accuracy
      await this.worker.setParameters({
        tessedit_pageseg_mode: '6', // Assume uniform block of text
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$€£₹¥/-: ',
      });
    }
  }

  // Preprocess image for better OCR accuracy
  private async preprocessImage(imageUri: string): Promise<string> {
    // In a real implementation, you would:
    // 1. Convert to grayscale
    // 2. Apply contrast enhancement
    // 3. Apply noise reduction
    // 4. Deskew/rotate if needed
    // For now, return original URI (can be enhanced with image manipulation library)
    return imageUri;
  }

  async scanReceipt(imageUri: string, provider?: OCRProvider): Promise<OCRResult> {
    const useProvider = provider || this.preferredProvider;

    try {
      // Try cloud providers first if configured
      if (useProvider === 'google-vision' || (useProvider === 'auto' && this.hasGoogleVisionConfig())) {
        try {
          return await this.scanWithGoogleVision(imageUri);
        } catch (error) {
          console.log('Google Vision failed, falling back to Tesseract:', error);
          // Fall through to Tesseract
        }
      }

      if (useProvider === 'aws-textract' || (useProvider === 'auto' && this.hasAWSTextractConfig())) {
        try {
          return await this.scanWithAWSTextract(imageUri);
        } catch (error) {
          console.log('AWS Textract failed, falling back to Tesseract:', error);
          // Fall through to Tesseract
        }
      }

      // Use Tesseract as default or fallback
      return await this.scanWithTesseract(imageUri);
    } catch (error) {
      console.error('OCR scanning error:', error);
      throw new Error('Failed to scan receipt. Please try again or enter manually.');
    }
  }

  private async scanWithTesseract(imageUri: string): Promise<OCRResult> {
    await this.initializeWorker();
    
    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    // Preprocess image
    const processedUri = await this.preprocessImage(imageUri);

    const { data } = await this.worker.recognize(processedUri);
    const rawText = data.text;
    const confidence = data.confidence;

    // Parse the extracted text with improved parsing
    const parsed = this.parseReceiptText(rawText);

    return {
      amount: parsed.amount,
      description: parsed.description,
      merchant: parsed.merchant,
      date: parsed.date,
      tax: parsed.tax,
      items: parsed.items,
      confidence,
      rawText,
      provider: 'tesseract',
    };
  }

  private async scanWithGoogleVision(imageUri: string): Promise<OCRResult> {
    // Placeholder for Google Vision API integration
    // Requires GOOGLE_VISION_API_KEY environment variable
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      throw new Error('Google Vision API key not configured');
    }

    // Convert image to base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'Google Vision API error');
    }

    const textAnnotations = data.responses[0]?.textAnnotations || [];
    const rawText = textAnnotations[0]?.description || '';

    const parsed = this.parseReceiptText(rawText);

    return {
      ...parsed,
      rawText,
      provider: 'google-vision',
    };
  }

  private async scanWithAWSTextract(imageUri: string): Promise<OCRResult> {
    // Placeholder for AWS Textract integration
    // Requires AWS credentials configuration
    throw new Error('AWS Textract integration not yet implemented. Please configure AWS credentials.');
  }

  private hasGoogleVisionConfig(): boolean {
    return !!process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
  }

  private hasAWSTextractConfig(): boolean {
    return !!(process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID && process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY);
  }

  private parseReceiptText(text: string): ParsedReceipt {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let amount: number | undefined;
    let description = '';
    let merchant = '';
    let date = '';
    let tax: number | undefined;
    const items: Array<{ name: string; price: number }> = [];

    // Extract merchant name (usually first few lines, skip empty/short lines)
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      // Merchant name is usually not a number and not too long
      if (line && !/^\d+\.?\d*$/.test(line) && line.length < 50 && !line.toLowerCase().includes('total')) {
        merchant = line;
        break;
      }
    }

    // Extract items (lines with item names and prices)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for patterns like "Item Name $10.99" or "Item Name 10.99"
      const itemMatch = line.match(/^(.+?)\s+[\$€£₹¥]?(\d+\.?\d{0,2})$/);
      if (itemMatch && parseFloat(itemMatch[2]) > 0 && parseFloat(itemMatch[2]) < 10000) {
        items.push({
          name: itemMatch[1].trim(),
          price: parseFloat(itemMatch[2]),
        });
      }
    }

    // Extract tax amount
    const taxPatterns = [
      /tax[:\s]*[\$€£₹¥]?(\d+\.?\d{0,2})/i,
      /vat[:\s]*[\$€£₹¥]?(\d+\.?\d{0,2})/i,
      /gst[:\s]*[\$€£₹¥]?(\d+\.?\d{0,2})/i,
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        tax = parseFloat(match[1]);
        break;
      }
    }

    // Extract amount (look for currency patterns with improved regex)
    const amountPatterns = [
      /(?:total|amount|sum|balance|due)[:\s]*[\$€£₹¥]?\s*(\d+\.?\d{0,2})/i,
      /(?:total|amount|sum|balance|due)[:\s]*(\d+\.?\d{0,2})\s*[\$€£₹¥]?/i,
      /[\$€£₹¥]\s*(\d+\.?\d{0,2})\s*(?:total|amount|sum)/i,
      /[\$€£₹¥](\d+\.?\d{0,2})/g,
    ];

    // Try to find amount near the end of the receipt (where totals usually are)
    const lastLines = lines.slice(-5).join(' ');
    for (const pattern of amountPatterns) {
      const matches = lastLines.match(pattern);
      if (matches) {
        const extractedAmount = parseFloat(matches[1] || matches[0].replace(/[\$€£₹¥\s]/g, ''));
        if (extractedAmount > 0 && extractedAmount < 100000) { // Reasonable amount range
          amount = extractedAmount;
          break;
        }
      }
    }

    // If no specific amount found, look for the largest number in last few lines
    if (!amount) {
      const numbers = lastLines.match(/\d+\.?\d{0,2}/g);
      if (numbers) {
        const amounts = numbers.map(n => parseFloat(n)).filter(n => n > 0 && n < 100000);
        if (amounts.length > 0) {
          amount = Math.max(...amounts);
        }
      }
    }

    // Extract description
    if (items.length > 0) {
      // Use first item as description, or combine items
      description = items.length === 1 
        ? items[0].name 
        : `${items.length} items from ${merchant || 'receipt'}`;
    } else {
      // Look for common receipt item patterns
      const itemPatterns = [
        /item[:\s]*(.+?)(?:\n|$)/i,
        /product[:\s]*(.+?)(?:\n|$)/i,
        /description[:\s]*(.+?)(?:\n|$)/i,
      ];

      for (const pattern of itemPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          description = match[1].trim().split('\n')[0];
          break;
        }
      }

      // If no specific description, use merchant or a generic description
      if (!description) {
        description = merchant || 'Receipt Item';
      }
    }

    // Extract date (improved date parsing)
    const datePatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
      /(\w+\s+\d{1,2},?\s+\d{4})/,
      /(?:date|dated)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1];
        // Try to parse and format the date
        try {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().split('T')[0];
            break;
          }
        } catch (e) {
          date = dateStr;
        }
      }
    }

    // If no date found, use current date
    if (!date) {
      date = new Date().toISOString().split('T')[0];
    }

    return {
      amount: amount || 0,
      description: description || 'Receipt Item',
      merchant: merchant || '',
      date: date || new Date().toISOString().split('T')[0],
      tax,
      items: items.length > 0 ? items : undefined,
      confidence: 0.8, // Default confidence for parsed data
    };
  }

  async scanMultipleReceipts(imageUris: string[]): Promise<OCRResult[]> {
    const results: OCRResult[] = [];
    
    for (const imageUri of imageUris) {
      try {
        const result = await this.scanReceipt(imageUri);
        results.push(result);
      } catch (error) {
        console.error(`Failed to scan image: ${imageUri}`, error);
        // Add a failed result
        results.push({
          confidence: 0,
          rawText: '',
        });
      }
    }

    return results;
  }

  async terminateWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  // Helper method to validate OCR results
  validateOCRResult(result: OCRResult): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!result.amount || result.amount <= 0) {
      errors.push('No valid amount found');
    }

    if (!result.description || result.description.trim().length === 0) {
      errors.push('No description found');
    }

    if (result.confidence < 30) {
      errors.push('Low confidence in OCR results');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Helper method to suggest category based on merchant/description
  suggestCategory(result: OCRResult): string {
    const text = `${result.merchant || ''} ${result.description || ''}`.toLowerCase();

    if (text.includes('restaurant') || text.includes('food') || text.includes('cafe') || text.includes('pizza')) {
      return 'food';
    }
    if (text.includes('gas') || text.includes('fuel') || text.includes('taxi') || text.includes('uber')) {
      return 'transport';
    }
    if (text.includes('hotel') || text.includes('accommodation') || text.includes('airbnb')) {
      return 'accommodation';
    }
    if (text.includes('movie') || text.includes('entertainment') || text.includes('theater')) {
      return 'entertainment';
    }
    if (text.includes('shop') || text.includes('store') || text.includes('mall')) {
      return 'shopping';
    }
    if (text.includes('medical') || text.includes('pharmacy') || text.includes('health')) {
      return 'health';
    }

    return 'other';
  }
}

// Export singleton instance
export const ocrService = OCRService.getInstance();

