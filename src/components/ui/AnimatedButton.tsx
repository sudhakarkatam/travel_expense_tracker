import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface AnimatedButtonProps {
  onPress: () => void;
  label: string;
  mode?: 'contained' | 'outlined' | 'text' | 'elevated';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  fullWidth?: boolean;
  style?: any;
  labelStyle?: any;
}

export function AnimatedButton({
  onPress,
  label,
  mode = 'contained',
  icon,
  loading = false,
  disabled = false,
  variant = 'primary',
  fullWidth = false,
  style,
  labelStyle,
}: AnimatedButtonProps) {
  const theme = useTheme();
  const [isPressed, setIsPressed] = React.useState(false);

  const handlePressIn = () => {
    setIsPressed(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  const getVariantColor = () => {
    switch (variant) {
      case 'secondary':
        return theme.colors.secondary;
      case 'success':
        return '#10b981';
      case 'error':
        return theme.colors.error;
      case 'warning':
        return '#f59e0b';
      default:
        return theme.colors.primary;
    }
  };

  return (
    <MotiView
      animate={{
        scale: isPressed ? 0.97 : 1,
        opacity: disabled ? 0.5 : 1,
      }}
      transition={{
        type: 'timing',
        duration: 100,
      }}
      style={[fullWidth && styles.fullWidth, style]}
    >
      <Button
        mode={mode}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        loading={loading}
        icon={icon ? ({ size, color }) => (
          <Ionicons name={icon} size={size} color={color} />
        ) : undefined}
        buttonColor={mode === 'contained' ? getVariantColor() : undefined}
        textColor={
          mode === 'contained'
            ? '#FFFFFF'
            : mode === 'outlined'
            ? getVariantColor()
            : getVariantColor()
        }
        style={[
          styles.button,
          mode === 'contained' && { backgroundColor: getVariantColor() },
          mode === 'outlined' && {
            borderColor: getVariantColor(),
            borderWidth: 1.5,
          },
        ]}
        labelStyle={[styles.label, labelStyle]}
        contentStyle={styles.content}
      >
        {label}
      </Button>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    minHeight: 48,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  content: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  fullWidth: {
    width: '100%',
  },
});

