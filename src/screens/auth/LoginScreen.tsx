import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Surface, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const theme = useTheme();

  // Safe defaults for theme colors
  const safeTheme = {
    colors: {
      background: theme?.colors?.background || '#FFFFFF',
      surface: theme?.colors?.surface || '#FFFFFF',
      surfaceVariant: theme?.colors?.surfaceVariant || '#F5F5F5',
      onSurface: theme?.colors?.onSurface || '#000000',
      onSurfaceVariant: theme?.colors?.onSurfaceVariant || '#666666',
      primary: theme?.colors?.primary || '#8b5cf6',
      onPrimary: theme?.colors?.onPrimary || '#FFFFFF',
      primaryContainer: theme?.colors?.primaryContainer || '#EDE9FE',
      onPrimaryContainer: theme?.colors?.onPrimaryContainer || '#000000',
      error: theme?.colors?.error || '#EF4444',
      outline: theme?.colors?.outline || '#E5E5E5',
      outlineVariant: theme?.colors?.outlineVariant || '#E5E5E5',
    },
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      navigation.replace('MainTabs');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      if (!error.message?.includes('cancelled') && !error.message?.includes('dismissed')) {
        Alert.alert('Login Failed', error.message || 'Please try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={['top', 'bottom']}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
            style={styles.contentContainer}
          >
            {/* Header Section */}
            <View style={styles.headerSection}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[styles.backButton, { backgroundColor: safeTheme.colors.surfaceVariant }]}
              >
                <Ionicons name="arrow-back" size={24} color={safeTheme.colors.onSurface} />
              </TouchableOpacity>

              <Text style={[styles.title, { color: safeTheme.colors.onSurface }]}>
                Welcome Back
              </Text>
              <Text style={[styles.subtitle, { color: safeTheme.colors.onSurfaceVariant }]}>
                Sign in to continue managing your expenses
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <AnimatedInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                left={<TextInput.Icon icon={() => <Ionicons name="mail-outline" size={20} color={safeTheme.colors.onSurfaceVariant} />} />}
                style={styles.input}
              />

              <AnimatedInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                left={<TextInput.Icon icon={() => <Ionicons name="lock-closed-outline" size={20} color={safeTheme.colors.onSurfaceVariant} />} />}
                right={
                  <TextInput.Icon
                    icon={() => (
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={safeTheme.colors.onSurfaceVariant}
                      />
                    )}
                    onPress={() => {
                      setShowPassword(!showPassword);
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                  />
                }
                style={styles.input}
              />

              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  // Handle forgot password
                }}
                style={styles.forgotButton}
              >
                <Text style={[styles.forgotText, { color: safeTheme.colors.primary }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Actions Section */}
            <View style={styles.bottomSection}>
              <AnimatedButton
                mode="contained"
                label={isLoading ? 'Signing In...' : 'Sign In'}
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                variant="primary"
                style={styles.mainButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              />

              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: safeTheme.colors.outline }]} />
                <Text style={[styles.dividerText, { color: safeTheme.colors.onSurfaceVariant }]}>OR</Text>
                <View style={[styles.dividerLine, { backgroundColor: safeTheme.colors.outline }]} />
              </View>

              <AnimatedButton
                mode="outlined"
                label="Continue with Google"
                icon="logo-google"
                onPress={handleGoogleLogin}
                disabled={isLoading}
                variant="secondary"
                style={styles.googleButton}
                contentStyle={styles.buttonContent}
              />

              <View style={styles.signupContainer}>
                <Text style={[styles.signupText, { color: safeTheme.colors.onSurfaceVariant }]}>
                  Don't have an account?
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('Signup');
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <Text style={[styles.signupLink, { color: safeTheme.colors.primary }]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  formSection: {
    gap: 16,
    marginBottom: 24,
  },
  input: {
    marginBottom: 4,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSection: {
    marginTop: 'auto',
    gap: 16,
  },
  mainButton: {
    borderRadius: 16,
    height: 56,
  },
  googleButton: {
    borderRadius: 16,
    height: 56,
    borderWidth: 1,
  },
  buttonContent: {
    height: 56,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
