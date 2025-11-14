import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { FAB, useTheme } from 'react-native-paper';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FABMenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
}

interface FABMenuProps {
  items: FABMenuItem[];
  mainIcon?: keyof typeof Ionicons.glyphMap;
  mainLabel?: string;
  variant?: 'primary' | 'secondary' | 'tertiary';
  style?: any;
}

export function FABMenu({ items, mainIcon = 'add', mainLabel, variant = 'primary', style }: FABMenuProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleMainPress = () => {
    setIsOpen(!isOpen);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleItemPress = (item: FABMenuItem) => {
    setIsOpen(false);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    item.onPress();
  };

  const handlePressIn = () => {
    setIsPressed(true);
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  const getVariantColor = (itemVariant?: 'primary' | 'secondary' | 'tertiary') => {
    const v = itemVariant || variant;
    switch (v) {
      case 'secondary':
        return theme.colors.secondary || '#06b6d4';
      case 'tertiary':
        return theme.colors.tertiary || '#ec4899';
      default:
        return theme.colors.primary || '#8b5cf6';
    }
  };

  const getVariantColorLight = (itemVariant?: 'primary' | 'secondary' | 'tertiary') => {
    const color = getVariantColor(itemVariant);
    // Add opacity for lighter version
    return color + '20';
  };

  return (
    <>
      {/* Background dim/blur overlay */}
      {isOpen && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 200 }}
          style={styles.backdrop}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
          )}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          />
        </MotiView>
      )}

      <View style={[styles.container, style]}>
        {/* Menu Items */}
        {isOpen && (
          <View style={styles.menuContainer} pointerEvents="box-none">
            {items.map((item, index) => (
              <MotiView
                key={index}
                from={{ opacity: 0, translateY: 20, scale: 0.8 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{
                  type: 'spring',
                  damping: 15,
                  delay: index * 50,
                }}
                style={styles.menuItemWrapper}
              >
                <View style={styles.menuItemRow}>
                  {/* Mini Icon Button */}
                  <TouchableOpacity
                    onPress={() => handleItemPress(item)}
                    style={[
                      styles.menuItemButton,
                      {
                        backgroundColor: getVariantColor(item.variant || variant),
                      }
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                  {/* Label Text */}
                  <TouchableOpacity
                    onPress={() => handleItemPress(item)}
                    style={styles.menuItemLabel}
                    activeOpacity={0.8}
                  >
                    <Text 
                      style={[styles.menuItemText, { color: theme.colors.onSurface }]}
                      numberOfLines={1}
                      allowFontScaling={false}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                </View>
              </MotiView>
            ))}
          </View>
        )}

        {/* Main FAB Button - Show + when closed, close icon when open */}
        <MotiView
          animate={{
            scale: isPressed ? 0.9 : 1,
            rotate: isOpen ? '45deg' : '0deg',
          }}
          transition={{
            type: 'timing',
            duration: 200,
          }}
          style={styles.fabContainer}
        >
          <FAB
            icon={({ size, color }) => (
              <Ionicons name={isOpen ? 'close' : mainIcon} size={size * 0.85} color={color} />
            )}
            onPress={handleMainPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[
              styles.fab,
              {
                backgroundColor: getVariantColor(variant),
              },
            ]}
            color="#FFFFFF"
            size="medium"
          />
        </MotiView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  container: {
    position: 'absolute',
    bottom: Platform.select({
      ios: 80,
      android: 24,
      default: 24,
    }),
    right: 16,
    zIndex: 1000,
  },
  menuContainer: {
    position: 'absolute',
    bottom: 70,
    right: 0,
    alignItems: 'flex-end',
    gap: 12,
    flexDirection: 'column',
  },
  menuItemWrapper: {
    marginBottom: 12,
    flexShrink: 0,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuItemLabel: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  fabContainer: {
    position: 'relative',
  },
  fab: {
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

