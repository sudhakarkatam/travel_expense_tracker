import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { FAB, useTheme } from 'react-native-paper';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  variant?: 'primary' | 'secondary' | 'tertiary';
  style?: any;
}

export function FloatingActionButton({
  onPress,
  icon,
  label,
  variant = 'primary',
  style,
}: FloatingActionButtonProps) {
  const theme = useTheme();
  const [isPressed, setIsPressed] = React.useState(false);

  const handlePressIn = () => {
    setIsPressed(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  const getVariantColor = () => {
    switch (variant) {
      case 'secondary':
        return theme.colors.secondary;
      case 'tertiary':
        return theme.colors.tertiary;
      default:
        return theme.colors.primary;
    }
  };

  return (
    <MotiView
      animate={{
        scale: isPressed ? 0.9 : 1,
      }}
      transition={{
        type: 'timing',
        duration: 150,
      }}
      style={[styles.container, style]}
    >
      <FAB
        icon={icon}
        label={label}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.fab,
          {
            backgroundColor: getVariantColor(),
          },
        ]}
        color="#FFFFFF"
        size="large"
      />
    </MotiView>
  );
}

const styles = StyleSheet.create({
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
  fab: {
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

