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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';
import {
  supportService,
  type SupportTicket,
  type TicketType,
  type Priority,
  type CreateTicketPayload,
} from '@/services/support.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = 'all' | 'open' | 'pending' | 'resolved';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All Tickets' },
  { key: 'open', label: 'Open' },
  { key: 'pending', label: 'Pending' },
  { key: 'resolved', label: 'Resolved' },
];

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  open:        { label: 'OPEN',       bg: '#D1FAE5', text: '#065F46' },
  in_progress: { label: 'PENDING',    bg: '#FEF3C7', text: '#92400E' },
  resolved:    { label: 'RESOLVED',   bg: '#E5E7EB', text: '#374151' },
  closed:      { label: 'CLOSED',     bg: '#E5E7EB', text: '#374151' },
};

const TICKET_TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: 'support', label: 'Support Request' },
  { value: 'complaint', label: 'Complaint' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const TARGET_ROLE = 'vendor';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
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
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getStatusInfo(status?: string) {
  const key = (status ?? '').toLowerCase();
  return STATUS_MAP[key] ?? { label: (status ?? 'Unknown').toUpperCase(), bg: '#E5E7EB', text: '#374151' };
}

function tabMatchesStatus(tab: TabKey, status?: string): boolean {
  const s = (status ?? '').toLowerCase();
  if (tab === 'all') return true;
  if (tab === 'open') return s === 'open';
  if (tab === 'pending') return s === 'in_progress';
  if (tab === 'resolved') return s === 'resolved' || s === 'closed';
  return true;
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8).toUpperCase() + '…' : id.toUpperCase();
}

function capitalizeTitle(s: string): string {
  return s.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCreatedByDisplay(item: SupportTicket): string | null {
  if (item.createdByName && typeof item.createdByName === 'string') return item.createdByName;
  const by = item.createdBy;
  if (typeof by === 'string') return by;
  if (by && typeof by === 'object' && 'name' in by && by.name) return by.name;
  if (by && typeof by === 'object' && 'email' in by && by.email) return by.email;
  return null;
}

function getCreatedByEmail(item: SupportTicket): string | null {
  const by = item.createdBy;
  if (by && typeof by === 'object' && 'email' in by && by.email) return by.email;
  return null;
}

function getCreatedByInitials(item: SupportTicket): string {
  const name = getCreatedByDisplay(item) || '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (name.length >= 2) return name.slice(0, 2).toUpperCase();
  return name.slice(0, 1).toUpperCase() || '?';
}

const PRIORITY_BADGE: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  low:    { label: 'Low Priority',    bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  medium: { label: 'Medium Priority', bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  high:   { label: 'High Priority',  bg: '#FEE2E2', text: '#B91C1C', dot: '#DC2626' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentSupportScreen() {
  const [list, setList] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  // Create ticket modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [ticketType, setTicketType] = useState<TicketType>('support');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Ticket detail modal state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailTicketId, setDetailTicketId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<SupportTicket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRefreshing, setDetailRefreshing] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadList = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      setError(null);
      const res = await supportService.getSupportTickets();
      const data = (res as any).data ?? res?.data ?? [];
      const sorted = (Array.isArray(data) ? data : []).sort(
        (a: SupportTicket, b: SupportTicket) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setList(sorted);
    } catch (e: any) {
      setError(e?.message || 'Failed to load support tickets.');
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    if (!detailModalVisible || !detailTicketId) return;
    let cancelled = false;
    setDetailData(null);
    setDetailError(null);
    setDetailLoading(true);
    supportService.getSupportTicket(detailTicketId).then(
      (res) => {
        if (!cancelled) {
          const data = (res as any).data ?? res?.data;
          setDetailData(data ?? null);
          setDetailError(data ? null : 'No data returned');
        }
      },
      (e: any) => {
        if (!cancelled) setDetailError(e?.message || 'Failed to load ticket details.');
      },
    ).finally(() => {
      if (!cancelled) setDetailLoading(false);
    });
    return () => { cancelled = true; };
  }, [detailModalVisible, detailTicketId]);

  const openDetailModal = (id: string) => {
    setDetailTicketId(id);
    setDetailModalVisible(true);
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setDetailTicketId(null);
    setDetailData(null);
    setDetailError(null);
  };

  const retryDetailFetch = useCallback(() => {
    if (!detailTicketId) return;
    setDetailError(null);
    setDetailLoading(true);
    supportService.getSupportTicket(detailTicketId).then(
      (res) => {
        const data = (res as any).data ?? res?.data;
        setDetailData(data ?? null);
        setDetailError(data ? null : 'No data returned');
      },
      (e: any) => setDetailError(e?.message || 'Failed to load ticket details.'),
    ).finally(() => setDetailLoading(false));
  }, [detailTicketId]);

  const onDetailRefresh = useCallback(() => {
    if (!detailTicketId) return;
    setDetailRefreshing(true);
    supportService.getSupportTicket(detailTicketId).then(
      (res) => {
        const data = (res as any).data ?? res?.data;
        setDetailData(data ?? null);
        setDetailError(data ? null : 'No data returned');
      },
      (e: any) => setDetailError(e?.message || 'Failed to load ticket details.'),
    ).finally(() => setDetailRefreshing(false));
  }, [detailTicketId]);

  const filtered = list.filter((t) => tabMatchesStatus(activeTab, t.status));

  // Modal helpers
  const openModal = () => {
    setTicketType('support');
    setCategory('');
    setPriority('medium');
    setTitle('');
    setDescription('');
    setShowPriorityDropdown(false);
    setModalVisible(true);
  };

  const closeModal = () => setModalVisible(false);

  const canSubmit =
    category.trim().length > 0 &&
    title.trim().length > 0 &&
    description.trim().length > 0;

  const handleCreateTicket = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const payload: CreateTicketPayload = {
        type: ticketType,
        category: category.trim(),
        priority,
        title: title.trim(),
        description: description.trim(),
        targetRole: TARGET_ROLE,
      };
      await supportService.createTicket(payload);
      closeModal();
      loadList();
    } catch (e: any) {
      Alert.alert('Failed to create ticket', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderCard = (item: SupportTicket) => {
    const statusInfo = getStatusInfo(item.status);
    const isResolved = (item.status ?? '').toLowerCase() === 'resolved' || (item.status ?? '').toLowerCase() === 'closed';
    return (
      <View key={item.id} style={styles.card}>
        {/* Row 1: ID + Status badge */}
        <View style={styles.cardTopRow}>
          <Text style={styles.cardId}>ID: {shortId(item.id)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle}>{item.title}</Text>

        {/* Footer: date + action */}
        <View style={styles.cardFooter}>
          <View style={styles.cardDateRow}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <TouchableOpacity onPress={() => openDetailModal(item.id)}>
            <Text style={styles.cardAction}>{isResolved ? 'View History' : 'View Details'} &rsaquo;</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Loading / Error ─────────────────────────────────────────────────────────

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading tickets…</Text>
      </View>
    );
  }

  if (error && list.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadList()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Ticket list */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadList(true); }}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="headset-outline" size={56} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No tickets here</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'all'
                ? 'Tap + to raise a support ticket.'
                : `No ${activeTab} tickets at the moment.`}
            </Text>
          </View>
        ) : (
          filtered.map(renderCard)
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Create Support Ticket Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.modalTitle}>Create Support Ticket</Text>
                <Text style={styles.modalSubtitle}>All fields are required.</Text>
              </View>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ marginTop: 12 }}
              contentContainerStyle={{ paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Ticket Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ticket Type</Text>
                <View style={styles.radioRow}>
                  {TICKET_TYPE_OPTIONS.map((o) => (
                    <TouchableOpacity
                      key={o.value}
                      style={styles.radioOption}
                      onPress={() => setTicketType(o.value)}
                    >
                      <View style={[styles.radioOuter, ticketType === o.value && styles.radioOuterSelected]}>
                        {ticketType === o.value && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.radioLabel}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={category}
                    onChangeText={setCategory}
                    placeholder="e.g., Technical Issue, Billing, Account"
                    placeholderTextColor={Colors.placeholder}
                  />
                </View>
              </View>

              {/* Priority */}
              <View style={[styles.inputGroup, { position: 'relative', zIndex: 1 }]}>
                <Text style={styles.inputLabel}>Priority</Text>
                <TouchableOpacity
                  style={[styles.inputContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                  onPress={() => setShowPriorityDropdown((p) => !p)}
                >
                  <Text style={styles.input}>
                    {PRIORITY_OPTIONS.find((o) => o.value === priority)?.label ?? 'Select'}
                  </Text>
                  <Ionicons name={showPriorityDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                {showPriorityDropdown && (
                  <View style={styles.dropdownList}>
                    {PRIORITY_OPTIONS.map((o) => (
                      <TouchableOpacity
                        key={o.value}
                        style={styles.dropdownItem}
                        onPress={() => { setPriority(o.value); setShowPriorityDropdown(false); }}
                      >
                        <Text style={styles.dropdownItemText}>{o.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Brief description of your issue"
                    placeholderTextColor={Colors.placeholder}
                  />
                </View>
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Provide detailed information about your issue…"
                    placeholderTextColor={Colors.placeholder}
                    multiline
                  />
                </View>
              </View>

              {/* Target Role (read-only) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Target Role</Text>
                <View style={[styles.inputContainer, { backgroundColor: '#F3F4F6' }]}>
                  <Text style={styles.input}>{TARGET_ROLE}</Text>
                </View>
                <Text style={{ marginTop: 4, fontSize: 12, color: Colors.textSecondary }}>
                  Automatically set to vendor for student support tickets.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.primaryButton, (!canSubmit || submitting) && { opacity: 0.7 }]}
                onPress={handleCreateTicket}
                disabled={!canSubmit || submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.primaryButtonText}>Create Ticket</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={closeModal}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent onRequestClose={closeDetailModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalCard}>
            {detailLoading ? (
              <View style={styles.detailLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading…</Text>
              </View>
            ) : detailError ? (
              <View style={styles.detailError}>
                <Text style={styles.errorText}>{detailError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={retryDetailFetch}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : detailData ? (
              <>
                {/* Header: Ticket ID + actions */}
                <View style={styles.detailHeader}>
                  <View>
                    <Text style={styles.detailTicketIdLabel}>TICKET ID</Text>
                    <Text style={styles.detailTicketIdValue}>{shortId(detailData.id)}</Text>
                  </View>
                  <TouchableOpacity onPress={closeDetailModal}>
                    <Ionicons name="close" size={24} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Title */}
                <Text style={styles.detailTitle}>{capitalizeTitle(detailData.title)}</Text>

                {/* Badges: Status, Priority, Category */}
                <View style={styles.detailBadgesRow}>
                  <View style={[styles.detailBadge, { backgroundColor: getStatusInfo(detailData.status).bg }]}>
                    <View style={[styles.detailBadgeDot, { backgroundColor: getStatusInfo(detailData.status).text }]} />
                    <Text style={[styles.detailBadgeText, { color: getStatusInfo(detailData.status).text }]}>
                      {getStatusInfo(detailData.status).label}
                    </Text>
                  </View>
                  <View style={[styles.detailBadge, { backgroundColor: (PRIORITY_BADGE[(detailData.priority ?? 'medium').toLowerCase()] ?? PRIORITY_BADGE.medium).bg }]}>
                    <View style={[styles.detailBadgeDot, { backgroundColor: (PRIORITY_BADGE[(detailData.priority ?? 'medium').toLowerCase()] ?? PRIORITY_BADGE.medium).dot }]} />
                    <Text style={[styles.detailBadgeText, { color: (PRIORITY_BADGE[(detailData.priority ?? 'medium').toLowerCase()] ?? PRIORITY_BADGE.medium).text }]}>
                      {(PRIORITY_BADGE[(detailData.priority ?? 'medium').toLowerCase()] ?? PRIORITY_BADGE.medium).label}
                    </Text>
                  </View>
                  <View style={[styles.detailBadge, styles.detailBadgeCategory]}>
                    <Text style={styles.detailBadgeTextCategory}>{detailData.category ?? '—'}</Text>
                  </View>
                </View>

                <ScrollView
                  style={styles.detailScroll}
                  contentContainerStyle={styles.detailScrollContent}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={detailRefreshing}
                      onRefresh={onDetailRefresh}
                      colors={[Colors.primary]}
                      tintColor={Colors.primary}
                    />
                  }
                >
                  {/* Core details card */}
                  <View style={styles.detailCoreCard}>
                    <View style={styles.detailCoreRow}>
                      <Text style={styles.detailCoreLabel}>CREATED AT</Text>
                      <View style={styles.detailCoreValueRow}>
                        <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.detailCoreValue}>{formatDateTime(detailData.createdAt)}</Text>
                      </View>
                    </View>
                    <View style={styles.detailCoreRow}>
                      <Text style={styles.detailCoreLabel}>TARGET ROLE</Text>
                      <Text style={styles.detailCoreValuePurple}>{(detailData.targetRole ?? '—').charAt(0).toUpperCase() + (detailData.targetRole ?? '').slice(1)}</Text>
                    </View>
                    <View style={styles.detailCoreRow}>
                      <Text style={styles.detailCoreLabel}>CREATED BY</Text>
                      <View style={styles.detailCreatedBy}>
                        <View style={styles.detailAvatar}>
                          <Text style={styles.detailAvatarText}>{getCreatedByInitials(detailData)}</Text>
                        </View>
                        <View style={styles.detailCreatedByInfo}>
                          <Text style={styles.detailCreatedByName}>{getCreatedByDisplay(detailData) || '—'}</Text>
                          {getCreatedByEmail(detailData) ? (
                            <Text style={styles.detailCreatedByEmail}>{getCreatedByEmail(detailData)}</Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Description */}
                  <Text style={styles.detailSectionLabel}>DESCRIPTION</Text>
                  <View style={styles.detailDescriptionBox}>
                    <Text style={styles.detailDescriptionText}>{detailData.description || '—'}</Text>
                  </View>

                  {/* Conversation */}
                  <View style={styles.detailConversationHeader}>
                    <Text style={styles.detailConversationTitle}>Conversation</Text>
                    <View style={styles.detailMessagesPill}>
                      <Text style={styles.detailMessagesPillText}>{detailData.messages?.length ?? 0} Messages</Text>
                    </View>
                  </View>
                  <View style={styles.detailConversationEmpty}>
                    <Ionicons name="chatbubble-outline" size={48} color={Colors.textLight} />
                    <Text style={styles.detailConversationEmptyText}>No replies yet</Text>
                  </View>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.textSecondary, fontFamily: Typography.fontFamily.regular },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center', fontFamily: Typography.fontFamily.regular },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, backgroundColor: Colors.primary },
  retryBtnText: { fontSize: 14, fontFamily: Typography.fontFamily.semiBold, color: '#FFF' },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 4,
  },
  tabItem: { marginRight: 24 },
  tabLabel: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
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

  // Scroll / list
  scrollContent: { padding: 16, paddingBottom: 100, gap: 12 },

  empty: { alignItems: 'center', paddingVertical: 56 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.text },
  emptySubtitle: { marginTop: 4, fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, textAlign: 'center' },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardId: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    textTransform: 'capitalize',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  cardDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardDate: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: Colors.textSecondary, top:-1 },
  cardAction: { fontSize: 13, fontFamily: Typography.fontFamily.semiBold, color: Colors.primary },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },

  // Modal
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
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontFamily: Typography.fontFamily.extraBold, color: Colors.text },
  modalSubtitle: { marginTop: 4, fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary },
  modalActions: { marginTop: 12, flexDirection: 'row', gap: 8 },

  // Form
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 13, fontFamily: Typography.fontFamily.semiBold, color: Colors.text, marginBottom: 6 },
  inputContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  input: { fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.text },
  radioRow: { flexDirection: 'row', gap: 20 },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  radioOuterSelected: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  radioLabel: { fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.text },
  dropdownList: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10 },
  dropdownItemText: { fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.text },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
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

  // Detail modal
  detailModalCard: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 20,
    backgroundColor: Colors.white,
    padding: 20,
  },
  detailLoading: { paddingVertical: 48, alignItems: 'center' },
  detailError: { paddingVertical: 24, alignItems: 'center' },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailTicketIdLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  detailTicketIdValue: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  detailTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginBottom: 12,
  },
  detailBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  detailBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  detailBadgeText: { fontSize: 12, fontFamily: Typography.fontFamily.semiBold, textAlign: 'center', top: -2 },
  detailBadgeCategory: { backgroundColor: '#E5E7EB' },
  detailBadgeTextCategory: { fontSize: 12, fontFamily: Typography.fontFamily.semiBold, color: '#374151' },
  detailScroll: { flexGrow: 0, maxHeight: 420 },
  detailScrollContent: { paddingBottom: 24 },
  detailCoreCard: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailCoreRow: { marginBottom: 14 },
  detailCoreLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  detailCoreValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailCoreValue: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text,
  },
  detailCoreValuePurple: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primary,
  },
  detailCreatedBy: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailAvatarText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  detailCreatedByInfo: { flex: 1 },
  detailCreatedByName: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
  },
  detailCreatedByEmail: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailSectionLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  detailDescriptionBox: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailDescriptionText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text,
    lineHeight: 20,
  },
  detailConversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailConversationTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  detailMessagesPill: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  detailMessagesPillText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
  },
  detailConversationEmpty: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  detailConversationEmptyText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
});
