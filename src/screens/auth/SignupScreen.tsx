import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
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
import { AnimatedCard } from '@/components/ui/AnimatedCard';

interface SignupScreenProps {
  navigation: any;
}

export default function SignupScreen({ navigation }: SignupScreenProps) {
  const theme = useTheme();
  
  // Safe defaults for theme colors to prevent runtime errors
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Navigation will happen automatically when auth state changes
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Navigation will happen automatically when auth state changes
    } catch (error: any) {
      if (!error.message?.includes('cancelled') && !error.message?.includes('dismissed')) {
        Alert.alert('Sign Up Failed', error.message || 'Please try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={['top', 'bottom']}>
      <StatusBar style={Platform.OS === 'ios' ? 'dark' : 'auto'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
          >
            <Surface style={styles.header} elevation={0}>
              <AnimatedButton
                mode="text"
                icon="arrow-back"
                onPress={() => {
                  navigation.goBack();
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                label=""
                style={styles.backButton}
              />
              <Text style={[styles.title, { color: safeTheme.colors.onSurface }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: safeTheme.colors.onSurfaceVariant }]}>Sign up to get started</Text>
            </Surface>

            <AnimatedCard variant="elevated" elevation={2} style={styles.card}>
              <View style={styles.form}>
                <AnimatedInput
                  label="Full Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  autoCapitalize="words"
                  left={<TextInput.Icon icon={() => <Ionicons name="person-outline" size={20} />} />}
                  style={styles.input}
                />

                <AnimatedInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  left={<TextInput.Icon icon={() => <Ionicons name="mail-outline" size={20} />} />}
                  style={styles.input}
                />

                <AnimatedInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimum 6 characters"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  left={<TextInput.Icon icon={() => <Ionicons name="lock-closed-outline" size={20} />} />}
                  right={
                    <TextInput.Icon
                      icon={() => (
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
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

                <AnimatedInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  left={<TextInput.Icon icon={() => <Ionicons name="lock-closed-outline" size={20} />} />}
                  right={
                    <TextInput.Icon
                      icon={() => (
                        <Ionicons
                          name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                        />
                      )}
                      onPress={() => {
                        setShowConfirmPassword(!showConfirmPassword);
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                    />
                  }
                  style={styles.input}
                />

                <AnimatedButton
                  mode="contained"
                  label={isLoading ? 'Creating Account...' : 'Create Account'}
                  onPress={handleSignup}
                  loading={isLoading}
                  disabled={isLoading}
                  variant="primary"
                  fullWidth
                  style={styles.signupButton}
                />

                <View style={styles.divider}>
                  <View style={[styles.dividerLine, { backgroundColor: safeTheme.colors.outline }]} />
                  <Text style={[styles.dividerText, { color: safeTheme.colors.onSurfaceVariant }]}>OR</Text>
                  <View style={[styles.dividerLine, { backgroundColor: safeTheme.colors.outline }]} />
                </View>

                <AnimatedButton
                  mode="outlined"
                  label="Sign up with Google"
                  icon="logo-google"
                  onPress={handleGoogleSignup}
                  disabled={isLoading}
                  variant="secondary"
                  fullWidth
                  style={styles.googleButton}
                />

                <View style={styles.loginContainer}>
                  <Text style={[styles.loginText, { color: safeTheme.colors.onSurfaceVariant }]}>
                    Already have an account?{' '}
                  </Text>
                  <AnimatedButton
                    mode="text"
                    label="Sign In"
                    onPress={() => {
                      navigation.navigate('Login');
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    variant="primary"
                  />
                </View>
              </View>
            </AnimatedCard>
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
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    marginBottom: 32,
    backgroundColor: 'transparent',
  },
  backButton: {
    minWidth: 40,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  input: {
    marginBottom: 8,
  },
  signupButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
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
  googleButton: {
    marginBottom: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
  },
});
