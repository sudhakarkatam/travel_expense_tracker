/**
 * Currency formatting utilities for consistent display across the app
 */

interface CurrencyFormatOptions {
  currency?: string;
  locale?: string;
  showSymbol?: boolean;
  decimals?: number;
  compact?: boolean;
}

/**
 * Format a number as currency with proper symbol and decimals
 */
export function formatCurrency(
  amount: number,
  options: CurrencyFormatOptions = {},
): string {
  const {
    currency = "USD",
    locale = "en-US",
    showSymbol = true,
    decimals = 2,
    compact = false,
  } = options;

  try {
    if (compact && Math.abs(amount) >= 1000) {
      return formatCompactCurrency(amount, currency, locale);
    }

    const formatter = new Intl.NumberFormat(locale, {
      style: showSymbol ? "currency" : "decimal",
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return formatter.format(amount);
  } catch {
    // Fallback if Intl is not available or currency is invalid
    const symbol = showSymbol ? getCurrencySymbol(currency) : "";
    return `${symbol}${amount.toFixed(decimals)}`;
  }
}

/**
 * Format large amounts in compact notation (e.g., $1.2K, $3.5M)
 */
export function formatCompactCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      notation: "compact",
      maximumFractionDigits: 1,
    });

    return formatter.format(amount);
  } catch {
    // Fallback for compact notation
    const symbol = getCurrencySymbol(currency);
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";

    if (absAmount >= 1_000_000_000) {
      return `${sign}${symbol}${(absAmount / 1_000_000_000).toFixed(1)}B`;
    } else if (absAmount >= 1_000_000) {
      return `${sign}${symbol}${(absAmount / 1_000_000).toFixed(1)}M`;
    } else if (absAmount >= 1_000) {
      return `${sign}${symbol}${(absAmount / 1_000).toFixed(1)}K`;
    }

    return formatCurrency(amount, { currency, locale });
  }
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CNY: "¥",
    INR: "₹",
    AUD: "A$",
    CAD: "C$",
    CHF: "Fr",
    HKD: "HK$",
    SGD: "S$",
    SEK: "kr",
    KRW: "₩",
    NOK: "kr",
    NZD: "NZ$",
    MXN: "Mex$",
    ZAR: "R",
    BRL: "R$",
    RUB: "₽",
    TRY: "₺",
    THB: "฿",
    AED: "د.إ",
    SAR: "﷼",
    QAR: "ر.ق",
    KWD: "د.ك",
    BHD: "د.ب",
    OMR: "ر.ع.",
    EGP: "E£",
    ILS: "₪",
    PHP: "₱",
    IDR: "Rp",
    MYR: "RM",
    VND: "₫",
    PKR: "₨",
    BDT: "৳",
    LKR: "Rs",
    PLN: "zł",
    CZK: "Kč",
    HUF: "Ft",
    RON: "lei",
    DKK: "kr",
    ISK: "kr",
    BGN: "лв",
    HRK: "kn",
    UAH: "₴",
    CLP: "$",
    COP: "$",
    PEN: "S/",
    ARS: "$",
    UYU: "$U",
  };

  // Try to get symbol from map
  const symbol = symbols[currencyCode.toUpperCase()];
  if (symbol) {
    return symbol;
  }

  // Fallback: try Intl.NumberFormat
  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    const parts = formatter.formatToParts(0);
    const symbolPart = parts.find((part) => part.type === "currency");
    return symbolPart?.value || currencyCode;
  } catch {
    return currencyCode;
  }
}

/**
 * Get currency name for a given currency code
 */
export function getCurrencyName(currencyCode: string): string {
  const names: Record<string, string> = {
    USD: "US Dollar",
    EUR: "Euro",
    GBP: "British Pound",
    JPY: "Japanese Yen",
    CNY: "Chinese Yuan",
    INR: "Indian Rupee",
    AUD: "Australian Dollar",
    CAD: "Canadian Dollar",
    CHF: "Swiss Franc",
    HKD: "Hong Kong Dollar",
    SGD: "Singapore Dollar",
    SEK: "Swedish Krona",
    KRW: "South Korean Won",
    NOK: "Norwegian Krone",
    NZD: "New Zealand Dollar",
    MXN: "Mexican Peso",
    ZAR: "South African Rand",
    BRL: "Brazilian Real",
    RUB: "Russian Ruble",
    TRY: "Turkish Lira",
    THB: "Thai Baht",
    AED: "UAE Dirham",
    SAR: "Saudi Riyal",
    QAR: "Qatari Riyal",
    KWD: "Kuwaiti Dinar",
    BHD: "Bahraini Dinar",
    OMR: "Omani Rial",
    EGP: "Egyptian Pound",
    ILS: "Israeli Shekel",
    PHP: "Philippine Peso",
    IDR: "Indonesian Rupiah",
    MYR: "Malaysian Ringgit",
    VND: "Vietnamese Dong",
    PKR: "Pakistani Rupee",
    BDT: "Bangladeshi Taka",
    LKR: "Sri Lankan Rupee",
    PLN: "Polish Zloty",
    CZK: "Czech Koruna",
    HUF: "Hungarian Forint",
    RON: "Romanian Leu",
    DKK: "Danish Krone",
    ISK: "Icelandic Krona",
    BGN: "Bulgarian Lev",
    HRK: "Croatian Kuna",
    UAH: "Ukrainian Hryvnia",
    CLP: "Chilean Peso",
    COP: "Colombian Peso",
    PEN: "Peruvian Sol",
    ARS: "Argentine Peso",
    UYU: "Uruguayan Peso",
  };

  return names[currencyCode.toUpperCase()] || currencyCode;
}

/**
 * Parse a currency string to a number
 */
export function parseCurrency(value: string, currency: string = "USD"): number {
  // Remove currency symbols and formatting
  const cleaned = value.replace(/[^0-9.,\-]/g, "").replace(/,/g, "");

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format amount with proper sign (+ or -)
 */
export function formatCurrencyWithSign(
  amount: number,
  options: CurrencyFormatOptions = {},
): string {
  const formatted = formatCurrency(Math.abs(amount), options);

  if (amount > 0) {
    return `+${formatted}`;
  } else if (amount < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

/**
 * Format difference between two amounts
 */
export function formatCurrencyDifference(
  current: number,
  previous: number,
  options: CurrencyFormatOptions = {},
): string {
  const difference = current - previous;
  return formatCurrencyWithSign(difference, options);
}

/**
 * Format percentage change
 */
export function formatPercentageChange(
  current: number,
  previous: number,
): string {
  if (previous === 0) {
    return current > 0 ? "+∞%" : "0%";
  }

  const change = ((current - previous) / previous) * 100;
  const sign = change > 0 ? "+" : "";

  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Get locale from currency code
 */
export function getLocaleFromCurrency(currencyCode: string): string {
  const localeMap: Record<string, string> = {
    USD: "en-US",
    EUR: "de-DE",
    GBP: "en-GB",
    JPY: "ja-JP",
    CNY: "zh-CN",
    INR: "en-IN",
    AUD: "en-AU",
    CAD: "en-CA",
    CHF: "de-CH",
    HKD: "zh-HK",
    SGD: "en-SG",
    SEK: "sv-SE",
    KRW: "ko-KR",
    NOK: "nb-NO",
    NZD: "en-NZ",
    MXN: "es-MX",
    ZAR: "en-ZA",
    BRL: "pt-BR",
    RUB: "ru-RU",
    TRY: "tr-TR",
    THB: "th-TH",
    AED: "ar-AE",
    SAR: "ar-SA",
    PHP: "en-PH",
    IDR: "id-ID",
    MYR: "ms-MY",
    VND: "vi-VN",
  };

  return localeMap[currencyCode.toUpperCase()] || "en-US";
}

/**
 * Convert cents to currency amount
 */
export function centsToAmount(cents: number): number {
  return cents / 100;
}

/**
 * Convert currency amount to cents
 */
export function amountToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Format cents as currency
 */
export function formatCents(
  cents: number,
  options: CurrencyFormatOptions = {},
): string {
  return formatCurrency(centsToAmount(cents), options);
}
