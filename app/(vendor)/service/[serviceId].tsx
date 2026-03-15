import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  FlatList,
  TouchableOpacity,
  BackHandler,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';
import { Image } from 'react-native';
import { VendorVerificationGate } from '@/components/VendorVerificationGate';
import { serviceService } from '@/services/service.service';
import { batchService, type ServiceBatch } from '@/services/batch.service';
import type { VendorService } from '@/types/service';

export const options = {
  href: null,
};

const TIME_OPTIONS = (() => {
  const options: { label: string; value: string }[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 30) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const hour12 = h % 12 || 12;
      const period = h < 12 ? 'AM' : 'PM';
      const label = `${String(hour12).padStart(2, '0')}:${String(m).padStart(
        2,
        '0',
      )} ${period}`;
      options.push({ label, value });
    }
  }
  return options;
})();

type Params = {
  serviceId: string;
};

export default function VendorServiceDetailScreen() {
  const { serviceId } = useLocalSearchParams<Params>();
  const router = useRouter();

  const [service, setService] = useState<VendorService | null>(null);
  const [batches, setBatches] = useState<ServiceBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBatchModalVisible, setIsBatchModalVisible] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(''); // 24h, e.g. "09:00"
  const [endTime, setEndTime] = useState(''); // 24h
  const [ageGroup, setAgeGroup] = useState('');
  const [batchPrice, setBatchPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [isLoadingBatchForm, setIsLoadingBatchForm] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ServiceBatch | null>(null);
  const [batchPendingDelete, setBatchPendingDelete] = useState<ServiceBatch | null>(null);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  useEffect(() => {
    if (!serviceId) return;
    loadData(String(serviceId));
  }, [serviceId]);

  // Ensure Android hardware back goes to My Services instead of dashboard
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.replace('/(vendor)/services' as any);
        return true;
      });
      return () => sub.remove();
    }, [router])
  );

  const loadData = async (id: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const [serviceRes, batchesRes] = await Promise.all([
        serviceService.getServiceById(id),
        batchService.getBatchesForService(id),
      ]);

      // Backend currently returns a single service object:
      // { status, message, data: { ...service... } }
      const raw = (serviceRes as any).data;
      const svc: VendorService | null =
        raw && typeof raw === 'object' && 'data' in raw
          ? ((raw as any).data as VendorService)
          : (raw as VendorService | null);

      setService(svc);
      setBatches(batchesRes.data || []);
    } catch (e: any) {
      console.error('[VendorServiceDetail] Failed to load data', e);
      setError(e?.message || 'Unable to load service details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshBatches = async () => {
    if (!serviceId) return;
    try {
      setIsLoadingBatches(true);
      const res = await batchService.getBatchesForService(String(serviceId));
      setBatches(res.data || []);
    } catch (e: any) {
      console.error('[VendorServiceDetail] Failed to refresh batches', e);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const dayOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

  const mapDaysToOptions = (value?: string | null): string[] => {
    if (!value) return [];
    const map: Record<string, (typeof dayOptions)[number]> = {
      mon: 'Mon',
      tue: 'Tue',
      wed: 'Wed',
      thu: 'Thu',
      fri: 'Fri',
      sat: 'Sat',
      sun: 'Sun',
    };
    const normalized: string[] = [];
    value.split(',').forEach((raw) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      // Already one of our labels
      if (dayOptions.includes(trimmed as (typeof dayOptions)[number])) {
        normalized.push(trimmed);
        return;
      }
      const key = trimmed.toLowerCase().slice(0, 3);
      const mapped = map[key];
      if (mapped) {
        normalized.push(mapped);
      }
    });
    return normalized;
  };

  const parseDateOrToday = (value: string) => {
    if (!value) return new Date();
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return new Date();
    return d;
  };

  const normalizeDateField = (value?: string | null): string => {
    if (!value) return '';
    // API might return plain date ("2024-01-01") or ISO datetime ("2024-01-01T00:00:00.000Z")
    const [datePart] = value.split('T');
    return datePart;
  };

  const toggleDay = (label: string) => {
    setSelectedDays((prev) =>
      prev.includes(label) ? prev.filter((d) => d !== label) : [...prev, label],
    );
  };

  const resetBatchForm = () => {
    setBatchName('');
    setSelectedDays([]);
    setStartTime('');
    setEndTime('');
    setAgeGroup('');
    setBatchPrice('');
    setCapacity('');
    setStartDate('');
    setEndDate('');
    setEditingBatch(null);
    setIsLoadingBatchForm(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
  };

  const handleStartDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type !== 'set' || !date) {
      setShowStartDatePicker(false);
      return;
    }
    const iso = date.toISOString().slice(0, 10);
    setStartDate(iso);
    setShowStartDatePicker(false);
  };

  const handleEndDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type !== 'set' || !date) {
      setShowEndDatePicker(false);
      return;
    }
    const iso = date.toISOString().slice(0, 10);
    setEndDate(iso);
    setShowEndDatePicker(false);
  };

  const formatTimeLabel = (value?: string) => {
    if (!value) return '';
    const [hh, mm] = value.split(':');
    const hours = Number.parseInt(hh ?? '', 10);
    if (Number.isNaN(hours)) return value;
    const period = hours < 12 ? 'AM' : 'PM';
    const hour12 = hours % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${mm ?? '00'} ${period}`;
  };

  const handleStartTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type !== 'set' || !date) {
      setShowStartTimePicker(false);
      return;
    }
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    setStartTime(`${hh}:${mm}`);
    setShowStartTimePicker(false);
  };

  const handleEndTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type !== 'set' || !date) {
      setShowEndTimePicker(false);
      return;
    }
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    setEndTime(`${hh}:${mm}`);
    setShowEndTimePicker(false);
  };

  const handleOpenBatchModal = () => {
    resetBatchForm();
    setIsBatchModalVisible(true);
  };

  const handleEditBatch = async (batch: ServiceBatch) => {
    resetBatchForm();
    setIsBatchModalVisible(true);
    try {
      setIsLoadingBatchForm(true);
      const res = await batchService.getBatchById(batch.id);
      const full = res.data;
      setEditingBatch(full);
      setBatchName(full.name || '');
      setSelectedDays(mapDaysToOptions(full.daysOfWeek));
      setStartTime(full.startTime || '');
      setEndTime(full.endTime || '');
      setAgeGroup(full.ageGroup || '');
      setBatchPrice(
        typeof full.price === 'number'
          ? String(full.price)
          : full.price || '',
      );
      setCapacity(
        typeof full.capacity === 'number'
          ? String(full.capacity)
          : full.capacity || '',
      );
      setStartDate(normalizeDateField(full.startDate));
      setEndDate(normalizeDateField(full.endDate));
    } catch (e: any) {
      console.error('[VendorServiceDetail] Failed to load batch for edit', e);
      alert(e?.message || 'Failed to load batch details. Please try again.');
      setIsBatchModalVisible(false);
    } finally {
      setIsLoadingBatchForm(false);
    }
  };

  const handleSaveBatch = async () => {
    if (!serviceId || !service) return;
    if (!batchName.trim()) {
      alert('Please enter a batch name.');
      return;
    }
    if (selectedDays.length === 0) {
      alert('Please select at least one day of the week.');
      return;
    }
    if (!startTime.trim() || !endTime.trim()) {
      alert('Please select start and end time.');
      return;
    }
    if (!ageGroup.trim()) {
      alert('Please enter age group.');
      return;
    }
    if (!batchPrice.trim() || isNaN(Number(batchPrice.trim()))) {
      alert('Please enter a valid numeric price.');
      return;
    }
    if (!capacity.trim() || isNaN(Number(capacity.trim()))) {
      alert('Please enter a valid numeric capacity.');
      return;
    }
    if (!startDate.trim() || !endDate.trim()) {
      alert('Please enter start and end date (YYYY-MM-DD).');
      return;
    }

    const daysOfWeek = selectedDays.join(', ');

    try {
      setIsSavingBatch(true);

      if (editingBatch) {
        await batchService.updateBatch(editingBatch.id, {
          name: batchName.trim(),
          daysOfWeek,
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          ageGroup: ageGroup.trim(),
          price: Number(batchPrice.trim()),
          capacity: Number(capacity.trim()),
          startDate: startDate.trim(),
          endDate: endDate.trim(),
        });
      } else {
        await batchService.createBatch({
          serviceId: String(service.id),
          name: batchName.trim(),
          daysOfWeek,
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          ageGroup: ageGroup.trim(),
          price: Number(batchPrice.trim()),
          capacity: Number(capacity.trim()),
          startDate: startDate.trim(),
          endDate: endDate.trim(),
        });
      }

      setIsBatchModalVisible(false);
      setEditingBatch(null);
      await handleRefreshBatches();
    } catch (e: any) {
      console.error('[VendorServiceDetail] Failed to save batch', e);
      alert(e?.message || 'Failed to save batch. Please try again.');
    } finally {
      setIsSavingBatch(false);
    }
  };

  const handleViewBatch = (batch: ServiceBatch) => {
    if (!service) return;
    router.push({
      pathname: '/(vendor)/batch/[batchId]' as any,
      params: { batchId: batch.id, serviceId: service.id },
    });
  };

  const handleRequestDeleteBatch = (batch: ServiceBatch) => {
    setBatchPendingDelete(batch);
  };

  const handleConfirmDeleteBatch = async () => {
    if (!batchPendingDelete) return;
    try {
      setIsDeletingBatch(true);
      await batchService.deleteBatch(batchPendingDelete.id);
      setBatchPendingDelete(null);
      await handleRefreshBatches();
    } catch (e: any) {
      console.error('[VendorServiceDetail] Failed to delete batch', e);
      alert(e?.message || 'Failed to delete batch. Please try again.');
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const getBatchIconName = (startTime?: string | null): React.ComponentProps<typeof Ionicons>['name'] => {
    if (!startTime) return 'time';
    const hour = parseInt(startTime.split(':')[0] ?? '0', 10);
    if (hour < 12) return 'sunny';
    if (hour < 17) return 'partly-sunny';
    return 'moon';
  };

  const getBatchIconColor = (startTime?: string | null): string => {
    if (!startTime) return Colors.textSecondary;
    const hour = parseInt(startTime.split(':')[0] ?? '0', 10);
    if (hour < 12) return '#F59E0B';
    if (hour < 17) return '#3B82F6';
    return '#8B5CF6';
  };

  const renderBatchItem = ({ item }: { item: ServiceBatch }) => {
    const iconName = getBatchIconName(item.startTime);
    const iconColor = getBatchIconColor(item.startTime);
    const startLabel = item.startTime ? `Starts ${formatTimeLabel(item.startTime)}` : 'Time not set';
    const capacityUsed = item.studentCount ?? 0;
    const capacityTotal = item.capacity ?? '—';

    return (
      <View style={styles.batchCard}>
        <View style={styles.batchCardMain}>
          <View style={[styles.batchIconCircle, { backgroundColor: `${iconColor}18` }]}>
            <Ionicons name={iconName} size={22} color={iconColor} />
          </View>
          <View style={styles.batchInfo}>
            <Text style={styles.batchName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.batchStartTime}>{startLabel}</Text>
          </View>
          <View style={styles.batchCapacityBlock}>
            <Text style={styles.batchCapacityLabel}>Capacity</Text>
            <Text style={styles.batchCapacityValue}>{capacityUsed}/{capacityTotal}</Text>
          </View>
        </View>

        <View style={styles.batchActionsRow}>
          <TouchableOpacity
            style={[styles.batchActionButton, styles.batchViewButton]}
            activeOpacity={0.9}
            onPress={() => handleViewBatch(item)}
          >
            <Ionicons name="eye" size={14} color="#FFF" />
            <Text style={[styles.batchActionText, styles.batchViewText]}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.batchActionButton, styles.batchEditButton]}
            activeOpacity={0.9}
            onPress={() => handleEditBatch(item)}
          >
            {/* <Ionicons name="create-outline" size={14} color={Colors.primary} /> */}
            <MaterialIcons name="mode-edit" size={14} color={Colors.primary} />
            
            <Text style={styles.batchActionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.batchActionButton, styles.batchDeleteButton]}
            activeOpacity={0.9}
            onPress={() => handleRequestDeleteBatch(item)}
          >
            <Ionicons name="trash" size={14} color={Colors.error} />
            <Text style={[styles.batchActionText, styles.batchDeleteText]}>Delete</Text>
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
          <Text style={styles.loadingText}>Loading service details...</Text>
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

  if (!service) {
    return (
      <VendorVerificationGate>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Service not found.</Text>
        </View>
      </VendorVerificationGate>
    );
  }

  return (
    <VendorVerificationGate>
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero image */}
        <View style={styles.heroWrap}>
          {(service as any).imageUrl ? (
            <Image source={{ uri: (service as any).imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="image" size={44} color={Colors.primary} />
            </View>
          )}
          {(service as any).status ? (
            <View style={styles.heroStatusBadge}>
              <Text style={styles.heroStatusText}>
                {((service as any).status as string).charAt(0).toUpperCase() + ((service as any).status as string).slice(1)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Service info card */}
        <View style={styles.serviceCard}>
          <View style={styles.serviceTitleRow}>
            <Text style={styles.serviceTitle} numberOfLines={2}>{service.name}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.replace('/(vendor)/services' as any)}
            >
              {/* <Ionicons name="pencil" size={14} color={Colors.primary} /> */}
              <MaterialIcons name="mode-edit" size={14} color={Colors.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {service.description ? (
            <Text style={styles.serviceSubtitle}>{service.description}</Text>
          ) : null}

          <View style={styles.serviceMetaRow}>
            {service.price !== undefined ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaItemLabel}>PRICE</Text>
                <Text style={styles.metaItemValue}>₹{service.price}</Text>
              </View>
            ) : null}
            {service.categoryName ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaItemLabel}>CATEGORY</Text>
                <Text style={styles.metaItemValue}>{service.categoryName}</Text>
              </View>
            ) : null}
            {service.branchName ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaItemLabel}>BRANCH</Text>
                <Text style={styles.metaItemValue}>{service.branchName}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Batches section */}
        <View style={styles.batchesHeaderRow}>
          <View>
            <Text style={styles.batchesTitle}>Service Batches</Text>
            <Text style={styles.batchesSubtitle}>Manage daily schedules</Text>
          </View>
        </View>

        {isLoadingBatches ? (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : null}

        {batches.length === 0 && !isLoadingBatches ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No batches yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first batch to start enrolling students.
            </Text>
          </View>
        ) : (
          <FlatList
            data={batches}
            keyExtractor={(item) => item.id}
            renderItem={renderBatchItem}
            scrollEnabled={false}
            contentContainerStyle={styles.batchListContent}
          />
        )}
      </ScrollView>

      {/* Create Batch (drawer from bottom) */}
      <Modal
        visible={isBatchModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsBatchModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsBatchModalVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>{editingBatch ? 'Edit Batch' : 'Add New Batch'}</Text>
                <Text style={styles.modalSubtitle}>
                  {editingBatch
                    ? 'Update the batch details below.'
                    : 'Fill in the details below to create a new batch for this service.'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsBatchModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Batch name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Batch Name *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={batchName}
                    onChangeText={setBatchName}
                    placeholder="e.g., Morning Batch A"
                  />
                </View>
              </View>

              {/* Days of week */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Days of Week *</Text>
                <View style={styles.daysRow}>
                  {dayOptions.map((d) => {
                    const active = selectedDays.includes(d);
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.dayChip, active && styles.dayChipActive]}
                        onPress={() => toggleDay(d)}
                      >
                        <Text
                          style={[
                            styles.dayChipText,
                            active && styles.dayChipTextActive,
                          ]}
                        >
                          {d}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Start / End time */}
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.inputLabel}>Start Time *</Text>
                  <TouchableOpacity
            style={[styles.inputContainer, styles.dropdownTrigger]}
            activeOpacity={0.8}
            onPress={() => setShowStartTimePicker(true)}
          >
            <Text
              style={[styles.dropdownText, !startTime && styles.placeholderText]}
              numberOfLines={1}
            >
              {startTime ? formatTimeLabel(startTime) : 'Select time'}
            </Text>
            <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.inputLabel}>End Time *</Text>
                  <TouchableOpacity
            style={[styles.inputContainer, styles.dropdownTrigger]}
            activeOpacity={0.8}
            onPress={() => setShowEndTimePicker(true)}
          >
            <Text
              style={[styles.dropdownText, !endTime && styles.placeholderText]}
              numberOfLines={1}
            >
              {endTime ? formatTimeLabel(endTime) : 'Select time'}
            </Text>
            <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
                </View>
              </View>

              {/* Age group */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Age Group *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={ageGroup}
                    onChangeText={setAgeGroup}
                    placeholder="e.g., 6–12"
                  />
                </View>
              </View>

              {/* Price / Capacity */}
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.inputLabel}>Batch Price (₹) *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={batchPrice}
                      onChangeText={setBatchPrice}
                      placeholder="Enter batch price"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.inputLabel}>Capacity *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={capacity}
                      onChangeText={setCapacity}
                      placeholder="Max students"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Start / End date */}
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.inputLabel}>Start Date *</Text>
                  <TouchableOpacity
                    style={styles.inputContainer}
                    activeOpacity={0.8}
                    onPress={() => {
                      setShowStartDatePicker(true);
                    }}
                  >
                    <View style={styles.dateInputInner}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={Colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.inputValueText,
                          !startDate && styles.placeholderText,
                        ]}
                        numberOfLines={1}
                      >
                        {startDate
                          ? (() => {
                              const [yyyy, mm, dd] = startDate.split('-');
                              if (yyyy && mm && dd) {
                                return `${dd}-${mm}-${yyyy}`;
                              }
                              return startDate;
                            })()
                          : 'DD-MM-YYYY'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.inputLabel}>End Date *</Text>
                  <TouchableOpacity
                    style={styles.inputContainer}
                    activeOpacity={0.8}
                    onPress={() => {
                      setShowEndDatePicker(true);
                    }}
                  >
                    <View style={styles.dateInputInner}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={Colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.inputValueText,
                          !endDate && styles.placeholderText,
                        ]}
                        numberOfLines={1}
                      >
                        {endDate
                          ? (() => {
                              const [yyyy, mm, dd] = endDate.split('-');
                              if (yyyy && mm && dd) {
                                return `${dd}-${mm}-${yyyy}`;
                              }
                              return endDate;
                            })()
                          : 'DD-MM-YYYY'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.primaryButton, isSavingBatch && styles.primaryButtonDisabled]}
                  activeOpacity={0.9}
                  onPress={handleSaveBatch}
                  disabled={isSavingBatch}
                >
                  {isSavingBatch ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="add" size={18} color="#FFF" />
                      <Text style={styles.primaryButtonText}>
                        {editingBatch ? 'Save Changes' : 'Create Batch'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setIsBatchModalVisible(false)}
                  disabled={isSavingBatch}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Delete Batch Confirm (drawer) */}
      {batchPendingDelete && (
        <Modal
          visible={!!batchPendingDelete}
          animationType="slide"
          transparent
          onRequestClose={() => setBatchPendingDelete(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setBatchPendingDelete(null)} />
            <View style={styles.deleteModalCard}>
              <View style={styles.deleteIconCircle}>
                <Ionicons name="trash-outline" size={26} color="#FF6B6B" />
              </View>
              <Text style={styles.deleteTitle}>Delete batch?</Text>
              <Text style={styles.deleteMessage}>
                Are you sure you want to delete{' '}
                <Text style={styles.deleteBatchName}>{batchPendingDelete.name}</Text>? This
                action cannot be undone.
              </Text>

              <View style={styles.deleteActions}>
                <TouchableOpacity
                  style={styles.deleteCancelButton}
                  onPress={() => setBatchPendingDelete(null)}
                  disabled={isDeletingBatch}
                >
                  <Text style={styles.deleteCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteConfirmButton}
                  onPress={handleConfirmDeleteBatch}
                  disabled={isDeletingBatch}
                >
                  {isDeletingBatch ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.deleteConfirmText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {showStartTimePicker && (
        <DateTimePicker
          testID="startTimePicker"
          value={parseDateOrToday(startDate || '1970-01-01')}
          mode="time"
          display={Platform.OS === 'android' ? 'clock' : 'spinner'}
          is24Hour={false}
          onChange={handleStartTimeChange}
        />
      )}
      {showEndTimePicker && (
        <DateTimePicker
          testID="endTimePicker"
          value={parseDateOrToday(endDate || '1970-01-01')}
          mode="time"
          display={Platform.OS === 'android' ? 'clock' : 'spinner'}
          is24Hour={false}
          onChange={handleEndTimeChange}
        />
      )}
      {showStartDatePicker && (
        <DateTimePicker
          testID="startDatePicker"
          value={parseDateOrToday(startDate)}
          mode="date"
          display={Platform.OS === 'android' ? 'calendar' : 'spinner'}
          is24Hour
          onChange={handleStartDateChange}
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          testID="endDatePicker"
          value={parseDateOrToday(endDate)}
          mode="date"
          display={Platform.OS === 'android' ? 'calendar' : 'spinner'}
          is24Hour
          onChange={handleEndDateChange}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={handleOpenBatchModal}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
    </VendorVerificationGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
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
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.error,
    textAlign: 'center',
  },
  // Hero image
  heroWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    height: 180,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    flex: 1,
    backgroundColor: `${Colors.primaryLight}`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroStatusText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#FFF',
  },
  // Service info card
  serviceCard: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  serviceTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginRight: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  editButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary,
  },
  serviceSubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'column',
    gap: 2,
  },
  metaItemLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  metaItemValue: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  // Batches section
  batchesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  batchesTitle: {
    fontSize: 17,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  batchesSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  addBatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    gap: 4,
  },
  addBatchButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#FFF',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  batchListContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  // Batch card
  batchCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  batchCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  batchIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchInfo: {
    flex: 1,
  },
  batchName: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
    marginBottom: 2,
  },
  batchStartTime: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  batchCapacityBlock: {
    alignItems: 'flex-end',
  },
  batchCapacityLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  batchCapacityValue: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  batchActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  batchActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  batchViewButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  batchViewText: {
    color: '#FFF',top: -2,
    fontFamily: Typography.fontFamily.semiBold,
  },
  batchEditButton: {
    backgroundColor: `${Colors.primary}10`,
    borderColor: `${Colors.primary}30`,
  },
  batchDeleteButton: {
    backgroundColor: `${Colors.error}10`,
    borderColor: `${Colors.error}30`,
  },
  batchActionText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primary,
    top: -2,
  },
  batchDeleteText: {
    color: Colors.error,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFF',
    padding: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  modalScroll: {
    marginTop: 12,
  },
  modalContent: {
    paddingBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text,
    marginBottom: 6,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.backgroundSecondary,
  },
  input: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  dateInputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputValueText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.6)',
    backgroundColor: '#FFF',
    maxHeight: 200,
    overflow: 'hidden',
    zIndex: 50,
    elevation: 6,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F9FAFB',
  },
  dayChipActive: {
    backgroundColor: '#ECFEFF',
    borderColor: Colors.primary,
  },
  dayChipText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  dayChipTextActive: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  rowItem: {
    flex: 1,
  },
  modalActions: {
    marginTop: 12,
    gap: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#FFF',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  deleteModalCard: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  deleteIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  deleteTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteMessage: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  deleteBatchName: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  deleteCancelText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
  },
  deleteConfirmText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#FFF',
  },
});

