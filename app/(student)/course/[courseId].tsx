import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Linking,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';
import {
  courseService,
  type CoursePlayerData,
  type CourseLesson,
  type CourseTopic,
  type CourseTopicContentMap,
  type CourseContent,
} from '@/services/course.service';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';

function getTopicSubtitle(content: CourseContent | undefined): string {
  if (!content) return '—';
  const type = (content.contentType || '').toLowerCase();
  if (type === 'video') return `Video${(content as any).duration ? ` • ${(content as any).duration}` : ''}`;
  if (type === 'article') return `Reading${(content as any).durationMinutes ? ` • ${(content as any).durationMinutes} mins` : ''}`;
  if (type === 'quiz') return `Quiz${(content as any).questionCount ? ` • ${(content as any).questionCount} questions` : ''}`;
  return content.contentType || '—';
}

type Params = {
  courseId: string;
  serviceId?: string;
  batchId?: string;
};

export const options = {
  href: null,
};

const extractYouTubeId = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    // Support youtu.be, watch?v=, embed/, etc.
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch?.[1]) return shortMatch[1];

    const watchMatch = url.match(/[?&]v=([^&]+)/);
    if (watchMatch?.[1]) return watchMatch[1];

    const embedMatch = url.match(/youtube\.com\/embed\/([^?&]+)/);
    if (embedMatch?.[1]) return embedMatch[1];
  } catch {
    // ignore parse errors
  }
  return null;
};

export default function StudentCoursePlayerScreen() {
  const { courseId, serviceId, batchId } = useLocalSearchParams<Params>();
  const router = useRouter();

  const [course, setCourse] = useState<CoursePlayerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedContentMapId, setSelectedContentMapId] = useState<string | null>(null);

  // Keep last selected video ID so the YouTube player can stay mounted when switching to article (avoids blue screen on switch back)
  const [lastVideoId, setLastVideoId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (serviceId) {
          router.replace({
            pathname: '/(student)/service/[serviceId]' as any,
            params: { serviceId, ...(batchId ? { batchId } : {}) },
          });
        } else {
          router.back();
        }
        return true;
      });
      return () => sub.remove();
    }, [router, serviceId, batchId])
  );

  useEffect(() => {
    if (!courseId) return;
    const loadCourse = async () => {
      try {
        setError(null);
        setIsLoading(true);
        const res = await courseService.getCoursePlayer(String(courseId));
        const data = res.data;
        setCourse(data);

        // Initialize defaults (first lesson / topic / content)
        const firstLesson = data.lessons?.[0];
        const firstTopic = firstLesson?.topics?.[0];
        const firstContentMap = firstTopic?.contents?.[0];

        setExpandedLessonId(firstLesson?.id ?? null);
        setSelectedLessonId(firstLesson?.id ?? null);
        setSelectedTopicId(firstTopic?.id ?? null);
        setSelectedContentMapId(firstContentMap?.id ?? null);
      } catch (e: any) {
        console.error('[CoursePlayer] Failed to load course', e);
        setError(e?.message || 'Unable to load course. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCourse();
  }, [courseId]);

  const selectedNodes = useMemo(() => {
    if (!course || !selectedLessonId || !selectedTopicId) {
      return { lesson: null as CourseLesson | null, topic: null as CourseTopic | null, contentMap: null as CourseTopicContentMap | null };
    }

    const lesson = course.lessons.find((l) => l.id === selectedLessonId) ?? null;
    const topic = lesson?.topics.find((t) => t.id === selectedTopicId) ?? null;
    const contentMap =
      topic?.contents.find((c) => c.id === selectedContentMapId) ??
      (topic?.contents?.[0] ?? null);

    return { lesson, topic, contentMap };
  }, [course, selectedLessonId, selectedTopicId, selectedContentMapId]);

  useEffect(() => {
    const content = selectedNodes.contentMap?.content;
    if (content?.contentType === 'video' && content.videoUrl) {
      const id = extractYouTubeId(content.videoUrl);
      if (id) setLastVideoId(id);
    }
  }, [selectedNodes.contentMap?.content?.id, selectedNodes.contentMap?.content?.contentType, selectedNodes.contentMap?.content?.videoUrl]);

  const handleOpenVideo = () => {
    const content = selectedNodes.contentMap?.content;
    if (!content?.videoUrl) return;
    Linking.openURL(content.videoUrl).catch((err) =>
      console.warn('Failed to open video url', err),
    );
  };

  const onPressLesson = (lesson: CourseLesson) => {
    setExpandedLessonId((prev) => (prev === lesson.id ? null : lesson.id));
  };

  const onPressTopic = (lesson: CourseLesson, topic: CourseTopic, contentMap?: CourseTopicContentMap) => {
    setSelectedLessonId(lesson.id);
    setSelectedTopicId(topic.id);
    setSelectedContentMapId(contentMap?.id ?? topic.contents?.[0]?.id ?? null);
  };

  const totalTopics = useMemo(
    () => course?.lessons?.reduce((acc, l) => acc + (l.topics?.length ?? 0), 0) ?? 0,
    [course],
  );

  const renderPlayerArea = () => {
    const content = selectedNodes.contentMap?.content;
    const isVideo = content?.contentType === 'video';
    const videoId = content?.videoUrl ? extractYouTubeId(content.videoUrl) : null;

    return (
      <View>
        {/* Video block: keep mounted when we have a video id, hide when showing article so player doesn't remount on switch back */}
        {(lastVideoId || (isVideo && videoId)) ? (
          <View
            style={[
              styles.videoWrap,
              !isVideo && styles.videoWrapHidden,
            ]}
            pointerEvents={isVideo ? 'auto' : 'none'}
          >
            <View style={styles.videoContainer}>
              <YoutubePlayer
                key={lastVideoId || videoId || ''}
                height={200}
                play={false}
                videoId={lastVideoId || videoId || ''}
              />
            </View>
          </View>
        ) : null}

        {!content && (
          <View style={styles.videoWrap}>
            <View style={styles.videoPlaceholder}>
              <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={styles.playerEmptyHint}>Select a topic below to start</Text>
          </View>
        )}

        {content && !isVideo && (
          <View style={styles.articleWrap}>
            <Text style={styles.articleTitle} numberOfLines={2}>{content.title}</Text>
            {content.description ? (
              <Text style={styles.articleDescription}>{content.description}</Text>
            ) : null}
            {content.articleText ? (
              <Text style={styles.articleBody}>{content.articleText}</Text>
            ) : (
              <Text style={styles.articlePlaceholder}>No content available.</Text>
            )}
          </View>
        )}

        {content && isVideo && !videoId && (
          <View style={styles.videoWrap}>
            <TouchableOpacity activeOpacity={0.9} style={styles.videoPlaceholder} onPress={handleOpenVideo}>
              <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderLessonSection = (lesson: CourseLesson) => {
    const isExpanded = expandedLessonId === lesson.id;
    const topicCount = lesson.topics?.length ?? 0;

    return (
      <View key={lesson.id} style={styles.lessonSection}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onPressLesson(lesson)}
          style={styles.lessonHeader}
        >
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color={Colors.textSecondary}
            style={styles.lessonChevron}
          />
          <Text style={styles.lessonTitle} numberOfLines={1}>
            Lesson {lesson.sequence}. {lesson.title}
          </Text>
          <Text style={styles.lessonTopicCount}>{topicCount} Topics</Text>
        </TouchableOpacity>

        {isExpanded && lesson.topics?.length ? (
          <View style={styles.topicList}>
            {lesson.topics.map((topic) => {
              const firstContent = topic.contents?.[0];
              const content = firstContent?.content;
              const isSelected = selectedLessonId === lesson.id && selectedTopicId === topic.id;
              const isCompleted = (topic as any).isCompleted ?? isSelected;
              const isLocked = (topic as any).isLocked ?? false;
              const contentType = (content?.contentType || '').toLowerCase();
              const isVideo = contentType === 'video';
              const isQuiz = contentType === 'quiz';

              return (
                <TouchableOpacity
                  key={topic.id}
                  activeOpacity={0.85}
                  onPress={() => onPressTopic(lesson, topic, firstContent)}
                  style={[styles.topicRow, isCompleted && styles.topicRowCompleted]}
                >
                  <View style={[styles.topicIconWrap, isCompleted && styles.topicIconWrapActive]}>
                    <Ionicons
                      name={isVideo ? 'play' : isQuiz ? 'help-circle' : 'document-text'}
                      size={18}
                      color={isCompleted ? '#FFF' : Colors.textSecondary}
                    />
                  </View>
                  <View style={styles.topicContent}>
                    <Text style={styles.topicTitle} numberOfLines={1}>
                      {topic.sequence}. {topic.title}
                    </Text>
                    <Text style={styles.topicSubtitle}>{getTopicSubtitle(content)}</Text>
                  </View>
                  {isCompleted ? (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  ) : isLocked ? (
                    <Ionicons name="lock-closed" size={20} color={Colors.textLight} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading course...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Course not found.</Text>
      </View>
    );
  }

  const lessonCount = course.lessons?.length ?? 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderPlayerArea()}

        <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
        <Text style={styles.courseDescription}>
          {(course as any).description || 'Learn at your own pace with structured lessons and topics.'}
        </Text>

        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>PROGRESS</Text>
          <View style={styles.progressCardRow}>
            <View style={styles.progressIconWrap}>
              <Ionicons name="book" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.progressStats}>
              {lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}
              {' • '}
              {totalTopics} Topics
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Course Content</Text>
        <View style={styles.contentCard}>
          {course.lessons.map((lesson) => renderLessonSection(lesson))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: { marginTop: 8, fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary },
  errorText: { fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.error, textAlign: 'center' },

  videoWrap: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111827' },
  videoWrapHidden: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0,
    height: 200,
    zIndex: -1,
  },
  videoContainer: { height: 200, backgroundColor: '#000' },
  videoPlaceholder: {
    height: 200,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerEmptyHint: {
    paddingVertical: 12,
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  articleWrap: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  articleTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginBottom: 8,
  },
  articleDescription: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  articleBody: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text,
    lineHeight: 22,
  },
  articlePlaceholder: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },

  courseTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginBottom: 8,
  },
  courseDescription: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },

  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  progressCardRow: { flexDirection: 'row', alignItems: 'center' },
  progressIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  progressStats: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginBottom: 12,
  },
  contentCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: Colors.border },

  lessonSection: { marginBottom: 4 },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  lessonChevron: { marginRight: 8 },
  lessonTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
  },
  lessonTopicCount: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  topicList: { paddingHorizontal: 8, paddingBottom: 8 },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 6,
    backgroundColor: '#F3F4F6',
  },
  topicRowCompleted: {
    backgroundColor: Colors.primaryLight,
  },
  topicIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topicIconWrapActive: {
    backgroundColor: Colors.primary,
  },
  topicContent: { flex: 1 },
  topicTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
  },
  topicSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

