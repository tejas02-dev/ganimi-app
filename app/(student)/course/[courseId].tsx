import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import {
  courseService,
  type CoursePlayerData,
  type CourseLesson,
  type CourseTopic,
  type CourseTopicContentMap,
} from '@/services/course.service';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';

type Params = {
  courseId: string;
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
  const { courseId } = useLocalSearchParams<Params>();

  const [course, setCourse] = useState<CoursePlayerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedContentMapId, setSelectedContentMapId] = useState<string | null>(null);

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

  const renderPlayerArea = () => {
    const content = selectedNodes.contentMap?.content;

    if (!content) {
      return (
        <View style={styles.playerEmpty}>
          <Ionicons name="play-circle-outline" size={40} color={Colors.textSecondary} />
          <Text style={styles.playerEmptyTitle}>Select a lesson to start learning</Text>
          <Text style={styles.playerEmptySubtitle}>
            Choose a topic from the list below to see its content here.
          </Text>
        </View>
      );
    }

    const isVideo = content.contentType === 'video';

    // Video content: show inline YouTube player when possible
    if (isVideo && content.videoUrl) {
      const videoId = extractYouTubeId(content.videoUrl);

      if (videoId) {
        return (
          <View style={styles.playerCard}>
            <View style={styles.playerMedia}>
              <YoutubePlayer
                height={210}
                play={false}
                videoId={videoId}
              />
            </View>

            <View style={styles.playerMeta}>
              <Text style={styles.playerContentTitle} numberOfLines={2}>
                {content.title}
              </Text>

              {content.description ? (
                <Text style={styles.playerDescription}>{content.description}</Text>
              ) : null}
            </View>
          </View>
        );
      }

      // Fallback: if we can't extract a YouTube ID, open externally
      return (
        <View style={styles.playerCard}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.playerMedia}
            onPress={handleOpenVideo}
          >
            <View style={styles.playerOverlay}>
              <Ionicons name="play-circle" size={56} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.playerMeta}>
            <Text style={styles.playerContentTitle} numberOfLines={2}>
              {content.title}
            </Text>

            {content.description ? (
              <Text style={styles.playerDescription}>{content.description}</Text>
            ) : null}

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.9}
              onPress={handleOpenVideo}
            >
              <Ionicons name="open-outline" size={18} color="#FFF" />
              <Text style={styles.primaryButtonText}>Open in YouTube</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Text / article content: compact card without big icon area
    return (
      <View style={styles.playerCard}>
        <View style={styles.playerMeta}>
          <Text style={styles.playerContentTitle} numberOfLines={2}>
            {content.title}
          </Text>

          {content.description ? (
            <Text style={styles.playerDescription}>{content.description}</Text>
          ) : null}

          {content.articleText ? (
            <Text style={styles.articleText}>{content.articleText}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  const renderLessonSection = (lesson: CourseLesson) => {
    const isExpanded = expandedLessonId === lesson.id;
    const isActiveLesson = selectedLessonId === lesson.id;

    return (
      <View key={lesson.id} style={styles.lessonSection}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onPressLesson(lesson)}
          style={[
            styles.lessonHeader,
            isActiveLesson && styles.lessonHeaderActive,
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.lessonTitle} numberOfLines={1}>
              {lesson.sequence}. {lesson.title}
            </Text>
            <Text style={styles.lessonSubtitle}>
              {lesson.topics.length} {lesson.topics.length === 1 ? 'topic' : 'topics'}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        {isExpanded ? (
          <View style={styles.topicList}>
            {lesson.topics.map((topic) => {
              const firstContent = topic.contents?.[0];
              const isSelected =
                selectedLessonId === lesson.id && selectedTopicId === topic.id;
              const isVideo = firstContent?.content?.contentType === 'video';

              return (
                <TouchableOpacity
                  key={topic.id}
                  activeOpacity={0.85}
                  onPress={() => onPressTopic(lesson, topic, firstContent)}
                  style={[styles.topicRow, isSelected && styles.topicRowActive]}
                >
                  <Ionicons
                    name={isVideo ? 'play-circle-outline' : 'document-text-outline'}
                    size={18}
                    color={isSelected ? Colors.primary : Colors.textSecondary}
                    style={{ marginRight: 8 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.topicTitle,
                        isSelected && styles.topicTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {topic.sequence}. {topic.title}
                    </Text>
                  </View>
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

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>
        <Text style={styles.subtitle}>
          Learn at your own pace with structured lessons and topics.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderPlayerArea()}

        <View style={styles.playlistCard}>
          <View style={styles.playlistHeader}>
            <Text style={styles.playlistTitle}>Course Content</Text>
            <Text style={styles.playlistSubtitle}>
              {course.lessons.length} {course.lessons.length === 1 ? 'lesson' : 'lessons'}
            </Text>
          </View>

          {course.lessons.map((lesson) => renderLessonSection(lesson))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
  },
  playerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111827',
    marginBottom: 16,
  },
  playerMedia: {
    height: 210,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerOverlay: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerMeta: {
    padding: 16,
  },
  playerContentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  playerBreadcrumb: {
    fontSize: 13,
    color: '#E5E7EB',
    marginBottom: 8,
  },
  playerDescription: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 12,
  },
  articleText: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    gap: 6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playerEmpty: {
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#111827',
    alignItems: 'center',
    marginBottom: 16,
  },
  playerEmptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  playerEmptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
  },
  playlistCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  playlistHeader: {
    marginBottom: 8,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  playlistSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  lessonSection: {
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginTop: 8,
    overflow: 'hidden',
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lessonHeaderActive: {
    backgroundColor: '#E5E7EB',
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  lessonSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  topicList: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  topicRowActive: {
    backgroundColor: '#E0F2FE',
  },
  topicTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  topicTitleActive: {
    color: Colors.text,
    fontWeight: '600',
  },
});

