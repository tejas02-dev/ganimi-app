import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { statsService } from '@/services/stats.service';
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
  const [stats, setStats] = useState<VendorStats>(defaultStats);
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
      const items = await statsService.getStats();
      setStats(parseStats(items));
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

      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="cube-outline" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.cardLabel}>Total Services</Text>
          <Text style={styles.cardValue}>{stats.totalServices}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="people-outline" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.cardLabel}>Total Students</Text>
          <Text style={styles.cardValue}>{stats.totalStudents}</Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.cardLabel}>Total Bookings</Text>
          <Text style={styles.cardValue}>{stats.totalBookings}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="checkmark-circle-outline" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.cardLabel}>Active Bookings</Text>
          <Text style={styles.cardValue}>{stats.activeBookings}</Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="layers-outline" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.cardLabel}>Total Batches</Text>
          <Text style={styles.cardValue}>{stats.totalBatches}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="cash-outline" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.cardLabel}>Total Revenue</Text>
          <Text style={styles.cardValue}>{formatCurrency(stats.totalRevenue)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <View style={styles.actionChip}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.actionText}>Create Service</Text>
          </View>
          <View style={styles.actionChip}>
            <Ionicons name="videocam-outline" size={18} color={Colors.primary} />
            <Text style={styles.actionText}>Start Live</Text>
          </View>
          <View style={styles.actionChip}>
            <Ionicons name="book-outline" size={18} color={Colors.primary} />
            <Text style={styles.actionText}>Add Content</Text>
          </View>
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
    padding: 16,
    paddingTop: 40,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    marginBottom: 8,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  section: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
  },
  actionText: {
    marginLeft: 6,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
});

