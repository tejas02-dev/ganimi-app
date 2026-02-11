import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
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

  const [batch, setBatch] = useState<ServiceBatch | null>(null);
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

  useEffect(() => {
    if (!batchId) return;
    const load = async () => {
      try {
        setError(null);
        setIsLoading(true);

        const batchPromise = batchService.getBatchById(String(batchId));
        const enrollmentsPromise = enrollmentService.getEnrollmentsByBatch(String(batchId));
        const servicePromise = serviceId
          ? serviceService.getServiceById(String(serviceId))
          : Promise.resolve(null);
        const metricsPromise =
          serviceId != null
            ? serviceMetricService.getOptedMetrics(String(serviceId))
            : Promise.resolve(null);

        const [batchRes, enrollmentsRes, serviceRes, metricsRes] = await Promise.all([
          batchPromise,
          enrollmentsPromise,
          servicePromise,
          metricsPromise,
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
        setIsLoadingEnrollments(false);
        setIsLoadingMetrics(false);
      }
    };

    setIsLoadingEnrollments(true);
    setIsLoadingMetrics(true);
    load();
  }, [batchId, serviceId]);

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

  const renderStudentItem = ({ item }: { item: BatchEnrollment }) => {
    const initials = item.studentName
      ? item.studentName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((n) => n[0]?.toUpperCase())
          .join('')
      : '?';

    const todaysStatus = item.todaysAttendance?.status as AttendanceStatus | undefined;
    const localStatus = markingStatus[item.studentId];
    const effectiveStatus = localStatus && localStatus !== 'loading' ? localStatus : todaysStatus;

    let statusLabel = 'Not marked';
    let statusColor = Colors.textSecondary;
    if (effectiveStatus === 'present') {
      statusLabel = 'Present today';
      statusColor = '#16A34A';
    } else if (effectiveStatus === 'absent') {
      statusLabel = 'Absent today';
      statusColor = '#DC2626';
    }

    const isLoadingThis = localStatus === 'loading';
    const isPresent = effectiveStatus === 'present';
    const isAbsent = effectiveStatus === 'absent';

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentInfoRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.studentTextContainer}>
            <Text style={styles.studentName}>{item.studentName}</Text>
            <Text style={styles.studentEmail}>{item.studentEmail}</Text>
            <Text style={[styles.studentStatus, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <View style={styles.quickActionsColumn}>
            <Text style={styles.quickActionsLabel}>Quick Action</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[
                  styles.quickActionButton,
                  isPresent && styles.quickActionButtonPresent,
                ]}
                disabled={isLoadingThis}
                onPress={() => handleMarkAttendance(item, 'present')}
              >
                {isLoadingThis ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={isPresent ? '#FFFFFF' : '#16A34A'}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickActionButton,
                  isAbsent && styles.quickActionButtonAbsent,
                ]}
                disabled={isLoadingThis}
                onPress={() => handleMarkAttendance(item, 'absent')}
              >
                {isLoadingThis ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color={isAbsent ? '#FFFFFF' : '#DC2626'}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
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
            <Text style={styles.studentEmail}>{item.studentEmail}</Text>
            <Text style={[styles.studentStatus, { color: statusColor }]}>
              {statusLabel} on selected date
            </Text>
          </View>
          <View style={styles.quickActionsColumn}>
            <Text style={styles.quickActionsLabel}>Mark</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[
                  styles.quickActionButton,
                  isPresent && styles.quickActionButtonPresent,
                ]}
                onPress={() => handleMarkAttendanceForDate(item, 'present')}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={isPresent ? '#FFFFFF' : '#16A34A'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickActionButton,
                  isAbsent && styles.quickActionButtonAbsent,
                ]}
                onPress={() => handleMarkAttendanceForDate(item, 'absent')}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={isAbsent ? '#FFFFFF' : '#DC2626'}
                />
              </TouchableOpacity>
            </View>
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
            <Text style={styles.studentEmail}>{item.studentEmail}</Text>
            <Text style={styles.studentStatus}>
              {lastEval ? `Last evaluated on ${lastEval}` : 'Not evaluated yet'}
            </Text>
          </View>
          <View style={styles.quickActionsColumn}>
            <TouchableOpacity
              style={styles.evaluateButton}
              activeOpacity={0.9}
              onPress={() => openEvaluateModal(item)}
              disabled={isLoadingMetrics || optedMetrics.length === 0}
            >
              <Ionicons name="create-outline" size={18} color="#FFF" />
              <Text style={styles.evaluateButtonText}>Evaluate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading batch details...</Text>
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

  if (!batch) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Batch not found.</Text>
      </View>
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Colored batch summary */}
      <View style={styles.batchHeaderCard}>
        <View style={styles.batchHeaderTopRow}>
          <View style={styles.batchHeaderTitleCol}>
            <Text style={styles.batchTitle}>{batch.name}</Text>
            {serviceName ? (
              <Text style={styles.batchServiceName}>{serviceName}</Text>
            ) : null}
          </View>
          <View style={styles.batchHeaderPill}>
            <Ionicons name="calendar-outline" size={16} color="#EEF2FF" />
            <Text style={styles.batchHeaderPillText}>{scheduleLabel}</Text>
          </View>
        </View>

        <View style={styles.batchMetaRow}>
          <View style={styles.batchMetaItem}>
            <Text style={styles.batchMetaLabel}>Time</Text>
            <Text style={styles.batchMetaValue}>{timeLabel}</Text>
          </View>
          {typeof batch.capacity !== 'undefined' && (
            <View style={styles.batchMetaItem}>
              <Text style={styles.batchMetaLabel}>Capacity</Text>
              <Text style={styles.batchMetaValue}>{batch.capacity}</Text>
            </View>
          )}
          {typeof batch.price !== 'undefined' && (
            <View style={styles.batchMetaItem}>
              <Text style={styles.batchMetaLabel}>Price</Text>
              <Text style={styles.batchMetaValue}>₹{batch.price}</Text>
            </View>
          )}
        </View>

        <View style={styles.batchDatesRow}>
          {batch.startDate ? (
            <View style={styles.batchDateItem}>
              <Text style={styles.batchMetaLabel}>Start</Text>
              <Text style={styles.batchMetaValue}>{formatDateOnly(batch.startDate)}</Text>
            </View>
          ) : null}
          {batch.endDate ? (
            <View style={styles.batchDateItem}>
              <Text style={styles.batchMetaLabel}>End</Text>
              <Text style={styles.batchMetaValue}>{formatDateOnly(batch.endDate)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Students & attendance management */}
      <View style={styles.managementHeaderRow}>
        <View style={styles.managementTextContainer}>
          <Text style={styles.managementTitle}>Students & Attendance</Text>
          <Text style={styles.managementSubtitle}>
            Enroll students and manage daily attendance for this batch.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.enrollButton}
          activeOpacity={0.9}
          onPress={handleOpenEnrollModal}
        >
          <Ionicons name="person-add-outline" size={18} color="#FFF" />
          <Text style={styles.enrollButtonText}>Enroll student</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['students', 'attendance', 'remarks'] as const).map((tabKey) => {
          const label =
            tabKey === 'students' ? 'Student list' : tabKey === 'attendance' ? 'Attendance' : 'Remarks';
          const isActive = activeTab === tabKey;
          return (
            <TouchableOpacity
              key={tabKey}
              style={[styles.tabChip, isActive && styles.tabChipActive]}
              onPress={() => setActiveTab(tabKey)}
            >
              <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab content */}
      {activeTab === 'students' && (
        <View style={styles.tabContent}>
          <View style={styles.refreshRow}>
            <TouchableOpacity
              style={styles.refreshButton}
              activeOpacity={0.8}
              onPress={async () => {
                if (!batchId) return;
                try {
                  setIsLoadingEnrollments(true);
                  const res = await enrollmentService.getEnrollmentsByBatch(String(batchId));
                  setEnrollments(res.data || []);
                } catch (e: any) {
                  console.error('[VendorBatchDetail] Failed to refresh enrollments', e);
                  alert(e?.message || 'Failed to refresh students. Please try again.');
                } finally {
                  setIsLoadingEnrollments(false);
                }
              }}
              disabled={isLoadingEnrollments}
            >
              {isLoadingEnrollments ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                  <Text style={styles.refreshButtonText}>Refresh students</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {isLoadingEnrollments ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : enrollments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No students enrolled yet</Text>
              <Text style={styles.emptySubtitle}>
                Use the Enroll student button above to add students to this batch.
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
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: Colors.background,
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
  batchHeaderCard: {
    backgroundColor: '#1D4ED8',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  batchHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  batchHeaderTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  batchTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EEF2FF',
  },
  batchServiceName: {
    marginTop: 4,
    fontSize: 13,
    color: '#C7D2FE',
  },
  batchHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.6)',
    gap: 6,
  },
  batchHeaderPillText: {
    fontSize: 12,
    color: '#EEF2FF',
    maxWidth: 140,
  },
  batchMetaRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 8,
  },
  batchMetaItem: {
    flex: 1,
  },
  batchMetaLabel: {
    fontSize: 12,
    color: '#BFDBFE',
    marginBottom: 2,
  },
  batchMetaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EFF6FF',
  },
  batchDatesRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  batchDateItem: {
    marginRight: 16,
  },
  managementHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    columnGap: 8,
    marginBottom: 12,
  },
  managementTextContainer: {
    flex: 1,
    minWidth: '60%',
  },
  managementTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  managementSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  enrollButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    padding: 3,
    marginBottom: 12,
  },
  tabChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 999,
  },
  tabChipActive: {
    backgroundColor: '#FFF',
  },
  tabChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tabChipTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  tabContent: {
    marginTop: 4,
  },
  studentListContent: {
    paddingBottom: 16,
  },
  studentCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  studentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  studentTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  studentEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  studentStatus: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  quickActionsColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  quickActionsLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickActionButtonPresent: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  quickActionButtonAbsent: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    fontWeight: '700',
    color: Colors.text,
  },
  enrollModalSubtitle: {
    marginTop: 4,
    fontSize: 13,
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
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  enrollInputContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  enrollInput: {
    fontSize: 14,
    color: Colors.text,
  },
  enrollCancelButton: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  enrollCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  enrollPrimaryButton: {
    marginTop: 8,
    borderRadius: 999,
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
    fontWeight: '600',
    color: '#FFF',
  },
  refreshRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  refreshButtonText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
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
    fontWeight: '600',
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
    color: Colors.text,
  },
  calendarDayTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  attendanceListHeaderRow: {
    marginBottom: 6,
  },
  attendanceListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  evaluateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    gap: 6,
  },
  evaluateButtonText: {
    fontSize: 13,
    fontWeight: '600',
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

