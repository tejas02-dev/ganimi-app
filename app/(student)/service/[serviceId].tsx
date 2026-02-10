import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { courseService, type ServiceCourse } from '@/services/course.service';
import { attendanceService, type AttendanceRecord } from '@/services/attendance.service';
import { serviceService } from '@/services/service.service';
import type { StudentService } from '@/types/service';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

type TabKey = 'chat' | 'courses' | 'attendance';

interface ServiceMetaFromParams {
  serviceId: string;
  batchId?: string;
}

export default function StudentServiceExploreScreen() {
  const { serviceId, batchId } = useLocalSearchParams<ServiceMetaFromParams>();
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

  const renderTabPill = (key: TabKey, label: string, icon: keyof typeof Ionicons.glyphMap) => {
    const isActive = activeTab === key;
    return (
      <TouchableOpacity
        key={key}
        style={[styles.tabPill, isActive && styles.tabPillActive]}
        onPress={() => setActiveTab(key)}
        activeOpacity={0.9}
      >
        <Ionicons
          name={icon}
          size={16}
          color={isActive ? '#FFF' : Colors.textSecondary}
          style={{ marginRight: 6 }}
        />
        <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderCourseItem = ({ item }: { item: ServiceCourse }) => (
    <View style={styles.courseCard}>
      <View style={styles.courseHeader}>
        <Text style={styles.courseTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <TouchableOpacity
          style={styles.viewCourseButton}
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname: '/(student)/course/[courseId]' as any,
              params: { courseId: item.id },
            })
          }
        >
          <Text style={styles.viewCourseButtonText}>View Course</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAttendanceCalendar = () => {
    const matrix = getMonthMatrix();

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

        {attendanceRange.start && attendanceRange.end ? (
          <Text style={styles.rangeText}>
            Showing attendance between{' '}
            {attendanceRange.start.toLocaleDateString()} and{' '}
            {attendanceRange.end.toLocaleDateString()}
          </Text>
        ) : null}
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
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {serviceDetails?.name ?? 'Service Overview'}
        </Text>
        <Text style={styles.subtitle}>
          Track your courses, attendance, and upcoming chat features for this service.
        </Text>
      </View>

      <View style={styles.serviceMetaCard}>
        <View style={styles.serviceMetaRow}>
          <Ionicons name="briefcase-outline" size={18} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.serviceMetaTitle} numberOfLines={1}>
              {serviceDetails?.name ?? 'Service'}
            </Text>
            {serviceDetails?.description ? (
              <Text style={styles.serviceMetaDescription} numberOfLines={2}>
                {serviceDetails.description}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.serviceChipsRow}>
          {serviceDetails?.batchName ? (
            <View style={styles.metaChip}>
              <Ionicons name="school-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaChipText} numberOfLines={1}>
                {serviceDetails.batchName}
              </Text>
            </View>
          ) : null}

          {serviceDetails?.status ? (
            <View style={styles.metaChip}>
              <Ionicons name="pulse-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaChipText} numberOfLines={1}>
                {serviceDetails.status.charAt(0).toUpperCase() + serviceDetails.status.slice(1)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metaInfoRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.metaInfoText}>
            {formatSchedule(serviceDetails?.schedule)}
          </Text>
        </View>

        <View style={styles.metaInfoRow}>
          <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.metaInfoText}>
            {formatNextClass(serviceDetails?.nextClass)}
          </Text>
        </View>

        {serviceMetaError ? (
          <Text style={styles.metaErrorText}>{serviceMetaError}</Text>
        ) : null}
      </View>

      <View style={styles.tabsRow}>
        {renderTabPill('chat', 'Chat', 'chatbubbles-outline')}
        {renderTabPill('courses', 'Courses', 'book-outline')}
        {renderTabPill('attendance', 'Attendance', 'calendar-outline')}
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
  serviceMetaCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#EEF2FF',
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceMetaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  serviceMetaDescription: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  serviceMetaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  serviceMetaValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
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
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaInfoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  metaErrorText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.error,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  tabPillActive: {
    backgroundColor: Colors.primary,
  },
  tabPillText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tabPillTextActive: {
    color: '#FFF',
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
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  courseCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  courseTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  viewCourseButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  viewCourseButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
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
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    marginBottom: 16,
    gap: 8,
  },
  comingSoonBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  comingSoonSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarMonthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  monthNavButton: {
    padding: 4,
    borderRadius: 999,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
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
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  dayCellText: {
    fontSize: 13,
    color: Colors.text,
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
    borderRadius: 999,
  },
  legendLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  rangeText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

