import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { bookingService, type MyBookingItem } from '@/services/booking.service';

function formatBookingDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatBookingTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function statusColor(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'confirmed') return '#16A34A';
  if (s === 'completed') return Colors.primary;
  if (s === 'cancelled') return Colors.error;
  if (s === 'pending') return Colors.warning;
  return Colors.textSecondary;
}

export default function VendorBookingsScreen() {
  const [bookings, setBookings] = useState<MyBookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    try {
      setError(null);
      const res = await bookingService.getMyBookings();
      console.log('res', res);
      const list = (res as any).data ?? res?.data ?? [];
      setBookings(Array.isArray(list) ? list : []);
    } catch (e: any) {
      console.error('[VendorBookings] Failed to load bookings', e);
      setError(e?.message || 'Unable to load bookings. Please try again.');
      setBookings([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadBookings();
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBookings}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>
          View and manage your upcoming and past bookings.
        </Text>
      </View>

      {bookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={56} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptySubtitle}>
            Bookings from students will appear here when they enroll or book your services.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {bookings.map((item) => (
            <View key={item.bookingId} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>Booking details</Text>
                <View style={[styles.statusPill, { backgroundColor: `${statusColor(item.status)}18` }]}>
                  <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                    {item.status || '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailLabel}>Student</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {item.studentName?.trim() || '—'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="cube-outline" size={16} color={Colors.primary} />
                <Text style={styles.detailLabel}>Service</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {item.serviceName ?? '—'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailLabel}>Date & time</Text>
                <Text style={styles.detailValue}>
                  {formatBookingDate(item.bookingDate)}
                  {formatBookingTime(item.bookingDate) ? ` · ${formatBookingTime(item.bookingDate)}` : ''}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailLabel}>Price</Text>
                <Text style={styles.priceHighlight}>
                  {item.servicePrice != null && item.servicePrice !== '' ? `₹${item.servicePrice}` : '—'}
                </Text>
              </View>

              {item.notes != null && item.notes !== '' ? (
                <View style={styles.detailRow}>
                  <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailLabel}>Notes</Text>
                  <Text style={styles.detailValue} numberOfLines={3}>
                    {item.notes}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: Colors.backgroundSecondary,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    width: 72,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  priceHighlight: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
});
