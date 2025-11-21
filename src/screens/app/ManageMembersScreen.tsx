import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Surface } from 'react-native-paper';
import { useApp } from '@/contexts/AppContext';

interface ManageMembersScreenProps {
  navigation: any;
  route: any;
}

const AVATAR_COLORS = [
  ['#4ade80', '#22c55e'], // Green
  ['#60a5fa', '#3b82f6'], // Blue
  ['#f472b6', '#ec4899'], // Pink
  ['#a78bfa', '#8b5cf6'], // Purple
  ['#fbbf24', '#f59e0b'], // Amber
  ['#f87171', '#ef4444'], // Red
];

const getAvatarColors = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

export default function ManageMembersScreen({ navigation, route }: ManageMembersScreenProps) {
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
      error: theme?.colors?.error || '#EF4444',
      outline: theme?.colors?.outline || '#E5E5E5',
      outlineVariant: theme?.colors?.outlineVariant || '#E5E5E5',
      primaryContainer: theme?.colors?.primaryContainer || '#EDE9FE',
      onPrimaryContainer: theme?.colors?.onPrimaryContainer || '#000000',
      tertiaryContainer: theme?.colors?.tertiaryContainer || '#FFD8E4',
      onTertiaryContainer: theme?.colors?.onTertiaryContainer || '#31111D',
    },
  };
  const { tripId } = route.params;
  const { getTrip, updateTrip, expenses } = useApp();
  const trip = getTrip(tripId);

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  if (!trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: safeTheme.colors.error }]}>Trip not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      Alert.alert('Error', 'Please enter a member name.');
      return;
    }

    const nameExists = (trip.participants || []).some(
      p => p.name.toLowerCase() === newMemberName.trim().toLowerCase() && p.id !== editingMemberId
    );

    if (nameExists) {
      Alert.alert('Error', 'A member with this name already exists.');
      return;
    }

    let updatedParticipants = [...(trip.participants || [])];

    // If marking as current user, unset isCurrentUser for all other members
    if (isCurrentUser) {
      updatedParticipants = updatedParticipants.map(p => ({ ...p, isCurrentUser: false }));
    }

    if (editingMemberId) {
      updatedParticipants = updatedParticipants.map(p =>
        p.id === editingMemberId
          ? {
            ...p,
            name: newMemberName.trim(),
            email: newMemberEmail.trim() || undefined,
            isCurrentUser: isCurrentUser,
          }
          : p
      );
    } else {
      const newMember = {
        id: `member_${Date.now()}`,
        name: newMemberName.trim(),
        email: newMemberEmail.trim() || undefined,
        avatar: undefined,
        isActive: true,
        isOwner: false,
        isCurrentUser: isCurrentUser,
        joinedAt: new Date().toISOString(),
      };
      updatedParticipants.push(newMember);
    }

    await updateTrip(tripId, { participants: updatedParticipants });

    setNewMemberName('');
    setNewMemberEmail('');
    setIsCurrentUser(false);
    setEditingMemberId(null);
    setIsAddingMember(false);
  };

  const handleEditMember = (member: any) => {
    setNewMemberName(member.name);
    setNewMemberEmail(member.email || '');
    setIsCurrentUser(member.isCurrentUser || false);
    setEditingMemberId(member.id);
    setIsAddingMember(true);
  };

  const handleRemoveMember = (memberId: string) => {
    // Check if member is involved in any expenses
    const tripExpenses = expenses.filter(e => e.tripId === tripId);
    const isInvolved = tripExpenses.some(e =>
      e.paidBy === memberId ||
      e.splitBetween.some(s => s.userId === memberId && s.amount > 0)
    );

    if (isInvolved) {
      Alert.alert(
        'Cannot Remove Member',
        'This member is involved in existing expenses. Please remove or reassign their expenses first.'
      );
      return;
    }

    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member? They will lose access to this trip.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedParticipants = (trip.participants || []).filter(p => p.id !== memberId);
            await updateTrip(tripId, { participants: updatedParticipants });
          },
        },
      ]
    );
  };

  const handleShareInvite = () => {
    const inviteCode = trip.inviteCode || `TRIP${trip.id.slice(-6).toUpperCase()}`;
    Alert.alert(
      'Share Invite Code',
      `Share this code with friends to let them join your trip:\n\n${inviteCode}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy Code', onPress: () => console.log('Code copied') },
        { text: 'Share', onPress: () => console.log('Share via system') },
      ]
    );
  };

  const handleJoinWithCode = () => {
    Alert.alert(
      'Join Trip',
      'Enter the invite code to join this trip:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: () => {
            // This would typically validate the code and add the user
            Alert.alert('Success', 'Successfully joined the trip!');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={['top']}>
      <Surface style={[styles.header, { backgroundColor: safeTheme.colors.surface }]} elevation={2}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={safeTheme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: safeTheme.colors.onSurface }]}>Manage Members</Text>
        <TouchableOpacity
          onPress={handleShareInvite}
          style={styles.shareButton}
        >
          <Ionicons name="share-outline" size={24} color={safeTheme.colors.primary} />
        </TouchableOpacity>
      </Surface>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Surface style={[styles.inviteSection, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
            <LinearGradient
              colors={[safeTheme.colors.primaryContainer, safeTheme.colors.surface]}
              style={styles.inviteGradient}
            >
              <View style={styles.inviteHeader}>
                <View>
                  <Text style={[styles.inviteLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Invite Code</Text>
                  <Text style={[styles.inviteCode, { color: safeTheme.colors.primary }]}>
                    {trip.inviteCode || `TRIP${trip.id.slice(-6).toUpperCase()}`}
                  </Text>
                </View>
                <TouchableOpacity style={[styles.copyButton, { backgroundColor: safeTheme.colors.surface }]} onPress={handleShareInvite}>
                  <Ionicons name="copy-outline" size={20} color={safeTheme.colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.inviteActions}>
                <TouchableOpacity style={[styles.inviteButton, { backgroundColor: safeTheme.colors.primary }]} onPress={handleShareInvite}>
                  <Ionicons name="share-social" size={20} color={safeTheme.colors.onPrimary} />
                  <Text style={[styles.inviteButtonText, { color: safeTheme.colors.onPrimary }]}>Share Invite</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Surface>

          <View style={styles.membersSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>
                Members <Text style={{ color: safeTheme.colors.primary }}>({(trip.participants || []).length})</Text>
              </Text>
              {!isAddingMember && (
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: safeTheme.colors.primary }]}
                  onPress={() => setIsAddingMember(true)}
                >
                  <Ionicons name="add" size={24} color={safeTheme.colors.onPrimary} />
                  <Text style={{ color: safeTheme.colors.onPrimary, fontWeight: '600', marginLeft: 4 }}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {isAddingMember && (
              <Surface style={[styles.addMemberForm, { backgroundColor: safeTheme.colors.surface }]} elevation={4}>
                <Text style={[styles.formTitle, { color: safeTheme.colors.onSurface }]}>
                  {editingMemberId ? 'Edit Member' : 'Add New Member'}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: safeTheme.colors.onSurface }]}>Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: safeTheme.colors.surfaceVariant, color: safeTheme.colors.onSurface }]}
                    placeholder="Enter name"
                    placeholderTextColor={safeTheme.colors.onSurfaceVariant}
                    value={newMemberName}
                    onChangeText={setNewMemberName}
                    autoFocus
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: safeTheme.colors.onSurface }]}>Email (Optional)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: safeTheme.colors.surfaceVariant, color: safeTheme.colors.onSurface }]}
                    placeholder="Enter email"
                    placeholderTextColor={safeTheme.colors.onSurfaceVariant}
                    value={newMemberEmail}
                    onChangeText={setNewMemberEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchLabel, { color: safeTheme.colors.onSurface }]}>This is me</Text>
                    <Text style={[styles.switchDesc, { color: safeTheme.colors.onSurfaceVariant }]}>Mark as current user</Text>
                  </View>
                  <Switch
                    value={isCurrentUser}
                    onValueChange={setIsCurrentUser}
                    trackColor={{ false: safeTheme.colors.surfaceVariant, true: safeTheme.colors.primary }}
                    thumbColor={'#fff'}
                  />
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.formButton, { backgroundColor: safeTheme.colors.surfaceVariant }]}
                    onPress={() => {
                      setIsAddingMember(false);
                      setNewMemberName('');
                      setNewMemberEmail('');
                      setIsCurrentUser(false);
                      setEditingMemberId(null);
                    }}
                  >
                    <Text style={{ color: safeTheme.colors.onSurface }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.formButton, { backgroundColor: safeTheme.colors.primary }]}
                    onPress={handleAddMember}
                  >
                    <Text style={{ color: safeTheme.colors.onPrimary, fontWeight: 'bold' }}>
                      {editingMemberId ? 'Update' : 'Add Member'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Surface>
            )}

            <View style={styles.membersList}>
              {(trip.participants || []).map((member) => (
                <Surface key={member.id} style={[styles.memberCard, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
                  <View style={styles.memberCardContent}>
                    <LinearGradient
                      colors={getAvatarColors(member.name) as [string, string]}
                      style={styles.avatar}
                    >
                      <Text style={styles.avatarText}>{member.name.charAt(0).toUpperCase()}</Text>
                    </LinearGradient>

                    <View style={styles.memberInfo}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.memberName, { color: safeTheme.colors.onSurface }]}>{member.name}</Text>
                        {member.isCurrentUser && (
                          <View style={[styles.badge, { backgroundColor: safeTheme.colors.primaryContainer }]}>
                            <Text style={[styles.badgeText, { color: safeTheme.colors.primary }]}>YOU</Text>
                          </View>
                        )}
                        {member.isOwner && (
                          <View style={[styles.badge, { backgroundColor: safeTheme.colors.tertiaryContainer }]}>
                            <Text style={[styles.badgeText, { color: safeTheme.colors.onTertiaryContainer }]}>OWNER</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.memberEmail, { color: safeTheme.colors.onSurfaceVariant }]}>
                        {member.email || 'No email'} • Joined {new Date(member.joinedAt || Date.now()).toLocaleDateString()}
                      </Text>
                    </View>

                    <View style={styles.memberActions}>
                      <TouchableOpacity onPress={() => handleEditMember(member)} style={styles.iconButton}>
                        <Ionicons name="pencil" size={20} color={safeTheme.colors.onSurfaceVariant} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveMember(member.id)} style={styles.iconButton}>
                        <Ionicons name="trash-outline" size={20} color={safeTheme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Surface>
              ))}
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inviteSection: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  inviteGradient: {
    padding: 20,
  },
  inviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  inviteLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
  },
  inviteActions: {
    flexDirection: 'row',
  },
  inviteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  membersSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
  },
  memberCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  memberEmail: {
    fontSize: 12,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  addMemberForm: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  switchDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  formButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
});
