import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { serviceService } from '@/services/service.service';
import { batchService, type ServiceBatch } from '@/services/batch.service';
import { orderService } from '@/services/order.service';
import { initiateServicePayment } from '@/services/razorpay.service';
import type { VendorService } from '@/types/service';

type Params = { serviceId: string };

function formatPrice(price?: number | string | null): string {
  if (price == null || price === '') return '—';
  const n = Number(price);
  if (Number.isNaN(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDays(daysOfWeek?: string | null): string {
  if (!daysOfWeek) return '—';
  return daysOfWeek.split(',').map((d) => d.trim()).join(', ') || '—';
}

function formatTimeRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return '—';
  if (!start) return end ?? '—';
  if (!end) return start;
  return `${start} - ${end}`;
}

export const options = { href: null };

export default function BookServiceScreen() {
  const { serviceId } = useLocalSearchParams<Params>();
  const router = useRouter();
  const [service, setService] = useState<VendorService | null>(null);
  const [batches, setBatches] = useState<ServiceBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ServiceBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFavourite, setIsFavourite] = useState(false);

  const loadData = useCallback(async () => {
    if (!serviceId) return;
    try {
      setError(null);
      setLoading(true);
      const [serviceRes, batchesRes] = await Promise.all([
        serviceService.getServiceById(serviceId),
        batchService.getBatchesForService(serviceId),
      ]);
      const raw = (serviceRes as any).data;
      const svc: VendorService | null =
        raw && typeof raw === 'object' && !Array.isArray(raw) && 'id' in raw
          ? (raw as VendorService)
          : raw && typeof raw === 'object' && 'data' in raw
            ? ((raw as any).data as VendorService)
            : null;
      setService(svc ?? null);
      setBatches(batchesRes.data ?? []);
      if (!selectedBatch && batchesRes.data?.length) {
        setSelectedBatch(batchesRes.data[0] ?? null);
      }
    } catch (e: any) {
      console.error('[BookService] Failed to load', e);
      setError(e?.message ?? 'Unable to load service. Please try again.');
      setService(null);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleShare = async () => {
    if (!service) return;
    try {
      await Share.share({
        message: `Check out ${service.name} on Ganimi`,
        title: service.name,
      });
    } catch (_) {}
  };

  const handleBookNow = async () => {
    if (!serviceId || !service || !selectedBatch) {
      Alert.alert('Select a batch', 'Please choose a batch to continue.');
      return;
    }
    setBooking(true);
    try {
      const response = await orderService.createServiceOrder(serviceId, {
        batchId: selectedBatch.id,
      });
      await initiateServicePayment(
        {
          key: response.key,
          amount: response.amount,
          orderId: response.orderId,
        },
        service.name,
        selectedBatch.name,
        {
          successMessage: 'Booking successful!',
          onSuccess: () => {
            router.replace('/(student)/my-orders' as any);
          },
        }
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create booking. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const basePrice = service?.price != null ? Number(service.price) : 0;
  const batchPrice = selectedBatch?.price != null ? Number(selectedBatch.price) : basePrice;
  const totalAmount = selectedBatch ? batchPrice : basePrice;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading service…</Text>
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.errorTitle}>Unable to load</Text>
        <Text style={styles.errorSubtitle}>{error ?? 'Service not found.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Service header: title, rating, availability, favourite, share */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.serviceTitle} numberOfLines={2}>
            {service.name}
          </Text>
          <View style={styles.iconRow}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setIsFavourite((f) => !f)}
              hitSlop={8}
            >
              <Ionicons
                name={isFavourite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavourite ? '#DC2626' : Colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleShare} hitSlop={8}>
              <Ionicons name="share-outline" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.ratingWrap}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.ratingText}>4.8 (127 reviews)</Text>
          </View>
          <View style={styles.dot} />
          <Text style={styles.availableText}>Available</Text>
        </View>
      </View>

      {/* Choose Your Batch */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose Your Batch</Text>
        <Text style={styles.sectionSubtitle}>
          Select from {batches.length} available batch{batches.length !== 1 ? 'es' : ''}
        </Text>
        {batches.length === 0 ? (
          <Text style={styles.noBatches}>No batches available at the moment.</Text>
        ) : (
          batches.map((batch) => {
            const isSelected = selectedBatch?.id === batch.id;
            return (
              <TouchableOpacity
                key={batch.id}
                style={[styles.batchCard, isSelected && styles.batchCardSelected]}
                onPress={() => setSelectedBatch(batch)}
                activeOpacity={0.8}
              >
                <View style={styles.batchCardHeader}>
                  <Text style={styles.batchName}>{batch.name}</Text>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    </View>
                  )}
                </View>
                <View style={styles.batchMeta}>
                  <View style={styles.batchMetaRow}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.batchMetaText}>{formatDays(batch.daysOfWeek)}</Text>
                  </View>
                  <View style={styles.batchMetaRow}>
                    <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.batchMetaText}>
                      {formatTimeRange(batch.startTime, batch.endTime)}
                    </Text>
                  </View>
                  <View style={styles.batchMetaRow}>
                    <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.batchMetaText}>
                      {batch.ageGroup ? `Age: ${batch.ageGroup}` : ''}
                      {batch.ageGroup && batch.capacity != null ? ' • ' : ''}
                      {batch.capacity != null ? `Seats: ${batch.capacity}` : ''}
                      {!batch.ageGroup && batch.capacity == null ? '—' : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.batchPriceRow}>
                  <Text style={styles.batchPriceLabel}>Batch Price</Text>
                  <Text style={styles.batchPriceValue}>{formatPrice(batch.price)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Booking Summary */}
      {selectedBatch && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Summary</Text>
          <Text style={styles.sectionSubtitle}>Review your selection and book now</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>Selected Batch</Text>
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={14} color="#FFF" />
              </View>
            </View>
            <Text style={styles.summaryBatchName}>{selectedBatch.name}</Text>
            <View style={styles.summaryMeta}>
              <View style={styles.batchMetaRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.batchMetaText}>{formatDays(selectedBatch.daysOfWeek)}</Text>
              </View>
              <View style={styles.batchMetaRow}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.batchMetaText}>
                  {formatTimeRange(selectedBatch.startTime, selectedBatch.endTime)}
                </Text>
              </View>
            </View>
            <View style={styles.batchPriceRow}>
              <Text style={styles.batchPriceLabel}>Batch Price</Text>
              <Text style={styles.batchPriceValue}>{formatPrice(selectedBatch.price)}</Text>
            </View>
          </View>
          <View style={styles.pricingCard}>
            <Text style={styles.pricingTitle}>Pricing Details</Text>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Service Base Price</Text>
              <Text style={styles.pricingValue}>{formatPrice(service.price)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Selected Batch</Text>
              <Text style={styles.pricingValue}>{formatPrice(selectedBatch.price)}</Text>
            </View>
            <View style={styles.pricingDivider} />
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabelBold}>Total Amount</Text>
              <Text style={styles.pricingTotal}>{formatPrice(totalAmount)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Book Now button */}
      <TouchableOpacity
        style={[styles.bookBtn, (!selectedBatch || booking) && styles.bookBtnDisabled]}
        onPress={handleBookNow}
        disabled={!selectedBatch || booking}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#2563EB', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bookBtnGradient}
        >
          {booking ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="cart-outline" size={22} color="#FFF" />
              <Text style={styles.bookBtnText}>Book Now</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.textSecondary },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 12 },
  errorSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  retryBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Colors.primary, borderRadius: 10 },
  retryBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },

  header: { marginBottom: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  serviceTitle: { flex: 1, fontSize: 24, fontWeight: '700', color: Colors.text },
  iconRow: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.textLight, marginHorizontal: 8 },
  availableText: { fontSize: 14, fontWeight: '600', color: Colors.success },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  sectionSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 14 },
  noBatches: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic' },

  batchCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  batchCardSelected: { borderColor: Colors.primary, backgroundColor: '#EFF6FF' },
  batchCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  batchName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  checkBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },
  batchMeta: { gap: 6 },
  batchMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  batchMetaText: { fontSize: 14, color: Colors.textSecondary },
  batchPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  batchPriceLabel: { fontSize: 13, color: Colors.textSecondary },
  batchPriceValue: { fontSize: 18, fontWeight: '700', color: Colors.success },

  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  summaryCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  summaryCardTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  summaryBatchName: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  summaryMeta: { gap: 4 },

  pricingCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pricingTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pricingLabel: { fontSize: 14, color: Colors.textSecondary },
  pricingValue: { fontSize: 14, color: Colors.text },
  pricingDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  pricingLabelBold: { fontSize: 15, fontWeight: '700', color: Colors.text },
  pricingTotal: { fontSize: 18, fontWeight: '700', color: Colors.success },

  bookBtn: { overflow: 'hidden', borderRadius: 14, marginTop: 8 },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  bookBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
});
