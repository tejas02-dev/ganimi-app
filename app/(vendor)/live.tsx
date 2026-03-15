import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
  RefreshControl,
  Linking,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';
import { VendorVerificationGate } from '@/components/VendorVerificationGate';
import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { serviceService } from '@/services/service.service';
import { batchService, type ServiceBatch } from '@/services/batch.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

type ZoomMeeting = {
  id: string;
  title: string;
  startTime: string;
  joinUrl?: string;
  startUrl?: string;
  duration?: number;
  status?: string;
  serviceTitle?: string;
  batchName?: string;
  studentsEnrolled?: number;
};

type TabKey = 'all' | 'today' | 'upcoming' | 'past';

type MeetingStatus = 'in_progress' | 'starts_soon' | 'upcoming' | 'past';

function getMeetingStatus(meeting: ZoomMeeting): MeetingStatus {
  const now = Date.now();
  const start = new Date(meeting.startTime).getTime();
  const duration = (meeting.duration ?? 60) * 60000;
  const end = start + duration;
  if (now >= start && now <= end) return 'in_progress';
  if (start > now && start - now <= 15 * 60000) return 'starts_soon';
  if (start > now) return 'upcoming';
  return 'past';
}

function getStatusBadgeStyle(status: MeetingStatus): { bg: string; text: string; dot?: string; label: string } {
  if (status === 'in_progress') return { bg: '#FFF7ED', text: '#D97706', dot: '#EF4444', label: 'IN PROGRESS' };
  if (status === 'starts_soon') {
    // compute how many minutes
    return { bg: '#FEFCE8', text: '#CA8A04', label: 'STARTS SOON' };
  }
  if (status === 'upcoming') return { bg: '#F1F5F9', text: '#64748B', label: 'UPCOMING' };
  return { bg: '#F1F5F9', text: '#94A3B8', label: 'PAST' };
}

function formatTimeRange(iso: string, duration?: number): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);
    const meetingDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let dayLabel = '';
    if (meetingDay.getTime() === today.getTime()) dayLabel = 'Today';
    else if (meetingDay.getTime() === tomorrow.getTime()) dayLabel = 'Tomorrow';
    else dayLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const startTime = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (duration) {
      const endD = new Date(d.getTime() + duration * 60000);
      const endTime = endD.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      return `${dayLabel}, ${startTime} - ${endTime}`;
    }
    return `${dayLabel}, ${startTime}`;
  } catch {
    return iso;
  }
}

function isToday(iso: string): boolean {
  try {
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  } catch { return false; }
}

export default function VendorLiveScreen() {
  const insets = useSafeAreaInsets();
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingPassword, setMeetingPassword] = useState('');
  const [meetingDuration, setMeetingDuration] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [vendorServices, setVendorServices] = useState<{ id: string; name: string }[]>([]);
  const [serviceBatches, setServiceBatches] = useState<ServiceBatch[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const parseDateOrToday = (value: string) => {
    if (!value) return new Date();
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return new Date();
    return d;
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type !== 'set' || !date) {
      setShowDatePicker(false);
      return;
    }
    const iso = date.toISOString().slice(0, 10);
    setMeetingDate(iso);
    setShowDatePicker(false);
  };

  const formatTimeLabel = (value?: string) => {
    if (!value) return '';
    const [hh, mm] = value.split(':');
    const hours = Number.parseInt(hh ?? '', 10);
    if (Number.isNaN(hours)) return value;
    const period = hours < 12 ? 'AM' : 'PM';
    const hour12 = hours % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${mm ?? '00'} ${period}`;
  };

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type !== 'set' || !date) {
      setShowTimePicker(false);
      return;
    }
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    setMeetingTime(`${hh}:${mm}`);
    setShowTimePicker(false);
  };

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

  const loadMeetings = async (isRefresh?: boolean) => {
    try {
      if (!isRefresh) setIsLoadingMeetings(true);
      const res = await apiService.get<{
        status: string;
        message: string;
        data: ZoomMeeting[];
      }>('/zoom/meetings');
      const data = res.data ?? [];
      setMeetings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[VendorLive] Failed to load meetings', error);
      setMeetings([]);
    } finally {
      setIsLoadingMeetings(false);
      setIsRefreshing(false);
    }
  };

  const handleStartMeeting = async (meeting: ZoomMeeting) => {
    const url = meeting.startUrl;
    if (!url) {
      Alert.alert('Unavailable', 'Start URL for this meeting is not available.');
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
      console.error('[VendorLive] Failed to open meeting link', error);
      Alert.alert('Error', 'Failed to open meeting. Please try again.');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadMeetings();
    }, [])
  );

  const filteredMeetings = useMemo(() => {
    const now = Date.now();
    let list = meetings;
    if (activeTab === 'today') list = meetings.filter((m) => isToday(m.startTime));
    else if (activeTab === 'upcoming') list = meetings.filter((m) => new Date(m.startTime).getTime() > now);
    else if (activeTab === 'past') list = meetings.filter((m) => {
      const start = new Date(m.startTime).getTime();
      const end = start + (m.duration ?? 60) * 60000;
      return end < now;
    });
    return [...list].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [meetings, activeTab]);

  const openCreateModal = async () => {
    setModalVisible(true);
    setShowServiceDropdown(false);
    setShowBatchDropdown(false);
    try {
      setIsLoadingServices(true);
      const svcRes = await serviceService.getVendorServices();
      const services = ((svcRes as any).data ?? []) as { id: string; name: string }[];
      setVendorServices(Array.isArray(services) ? services : []);
      setSelectedServiceId(null);
      setSelectedBatchId(null);
      setServiceBatches([]);
    } catch (error) {
      // Silently fail; user can still attempt meeting creation
      console.error('[VendorLive] Failed to load vendor options', error);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const loadBatchesForService = async (serviceId: string) => {
    try {
      setIsLoadingBatches(true);
      const res = await batchService.getBatchesForService(serviceId);
      const data = ((res as any).data ?? []) as ServiceBatch[];
      setServiceBatches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[VendorLive] Failed to load batches for service', error);
      setServiceBatches([]);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const closeCreateModal = () => {
    if (isCreatingMeeting) return;
    setModalVisible(false);
  };

  const handleCreateMeeting = async () => {
    if (isCreatingMeeting) return;

    if (!meetingTitle.trim()) {
      Alert.alert('Validation', 'Please enter a meeting title.');
      return;
    }

    setIsCreatingMeeting(true);
    try {
      const payload: any = {
        title: meetingTitle.trim(),
        date: meetingDate || undefined,
        time: meetingTime || undefined,
        password: meetingPassword || undefined,
        duration: meetingDuration ? Number(meetingDuration) : undefined,
      };

      await apiService.post('/zoom/create-meeting', {
        title: payload.title,
        date: meetingDate || undefined,
        time: meetingTime || undefined,
        duration: payload.duration,
        password: payload.password,
        serviceId: selectedServiceId || undefined,
        batchId: selectedBatchId || undefined,
      });
      Alert.alert('Success', 'Meeting created successfully.');
      setModalVisible(false);

      // Reset form
      setMeetingTitle('');
      setMeetingDate('');
      setMeetingTime('');
      setMeetingPassword('');
      setMeetingDuration('');
      setSelectedServiceId(null);
      setSelectedBatchId(null);
    } catch (error: any) {
      const message =
        error?.message || 'Failed to create meeting. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const renderMeetingCard = ({ item: meeting }: { item: ZoomMeeting }) => {
    const status = getMeetingStatus(meeting);
    const badge = getStatusBadgeStyle(status);
    const timeRange = formatTimeRange(meeting.startTime, meeting.duration);

    return (
      <View style={styles.meetingCard}>
        {/* Top row: status badge + Zoom badge */}
        <View style={styles.meetingCardTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            {badge.dot ? <View style={[styles.statusDot, { backgroundColor: badge.dot }]} /> : null}
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
          <View style={styles.zoomBadge}>
            <Ionicons name="videocam" size={13} color={Colors.primary} />
            <Text style={styles.zoomBadgeText}>Zoom</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.meetingTitle} numberOfLines={2}>{meeting.title}</Text>

        {/* Service / Batch subtitle */}
        {(meeting.serviceTitle || meeting.batchName) ? (
          <Text style={styles.meetingSubtitle} numberOfLines={1}>
            {meeting.serviceTitle ?? meeting.batchName}
          </Text>
        ) : null}

        {/* Time range */}
        <View style={styles.meetingMetaRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.meetingMetaText}>{timeRange}</Text>
        </View>

        {/* Students enrolled */}
        {typeof meeting.studentsEnrolled === 'number' ? (
          <View style={styles.meetingMetaRow}>
            <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.meetingMetaText}>{meeting.studentsEnrolled} Students Enrolled</Text>
          </View>
        ) : null}

        {/* Action button */}
        {status !== 'past' ? (
          <TouchableOpacity
            style={styles.meetingStartButton}
            activeOpacity={0.9}
            onPress={() => handleStartMeeting(meeting)}
          >
            <Text style={styles.meetingStartButtonText}>Start Meeting</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <VendorVerificationGate>
      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabsRow}>
          {(['all', 'today', 'upcoming', 'past'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabChipText, activeTab === tab && styles.tabChipTextActive]}>
                {tab === 'all' ? 'All Sessions' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoadingMeetings && !isRefreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.meetingsLoadingText}>Loading meetings...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredMeetings}
            keyExtractor={(item) => item.id}
            renderItem={renderMeetingCard}
            contentContainerStyle={styles.meetingsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => { setIsRefreshing(true); loadMeetings(true); }}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.meetingsEmpty}>
                <Ionicons name="videocam-outline" size={48} color={Colors.textSecondary} />
                <Text style={styles.meetingsEmptyTitle}>No meetings found</Text>
                <Text style={styles.meetingsEmptySubtitle}>
                  Create a Zoom meeting using the + button below.
                </Text>
              </View>
            }
          />
        )}

        <TouchableOpacity
          style={[styles.fab, { bottom: 16  }]}
          onPress={openCreateModal}
          activeOpacity={0.8}
          disabled={isCreatingMeeting}
        >
          {isCreatingMeeting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="add" size={28} color="#FFF" />
          )}
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeCreateModal}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Create Meeting</Text>
                  <Text style={styles.modalSubtitle}>Set up a new live class for your students.</Text>
                </View>
                <TouchableOpacity
                  onPress={closeCreateModal}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Meeting Title *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={meetingTitle}
                      onChangeText={setMeetingTitle}
                      placeholder="e.g. Algebra Basics – Chapter 1"
                      placeholderTextColor={Colors.placeholder}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.rowItem]}>
                    <Text style={styles.inputLabel}>Date</Text>
                    <TouchableOpacity
                      style={styles.inputContainer}
                      activeOpacity={0.8}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <View style={styles.dateInputInner}>
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color={Colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.inputValueText,
                            !meetingDate && styles.placeholderText,
                          ]}
                          numberOfLines={1}
                        >
                          {meetingDate
                            ? (() => {
                                const [yyyy, mm, dd] = meetingDate.split('-');
                                if (yyyy && mm && dd) {
                                  return `${dd}-${mm}-${yyyy}`;
                                }
                                return meetingDate;
                              })()
                            : 'DD-MM-YYYY'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.inputGroup, styles.rowItem]}>
                    <Text style={styles.inputLabel}>Time</Text>
                    <TouchableOpacity
                      style={[styles.inputContainer, styles.dropdownTrigger]}
                      activeOpacity={0.8}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          !meetingTime && styles.placeholderText,
                        ]}
                        numberOfLines={1}
                      >
                        {meetingTime ? formatTimeLabel(meetingTime) : 'Select time'}
                      </Text>
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={Colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Service</Text>
                  <TouchableOpacity
                    style={[styles.inputContainer, styles.dropdownTrigger]}
                    activeOpacity={0.8}
                    onPress={() => setShowServiceDropdown((prev) => !prev)}
                    disabled={isLoadingServices || !vendorServices.length}
                  >
                    {isLoadingServices ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.dropdownText,
                            !selectedServiceId && styles.placeholderText,
                          ]}
                          numberOfLines={1}
                        >
                          {selectedServiceId
                            ? vendorServices.find((s) => s.id === selectedServiceId)?.name ??
                              'Select a service'
                            : 'Select a service'}
                        </Text>
                        <Ionicons
                          name={showServiceDropdown ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={Colors.textSecondary}
                        />
                      </>
                    )}
                  </TouchableOpacity>

                  {showServiceDropdown && vendorServices.length > 0 && (
                    <View style={styles.dropdownList}>
                      <ScrollView
                        style={styles.dropdownScroll}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                      >
                        {vendorServices.map((svc) => (
                          <TouchableOpacity
                            key={svc.id}
                            style={styles.dropdownItem}
                            onPress={async () => {
                              setSelectedServiceId(svc.id);
                              setSelectedBatchId(null);
                              setShowServiceDropdown(false);
                              await loadBatchesForService(svc.id);
                            }}
                          >
                            <Text style={styles.dropdownItemText} numberOfLines={1}>
                              {svc.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.rowItem]}>
                    <Text style={styles.inputLabel}>Meeting Password</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={meetingPassword}
                        onChangeText={setMeetingPassword}
                        placeholder="Enter meeting password"
                        placeholderTextColor={Colors.placeholder}
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, styles.rowItem]}>
                    <Text style={styles.inputLabel}>Duration (minutes)</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={meetingDuration}
                        onChangeText={setMeetingDuration}
                        placeholder="e.g. 60"
                        placeholderTextColor={Colors.placeholder}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Batch</Text>
                  <TouchableOpacity
                    style={[styles.inputContainer, styles.dropdownTrigger]}
                    activeOpacity={0.8}
                    onPress={() => setShowBatchDropdown((prev) => !prev)}
                    disabled={isLoadingBatches || !selectedServiceId}
                  >
                    {isLoadingBatches ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.dropdownText,
                            !selectedBatchId && styles.placeholderText,
                          ]}
                          numberOfLines={1}
                        >
                          {selectedBatchId
                            ? serviceBatches.find((b) => b.id === selectedBatchId)?.name ??
                              'Select a batch'
                            : 'Select a batch'}
                        </Text>
                        <Ionicons
                          name={showBatchDropdown ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={Colors.textSecondary}
                        />
                      </>
                    )}
                  </TouchableOpacity>

                  {showBatchDropdown && serviceBatches.length > 0 && (
                    <View style={styles.dropdownList}>
                      <ScrollView
                        style={styles.dropdownScroll}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                      >
                        {serviceBatches.map((batch) => (
                          <TouchableOpacity
                            key={batch.id}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setSelectedBatchId(batch.id);
                              setShowBatchDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText} numberOfLines={1}>
                              {batch.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={closeCreateModal}
                  disabled={isCreatingMeeting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    isCreatingMeeting && styles.primaryButtonDisabled,
                  ]}
                  onPress={handleCreateMeeting}
                  disabled={isCreatingMeeting}
                  activeOpacity={0.8}
                >
                  {isCreatingMeeting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Create Meeting</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
      {showTimePicker && (
        <DateTimePicker
          testID="meetingTimePicker"
          value={parseDateOrToday(meetingDate || '1970-01-01')}
          mode="time"
          display={Platform.OS === 'android' ? 'clock' : 'spinner'}
          is24Hour={false}
          onChange={handleTimeChange}
        />
      )}
      {showDatePicker && (
        <DateTimePicker
          testID="meetingDatePicker"
          value={parseDateOrToday(meetingDate)}
          mode="date"
          display={Platform.OS === 'android' ? 'calendar' : 'spinner'}
          is24Hour
          onChange={handleDateChange}
        />
      )}
    </VendorVerificationGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  tabChipActive: {
    backgroundColor: Colors.primary,
  },
  tabChipText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
  },
  tabChipTextActive: {
    color: '#FFF',
  },

  // List
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  meetingsList: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
  },
  meetingsLoadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  meetingsEmpty: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 8,
  },
  meetingsEmptyTitle: {
    fontSize: 17,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
  },
  meetingsEmptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.regular,
  },

  // Meeting card
  meetingCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  meetingCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.extraBold,
    letterSpacing: 0.4,
  },
  zoomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: `${Colors.primary}12`,
    marginLeft: 'auto',
  },
  zoomBadgeText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primary,
    top: -1,
  },
  meetingTitle: {
    fontSize: 17,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
    marginBottom: 2,
  },
  meetingSubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primary,
    marginBottom: 6,
  },
  meetingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  meetingMetaText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  meetingStartButton: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  meetingStartButtonText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFF',
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
    padding: 0,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFF',
    padding: 20,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitleContainer: { flex: 1, marginRight: 12 },
  modalTitle: { fontSize: 18, fontFamily: Typography.fontFamily.extraBold, color: Colors.text },
  modalSubtitle: { marginTop: 3, fontSize: 13, color: Colors.textSecondary, fontFamily: Typography.fontFamily.regular },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: { marginTop: 16 },
  modalScrollContent: { paddingBottom: 12 },
  inputGroup: { marginBottom: 14 },
  inputLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputContainer: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#F9FAFB',
  },
  input: { fontSize: 14, color: Colors.text, fontFamily: Typography.fontFamily.regular },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontFamily: Typography.fontFamily.regular,
  },
  dateInputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputValueText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontFamily: Typography.fontFamily.regular,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  dropdownList: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFF',
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownScroll: { maxHeight: 200 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11 },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: Typography.fontFamily.medium,
  },
  modalActions: { marginTop: 16, flexDirection: 'row', gap: 10 },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: Colors.primary,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { fontSize: 14, fontFamily: Typography.fontFamily.semiBold, color: '#FFF' },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
});

