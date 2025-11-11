import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

const POPULAR_CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", flag: "🇳🇿" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", flag: "🇭🇰" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", flag: "🇲🇽" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦" },
  { code: "THB", name: "Thai Baht", symbol: "฿", flag: "🇹🇭" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", flag: "🇸🇦" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", flag: "🇰🇷" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", flag: "🇹🇷" },
];

const CACHE_KEY = "@currency_rates_cache";
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export default function CurrencyConverterScreen() {
  const [fromCurrency, setFromCurrency] = useState<Currency>(
    POPULAR_CURRENCIES[0],
  );
  const [toCurrency, setToCurrency] = useState<Currency>(POPULAR_CURRENCIES[3]);
  const [amount, setAmount] = useState("1");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadExchangeRates();
  }, []);

  const loadExchangeRates = async () => {
    try {
      // Try to load from cache first
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const cachedData: ExchangeRates = JSON.parse(cached);
        const age = Date.now() - cachedData.timestamp;

        if (age < CACHE_DURATION) {
          setExchangeRates(cachedData);
          setLastUpdated(new Date(cachedData.timestamp));
          setIsLoading(false);
          setIsOffline(false);
          return;
        }
      }

      // Fetch fresh rates
      await fetchExchangeRates();
    } catch (error) {
      console.error("Error loading exchange rates:", error);
      setIsLoading(false);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      setIsOffline(false);
      // Using exchangerate-api.com free tier (1500 requests/month)
      const response = await fetch(
        "https://api.exchangerate-api.com/v4/latest/USD",
      );

      if (!response.ok) {
        throw new Error("Failed to fetch exchange rates");
      }

      const data = await response.json();
      const ratesData: ExchangeRates = {
        base: data.base,
        rates: data.rates,
        timestamp: Date.now(),
      };

      setExchangeRates(ratesData);
      setLastUpdated(new Date());
      setIsLoading(false);
      setIsRefreshing(false);

      // Cache the data
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(ratesData));
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      setIsOffline(true);
      setIsLoading(false);
      setIsRefreshing(false);

      // Try to use cached data even if expired
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const cachedData: ExchangeRates = JSON.parse(cached);
        setExchangeRates(cachedData);
        setLastUpdated(new Date(cachedData.timestamp));
        Alert.alert(
          "Offline Mode",
          "Using cached exchange rates. Rates may not be current.",
        );
      } else {
        Alert.alert(
          "Error",
          "Failed to load exchange rates and no cached data available.",
        );
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchExchangeRates();
  };

  const convertCurrency = useMemo(() => {
    if (!exchangeRates || !amount) return 0;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return 0;

    // Convert from source to USD, then USD to target
    const fromRate = exchangeRates.rates[fromCurrency.code] || 1;
    const toRate = exchangeRates.rates[toCurrency.code] || 1;

    // If base is USD: amount * (toRate / fromRate)
    const result = amountNum * (toRate / fromRate);
    return result;
  }, [amount, fromCurrency, toCurrency, exchangeRates]);

  const getExchangeRate = useMemo(() => {
    if (!exchangeRates) return 0;

    const fromRate = exchangeRates.rates[fromCurrency.code] || 1;
    const toRate = exchangeRates.rates[toCurrency.code] || 1;

    return toRate / fromRate;
  }, [fromCurrency, toCurrency, exchangeRates]);

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery) return POPULAR_CURRENCIES;
    const query = searchQuery.toLowerCase();
    return POPULAR_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const renderCurrencyPicker = (
    selectedCurrency: Currency,
    onSelect: (currency: Currency) => void,
    onClose: () => void,
  ) => (
    <View style={styles.pickerOverlay}>
      <View style={styles.pickerContent}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Select Currency</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search currencies..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />

        <ScrollView style={styles.pickerList}>
          {filteredCurrencies.map((currency) => (
            <TouchableOpacity
              key={currency.code}
              style={[
                styles.currencyOption,
                selectedCurrency.code === currency.code &&
                  styles.currencyOptionSelected,
              ]}
              onPress={() => {
                onSelect(currency);
                onClose();
                setSearchQuery("");
              }}
            >
              <Text style={styles.currencyFlag}>{currency.flag}</Text>
              <View style={styles.currencyInfo}>
                <Text style={styles.currencyCode}>{currency.code}</Text>
                <Text style={styles.currencyName}>{currency.name}</Text>
              </View>
              {selectedCurrency.code === currency.code && (
                <Ionicons name="checkmark" size={24} color="#8b5cf6" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderQuickConversions = () => {
    const quickAmounts = [1, 10, 50, 100, 500, 1000];
    return (
      <View style={styles.quickConversions}>
        <Text style={styles.sectionTitle}>Quick Conversions</Text>
        {quickAmounts.map((amt) => {
          const converted = amt * getExchangeRate;
          return (
            <TouchableOpacity
              key={amt}
              style={styles.quickConversionItem}
              onPress={() => setAmount(amt.toString())}
            >
              <Text style={styles.quickAmount}>
                {fromCurrency.symbol}
                {amt}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#666" />
              <Text style={styles.quickResult}>
                {toCurrency.symbol}
                {converted.toFixed(2)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading exchange rates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#8b5cf6"
            colors={["#8b5cf6"]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Currency Converter</Text>
          <Text style={styles.subtitle}>Real-time exchange rates</Text>
        </View>

        {/* Status Banner */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={20} color="#f59e0b" />
            <Text style={styles.offlineText}>Using cached rates</Text>
          </View>
        )}

        {/* Last Updated */}
        {lastUpdated && (
          <View style={styles.lastUpdated}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.lastUpdatedText}>
              Updated {lastUpdated.toLocaleTimeString()}
            </Text>
            <TouchableOpacity
              onPress={handleRefresh}
              style={styles.refreshButton}
            >
              <Ionicons name="refresh" size={20} color="#8b5cf6" />
            </TouchableOpacity>
          </View>
        )}

        {/* Converter Card */}
        <View style={styles.converterCard}>
          {/* From Currency */}
          <TouchableOpacity
            style={styles.currencySelector}
            onPress={() => setShowFromPicker(true)}
          >
            <Text style={styles.currencyFlag}>{fromCurrency.flag}</Text>
            <View style={styles.currencySelectorInfo}>
              <Text style={styles.currencyCodeLarge}>{fromCurrency.code}</Text>
              <Text style={styles.currencyNameSmall}>{fromCurrency.name}</Text>
            </View>
            <Ionicons name="chevron-down" size={24} color="#666" />
          </TouchableOpacity>

          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="Enter amount"
            placeholderTextColor="#999"
          />

          {/* Swap Button */}
          <TouchableOpacity style={styles.swapButton} onPress={swapCurrencies}>
            <Ionicons name="swap-vertical" size={24} color="white" />
          </TouchableOpacity>

          {/* To Currency */}
          <TouchableOpacity
            style={styles.currencySelector}
            onPress={() => setShowToPicker(true)}
          >
            <Text style={styles.currencyFlag}>{toCurrency.flag}</Text>
            <View style={styles.currencySelectorInfo}>
              <Text style={styles.currencyCodeLarge}>{toCurrency.code}</Text>
              <Text style={styles.currencyNameSmall}>{toCurrency.name}</Text>
            </View>
            <Ionicons name="chevron-down" size={24} color="#666" />
          </TouchableOpacity>

          {/* Result */}
          <View style={styles.resultContainer}>
            <Text style={styles.resultAmount}>
              {toCurrency.symbol}
              {convertCurrency.toFixed(2)}
            </Text>
            <Text style={styles.resultLabel}>
              1 {fromCurrency.code} = {getExchangeRate.toFixed(4)}{" "}
              {toCurrency.code}
            </Text>
          </View>
        </View>

        {/* Quick Conversions */}
        {renderQuickConversions()}

        {/* Historical Trend (Placeholder for future) */}
        <View style={styles.trendCard}>
          <Text style={styles.sectionTitle}>Exchange Rate Trend</Text>
          <View style={styles.trendPlaceholder}>
            <Ionicons name="trending-up" size={48} color="#d1d5db" />
            <Text style={styles.trendPlaceholderText}>
              Historical data coming soon
            </Text>
          </View>
        </View>

        {/* Popular Currencies Grid */}
        <View style={styles.popularCurrencies}>
          <Text style={styles.sectionTitle}>Popular Currencies</Text>
          <View style={styles.currencyGrid}>
            {POPULAR_CURRENCIES.slice(0, 8).map((currency) => {
              const rate = exchangeRates
                ? exchangeRates.rates[currency.code]
                : 1;
              return (
                <TouchableOpacity
                  key={currency.code}
                  style={styles.currencyGridItem}
                  onPress={() => {
                    setToCurrency(currency);
                  }}
                >
                  <Text style={styles.gridFlag}>{currency.flag}</Text>
                  <Text style={styles.gridCode}>{currency.code}</Text>
                  <Text style={styles.gridRate}>
                    {rate ? rate.toFixed(2) : "N/A"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.sectionTitle}>💡 Travel Tips</Text>
          <View style={styles.tip}>
            <Ionicons name="information-circle" size={20} color="#8b5cf6" />
            <Text style={styles.tipText}>
              Exchange rates fluctuate. Check before making large transactions.
            </Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="card" size={20} color="#8b5cf6" />
            <Text style={styles.tipText}>
              Credit cards often offer better exchange rates than currency
              exchange booths.
            </Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="alert-circle" size={20} color="#8b5cf6" />
            <Text style={styles.tipText}>
              Avoid exchanging money at airports - rates are usually less
              favorable.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Currency Pickers */}
      {showFromPicker &&
        renderCurrencyPicker(fromCurrency, setFromCurrency, () =>
          setShowFromPicker(false),
        )}
      {showToPicker &&
        renderCurrencyPicker(toCurrency, setToCurrency, () =>
          setShowToPicker(false),
        )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  offlineText: {
    fontSize: 14,
    color: "#92400e",
    fontWeight: "500",
  },
  lastUpdated: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: "#666",
  },
  refreshButton: {
    padding: 4,
  },
  converterCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currencySelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginBottom: 12,
  },
  currencySelectorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  currencyCodeLarge: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  currencyNameSmall: {
    fontSize: 12,
    color: "#666",
  },
  currencyFlag: {
    fontSize: 32,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginBottom: 12,
    textAlign: "center",
  },
  swapButton: {
    alignSelf: "center",
    backgroundColor: "#8b5cf6",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  resultContainer: {
    alignItems: "center",
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 12,
  },
  resultAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#8b5cf6",
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: "#666",
  },
  quickConversions: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  quickConversionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  quickAmount: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  quickResult: {
    fontSize: 16,
    fontWeight: "500",
    color: "#8b5cf6",
    flex: 1,
    textAlign: "right",
  },
  trendCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trendPlaceholder: {
    alignItems: "center",
    paddingVertical: 32,
  },
  trendPlaceholderText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  popularCurrencies: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  currencyGridItem: {
    width: "22%",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  gridFlag: {
    fontSize: 24,
    marginBottom: 4,
  },
  gridCode: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  gridRate: {
    fontSize: 10,
    color: "#666",
  },
  tipsCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  pickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  pickerContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  searchInput: {
    margin: 16,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    fontSize: 16,
  },
  pickerList: {
    maxHeight: 400,
  },
  currencyOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  currencyOptionSelected: {
    backgroundColor: "#f3f4f6",
  },
  currencyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  currencyName: {
    fontSize: 14,
    color: "#666",
  },
});
