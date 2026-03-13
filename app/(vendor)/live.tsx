import React, { useState } from 'react';
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
  Linking,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/Colors';
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
};

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

  const loadMeetings = async () => {
    try {
      setIsLoadingMeetings(true);
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

  return (
    <VendorVerificationGate>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Live Sessions</Text>
            <Text style={styles.subtitle}>
              Schedule and start your live classes from here.
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
            <Text style={styles.meetingsEmptyTitle}>No meetings yet</Text>
            <Text style={styles.meetingsEmptySubtitle}>
              Create a Zoom meeting using the + button.
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
                        {meeting.status.toLowerCase()}
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
                <View style={styles.meetingActions}>
                  <TouchableOpacity
                    style={styles.meetingStartButton}
                    activeOpacity={0.9}
                    onPress={() => handleStartMeeting(meeting)}
                  >
                    <Ionicons name="play-circle-outline" size={18} color="#FFF" />
                    <Text style={styles.meetingStartButtonText}>Start meeting</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        <TouchableOpacity
          style={[styles.fab, { bottom: 16 + insets.bottom }]}
          onPress={openCreateModal}
          activeOpacity={0.8}
          disabled={isCreatingMeeting}
        >
          {isCreatingMeeting ? (
            <ActivityIndicator size="small" color={Colors.white} />
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
                  <Text style={styles.modalSubtitle}>
                    Set up a new live class for your students.
                  </Text>
                </View>
                <TouchableOpacity onPress={closeCreateModal}>
                  <Ionicons
                    name="close"
                    size={22}
                    color={Colors.textSecondary}
                  />
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 20,
    backgroundColor: '#FFF',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleContainer: { flex: 1, marginRight: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalSubtitle: { marginTop: 4, fontSize: 13, color: Colors.textSecondary },
  modalScroll: { marginTop: 12 },
  modalScrollContent: { paddingBottom: 12 },
  inputGroup: { marginBottom: 12 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  inputContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  input: { fontSize: 14, color: Colors.text },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
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
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  modalActions: { marginTop: 12, flexDirection: 'row', gap: 8 },
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
  meetingMetaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  meetingMetaSubText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  meetingActions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  meetingStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  meetingStartButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  meetingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});

