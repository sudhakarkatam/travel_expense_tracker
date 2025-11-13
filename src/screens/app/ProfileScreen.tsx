import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Surface, Avatar, Divider, List, Switch, TextInput as PaperTextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';
import { useApp } from '@/contexts/AppContext';
import { firestoreService } from '@/services/firestoreService';
import { storage } from '@/utils/storage';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { AnimatedInput } from '@/components/ui/AnimatedInput';

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const theme = useTheme();
  const { user, isGuest, signOut, signIn, signUp, signInWithGoogle } = useAuth();
  const { user: appUser, updateUser, trips, expenses, packingItems, activityItems, settlements, categories, auditLogs } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [name, setName] = useState(user?.name || appUser?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.avatar || appUser?.avatar || null);

  const [isLoginMode, setIsLoginMode] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setProfilePhoto(user.avatar || null);
    } else if (appUser) {
      setName(appUser.name || '');
      setProfilePhoto(appUser.avatar || null);
    }
  }, [user, appUser]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingPhoto(true);
        const imageUri = result.assets[0].uri;
        setProfilePhoto(imageUri);
        
        if (user) {
          try {
            await authService.updateProfile({ avatar: imageUri });
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          } catch (error) {
            console.error('Error updating profile photo:', error);
            Alert.alert('Error', 'Failed to update profile photo. Please try again.');
          }
        } else if (appUser) {
          await updateUser({ ...appUser, avatar: imageUri });
        } else {
          const newUser = {
            id: `user_${Date.now()}`,
            name: name || 'User',
            avatar: imageUri,
            isPro: false,
          };
          await updateUser(newUser);
        }
        setIsUploadingPhoto(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }

    setIsLoading(true);
    try {
      if (user) {
        await authService.updateProfile({ name: name.trim() });
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else if (appUser) {
        await updateUser({ ...appUser, name: name.trim(), email: email.trim() || undefined });
      } else {
        const newUser = {
          id: `user_${Date.now()}`,
          name: name.trim(),
          email: email.trim() || undefined,
          avatar: profilePhoto || undefined,
          isPro: false,
        };
        await updateUser(newUser);
      }
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(loginEmail.trim(), loginPassword);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('MainTabs');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (signupPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await signUp(signupEmail.trim(), signupPassword, signupName.trim());
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('MainTabs');
      }
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      if (!error.message?.includes('cancelled') && !error.message?.includes('dismissed')) {
        Alert.alert('Google Sign-In Failed', error.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncToCloud = async () => {
    if (!user) {
      Alert.alert('Not Signed In', 'Please sign in to sync your data to the cloud.');
      return;
    }

    Alert.alert(
      'Sync to Cloud',
      'This will upload all your trips, expenses, and images to the cloud. This may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync',
          onPress: async () => {
            setIsSyncing(true);
            try {
              const allData = {
                trips,
                expenses,
                packingItems,
                activityItems,
                settlements,
                categories,
                auditLogs: auditLogs || [],
              };

              await firestoreService.syncAllDataToCloud(user.id, allData, true);
              
              const cloudData = await firestoreService.loadAllDataFromCloud(user.id);
              
              await Promise.all([
                storage.saveTrips(cloudData.trips),
                storage.saveExpenses(cloudData.expenses),
                storage.savePackingItems(cloudData.packingItems),
                storage.saveActivityItems(cloudData.activityItems),
                storage.saveSettlements(cloudData.settlements),
                storage.saveCategories(cloudData.categories),
                storage.saveAuditLogs(cloudData.auditLogs),
              ]);
              
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              Alert.alert('Success', 'All data has been synced to the cloud successfully!');
            } catch (error: any) {
              console.error('Sync error:', error);
              Alert.alert('Sync Failed', error.message || 'Failed to sync data. Please try again.');
            } finally {
              setIsSyncing(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  if ((!user && !isGuest) || (isGuest && showAuthForm)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <Surface style={styles.header} elevation={1}>
          <AnimatedButton
            mode="text"
            icon="arrow-back"
            onPress={() => {
              if (isGuest && showAuthForm) {
                setShowAuthForm(false);
                setIsLoginMode(false);
              } else {
                navigation.goBack();
              }
            }}
            label=""
            style={styles.backButton}
          />
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            {isGuest && showAuthForm ? (isLoginMode ? 'Sign In' : 'Sign Up') : 'Profile'}
          </Text>
          <View style={styles.backButton} />
        </Surface>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
          >
            <AnimatedCard variant="elevated" elevation={2} style={styles.authCard}>
              <View style={styles.tabContainer}>
                <AnimatedButton
                  mode={isLoginMode ? 'contained' : 'text'}
                  label="Login"
                  onPress={() => {
                    setIsLoginMode(true);
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  variant="primary"
                  style={styles.tabButton}
                />
                <AnimatedButton
                  mode={!isLoginMode ? 'contained' : 'text'}
                  label="Sign Up"
                  onPress={() => {
                    setIsLoginMode(false);
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  variant="primary"
                  style={styles.tabButton}
                />
              </View>

              {isLoginMode ? (
                <View style={styles.formContainer}>
                  <Text style={[styles.formTitle, { color: theme.colors.onSurface }]}>Welcome Back</Text>
                  <Text style={[styles.formSubtitle, { color: theme.colors.onSurfaceVariant }]}>Sign in to access your profile</Text>

                  <AnimatedInput
                    label="Email"
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    left={<PaperTextInput.Icon icon={() => <Ionicons name="mail-outline" size={20} />} />}
                    style={styles.input}
                  />

                  <AnimatedInput
                    label="Password"
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    placeholder="Enter your password"
                    secureTextEntry
                    autoCapitalize="none"
                    left={<PaperTextInput.Icon icon={() => <Ionicons name="lock-closed-outline" size={20} />} />}
                    style={styles.input}
                  />

                  <AnimatedButton
                    mode="contained"
                    label={isLoading ? 'Signing In...' : 'Sign In'}
                    onPress={handleLogin}
                    loading={isLoading}
                    disabled={isLoading}
                    variant="primary"
                    fullWidth
                    style={styles.primaryButton}
                  />

                  {isGuest && (
                    <AnimatedButton
                      mode="outlined"
                      label="Continue as Guest"
                      onPress={() => {
                        setShowAuthForm(false);
                        setIsLoginMode(false);
                      }}
                      variant="secondary"
                      fullWidth
                      style={styles.secondaryButton}
                    />
                  )}

                  <AnimatedButton
                    mode="contained"
                    label="Sign in with Google"
                    icon="logo-google"
                    onPress={handleGoogleSignIn}
                    loading={isLoading}
                    disabled={isLoading}
                    variant="secondary"
                    fullWidth
                    style={[styles.googleButton, { backgroundColor: '#4285F4' }]}
                  />
                </View>
              ) : (
                <View style={styles.formContainer}>
                  <Text style={[styles.formTitle, { color: theme.colors.onSurface }]}>Create Account</Text>
                  <Text style={[styles.formSubtitle, { color: theme.colors.onSurfaceVariant }]}>Sign up to sync your data</Text>

                  <AnimatedInput
                    label="Full Name"
                    value={signupName}
                    onChangeText={setSignupName}
                    placeholder="Enter your full name"
                    autoCapitalize="words"
                    left={<PaperTextInput.Icon icon={() => <Ionicons name="person-outline" size={20} />} />}
                    style={styles.input}
                  />

                  <AnimatedInput
                    label="Email"
                    value={signupEmail}
                    onChangeText={setSignupEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    left={<PaperTextInput.Icon icon={() => <Ionicons name="mail-outline" size={20} />} />}
                    style={styles.input}
                  />

                  <AnimatedInput
                    label="Password"
                    value={signupPassword}
                    onChangeText={setSignupPassword}
                    placeholder="Minimum 6 characters"
                    secureTextEntry
                    autoCapitalize="none"
                    left={<PaperTextInput.Icon icon={() => <Ionicons name="lock-closed-outline" size={20} />} />}
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
                    style={styles.primaryButton}
                  />

                  {isGuest && (
                    <AnimatedButton
                      mode="outlined"
                      label="Continue as Guest"
                      onPress={() => {
                        setShowAuthForm(false);
                        setIsLoginMode(false);
                      }}
                      variant="secondary"
                      fullWidth
                      style={styles.secondaryButton}
                    />
                  )}

                  <AnimatedButton
                    mode="contained"
                    label="Sign up with Google"
                    icon="logo-google"
                    onPress={handleGoogleSignIn}
                    loading={isLoading}
                    disabled={isLoading}
                    variant="secondary"
                    fullWidth
                    style={[styles.googleButton, { backgroundColor: '#4285F4' }]}
                  />
                </View>
              )}
            </AnimatedCard>
          </MotiView>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Surface style={styles.header} elevation={1}>
        <AnimatedButton
          mode="text"
          icon="arrow-back"
          onPress={() => navigation.goBack()}
          label=""
          style={styles.backButton}
        />
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Profile</Text>
        <AnimatedButton
          mode="text"
          label={isEditing ? 'Cancel' : 'Edit'}
          onPress={() => {
            setIsEditing(!isEditing);
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          variant="primary"
          style={styles.editButton}
        />
      </Surface>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
        >
          <AnimatedCard variant="elevated" elevation={2} style={styles.profileCard}>
            <View style={styles.profilePhotoSection}>
              <TouchableOpacity
                onPress={isEditing ? pickImage : undefined}
                disabled={!isEditing || isUploadingPhoto}
                style={styles.profilePhotoContainer}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                ) : profilePhoto ? (
                  <Avatar.Image size={120} source={{ uri: profilePhoto }} />
                ) : (
                  <Avatar.Text size={120} label={name.charAt(0).toUpperCase() || 'U'} />
                )}
                {isEditing && (
                  <MotiView
                    from={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring' }}
                    style={styles.editPhotoBadge}
                  >
                    <Ionicons name="camera" size={20} color="#fff" />
                  </MotiView>
                )}
              </TouchableOpacity>
              {isEditing && (
                <Text style={[styles.editPhotoHint, { color: theme.colors.onSurfaceVariant }]}>
                  Tap to change photo
                </Text>
              )}
            </View>

            <Divider style={styles.divider} />

            <View style={styles.infoSection}>
              <List.Item
                title="Name"
                description={isEditing ? undefined : (name || 'Not set')}
                left={(props) => <List.Icon {...props} icon="account-outline" />}
                right={() => isEditing ? (
                  <PaperTextInput
                    style={[styles.editInput, { color: theme.colors.onSurface }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    autoCapitalize="words"
                    mode="flat"
                  />
                ) : null}
                titleStyle={{ color: theme.colors.onSurface }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              />

              <List.Item
                title="Email"
                description={email || (isGuest ? 'Guest User' : 'Not set')}
                left={(props) => <List.Icon {...props} icon="email-outline" />}
                titleStyle={{ color: theme.colors.onSurface }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              />

              {user && (
                <List.Item
                  title="Account Type"
                  description={user.provider === 'google' ? 'Google Account' : 'Email Account'}
                  left={(props) => <List.Icon {...props} icon={user.provider === 'google' ? 'google' : 'email'} />}
                  titleStyle={{ color: theme.colors.onSurface }}
                  descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                />
              )}

              {appUser && (
                <List.Item
                  title="Membership"
                  description={appUser.isPro ? 'Pro Member' : 'Free Plan'}
                  left={(props) => <List.Icon {...props} icon={appUser.isPro ? 'star' : 'star-outline'} />}
                  titleStyle={{ color: theme.colors.onSurface }}
                  descriptionStyle={{ color: appUser.isPro ? theme.colors.primary : theme.colors.onSurfaceVariant }}
                />
              )}
            </View>

            {isEditing && (
              <AnimatedButton
                mode="contained"
                label="Save Changes"
                onPress={handleSaveProfile}
                loading={isLoading}
                disabled={isLoading}
                variant="primary"
                fullWidth
                style={styles.saveButton}
              />
            )}
          </AnimatedCard>

          <AnimatedCard variant="elevated" elevation={2} style={styles.actionsCard}>
            <List.Section>
              <List.Subheader style={{ color: theme.colors.onSurface }}>Account</List.Subheader>
              
              {user && (
                <>
                  <List.Item
                    title="Sync All Data to Cloud"
                    description="Upload trips, expenses, and images"
                    left={(props) => (
                      <List.Icon {...props} icon="cloud-upload-outline" color={theme.colors.primary} />
                    )}
                    right={() => isSyncing ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : null}
                    onPress={handleSyncToCloud}
                    disabled={isSyncing}
                    titleStyle={{ color: theme.colors.primary }}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                  />

                  <List.Item
                    title="Sign Out"
                    left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
                    onPress={handleLogout}
                    titleStyle={{ color: theme.colors.error }}
                  />
                </>
              )}

              {isGuest && (
                <>
                  <List.Item
                    title="Sign In to Sync Data"
                    left={(props) => (
                      <List.Icon {...props} icon="login" color={theme.colors.primary} />
                    )}
                    onPress={() => {
                      setIsLoginMode(true);
                      setShowAuthForm(true);
                    }}
                    titleStyle={{ color: theme.colors.primary }}
                  />
                  
                  <List.Item
                    title="Create Account"
                    left={(props) => (
                      <List.Icon {...props} icon="account-plus" color={theme.colors.primary} />
                    )}
                    onPress={() => {
                      setIsLoginMode(false);
                      setShowAuthForm(true);
                    }}
                    titleStyle={{ color: theme.colors.primary }}
                  />
                </>
              )}
            </List.Section>
          </AnimatedCard>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    minWidth: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  editButton: {
    minWidth: 60,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  authCard: {
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
  },
  formContainer: {
    gap: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  primaryButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  secondaryButton: {
    marginBottom: 16,
  },
  googleButton: {
    marginTop: 8,
  },
  profileCard: {
    marginBottom: 16,
  },
  profilePhotoSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  profilePhotoContainer: {
    position: 'relative',
  },
  editPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  editPhotoHint: {
    marginTop: 12,
    fontSize: 14,
  },
  divider: {
    marginVertical: 16,
  },
  infoSection: {
    paddingVertical: 8,
  },
  editInput: {
    fontSize: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#8b5cf6',
    minWidth: 150,
  },
  saveButton: {
    marginTop: 16,
  },
  actionsCard: {
    marginTop: 16,
  },
});
