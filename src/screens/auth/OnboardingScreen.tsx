import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeContext';
import { useTheme } from 'react-native-paper';
import { TouchableNativeFeedback } from 'react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingScreenProps {
  navigation: any;
}

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const { setGuestMode } = useAuth();
  const { isDark } = useThemeMode();
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  
  // Safe theme colors for dynamic adaptation
  const safeTheme = {
    colors: {
      background: theme?.colors?.background || (isDark ? '#111827' : '#FFFFFF'),
      surface: theme?.colors?.surface || (isDark ? '#1f2937' : '#FFFFFF'),
      onSurface: theme?.colors?.onSurface || (isDark ? '#f9fafb' : '#111827'),
      onSurfaceVariant: theme?.colors?.onSurfaceVariant || (isDark ? '#d1d5db' : '#6b7280'),
      primary: theme?.colors?.primary || '#8b5cf6',
      onPrimary: theme?.colors?.onPrimary || '#FFFFFF',
      iconBackground: isDark ? '#374151' : '#F3F4F6',
      iconColor: theme?.colors?.primary || '#8b5cf6',
      textPrimary: isDark ? '#f9fafb' : '#111827',
      textSecondary: isDark ? '#d1d5db' : '#6b7280',
      textTertiary: isDark ? '#9ca3af' : '#9ca3af',
      border: isDark ? '#374151' : '#E5E7EB',
      buttonPrimary: theme?.colors?.primary || '#8b5cf6',
      buttonSecondary: isDark ? '#374151' : '#FFFFFF',
    },
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate('Login');
  };

  const handleSignup = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate('Signup');
  };

  const handleContinueAsGuest = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await setGuestMode();
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error setting guest mode:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Spacer */}
        <View style={styles.topSpacer} />

        {/* Main Content */}
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          {/* App Icon */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: safeTheme.colors.iconBackground }]}>
              <Ionicons name="airplane" size={48} color={safeTheme.colors.iconColor} />
            </View>
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={[styles.mainTitle, { color: safeTheme.colors.textPrimary }]}>Travel Expense Tracker</Text>
            <Text style={[styles.subtitle, { color: safeTheme.colors.textSecondary }]}>
              Track, split, and manage your travel expenses effortlessly
            </Text>
          </View>

          {/* Feature List */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="checkmark-circle" size={24} color={safeTheme.colors.iconColor} />
              </View>
              <Text style={[styles.featureText, { color: safeTheme.colors.textPrimary }]}>Smart expense tracking</Text>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="checkmark-circle" size={24} color={safeTheme.colors.iconColor} />
              </View>
              <Text style={[styles.featureText, { color: safeTheme.colors.textPrimary }]}>Split bills with friends</Text>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="checkmark-circle" size={24} color={safeTheme.colors.iconColor} />
              </View>
              <Text style={[styles.featureText, { color: safeTheme.colors.textPrimary }]}>Visual analytics & insights</Text>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="checkmark-circle" size={24} color={safeTheme.colors.iconColor} />
              </View>
              <Text style={[styles.featureText, { color: safeTheme.colors.textPrimary }]}>Trip planning tools</Text>
            </View>
          </View>
        </Animated.View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actionsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          {/* Primary Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: safeTheme.colors.buttonPrimary }]}
            onPress={handleSignup}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color={safeTheme.colors.onPrimary} style={styles.buttonIcon} />
          </TouchableOpacity>

          {/* Secondary Button */}
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: safeTheme.colors.buttonSecondary, borderColor: safeTheme.colors.border }]}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: safeTheme.colors.textPrimary }]}>Sign In</Text>
          </TouchableOpacity>

          {/* Guest Button */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleContinueAsGuest}
            activeOpacity={0.7}
          >
            <Text style={[styles.guestButtonText, { color: safeTheme.colors.textSecondary }]}>Continue as Guest</Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={[styles.termsText, { color: safeTheme.colors.textTertiary }]}>
            By continuing, you agree to our{' '}
            <Text style={[styles.termsLink, { color: safeTheme.colors.primary }]}>Terms</Text> and{' '}
            <Text style={[styles.termsLink, { color: safeTheme.colors.primary }]}>Privacy Policy</Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  topSpacer: {
    height: Platform.OS === 'ios' ? 60 : 40,
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  featuresList: {
    width: '100%',
    paddingHorizontal: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  featureIcon: {
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  bottomSpacer: {
    flex: 1,
    minHeight: 40,
  },
  actionsContainer: {
    width: '100%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
  },
  primaryButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 0,
  },
  secondaryButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  guestButton: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  termsLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
