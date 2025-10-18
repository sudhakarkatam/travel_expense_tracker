import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeftRight, RefreshCw } from 'lucide-react-native';
import { currencyConversionService } from '@/services/currencyConversion';
import { CURRENCIES } from '@/constants/currencies';
import { useApp } from '@/contexts/AppContext';

export default function CurrencyConverterScreen() {
  const router = useRouter();
  const { user } = useApp();
  
  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    loadRates();
  }, []);

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      handleConvert();
    }
  }, [amount, fromCurrency, toCurrency, rates]);

  const loadRates = async () => {
    try {
      const fetchedRates = await currencyConversionService.fetchRates();
      setRates(fetchedRates);
    } catch (error) {
      console.error('Error loading rates:', error);
    }
  };

  const handleConvert = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setConvertedAmount(null);
      return;
    }

    setLoading(true);
    try {
      const result = await currencyConversionService.convert(
        parsedAmount,
        fromCurrency,
        toCurrency
      );
      
      setConvertedAmount(result.convertedAmount);
      setRate(result.rate);
    } catch (error) {
      console.error('Conversion error:', error);
    } finally {
      setLoading(false);
    }
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const refreshRates = async () => {
    setLoading(true);
    await currencyConversionService.clearCache();
    await loadRates();
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Currency Converter', headerShown: true }} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <ArrowLeftRight size={48} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Currency Converter</Text>
            <Text style={styles.headerSubtitle}>
              Real-time exchange rates for your travel expenses
            </Text>
          </LinearGradient>
        </View>

        {!user?.isPro && (
          <TouchableOpacity
            style={styles.proCard}
            onPress={() => router.push('/premium')}
            activeOpacity={0.8}
          >
            <Text style={styles.proCardText}>
              🔒 Real-time rates available in Pro version
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.converterCard}>
          <View style={styles.inputSection}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountContainer}>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
              />
              <View style={styles.currencyPicker}>
                <Text style={styles.currencyPickerText}>{fromCurrency}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.swapButton}
            onPress={swapCurrencies}
            activeOpacity={0.7}
          >
            <ArrowLeftRight size={24} color="#6366F1" />
          </TouchableOpacity>

          <View style={styles.inputSection}>
            <Text style={styles.label}>Converted Amount</Text>
            <View style={styles.amountContainer}>
              <View style={styles.resultDisplay}>
                {loading ? (
                  <ActivityIndicator color="#6366F1" />
                ) : (
                  <Text style={styles.resultText}>
                    {convertedAmount !== null
                      ? convertedAmount.toFixed(2)
                      : '0.00'}
                  </Text>
                )}
              </View>
              <View style={styles.currencyPicker}>
                <Text style={styles.currencyPickerText}>{toCurrency}</Text>
              </View>
            </View>
          </View>

          {rate && (
            <View style={styles.rateInfo}>
              <Text style={styles.rateText}>
                1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshRates}
            disabled={loading}
          >
            <RefreshCw size={16} color="#6366F1" />
            <Text style={styles.refreshButtonText}>Refresh Rates</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Currencies</Text>
          <View style={styles.currencyGrid}>
            {CURRENCIES.slice(0, 12).map((currency) => {
              const rateValue = rates[currency.code];
              
              return (
                <TouchableOpacity
                  key={currency.code}
                  style={styles.currencyCard}
                  onPress={() => setToCurrency(currency.code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                  <Text style={styles.currencyCode}>{currency.code}</Text>
                  {rateValue && fromCurrency === 'USD' && (
                    <Text style={styles.currencyRate}>
                      {rateValue.toFixed(2)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Pro Tip</Text>
          <Text style={styles.infoText}>
            Currency conversion helps you track expenses in different currencies during your travels. Pro users get real-time exchange rates updated every hour.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
  },
  headerGradient: {
    padding: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FEF3C7',
    textAlign: 'center',
  },
  proCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  proCardText: {
    fontSize: 14,
    color: '#1E40AF',
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  converterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748B',
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultDisplay: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#6366F1',
  },
  currencyPicker: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currencyPickerText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1E293B',
  },
  swapButton: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  rateInfo: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  rateText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748B',
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6366F1',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginBottom: 16,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  currencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '30%',
  },
  currencySymbol: {
    fontSize: 24,
    marginBottom: 4,
  },
  currencyCode: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1E293B',
    marginBottom: 2,
  },
  currencyRate: {
    fontSize: 11,
    color: '#64748B',
  },
  infoCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#92400E',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
});
