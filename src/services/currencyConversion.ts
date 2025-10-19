import AsyncStorage from '@react-native-async-storage/async-storage';

const RATES_CACHE_KEY = '@travel_expenses_currency_rates';
const CACHE_DURATION = 3600000;

export interface CurrencyRate {
  code: string;
  rate: number;
  lastUpdated: string;
}

export interface ConversionResult {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  convertedAmount: number;
}

const MOCK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  INR: 83.12,
  AUD: 1.52,
  CAD: 1.35,
  CHF: 0.88,
  CNY: 7.24,
  NZD: 1.64,
};

export const currencyConversionService = {
  async fetchRates(): Promise<Record<string, number>> {
    console.log('Fetching currency rates...');
    
    try {
      const cached = await AsyncStorage.getItem(RATES_CACHE_KEY);
      if (cached) {
        const { rates, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < CACHE_DURATION) {
          console.log('Using cached rates');
          return rates;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const rates = MOCK_RATES;

      await AsyncStorage.setItem(
        RATES_CACHE_KEY,
        JSON.stringify({
          rates,
          timestamp: Date.now(),
        })
      );

      console.log('Currency rates fetched and cached');
      return rates;
    } catch (error) {
      console.error('Error fetching rates:', error);
      return MOCK_RATES;
    }
  },

  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ConversionResult> {
    const rates = await this.fetchRates();

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    const rate = toRate / fromRate;
    const convertedAmount = amount * rate;

    return {
      amount,
      fromCurrency,
      toCurrency,
      rate,
      convertedAmount,
    };
  },

  async convertToBase(amount: number, currency: string): Promise<number> {
    const result = await this.convert(amount, currency, 'USD');
    return result.convertedAmount;
  },

  async getCachedRates(): Promise<Record<string, number>> {
    try {
      const cached = await AsyncStorage.getItem(RATES_CACHE_KEY);
      if (cached) {
        const { rates } = JSON.parse(cached);
        return rates;
      }
    } catch (error) {
      console.error('Error getting cached rates:', error);
    }
    return MOCK_RATES;
  },

  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(RATES_CACHE_KEY);
  },
};
