import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/app/HomeScreen';
import AnalyticsScreen from '../screens/app/AnalyticsScreen';
import SettingsScreen from '../screens/app/SettingsScreen';
import AddExpenseScreen from '../screens/app/AddExpenseScreen';
import AddTripScreen from '../screens/app/AddTripScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import TripDetailScreen from '../screens/app/TripDetailScreen';
import EditTripScreen from '../screens/app/EditTripScreen';
import EditExpenseScreen from '../screens/app/EditExpenseScreen';
import ManageMembersScreen from '../screens/app/ManageMembersScreen';
import SplitExpenseScreen from '../screens/app/SplitExpenseScreen';
import SettleUpScreen from '../screens/app/SettleUpScreen';
import HistoryScreen from '../screens/app/HistoryScreen';
import BalanceScreen from '../screens/app/BalanceScreen';
import CurrencyConverterScreen from '../screens/app/CurrencyConverterScreen';
import InsightsScreen from '../screens/app/InsightsScreen';
import JoinTripScreen from '../screens/app/JoinTripScreen';
import PremiumScreen from '../screens/app/PremiumScreen';
import ScanReceiptScreen from '../screens/app/ScanReceiptScreen';
import ManageCategoriesScreen from '../screens/app/ManageCategoriesScreen';
import ExpenseDetailScreen from '../screens/app/ExpenseDetailScreen';
import AllExpensesScreen from '../screens/app/AllExpensesScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
      <Stack.Screen name="AddTrip" component={AddTripScreen} />
      <Stack.Screen name="EditTrip" component={EditTripScreen} />
      <Stack.Screen name="EditExpense" component={EditExpenseScreen} />
      <Stack.Screen name="ManageMembers" component={ManageMembersScreen} />
      <Stack.Screen name="SplitExpense" component={SplitExpenseScreen} />
      <Stack.Screen name="SettleUp" component={SettleUpScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen name="Balance" component={BalanceScreen} />
      <Stack.Screen name="CurrencyConverter" component={CurrencyConverterScreen} />
      <Stack.Screen name="Insights" component={InsightsScreen} />
      <Stack.Screen name="JoinTrip" component={JoinTripScreen} />
      <Stack.Screen name="Premium" component={PremiumScreen} />
      <Stack.Screen name="ScanReceipt" component={ScanReceiptScreen} />
      <Stack.Screen name="ManageCategories" component={ManageCategoriesScreen} />
      <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
      <Stack.Screen name="AllExpenses" component={AllExpensesScreen} />
    </Stack.Navigator>
  );
}
