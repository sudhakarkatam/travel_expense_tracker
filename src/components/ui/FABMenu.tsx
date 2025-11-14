import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Animated } from 'react-native';
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
  const animValues = useRef(
    items.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;

  useEffect(() => {
    if (isOpen) {
      animValues.forEach((anim, index) => {
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 300,
            delay: index * 50,
            useNativeDriver: true,
          }),
          Animated.spring(anim.translateY, {
            toValue: 0,
            damping: 15,
            delay: index * 50,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      animValues.forEach((anim) => {
        anim.opacity.setValue(0);
        anim.translateY.setValue(20);
      });
    }
  }, [isOpen]);

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

  return (
    <>
      {isOpen && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 200 }}
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
        {isOpen && (
          <View style={styles.menuContainer} pointerEvents="box-none">
            {items.map((item, index) => {
              const anim = animValues[index];
              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.menuItemWrapper,
                    {
                      opacity: anim.opacity,
                      transform: [{ translateY: anim.translateY }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.8}
                    style={[styles.menuItemLabel, { backgroundColor: theme.colors.surface }]}
                  >
                    <Text
                      style={[styles.menuItemText, { color: theme.colors.onSurface }]}
                      numberOfLines={1}
                      allowFontScaling={false}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}

        <MotiView
          animate={{
            rotate: isOpen ? '45deg' : '0deg',
          }}
          transition={{ duration: 200 }}
          style={styles.fabContainer}
        >
          <FAB
            icon={({ size, color }) => (
              <Ionicons name={isOpen ? 'close' : mainIcon} size={size * 0.85} color={color} />
            )}
            onPress={handleMainPress}
            style={[
              styles.fab,
              {
                backgroundColor: getVariantColor(),
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
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
  },

  /** FIXED → Horizontal label */
  menuItemLabel: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    minHeight: 40,
    minWidth: 120,      // ← IMPORTANT: Forces horizontal layout
    maxWidth: 200,
  },

  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',       // ← prevents text wrapping vertically
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
