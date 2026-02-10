import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { serviceService } from '@/services/service.service';
import type { StudentOrder } from '@/types/service';
import { Ionicons } from '@expo/vector-icons';

export default function StudentMyOrdersScreen() {
  const { user } = useAuth();
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
  const activeOrders = orders.filter((o) => o.status === 'active' || o.status === 'ongoing').length;
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;

  const renderOrderCard = ({ item }: { item: StudentOrder }) => (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardTitleCol}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.categoryName || 'Service Order'}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            Order ID: {item.orderId}
          </Text>
        </View>
        <View style={styles.amountPill}>
          <Text style={styles.amountText}>₹{item.amount.toLocaleString()}</Text>
        </View>
      </View>

      {item.vendor?.vendorName ? (
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>
            {item.vendor.vendorName}
          </Text>
        </View>
      ) : null}

      <View style={styles.infoRow}>
        <Ionicons name="pricetag-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.infoText}>{item.orderType}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="ellipse" size={10} color={item.status === 'completed' ? Colors.success : Colors.warning} />
        <Text style={styles.statusText}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>
    </View>
  );

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
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Orders</Text>
        <Text style={styles.subtitle}>Track your orders and payments</Text>
      </View>

      {/* Overview boxes */}
      <View style={styles.overviewRow}>
        <View style={[styles.overviewCard, styles.overviewTotalOrders]}>
          <Text style={styles.overviewLabel}>Total Orders</Text>
          <Text style={styles.overviewValue}>{totalOrders}</Text>
        </View>
        <View style={[styles.overviewCard, styles.overviewTotalSpent]}>
          <Text style={styles.overviewLabel}>Total Spent</Text>
          <Text style={styles.overviewValue}>₹{totalSpent.toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.overviewRow}>
        <View style={[styles.overviewCard, styles.overviewActive]}>
          <Text style={styles.overviewLabel}>Active Orders</Text>
          <Text style={styles.overviewValue}>{activeOrders}</Text>
        </View>
        <View style={[styles.overviewCard, styles.overviewPending]}>
          <Text style={styles.overviewLabel}>Pending Orders</Text>
          <Text style={styles.overviewValue}>{pendingOrders}</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  overviewCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  overviewTotalOrders: {
    backgroundColor: '#DBEAFE',
  },
  overviewTotalSpent: {
    backgroundColor: '#DCFCE7',
  },
  overviewActive: {
    backgroundColor: '#FEF3C7',
  },
  overviewPending: {
    backgroundColor: '#FFEDD5',
  },
  overviewLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  errorText: {
    paddingHorizontal: 16,
    marginTop: 8,
    fontSize: 13,
    color: Colors.error,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitleCol: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  amountPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ECFEFF',
  },
  amountText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  statusText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

