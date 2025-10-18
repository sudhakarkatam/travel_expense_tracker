import { storage } from '@/utils/storage';

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';

export async function fetchCurrencyRates(): Promise<Record<string, number>> {
  try {
    const response = await fetch(EXCHANGE_RATE_API);
    const data = await response.json();
    
    if (data?.rates) {
      await storage.saveCurrencyRates(data.rates);
      return data.rates;
    }
    
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    
    const cached = await storage.getCurrencyRates();
    if (cached) {
      return cached;
    }
    
    return getDefaultRates();
  }
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  try {
    const rates = await storage.getCurrencyRates() || await fetchCurrencyRates();
    
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;
    
    const usdAmount = amount / fromRate;
    const convertedAmount = usdAmount * toRate;
    
    return Math.round(convertedAmount * 100) / 100;
  } catch (error) {
    console.error('Error converting currency:', error);
    return amount;
  }
}

function getDefaultRates(): Record<string, number> {
  return {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    INR: 83.12,
    JPY: 149.5,
    AUD: 1.52,
    CAD: 1.36,
    CHF: 0.88,
    CNY: 7.24,
    SEK: 10.87,
    NZD: 1.67,
    MXN: 17.08,
    SGD: 1.34,
    HKD: 7.83,
    NOK: 10.93,
    KRW: 1319.5,
    TRY: 32.65,
    RUB: 92.5,
    BRL: 4.97,
    ZAR: 18.65,
  };
}
