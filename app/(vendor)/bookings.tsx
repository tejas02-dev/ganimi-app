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
import { Typography } from '@/constants/typography';
import { VendorVerificationGate } from '@/components/VendorVerificationGate';
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

function statusBg(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'confirmed') return '#DCFCE7';
  if (s === 'completed') return `${Colors.primary}18`;
  if (s === 'cancelled') return '#FEE2E2';
  if (s === 'pending') return '#FEF9C3';
  return Colors.backgroundSecondary;
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
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
      <VendorVerificationGate>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      </VendorVerificationGate>
    );
  }

  if (error) {
    return (
      <VendorVerificationGate>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBookings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </VendorVerificationGate>
    );
  }

  return (
    <VendorVerificationGate>
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
              {/* Student row */}
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(item.studentName)}</Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {item.studentName?.trim() || '—'}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.ratingText}>Student</Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusBg(item.status) }]}>
                  <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                    {(item.status || '—').toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Service name */}
              {item.serviceName ? (
                <Text style={styles.serviceName} numberOfLines={1}>
                  {item.serviceName.toUpperCase()}
                </Text>
              ) : null}

              {/* Date + Time */}
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>
                  {formatBookingDate(item.bookingDate)}
                  {formatBookingTime(item.bookingDate) ? ` • ${formatBookingTime(item.bookingDate)}` : ''}
                </Text>
              </View>

              {/* Price */}
              {item.servicePrice != null && item.servicePrice !== '' ? (
                <View style={styles.metaRow}>
                  <Ionicons name="card-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.priceText}>₹{item.servicePrice}</Text>
                </View>
              ) : null}

              {/* Notes box */}
              {item.notes != null && item.notes !== '' ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>STUDENT NOTES</Text>
                  <Text style={styles.notesText}>"{item.notes}"</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
    </VendorVerificationGate>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    paddingBottom: 32,
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
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Colors.primary,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#FFF',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  list: {
    gap: 12,
  },
  // Card
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.3,
  },
  serviceName: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text,
  },
  priceText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  notesBox: {
    marginTop: 10,
    backgroundColor: `${Colors.primary}0D`,
    borderLeftWidth: 3,
    borderLeftColor: `${Colors.primary}60`,
    borderRadius: 8,
    padding: 12,
  },
  notesLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
