import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { serviceService } from '@/services/service.service';
import type { StudentOrder } from '@/types/service';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Typography } from '@/constants/typography';

export default function StudentMyOrdersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<StudentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    if (!user?.id) {
      setError('User not found');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      if (!isRefreshing) setIsLoading(true);
      const response = await serviceService.getStudentOrders(user.id);
      setOrders(response.data || []);
    } catch (e: any) {
      console.error('Failed to load student orders', e);
      setError(e?.message || 'Unable to load orders. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadOrders();
  };

  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, o) => {
    const numericAmount =
      typeof o.amount === 'number'
        ? o.amount
        : Number.parseFloat((o.amount as unknown as string) || '0');
    if (Number.isNaN(numericAmount)) return sum;
    return sum + numericAmount;
  }, 0);
  const activeOrders = orders.filter((o) => {
    const s = (o.status || '').toLowerCase();
    return s === 'active' || s === 'ongoing' || s === 'pending';
  }).length;
  const completedOrders = orders.filter((o) => {
    const s = (o.status || '').toLowerCase();
    return s === 'completed' || s === 'confirmed';
  }).length;

  const formatOrderId = (id: string) => (id.startsWith('#') ? id : `#${id}`);
  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'completed') return { pill: styles.statusPillCompleted, text: styles.statusTextCompleted };
    if (s === 'pending') return { pill: styles.statusPillPending, text: styles.statusTextPending };
    return { pill: styles.statusPillDefault, text: styles.statusTextDefault };
  };

  const renderOrderCard = ({ item }: { item: StudentOrder }) => {
    const statusStyle = getStatusStyle(item.status);
    const amountStr = `₹${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const orderIdLine = `${formatOrderId(item.orderId)} • ${item.orderType}`;

    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardThumbnail}>
            <Ionicons name="cube-outline" size={28} color={Colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardMetaRow}>
              <View style={[styles.statusPill, statusStyle.pill]}>
                <Text style={[styles.statusPillText, statusStyle.text]}>
                  {(item.status || 'Order').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.cardPrice}>{amountStr}</Text>
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.categoryName || 'Service Order'}
            </Text>
            <Text style={styles.cardOrderId}>{orderIdLine}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.cardBtnOutline} activeOpacity={0.8}>
            <Ionicons name="download-outline" size={18} color={Colors.text} />
            <Text style={styles.cardBtnOutlineText}>Invoice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardBtnPrimary}
            activeOpacity={0.8}
            onPress={() => {}}
          >
            <Text style={styles.cardBtnPrimaryText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      

      {/* Stat cards */}
      <View style={styles.overviewRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL SPENT</Text>
          <Text style={[styles.statValue, styles.statValuePurple]}>
            ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>ACTIVE</Text>
          <Text style={[styles.statValue, styles.statValueOrange]}>
            {activeOrders} Order{activeOrders !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>COMPLETED</Text>
          <Text style={[styles.statValue, styles.statValueGreen]}>
            {completedOrders} Order{completedOrders !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={orders}
        keyExtractor={(item) => item.orderId}
        renderItem={renderOrderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySubtitle}>
                When you place an order, it will appear here.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
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
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  overviewRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.regular,
    letterSpacing: 0.8,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.extraBold,
  },
  statValuePurple: {
    color: '#7C3AED',
  },
  statValueOrange: {
    color: '#EA580C',
  },
  statValueGreen: {
    color: '#16A34A',
  },
  errorText: {
    paddingHorizontal: 16,
    marginTop: 8,
    fontSize: 13,
    color: Colors.error,
    fontFamily: Typography.fontFamily.regular,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  cardThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary ?? '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusPillCompleted: {
    backgroundColor: '#DCFCE7',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillDefault: {
    backgroundColor: '#E5E7EB',
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.regular,
    letterSpacing: 0.5,
  },
  statusTextCompleted: { color: '#16A34A' },
  statusTextPending: { color: '#B45309' },
  statusTextDefault: { color: Colors.textSecondary },
  cardPrice: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
    marginBottom: 4,
  },
  cardOrderId: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cardBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border ?? '#E5E7EB',
    gap: 6,
  },
  cardBtnOutlineText: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  cardBtnPrimary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  cardBtnPrimaryText: {
    fontSize: 14,
    color: '#FFF',
    fontFamily: Typography.fontFamily.semiBold,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.regular,
  },
});

