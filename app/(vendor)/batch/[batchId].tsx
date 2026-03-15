import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  BackHandler,
  RefreshControl,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';
import { VendorVerificationGate } from '@/components/VendorVerificationGate';
import { batchService, type ServiceBatch } from '@/services/batch.service';
import { serviceService } from '@/services/service.service';
import { enrollmentService, type BatchEnrollment } from '@/services/enrollment.service';
import {
  serviceMetricService,
  type OptedServiceMetric,
} from '@/services/serviceMetric.service';
import {
  attendanceService,
  type AttendanceStatus,
  type AttendanceByDateItem,
} from '@/services/attendance.service';
import { evaluationService } from '@/services/evaluation.service';

export const options = {
  href: null,
};

type Params = {
  batchId: string;
  serviceId?: string;
};

export default function VendorBatchDetailScreen() {
  const { batchId, serviceId } = useLocalSearchParams<Params>();
  const router = useRouter();

  const [batch, setBatch] = useState<ServiceBatch | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [serviceName, setServiceName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<BatchEnrollment[]>([]);
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false);
  const [activeTab, setActiveTab] = useState<'students' | 'attendance' | 'remarks'>('students');
  const [markingStatus, setMarkingStatus] = useState<Record<string, AttendanceStatus | 'loading'>>(
    {},
  );
  const [isEnrollModalVisible, setIsEnrollModalVisible] = useState(false);
  const [enrollName, setEnrollName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollStudentPhone, setEnrollStudentPhone] = useState('');
  const [enrollParentPhone, setEnrollParentPhone] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [attendanceByDate, setAttendanceByDate] = useState<AttendanceByDateItem[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [optedMetrics, setOptedMetrics] = useState<OptedServiceMetric[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isEvaluateModalVisible, setIsEvaluateModalVisible] = useState(false);
  const [evaluatingStudent, setEvaluatingStudent] = useState<BatchEnrollment | null>(null);
  const [metricValues, setMetricValues] = useState<Record<string, any>>({});
  const [evaluationRemarks, setEvaluationRemarks] = useState('');

  const loadAll = useCallback(async (isRefresh = false) => {
    if (!batchId) return;
    if (!isRefresh) setIsLoading(true);
    setError(null);
    setIsLoadingEnrollments(true);
    setIsLoadingMetrics(true);
    try {
      const [batchRes, enrollmentsRes, serviceRes, metricsRes] = await Promise.all([
        batchService.getBatchById(String(batchId)),
        enrollmentService.getEnrollmentsByBatch(String(batchId)),
        serviceId ? serviceService.getServiceById(String(serviceId)) : Promise.resolve(null),
        serviceId != null ? serviceMetricService.getOptedMetrics(String(serviceId)) : Promise.resolve(null),
      ]);

      setBatch(batchRes.data);
      setEnrollments(enrollmentsRes.data || []);

      if (serviceRes && 'data' in (serviceRes as any)) {
        const raw = (serviceRes as any).data;
        const svc = raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : raw;
        setServiceName(svc?.name ?? null);
      }
      if (metricsRes && 'data' in (metricsRes as any)) {
        setOptedMetrics((metricsRes as any).data || []);
      }
    } catch (e: any) {
      console.error('[VendorBatchDetail] Failed to load batch', e);
      setError(e?.message || 'Unable to load batch details. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingEnrollments(false);
      setIsLoadingMetrics(false);
    }
  }, [batchId, serviceId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (serviceId) {
          router.replace({
            pathname: '/(vendor)/service/[serviceId]' as any,
            params: { serviceId: String(serviceId) },
          });
        } else {
          router.replace('/(vendor)/services' as any);
        }
        return true;
      });
      return () => sub.remove();
    }, [router, serviceId])
  );

  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  }, []);

  useEffect(() => {
    // Initialize selected date and month with today on mount
    setSelectedDate(today);
    setCurrentMonth(new Date());
  }, [today]);

  useEffect(() => {
    if (!batchId || !selectedDate) return;
    const fetchAttendance = async () => {
      try {
        setIsLoadingAttendance(true);
        const res = await attendanceService.getAttendanceByDate(
          String(batchId),
          selectedDate,
        );
        setAttendanceByDate(res.data || []);
      } catch (e: any) {
        console.error('[VendorBatchDetail] Failed to load attendance by date', e);
        // Keep existing state but surface a simple error
      } finally {
        setIsLoadingAttendance(false);
      }
    };
    fetchAttendance();
  }, [batchId, selectedDate]);

  const resetEnrollForm = () => {
    setEnrollName('');
    setEnrollEmail('');
    setEnrollStudentPhone('');
    setEnrollParentPhone('');
    setIsEnrolling(false);
  };

  const handleOpenEnrollModal = () => {
    resetEnrollForm();
    setIsEnrollModalVisible(true);
  };

  const handleEnrollStudent = async () => {
    if (!batchId) return;
    if (!enrollName.trim()) {
      alert('Please enter student name.');
      return;
    }
    if (!enrollEmail.trim()) {
      alert('Please enter student email.');
      return;
    }
    if (!enrollStudentPhone.trim()) {
      alert("Please enter student's phone number.");
      return;
    }
    if (!enrollParentPhone.trim()) {
      alert("Please enter parent's phone number.");
      return;
    }

    try {
      setIsEnrolling(true);
      await enrollmentService.enrollStudentInBatch(String(batchId), {
        name: enrollName.trim(),
        email: enrollEmail.trim(),
        studentPhone: enrollStudentPhone.trim(),
        parentPhone: enrollParentPhone.trim(),
      });

      // Refresh enrollments so the new student appears immediately
      setIsLoadingEnrollments(true);
      const res = await enrollmentService.getEnrollmentsByBatch(String(batchId));
      setEnrollments(res.data || []);

      setIsEnrollModalVisible(false);
    } catch (e: any) {
      console.error('[VendorBatchDetail] Failed to enroll student', e);
      alert(e?.message || 'Failed to enroll student. Please try again.');
    } finally {
      setIsEnrolling(false);
      setIsLoadingEnrollments(false);
    }
  };

  const openEvaluateModal = (student: BatchEnrollment) => {
    setEvaluatingStudent(student);
    setMetricValues({});
    setEvaluationRemarks('');
    setIsEvaluateModalVisible(true);
  };

  const handleChangeMetricValue = (metricId: string, value: any) => {
    setMetricValues((prev) => ({ ...prev, [metricId]: value }));
  };

  const handleCloseEvaluateModal = () => {
    setIsEvaluateModalVisible(false);
    setEvaluatingStudent(null);
    setMetricValues({});
    setEvaluationRemarks('');
  };

  const handleSubmitEvaluation = async () => {
    if (!evaluatingStudent || !serviceId) {
      handleCloseEvaluateModal();
      return;
    }

    try {
      const enrollmentId = evaluatingStudent.id;
      const evaluations = optedMetrics
        .map((metric) => {
          const pm = metric.performanceMetric;
          const key = metric.id;
          const rawValue = metricValues[key];
          if (rawValue === undefined || rawValue === null || rawValue === '') {
            return null;
          }
          let value: number | string = rawValue;
          if (pm.dataType === 'rating' || pm.dataType === 'number') {
            const num = Number(rawValue);
            if (Number.isNaN(num)) return null;
            value = num;
          }
          return {
            metricId: pm.id,
            value,
            dataType: pm.dataType,
          };
        })
        .filter(Boolean) as { metricId: string; value: number | string; dataType: string }[];

      await evaluationService.evaluateStudent(evaluatingStudent.studentId, String(serviceId), {
        enrollmentId,
        evaluations,
        remarks: evaluationRemarks.trim(),
      });

      // Optionally refresh enrollments to update latestEvaluation
      const res = await enrollmentService.getEnrollmentsByBatch(String(batchId));
      setEnrollments(res.data || []);

      handleCloseEvaluateModal();
    } catch (e: any) {
      console.error('[VendorBatchDetail] Failed to submit evaluation', e);
      alert(e?.message || 'Failed to save evaluation. Please try again.');
    }
  };

  const handleMarkAttendance = async (
    enrollment: BatchEnrollment,
    status: AttendanceStatus,
  ) => {
    if (!batchId) return;
    try {
      setMarkingStatus((prev) => ({ ...prev, [enrollment.studentId]: 'loading' }));
      await attendanceService.markAttendance(String(batchId), {
        date: today,
        studentId: enrollment.studentId,
        status,
      });
      setEnrollments((prev) =>
        prev.map((e) =>
          e.studentId === enrollment.studentId
            ? {
                ...e,
                todaysAttendance: {
                  date: today,
                  status,
                  remarks: e.todaysAttendance?.remarks ?? null,
                },
              }
            : e,
        ),
      );
      setMarkingStatus((prev) => ({ ...prev, [enrollment.studentId]: status }));
    } catch (e: any) {
      console.error('[VendorBatchDetail] Failed to mark attendance', e);
      // eslint-disable-next-line no-alert
      alert(e?.message || 'Failed to mark attendance. Please try again.');
      setMarkingStatus((prev) => ({ ...prev, [enrollment.studentId]: 'not_marked' }));
    }
  };

  const handleMarkAttendanceForDate = async (
    item: AttendanceByDateItem,
    status: AttendanceStatus,
  ) => {
    if (!batchId || !selectedDate) return;
    try {
      await attendanceService.markAttendance(String(batchId), {
        date: selectedDate,
        studentId: item.studentId,
        status,
      });
      setAttendanceByDate((prev) =>
        prev.map((entry) =>
          entry.studentId === item.studentId
            ? {
                ...entry,
                todaysAttendance: {
                  date: selectedDate,
                  status,
                  remarks: entry.todaysAttendance?.remarks ?? null,
                },
              }
            : entry,
        ),
      );
    } catch (e: any) {
      console.error('[VendorBatchDetail] Failed to mark attendance for date', e);
      alert(e?.message || 'Failed to mark attendance. Please try again.');
    }
  };

  const formatEnrolledDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderStudentItem = ({ item }: { item: BatchEnrollment }) => {
    const initials = item.studentName
      ? item.studentName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((n) => n[0]?.toUpperCase())
          .join('')
      : '?';

    const shortId = `#${item.id.slice(0, 4).toUpperCase()}`;
    const enrolledDate = formatEnrolledDate((item as any).enrolledAt ?? (item as any).createdAt);

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentInfoRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.studentTextContainer}>
            <Text style={styles.studentName}>{item.studentName}</Text>
            <Text style={styles.studentMeta}>
              ID: {shortId}{enrolledDate ? ` • Enrolled: ${enrolledDate}` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </View>
      </View>
    );
  };

  const renderAttendanceItem = ({ item }: { item: AttendanceByDateItem }) => {
    const initials = item.studentName
      ? item.studentName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((n) => n[0]?.toUpperCase())
          .join('')
      : '?';

    const status = item.todaysAttendance?.status as AttendanceStatus | undefined;

    let statusLabel = 'Not marked';
    let statusColor = Colors.textSecondary;
    if (status === 'present') {
      statusLabel = 'Present';
      statusColor = '#16A34A';
    } else if (status === 'absent') {
      statusLabel = 'Absent';
      statusColor = '#DC2626';
    }

    const isPresent = status === 'present';
    const isAbsent = status === 'absent';

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentInfoRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.studentTextContainer}>
            <Text style={styles.studentName}>{item.studentName}</Text>
            <Text style={[styles.studentMeta, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
          <View style={styles.attendanceMarkRow}>
            <TouchableOpacity
              style={[styles.markBtn, isPresent && styles.markBtnPresent]}
              onPress={() => handleMarkAttendanceForDate(item, 'present')}
            >
              <Ionicons name="checkmark" size={18} color={isPresent ? '#FFF' : '#16A34A'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.markBtn, isAbsent && styles.markBtnAbsent]}
              onPress={() => handleMarkAttendanceForDate(item, 'absent')}
            >
              <Ionicons name="close" size={18} color={isAbsent ? '#FFF' : '#DC2626'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderRemarksItem = ({ item }: { item: BatchEnrollment }) => {
    const initials = item.studentName
      ? item.studentName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((n) => n[0]?.toUpperCase())
          .join('')
      : '?';

    const lastEval =
      item.latestEvaluation && !Number.isNaN(Date.parse(item.latestEvaluation))
        ? new Date(item.latestEvaluation).toLocaleDateString()
        : null;

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentInfoRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.studentTextContainer}>
            <Text style={styles.studentName}>{item.studentName}</Text>
            <Text style={styles.studentMeta}>
              {lastEval ? `Last evaluated: ${lastEval}` : 'Not evaluated yet'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.evaluateButton}
            activeOpacity={0.9}
            onPress={() => openEvaluateModal(item)}
            disabled={isLoadingMetrics || optedMetrics.length === 0}
          >
            <Ionicons name="create-outline" size={16} color="#FFF" />
            <Text style={styles.evaluateButtonText}>Evaluate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <VendorVerificationGate>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading batch details...</Text>
        </View>
      </VendorVerificationGate>
    );
  }

  if (error) {
    return (
      <VendorVerificationGate>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </VendorVerificationGate>
    );
  }

  if (!batch) {
    return (
      <VendorVerificationGate>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Batch not found.</Text>
        </View>
      </VendorVerificationGate>
    );
  }

  const scheduleLabel = batch.daysOfWeek || 'Schedule not set';
  const timeLabel =
    batch.startTime && batch.endTime
      ? `${batch.startTime} - ${batch.endTime}`
      : 'Time not set';

  const formatDateOnly = (value?: string | null) => {
    if (!value) return '';
    return value.split('T')[0] ?? value;
  };

  const enrolledCount = enrollments.length;
  const capacityTotal = typeof batch.capacity === 'number' ? batch.capacity : 0;
  const capacityFraction = capacityTotal > 0 ? Math.min(enrolledCount / capacityTotal, 1) : 0;

  return (
    <VendorVerificationGate>
    <View style={styles.outerContainer}>
    <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadAll(true);
            }}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
      {/* Hero header card */}
      <View style={styles.batchHeaderCard}>
        <View style={styles.batchHeaderTopRow}>
          <View style={styles.batchAvatarCircle}>
            <Ionicons name="people" size={24} color={Colors.primary} />
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Active</Text>
          </View>
        </View>

        <Text style={styles.batchTitle}>{batch.name}</Text>
        {serviceName ? (
          <Text style={styles.batchServiceName}>{serviceName}</Text>
        ) : null}

        <View style={styles.batchMetaRow}>
          <Ionicons name="time-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.batchMetaText}>{timeLabel}</Text>
        </View>

        <View style={styles.batchMetaRow}>
          <Ionicons name="person-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.batchMetaText}>
            Capacity: {enrolledCount}/{capacityTotal} students
          </Text>
        </View>

        {/* Capacity progress bar */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${Math.round(capacityFraction * 100)}%` }]} />
        </View>
      </View>

      {/* Tabs — underline style matching student service page */}
      <View style={styles.tabsRow}>
        {(['students', 'attendance', 'remarks'] as const).map((tabKey) => {
          const label =
            tabKey === 'students' ? 'Student List' : tabKey === 'attendance' ? 'Attendance' : 'Remarks';
          const isActive = activeTab === tabKey;
          return (
            <TouchableOpacity
              key={tabKey}
              style={styles.tabItem}
              onPress={() => setActiveTab(tabKey)}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
              {isActive && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.tabDivider} />

      {/* Tab content */}
      {activeTab === 'students' && (
        <View style={styles.tabContent}>
          {isLoadingEnrollments ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : enrollments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>No students enrolled yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to add students to this batch.
              </Text>
            </View>
          ) : (
            <FlatList
              data={enrollments}
              keyExtractor={(item) => item.id}
              renderItem={renderStudentItem}
              scrollEnabled={false}
              contentContainerStyle={styles.studentListContent}
            />
          )}
        </View>
      )}

      {activeTab === 'attendance' && (
        <View style={styles.tabContent}>
          {/* Simple month calendar */}
          <View style={styles.calendarHeaderRow}>
            <TouchableOpacity
              onPress={() => {
                if (!currentMonth) return;
                const prev = new Date(currentMonth);
                prev.setMonth(prev.getMonth() - 1);
                setCurrentMonth(prev);
              }}
            >
              <Ionicons name="chevron-back-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.calendarHeaderText}>
              {currentMonth
                ? currentMonth.toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric',
                  })
                : ''}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (!currentMonth) return;
                const next = new Date(currentMonth);
                next.setMonth(next.getMonth() + 1);
                setCurrentMonth(next);
              }}
            >
              <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarWeekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, index) => (
              <Text key={`${d}-${index}`} style={styles.calendarWeekLabel}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {(() => {
              if (!currentMonth) return null;
              const year = currentMonth.getFullYear();
              const month = currentMonth.getMonth();
              const firstDay = new Date(year, month, 1);
              const startWeekday = firstDay.getDay(); // 0-6
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells: (number | null)[] = [];
              for (let i = 0; i < startWeekday; i += 1) {
                cells.push(null);
              }
              for (let d = 1; d <= daysInMonth; d += 1) {
                cells.push(d);
              }
              return cells.map((day, idx) => {
                if (day === null) {
                  return <View key={`empty-${idx}`} style={styles.calendarDayCell} />;
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
                  day,
                ).padStart(2, '0')}`;
                const isSelected = selectedDate === dateStr;
                const isToday = today === dateStr;
                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={styles.calendarDayCell}
                    onPress={() => setSelectedDate(dateStr)}
                  >
                    <View
                      style={[
                        styles.calendarDayCircle,
                        isSelected && styles.calendarDaySelected,
                        !isSelected && isToday && styles.calendarDayToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          isSelected && styles.calendarDayTextSelected,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              });
            })()}
          </View>

          <View style={styles.attendanceListHeaderRow}>
            <Text style={styles.attendanceListTitle}>
              Attendance for{' '}
              {selectedDate ||
                today}
            </Text>
          </View>

          {isLoadingAttendance ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : attendanceByDate.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No attendance records</Text>
              <Text style={styles.emptySubtitle}>
                Mark students as present or absent for the selected date.
              </Text>
            </View>
          ) : (
            <FlatList
              data={attendanceByDate}
              keyExtractor={(item) => item.studentId}
              renderItem={renderAttendanceItem}
              scrollEnabled={false}
              contentContainerStyle={styles.studentListContent}
            />
          )}
        </View>
      )}

      {activeTab === 'remarks' && (
        <View style={styles.tabContent}>
          {isLoadingEnrollments || isLoadingMetrics ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : enrollments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No students enrolled yet</Text>
              <Text style={styles.emptySubtitle}>
                Enroll students first to record evaluations and remarks.
              </Text>
            </View>
          ) : (
            <FlatList
              data={enrollments}
              keyExtractor={(item) => item.id}
              renderItem={renderRemarksItem}
              scrollEnabled={false}
              contentContainerStyle={styles.studentListContent}
            />
          )}
        </View>
      )}

      {/* Enroll student modal */}
      {isEnrollModalVisible && (
        <View style={styles.enrollModalOverlay}>
          <View style={styles.enrollModalCard}>
            <View style={styles.enrollModalHeaderRow}>
              <View style={styles.enrollModalTitleCol}>
                <Text style={styles.enrollModalTitle}>Enroll New Student</Text>
                <Text style={styles.enrollModalSubtitle}>
                  Add a student to this batch. They will appear in the student list immediately.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsEnrollModalVisible(false);
                }}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.enrollModalContent}>
              <View style={styles.enrollInputGroup}>
                <Text style={styles.enrollInputLabel}>Student Name *</Text>
                <View style={styles.enrollInputContainer}>
                  <TextInput
                    style={styles.enrollInput}
                    value={enrollName}
                    onChangeText={setEnrollName}
                    placeholder="Enter student name"
                  />
                </View>
              </View>

              <View style={styles.enrollInputGroup}>
                <Text style={styles.enrollInputLabel}>Student Email *</Text>
                <View style={styles.enrollInputContainer}>
                  <TextInput
                    style={styles.enrollInput}
                    value={enrollEmail}
                    onChangeText={setEnrollEmail}
                    placeholder="Enter student email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.enrollInputGroup}>
                <Text style={styles.enrollInputLabel}>Student's Phone Number *</Text>
                <View style={styles.enrollInputContainer}>
                  <TextInput
                    style={styles.enrollInput}
                    value={enrollStudentPhone}
                    onChangeText={setEnrollStudentPhone}
                    placeholder="Enter student phone number"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.enrollInputGroup}>
                <Text style={styles.enrollInputLabel}>Parent's Phone Number *</Text>
                <View style={styles.enrollInputContainer}>
                  <TextInput
                    style={styles.enrollInput}
                    value={enrollParentPhone}
                    onChangeText={setEnrollParentPhone}
                    placeholder="Enter parent phone number"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.enrollCancelButton}
                activeOpacity={0.8}
                onPress={() => {
                  setIsEnrollModalVisible(false);
                }}
                disabled={isEnrolling}
              >
                <Text style={styles.enrollCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.enrollPrimaryButton,
                  isEnrolling && styles.enrollPrimaryButtonDisabled,
                ]}
                activeOpacity={0.9}
                onPress={handleEnrollStudent}
                disabled={isEnrolling}
              >
                {isEnrolling ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.enrollPrimaryButtonText}>Enroll Student</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Evaluate student modal */}
      {isEvaluateModalVisible && evaluatingStudent && (
        <View style={styles.evaluateModalOverlay}>
          <View style={styles.evaluateModalCard}>
            <View style={styles.evaluateModalHeaderRow}>
              <View style={styles.evaluateModalTitleCol}>
                <Text style={styles.evaluateModalTitle}>Evaluate Student</Text>
                <Text style={styles.evaluateModalSubtitle}>
                  {evaluatingStudent.studentName}
                </Text>
              </View>
              <TouchableOpacity onPress={handleCloseEvaluateModal}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.evaluateModalContent}>
              {optedMetrics.length === 0 ? (
                <Text style={styles.placeholderText}>
                  No performance metrics have been configured for this service yet.
                </Text>
              ) : (
                optedMetrics.map((metric) => {
                  const pm = metric.performanceMetric;
                  const key = metric.id;
                  const value = metricValues[key];

                  if (pm.dataType === 'rating') {
                    const min = typeof pm.config?.min === 'number' ? pm.config.min : 1;
                    const max = typeof pm.config?.max === 'number' ? pm.config.max : 5;
                    const options = [];
                    for (let i = min; i <= max; i += 1) {
                      options.push(i);
                    }
                    return (
                      <View key={key} style={styles.metricGroup}>
                        <Text style={styles.metricLabel}>{pm.name}</Text>
                        {pm.description ? (
                          <Text style={styles.metricDescription}>{pm.description}</Text>
                        ) : null}
                        <View style={styles.metricRatingRow}>
                          {options.map((opt) => {
                            const isActive = value === opt;
                            return (
                              <TouchableOpacity
                                key={`${key}-${opt}`}
                                style={[
                                  styles.metricRatingChip,
                                  isActive && styles.metricRatingChipActive,
                                ]}
                                onPress={() => handleChangeMetricValue(key, opt)}
                              >
                                <Text
                                  style={[
                                    styles.metricRatingChipText,
                                    isActive && styles.metricRatingChipTextActive,
                                  ]}
                                >
                                  {opt}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  }

                  if (pm.dataType === 'number') {
                    const min =
                      typeof pm.config?.min === 'number'
                        ? pm.config.min
                        : 0;
                    const max =
                      typeof pm.config?.max === 'number'
                        ? pm.config.max
                        : 10;
                    const numericValue =
                      typeof value === 'number'
                        ? value
                        : min;

                    return (
                      <View key={key} style={styles.metricGroup}>
                        <Text style={styles.metricLabel}>{pm.name}</Text>
                        {pm.description ? (
                          <Text style={styles.metricDescription}>{pm.description}</Text>
                        ) : null}
                        <View style={styles.metricSliderRow}>
                          <Slider
                            style={styles.metricSlider}
                            minimumValue={min}
                            maximumValue={max}
                            step={1}
                            value={numericValue}
                            minimumTrackTintColor={Colors.primary}
                            maximumTrackTintColor="#E5E7EB"
                            thumbTintColor={Colors.primary}
                            onValueChange={(val) =>
                              handleChangeMetricValue(key, Math.round(val))
                            }
                          />
                          <Text style={styles.metricSliderValue}>{numericValue}</Text>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View key={key} style={styles.metricGroup}>
                      <Text style={styles.metricLabel}>{pm.name}</Text>
                      {pm.description ? (
                        <Text style={styles.metricDescription}>{pm.description}</Text>
                      ) : null}
                      <View style={styles.metricInputContainer}>
                        <TextInput
                          style={styles.metricInput}
                          value={value ?? ''}
                          onChangeText={(text) => handleChangeMetricValue(key, text)}
                          placeholder="Enter value"
                          keyboardType={pm.dataType === 'number' ? 'numeric' : 'default'}
                          multiline={pm.dataType === 'text'}
                        />
                      </View>
                    </View>
                  );
                })
              )}

              {/* Additional remarks */}
              <View style={styles.metricGroup}>
                <Text style={styles.metricLabel}>Additional Remarks</Text>
                <View style={styles.metricInputContainer}>
                  <TextInput
                    style={[styles.metricInput, { minHeight: 60 }]}
                    value={evaluationRemarks}
                    onChangeText={setEvaluationRemarks}
                    placeholder="Add any comments or notes…"
                    multiline
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.evaluatePrimaryButton}
                activeOpacity={0.9}
                onPress={handleSubmitEvaluation}
              >
                <Text style={styles.evaluatePrimaryButtonText}>Save Evaluation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>

      {/* FAB to enroll student */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={handleOpenEnrollModal}
      >
        <Ionicons name="person-add" size={22} color="#FFF" />
      </TouchableOpacity>
    </View>
    </VendorVerificationGate>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.error,
    textAlign: 'center',
  },
  // Header card — light lavender background
  batchHeaderCard: {
    backgroundColor: `${Colors.primary}14`,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  batchHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  batchAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#166534',
  },
  batchTitle: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  batchServiceName: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  batchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  batchMetaText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text,
  },
  progressBarTrack: {
    marginTop: 10,
    height: 6,
    borderRadius: 999,
    backgroundColor: `${Colors.primary}22`,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  // Tabs — underline style
  tabsRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 3,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  tabDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  tabContent: {
    marginTop: 4,
  },
  studentListContent: {
    paddingBottom: 16,
  },
  // Student card
  studentCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  studentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  studentTextContainer: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
    marginBottom: 3,
  },
  studentMeta: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  placeholderText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  enrollModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  enrollModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 25,
    elevation: 6,
  },
  enrollModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  enrollModalTitleCol: {
    flex: 1,
    marginRight: 12,
  },
  enrollModalTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  enrollModalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  enrollModalContent: {
    marginTop: 4,
  },
  enrollInputGroup: {
    marginBottom: 10,
  },
  enrollInputLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text,
    marginBottom: 6,
  },
  enrollInputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.backgroundSecondary,
  },
  enrollInput: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text,
  },
  enrollCancelButton: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  enrollCancelText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  enrollPrimaryButton: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  enrollPrimaryButtonDisabled: {
    opacity: 0.7,
  },
  enrollPrimaryButtonText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#FFF',
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  calendarHeaderText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  calendarWeekLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayCircle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 16,
  },
  calendarDaySelected: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
  },
  calendarDayText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text,
  },
  calendarDayTextSelected: {
    color: '#FFF',
    fontFamily: Typography.fontFamily.semiBold,
  },
  attendanceListHeaderRow: {
    marginBottom: 6,
  },
  attendanceListTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
  },
  attendanceMarkRow: {
    flexDirection: 'row',
    gap: 6,
  },
  markBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  markBtnPresent: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  markBtnAbsent: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  evaluateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    gap: 4,
  },
  evaluateButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#FFF',
  },
  evaluateModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  evaluateModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 25,
    elevation: 6,
  },
  evaluateModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  evaluateModalTitleCol: {
    flex: 1,
    marginRight: 12,
  },
  evaluateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  evaluateModalSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  evaluateModalContent: {
    marginTop: 4,
  },
  metricGroup: {
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  metricDescription: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  metricRatingRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  metricRatingChip: {
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricRatingChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  metricRatingChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  metricRatingChipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  metricInputContainer: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  metricInput: {
    fontSize: 14,
    color: Colors.text,
  },
  metricSliderRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricSlider: {
    flex: 1,
  },
  metricSliderValue: {
    width: 32,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  evaluatePrimaryButton: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  evaluatePrimaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});

