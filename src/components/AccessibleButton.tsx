import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { TouchTargets } from '@/constants/designSystem';

interface AccessibleButtonProps {
  onPress: () => void;
  label: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
}

/**
 * Accessible button component with proper touch targets and screen reader support
 */
export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  onPress,
  label,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  style,
  textStyle,
  children,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        disabled && styles.buttonDisabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      activeOpacity={0.7}
    >
      {children || (
        <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled, textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: TouchTargets.minHeight,
    minWidth: TouchTargets.minWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  buttonTextDisabled: {
    color: '#9ca3af',
  },
});

