import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { notificationService, type NotificationItem, type NotificationType, type TargetScope } from '@/services/notification.service';
import { serviceService } from '@/services/service.service';
import { batchService } from '@/services/batch.service';

const TARGET_OPTIONS: { value: TargetScope; label: string }[] = [
  { value: 'all', label: 'All Students' },
  { value: 'service', label: 'Service' },
  { value: 'batch', label: 'Batch' },
];

const TYPE_OPTIONS: { value: NotificationType; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'alert', label: 'Alert' },
  { value: 'event', label: 'Event' },
];

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function VendorNotificationsScreen() {
  const [list, setList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetScope, setTargetScope] = useState<TargetScope>('all');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [notificationType, setNotificationType] = useState<NotificationType>('info');
  const [sending, setSending] = useState(false);

  const [vendorServices, setVendorServices] = useState<{ id: string; name: string }[]>([]);
  const [vendorBatches, setVendorBatches] = useState<{ id: string; name: string; serviceName?: string }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);

  const loadList = useCallback(async () => {
    try {
      setError(null);
      const res = await notificationService.getMyNotifications();
      const data = (res as any).data ?? res?.data ?? [];
      setList(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('[VendorNotifications] loadList', e);
      setError(e?.message || 'Failed to load notifications.');
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadVendorOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [svcRes, batchRes] = await Promise.all([
        serviceService.getVendorServices(),
        batchService.getVendorBatches(),
      ]);
      setVendorServices((svcRes as any).data ?? []);
      setVendorBatches((batchRes as any).data ?? []);
    } catch (e: any) {
      console.error('[VendorNotifications] loadVendorOptions', e);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const openModal = () => {
    setTitle('');
    setMessage('');
    setTargetScope('all');
    setSelectedServiceIds([]);
    setSelectedBatchIds([]);
    setNotificationType('info');
    setShowTargetDropdown(false);
    setShowTypeDropdown(false);
    setShowServiceDropdown(false);
    setShowBatchDropdown(false);
    setModalVisible(true);
    loadVendorOptions();
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setTargetScope('all');
    setSelectedServiceIds([]);
    setSelectedBatchIds([]);
    setNotificationType('info');
  };

  const getTargetIds = (): string[] => {
    if (targetScope === 'service') return selectedServiceIds;
    if (targetScope === 'batch') return selectedBatchIds;
    return [];
  };

  const handleSend = async () => {
    if (!title.trim()) {
      alert('Please enter a title.');
      return;
    }
    if (!message.trim()) {
      alert('Please enter a message.');
      return;
    }
    if (targetScope === 'service' && selectedServiceIds.length === 0) {
      alert('Please select at least one service.');
      return;
    }
    if (targetScope === 'batch' && selectedBatchIds.length === 0) {
      alert('Please select at least one batch.');
      return;
    }

    setSending(true);
    try {
      await notificationService.createNotification({
        title: title.trim(),
        message: message.trim(),
        targetScope,
        targetIds: getTargetIds(),
        type: notificationType,
      });
      setModalVisible(false);
      loadList();
    } catch (e: any) {
      console.error('[VendorNotifications] create', e);
      alert(e?.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleBatch = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllServices = () => {
    if (selectedServiceIds.length === vendorServices.length) {
      setSelectedServiceIds([]);
    } else {
      setSelectedServiceIds(vendorServices.map((s) => s.id));
    }
  };

  const selectAllBatches = () => {
    if (selectedBatchIds.length === vendorBatches.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(vendorBatches.map((b) => b.id));
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadList}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadList(); }} colors={[Colors.primary]} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            Notifications you've received and those you send to students.
          </Text>
        </View>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={56} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>Pull to refresh or create one using the + button.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {list.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                </View>
                <Text style={styles.cardMessage} numberOfLines={3}>{item.message}</Text>
                <View style={styles.cardMeta}>
                  <View style={styles.typePill}>
                    <Text style={styles.typePillText}>{(item.type || 'info').toLowerCase()}</Text>
                  </View>
                  <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Create Notification Modal - matches batch form design */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>Create New Notification</Text>
                <Text style={styles.modalSubtitle}>
                  Send notifications to all students, specific services, or batches.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Enter notification title"
                    placeholderTextColor={Colors.placeholder}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Message *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Enter notification message"
                    placeholderTextColor={Colors.placeholder}
                    multiline
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, styles.fieldWithDropdown, showTargetDropdown && styles.fieldWithDropdownOpen]}>
                <Text style={styles.inputLabel}>Target Audience</Text>
                <TouchableOpacity
                  style={[styles.inputContainer, styles.dropdownTrigger]}
                  activeOpacity={0.8}
                  onPress={() => { setShowTargetDropdown((p) => !p); setShowTypeDropdown(false); setShowServiceDropdown(false); setShowBatchDropdown(false); }}
                >
                  <Text style={styles.dropdownText}>
                    {TARGET_OPTIONS.find((o) => o.value === targetScope)?.label ?? 'Select'}
                  </Text>
                  <Ionicons name={showTargetDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                {showTargetDropdown && (
                  <View style={styles.dropdownListFloating}>
                    {TARGET_OPTIONS.map((o) => (
                      <TouchableOpacity
                        key={o.value}
                        style={styles.dropdownItem}
                        onPress={() => { setTargetScope(o.value); setShowTargetDropdown(false); }}
                      >
                        <Text style={styles.dropdownItemText}>{o.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {targetScope === 'service' && (
                <View style={[styles.inputGroup, styles.fieldWithDropdown, showServiceDropdown && styles.fieldWithDropdownOpen]}>
                  <Text style={styles.inputLabel}>Services (multiselect)</Text>
                  <TouchableOpacity
                    style={[styles.inputContainer, styles.dropdownTrigger]}
                    activeOpacity={0.8}
                    onPress={() => { setShowServiceDropdown((p) => !p); setShowBatchDropdown(false); }}
                  >
                    <Text style={styles.dropdownText} numberOfLines={1}>
                      {selectedServiceIds.length === 0
                        ? 'Select services'
                        : `${selectedServiceIds.length} selected`}
                    </Text>
                    <Ionicons name={showServiceDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  {showServiceDropdown && (
                    <View style={styles.dropdownListFloating}>
                      {loadingOptions ? (
                        <ActivityIndicator size="small" color={Colors.primary} style={{ padding: 12 }} />
                      ) : (
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          <TouchableOpacity
                            style={[styles.dropdownItem, styles.multiselectItem, styles.selectAllItem]}
                            onPress={selectAllServices}
                          >
                            <Ionicons
                              name={selectedServiceIds.length === vendorServices.length ? 'checkbox' : 'square-outline'}
                              size={20}
                              color={selectedServiceIds.length === vendorServices.length ? Colors.primary : Colors.textSecondary}
                            />
                            <Text style={styles.selectAllText}>
                              {selectedServiceIds.length === vendorServices.length ? 'Deselect all' : 'Select all'}
                            </Text>
                          </TouchableOpacity>
                          {vendorServices.map((s) => (
                            <TouchableOpacity
                              key={s.id}
                              style={[styles.dropdownItem, styles.multiselectItem]}
                              onPress={() => toggleService(s.id)}
                            >
                              <Ionicons
                                name={selectedServiceIds.includes(s.id) ? 'checkbox' : 'square-outline'}
                                size={20}
                                color={selectedServiceIds.includes(s.id) ? Colors.primary : Colors.textSecondary}
                              />
                              <Text style={styles.dropdownItemText}>{s.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  )}
                </View>
              )}

              {targetScope === 'batch' && (
                <View style={[styles.inputGroup, styles.fieldWithDropdown, showBatchDropdown && styles.fieldWithDropdownOpen]}>
                  <Text style={styles.inputLabel}>Batches (multiselect)</Text>
                  <TouchableOpacity
                    style={[styles.inputContainer, styles.dropdownTrigger]}
                    activeOpacity={0.8}
                    onPress={() => { setShowBatchDropdown((p) => !p); setShowServiceDropdown(false); }}
                  >
                    <Text style={styles.dropdownText} numberOfLines={1}>
                      {selectedBatchIds.length === 0 ? 'Select batches' : `${selectedBatchIds.length} selected`}
                    </Text>
                    <Ionicons name={showBatchDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  {showBatchDropdown && (
                    <View style={styles.dropdownListFloating}>
                      {loadingOptions ? (
                        <ActivityIndicator size="small" color={Colors.primary} style={{ padding: 12 }} />
                      ) : (
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          <TouchableOpacity
                            style={[styles.dropdownItem, styles.multiselectItem, styles.selectAllItem]}
                            onPress={selectAllBatches}
                          >
                            <Ionicons
                              name={selectedBatchIds.length === vendorBatches.length ? 'checkbox' : 'square-outline'}
                              size={20}
                              color={selectedBatchIds.length === vendorBatches.length ? Colors.primary : Colors.textSecondary}
                            />
                            <Text style={styles.selectAllText}>
                              {selectedBatchIds.length === vendorBatches.length ? 'Deselect all' : 'Select all'}
                            </Text>
                          </TouchableOpacity>
                          {vendorBatches.map((b) => (
                            <TouchableOpacity
                              key={b.id}
                              style={[styles.dropdownItem, styles.multiselectItem]}
                              onPress={() => toggleBatch(b.id)}
                            >
                              <Ionicons
                                name={selectedBatchIds.includes(b.id) ? 'checkbox' : 'square-outline'}
                                size={20}
                                color={selectedBatchIds.includes(b.id) ? Colors.primary : Colors.textSecondary}
                              />
                              <Text style={styles.dropdownItemText}>{b.name}{b.serviceName ? ` · ${b.serviceName}` : ''}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  )}
                </View>
              )}

              <View style={[styles.inputGroup, styles.fieldWithDropdown, showTypeDropdown && styles.fieldWithDropdownOpen]}>
                <Text style={styles.inputLabel}>Type</Text>
                <TouchableOpacity
                  style={[styles.inputContainer, styles.dropdownTrigger]}
                  activeOpacity={0.8}
                  onPress={() => { setShowTypeDropdown((p) => !p); setShowTargetDropdown(false); setShowServiceDropdown(false); setShowBatchDropdown(false); }}
                >
                  <Text style={styles.dropdownText}>
                    {TYPE_OPTIONS.find((o) => o.value === notificationType)?.label ?? 'Select'}
                  </Text>
                  <Ionicons name={showTypeDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                {showTypeDropdown && (
                  <View style={styles.dropdownListFloating}>
                    {TYPE_OPTIONS.map((o) => (
                      <TouchableOpacity
                        key={o.value}
                        style={styles.dropdownItem}
                        onPress={() => { setNotificationType(o.value); setShowTypeDropdown(false); }}
                      >
                        <Text style={styles.dropdownItemText}>{o.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Fixed footer - buttons stay visible, never scroll away */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.primaryButton, sending && styles.primaryButtonDisabled]}
                activeOpacity={0.9}
                onPress={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFF" />
                    <Text style={styles.primaryButtonText}>Send Notification</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={resetForm}
                disabled={sending}
              >
                <Text style={styles.secondaryButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  scrollContent: { padding: 16, paddingBottom: 88 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  loadingText: { marginTop: 8, fontSize: 14, color: Colors.textSecondary },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center' },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, backgroundColor: Colors.primary },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySubtitle: { marginTop: 4, fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  list: { gap: 12 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  cardMessage: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: '#E5E7EB' },
  typePillText: { fontSize: 11, color: Colors.textSecondary, textTransform: 'capitalize' },
  cardDate: { fontSize: 12, color: Colors.textSecondary },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
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
    maxHeight: '60%',
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
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  inputContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  input: { fontSize: 14, color: Colors.text },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  fieldWithDropdown: { position: 'relative', zIndex: 1 },
  fieldWithDropdownOpen: { zIndex: 10000, elevation: 25 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { flex: 1, fontSize: 14, color: Colors.text },
  placeholderText: { color: Colors.textSecondary },
  dropdownListFloating: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.6)',
    backgroundColor: '#FFF',
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10 },
  dropdownItemText: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  multiselectItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectAllItem: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  selectAllText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  dropdownScroll: { maxHeight: 196 },
  modalActions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    gap: 8,
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
  secondaryButtonText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
});
