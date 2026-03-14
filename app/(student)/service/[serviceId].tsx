import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ScrollView,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { courseService, type ServiceCourse } from '@/services/course.service';
import { attendanceService, type AttendanceRecord } from '@/services/attendance.service';
import { serviceService } from '@/services/service.service';
import type { StudentService } from '@/types/service';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/typography';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type TabKey = 'chat' | 'courses' | 'attendance';


export const options = {
  href: null,
};

export default function StudentServiceExploreScreen() {
  const params = useLocalSearchParams();
  const serviceId = params.serviceId as string | undefined;
  const batchId = params.batchId as string | undefined;
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('courses');

  const [serviceDetails, setServiceDetails] = useState<StudentService | null>(null);
  const [isLoadingServiceMeta, setIsLoadingServiceMeta] = useState(true);
  const [serviceMetaError, setServiceMetaError] = useState<string | null>(null);

  const [courses, setCourses] = useState<ServiceCourse[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceRange, setAttendanceRange] = useState<{ start?: Date; end?: Date }>({});
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.navigate('/(student)/my-services' as any);
        return true;
      });
      return () => sub.remove();
    }, [router])
  );

  useEffect(() => {
    if (!user?.id || !serviceId) return;
    const loadMeta = async () => {
      try {
        setServiceMetaError(null);
        setIsLoadingServiceMeta(true);
        const res = await serviceService.getStudentServices(user.id);
        const svcId = String(serviceId);
        const match = (res.data || []).find((s) => s.id === svcId) ?? null;
        setServiceDetails(match);
      } catch (e: any) {
        console.error('[ServiceExplore] Failed to load service meta', e);
        setServiceMetaError(e?.message || 'Unable to load service details.');
      } finally {
        setIsLoadingServiceMeta(false);
      }
    };
    loadMeta();
  }, [user?.id, serviceId]);

  useEffect(() => {
    if (!serviceId) return;
    loadCourses(String(serviceId));
  }, [serviceId]);

  useEffect(() => {
    if (!batchId || !user?.id) return;
    loadAttendance(String(batchId), user.id);
  }, [batchId, user?.id]);

  const loadCourses = async (svcId: string) => {
    try {
      setCoursesError(null);
      setIsLoadingCourses(true);
      const res = await courseService.getCoursesForService(svcId);
      setCourses(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      console.error('[ServiceExplore] Failed to load courses', e);
      setCoursesError(e?.message || 'Unable to load courses. Please try again.');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const loadAttendance = async (bId: string, studentId: string) => {
    try {
      setAttendanceError(null);
      setIsLoadingAttendance(true);
      const res = await attendanceService.getAttendanceForStudent(bId, studentId);
      const list = res.data?.attendanceList ?? [];
      setAttendance(list);
      const start = res.data?.startDate ? new Date(res.data.startDate) : undefined;
      const end = res.data?.endDate ? new Date(res.data.endDate) : undefined;
      setAttendanceRange({ start, end });
    } catch (e: any) {
      console.error('[ServiceExplore] Failed to load attendance', e);
      setAttendanceError(e?.message || 'Unable to load attendance. Please try again.');
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const attendanceByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance.forEach((rec) => {
      const key = rec.date.split('T')[0];
      map.set(key, rec);
    });
    return map;
  }, [attendance]);

  const today = useMemo(() => new Date(), []);
  const [calendarMonth, setCalendarMonth] = useState<number>(today.getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(today.getFullYear());

  const goToPrevMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 0) {
        setCalendarYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const goToNextMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 11) {
        setCalendarYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const getMonthMatrix = () => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const startWeekday = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const weeks: (number | null)[][] = [];
    let currentDay = 1 - startWeekday;

    while (currentDay <= daysInMonth) {
      const week: (number | null)[] = [];
      for (let i = 0; i < 7; i++) {
        if (currentDay < 1 || currentDay > daysInMonth) {
          week.push(null);
        } else {
          week.push(currentDay);
        }
        currentDay++;
      }
      weeks.push(week);
    }
    return weeks;
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const weekdayShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const formatSchedule = (schedule?: string) => {
    if (!schedule) return 'Schedule not available';
    return schedule.split(',').join(', ');
  };

  const formatNextClass = (nextClass?: string) => {
    if (!nextClass) return 'Next class not scheduled';
    const date = new Date(nextClass);
    if (isNaN(date.getTime())) return 'Next class not scheduled';
    return date.toLocaleString();
  };

  const renderTabPill = (key: TabKey, label: string) => {
    const isActive = activeTab === key;
    return (
      <TouchableOpacity
        key={key}
        style={styles.tabItem}
        onPress={() => setActiveTab(key)}
        activeOpacity={0.9}
      >
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
        {isActive && <View style={styles.tabUnderline} />}
      </TouchableOpacity>
    );
  };

  const renderCourseItem = ({ item, index }: { item: ServiceCourse; index: number }) => {
    // Placeholder duration and state until backend provides real values
    const durationLabel = 'Duration: 45 mins';
    const isFirst = index === 0;
    const ctaLabel = isFirst ? 'Resume' : 'Start';

    return (
      <View style={styles.courseCard}>
        {/* Left: small media icon */}
        <View style={[styles.courseIconCircle, isFirst && styles.courseIconCircleActive]}>
        <MaterialIcons name="video-collection" size={24} color={Colors.primary} />
        </View>

        {/* Middle: title + duration */}
        <View style={styles.courseInfo}>
          <Text style={styles.courseTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </View>

        {/* Right: CTA button */}
        <TouchableOpacity
          style={[styles.courseCtaButton, !isFirst && styles.courseCtaButtonSecondary]}
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname: '/(student)/course/[courseId]' as any,
              params: { courseId: item.id },
            })
          }
        >
          <Text
            style={[
              styles.courseCtaText,
              !isFirst && styles.courseCtaTextSecondary,
            ]}
          >
            {ctaLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAttendanceCalendar = () => {
    const matrix = getMonthMatrix();

    // Count present / absent / not-marked for the currently displayed month
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    let presentCount = 0;
    let absentCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const m = (calendarMonth + 1).toString().padStart(2, '0');
      const day = d.toString().padStart(2, '0');
      const rec = attendanceByDate.get(`${calendarYear}-${m}-${day}`);
      if (rec?.status === 'present') presentCount++;
      else if (rec?.status === 'absent') absentCount++;
    }
    const notMarkedCount = daysInMonth - presentCount - absentCount;

    const getStatusForDay = (day: number | null): AttendanceRecord | null => {
      if (!day) return null;
      const month = (calendarMonth + 1).toString().padStart(2, '0');
      const d = day.toString().padStart(2, '0');
      const key = `${calendarYear}-${month}-${d}`;
      return attendanceByDate.get(key) ?? null;
    };

    const legend = [
      { label: 'Present', color: '#DCFCE7' },
      { label: 'Absent', color: '#FEE2E2' },
      { label: 'Not Marked', color: '#E5E7EB' },
    ];

    return (
      <View>
        {/* Quick overview cards */}
        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, styles.overviewCardPresent]}>
            <Text style={styles.overviewLabel}>PRESENT</Text>
            <Text style={[styles.overviewCount, styles.overviewCountPresent]}>
              {String(presentCount).padStart(2, '0')}
            </Text>
          </View>
          <View style={[styles.overviewCard, styles.overviewCardAbsent]}>
            <Text style={styles.overviewLabel}>ABSENT</Text>
            <Text style={[styles.overviewCount, styles.overviewCountAbsent]}>
              {String(absentCount).padStart(2, '0')}
            </Text>
          </View>
          <View style={[styles.overviewCard, styles.overviewCardNeutral]}>
            <Text style={styles.overviewLabel}>NOT MARKED</Text>
            <Text style={[styles.overviewCount, styles.overviewCountNeutral]}>
              {String(notMarkedCount).padStart(2, '0')}
            </Text>
          </View>
        </View>

        <View style={styles.calendarHeaderRow}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.monthNavButton}>
            <Ionicons name="chevron-back" size={18} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.calendarMonthLabel}>
            {monthNames[calendarMonth]} {calendarYear}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavButton}>
            <Ionicons name="chevron-forward" size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayRow}>
          {weekdayShort.map((d) => (
            <Text key={d} style={styles.weekdayCell}>
              {d}
            </Text>
          ))}
        </View>

        {matrix.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              const rec = getStatusForDay(day);
              let backgroundColor = '#FFFFFF';
              let borderColor = '#E5E7EB';

              if (rec?.status === 'present') {
                backgroundColor = '#DCFCE7';
                borderColor = '#22C55E';
              } else if (rec?.status === 'absent') {
                backgroundColor = '#FEE2E2';
                borderColor = '#EF4444';
              } else if (day != null) {
                backgroundColor = '#F9FAFB';
                borderColor = '#E5E7EB';
              }

              return (
                <View key={di} style={[styles.dayCell, { backgroundColor, borderColor }]}>
                  {day ? <Text style={styles.dayCellText}>{day}</Text> : null}
                </View>
              );
            })}
          </View>
        ))}

        <View style={styles.legendRow}>
          {legend.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.rangeText}>
          Attendance for {monthNames[calendarMonth]} {calendarYear}
          {attendanceRange.start
            ? ` · from ${attendanceRange.start.toLocaleDateString()} to ${new Date().toLocaleDateString()}`
            : ''}
        </Text>
      </View>
    );
  };

  const renderContent = () => {
    if (activeTab === 'chat') {
      return (
        <View style={styles.comingSoonContainer}>
          <View style={styles.comingSoonBadge}>
            <Ionicons name="chatbubbles-outline" size={18} color={Colors.primary} />
            <Text style={styles.comingSoonBadgeText}>Chat coming soon</Text>
          </View>
          <Text style={styles.comingSoonTitle}>Stay connected with your tutor</Text>
          <Text style={styles.comingSoonSubtitle}>
            Soon you&apos;ll be able to chat, share doubts, and get updates directly inside this
            app.
          </Text>
        </View>
      );
    }

    if (activeTab === 'courses') {
      if (isLoadingCourses) {
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading courses...</Text>
          </View>
        );
      }

      if (coursesError) {
        return <Text style={styles.errorText}>{coursesError}</Text>;
      }

      if (!courses.length) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No courses yet</Text>
            <Text style={styles.emptySubtitle}>
              Courses linked to this service will appear here.
            </Text>
          </View>
        );
      }

      return (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourseItem}
          contentContainerStyle={styles.listContent}
        />
      );
    }

    // attendance
    if (!batchId || !user?.id) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Attendance not available</Text>
          <Text style={styles.emptySubtitle}>
            This service is not linked to a batch yet, so attendance cannot be shown.
          </Text>
        </View>
      );
    }

    if (isLoadingAttendance) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </View>
      );
    }

    if (attendanceError) {
      return <Text style={styles.errorText}>{attendanceError}</Text>;
    }

    if (!attendance.length) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No attendance records yet</Text>
          <Text style={styles.emptySubtitle}>
            Once classes start and attendance is marked, it will appear here.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {renderAttendanceCalendar()}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.serviceMetaCard}>
        <View style={styles.serviceHeroRow}>
          <View style={styles.serviceThumbnail}>
            <Ionicons
              name="image"
              size={28}
              color={Colors.primary}
              style={styles.serviceThumbnailIcon}
            />
          </View>

          <View style={styles.serviceHeroText}>
            <Text style={styles.serviceMetaTitle} numberOfLines={1}>
              {serviceDetails?.name ?? 'Service'}
            </Text>

            <Text style={styles.serviceBatchLine} numberOfLines={1}>
              {serviceDetails?.batchName ?? 'Batch not assigned'}
              {serviceDetails?.schedule ? ` • ${formatSchedule(serviceDetails.schedule)}` : ''}
            </Text>

            {/* <View style={styles.metaInfoRow}>
              <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaInfoText}>
                {formatSchedule(serviceDetails?.schedule)}
              </Text>
            </View> */}
            <View style={styles.metaInfoRow}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaInfoText}>
                {formatNextClass(serviceDetails?.nextClass)}
              </Text>
            </View>
          </View>
        </View>

        {serviceMetaError ? (
          <Text style={styles.metaErrorText}>{serviceMetaError}</Text>
        ) : null}
      </View>

      <View style={styles.tabsRow}>
        {renderTabPill('chat', 'Chat')}
        {renderTabPill('courses', 'Courses')}
        {renderTabPill('attendance', 'Attendance')}
      </View>

      <View style={styles.contentContainer}>{renderContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    paddingTop: 24,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  serviceMetaCard: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 16,
  },
  serviceHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceThumbnail: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceThumbnailIcon: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    padding: 10,
  },
  serviceHeroText: {
    flex: 1,
  },
  serviceMetaTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
  },
  serviceBatchLine: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  serviceMetaDescription: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  serviceMetaLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
  },
  serviceMetaValue: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
  },
  serviceChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    gap: 6,
  },
  metaChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaInfoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
  },
  metaErrorText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.error,
    fontFamily: Typography.fontFamily.regular,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  tabItem: {
    marginRight: 24,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  tabUnderline: {
    marginTop: 4,
    height: 2,
    width: '100%',
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  contentContainer: {
    flex: 1,
    marginTop: 16,
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
    paddingHorizontal: 16,
    marginTop: 8,
    fontSize: 13,
    color: Colors.error,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  courseIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  courseIconCircleActive: {
    backgroundColor: Colors.primaryLight,
  },
  courseInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  courseTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
    marginBottom: 2,
  },
  courseSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  courseCtaButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  courseCtaButtonSecondary: {
    backgroundColor: '#EFF6FF',
  },
  courseCtaText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    top:-2,
    color: Colors.white,
  },
  courseCtaTextSecondary: {
    color: Colors.primary,
  },
  comingSoonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: 'center',
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    marginBottom: 16,
    gap: 8,
  },
  comingSoonBadgeText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primary,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  comingSoonSubtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  overviewCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  overviewCardPresent: { backgroundColor: '#F0FDF4' },
  overviewCardAbsent: { backgroundColor: '#FFF5F5' },
  overviewCardNeutral: { backgroundColor: '#FFFBEB' },
  overviewLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  overviewCount: {
    fontSize: 28,
    fontWeight: '700',
  },
  overviewCountPresent: { color: '#22C55E' },
  overviewCountAbsent: { color: '#EF4444' },
  overviewCountNeutral: { color: '#F97316' },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarMonthLabel: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
  },
  monthNavButton: {
    padding: 4,
    borderRadius: 14,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  dayCellText: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: Typography.fontFamily.regular,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 14,
  },
  legendLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  rangeText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.regular,
  },
});

