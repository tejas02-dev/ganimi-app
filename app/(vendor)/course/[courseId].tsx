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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { VendorVerificationGate } from '@/components/VendorVerificationGate';
import { courseService, type CourseDetailData, type CourseLesson, type CourseTopic } from '@/services/course.service';
import { contentService, type VendorContent } from '@/services/content.service';
import { serviceService } from '@/services/service.service';
import { batchService } from '@/services/batch.service';
import { useAuth } from '@/context/AuthContext';

type Params = {
  courseId: string;
};

export const options = {
  href: null,
};

interface ServiceOption {
  id: string;
  name: string;
}

interface BatchOption {
  id: string;
  name: string;
  serviceName?: string;
}

export default function VendorCourseDetailScreen() {
  const { courseId } = useLocalSearchParams<Params>();
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessonModalVisible, setLessonModalVisible] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [savingLesson, setSavingLesson] = useState(false);
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [topicLessonId, setTopicLessonId] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [savingTopic, setSavingTopic] = useState(false);
  const [editLessonModalVisible, setEditLessonModalVisible] = useState(false);
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState('');
  const [savingEditLesson, setSavingEditLesson] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [editTopicModalVisible, setEditTopicModalVisible] = useState(false);
  const [editingTopic, setEditingTopic] = useState<CourseTopic | null>(null);
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [savingEditTopic, setSavingEditTopic] = useState(false);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
  const [expandedLessonIds, setExpandedLessonIds] = useState<Set<string>>(new Set());
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(new Set());
  const [detachingContentId, setDetachingContentId] = useState<string | null>(null);
  const [attachContentModalVisible, setAttachContentModalVisible] = useState(false);
  const [attachContentTopic, setAttachContentTopic] = useState<CourseTopic | null>(null);
  const [contentList, setContentList] = useState<VendorContent[]>([]);
  const [contentListLoading, setContentListLoading] = useState(false);
  const [selectedContentIds, setSelectedContentIds] = useState<Set<string>>(new Set());
  const [attachingContent, setAttachingContent] = useState(false);
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
      // Expand lessons that have topics so hierarchy is visible
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

  const openAddLessonModal = () => {
    setLessonTitle('');
    setLessonModalVisible(true);
  };

  const closeAddLessonModal = () => {
    setLessonModalVisible(false);
  };

  const openAddTopicModal = (lesson: CourseLesson) => {
    setTopicLessonId(lesson.id);
    setTopicTitle('');
    setTopicModalVisible(true);
  };

  const closeAddTopicModal = () => {
    setTopicModalVisible(false);
    setTopicLessonId(null);
  };

  const handleAddTopic = async () => {
    if (!topicTitle.trim()) {
      Alert.alert('Validation', 'Please enter a topic title.');
      return;
    }
    if (!topicLessonId) return;
    setSavingTopic(true);
    try {
      const lesson = course?.lessons?.find((l) => l.id === topicLessonId);
      const nextSeq = (lesson?.topics?.length ?? 0) + 1;
      await courseService.createTopic(topicLessonId, { title: topicTitle.trim(), sequence: nextSeq });
      Alert.alert('Success', 'Topic created successfully.');
      closeAddTopicModal();
      loadCourse();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create topic.');
    } finally {
      setSavingTopic(false);
    }
  };

  const openEditLessonModal = (lesson: CourseLesson) => {
    setEditingLesson(lesson);
    setEditLessonTitle(lesson.title);
    setEditLessonModalVisible(true);
  };

  const closeEditLessonModal = () => {
    setEditLessonModalVisible(false);
    setEditingLesson(null);
  };

  const handleEditLesson = async () => {
    if (!editLessonTitle.trim()) {
      Alert.alert('Validation', 'Please enter a lesson title.');
      return;
    }
    if (!editingLesson) return;
    setSavingEditLesson(true);
    try {
      await courseService.updateLesson(editingLesson.id, { title: editLessonTitle.trim() });
      Alert.alert('Success', 'Lesson updated successfully.');
      closeEditLessonModal();
      loadCourse();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update lesson.');
    } finally {
      setSavingEditLesson(false);
    }
  };

  const toggleTopicExpanded = (topicId: string) => {
    setExpandedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const toggleLessonExpanded = (lessonId: string) => {
    setExpandedLessonIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  const openEditTopicModal = (topic: CourseTopic) => {
    setEditingTopic(topic);
    setEditTopicTitle(topic.title);
    setEditTopicModalVisible(true);
  };

  const closeEditTopicModal = () => {
    setEditTopicModalVisible(false);
    setEditingTopic(null);
  };

  const handleEditTopic = async () => {
    if (!editTopicTitle.trim()) {
      Alert.alert('Validation', 'Please enter a topic title.');
      return;
    }
    if (!editingTopic) return;
    setSavingEditTopic(true);
    try {
      await courseService.updateTopic(editingTopic.id, { title: editTopicTitle.trim() });
      Alert.alert('Success', 'Topic updated successfully.');
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
      'Delete topic',
      `Are you sure you want to delete "${topic.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingTopicId(topic.id);
            try {
              await courseService.deleteTopic(topic.id);
              Alert.alert('Success', 'Topic deleted successfully.');
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

  const openAttachContentModal = async (topic: CourseTopic) => {
    setAttachContentTopic(topic);
    setSelectedContentIds(new Set());
    setAttachContentModalVisible(true);
    setContentListLoading(true);
    try {
      const res = await contentService.getContent();
      setContentList(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load content', e);
      setContentList([]);
    } finally {
      setContentListLoading(false);
    }
  };

  const closeAttachContentModal = () => {
    setAttachContentModalVisible(false);
    setAttachContentTopic(null);
    setSelectedContentIds(new Set());
  };

  const toggleContentSelection = (contentId: string) => {
    setSelectedContentIds((prev) => {
      const next = new Set(prev);
      if (next.has(contentId)) next.delete(contentId);
      else next.add(contentId);
      return next;
    });
  };

  const handleDetachContent = async (topic: CourseTopic, contentId: string) => {
    Alert.alert(
      'Remove content',
      'Remove this content from the topic?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDetachingContentId(contentId);
            try {
              await courseService.detachContentFromTopic(topic.id, contentId);
              Alert.alert('Success', 'Content removed from topic.');
              loadCourse();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to remove content.');
            } finally {
              setDetachingContentId(null);
            }
          },
        },
      ]
    );
  };

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
      console.error('Failed to load services/batches', e);
      setVisibilityServices([]);
      setVisibilityBatches([]);
    } finally {
      setVisibilityServicesLoading(false);
      setVisibilityBatchesLoading(false);
    }
  };

  const closeVisibilityModal = () => {
    setVisibilityModalVisible(false);
  };

  const toggleServiceSelection = (id: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBatchSelection = (id: string) => {
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUpdateVisibility = async () => {
    if (!courseId) return;
    if (visibilityAccessScope === 'service' && selectedServiceIds.size === 0) {
      Alert.alert('Validation', 'Please select at least one service.');
      return;
    }
    if (visibilityAccessScope === 'batch' && selectedBatchIds.size === 0) {
      Alert.alert('Validation', 'Please select at least one batch.');
      return;
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

  const handleAttachContent = async () => {
    if (!attachContentTopic || selectedContentIds.size === 0) return;
    setAttachingContent(true);
    try {
      const alreadyAttachedIds = new Set(
        (attachContentTopic.contents ?? []).map((c) => c.contentId)
      );
      const toAttach = [...selectedContentIds].filter((id) => !alreadyAttachedIds.has(id));
      const startSeq = (attachContentTopic.contents?.length ?? 0) + 1;
      for (let i = 0; i < toAttach.length; i++) {
        await courseService.attachContentToTopic(attachContentTopic.id, {
          contentId: toAttach[i],
          sequence: startSeq + i,
        });
      }
      Alert.alert('Success', `${toAttach.length} content item(s) attached successfully.`);
      closeAttachContentModal();
      loadCourse();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to attach content.');
    } finally {
      setAttachingContent(false);
    }
  };

  const handleDeleteLesson = (lesson: CourseLesson) => {
    Alert.alert(
      'Delete lesson',
      `Are you sure you want to delete "${lesson.title}"? This will also remove its topics.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingLessonId(lesson.id);
            try {
              await courseService.deleteLesson(lesson.id);
              Alert.alert('Success', 'Lesson deleted successfully.');
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

  const handleAddLesson = async () => {
    if (!lessonTitle.trim()) {
      Alert.alert('Validation', 'Please enter a lesson title.');
      return;
    }
    if (!courseId) return;
    setSavingLesson(true);
    try {
      const nextSeq = (course?.lessons?.length ?? 0) + 1;
      await courseService.createLesson(courseId, { title: lessonTitle.trim(), sequence: nextSeq });
      Alert.alert('Success', 'Lesson created successfully.');
      closeAddLessonModal();
      loadCourse();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create lesson.');
    } finally {
      setSavingLesson(false);
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
        {/* Course title and description displayed above */}
        <View style={styles.headerCard}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{course.title}</Text>
            <TouchableOpacity style={styles.settingsBtn} onPress={openVisibilityModal}>
              <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {course.description ? (
            <Text style={styles.description}>{course.description}</Text>
          ) : (
            <Text style={styles.descriptionPlaceholder}>No description</Text>
          )}
        </View>

        {/* Content section - lessons/topics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Course Structure</Text>
            <TouchableOpacity style={styles.addLessonBtn} onPress={openAddLessonModal}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addLessonBtnText}>Add Lesson</Text>
            </TouchableOpacity>
          </View>
          {course.lessons && course.lessons.length > 0 ? (
            <View style={styles.lessonList}>
              {course.lessons.map((lesson) => {
                const isExpanded = expandedLessonIds.has(lesson.id);
                const topics = lesson.topics ?? [];
                return (
                  <View key={lesson.id} style={styles.lessonBlock}>
                    <TouchableOpacity
                      style={styles.lessonItem}
                      onPress={() => toggleLessonExpanded(lesson.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={18}
                        color={Colors.textSecondary}
                      />
                      <Ionicons name="folder-outline" size={20} color={Colors.primary} />
                      <Text style={styles.lessonTitle}>
                        {lesson.sequence}. {lesson.title}
                      </Text>
                      <View style={styles.lessonActions}>
                        <TouchableOpacity
                          style={styles.lessonActionBtn}
                          onPress={(e) => { e.stopPropagation(); openAddTopicModal(lesson); }}
                        >
                          <Ionicons name="add" size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.lessonActionBtn}
                          onPress={(e) => { e.stopPropagation(); openEditLessonModal(lesson); }}
                        >
                          <Ionicons name="create-outline" size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.lessonActionBtn}
                          onPress={(e) => { e.stopPropagation(); handleDeleteLesson(lesson); }}
                          disabled={deletingLessonId === lesson.id}
                        >
                          {deletingLessonId === lesson.id ? (
                            <ActivityIndicator size="small" color="#FF6B6B" />
                          ) : (
                            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                    {isExpanded && topics.length > 0 && (
                      <View style={styles.topicList}>
                        {topics.map((topic) => {
                          const isTopicExpanded = expandedTopicIds.has(topic.id);
                          const topicContents = topic.contents ?? [];
                          const sortedContents = [...topicContents].sort(
                            (a, b) => a.sequence - b.sequence
                          );
                          return (
                            <View key={topic.id} style={styles.topicBlock}>
                              <TouchableOpacity
                                style={styles.topicItem}
                                onPress={() => toggleTopicExpanded(topic.id)}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={isTopicExpanded ? 'chevron-down' : 'chevron-forward'}
                                  size={16}
                                  color={Colors.textSecondary}
                                />
                                <Ionicons name="document-text-outline" size={18} color="#10B981" />
                                <Text style={styles.topicTitle}>
                                  {lesson.sequence}.{topic.sequence} {topic.title}
                                </Text>
                                <View style={styles.lessonActions}>
                                  <TouchableOpacity
                                    style={styles.lessonActionBtn}
                                    onPress={(e) => { e.stopPropagation(); openAttachContentModal(topic); }}
                                  >
                                    <Ionicons name="add" size={18} color={Colors.textSecondary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.lessonActionBtn}
                                    onPress={(e) => { e.stopPropagation(); openEditTopicModal(topic); }}
                                  >
                                    <Ionicons name="create-outline" size={16} color={Colors.textSecondary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.lessonActionBtn}
                                    onPress={(e) => { e.stopPropagation(); handleDeleteTopic(topic); }}
                                    disabled={deletingTopicId === topic.id}
                                  >
                                    {deletingTopicId === topic.id ? (
                                      <ActivityIndicator size="small" color="#FF6B6B" />
                                    ) : (
                                      <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                                    )}
                                  </TouchableOpacity>
                                </View>
                              </TouchableOpacity>
                              {isTopicExpanded && sortedContents.length > 0 && (
                                <View style={styles.contentList}>
                                  {sortedContents.map((cm) => (
                                    <View key={cm.id} style={styles.contentItem}>
                                      <Ionicons
                                        name="document-text-outline"
                                        size={16}
                                        color={Colors.primary}
                                      />
                                      <Text style={styles.contentRowTitle} numberOfLines={1}>
                                        {cm.content?.title ?? 'Untitled'}
                                      </Text>
                                      <TouchableOpacity
                                        style={styles.lessonActionBtn}
                                        onPress={() => handleDetachContent(topic, cm.contentId)}
                                        disabled={detachingContentId === cm.contentId}
                                      >
                                        {detachingContentId === cm.contentId ? (
                                          <ActivityIndicator size="small" color="#FF6B6B" />
                                        ) : (
                                          <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                                        )}
                                      </TouchableOpacity>
                                    </View>
                                  ))}
                                </View>
                              )}
                              {isTopicExpanded && sortedContents.length === 0 && (
                                <View style={styles.contentList}>
                                  <Text style={styles.noContentHint}>No content attached. Use + to add content.</Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                    {isExpanded && topics.length === 0 && (
                      <View style={styles.topicList}>
                        <Text style={styles.noTopicsHint}>No topics yet. Use + to add a topic.</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyHint}>No lessons yet. Add lessons and topics to build your course.</Text>
          )}
        </View>
      </ScrollView>

      {/* Add Lesson modal */}
      <Modal
        visible={lessonModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeAddLessonModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardView}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Add Lesson</Text>
                  <Text style={styles.modalSubtitle}>Create a new lesson in this course.</Text>
                </View>
                <TouchableOpacity onPress={closeAddLessonModal} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.label}>Lesson Title *</Text>
                <TextInput
                  style={styles.input}
                  value={lessonTitle}
                  onChangeText={setLessonTitle}
                  placeholder="e.g., Kinematics"
                  placeholderTextColor={Colors.textSecondary}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeAddLessonModal}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addLessonSubmitBtn, savingLesson && styles.addLessonSubmitDisabled]}
                    onPress={handleAddLesson}
                    disabled={savingLesson}
                  >
                    {savingLesson ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.addLessonSubmitText}>Add Lesson</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Add Topic modal */}
      <Modal
        visible={topicModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeAddTopicModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardView}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Add Topic</Text>
                  <Text style={styles.modalSubtitle}>Create a new topic in this lesson.</Text>
                </View>
                <TouchableOpacity onPress={closeAddTopicModal} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.label}>Topic Title *</Text>
                <TextInput
                  style={styles.input}
                  value={topicTitle}
                  onChangeText={setTopicTitle}
                  placeholder="e.g., Displacement vs Distance"
                  placeholderTextColor={Colors.textSecondary}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeAddTopicModal}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addLessonSubmitBtn, savingTopic && styles.addLessonSubmitDisabled]}
                    onPress={handleAddTopic}
                    disabled={savingTopic}
                  >
                    {savingTopic ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.addLessonSubmitText}>Add Topic</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Attach Content to Topic modal */}
      <Modal
        visible={attachContentModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeAttachContentModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.attachContentModalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>Attach Content to Topic</Text>
                <Text style={styles.modalSubtitle}>
                  Select content items to add to '{attachContentTopic?.title ?? ''}'.
                </Text>
              </View>
              <TouchableOpacity onPress={closeAttachContentModal} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {contentListLoading ? (
              <View style={styles.attachContentLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.attachContentLoadingText}>Loading content…</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.attachContentScroll}
                contentContainerStyle={styles.attachContentScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {contentList.length === 0 ? (
                  <Text style={styles.attachContentEmpty}>No content available. Create content in the Content section first.</Text>
                ) : (
                  contentList.map((item) => {
                    const isSelected = selectedContentIds.has(item.id);
                    const alreadyAttached = (attachContentTopic?.contents ?? []).some(
                      (c) => c.contentId === item.id
                    );
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.contentItemCard,
                          isSelected && styles.contentItemCardSelected,
                        ]}
                        onPress={() => !alreadyAttached && toggleContentSelection(item.id)}
                        activeOpacity={0.7}
                        disabled={alreadyAttached}
                      >
                        <View style={styles.contentItemCheckbox}>
                          {alreadyAttached ? (
                            <Ionicons name="checkmark-done" size={20} color={Colors.textSecondary} />
                          ) : (
                            <Ionicons
                              name={isSelected ? 'checkbox' : 'square-outline'}
                              size={22}
                              color={isSelected ? Colors.primary : Colors.textSecondary}
                            />
                          )}
                        </View>
                        <View style={styles.contentItemBody}>
                          <Ionicons
                            name={item.contentType === 'video' ? 'videocam-outline' : 'document-text-outline'}
                            size={20}
                            color={Colors.primary}
                          />
                          <View style={styles.contentItemText}>
                            <Text style={styles.contentItemTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={styles.contentItemSubtitle}>
                              {item.contentType === 'video' ? 'Video' : 'Text'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.contentItemTag}>
                          <Text style={styles.contentItemTagText}>
                            {item.contentType ?? 'text'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}

            <View style={styles.attachContentActions}>
              <TouchableOpacity style={styles.attachContentCancelBtn} onPress={closeAttachContentModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.attachContentSubmitBtn,
                  (selectedContentIds.size === 0 || attachingContent) && styles.attachContentSubmitDisabled,
                ]}
                onPress={handleAttachContent}
                disabled={selectedContentIds.size === 0 || attachingContent}
              >
                {attachingContent ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.attachContentSubmitText}>
                    Attach {selectedContentIds.size} items
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Course Visibility modal */}
      <Modal
        visible={visibilityModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeVisibilityModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.visibilityModalWrapper}>
            <ScrollView
              style={styles.visibilityModalScroll}
              contentContainerStyle={styles.visibilityModalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.visibilityModalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Update Course Visibility</Text>
                  <Text style={styles.modalSubtitle}>
                    Update the visibility of course '{course?.title ?? ''}' by selecting services or batches.
                  </Text>
                </View>
                <TouchableOpacity onPress={closeVisibilityModal} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.visibilityCourseInfo}>
                <Text style={styles.visibilityCourseName}>{course?.title ?? ''}</Text>
                <Text style={styles.visibilityCourseDesc} numberOfLines={2}>
                  {course?.description ?? 'No description'}
                </Text>
              </View>

              <Text style={styles.visibilityScopeLabel}>Access Scope</Text>
              <View style={styles.visibilityScopeRow}>
                <TouchableOpacity
                  style={[
                    styles.visibilityScopeBtn,
                    visibilityAccessScope === 'service' && styles.visibilityScopeBtnActive,
                  ]}
                  onPress={() => setVisibilityAccessScope('service')}
                >
                  <Text
                    style={[
                      styles.visibilityScopeBtnText,
                      visibilityAccessScope === 'service' && styles.visibilityScopeBtnTextActive,
                    ]}
                  >
                    Service
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.visibilityScopeBtn,
                    visibilityAccessScope === 'batch' && styles.visibilityScopeBtnActive,
                  ]}
                  onPress={() => setVisibilityAccessScope('batch')}
                >
                  <Text
                    style={[
                      styles.visibilityScopeBtnText,
                      visibilityAccessScope === 'batch' && styles.visibilityScopeBtnTextActive,
                    ]}
                  >
                    Batch
                  </Text>
                </TouchableOpacity>
              </View>

              {visibilityAccessScope === 'service' && (
                <>
                  <Text style={styles.visibilitySelectLabel}>Select Services</Text>
                  {visibilityServicesLoading ? (
                    <View style={styles.visibilityListLoading}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                  ) : visibilityServices.length === 0 ? (
                    <Text style={styles.visibilityEmptyHint}>No services available. Create services first.</Text>
                  ) : (
                    <View style={styles.visibilityCheckList}>
                      {visibilityServices.map((s) => (
                        <TouchableOpacity
                          key={s.id}
                          style={styles.visibilityCheckItem}
                          onPress={() => toggleServiceSelection(s.id)}
                        >
                          <Ionicons
                            name={selectedServiceIds.has(s.id) ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={selectedServiceIds.has(s.id) ? Colors.primary : Colors.textSecondary}
                          />
                          <Text style={styles.visibilityCheckLabel}>{s.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              {visibilityAccessScope === 'batch' && (
                <>
                  <Text style={styles.visibilitySelectLabel}>Select Batches</Text>
                  {visibilityBatchesLoading ? (
                    <View style={styles.visibilityListLoading}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                  ) : visibilityBatches.length === 0 ? (
                    <Text style={styles.visibilityEmptyHint}>No batches available. Create batches first.</Text>
                  ) : (
                    <View style={styles.visibilityCheckList}>
                      {visibilityBatches.map((b) => (
                        <TouchableOpacity
                          key={b.id}
                          style={styles.visibilityCheckItem}
                          onPress={() => toggleBatchSelection(b.id)}
                        >
                          <Ionicons
                            name={selectedBatchIds.has(b.id) ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={selectedBatchIds.has(b.id) ? Colors.primary : Colors.textSecondary}
                          />
                          <Text style={styles.visibilityCheckLabel}>
                            {b.serviceName ? `${b.name} (${b.serviceName})` : b.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              <View style={styles.visibilityModalActions}>
                <TouchableOpacity style={styles.visibilityCancelBtn} onPress={closeVisibilityModal}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.visibilityUpdateBtn,
                    (updatingVisibility ||
                      (visibilityAccessScope === 'service' && selectedServiceIds.size === 0) ||
                      (visibilityAccessScope === 'batch' && selectedBatchIds.size === 0)) &&
                      styles.visibilityUpdateBtnDisabled,
                  ]}
                  onPress={handleUpdateVisibility}
                  disabled={
                    updatingVisibility ||
                    (visibilityAccessScope === 'service' && selectedServiceIds.size === 0) ||
                    (visibilityAccessScope === 'batch' && selectedBatchIds.size === 0)
                  }
                >
                  {updatingVisibility ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.visibilityUpdateBtnText}>Update Visibility</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Topic modal */}
      <Modal
        visible={editTopicModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeEditTopicModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardView}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Edit Topic</Text>
                  <Text style={styles.modalSubtitle}>Update the topic title.</Text>
                </View>
                <TouchableOpacity onPress={closeEditTopicModal} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.label}>Topic Title *</Text>
                <TextInput
                  style={styles.input}
                  value={editTopicTitle}
                  onChangeText={setEditTopicTitle}
                  placeholder="e.g., Displacement vs Distance"
                  placeholderTextColor={Colors.textSecondary}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeEditTopicModal}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addLessonSubmitBtn, savingEditTopic && styles.addLessonSubmitDisabled]}
                    onPress={handleEditTopic}
                    disabled={savingEditTopic}
                  >
                    {savingEditTopic ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.addLessonSubmitText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit Lesson modal */}
      <Modal
        visible={editLessonModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeEditLessonModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardView}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Edit Lesson</Text>
                  <Text style={styles.modalSubtitle}>Update the lesson title.</Text>
                </View>
                <TouchableOpacity onPress={closeEditLessonModal} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.label}>Lesson Title *</Text>
                <TextInput
                  style={styles.input}
                  value={editLessonTitle}
                  onChangeText={setEditLessonTitle}
                  placeholder="e.g., Kinematics"
                  placeholderTextColor={Colors.textSecondary}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeEditLessonModal}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addLessonSubmitBtn, savingEditLesson && styles.addLessonSubmitDisabled]}
                    onPress={handleEditLesson}
                    disabled={savingEditLesson}
                  >
                    {savingEditLesson ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.addLessonSubmitText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </VendorVerificationGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.text,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  settingsBtn: {
    padding: 4,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  descriptionPlaceholder: {
    fontSize: 15,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  addLessonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  addLessonBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  lessonList: {
    gap: 12,
  },
  lessonBlock: {
    gap: 0,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lessonTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  lessonActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lessonActionBtn: {
    padding: 6,
  },
  topicList: {
    marginTop: 8,
    marginLeft: 16,
    gap: 8,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border,
    paddingLeft: 12,
  },
  topicBlock: {
    gap: 0,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topicTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  noTopicsHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  contentList: {
    marginTop: 8,
    marginLeft: 12,
    gap: 6,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border,
    paddingLeft: 10,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#FFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contentRowTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  noContentHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  emptyHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  // Add Lesson modal
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
    paddingBottom: 20,
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
    marginBottom: 16,
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
  modalBody: {
    marginBottom: 8,
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
    marginBottom: 16,
  },
  modalActions: {
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelBtnText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  addLessonSubmitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLessonSubmitDisabled: {
    opacity: 0.7,
  },
  addLessonSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Attach Content modal
  attachContentModalCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  attachContentLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  attachContentLoadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  attachContentScroll: {
    maxHeight: 360,
  },
  attachContentScrollContent: {
    paddingBottom: 12,
    gap: 8,
  },
  attachContentEmpty: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  contentItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contentItemCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  contentItemCheckbox: {
    padding: 2,
  },
  contentItemBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contentItemText: {
    flex: 1,
  },
  contentItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  contentItemSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  contentItemTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.backgroundSecondary,
  },
  contentItemTagText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  attachContentActions: {
    marginTop: 16,
    gap: 10,
  },
  attachContentCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  attachContentSubmitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachContentSubmitDisabled: {
    opacity: 0.6,
  },
  attachContentSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Update Course Visibility modal
  visibilityModalWrapper: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    alignSelf: 'center',
  },
  visibilityModalScroll: {
    flexGrow: 0,
  },
  visibilityModalContent: {
    paddingBottom: 24,
  },
  visibilityModalCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  visibilityCourseInfo: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  visibilityCourseName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  visibilityCourseDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  visibilityScopeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  visibilityScopeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  visibilityScopeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFF',
  },
  visibilityScopeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  visibilityScopeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  visibilityScopeBtnTextActive: {
    color: '#FFF',
  },
  visibilitySelectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  visibilityListLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  visibilityEmptyHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingVertical: 12,
  },
  visibilityCheckList: {
    gap: 4,
    marginBottom: 20,
  },
  visibilityCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
  },
  visibilityCheckLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  visibilityModalActions: {
    gap: 10,
  },
  visibilityCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  visibilityUpdateBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityUpdateBtnDisabled: {
    opacity: 0.6,
  },
  visibilityUpdateBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
