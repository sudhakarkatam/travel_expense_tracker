import './polyfills';
import React from 'react';
import { AppRegistry } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import AppNavigator from './src/navigation/AppNavigator';
import { AppProvider } from './src/contexts/AppContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import { PaperThemeProvider } from './src/theme/ThemeProvider';
import { useThemeMode } from './src/contexts/ThemeContext';

const queryClient = new QueryClient();

function AppContent() {
  const { isLoading } = useAuth();
  const { isDark } = useThemeMode();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#111827' : '#FFFFFF' }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary: '#8b5cf6',
          background: isDark ? '#111827' : '#ffffff',
          card: isDark ? '#1f2937' : '#ffffff',
          text: isDark ? '#f9fafb' : '#111827',
          border: isDark ? '#374151' : '#e5e7eb',
          notification: '#8b5cf6',
        },
      }}
    >
      <AppNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <CurrencyProvider>
              <PaperThemeProvider>
                <AppProvider>
                  <AppContent />
                </AppProvider>
              </PaperThemeProvider>
            </CurrencyProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Register the main component
AppRegistry.registerComponent('main', () => App);

export default App;
