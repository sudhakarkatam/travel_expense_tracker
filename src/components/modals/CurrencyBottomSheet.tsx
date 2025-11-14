import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useCurrency } from '@/contexts/CurrencyContext';
import { COMMON_CURRENCIES, getCurrencyByCode } from '@/constants/currencies';
import * as Haptics from 'expo-haptics';

interface CurrencyBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect?: (currencyCode: string) => void;
  title?: string;
  selectedCurrency?: string;
  showExchangeRate?: boolean;
  defaultCurrency?: string;
  exchangeRate?: string;
  onExchangeRateChange?: (rate: string) => void;
}

export default function CurrencyBottomSheet({
  visible,
  onDismiss,
  onSelect,
  title = 'Choose Currency',
  selectedCurrency,
  showExchangeRate = false,
  defaultCurrency,
  exchangeRate = '',
  onExchangeRateChange,
}: CurrencyBottomSheetProps) {
  const theme = useTheme();
  const { defaultCurrency: contextDefaultCurrency, setDefaultCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  
  const effectiveDefaultCurrency = defaultCurrency || contextDefaultCurrency;

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) {
      return COMMON_CURRENCIES;
    }
    const query = searchQuery.toLowerCase();
    return COMMON_CURRENCIES.filter(
      (currency) =>
        currency.code.toLowerCase().includes(query) ||
        currency.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelectCurrency = async (currencyCode: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (onSelect) {
      onSelect(currencyCode);
      // Don't dismiss if exchange rate is required and currency differs from default
      if (!showExchangeRate || currencyCode === effectiveDefaultCurrency) {
        onDismiss();
      }
    } else {
      await setDefaultCurrency(currencyCode);
      onDismiss();
    }
  };

  const safeTheme = {
    colors: {
      background: theme?.colors?.background || '#FFFFFF',
      surface: theme?.colors?.surface || '#FFFFFF',
      surfaceVariant: theme?.colors?.surfaceVariant || '#F5F5F5',
      onSurface: theme?.colors?.onSurface || '#000000',
      onSurfaceVariant: theme?.colors?.onSurfaceVariant || '#666666',
      primary: theme?.colors?.primary || '#8b5cf6',
      onPrimary: theme?.colors?.onPrimary || '#FFFFFF',
      primaryContainer: theme?.colors?.primaryContainer || '#EDE9FE',
      onPrimaryContainer: theme?.colors?.onPrimaryContainer || '#000000',
      error: theme?.colors?.error || '#EF4444',
      outline: theme?.colors?.outline || '#E5E5E5',
      outlineVariant: theme?.colors?.outlineVariant || '#E5E5E5',
    },
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable
        style={styles.overlay}
        onPress={onDismiss}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View
            style={[styles.modalContent, { backgroundColor: safeTheme.colors.surface }]}
            onStartShouldSetResponder={() => true}
          >
          <View style={[styles.modalHandle, { backgroundColor: safeTheme.colors.onSurfaceVariant }]} />
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: safeTheme.colors.onSurface }]}>{title}</Text>
            <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={safeTheme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: safeTheme.colors.surfaceVariant }]}>
            <Ionicons name="search-outline" size={20} color={safeTheme.colors.onSurfaceVariant} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: safeTheme.colors.onSurface }]}
              placeholder="Search currencies..."
              placeholderTextColor={safeTheme.colors.onSurfaceVariant}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={safeTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>

          {/* Currency List */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {filteredCurrencies.map((currency) => {
              const isSelected = selectedCurrency === currency.code;
              const isDefault = !selectedCurrency && currency.code === effectiveDefaultCurrency;
              const isActive = isSelected || isDefault;

              return (
                <TouchableOpacity
                  key={currency.code}
                  onPress={() => handleSelectCurrency(currency.code)}
                  style={[
                    styles.currencyItem,
                    {
                      backgroundColor: isActive
                        ? safeTheme.colors.primaryContainer
                        : safeTheme.colors.surface,
                      borderColor: isActive
                        ? safeTheme.colors.primary
                        : safeTheme.colors.outlineVariant,
                    },
                  ]}
                >
                  <Text style={styles.flag}>{currency.flag}</Text>
                  <View style={styles.currencyInfo}>
                    <Text
                      style={[
                        styles.currencyCode,
                        {
                          color: isActive
                            ? safeTheme.colors.onPrimaryContainer
                            : safeTheme.colors.onSurface,
                        },
                      ]}
                    >
                      {currency.code}
                    </Text>
                    <Text
                      style={[
                        styles.currencyName,
                        {
                          color: isActive
                            ? safeTheme.colors.onPrimaryContainer
                            : safeTheme.colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {currency.name}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.currencySymbol,
                      {
                        color: isActive
                          ? safeTheme.colors.onPrimaryContainer
                          : safeTheme.colors.onSurface,
                      },
                    ]}
                  >
                    {currency.symbol}
                  </Text>
                  {isActive && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={safeTheme.colors.primary}
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Exchange Rate Input (only shown when currency differs from default) */}
          {showExchangeRate && selectedCurrency && selectedCurrency !== effectiveDefaultCurrency && (
            <View style={styles.exchangeRateContainer}>
              <View style={[styles.exchangeRateInputContainer, { backgroundColor: safeTheme.colors.surfaceVariant }]}>
                <Ionicons name="swap-horizontal-outline" size={20} color={safeTheme.colors.onSurfaceVariant} style={styles.exchangeRateIcon} />
                <View style={styles.exchangeRateInputWrapper}>
                  <Text style={[styles.exchangeRateLabel, { color: safeTheme.colors.onSurfaceVariant }]}>
                    Exchange Rate
                  </Text>
                  <TextInput
                    style={[styles.exchangeRateInput, { color: safeTheme.colors.onSurface }]}
                    placeholder={`1 ${selectedCurrency} = ? ${effectiveDefaultCurrency}`}
                    placeholderTextColor={safeTheme.colors.onSurfaceVariant}
                    value={exchangeRate}
                    onChangeText={onExchangeRateChange}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Done Button (only shown when exchange rate is required) */}
          {showExchangeRate && selectedCurrency && selectedCurrency !== effectiveDefaultCurrency && (
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={() => {
                  if (exchangeRate && parseFloat(exchangeRate) > 0) {
                    onDismiss();
                  } else {
                    // Show error or validation
                  }
                }}
                style={[
                  styles.doneButton,
                  {
                    backgroundColor: exchangeRate && parseFloat(exchangeRate) > 0
                      ? safeTheme.colors.primary
                      : safeTheme.colors.surfaceVariant,
                  },
                ]}
                disabled={!exchangeRate || parseFloat(exchangeRate) <= 0}
              >
                <Text
                  style={[
                    styles.doneButtonText,
                    {
                      color: exchangeRate && parseFloat(exchangeRate) > 0
                        ? safeTheme.colors.onPrimary
                        : safeTheme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          )}
          </View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '50%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  flag: {
    fontSize: 28,
    marginRight: 12,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  currencyName: {
    fontSize: 14,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  checkIcon: {
    marginLeft: 4,
  },
  exchangeRateContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  exchangeRateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exchangeRateIcon: {
    marginRight: 12,
  },
  exchangeRateInputWrapper: {
    flex: 1,
  },
  exchangeRateLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  exchangeRateInput: {
    fontSize: 16,
    padding: 0,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  doneButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

