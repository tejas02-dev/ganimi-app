import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';
import { VendorVerificationGate } from '@/components/VendorVerificationGate';
import { courseService, type VendorCourse } from '@/services/course.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function VendorCoursesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<VendorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const loadCourses = useCallback(async (isRefresh?: boolean) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await courseService.getMyCourses();
      setList(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load courses', e);
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const onRefresh = () => { setRefreshing(true); loadCourses(true); };

  const openCreateModal = () => {
    setTitle('');
    setDescription('');
    setModalVisible(true);
  };

  const closeModal = () => setModalVisible(false);

  const handleDelete = (item: VendorCourse) => {
    Alert.alert(
      'Delete course',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await courseService.deleteCourse(item.id);
              loadCourses(true);
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to delete course.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please enter a course title.');
      return;
    }
    setSaving(true);
    try {
      await courseService.createCourse({
        title: title.trim(),
        description: description.trim() || undefined,
      });
      closeModal();
      loadCourses(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create course.');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: VendorCourse }) => {
    const dateLabel = formatDate(item.createdAt);
    return (
      <View style={styles.card}>
        <View style={styles.cardInner}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="book" size={24} color={Colors.primary} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
            ) : null}
            {dateLabel ? (
              <View style={styles.cardDateRow}>
                <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.cardDateText}>Created {dateLabel}</Text>
              </View>
            ) : null}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.btnView}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({ pathname: '/(vendor)/course/[courseId]' as any, params: { courseId: item.id } })
                }
              >
                <Ionicons name="layers" size={16} color={Colors.primary} />
                <Text style={styles.btnViewText}>View Course</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnDelete}
                onPress={() => handleDelete(item)}
                disabled={deletingId === item.id}
                activeOpacity={0.8}
              >
                {deletingId === item.id ? (
                  <ActivityIndicator size="small" color={Colors.error} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    <Text style={styles.btnDeleteText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <VendorVerificationGate>
      <View style={styles.container}>
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading courses…</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={list}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContent, list.length === 0 && styles.listEmpty]}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="school-outline" size={56} color={Colors.textSecondary} />
                  <Text style={styles.emptyTitle}>No courses yet</Text>
                  <Text style={styles.emptySubtitle}>Create a course to add lessons and topics.</Text>
                </View>
              }
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
              }
            />
            <TouchableOpacity
              style={[styles.fab, { bottom: 16 }]}
              onPress={openCreateModal}
            >
              <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>
          </>
        )}

        {/* Create Course Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.modalTitle}>Create New Course</Text>
                  <Text style={styles.modalSubtitle}>Add lessons and topics after creation.</Text>
                </View>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={closeModal}>
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ marginTop: 16 }}
                contentContainerStyle={{ paddingBottom: 12 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Course Title *</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.input}
                      value={title}
                      onChangeText={setTitle}
                      placeholder="e.g., JEE Physics Course"
                      placeholderTextColor={Colors.placeholder}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Description</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Full year preparation course…"
                      placeholderTextColor={Colors.placeholder}
                      multiline
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.btnPrimary, saving && { opacity: 0.7 }]}
                  onPress={handleCreate}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Create Course</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary} onPress={closeModal}>
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </VendorVerificationGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 14, color: Colors.textSecondary, fontFamily: Typography.fontFamily.regular },

  listContent: { padding: 16, paddingBottom: 96 },
  listEmpty: { flexGrow: 1 },

  // Card
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontFamily: Typography.fontFamily.extraBold, color: Colors.text, marginBottom: 4 },
  cardDescription: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, lineHeight: 18 },
  cardDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  cardDateText: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12, width: '100%' },
  btnView: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}15`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  btnViewText: { fontSize: 13, fontFamily: Typography.fontFamily.semiBold, color: Colors.primary },
  btnDelete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: `${Colors.error}12`,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
  },
  btnDeleteText: { fontSize: 13, fontFamily: Typography.fontFamily.semiBold, color: Colors.error },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 56 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontFamily: Typography.fontFamily.extraBold, color: Colors.text },
  emptySubtitle: { marginTop: 4, fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, textAlign: 'center' },

  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontFamily: Typography.fontFamily.extraBold, color: Colors.text },
  modalSubtitle: { marginTop: 3, fontSize: 13, color: Colors.textSecondary, fontFamily: Typography.fontFamily.regular },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12, fontFamily: Typography.fontFamily.bold,
    color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
  },
  inputWrap: {
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#F9FAFB',
  },
  input: { fontSize: 14, color: Colors.text, fontFamily: Typography.fontFamily.regular, paddingHorizontal: 14, paddingVertical: 11 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnPrimary: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 999, backgroundColor: Colors.primary,
  },
  btnPrimaryText: { fontSize: 14, fontFamily: Typography.fontFamily.semiBold, color: '#FFF' },
  btnSecondary: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 999, backgroundColor: '#F1F5F9',
  },
  btnSecondaryText: { fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
});
