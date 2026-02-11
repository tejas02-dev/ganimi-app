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
import {
  supportService,
  type SupportTicket,
  type TicketType,
  type Priority,
  type CreateTicketPayload,
} from '@/services/support.service';

const TICKET_TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: 'support_request', label: 'Support Request' },
  { value: 'complaint', label: 'Complaint' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

// For students, support tickets always target vendor
const TARGET_ROLE = 'vendor';

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

function formatPriority(p?: string): string {
  if (!p) return '—';
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

function formatTicketType(t?: string): string {
  if (!t) return '—';
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: '#FEE2E2', text: '#B91C1C', border: '#DC2626' },
  medium: { bg: '#FEF3C7', text: '#B45309', border: '#F59E0B' },
  low: { bg: '#D1FAE5', text: '#047857', border: '#10B981' },
};

const TICKET_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  support_request: { bg: '#DBEAFE', text: '#1D4ED8' },
  complaint: { bg: '#FEE2E2', text: '#B91C1C' },
};

function getPriorityColors(p?: string) {
  const key = (p || 'medium').toLowerCase();
  return PRIORITY_COLORS[key] ?? PRIORITY_COLORS.medium;
}

function getTypeColors(t?: string) {
  const key = (t || 'support_request').toLowerCase().replace(/\s/g, '_');
  return TICKET_TYPE_COLORS[key] ?? { bg: '#E5E7EB', text: Colors.textSecondary };
}

function getCreatedByDisplay(item: SupportTicket): string | null {
  if (item.createdByName && typeof item.createdByName === 'string') return item.createdByName;
  const by = item.createdBy;
  if (typeof by === 'string') return by;
  if (by && typeof by === 'object' && 'name' in by && by.name) return by.name;
  if (by && typeof by === 'object' && 'email' in by && by.email) return by.email;
  return null;
}

export default function StudentSupportScreen() {
  const [list, setList] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [ticketType, setTicketType] = useState<TicketType>('support_request');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadList = useCallback(async () => {
    try {
      setError(null);
      const res = await supportService.getSupportTickets();
      const data = (res as any).data ?? res?.data ?? [];
      setList(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('[StudentSupport] loadList', e);
      setError(e?.message || 'Failed to load support tickets.');
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openModal = () => {
    setTicketType('support_request');
    setCategory('');
    setPriority('medium');
    setTitle('');
    setDescription('');
    setShowPriorityDropdown(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const resetForm = () => {
    setTicketType('support_request');
    setCategory('');
    setPriority('medium');
    setTitle('');
    setDescription('');
    setShowPriorityDropdown(false);
  };

  const canSubmit =
    category.trim().length > 0 &&
    title.trim().length > 0 &&
    description.trim().length > 0;

  const handleCreateTicket = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const payload: CreateTicketPayload = {
        ticketType,
        category: category.trim(),
        priority,
        title: title.trim(),
        description: description.trim(),
      };
      await supportService.createTicket(payload);
      closeModal();
      resetForm();
      loadList();
    } catch (e: any) {
      console.error('[StudentSupport] createTicket', e);
      setError(e?.message || 'Failed to create ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading support tickets...</Text>
      </View>
    );
  }

  if (error && list.length === 0) {
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadList();
            }}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Support</Text>
          <Text style={styles.subtitle}>
            Support requests you've raised. Create a ticket for help or complaints.
          </Text>
        </View>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="headset-outline" size={56} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No support tickets yet</Text>
            <Text style={styles.emptySubtitle}>
              Pull to refresh or create a ticket using the + button.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {list.map((item) => {
              const priorityColors = getPriorityColors(item.priority);
              const typeColors = getTypeColors(item.ticketType || item.type);
              const createdByDisplay = getCreatedByDisplay(item);
              return (
                <View
                  key={item.id}
                  style={[styles.card, { borderLeftColor: priorityColors.border, borderLeftWidth: 4 }]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={[styles.priorityPill, { backgroundColor: priorityColors.bg }]}>
                      <Text style={[styles.priorityPillText, { color: priorityColors.text }]}>
                        {formatPriority(item.priority)}
                      </Text>
                    </View>
                  </View>
                  {item.category ? (
                    <View style={styles.cardCategoryRow}>
                      <Ionicons name="pricetag-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.cardCategory}>{item.category}</Text>
                    </View>
                  ) : null}
                  {item.description ? (
                    <Text style={styles.cardMessage} numberOfLines={3}>
                      {item.description}
                    </Text>
                  ) : null}
                  {createdByDisplay ? (
                    <View style={styles.cardCreatedRow}>
                      <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.cardCreatedBy}>
                        Created by {createdByDisplay}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.cardMeta}>
                    <View style={[styles.typePill, { backgroundColor: typeColors.bg }]}>
                      <Text style={[styles.typePillText, { color: typeColors.text }]}>
                        {formatTicketType(item.ticketType || item.type)}
                      </Text>
                    </View>
                    {item.status ? (
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>{item.status}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Create Support Ticket Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>Create Support Ticket</Text>
                <Text style={styles.modalSubtitle}>
                  Create a new support ticket or complaint. All fields are required.
                </Text>
              </View>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
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
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.radioOuter,
                          ticketType === o.value && styles.radioOuterSelected,
                        ]}
                      >
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
              <View style={[styles.inputGroup, styles.fieldWithDropdown]}>
                <Text style={styles.inputLabel}>Priority</Text>
                <TouchableOpacity
                  style={[styles.inputContainer, styles.dropdownTrigger]}
                  activeOpacity={0.8}
                  onPress={() => setShowPriorityDropdown((p) => !p)}
                >
                  <Text style={styles.dropdownText}>
                    {PRIORITY_OPTIONS.find((o) => o.value === priority)?.label ?? 'Select'}
                  </Text>
                  <Ionicons
                    name={showPriorityDropdown ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
                {showPriorityDropdown && (
                  <View style={styles.dropdownListFloating}>
                    {PRIORITY_OPTIONS.map((o) => (
                      <TouchableOpacity
                        key={o.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setPriority(o.value);
                          setShowPriorityDropdown(false);
                        }}
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
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Please provide detailed information about your issue..."
                    placeholderTextColor={Colors.placeholder}
                    multiline
                  />
                </View>
              </View>

              {/* Target Role (read-only) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Target Role</Text>
                <View style={[styles.inputContainer, styles.readOnlyInput]}>
                  <Text style={styles.input}>{TARGET_ROLE}</Text>
                </View>
                <Text style={styles.helperText}>
                  This is automatically set to vendor for student support tickets.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.primaryButton, (!canSubmit || submitting) && styles.primaryButtonDisabled]}
                onPress={handleCreateTicket}
                disabled={!canSubmit || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create Ticket</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={closeModal}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.textSecondary },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  scrollContent: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 100 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  list: { gap: 12 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, flex: 1 },
  priorityPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  priorityPillText: { fontSize: 11, fontWeight: '600' },
  cardCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardCategory: { fontSize: 13, color: Colors.textSecondary },
  cardMessage: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 2 },
  cardCreatedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  cardCreatedBy: { fontSize: 13, color: Colors.textSecondary },
  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  typePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  typePillText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#E5E7EB' },
  statusPillText: { fontSize: 11, color: Colors.textSecondary, textTransform: 'capitalize' },
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
  modalActions: { marginTop: 12, flexDirection: 'row', gap: 8 },
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
  readOnlyInput: { backgroundColor: '#F3F4F6' },
  input: { fontSize: 14, color: Colors.text },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  helperText: { marginTop: 4, fontSize: 12, color: Colors.textSecondary },
  fieldWithDropdown: { position: 'relative', zIndex: 1 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { flex: 1, fontSize: 14, color: Colors.text },
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
  radioRow: { flexDirection: 'row', gap: 20 },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: { borderColor: Colors.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  radioLabel: { fontSize: 14, color: Colors.text },
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
  secondaryButtonText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
});

