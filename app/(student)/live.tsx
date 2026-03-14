import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  Share,
  RefreshControl,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { Typography } from '@/constants/typography';

type StudentMeeting = {
  id: string;
  title: string;
  startTime: string;
  joinUrl?: string;
  password?: string;
  duration?: number;
  status?: string;
  description?: string;
  instructorName?: string;
};

const now = () => new Date();

export default function StudentLiveScreen() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<StudentMeeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadMeetings();
    setIsRefreshing(false);
  };

  const getEndTime = (m: StudentMeeting): Date => {
    const start = new Date(m.startTime);
    const mins = typeof m.duration === 'number' ? m.duration : 90;
    return new Date(start.getTime() + mins * 60 * 1000);
  };

  const { activeMeeting, heroMeeting, upcomingList, pastList } = useMemo(() => {
    const n = now().getTime();
    let active: StudentMeeting | null = null;
    const upcoming: StudentMeeting[] = [];
    const past: StudentMeeting[] = [];
    const sorted = [...meetings].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    for (const m of sorted) {
      const start = new Date(m.startTime).getTime();
      const end = getEndTime(m).getTime();
      if (start <= n && end >= n) {
        if (!active) active = m;
        else upcoming.push(m);
      } else if (start > n) upcoming.push(m);
      else past.push(m);
    }
    // When no meeting is "live", show the next upcoming one in the hero so the card is visible
    const heroMeeting = active ?? (upcoming[0] ?? null);
    const upcomingForList = active ? upcoming : upcoming.slice(1);
    return {
      activeMeeting: active,
      heroMeeting,
      upcomingList: upcomingForList,
      pastList: past,
    };
  }, [meetings]);

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

  const formatTimeRange = (m: StudentMeeting): string => {
    const start = new Date(m.startTime);
    const end = getEndTime(m);
    const today = now();
    const isToday =
      start.getDate() === today.getDate() &&
      start.getMonth() === today.getMonth() &&
      start.getFullYear() === today.getFullYear();
    const dayLabel = isToday ? 'Today' : formatMeetingDate(m.startTime);
    return `${dayLabel}, ${formatMeetingTime(m.startTime)} - ${end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatDateBox = (iso: string): { day: string; month: string } => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return { day: '—', month: '—' };
      return {
        day: d.getDate().toString(),
        month: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
      };
    } catch {
      return { day: '—', month: '—' };
    }
  };

  const copyPassword = async (password: string) => {
    try {
      await Share.share({ message: password, title: 'Meeting password' });
    } catch {
      Alert.alert('Password', password);
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
      
      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabLabel, activeTab === 'upcoming' && styles.tabLabelActive]}>
            Upcoming
          </Text>
          {activeTab === 'upcoming' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabLabel, activeTab === 'past' && styles.tabLabelActive]}>
            Past
          </Text>
          {activeTab === 'past' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>

      {isLoadingMeetings ? (
        <View style={styles.meetingsLoading}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.meetingsLoadingText}>Loading meetings...</Text>
        </View>
      ) : activeTab === 'past' ? (
        <ScrollView
          style={styles.meetingsScroll}
          contentContainerStyle={styles.meetingsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {pastList.length === 0 ? (
            <View style={styles.meetingsEmpty}>
              <Text style={styles.meetingsEmptyTitle}>No past sessions</Text>
              <Text style={styles.meetingsEmptySubtitle}>
                Past live sessions will appear here.
              </Text>
            </View>
          ) : (
            pastList.map((meeting) => (
              <View key={meeting.id} style={styles.pastCard}>
                <View style={styles.pastDateBox}>
                  <Text style={styles.pastDateDay}>{formatDateBox(meeting.startTime).day}</Text>
                  <Text style={styles.pastDateMonth}>{formatDateBox(meeting.startTime).month}</Text>
                </View>
                <View style={styles.pastContent}>
                  <Text style={styles.pastTitle} numberOfLines={1}>{meeting.title}</Text>
                  <Text style={styles.pastMeta}>
                    {formatMeetingTime(meeting.startTime)}
                    {meeting.instructorName ? ` • ${meeting.instructorName}` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.meetingsScroll}
          contentContainerStyle={styles.meetingsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {/* Hero card: show active (LIVE NOW) or next upcoming so the card is always visible */}
          {heroMeeting ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {activeMeeting ? 'Active Sessions' : 'Next session'}
                </Text>
                {activeMeeting ? (
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>LIVE NOW</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.heroCard}>
                <View style={styles.heroThumbnail}>
                  <Ionicons name="videocam-outline" size={40} color={Colors.primary} />
                  <View style={styles.heroOverlay}>
                    <Ionicons name="people-outline" size={14} color="#FFF" />
                    <Text style={styles.heroOverlayText}>— watching</Text>
                  </View>
                </View>
                <Text style={styles.heroTitle} numberOfLines={1}>{heroMeeting.title}</Text>
                <Text style={styles.heroTime}>{formatTimeRange(heroMeeting)}</Text>
                {heroMeeting.description ? (
                  <Text style={styles.heroDesc} numberOfLines={2}>
                    {heroMeeting.description}
                  </Text>
                ) : (
                  <Text style={styles.heroDesc} numberOfLines={2}>
                    Join this live session to participate.
                  </Text>
                )}
                {heroMeeting.password ? (
                  <View style={styles.passwordRow}>
                    <Text style={styles.passwordLabel}>MEETING PASSWORD</Text>
                    <View style={styles.passwordField}>
                      <Text style={styles.passwordValue} selectable>
                        {heroMeeting.password}
                      </Text>
                      <TouchableOpacity
                        onPress={() => copyPassword(heroMeeting.password!)}
                        style={styles.copyBtn}
                        hitSlop={8}
                      >
                        <Ionicons name="copy-outline" size={18} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.joinBtn}
                  activeOpacity={0.9}
                  onPress={() => handleJoinMeeting(heroMeeting)}
                  disabled={!heroMeeting.joinUrl}
                >
                  <Ionicons name="videocam" size={20} color="#FFF" />
                  <Text style={styles.joinBtnText}>Join Zoom Meeting</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Coming up next */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coming up next</Text>
            {upcomingList.length === 0 && !heroMeeting ? (
              <View style={styles.meetingsEmpty}>
                <Text style={styles.meetingsEmptyTitle}>No upcoming meetings</Text>
                <Text style={styles.meetingsEmptySubtitle}>
                  Your live sessions will appear here when scheduled.
                </Text>
              </View>
            ) : (
              upcomingList.map((meeting) => {
                const { day, month } = formatDateBox(meeting.startTime);
                return (
                  <View key={meeting.id} style={styles.upcomingCard}>
                    <View style={styles.upcomingDateBox}>
                      <Text style={styles.upcomingDateDay}>{day}</Text>
                      <Text style={styles.upcomingDateMonth}>{month}</Text>
                    </View>
                    <View style={styles.upcomingContent}>
                      <Text style={styles.upcomingTitle} numberOfLines={1}>
                        {meeting.title}
                      </Text>
                      <Text style={styles.upcomingMeta}>
                        {formatMeetingTime(meeting.startTime)}
                        {meeting.instructorName ? ` • ${meeting.instructorName}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.bellBtn} hitSlop={8}>
                      <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
  },

  tabsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tabItem: {
    marginRight: 24,
  },
  tabLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  tabUnderline: {
    marginTop: 4,
    height: 2,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  meetingsScroll: {
    flex: 1,
    marginBottom: 16,
  },
  meetingsList: {
    paddingBottom: 24,
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
    fontFamily: Typography.fontFamily.regular,
  },
  meetingsEmpty: {
    marginTop: 24,
  },
  meetingsEmptyTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
    marginBottom: 4,
  },
  meetingsEmptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: Typography.fontFamily.extraBold,
  },
  liveBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  heroCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroThumbnail: {
    height: 160,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  heroOverlayText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    top: -2,
    color: '#FFF',
  },
  heroTitle: {
    fontSize: 17,
    color: Colors.text,
    fontFamily: Typography.fontFamily.extraBold,
    marginTop: 12,
    marginHorizontal: 14,
  },
  heroTime: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 4,
    marginHorizontal: 14,
    fontFamily: Typography.fontFamily.regular,
  },
  heroDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    marginHorizontal: 14,
    lineHeight: 20,
    fontFamily: Typography.fontFamily.regular,
  },
  passwordRow: {
    marginTop: 14,
    marginHorizontal: 14,
  },
  passwordLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.5,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  passwordField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.inputBackground,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordValue: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  copyBtn: {
    padding: 4,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  joinBtnText: {
    fontSize: 15,
    top: -2,
    color: '#FFF',
    fontFamily: Typography.fontFamily.semiBold,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 12,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  upcomingDateBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  upcomingDateDay: {
    fontSize: 18,
    color: '#FFF',
    fontFamily: Typography.fontFamily.extraBold,
  },
  upcomingDateMonth: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontFamily: Typography.fontFamily.regular,
  },
  upcomingContent: {
    flex: 1,
    minWidth: 0,
  },
  upcomingTitle: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: Typography.fontFamily.extraBold,
  },
  upcomingMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontFamily: Typography.fontFamily.regular,
  },
  upcomingIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  upcomingId: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  bellBtn: {
    padding: 4,
  },
  pastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 12,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  pastDateBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pastDateDay: {
    fontSize: 18,
    color: Colors.text,
    fontFamily: Typography.fontFamily.extraBold,
  },
  pastDateMonth: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
    fontFamily: Typography.fontFamily.regular,
  },
  pastContent: {
    flex: 1,
    minWidth: 0,
  },
  pastTitle: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: Typography.fontFamily.extraBold,
  },
  pastMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontFamily: Typography.fontFamily.regular,
  },
});
