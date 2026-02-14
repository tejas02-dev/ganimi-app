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
import { VendorVerificationGate } from '@/components/VendorVerificationGate';
import { courseService, type VendorCourse } from '@/services/course.service';

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function VendorCoursesScreen() {
  const router = useRouter();
  const [list, setList] = useState<VendorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const loadCourses = useCallback(async () => {
    try {
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

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCourses();
  };

  const openCreateModal = () => {
    setTitle('');
    setDescription('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

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
              Alert.alert('Success', 'Course deleted successfully.');
              loadCourses();
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
      Alert.alert('Success', 'Course created successfully.');
      closeModal();
      loadCourses();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create course.');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: VendorCourse }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Ionicons name="bookmark-outline" size={20} color={Colors.primary} />
      </View>
      {item.description ? (
        <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
      ) : null}
      <Text style={styles.cardDate}>Created {formatDate(item.createdAt)}</Text>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.cardBtn, styles.cardBtnEdit]}
          onPress={() => router.push({ pathname: '/(vendor)/course/[courseId]' as any, params: { courseId: item.id } })}
        >
          <Ionicons name="create-outline" size={18} color={Colors.primary} />
          <Text style={styles.cardBtnEditText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cardBtn, styles.cardBtnContent]}
          onPress={() => router.push({ pathname: '/(vendor)/course/[courseId]' as any, params: { courseId: item.id } })}
        >
          <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
          <Text style={styles.cardBtnContentText}>Content</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cardBtn, styles.cardBtnDelete]}
          onPress={() => handleDelete(item)}
          disabled={deletingId === item.id}
        >
          {deletingId === item.id ? (
            <ActivityIndicator size="small" color="#FF6B6B" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
              <Text style={styles.cardBtnDeleteText}>Delete</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <VendorVerificationGate>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Courses</Text>
          <Text style={styles.subtitle}>
            Create and manage your courses and batches here.
          </Text>
        </View>

        {loading ? (
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
                  <Text style={styles.emptySubtitle}>
                    Create a course to add lessons and topics.
                  </Text>
                </View>
              }
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
              }
            />
            <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
              <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>
          </>
        )}

        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboardView}
            >
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalTitle}>Create New Course</Text>
                    <Text style={styles.modalSubtitle}>
                      Add a new course to your curriculum. You can add lessons and topics after creation.
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.field}>
                    <Text style={styles.label}>Course Title *</Text>
                    <TextInput
                      style={styles.input}
                      value={title}
                      onChangeText={setTitle}
                      placeholder="e.g., JEE Physics Course"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Full year preparation course..."
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                    />
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.createBtn, saving && styles.createBtnDisabled]}
                      onPress={handleCreate}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.createBtnText}>Create Course</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    </VendorVerificationGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.backgroundSecondary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 88,
  },
  listEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  cardDate: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  cardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  cardBtnEdit: {
    backgroundColor: `${Colors.primary}15`,
    borderColor: `${Colors.primary}22`,
  },
  cardBtnEditText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  cardBtnContent: {
    backgroundColor: `${Colors.primary}15`,
    borderColor: `${Colors.primary}22`,
  },
  cardBtnContentText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  cardBtnDelete: {
    backgroundColor: '#FFF0F0',
    borderColor: 'rgba(255, 107, 107, 0.25)',
  },
  cardBtnDeleteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalKeyboardView: {
    width: '100%',
    maxWidth: 420,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  closeBtn: {
    marginLeft: -8,
    marginTop: -4,
  },
  modalScroll: {
    maxHeight: 360,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  modalActions: {
    marginTop: 8,
    marginBottom: 24,
    gap: 10,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnDisabled: {
    opacity: 0.7,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
