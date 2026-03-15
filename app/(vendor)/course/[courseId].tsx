import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';
import { VendorVerificationGate } from '@/components/VendorVerificationGate';
import { courseService, type CourseDetailData, type CourseLesson, type CourseTopic } from '@/services/course.service';
import { contentService, type VendorContent } from '@/services/content.service';
import { serviceService } from '@/services/service.service';
import { batchService } from '@/services/batch.service';
import { useAuth } from '@/context/AuthContext';

type Params = { courseId: string };

export const options = { href: null };

interface ServiceOption { id: string; name: string }
interface BatchOption { id: string; name: string; serviceName?: string }

export default function VendorCourseDetailScreen() {
  const { courseId } = useLocalSearchParams<Params>();
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lesson modals
  const [lessonModalVisible, setLessonModalVisible] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [savingLesson, setSavingLesson] = useState(false);
  const [editLessonModalVisible, setEditLessonModalVisible] = useState(false);
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState('');
  const [savingEditLesson, setSavingEditLesson] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);

  // Topic modals
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [topicLessonId, setTopicLessonId] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [savingTopic, setSavingTopic] = useState(false);
  const [editTopicModalVisible, setEditTopicModalVisible] = useState(false);
  const [editingTopic, setEditingTopic] = useState<CourseTopic | null>(null);
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [savingEditTopic, setSavingEditTopic] = useState(false);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);

  // Expand state
  const [expandedLessonIds, setExpandedLessonIds] = useState<Set<string>>(new Set());
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(new Set());

  // Content attachment
  const [detachingContentId, setDetachingContentId] = useState<string | null>(null);
  const [attachContentModalVisible, setAttachContentModalVisible] = useState(false);
  const [attachContentTopic, setAttachContentTopic] = useState<CourseTopic | null>(null);
  const [contentList, setContentList] = useState<VendorContent[]>([]);
  const [contentListLoading, setContentListLoading] = useState(false);
  const [selectedContentIds, setSelectedContentIds] = useState<Set<string>>(new Set());
  const [attachingContent, setAttachingContent] = useState(false);

  // Visibility modal
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
  const [visibilityAccessScope, setVisibilityAccessScope] = useState<'service' | 'batch'>('service');
  const [visibilityServices, setVisibilityServices] = useState<ServiceOption[]>([]);
  const [visibilityBatches, setVisibilityBatches] = useState<BatchOption[]>([]);
  const [visibilityServicesLoading, setVisibilityServicesLoading] = useState(false);
  const [visibilityBatchesLoading, setVisibilityBatchesLoading] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  const [updatingVisibility, setUpdatingVisibility] = useState(false);

  const loadCourse = useCallback(async () => {
    if (!courseId) return;
    try {
      const res = await courseService.getCourseById(courseId);
      setCourse(res.data);
      setError(null);
      const lessonIds = (res.data.lessons ?? [])
        .filter((l) => (l.topics?.length ?? 0) > 0)
        .map((l) => l.id);
      setExpandedLessonIds(new Set(lessonIds));
      const topicIds = (res.data.lessons ?? []).flatMap((l) =>
        (l.topics ?? []).filter((t) => (t.contents?.length ?? 0) > 0).map((t) => t.id)
      );
      setExpandedTopicIds(new Set(topicIds));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load course.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    loadCourse();
  }, [courseId, loadCourse]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (lessonModalVisible) {
          setLessonModalVisible(false);
          return true;
        }
        if (editLessonModalVisible) {
          setEditLessonModalVisible(false);
          setEditingLesson(null);
          return true;
        }
        if (topicModalVisible) {
          setTopicModalVisible(false);
          setTopicLessonId(null);
          return true;
        }
        if (editTopicModalVisible) {
          setEditTopicModalVisible(false);
          setEditingTopic(null);
          return true;
        }
        if (attachContentModalVisible) {
          setAttachContentModalVisible(false);
          setAttachContentTopic(null);
          setSelectedContentIds(new Set());
          return true;
        }
        if (visibilityModalVisible) {
          setVisibilityModalVisible(false);
          return true;
        }
        router.replace('/(vendor)/courses' as any);
        return true;
      });
      return () => sub.remove();
    }, [
      router,
      lessonModalVisible,
      editLessonModalVisible,
      topicModalVisible,
      editTopicModalVisible,
      attachContentModalVisible,
      visibilityModalVisible,
    ])
  );

  // Lesson handlers
  const openAddLessonModal = () => { setLessonTitle(''); setLessonModalVisible(true); };
  const closeAddLessonModal = () => setLessonModalVisible(false);

  const handleAddLesson = async () => {
    if (!lessonTitle.trim()) { Alert.alert('Validation', 'Please enter a lesson title.'); return; }
    if (!courseId) return;
    setSavingLesson(true);
    try {
      const nextSeq = (course?.lessons?.length ?? 0) + 1;
      await courseService.createLesson(courseId, { title: lessonTitle.trim(), sequence: nextSeq });
      closeAddLessonModal();
      loadCourse();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create lesson.');
    } finally {
      setSavingLesson(false);
    }
  };

  const openEditLessonModal = (lesson: CourseLesson) => {
    setEditingLesson(lesson); setEditLessonTitle(lesson.title); setEditLessonModalVisible(true);
  };
  const closeEditLessonModal = () => { setEditLessonModalVisible(false); setEditingLesson(null); };

  const handleEditLesson = async () => {
    if (!editLessonTitle.trim()) { Alert.alert('Validation', 'Please enter a lesson title.'); return; }
    if (!editingLesson) return;
    setSavingEditLesson(true);
    try {
      await courseService.updateLesson(editingLesson.id, { title: editLessonTitle.trim() });
      closeEditLessonModal();
      loadCourse();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update lesson.');
    } finally {
      setSavingEditLesson(false);
    }
  };

  const handleDeleteLesson = (lesson: CourseLesson) => {
    Alert.alert(
      'Delete Lesson',
      `Delete "${lesson.title}"? This will also remove its topics.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setDeletingLessonId(lesson.id);
            try {
              await courseService.deleteLesson(lesson.id);
              loadCourse();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to delete lesson.');
            } finally {
              setDeletingLessonId(null);
            }
          },
        },
      ]
    );
  };

  // Topic handlers
  const openAddTopicModal = (lesson: CourseLesson) => {
    setTopicLessonId(lesson.id); setTopicTitle(''); setTopicModalVisible(true);
  };
  const closeAddTopicModal = () => { setTopicModalVisible(false); setTopicLessonId(null); };

  const handleAddTopic = async () => {
    if (!topicTitle.trim()) { Alert.alert('Validation', 'Please enter a topic title.'); return; }
    if (!topicLessonId) return;
    setSavingTopic(true);
    try {
      const lesson = course?.lessons?.find((l) => l.id === topicLessonId);
      const nextSeq = (lesson?.topics?.length ?? 0) + 1;
      await courseService.createTopic(topicLessonId, { title: topicTitle.trim(), sequence: nextSeq });
      closeAddTopicModal();
      loadCourse();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create topic.');
    } finally {
      setSavingTopic(false);
    }
  };

  const openEditTopicModal = (topic: CourseTopic) => {
    setEditingTopic(topic); setEditTopicTitle(topic.title); setEditTopicModalVisible(true);
  };
  const closeEditTopicModal = () => { setEditTopicModalVisible(false); setEditingTopic(null); };

  const handleEditTopic = async () => {
    if (!editTopicTitle.trim()) { Alert.alert('Validation', 'Please enter a topic title.'); return; }
    if (!editingTopic) return;
    setSavingEditTopic(true);
    try {
      await courseService.updateTopic(editingTopic.id, { title: editTopicTitle.trim() });
      closeEditTopicModal();
      loadCourse();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update topic.');
    } finally {
      setSavingEditTopic(false);
    }
  };

  const handleDeleteTopic = (topic: CourseTopic) => {
    Alert.alert(
      'Delete Topic',
      `Delete "${topic.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setDeletingTopicId(topic.id);
            try {
              await courseService.deleteTopic(topic.id);
              loadCourse();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to delete topic.');
            } finally {
              setDeletingTopicId(null);
            }
          },
        },
      ]
    );
  };

  // Expand toggles
  const toggleLessonExpanded = (id: string) => setExpandedLessonIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleTopicExpanded = (id: string) => setExpandedTopicIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Content attachment
  const openAttachContentModal = async (topic: CourseTopic) => {
    setAttachContentTopic(topic);
    setSelectedContentIds(new Set());
    setAttachContentModalVisible(true);
    setContentListLoading(true);
    try {
      const res = await contentService.getContent();
      setContentList(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setContentList([]);
    } finally {
      setContentListLoading(false);
    }
  };
  const closeAttachContentModal = () => {
    setAttachContentModalVisible(false); setAttachContentTopic(null); setSelectedContentIds(new Set());
  };
  const toggleContentSelection = (id: string) => setSelectedContentIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const handleDetachContent = async (topic: CourseTopic, contentId: string) => {
    Alert.alert('Remove Content', 'Remove this content from the topic?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setDetachingContentId(contentId);
          try {
            await courseService.detachContentFromTopic(topic.id, contentId);
            loadCourse();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to remove content.');
          } finally {
            setDetachingContentId(null);
          }
        },
      },
    ]);
  };
  const handleAttachContent = async () => {
    if (!attachContentTopic || selectedContentIds.size === 0) return;
    setAttachingContent(true);
    try {
      const alreadyAttachedIds = new Set((attachContentTopic.contents ?? []).map((c) => c.contentId));
      const toAttach = [...selectedContentIds].filter((id) => !alreadyAttachedIds.has(id));
      const startSeq = (attachContentTopic.contents?.length ?? 0) + 1;
      for (let i = 0; i < toAttach.length; i++) {
        await courseService.attachContentToTopic(attachContentTopic.id, {
          contentId: toAttach[i],
          sequence: startSeq + i,
        });
      }
      closeAttachContentModal();
      loadCourse();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to attach content.');
    } finally {
      setAttachingContent(false);
    }
  };

  // Visibility modal
  const openVisibilityModal = async () => {
    setVisibilityModalVisible(true);
    setVisibilityAccessScope('service');
    setSelectedServiceIds(new Set());
    setSelectedBatchIds(new Set());
    setVisibilityServicesLoading(true);
    setVisibilityBatchesLoading(true);
    try {
      const [svcRes, batchRes] = await Promise.all([
        user?.id ? serviceService.getServicesByUserId(user.id) : Promise.resolve({ data: [] }),
        batchService.getVendorBatches(),
      ]);
      setVisibilityServices((svcRes as any).data ?? []);
      setVisibilityBatches((batchRes as any).data ?? []);
    } catch (e) {
      setVisibilityServices([]); setVisibilityBatches([]);
    } finally {
      setVisibilityServicesLoading(false); setVisibilityBatchesLoading(false);
    }
  };
  const closeVisibilityModal = () => setVisibilityModalVisible(false);
  const toggleServiceSelection = (id: string) => setSelectedServiceIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleBatchSelection = (id: string) => setSelectedBatchIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const handleUpdateVisibility = async () => {
    if (!courseId) return;
    if (visibilityAccessScope === 'service' && selectedServiceIds.size === 0) {
      Alert.alert('Validation', 'Please select at least one service.'); return;
    }
    if (visibilityAccessScope === 'batch' && selectedBatchIds.size === 0) {
      Alert.alert('Validation', 'Please select at least one batch.'); return;
    }
    setUpdatingVisibility(true);
    try {
      await courseService.updateCourseVisibility(courseId, {
        accessScope: visibilityAccessScope,
        serviceIds: visibilityAccessScope === 'service' ? [...selectedServiceIds] : [],
        batchIds: visibilityAccessScope === 'batch' ? [...selectedBatchIds] : [],
      });
      Alert.alert('Success', 'Course visibility updated successfully.');
      closeVisibilityModal();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update visibility.');
    } finally {
      setUpdatingVisibility(false);
    }
  };

  if (loading) {
    return (
      <VendorVerificationGate>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading course…</Text>
        </View>
      </VendorVerificationGate>
    );
  }

  if (error || !course) {
    return (
      <VendorVerificationGate>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error ?? 'Course not found.'}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </VendorVerificationGate>
    );
  }

  return (
    <VendorVerificationGate>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.headerCardBg}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="book" size={22} color={Colors.primary} />
              </View>
              <View style={styles.headerTextBlock}>
                <Text style={styles.headerTitle} numberOfLines={2}>{course.title}</Text>
                {course.description ? (
                  <Text style={styles.headerDesc} numberOfLines={3}>{course.description}</Text>
                ) : (
                  <Text style={styles.headerDescPlaceholder}>No description</Text>
                )}
                <View style={styles.headerMetaRow}>
                  <Ionicons name="layers-outline" size={13} color={Colors.primary} />
                  <Text style={styles.headerMeta}>{course.lessons?.length ?? 0} lessons</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.settingsBtn} onPress={openVisibilityModal}>
                <Ionicons name="settings-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Course Structure */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Course Structure</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openAddLessonModal}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.addBtnText}>Add Lesson</Text>
            </TouchableOpacity>
          </View>

          {!course.lessons || course.lessons.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="folder-open-outline" size={36} color={Colors.textSecondary} />
              <Text style={styles.emptyHint}>No lessons yet. Tap "Add Lesson" to get started.</Text>
            </View>
          ) : (
            <View style={styles.lessonList}>
              {course.lessons.map((lesson) => {
                const isExpanded = expandedLessonIds.has(lesson.id);
                const topics = lesson.topics ?? [];
                return (
                  <View key={lesson.id} style={styles.lessonBlock}>
                    {/* Lesson row */}
                    <TouchableOpacity
                      style={styles.lessonRow}
                      onPress={() => toggleLessonExpanded(lesson.id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.lessonIconWrap}>
                        <Ionicons name="folder" size={18} color={Colors.primary} />
                      </View>
                      <View style={styles.lessonMeta}>
                        <Text style={styles.lessonNum}>Lesson {lesson.sequence}</Text>
                        <Text style={styles.lessonTitle}>{lesson.title}</Text>
                      </View>
                      <View style={styles.rowActions}>
                        <TouchableOpacity
                          style={styles.rowIconBtn}
                          onPress={(e) => { e.stopPropagation(); openAddTopicModal(lesson); }}
                        >
                          <Ionicons name="add-circle" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rowIconBtn}
                          onPress={(e) => { e.stopPropagation(); openEditLessonModal(lesson); }}
                        >
                          <MaterialIcons name="edit" size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rowIconBtn}
                          onPress={(e) => { e.stopPropagation(); handleDeleteLesson(lesson); }}
                          disabled={deletingLessonId === lesson.id}
                        >
                          {deletingLessonId === lesson.id ? (
                            <ActivityIndicator size="small" color={Colors.error} />
                          ) : (
                            <Ionicons name="trash" size={18} color={Colors.error} />
                          )}
                        </TouchableOpacity>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={Colors.textSecondary}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Topics */}
                    {isExpanded && (
                      <View style={styles.topicContainer}>
                        {topics.length === 0 ? (
                          <Text style={styles.emptyHint}>No topics. Tap + to add one.</Text>
                        ) : (
                          topics.map((topic) => {
                            const isTopicExpanded = expandedTopicIds.has(topic.id);
                            const sortedContents = [...(topic.contents ?? [])].sort((a, b) => a.sequence - b.sequence);
                            return (
                              <View key={topic.id} style={styles.topicBlock}>
                                <TouchableOpacity
                                  style={styles.topicRow}
                                  onPress={() => toggleTopicExpanded(topic.id)}
                                  activeOpacity={0.75}
                                >
                                  <View style={styles.topicIconWrap}>
                                    <Ionicons name="document-text" size={15} color="#10B981" />
                                  </View>
                                  <View style={styles.lessonMeta}>
                                    <Text style={styles.topicNum}>{lesson.sequence}.{topic.sequence}</Text>
                                    <Text style={styles.topicTitle}>{topic.title}</Text>
                                  </View>
                                  <View style={styles.rowActions}>
                                    <TouchableOpacity
                                      style={styles.rowIconBtn}
                                      onPress={(e) => { e.stopPropagation(); openAttachContentModal(topic); }}
                                    >
                                      <Ionicons name="attach" size={18} color={Colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={styles.rowIconBtn}
                                      onPress={(e) => { e.stopPropagation(); openEditTopicModal(topic); }}
                                    >
                                      <MaterialIcons name="edit" size={16} color={Colors.textSecondary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={styles.rowIconBtn}
                                      onPress={(e) => { e.stopPropagation(); handleDeleteTopic(topic); }}
                                      disabled={deletingTopicId === topic.id}
                                    >
                                      {deletingTopicId === topic.id ? (
                                        <ActivityIndicator size="small" color={Colors.error} />
                                      ) : (
                                        <Ionicons name="trash" size={16} color={Colors.error} />
                                      )}
                                    </TouchableOpacity>
                                    <Ionicons
                                      name={isTopicExpanded ? 'chevron-up' : 'chevron-down'}
                                      size={16}
                                      color={Colors.textSecondary}
                                    />
                                  </View>
                                </TouchableOpacity>

                                {/* Content items */}
                                {isTopicExpanded && (
                                  <View style={styles.contentContainer}>
                                    {sortedContents.length === 0 ? (
                                      <Text style={styles.emptyHintSmall}>No content attached. Use the attach icon to add content.</Text>
                                    ) : (
                                      sortedContents.map((cm) => (
                                        <View key={cm.id} style={styles.contentRow}>
                                          <View style={styles.contentIconWrap}>
                                            <Ionicons
                                              name={cm.content?.contentType === 'video' ? 'play' : 'document-text'}
                                              size={13}
                                              color={Colors.primary}
                                            />
                                          </View>
                                          <Text style={styles.contentRowTitle} numberOfLines={1}>
                                            {cm.content?.title ?? 'Untitled'}
                                          </Text>
                                          <TouchableOpacity
                                            style={styles.rowIconBtn}
                                            onPress={() => handleDetachContent(topic, cm.contentId)}
                                            disabled={detachingContentId === cm.contentId}
                                          >
                                            {detachingContentId === cm.contentId ? (
                                              <ActivityIndicator size="small" color={Colors.error} />
                                            ) : (
                                              <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
                                            )}
                                          </TouchableOpacity>
                                        </View>
                                      ))
                                    )}
                                  </View>
                                )}
                              </View>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Lesson Modal */}
      <Modal visible={lessonModalVisible} animationType="slide" transparent onRequestClose={closeAddLessonModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.modalTitle}>Add Lesson</Text>
                <Text style={styles.modalSubtitle}>Create a new lesson in this course.</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeAddLessonModal}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Lesson Title *</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={lessonTitle}
                  onChangeText={setLessonTitle}
                  placeholder="e.g., Kinematics"
                  placeholderTextColor={Colors.placeholder}
                  autoFocus
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleAddLesson} disabled={savingLesson}>
                {savingLesson ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimaryText}>Add Lesson</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={closeAddLessonModal}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Lesson Modal */}
      <Modal visible={editLessonModalVisible} animationType="slide" transparent onRequestClose={closeEditLessonModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.modalTitle}>Edit Lesson</Text>
                <Text style={styles.modalSubtitle}>Update the lesson title.</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeEditLessonModal}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Lesson Title *</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={editLessonTitle}
                  onChangeText={setEditLessonTitle}
                  placeholder="e.g., Kinematics"
                  placeholderTextColor={Colors.placeholder}
                  autoFocus
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btnPrimary, savingEditLesson && { opacity: 0.7 }]}
                onPress={handleEditLesson}
                disabled={savingEditLesson}
              >
                {savingEditLesson ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimaryText}>Save Changes</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={closeEditLessonModal}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Topic Modal */}
      <Modal visible={topicModalVisible} animationType="slide" transparent onRequestClose={closeAddTopicModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.modalTitle}>Add Topic</Text>
                <Text style={styles.modalSubtitle}>Create a new topic in this lesson.</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeAddTopicModal}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Topic Title *</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={topicTitle}
                  onChangeText={setTopicTitle}
                  placeholder="e.g., Displacement vs Distance"
                  placeholderTextColor={Colors.placeholder}
                  autoFocus
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btnPrimary, savingTopic && { opacity: 0.7 }]}
                onPress={handleAddTopic}
                disabled={savingTopic}
              >
                {savingTopic ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimaryText}>Add Topic</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={closeAddTopicModal}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Topic Modal */}
      <Modal visible={editTopicModalVisible} animationType="slide" transparent onRequestClose={closeEditTopicModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.modalTitle}>Edit Topic</Text>
                <Text style={styles.modalSubtitle}>Update the topic title.</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeEditTopicModal}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Topic Title *</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={editTopicTitle}
                  onChangeText={setEditTopicTitle}
                  placeholder="e.g., Displacement vs Distance"
                  placeholderTextColor={Colors.placeholder}
                  autoFocus
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btnPrimary, savingEditTopic && { opacity: 0.7 }]}
                onPress={handleEditTopic}
                disabled={savingEditTopic}
              >
                {savingEditTopic ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimaryText}>Save Changes</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={closeEditTopicModal}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Attach Content Modal */}
      <Modal visible={attachContentModalVisible} animationType="slide" transparent onRequestClose={closeAttachContentModal}>
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
          <View style={[styles.modalCard, { maxHeight: '75%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.modalTitle}>Attach Content</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  To topic: {attachContentTopic?.title ?? ''}
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeAttachContentModal}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {contentListLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading content…</Text>
              </View>
            ) : (
              <ScrollView
                style={{ marginTop: 12 }}
                contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                showsVerticalScrollIndicator={false}
              >
                {contentList.length === 0 ? (
                  <Text style={styles.emptyHint}>No content available. Create content in the Content section first.</Text>
                ) : (
                  contentList.map((item) => {
                    const isSelected = selectedContentIds.has(item.id);
                    const alreadyAttached = (attachContentTopic?.contents ?? []).some((c) => c.contentId === item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.contentPickerCard, isSelected && styles.contentPickerCardSelected, alreadyAttached && styles.contentPickerCardDisabled]}
                        onPress={() => !alreadyAttached && toggleContentSelection(item.id)}
                        activeOpacity={0.75}
                        disabled={alreadyAttached}
                      >
                        <View style={styles.contentPickerIcon}>
                          <Ionicons
                            name={item.contentType === 'video' ? 'play' : 'document-text'}
                            size={18}
                            color={Colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.contentPickerTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.contentPickerSub}>{item.contentType === 'video' ? 'Video' : 'Article'}</Text>
                        </View>
                        {alreadyAttached ? (
                          <Ionicons name="checkmark-done-circle" size={22} color={Colors.textSecondary} />
                        ) : (
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={isSelected ? Colors.primary : Colors.textSecondary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}

            <View style={[styles.modalActions, { marginTop: 12 }]}>
              <TouchableOpacity
                style={[styles.btnPrimary, (selectedContentIds.size === 0 || attachingContent) && { opacity: 0.6 }]}
                onPress={handleAttachContent}
                disabled={selectedContentIds.size === 0 || attachingContent}
              >
                {attachingContent ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Attach {selectedContentIds.size > 0 ? `(${selectedContentIds.size})` : ''}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={closeAttachContentModal}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Course Visibility Modal */}
      <Modal visible={visibilityModalVisible} animationType="slide" transparent onRequestClose={closeVisibilityModal}>
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.modalTitle}>Course Visibility</Text>
                <Text style={styles.modalSubtitle}>Assign this course to services or batches.</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeVisibilityModal}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Course info */}
            <View style={styles.visibilityCourseBox}>
              <Text style={styles.visibilityCourseTitle}>{course.title}</Text>
              {course.description ? (
                <Text style={styles.visibilityCourseDesc} numberOfLines={2}>{course.description}</Text>
              ) : null}
            </View>

            {/* Scope selector */}
            <Text style={styles.fieldLabel}>Access Scope</Text>
            <View style={styles.scopeRow}>
              {(['service', 'batch'] as const).map((scope) => (
                <TouchableOpacity
                  key={scope}
                  style={[styles.scopeBtn, visibilityAccessScope === scope && styles.scopeBtnActive]}
                  onPress={() => setVisibilityAccessScope(scope)}
                >
                  <Text style={[styles.scopeBtnText, visibilityAccessScope === scope && styles.scopeBtnTextActive]}>
                    {scope.charAt(0).toUpperCase() + scope.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ marginBottom: 12 }} showsVerticalScrollIndicator={false}>
              {visibilityAccessScope === 'service' && (
                <>
                  <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Select Services</Text>
                  {visibilityServicesLoading ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : visibilityServices.length === 0 ? (
                    <Text style={styles.emptyHint}>No services found.</Text>
                  ) : (
                    visibilityServices.map((s) => (
                      <TouchableOpacity key={s.id} style={styles.checkRow} onPress={() => toggleServiceSelection(s.id)}>
                        <Ionicons
                          name={selectedServiceIds.has(s.id) ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={selectedServiceIds.has(s.id) ? Colors.primary : Colors.textSecondary}
                        />
                        <Text style={styles.checkLabel}>{s.name}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}
              {visibilityAccessScope === 'batch' && (
                <>
                  <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Select Batches</Text>
                  {visibilityBatchesLoading ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : visibilityBatches.length === 0 ? (
                    <Text style={styles.emptyHint}>No batches found.</Text>
                  ) : (
                    visibilityBatches.map((b) => (
                      <TouchableOpacity key={b.id} style={styles.checkRow} onPress={() => toggleBatchSelection(b.id)}>
                        <Ionicons
                          name={selectedBatchIds.has(b.id) ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={selectedBatchIds.has(b.id) ? Colors.primary : Colors.textSecondary}
                        />
                        <Text style={styles.checkLabel}>{b.serviceName ? `${b.name} (${b.serviceName})` : b.name}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  (updatingVisibility ||
                    (visibilityAccessScope === 'service' && selectedServiceIds.size === 0) ||
                    (visibilityAccessScope === 'batch' && selectedBatchIds.size === 0)) && { opacity: 0.6 },
                ]}
                onPress={handleUpdateVisibility}
                disabled={
                  updatingVisibility ||
                  (visibilityAccessScope === 'service' && selectedServiceIds.size === 0) ||
                  (visibilityAccessScope === 'batch' && selectedBatchIds.size === 0)
                }
              >
                {updatingVisibility ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.btnPrimaryText}>Update Visibility</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={closeVisibilityModal}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </VendorVerificationGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 10 },
  loadingText: { fontSize: 14, color: Colors.textSecondary, fontFamily: Typography.fontFamily.regular },
  errorText: { fontSize: 15, color: Colors.text, textAlign: 'center', fontFamily: Typography.fontFamily.regular },
  backBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: Colors.primary, borderRadius: 10 },
  backBtnText: { fontSize: 15, fontFamily: Typography.fontFamily.semiBold, color: '#FFF' },

  // Header card
  headerCard: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 16,
  },
  headerCardBg: {
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerIconWrap: {
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    backgroundColor: `${Colors.primary}22`, alignItems: 'center', justifyContent: 'center',
  },
  headerTextBlock: { flex: 1, minWidth: 0 },
  settingsBtn: {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    backgroundColor: `${Colors.primary}18`, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontFamily: Typography.fontFamily.extraBold, color: Colors.text, marginBottom: 4 },
  headerDesc: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, lineHeight: 19, marginBottom: 8 },
  headerDescPlaceholder: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textLight, fontStyle: 'italic', marginBottom: 8 },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  headerMeta: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.primary },

  // Section
  section: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontFamily: Typography.fontFamily.extraBold, color: Colors.text },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 12, backgroundColor: Colors.primary,
  },
  addBtnText: { fontSize: 13, fontFamily: Typography.fontFamily.semiBold, color: '#FFF', top: -1 },

  lessonList: { gap: 10 },
  lessonBlock: { gap: 0 },

  lessonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: `${Colors.primary}08`, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: `${Colors.primary}20`,
  },
  lessonIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${Colors.primary}18`, alignItems: 'center', justifyContent: 'center',
  },
  lessonMeta: { flex: 1, minWidth: 0 },
  lessonNum: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  lessonTitle: { fontSize: 14, fontFamily: Typography.fontFamily.semiBold, color: Colors.text },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rowIconBtn: { padding: 6 },

  // Topics
  topicContainer: {
    marginTop: 8, marginLeft: 12,
    borderLeftWidth: 2, borderLeftColor: `${Colors.primary}30`,
    paddingLeft: 12, gap: 6,
  },
  topicBlock: { gap: 0 },
  topicRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.backgroundSecondary, borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: Colors.border,
  },
  topicIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center',
  },
  topicNum: { fontSize: 10, fontFamily: Typography.fontFamily.medium, color: '#10B981', textTransform: 'uppercase' },
  topicTitle: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.text },

  // Content items
  contentContainer: {
    marginTop: 6, marginLeft: 10,
    borderLeftWidth: 2, borderLeftColor: Colors.border,
    paddingLeft: 10, gap: 4,
  },
  contentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.backgroundSecondary, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  contentIconWrap: {
    width: 24, height: 24, borderRadius: 6,
    backgroundColor: `${Colors.primary}18`, alignItems: 'center', justifyContent: 'center',
  },
  contentRowTitle: { flex: 1, fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.text },

  // Empty / hints
  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyHint: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center' },
  emptyHintSmall: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, fontStyle: 'italic' },

  // Modal shared
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
  },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: Typography.fontFamily.extraBold, color: Colors.text },
  modalSubtitle: { marginTop: 3, fontSize: 13, color: Colors.textSecondary, fontFamily: Typography.fontFamily.regular },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  inputWrap: { borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#F9FAFB' },
  input: { fontSize: 14, color: Colors.text, fontFamily: Typography.fontFamily.regular, paddingHorizontal: 14, paddingVertical: 11 },
  modalActions: { flexDirection: 'row', gap: 10 },
  btnPrimary: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 16, backgroundColor: Colors.primary,
  },
  btnPrimaryText: { fontSize: 14, fontFamily: Typography.fontFamily.semiBold, color: '#FFF',  },
  btnSecondary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 16, backgroundColor: '#F1F5F9' },
  btnSecondaryText: { fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary,  },
  loadingBox: { paddingVertical: 32, alignItems: 'center', gap: 10 },

  // Attach content picker
  contentPickerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#FAFAFA',
  },
  contentPickerCardSelected: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}08` },
  contentPickerCardDisabled: { opacity: 0.5 },
  contentPickerIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: `${Colors.primary}18`, alignItems: 'center', justifyContent: 'center',
  },
  contentPickerTitle: { fontSize: 14, fontFamily: Typography.fontFamily.semiBold, color: Colors.text },
  contentPickerSub: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },

  // Visibility modal
  visibilityCourseBox: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 12, marginBottom: 14,
  },
  visibilityCourseTitle: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.text, marginBottom: 3 },
  visibilityCourseDesc: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary },
  scopeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  scopeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: '#FFF',
  },
  scopeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  scopeBtnText: { fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  scopeBtnTextActive: { color: '#FFF', fontFamily: Typography.fontFamily.semiBold },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  checkLabel: { flex: 1, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.text },
});
