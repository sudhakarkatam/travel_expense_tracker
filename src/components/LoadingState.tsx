import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export default function LoadingState({ 
  message = 'Loading...', 
  size = 'large', 
  color 
}: LoadingStateProps) {
  const theme = useTheme();
  
  // Safe defaults for theme colors
  const safeColor = color || theme?.colors?.primary || '#8b5cf6';
  const safeTextColor = theme?.colors?.onSurfaceVariant || '#666666';
  
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={safeColor} />
      <Text style={[styles.message, { color: safeTextColor }]}>{message}</Text>
    </View>
  );
}

interface SkeletonLoadingProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoading({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style 
}: SkeletonLoadingProps) {
  const theme = useTheme();
  const safeBgColor = theme?.colors?.surfaceVariant || '#f3f4f6';
  
  return (
    <View 
      style={[
        styles.skeleton,
        { width, height, borderRadius, backgroundColor: safeBgColor },
        style
      ]} 
    />
  );
}

export function SkeletonCard() {
  const theme = useTheme();
  const safeBgColor = theme?.colors?.surface || '#FFFFFF';
  
  return (
    <View style={[styles.skeletonCard, { backgroundColor: safeBgColor }]}>
      <SkeletonLoading width="60%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonLoading width="40%" height={14} style={{ marginBottom: 12 }} />
      <SkeletonLoading width="80%" height={12} style={{ marginBottom: 4 }} />
      <SkeletonLoading width="50%" height={12} />
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  message: {
    fontSize: 16,
    marginTop: 16,
  },
  skeleton: {
    opacity: 0.6,
  },
  skeletonCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  skeletonList: {
    padding: 16,
  },
});
