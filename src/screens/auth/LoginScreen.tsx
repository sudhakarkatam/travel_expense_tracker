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

export default function LoginScreen({ navigation }: any) {
  const theme = useTheme();
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
      // Navigation will happen automatically when auth state changes
    } catch (error: any) {
      if (!error.message?.includes('cancelled') && !error.message?.includes('dismissed')) {
        Alert.alert('Login Failed', error.message || 'Please try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
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
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>Sign in to continue</Text>
            </Surface>

            <AnimatedCard variant="elevated" elevation={2} style={styles.card}>
              <View style={styles.form}>
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
                  placeholder="Enter your password"
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

                <AnimatedButton
                  mode="text"
                  label="Forgot Password?"
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  variant="primary"
                  style={styles.forgotButton}
                />

                <AnimatedButton
                  mode="contained"
                  label={isLoading ? 'Signing In...' : 'Sign In'}
                  onPress={handleLogin}
                  loading={isLoading}
                  disabled={isLoading}
                  variant="primary"
                  fullWidth
                  style={styles.loginButton}
                />

                <View style={styles.divider}>
                  <View style={[styles.dividerLine, { backgroundColor: theme.colors.outline }]} />
                  <Text style={[styles.dividerText, { color: theme.colors.onSurfaceVariant }]}>OR</Text>
                  <View style={[styles.dividerLine, { backgroundColor: theme.colors.outline }]} />
                </View>

                <AnimatedButton
                  mode="outlined"
                  label="Continue with Google"
                  icon="logo-google"
                  onPress={handleGoogleLogin}
                  disabled={isLoading}
                  variant="secondary"
                  fullWidth
                  style={styles.googleButton}
                />

                <View style={styles.signupContainer}>
                  <Text style={[styles.signupText, { color: theme.colors.onSurfaceVariant }]}>
                    Don't have an account?{' '}
                  </Text>
                  <AnimatedButton
                    mode="text"
                    label="Sign Up"
                    onPress={() => {
                      navigation.navigate('Signup');
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  loginButton: {
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
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  signupText: {
    fontSize: 14,
  },
});
