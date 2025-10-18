import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { UserPlus, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function JoinTripScreen() {
  const router = useRouter();
  const { trips, updateTrip, user } = useApp();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinTrip = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);

    try {
      const trip = trips.find(t => t.inviteCode === inviteCode.trim().toUpperCase());

      if (!trip) {
        Alert.alert('Error', 'Invalid invite code. Trip not found.');
        setLoading(false);
        return;
      }

      const isAlreadyParticipant = trip.participants.some(p => p.id === user.id);
      
      if (isAlreadyParticipant) {
        Alert.alert('Already Joined', 'You are already a participant in this trip');
        setLoading(false);
        router.push(`/trip/${trip.id}`);
        return;
      }

      const updatedParticipants = [
        ...trip.participants,
        {
          id: user.id,
          name: user.name,
          email: user.email,
          isOwner: false,
        },
      ];

      await updateTrip(trip.id, { participants: updatedParticipants });

      Alert.alert(
        'Success!',
        `You have joined "${trip.name}"`,
        [
          {
            text: 'View Trip',
            onPress: () => router.push(`/trip/${trip.id}`),
          },
        ]
      );
    } catch (error) {
      console.error('Error joining trip:', error);
      Alert.alert('Error', 'Failed to join trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <Users size={64} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Join a Trip</Text>
          <Text style={styles.headerSubtitle}>
            Enter the invite code shared by your friend
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.content}>
        <View style={styles.inputSection}>
          <Text style={styles.label}>Invite Code</Text>
          <TextInput
            style={styles.input}
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="e.g. TRIP123456"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            The invite code is provided by the trip organizer
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.joinButton, loading && styles.joinButtonDisabled]}
          onPress={handleJoinTrip}
          disabled={loading}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.joinButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <UserPlus size={20} color="#FFFFFF" />
                <Text style={styles.joinButtonText}>Join Trip</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
  },
  headerGradient: {
    padding: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#E0E7FF',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  inputSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1E293B',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    letterSpacing: 2,
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  joinButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#64748B',
  },
});
