import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

type StudentMeeting = {
  id: string;
  title: string;
  startTime: string;
  joinUrl?: string;
  password?: string;
  duration?: number;
  status?: string;
};

export default function StudentLiveScreen() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<StudentMeeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);

  const formatMeetingDate = (iso: string): string => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const formatMeetingTime = (iso: string): string => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const loadMeetings = async () => {
    if (!user?.id) {
      setIsLoadingMeetings(false);
      return;
    }
    try {
      setIsLoadingMeetings(true);
      const res = await apiService.get<{
        status?: string;
        message?: string;
        data: StudentMeeting[];
      }>(`/zoom/student/meetings`);
      const data = res.data ?? [];
      setMeetings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[StudentLive] Failed to load meetings', error);
      setMeetings([]);
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  const handleJoinMeeting = async (meeting: StudentMeeting) => {
    const url = meeting.joinUrl;
    if (!url) {
      Alert.alert('Unavailable', 'Join link for this meeting is not available.');
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Error', 'Unable to open meeting link.');
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('[StudentLive] Failed to open meeting link', error);
      Alert.alert('Error', 'Failed to open meeting. Please try again.');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadMeetings();
    }, [user?.id])
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Live Sessions</Text>
          <Text style={styles.subtitle}>
            Join your scheduled live classes here.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshButton, isLoadingMeetings && styles.refreshButtonDisabled]}
          onPress={() => loadMeetings()}
          disabled={isLoadingMeetings}
          activeOpacity={0.7}
        >
          {isLoadingMeetings ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="refresh" size={22} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {isLoadingMeetings ? (
        <View style={styles.meetingsLoading}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.meetingsLoadingText}>Loading meetings...</Text>
        </View>
      ) : meetings.length === 0 ? (
        <View style={styles.meetingsEmpty}>
          <Text style={styles.meetingsEmptyTitle}>No upcoming meetings</Text>
          <Text style={styles.meetingsEmptySubtitle}>
            Your live sessions will appear here when scheduled.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.meetingsScroll}
          contentContainerStyle={styles.meetingsList}
          showsVerticalScrollIndicator={false}
        >
          {meetings.map((meeting) => (
            <View key={meeting.id} style={styles.meetingCard}>
              <View style={styles.meetingHeaderRow}>
                <Text style={styles.meetingTitle} numberOfLines={1}>
                  {meeting.title}
                </Text>
                {meeting.status ? (
                  <View style={styles.meetingStatusPill}>
                    <Text style={styles.meetingStatusText}>
                      {String(meeting.status).toLowerCase()}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.meetingMetaRow}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={Colors.textSecondary}
                />
                <Text style={styles.meetingMetaText} numberOfLines={1}>
                  {formatMeetingDate(meeting.startTime)}
                </Text>
              </View>
              <View style={styles.meetingMetaRow}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={Colors.textSecondary}
                />
                <Text style={styles.meetingMetaText} numberOfLines={1}>
                  {formatMeetingTime(meeting.startTime)}
                  {typeof meeting.duration === 'number'
                    ? ` • ${meeting.duration} min`
                    : ''}
                </Text>
              </View>
              {meeting.password ? (
                <View style={styles.meetingMetaRow}>
                  <Ionicons
                    name="key-outline"
                    size={14}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.meetingPasswordLabel}>Password: </Text>
                  <Text style={styles.meetingPasswordValue} selectable>
                    {meeting.password}
                  </Text>
                </View>
              ) : null}
              <View style={styles.meetingActions}>
                <TouchableOpacity
                  style={styles.meetingJoinButton}
                  activeOpacity={0.9}
                  onPress={() => handleJoinMeeting(meeting)}
                  disabled={!meeting.joinUrl}
                >
                  <Ionicons name="videocam-outline" size={18} color="#FFF" />
                  <Text style={styles.meetingJoinButtonText}>Join meeting</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 32,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonDisabled: {
    opacity: 0.7,
  },
  meetingsScroll: {
    marginTop: 8,
    marginBottom: 16,
  },
  meetingsList: {
    paddingBottom: 16,
    gap: 10,
  },
  meetingsLoading: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meetingsLoadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  meetingsEmpty: {
    marginTop: 24,
  },
  meetingsEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  meetingsEmptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  meetingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  meetingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  meetingTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
  },
  meetingStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  meetingStatusText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  meetingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  meetingMetaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  meetingPasswordLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  meetingPasswordValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  meetingActions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  meetingJoinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  meetingJoinButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
});
