import "@rork/polyfills";
import { BundleInspector } from '@rork/inspector';
import { RorkSafeInsets } from '@rork/safe-insets';
import { RorkErrorBoundary } from '@rork/rork-error-boundary';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "@/contexts/AppContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="add-trip" 
        options={{ 
          presentation: "modal",
          title: "New Trip",
        }} 
      />
      <Stack.Screen 
        name="add-expense" 
        options={{ 
          presentation: "modal",
          title: "Add Expense",
        }} 
      />
      <Stack.Screen 
        name="trip/[id]" 
        options={{ 
          title: "Trip Details",
        }} 
      />
      <Stack.Screen 
        name="balances/[id]" 
        options={{ 
          title: "Balances",
        }} 
      />
      <Stack.Screen 
        name="premium" 
        options={{ 
          presentation: "modal",
          title: "Upgrade to Pro",
        }} 
      />
      <Stack.Screen 
        name="insights" 
        options={{ 
          title: "AI Insights",
        }} 
      />
      <Stack.Screen 
        name="join-trip" 
        options={{ 
          presentation: "modal",
          title: "Join Trip",
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppProvider>
          <BundleInspector><RorkSafeInsets><RorkErrorBoundary><RootLayoutNav /></RorkErrorBoundary></RorkSafeInsets></BundleInspector>
        </AppProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
