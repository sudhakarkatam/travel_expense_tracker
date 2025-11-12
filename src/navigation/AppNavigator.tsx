import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator, TransitionPresets } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useAuth } from "@/contexts/AuthContext";

// Import screens
import HomeScreen from "../screens/app/HomeScreen";
import AnalyticsScreen from "../screens/app/AnalyticsScreen";
import SettingsScreen from "../screens/app/SettingsScreen";
import AddExpenseScreen from "../screens/app/AddExpenseScreen";
import AddTripScreen from "../screens/app/AddTripScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import SignupScreen from "../screens/auth/SignupScreen";
import OnboardingScreen from "../screens/auth/OnboardingScreen";
import TripDetailScreen from "../screens/app/TripDetailScreen";
import EditTripScreen from "../screens/app/EditTripScreen";
import EditExpenseScreen from "../screens/app/EditExpenseScreen";
import ManageMembersScreen from "../screens/app/ManageMembersScreen";
import SplitExpenseScreen from "../screens/app/SplitExpenseScreen";
import SettleUpScreen from "../screens/app/SettleUpScreen";
import HistoryScreen from "../screens/app/HistoryScreen";
import BalanceScreen from "../screens/app/BalanceScreen";
import CurrencyConverterScreen from "../screens/app/CurrencyConverterScreen";
import InsightsScreen from "../screens/app/InsightsScreen";
import JoinTripScreen from "../screens/app/JoinTripScreen";
import PremiumScreen from "../screens/app/PremiumScreen";
import ScanReceiptScreen from "../screens/app/ScanReceiptScreen";
import ManageCategoriesScreen from "../screens/app/ManageCategoriesScreen";
import ExpenseDetailScreen from "../screens/app/ExpenseDetailScreen";
import AllExpensesScreen from "../screens/app/AllExpensesScreen";
import PlanningScreen from "../screens/app/PlanningScreen";
import NotificationSettingsScreen from "../screens/app/NotificationSettingsScreen";
import ProfileScreen from "../screens/app/ProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Analytics") {
            iconName = focused ? "analytics" : "analytics-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          } else if (route.name === "Planning") {
            iconName = focused ? "compass" : "compass-outline";
          } else {
            iconName = "alert-circle";
          }

          return <Ionicons name={iconName} size={focused ? 26 : 24} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
          height: Platform.select({
            ios: 88,
            android: 64,
            default: 64,
          }),
          paddingBottom: Platform.select({
            ios: 28,
            android: 8,
            default: 8,
          }),
          paddingTop: 8,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: -4,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Planning" component={PlanningScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isGuest } = useAuth();
  const isAuthenticated = user !== null || isGuest;

  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...(Platform.OS === "ios"
          ? TransitionPresets.ModalPresentationIOS
          : TransitionPresets.SlideFromRightIOS),
        cardStyleInterpolator: ({ current, next, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
                {
                  scale: next
                    ? next.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0.95],
                      })
                    : 1,
                },
              ],
              opacity: current.progress.interpolate({
                inputRange: [0, 0.5, 0.9, 1],
                outputRange: [0, 0.25, 0.7, 1],
              }),
            },
            overlayStyle: {
              opacity: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          };
        },
      }}
    >
      {!isAuthenticated ? (
        // Auth Stack
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ 
              presentation: 'card',
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="Signup" 
            component={SignupScreen}
            options={{ 
              presentation: 'card',
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
        </>
      ) : (
        // Main App Stack
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AddExpense" 
            component={AddExpenseScreen}
            options={{
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="AddTrip" 
            component={AddTripScreen}
            options={{
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="EditTrip" 
            component={EditTripScreen}
            options={{
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="EditExpense" 
            component={EditExpenseScreen}
            options={{
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="ManageMembers" 
            component={ManageMembersScreen}
            options={{ 
              headerShown: false,
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="SplitExpense" 
            component={SplitExpenseScreen}
            options={{
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="SettleUp" 
            component={SettleUpScreen}
            options={{ 
              headerShown: false,
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="History" 
            component={HistoryScreen}
            options={{
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="TripDetail" 
            component={TripDetailScreen}
            options={{ 
              headerShown: false,
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="Balance" 
            component={BalanceScreen}
            options={{
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen
            name="CurrencyConverter"
            component={CurrencyConverterScreen}
            options={{
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="Insights" 
            component={InsightsScreen}
            options={{
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="JoinTrip" 
            component={JoinTripScreen}
            options={{
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="Premium" 
            component={PremiumScreen}
            options={{
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="ScanReceipt" 
            component={ScanReceiptScreen}
            options={{
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen
            name="ManageCategories"
            component={ManageCategoriesScreen}
            options={{
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="ExpenseDetail" 
            component={ExpenseDetailScreen}
            options={{
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="AllExpenses" 
            component={AllExpensesScreen}
            options={{ 
              headerShown: false,
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="NotificationSettings" 
            component={NotificationSettingsScreen}
            options={{ 
              headerShown: false,
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{ 
              headerShown: false,
              ...(Platform.OS === "ios" 
                ? TransitionPresets.ModalPresentationIOS
                : TransitionPresets.SlideFromRightIOS),
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
