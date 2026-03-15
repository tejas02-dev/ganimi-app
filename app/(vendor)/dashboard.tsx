import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { statsService } from '@/services/stats.service';
import { bookingService, type MyBookingItem } from '@/services/booking.service';
import type { StatItem } from '@/services/stats.service';

type VendorStats = {
  totalServices: number;
  totalBatches: number;
  totalBookings: number;
  activeBookings: number;
  totalStudents: number;
  totalOrders: number;
  totalRevenue: number;
};

const RECENT_BOOKINGS_LIMIT = 5;

function getRelativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return diffMins <= 1 ? 'JUST NOW' : `${diffMins}M AGO`;
    if (diffHours < 24) return `${diffHours}H AGO`;
    if (diffDays === 1) return 'YESTERDAY';
    if (diffDays < 7) return `${diffDays}D AGO`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

function formatBookingPrice(price: string | null | undefined): string {
  if (price == null || price === '') return '—';
  const n = parseFloat(price);
  if (Number.isNaN(n)) return price;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const defaultStats: VendorStats = {
  totalServices: 0,
  totalBatches: 0,
  totalBookings: 0,
  activeBookings: 0,
  totalStudents: 0,
  totalOrders: 0,
  totalRevenue: 0,
};

export default function VendorDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<VendorStats>(defaultStats);
  const [recentBookings, setRecentBookings] = useState<MyBookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const parseStats = (items: StatItem[]): VendorStats => {
    const map = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.name] = item.value ?? 0;
      return acc;
    }, {});

    return {
      totalServices: map.totalServices ?? 0,
      totalBatches: map.totalBatches ?? 0,
      totalBookings: map.totalBookings ?? 0,
      activeBookings: map.activeBookings ?? 0,
      totalStudents: map.totalStudents ?? 0,
      totalOrders: map.totalOrders ?? 0,
      totalRevenue: map.totalRevenue ?? 0,
    };
  };

  const loadStats = async () => {
    setError(null);
    if (!isRefreshing) setIsLoading(true);

    try {
      const [items, bookingsRes] = await Promise.all([
        statsService.getStats(),
        bookingService.getMyBookings().catch(() => ({ data: [] })),
      ]);
      setStats(parseStats(items));
      const list = (bookingsRes as any).data ?? bookingsRes?.data ?? [];
      setRecentBookings(Array.isArray(list) ? list.slice(0, RECENT_BOOKINGS_LIMIT) : []);
    } catch (e: any) {
      console.error('Failed to load stats', e);
      setError(e?.message || 'Unable to load stats. Please pull to refresh.');
      setStats(defaultStats);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadStats();
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <Text style={styles.heading}>Welcome back, {user?.name ?? 'Vendor'} 👋</Text>
      <Text style={styles.subheading}>Here&apos;s what&apos;s happening with your services today.</Text>

      {isLoading && !isRefreshing ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your stats…</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.statsTopRow}>
        <View style={styles.statCard}>
          <Text style={styles.statTrendPositive}>+12%</Text>
          <View style={styles.statCardIconWrap}>
            <Ionicons name="people" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.statLabel}>STUDENTS</Text>
          <Text style={styles.statValue}>{stats.totalStudents}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statTrendStable}>Stable</Text>
          <View style={styles.statCardIconWrap}>
            <Ionicons name="barbell" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.statLabel}>SERVICES</Text>
          <Text style={styles.statValue}>{stats.totalServices}</Text>
        </View>
      </View>

      <View style={styles.statCardRevenue}>
        <Text style={styles.statTrendRevenue}>+8%</Text>
        <View style={styles.statCardIconWrapRevenue}>
          <Ionicons name="cash" size={24} color="#FFF" />
        </View>
        <Text style={styles.statLabelRevenue}>REVENUE</Text>
        <Text style={styles.statValueRevenue}>{formatCurrency(stats.totalRevenue)}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          <TouchableOpacity onPress={() => router.push('/(vendor)/bookings' as any)} hitSlop={8}>
            <Text style={styles.seeAllLink}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bookingsCard}>
          {recentBookings.length === 0 ? (
            <Text style={styles.bookingsEmpty}>No recent bookings</Text>
          ) : (
            recentBookings.map((b, i) => (
              <View key={b.bookingId ?? i} style={[styles.bookingRow, i < recentBookings.length - 1 && styles.bookingRowBorder]}>
                <View style={styles.bookingAvatar}>
                  <Text style={styles.bookingAvatarText}>
                    {(b.studentName ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingName} numberOfLines={1}>{b.studentName ?? '—'}</Text>
                  <Text style={styles.bookingService} numberOfLines={1}>{b.serviceName ?? '—'}</Text>
                </View>
                <View style={styles.bookingRight}>
                  <Text style={styles.bookingPrice}>{formatBookingPrice(b.servicePrice)}</Text>
                  <Text style={styles.bookingTime}>{getRelativeTime(b.bookingDate)}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  content: {
    padding: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.error,
    marginBottom: 8,
  },
  heading: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
  },
  subheading: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  statsTopRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statTrendPositive: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#22C55E',
  },
  statTrendStable: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  statCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EDECFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 24,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  statCardRevenue: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statTrendRevenue: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#FFF',
  },
  statCardIconWrapRevenue: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabelRevenue: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#FFF',
    letterSpacing: 0.5,
    opacity: 0.95,
  },
  statValueRevenue: {
    fontSize: 24,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFF',
  },
  section: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  seeAllLink: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.link,
  },
  bookingsCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bookingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookingAvatarText: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFF',
  },
  bookingInfo: {
    flex: 1,
    marginRight: 12,
  },
  bookingName: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  bookingService: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  bookingRight: {
    alignItems: 'flex-end',
  },
  bookingPrice: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  bookingTime: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  bookingsEmpty: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
});

