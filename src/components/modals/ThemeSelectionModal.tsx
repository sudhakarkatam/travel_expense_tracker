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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useThemeMode, ThemeMode } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ThemeSelectionModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function ThemeSelectionModal({ visible, onDismiss }: ThemeSelectionModalProps) {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();
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

  const handleSelectTheme = async (mode: ThemeMode) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await setThemeMode(mode);
    onDismiss();
  };

  const themeOptions = [
    {
      mode: 'system' as ThemeMode,
      label: 'System Default',
      icon: 'phone-portrait-outline',
      description: 'Follow system theme settings',
    },
    {
      mode: 'light' as ThemeMode,
      label: 'Light Mode',
      icon: 'sunny-outline',
      description: 'Always use light theme',
    },
    {
      mode: 'dark' as ThemeMode,
      label: 'Dark Mode',
      icon: 'moon-outline',
      description: 'Always use dark theme',
    },
  ];

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
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>Choose Theme</Text>
              <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsContainer}>
              {themeOptions.map((option) => {
                const isActive = themeMode === option.mode;
                return (
                  <TouchableOpacity
                    key={option.mode}
                    onPress={() => handleSelectTheme(option.mode)}
                    style={[
                      styles.option,
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
                    <View style={styles.optionContent}>
                      <View
                        style={[
                          styles.iconContainer,
                          {
                            backgroundColor: isActive
                              ? theme.colors.primary
                              : theme.colors.surface,
                          },
                        ]}
                      >
                        <Ionicons
                          name={option.icon as any}
                          size={24}
                          color={isActive ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
                        />
                      </View>
                      <View style={styles.optionText}>
                        <Text
                          style={[
                            styles.optionTitle,
                            {
                              color: isActive
                                ? theme.colors.onPrimaryContainer
                                : theme.colors.onSurface,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.optionDescription,
                            {
                              color: isActive
                                ? theme.colors.onPrimaryContainer
                                : theme.colors.onSurfaceVariant,
                            },
                          ]}
                        >
                          {option.description}
                        </Text>
                      </View>
                      {isActive && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={theme.colors.primary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
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
    maxHeight: SCREEN_HEIGHT * 0.6,
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
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
  },
});

