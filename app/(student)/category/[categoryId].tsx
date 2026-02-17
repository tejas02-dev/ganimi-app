import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { categoryService } from '@/services/category.service';
import { serviceService } from '@/services/service.service';
import { orderService } from '@/services/order.service';
import { initiateCategoryPayment } from '@/services/razorpay.service';
import type { Category } from '@/types/category';
import type { CategoryService } from '@/types/service';

type Params = {
  categoryId: string;
};

export const options = {
  href: null,
};

export default function CategoryServicesScreen() {
  const { categoryId } = useLocalSearchParams<Params>();
  const router = useRouter();

  const [category, setCategory] = useState<Category | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [services, setServices] = useState<CategoryService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const loadData = useCallback(async () => {
    if (!categoryId) return;
    try {
      setError(null);
      const [accessRes, categoryRes, servicesRes] = await Promise.all([
        categoryService.checkStudentCategoryAccess(categoryId),
        categoryService.getCategoryById(categoryId).catch(() => null),
        serviceService.getServicesByCategory(categoryId).catch(() => []),
      ]);
      setHasAccess(accessRes);
      setCategory(categoryRes ?? null);
      setServices(Array.isArray(servicesRes) ? servicesRes : []);
    } catch (e: any) {
      console.error('Failed to load category data', e);
      setError(e?.message ?? 'Unable to load category. Please try again.');
      setHasAccess(false);
      setCategory(null);
      setServices([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [categoryId]);

  useEffect(() => {
    if (!categoryId) return;
    setIsLoading(true);
    loadData();
  }, [categoryId, loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleSeeDetails = (service: CategoryService) => {
    router.push({
      pathname: '/(student)/service/[serviceId]/book' as any,
      params: { serviceId: service.id },
    });
  };

  const formatPrice = (price?: number) => {
    if (price == null) return null;
    return `₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const serviceCount = services.length;
  const vendorCount = React.useMemo(() => {
    const ids = new Set<string>();
    services.forEach((s) => {
      if (s.vendorId) ids.add(s.vendorId);
      else if (s.vendorName) ids.add(s.vendorName);
    });
    return ids.size;
  }, [services]);

  const handleUpgradeToPremium = async () => {
    if (!categoryId || !category) return;
    const price = category.price ?? 500;
    setIsPurchasing(true);
    try {
      const response = await orderService.createCategoryOrder({
        orderItems: [{ categoryId, title: category.name, price }],
      });
      await initiateCategoryPayment(
        {
          key: response.key,
          amount: response.amount,
          orderId: response.orderId,
          categories: category.name,
        },
        {
          successMessage: 'Subscribed to category successfully!',
          onSuccess: () => {
            loadData();
          },
        }
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create order. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSeeWhyPremium = () => {
    Alert.alert('Premium Benefits', 'Unlock full access to all services, book without restrictions, and enjoy premium support.');
  };

  const renderServiceCard = ({ item }: { item: CategoryService }) => {
    const initial = (item.name || 'S').charAt(0).toUpperCase();
    const priceStr = formatPrice(item.price);

    return (
      <View style={styles.serviceCard}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.cardTitleCol}>
            <Text style={styles.serviceTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#FACC15" />
              <Ionicons name="star" size={12} color="#FACC15" />
              <Ionicons name="star" size={12} color="#FACC15" />
              <Ionicons name="star" size={12} color="#FACC15" />
              <Ionicons name="star-half" size={12} color="#FACC15" />
              <Text style={styles.ratingText}>4.8</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.favoriteBtn}>
            <Ionicons name="heart-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {item.description ? (
          <Text style={styles.serviceDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceText}>{priceStr ?? '—'}</Text>
            <Text style={styles.priceUnit}>per session</Text>
          </View>
          <View style={styles.availabilityCol}>
            <Text style={styles.availabilityLabel}>Available</Text>
            <Text style={styles.availabilityValue}>Today</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.seeDetailsBtn}
            onPress={() => handleSeeDetails(item)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#2563EB', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.seeDetailsGradient}
            >
              <Text style={styles.seeDetailsText}>See Details</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.arrowBtn}
            onPress={() => handleSeeDetails(item)}
          >
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const categoryPrice = category?.price ?? 500;
  const premiumPriceStr = `₹ ${Number(categoryPrice).toLocaleString('en-IN')}`;

  const ListHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.categoryTitle}>{category?.name ?? 'Services'}</Text>
        <Text style={styles.categoryDesc}>
          Discover amazing services in this category
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="cube-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {serviceCount} {serviceCount === 1 ? 'service' : 'services'} available
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {vendorCount > 0 ? `${vendorCount}+ providers` : '— providers'}
            </Text>
          </View>
        </View>
      </View>

      {hasAccess === false && (
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Upgrade to Premium for Full Access</Text>
          <Text style={styles.upgradeDesc}>
            You currently have limited access to this category. Go premium to unlock premium benefits and book without restrictions.
          </Text>
          <View style={styles.servicesContinueRow}>
            <Text style={styles.servicesContinueText}>Services continue below</Text>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
          </View>
          <Text style={styles.upgradePrice}>{premiumPriceStr}</Text>
          <TouchableOpacity style={styles.upgradeBtnSecondary} onPress={handleSeeWhyPremium}>
            <Text style={styles.upgradeBtnSecondaryText}>See why premium</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.upgradeBtnPrimary, isPurchasing && styles.upgradeBtnDisabled]}
            onPress={handleUpgradeToPremium}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="cart-outline" size={18} color="#FFF" />
                <Text style={styles.upgradeBtnPrimaryText}>Upgrade to Premium</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.upgradeBtnSecondary}
            onPress={() => router.push('/(student)/browse-categories' as any)}
          >
            <Text style={styles.upgradeBtnSecondaryText}>Explore Other Categories</Text>
          </TouchableOpacity>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </>
  );

  const ListFooter = () =>
    services.length > 0 ? (
      <Text style={styles.resultsFooter}>
        Showing {serviceCount} of {serviceCount} results
      </Text>
    ) : null;

  return (
    <View style={styles.container}>
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={renderServiceCard}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={56} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>No services yet</Text>
              <Text style={styles.emptySubtitle}>
                There are no services in this category right now.
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
    fontSize: 14,
    color: Colors.textSecondary,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  categoryDesc: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  upgradeCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FEFCE8',
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  upgradeDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 12,
  },
  servicesContinueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  servicesContinueText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  upgradePrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#EA580C',
    marginBottom: 14,
  },
  upgradeBtnSecondary: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  upgradeBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  upgradeBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  upgradeBtnDisabled: {
    opacity: 0.7,
  },
  upgradeBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  errorText: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
    color: Colors.error,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  resultsFooter: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  serviceCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  cardTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  serviceTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  ratingText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  favoriteBtn: {
    padding: 4,
  },
  serviceDesc: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16A34A',
  },
  priceUnit: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  availabilityCol: {
    alignItems: 'flex-end',
  },
  availabilityLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  availabilityValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  seeDetailsBtn: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 10,
  },
  seeDetailsGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeDetailsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  arrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
