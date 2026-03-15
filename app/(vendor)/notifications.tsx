import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
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
import { Typography } from '@/constants/typography';
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

type TabKey = 'all' | 'unread' | 'archive';

function getRelativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatSourceDate(item: NotificationItem): string {
  try {
    const d = new Date(item.createdAt);
    if (Number.isNaN(d.getTime())) return item.createdByRole || 'SYSTEM';
    const source =
      item.createdByRole === 'ganimi_admin'
        ? 'GANIMI SUPPORT'
        : (item as any).createdByName
          ? String((item as any).createdByName).toUpperCase()
          : (item.createdByRole || 'SYSTEM').toUpperCase();
    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${source} • ${date} • ${time}`;
  } catch {
    return item.createdByRole || 'SYSTEM';
  }
}

type NotificationStyle = {
  barColor: string;
  iconBg: string;
  pillBg: string;
  pillText: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

function getStyleForType(type: string): NotificationStyle {
  const t = (type || 'info').toLowerCase();
  if (t === 'alert')
    return { barColor: '#F59E0B', iconBg: '#F59E0B', pillBg: '#FEF3C7', pillText: '#B45309', icon: 'warning', label: 'ALERT' };
  if (t === 'event' || t === 'success')
    return { barColor: '#22C55E', iconBg: '#22C55E', pillBg: '#DCFCE7', pillText: '#16A34A', icon: 'checkmark-circle', label: 'SUCCESS' };
  if (t === 'urgent')
    return { barColor: '#EF4444', iconBg: '#EF4444', pillBg: '#FEE2E2', pillText: '#DC2626', icon: 'notifications', label: 'URGENT' };
  return { barColor: '#2563EB', iconBg: '#2563EB', pillBg: '#DBEAFE', pillText: '#1D4ED8', icon: 'school', label: 'INFO' };
}

export default function VendorNotificationsScreen() {
  const [list, setList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

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

  const filteredList = useMemo(() => {
    let data = list;
    if (activeTab === 'archive') data = [];
    return [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeTab, list]);

  const renderCard = ({ item }: { item: NotificationItem }) => {
    const style = getStyleForType(item.type);
    const relativeTime = getRelativeTime(item.createdAt);
    const sourceLine = formatSourceDate(item);
    return (
      <View style={styles.card}>
        <View style={[styles.leftBar, { backgroundColor: style.barColor }]} />
        <View style={styles.cardInner}>
          <View style={[styles.iconCircle, { backgroundColor: style.pillBg }]}>
            <Ionicons name={style.icon} size={20} color={style.barColor} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardTopRow}>
              <View style={[styles.pill, { backgroundColor: style.pillBg }]}>
                <Text style={[styles.pillText, { color: style.pillText }]}>{style.label}</Text>
              </View>
              <View style={styles.timeRow}>
                <View style={styles.unreadDot} />
                <Text style={styles.relativeTime}>{relativeTime}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
            <Text style={styles.sourceLine} numberOfLines={1}>{sourceLine}</Text>
          </View>
        </View>
      </View>
    );
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
      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['all', 'unread', 'archive'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadList(); }}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                Pull to refresh or tap + to create a notification.
              </Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Create Notification (drawer from bottom) */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
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
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  loadingText: { marginTop: 12, fontSize: 16, color: Colors.textSecondary, fontFamily: Typography.fontFamily.regular },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  tabItem: { marginRight: 24 },
  tabLabel: { fontSize: 14, color: Colors.textSecondary, fontFamily: Typography.fontFamily.semiBold },
  tabLabelActive: { color: Colors.primary },
  tabUnderline: { marginTop: 4, height: 2, borderRadius: 999, backgroundColor: Colors.primary },
  errorText: { paddingHorizontal: 16, marginBottom: 8, fontSize: 13, color: Colors.error, fontFamily: Typography.fontFamily.regular },
  retryBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignSelf: 'center',
  },
  retryBtnText: { fontSize: 14, fontFamily: Typography.fontFamily.semiBold, color: '#FFF' },
  listContent: { paddingHorizontal: 16, paddingBottom: 88 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  leftBar: { width: 4, alignSelf: 'stretch' },
  cardInner: { flex: 1, flexDirection: 'row', padding: 14, minWidth: 0, gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  pillText: { fontSize: 10, letterSpacing: 0.5, fontFamily: Typography.fontFamily.extraBold },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  relativeTime: { fontSize: 12, color: Colors.textSecondary, fontFamily: Typography.fontFamily.regular },
  cardTitle: { fontSize: 16, color: Colors.text, fontFamily: Typography.fontFamily.extraBold, marginTop: 4 },
  cardMessage: { fontSize: 12, lineHeight: 18, color: Colors.textSecondary, fontFamily: Typography.fontFamily.medium, marginBottom: 6 },
  sourceLine: { fontSize: 11, color: Colors.textLight, fontFamily: Typography.fontFamily.bold },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyTitle: { marginTop: 12, fontSize: 18, color: Colors.text, fontFamily: Typography.fontFamily.extraBold, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', fontFamily: Typography.fontFamily.regular },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
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
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFF',
    padding: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleContainer: { flex: 1, marginRight: 12 },
  modalTitle: { fontSize: 18, fontFamily: Typography.fontFamily.extraBold, color: Colors.text },
  modalSubtitle: { marginTop: 4, fontSize: 13, color: Colors.textSecondary, fontFamily: Typography.fontFamily.regular },
  modalScroll: { marginTop: 12 },
  modalScrollContent: { paddingBottom: 12 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 13, fontFamily: Typography.fontFamily.semiBold, color: Colors.text, marginBottom: 6 },
  inputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  input: { fontSize: 14, color: Colors.text, fontFamily: Typography.fontFamily.regular },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  fieldWithDropdown: { position: 'relative', zIndex: 1 },
  fieldWithDropdownOpen: { zIndex: 10000, elevation: 25 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { flex: 1, fontSize: 14, color: Colors.text, fontFamily: Typography.fontFamily.regular },
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
  dropdownItemText: { fontSize: 14, color: Colors.text, fontFamily: Typography.fontFamily.medium },
  multiselectItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectAllItem: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  selectAllText: { fontSize: 14, fontFamily: Typography.fontFamily.semiBold, color: Colors.primary },
  dropdownScroll: { maxHeight: 196 },
  modalActions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    gap: 8,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { fontSize: 14, fontFamily: Typography.fontFamily.semiBold, color: '#FFF' },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: { fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
});
