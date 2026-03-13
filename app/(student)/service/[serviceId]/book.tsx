import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { serviceService } from '@/services/service.service';
import { categoryService } from '@/services/category.service';
import { batchService, type ServiceBatch } from '@/services/batch.service';
import { orderService } from '@/services/order.service';
import { initiateServicePayment } from '@/services/razorpay.service';
import type { VendorService } from '@/types/service';
import { Typography } from '@/constants/typography';

type Params = { serviceId: string; fromCategoryId?: string };

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
  const { serviceId, fromCategoryId } = useLocalSearchParams<Params>();
  const router = useRouter();
  const [service, setService] = useState<VendorService | null>(null);
  const [batches, setBatches] = useState<ServiceBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ServiceBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFavourite, setIsFavourite] = useState(false);
  const [hasCategoryAccess, setHasCategoryAccess] = useState<boolean | null>(null);

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

  // If we know the category, check whether the student has access to it
  useEffect(() => {
    let isMounted = true;
    const checkAccess = async () => {
      if (!fromCategoryId) {
        setHasCategoryAccess(null);
        return;
      }
      try {
        const access = await categoryService.checkStudentCategoryAccess(fromCategoryId);
        if (isMounted) {
          setHasCategoryAccess(access);
        }
      } catch {
        if (isMounted) {
          setHasCategoryAccess(false);
        }
      }
    };
    checkAccess();
    return () => {
      isMounted = false;
    };
  }, [fromCategoryId]);

  // If we know which category we came from, override Android back to return there
  useFocusEffect(
    useCallback(() => {
      if (!fromCategoryId) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.replace({
          pathname: '/(student)/category/[categoryId]' as any,
          params: { categoryId: fromCategoryId },
        } as any);
        return true;
      });
      return () => sub.remove();
    }, [fromCategoryId, router])
  );

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
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      {/* Top card with image placeholder + title + chips */}
      <View style={styles.heroCard}>
        <View style={styles.heroImage}>
          <Ionicons
            name="image"
            size={32}
            color={Colors.primary}
            style={styles.heroImageIcon}
          />
        </View>
      </View>
      <View style={styles.heroContent}>
          <View style={styles.heroTitleRow}>
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
                  size={22}
                  color={isFavourite ? '#DC2626' : Colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handleShare} hitSlop={8}>
                <Ionicons name="share-outline" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.chipRow}>
            <View style={styles.ratingChip}>
              <Ionicons name="star" size={14} color={Colors.warning} />
              <Text style={styles.ratingChipText}>4.8 (120 reviews)</Text>
            </View>
          </View>
        </View>

      <View style={styles.spacer}></View>
    
      {/* Choose Your Batch */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Select a Batch</Text>
          <Text style={styles.sectionHint}>AVAILABLE BATCHES</Text>
        </View>
        {batches.length === 0 ? (
          <Text style={styles.noBatches}>No batches available at the moment.</Text>
        ) : (
          batches.map((batch) => {
            const isSelected = selectedBatch?.id === batch.id;
            const capacity = batch.capacity ?? undefined;
            let availabilityText = 'Batch availability not specified';
            if (capacity === 0) {
              availabilityText = 'Batch full';
            } else if (capacity === 1) {
              availabilityText = 'Only 1 slot left!';
            } else if (typeof capacity === 'number') {
              availabilityText = `${capacity} slots remaining`;
            }

            return (
              <TouchableOpacity
                key={batch.id}
                style={[styles.batchCard, isSelected && styles.batchCardSelected]}
                onPress={() => setSelectedBatch(batch)}
                activeOpacity={0.8}
              >
                <View style={styles.batchCardHeader}>
                  <View>
                    <Text style={[styles.batchDays, isSelected && styles.batchDaysSelected]}>
                      {formatDays(batch.daysOfWeek)}
                    </Text>
                    <Text style={styles.batchTime}>
                      {formatTimeRange(batch.startTime, batch.endTime)}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    </View>
                  )}
                </View>
                <View style={styles.batchMetaRow}>
                  <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.batchMetaText}>{availabilityText}</Text>
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

     
      {/* spacer so content isn't hidden behind footer */}
      <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky bottom price + Book button */}
      {batches.length > 0 && (
        <View style={styles.footerBar}>
          <View>
            <Text style={styles.footerLabel}>Total Price</Text>
            {selectedBatch ? (
              <Text style={styles.footerPrice}>{formatPrice(totalAmount)}</Text>
            ) : (
              <Text style={styles.footerHint}>Select a batch to see price</Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.footerButton,
              ((!selectedBatch || booking) || hasCategoryAccess === false) && styles.footerButtonDisabled,
            ]}
            onPress={handleBookNow}
            disabled={!selectedBatch || booking || hasCategoryAccess === false}
            activeOpacity={0.9}
          >
            {booking ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.footerButtonText}>Book Now</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  spacer: { borderBottomWidth: 1, borderColor: Colors.border, height: 8 },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 16 },
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

  heroCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  heroImage: {
    height: 150,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageIcon: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    padding: 14,
  },
  heroContent: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  serviceTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
  },
  iconRow: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 4 },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  ratingChipText: {
    top:-1,
    marginLeft: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  categoryChipText: {
    marginLeft: 6,
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },

  section: { marginBottom: 16, marginTop: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontFamily: Typography.fontFamily.extraBold, color: Colors.text },
  sectionHint: {
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  noBatches: { fontSize: 14, fontFamily: Typography.fontFamily.semiBold, color: Colors.textSecondary },

  batchCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  batchCardSelected: { borderColor: Colors.primary, backgroundColor: '#EEF2FF' },
  batchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  batchDays: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
  },
  batchDaysSelected: {
    color: Colors.primary,
  },
  batchTime: {
    marginTop: 4,
    fontSize: 18,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
  },
  checkBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  batchMeta: { gap: 6 },
  batchMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  batchMetaText: { fontSize: 14, fontFamily: Typography.fontFamily.semiBold, color: Colors.textSecondary },
  batchPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  batchPriceLabel: { fontSize: 13, fontFamily: Typography.fontFamily.semiBold, color: Colors.textSecondary },
  batchPriceValue: { fontSize: 18, fontFamily: Typography.fontFamily.extraBold, color: Colors.success },
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  footerPrice: {
    fontSize: 20,
    color: Colors.success,
    fontFamily: Typography.fontFamily.extraBold,
  },
  footerHint: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  footerButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  footerButtonDisabled: {
    opacity: 0.6,
  },
  footerButtonText: {
    fontSize: 15,
    color: Colors.white,
    fontFamily: Typography.fontFamily.semiBold,
  },
});
