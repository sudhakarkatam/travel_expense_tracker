import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Chip as PaperChip, useTheme } from 'react-native-paper';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
  variant?: 'default' | 'outlined' | 'flat';
  style?: any;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  variant = 'flat',
  style,
}: ChipProps) {
  const theme = useTheme();
  const [isPressed, setIsPressed] = React.useState(false);

  const handlePressIn = () => {
    setIsPressed(true);
    if (Platform.OS !== 'web' && onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  return (
    <MotiView
      animate={{
        scale: isPressed ? 0.95 : 1,
      }}
      transition={{
        type: 'timing',
        duration: 100,
      }}
      style={style}
    >
      <PaperChip
        selected={selected}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        icon={icon}
        mode={variant}
        style={[
          styles.chip,
          selected && {
            backgroundColor: theme.colors.primaryContainer,
          },
        ]}
        textStyle={[
          styles.text,
          selected && {
            color: theme.colors.onPrimaryContainer,
            fontWeight: '600',
          },
        ]}
      >
        {label}
      </PaperChip>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    borderRadius: 18,
  },
  text: {
    fontSize: 14,
  },
});

