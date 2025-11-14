import { getCurrencySymbol } from '@/constants/currencies';

/**
 * Convert amount from trip currency to default currency
 */
export function convertToDefaultCurrency(
  amount: number,
  tripCurrency: string,
  exchangeRate: number,
  defaultCurrency: string
): number {
  if (tripCurrency === defaultCurrency || !exchangeRate || exchangeRate <= 0) {
    return amount;
  }
  return amount * exchangeRate;
}

/**
 * Format currency with conversion support
 */
export function formatCurrencyWithConversion(
  amount: number,
  tripCurrency: string,
  exchangeRate: number | undefined,
  defaultCurrency: string,
  showInDefault: boolean
): { amount: number; currency: string; formatted: string } {
  let displayAmount = amount;
  let displayCurrency = tripCurrency;

  if (showInDefault && exchangeRate && exchangeRate > 0 && tripCurrency !== defaultCurrency) {
    displayAmount = convertToDefaultCurrency(amount, tripCurrency, exchangeRate, defaultCurrency);
    displayCurrency = defaultCurrency;
  }

  const symbol = getCurrencySymbol(displayCurrency);
  const formatted = `${symbol}${displayAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return {
    amount: displayAmount,
    currency: displayCurrency,
    formatted,
  };
}

/**
 * Get currency symbol by code
 */
export function getCurrencySymbolByCode(code: string): string {
  return getCurrencySymbol(code);
}

