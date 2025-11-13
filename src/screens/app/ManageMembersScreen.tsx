import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Surface } from 'react-native-paper';
import { useApp } from '@/contexts/AppContext';

interface ManageMembersScreenProps {
  navigation: any;
  route: any;
}

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
    },
  };
  const { tripId } = route.params;
  const { getTrip, updateTrip } = useApp();
  const trip = getTrip(tripId);
  
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isCurrentUser, setIsCurrentUser] = useState(false);

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

    // If marking as current user, unset isCurrentUser for all other members
    let updatedParticipants = [...(trip.participants || [])];
    if (isCurrentUser) {
      updatedParticipants = updatedParticipants.map(p => ({ ...p, isCurrentUser: false }));
    }

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
    await updateTrip(tripId, { participants: updatedParticipants });
    
    setNewMemberName('');
    setNewMemberEmail('');
    setIsCurrentUser(false);
    setIsAddingMember(false);
  };

  const handleRemoveMember = (memberId: string) => {
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
      <Surface style={[styles.header, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
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

      <ScrollView style={styles.content}>
        <Surface style={[styles.inviteSection, { backgroundColor: safeTheme.colors.surface }]} elevation={1}>
          <View style={[styles.inviteCodeContainer, { backgroundColor: safeTheme.colors.surfaceVariant }]}>
            <Text style={[styles.inviteCodeLabel, { color: safeTheme.colors.onSurfaceVariant }]}>Invite Code</Text>
            <Text style={[styles.inviteCode, { color: safeTheme.colors.primary }]}>{trip.inviteCode || `TRIP${trip.id.slice(-6).toUpperCase()}`}</Text>
          </View>
          
          <View style={styles.inviteActions}>
            <TouchableOpacity style={[styles.inviteButton, { backgroundColor: safeTheme.colors.surfaceVariant }]} onPress={handleShareInvite}>
              <Ionicons name="share-outline" size={20} color={safeTheme.colors.primary} />
              <Text style={[styles.inviteButtonText, { color: safeTheme.colors.primary }]}>Share Invite</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.inviteButton, { backgroundColor: safeTheme.colors.surfaceVariant }]} onPress={handleJoinWithCode}>
              <Ionicons name="add-circle-outline" size={20} color={safeTheme.colors.primary} />
              <Text style={[styles.inviteButtonText, { color: safeTheme.colors.primary }]}>Join with Code</Text>
            </TouchableOpacity>
          </View>
        </Surface>

        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: safeTheme.colors.onSurface }]}>Members ({(trip.participants || []).length})</Text>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: safeTheme.colors.primary }]}
              onPress={() => setIsAddingMember(true)}
            >
              <Ionicons name="add" size={20} color={safeTheme.colors.onPrimary} />
            </TouchableOpacity>
          </View>

          {(trip.participants || []).map((member) => (
            <Surface key={member.id} style={[styles.memberItem, { backgroundColor: safeTheme.colors.surface, borderBottomColor: safeTheme.colors.outlineVariant }]} elevation={1}>
              <View style={styles.memberInfo}>
                <View style={[styles.memberAvatar, { backgroundColor: safeTheme.colors.primary }]}>
                  <Text style={[styles.memberInitial, { color: safeTheme.colors.onPrimary }]}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberDetails}>
                  <View style={styles.memberNameRow}>
                    <Text style={[styles.memberName, { color: safeTheme.colors.onSurface }]}>{member.name}</Text>
                    {member.isCurrentUser && (
                      <View style={[styles.currentUserBadge, { backgroundColor: safeTheme.colors.primaryContainer }]}>
                        <Text style={[styles.currentUserText, { color: safeTheme.colors.onPrimaryContainer }]}>You</Text>
                      </View>
                    )}
                  </View>
                  {member.email && (
                    <Text style={[styles.memberEmail, { color: safeTheme.colors.onSurfaceVariant }]}>{member.email}</Text>
                  )}
                  <Text style={[styles.memberJoined, { color: safeTheme.colors.onSurfaceVariant }]}>
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => handleRemoveMember(member.id)}
              >
                <Ionicons name="close-circle" size={24} color={safeTheme.colors.error} />
              </TouchableOpacity>
            </Surface>
          ))}

          {isAddingMember && (
            <Surface style={[styles.addMemberForm, { backgroundColor: safeTheme.colors.surface }]} elevation={2}>
              <Text style={[styles.formTitle, { color: safeTheme.colors.onSurface }]}>Add New Member</Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: safeTheme.colors.onSurface }]}>Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: safeTheme.colors.surfaceVariant, borderColor: safeTheme.colors.outlineVariant, color: safeTheme.colors.onSurface }]}
                  placeholder="Enter member name"
                  placeholderTextColor={safeTheme.colors.onSurfaceVariant}
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: safeTheme.colors.onSurface }]}>Email (optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: safeTheme.colors.surfaceVariant, borderColor: safeTheme.colors.outlineVariant, color: safeTheme.colors.onSurface }]}
                  placeholder="Enter email address"
                  placeholderTextColor={safeTheme.colors.onSurfaceVariant}
                  value={newMemberEmail}
                  onChangeText={setNewMemberEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <View style={styles.switchContainer}>
                  <Text style={[styles.label, { color: safeTheme.colors.onSurface }]}>This is me (Current User)</Text>
                  <Switch
                    value={isCurrentUser}
                    onValueChange={setIsCurrentUser}
                    trackColor={{ false: safeTheme.colors.surfaceVariant, true: safeTheme.colors.primary }}
                    thumbColor={isCurrentUser ? safeTheme.colors.onPrimary : safeTheme.colors.onSurfaceVariant}
                  />
                </View>
                <Text style={[styles.switchDescription, { color: safeTheme.colors.onSurfaceVariant }]}>
                  Mark this member as yourself for easier expense tracking
                </Text>
              </View>
              
              <View style={styles.formActions}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { backgroundColor: safeTheme.colors.surfaceVariant }]}
                  onPress={() => {
                    setIsAddingMember(false);
                    setNewMemberName('');
                    setNewMemberEmail('');
                    setIsCurrentUser(false);
                  }}
                >
                  <Text style={[styles.cancelText, { color: safeTheme.colors.onSurface }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.addMemberButton, { backgroundColor: safeTheme.colors.primary }]}
                  onPress={handleAddMember}
                >
                  <Text style={[styles.addMemberText, { color: safeTheme.colors.onPrimary }]}>Add Member</Text>
                </TouchableOpacity>
              </View>
            </Surface>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inviteSection: {
    marginBottom: 24,
  },
  inviteCodeContainer: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  inviteCodeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  inviteCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'monospace',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderRadius: 8,
    gap: 8,
  },
  inviteButtonText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  membersSection: {
    marginBottom: 24,
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
    color: '#333',
  },
  addButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  memberJoined: {
    fontSize: 12,
    color: '#999',
  },
  removeButton: {
    padding: 4,
  },
  addMemberForm: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  addMemberButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
  },
  addMemberText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
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
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  currentUserBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  currentUserText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});
