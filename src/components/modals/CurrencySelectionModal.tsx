import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useCurrency } from '@/contexts/CurrencyContext';
import { COMMON_CURRENCIES } from '@/constants/currencies';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CurrencySelectionModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect?: (currencyCode: string) => void; // Optional callback for custom handling
  title?: string; // Optional custom title
}

export default function CurrencySelectionModal({
  visible,
  onDismiss,
  onSelect,
  title = 'Choose Default Currency',
}: CurrencySelectionModalProps) {
  const theme = useTheme();
  const { defaultCurrency, setDefaultCurrency } = useCurrency();
  const [slideAnim] = React.useState(new Animated.Value(SCREEN_HEIGHT));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleSelectCurrency = async (currencyCode: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (onSelect) {
      // Custom handler (e.g., for trip currency)
      onSelect(currencyCode);
    } else {
      // Default behavior (set default currency)
      await setDefaultCurrency(currencyCode);
    }
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.colors.surface,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                {title}
              </Text>
              <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {COMMON_CURRENCIES.map((currency) => {
                // If onSelect is provided, don't highlight based on defaultCurrency
                const isActive = onSelect ? false : defaultCurrency === currency.code;
                return (
                  <TouchableOpacity
                    key={currency.code}
                    onPress={() => handleSelectCurrency(currency.code)}
                    style={[
                      styles.currencyOption,
                      {
                        backgroundColor: isActive
                          ? theme.colors.primaryContainer
                          : theme.colors.surfaceVariant,
                        borderWidth: isActive ? 2 : 1,
                        borderColor: isActive
                          ? theme.colors.primary
                          : theme.colors.outlineVariant,
                      },
                    ]}
                  >
                    <View style={styles.currencyContent}>
                      <Text style={styles.flag}>{currency.flag}</Text>
                      <View style={styles.currencyInfo}>
                        <Text
                          style={[
                            styles.currencyCode,
                            {
                              color: isActive
                                ? theme.colors.onPrimaryContainer
                                : theme.colors.onSurface,
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
                                ? theme.colors.onPrimaryContainer
                                : theme.colors.onSurfaceVariant,
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
                              ? theme.colors.onPrimaryContainer
                              : theme.colors.onSurface,
                          },
                        ]}
                      >
                        {currency.symbol}
                      </Text>
                      {isActive && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={theme.colors.primary}
                          style={styles.checkIcon}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  currencyOption: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  currencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 32,
    marginRight: 16,
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
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  checkIcon: {
    marginLeft: 4,
  },
});

