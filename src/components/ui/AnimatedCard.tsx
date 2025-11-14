import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Card, useTheme } from 'react-native-paper';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  elevation?: number;
  variant?: 'default' | 'outlined' | 'elevated';
}

export function AnimatedCard({
  children,
  onPress,
  style,
  contentStyle,
  elevation = 2,
  variant = 'default',
}: AnimatedCardProps) {
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

  const cardContent = (
    <MotiView
      animate={{
        scale: isPressed && onPress ? 0.98 : 1,
      }}
      transition={{
        type: 'timing',
        duration: 150,
      }}
    >
      <Card
        mode={variant}
        elevation={variant === 'elevated' ? elevation : 0}
        style={[
          styles.card,
          variant === 'outlined' && {
            borderWidth: 1,
            borderColor: theme.colors.outline,
          },
          style,
        ]}
        contentStyle={contentStyle || styles.content}
      >
        {children}
      </Card>
    </MotiView>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
});

