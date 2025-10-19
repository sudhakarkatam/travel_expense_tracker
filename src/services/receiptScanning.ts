import { generateText } from '@rork/toolkit-sdk';

export interface ScannedReceipt {
  amount: number;
  currency: string;
  date?: string;
  merchant?: string;
  items?: string[];
  category?: string;
}

export const receiptScanningService = {
  async scanReceipt(imageBase64: string): Promise<ScannedReceipt> {
    console.log('Scanning receipt with AI...');
    
    try {
      const prompt = `Analyze this receipt image and extract the following information in JSON format:
{
  "amount": <total amount as number>,
  "currency": "<currency code like USD, EUR, etc>",
  "date": "<date in YYYY-MM-DD format if visible>",
  "merchant": "<merchant/store name if visible>",
  "items": ["<list of items if visible>"],
  "category": "<suggested category: food, transport, accommodation, entertainment, shopping, health, or other>"
}

If you cannot determine a value, use null. Focus on accuracy. Only return the JSON, nothing else.`;

      const result = await generateText({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image', image: imageBase64 },
            ],
          },
        ],
      });

      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse receipt data');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const scannedData: ScannedReceipt = {
        amount: parsed.amount || 0,
        currency: parsed.currency || 'USD',
        date: parsed.date || undefined,
        merchant: parsed.merchant || undefined,
        items: parsed.items || undefined,
        category: parsed.category || undefined,
      };

      console.log('Receipt scanned successfully:', scannedData);
      return scannedData;
    } catch (error) {
      console.error('Error scanning receipt:', error);
      throw new Error('Failed to scan receipt. Please try again or enter manually.');
    }
  },

  async scanReceiptDemo(imageUri: string): Promise<ScannedReceipt> {
    console.log('Demo receipt scan:', imageUri);
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      amount: Math.floor(Math.random() * 100) + 20,
      currency: 'USD',
      date: new Date().toISOString().split('T')[0],
      merchant: 'Sample Store',
      category: 'food',
    };
  },
};
