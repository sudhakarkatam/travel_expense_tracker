import Tesseract from 'tesseract.js';

export interface OCRResult {
  amount?: number;
  description?: string;
  merchant?: string;
  date?: string;
  confidence: number;
  rawText: string;
}

export interface ParsedReceipt {
  amount: number;
  description: string;
  merchant?: string;
  date?: string;
  confidence: number;
}

export class OCRService {
  private static instance: OCRService;
  private worker: Tesseract.Worker | null = null;

  static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  async initializeWorker(): Promise<void> {
    if (!this.worker) {
      this.worker = await Tesseract.createWorker('eng');
    }
  }

  async scanReceipt(imageUri: string): Promise<OCRResult> {
    try {
      await this.initializeWorker();
      
      if (!this.worker) {
        throw new Error('OCR worker not initialized');
      }

      const { data } = await this.worker.recognize(imageUri);
      const rawText = data.text;
      const confidence = data.confidence;

      // Parse the extracted text
      const parsed = this.parseReceiptText(rawText);

      return {
        amount: parsed.amount,
        description: parsed.description,
        merchant: parsed.merchant,
        date: parsed.date,
        confidence,
        rawText,
      };
    } catch (error) {
      console.error('OCR scanning error:', error);
      throw new Error('Failed to scan receipt');
    }
  }

  private parseReceiptText(text: string): ParsedReceipt {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let amount: number | undefined;
    let description = '';
    let merchant = '';
    let date = '';

    // Extract merchant name (usually first few lines)
    if (lines.length > 0) {
      merchant = lines[0];
    }

    // Extract amount (look for currency patterns)
    const amountPatterns = [
      /total[:\s]*\$?(\d+\.?\d*)/i,
      /amount[:\s]*\$?(\d+\.?\d*)/i,
      /\$(\d+\.?\d*)/g,
      /(\d+\.?\d*)\s*(?:USD|usd|dollars?)/i,
    ];

    for (const pattern of amountPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const extractedAmount = parseFloat(matches[1] || matches[0]);
        if (extractedAmount > 0 && extractedAmount < 10000) { // Reasonable amount range
          amount = extractedAmount;
          break;
        }
      }
    }

    // If no specific amount found, look for the largest number
    if (!amount) {
      const numbers = text.match(/\d+\.?\d*/g);
      if (numbers) {
        const amounts = numbers.map(n => parseFloat(n)).filter(n => n > 0 && n < 10000);
        if (amounts.length > 0) {
          amount = Math.max(...amounts);
        }
      }
    }

    // Extract description (look for common receipt items)
    const itemPatterns = [
      /item[:\s]*(.+)/i,
      /product[:\s]*(.+)/i,
      /description[:\s]*(.+)/i,
    ];

    for (const pattern of itemPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        description = match[1].trim();
        break;
      }
    }

    // If no specific description, use merchant or a generic description
    if (!description) {
      description = merchant || 'Receipt Item';
    }

    // Extract date (look for date patterns)
    const datePatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
      /(\w+\s+\d{1,2},?\s+\d{4})/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        date = match[1];
        break;
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
