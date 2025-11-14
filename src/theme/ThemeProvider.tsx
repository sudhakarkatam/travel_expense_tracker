import React from 'react';
import { Platform } from 'react-native';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useThemeMode } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/designSystem';

// Material Design 3 theme configuration
const fontConfig = {
  displayLarge: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 57,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 64,
  },
  displayMedium: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 45,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 52,
  },
  displaySmall: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 36,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 44,
  },
  headlineLarge: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 32,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 40,
  },
  headlineMedium: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 28,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 36,
  },
  headlineSmall: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 24,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 32,
  },
  titleLarge: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 22,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 28,
  },
  titleMedium: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  titleSmall: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelLarge: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  bodyLarge: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
    lineHeight: 16,
  },
};

// Use default MD3 fonts to avoid configuration issues
// Custom font configuration can cause "medium" property errors
// The default MD3 fonts are properly structured and work with all components
const lightTheme = {
  ...MD3LightTheme,
  // Don't override fonts - use MD3 defaults which are properly structured
  // fonts: configuredFonts, // Commented out to use defaults
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    primaryContainer: Colors.primaryLight,
    secondary: Colors.secondary,
    secondaryContainer: '#E3F2FD',
    tertiary: Colors.info,
    tertiaryContainer: '#E0F7FA',
    surface: Colors.background,
    surfaceVariant: Colors.backgroundSecondary,
    background: Colors.background,
    error: Colors.error,
    errorContainer: '#FFEBEE',
    onPrimary: Colors.textInverse,
    onPrimaryContainer: Colors.primaryDark,
    onSecondary: Colors.textInverse,
    onSecondaryContainer: Colors.secondary,
    onTertiary: Colors.textInverse,
    onTertiaryContainer: Colors.info,
    onSurface: Colors.textPrimary,
    onSurfaceVariant: Colors.textSecondary,
    onBackground: Colors.textPrimary,
    onError: Colors.textInverse,
    onErrorContainer: Colors.error,
    outline: Colors.border,
    outlineVariant: Colors.borderLight,
    shadow: Colors.gray900,
    scrim: Colors.gray900,
    inverseSurface: Colors.gray800,
    inverseOnSurface: Colors.textInverse,
    inversePrimary: Colors.primaryLight,
    elevation: {
      level0: 'transparent',
      level1: '#F5F5F5',
      level2: '#EEEEEE',
      level3: '#E8E8E8',
      level4: '#E0E0E0',
      level5: '#DADADA',
    },
  },
  roundness: Platform.select({
    ios: 12, // iOS uses more rounded corners
    android: 8, // Material Design uses 8dp
    default: 8,
  }),
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#a78bfa', // Lighter purple for dark mode
    primaryContainer: '#6d28d9', // Darker purple container
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#e9d5ff',
    secondary: '#60a5fa', // Lighter blue for dark mode
    secondaryContainer: '#1e40af',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#dbeafe',
    tertiary: '#22d3ee', // Cyan
    tertiaryContainer: '#155e75',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#cffafe',
    surface: '#1f2937', // gray800
    surfaceVariant: '#374151', // gray700
    onSurface: '#f9fafb', // gray50 - high contrast
    onSurfaceVariant: '#d1d5db', // gray300
    background: '#111827', // gray900
    onBackground: '#f9fafb', // gray50
    error: '#f87171', // Lighter red for dark mode
    errorContainer: '#7f1d1d',
    onError: '#FFFFFF',
    onErrorContainer: '#fecaca',
    outline: '#4b5563', // gray600
    outlineVariant: '#374151', // gray700
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#f9fafb', // gray50
    inverseOnSurface: '#111827', // gray900
    inversePrimary: '#6d28d9',
    elevation: {
      level0: 'transparent',
      level1: '#1f2937',
      level2: '#374151',
      level3: '#4b5563',
      level4: '#6b7280',
      level5: '#9ca3af',
    },
    // Custom colors with proper contrast
    success: '#34d399', // Lighter green for dark mode
    warning: '#fbbf24', // Lighter amber for dark mode
    info: '#22d3ee', // Cyan
  },
  roundness: Platform.select({
    ios: 12,
    android: 8,
    default: 8,
  }),
};

export function PaperThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useThemeMode();
  const theme = isDark ? darkTheme : lightTheme;

  // Safety check: Ensure fonts are always defined
  if (!theme.fonts || typeof theme.fonts !== 'object') {
    console.error('Theme fonts are not properly defined, using MD3 defaults');
    const safeTheme = {
      ...theme,
      fonts: isDark ? MD3DarkTheme.fonts : MD3LightTheme.fonts,
    };
    return (
      <PaperProvider theme={safeTheme}>
        {children}
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      {children}
    </PaperProvider>
  );
}

export { lightTheme, darkTheme };

