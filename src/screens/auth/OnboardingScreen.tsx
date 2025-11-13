import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { TouchableNativeFeedback } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingScreenProps {
  navigation: any;
}

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const { setGuestMode } = useAuth();

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  const handleContinueAsGuest = async () => {
    try {
      await setGuestMode();
      // Navigation will happen automatically when guest mode is set
      // Use navigate instead of replace to avoid navigation errors
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error setting guest mode:', error);
    }
  };

  const renderButton = (onPress: () => void, style: any, textStyle: any, text: string, icon?: string) => {
    const buttonContent = (
      <View style={[styles.button, style]}>
        {icon && <Ionicons name={icon as any} size={20} color={textStyle.color} style={styles.buttonIcon} />}
        <Text style={textStyle}>{text}</Text>
      </View>
    );

    if (Platform.OS === 'android') {
      return (
        <TouchableNativeFeedback onPress={onPress} background={TouchableNativeFeedback.Ripple('#FFFFFF20', false)}>
          {buttonContent}
        </TouchableNativeFeedback>
      );
    }

    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {buttonContent}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#667eea', '#764ba2', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo/Icon Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                style={styles.logoGradient}
              >
                <Ionicons name="airplane" size={56} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.appName}>Travel Expense Tracker</Text>
            <Text style={styles.tagline}>Track, Split & Settle with Ease</Text>
            <Text style={styles.subtitle}>Your all-in-one companion for managing travel expenses</Text>
          </View>

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="receipt" size={28} color="#8b5cf6" />
              </View>
              <Text style={styles.featureTitle}>Smart Tracking</Text>
              <Text style={styles.featureDescription}>Automatically categorize and track all your expenses</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="people" size={28} color="#8b5cf6" />
              </View>
              <Text style={styles.featureTitle}>Group Splitting</Text>
              <Text style={styles.featureDescription}>Easily split expenses with friends and family</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="analytics" size={28} color="#8b5cf6" />
              </View>
              <Text style={styles.featureTitle}>Insights</Text>
              <Text style={styles.featureDescription}>Get detailed analytics and spending patterns</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="compass" size={28} color="#8b5cf6" />
              </View>
              <Text style={styles.featureTitle}>Trip Planning</Text>
              <Text style={styles.featureDescription}>Plan your trips with packing lists and activities</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            {renderButton(
              handleSignup,
              styles.primaryButton,
              styles.primaryButtonText,
              'Create Account',
              'person-add'
            )}

            {renderButton(
              handleLogin,
              styles.secondaryButton,
              styles.secondaryButtonText,
              'Sign In',
              'log-in'
            )}

            {renderButton(
              handleContinueAsGuest,
              styles.guestButton,
              styles.guestButtonText,
              'Continue as Guest',
              'person-outline'
            )}

            <Text style={styles.termsText}>
              By continuing, you agree to our{'\n'}
              <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 20 : 40,
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: Platform.OS === 'ios' ? 36 : 32,
    fontWeight: Platform.OS === 'ios' ? '700' : 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
  },
  tagline: {
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  featuresSection: {
    marginVertical: 32,
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsSection: {
    width: '100%',
    marginTop: 24,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: Platform.OS === 'ios' ? 14 : 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  guestButton: {
    backgroundColor: 'transparent',
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  termsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
  termsLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});

