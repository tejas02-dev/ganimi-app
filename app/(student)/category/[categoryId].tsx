import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { categoryService } from '@/services/category.service';
import { serviceService } from '@/services/service.service';
import { orderService } from '@/services/order.service';
import { initiateCategoryPayment } from '@/services/razorpay.service';
import { Typography } from '@/constants/typography';
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

  // Ensure back (hardware or gesture) goes to Browse Categories, not dashboard
  // useFocusEffect re-registers whenever the screen gains focus (e.g. returning from book page)
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.navigate('/(student)/browse-categories' as any);
        return true;
      });
      return () => sub.remove();
    }, [router])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleSeeDetails = (service: CategoryService) => {
    router.push({
      pathname: '/(student)/service/[serviceId]/book' as any,
      params: { serviceId: service.id, fromCategoryId: categoryId },
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
        {/* Image / media placeholder */}
        <View style={styles.serviceImage}>
        <Ionicons
            name="image"
            size={36}
            color={Colors.primary}
            style={styles.serviceImageIcon}
          />
          <TouchableOpacity style={styles.favoriteBtn}>
              <Ionicons name="heart-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
        </View>

        <View style={styles.serviceContent}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.serviceTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={12} color="#F97316AA" />
                <Text style={styles.ratingPillText}>4.8</Text>
              </View>
            </View>
          </View>

          {item.description ? (
            <Text style={styles.serviceDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.priceRow}>
            <View>
                <Text style={styles.priceLabel}>Starting at</Text>
                <Text style={styles.priceText}>{priceStr ?? '—'}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.seeDetailsBtn}
              onPress={() => handleSeeDetails(item)}
              activeOpacity={0.9}
            >
                <Text style={styles.seeDetailsText}>View details</Text>
            </TouchableOpacity>
          </View>
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
      {/* Featured Category hero */}
      <View style={styles.heroCardWrapper}>
        <LinearGradient
          colors={['#4F46E5', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTagRow}>
            <View style={styles.heroTagPill}>
              <Text style={styles.heroTagText}>FEATURED CATEGORY</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {category?.name ?? 'Category'}
            </Text>
            {category?.description ? (
              <Text style={styles.heroSubtitle} numberOfLines={3}>
                {category.description}
              </Text>
            ) : (
              <Text style={styles.heroSubtitle} numberOfLines={2}>
                Discover holistic sessions and expert-led services in this category.
              </Text>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {}}
            style={styles.heroLinkRow}
          >
            <Ionicons name="sparkles-outline" size={16} color={Colors.link} />
            <Text style={styles.heroLinkText}>
              {serviceCount} {serviceCount === 1 ? 'service' : 'services'} available in this category
            </Text>
          </TouchableOpacity>
      </View>

      {/* Optional premium notice */}
      {hasAccess === false && (
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Unlock all services in this category</Text>
          <Text style={styles.upgradeDesc}>
            Go premium to access every session and book without restrictions.
          </Text>
          <Text style={styles.upgradePrice}>{premiumPriceStr}</Text>
          <TouchableOpacity
            style={[styles.upgradeBtnPrimary, isPurchasing && styles.upgradeBtnDisabled]}
            onPress={handleUpgradeToPremium}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.upgradeBtnPrimaryText}>Upgrade to premium</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Top Rated Services header */}
      <View style={styles.servicesHeaderRow}>
        <Text style={styles.servicesHeaderTitle}>Top rated services</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => {}}>
          <View style={styles.filtersRow}>
            <Text style={styles.filtersText}>Filters</Text>
            <Ionicons name="funnel-outline" size={16} color={Colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>
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
    fontFamily: Typography.fontFamily.regular,
  },
  heroCardWrapper: {
    
  },
  heroCard: {
    height: 150,
    borderRadius: 24,
    padding: 18,
  },
  heroTagRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  heroTagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.18)',
  },
  heroTagText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.6,
    color: '#E5ECFF',
  },
  heroTextBlock: {
    marginTop: 4,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  heroLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLinkText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.link,
  },
  upgradeCard: {
    marginTop: 10,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryLight,
  },
  upgradeTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginBottom: 6,
  },
  upgradeDesc: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  upgradePrice: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
    marginBottom: 10,
  },
  upgradeBtnPrimary: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 14,
  },
  upgradeBtnDisabled: {
    opacity: 0.7,
  },
  upgradeBtnPrimaryText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.white,
    top:-2,
  },
  errorText: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
    color: Colors.error,
    fontFamily: Typography.fontFamily.regular,
  },
  servicesHeaderRow: {
    marginTop: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servicesHeaderTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filtersText: {
    fontSize: 12,
    top:-2,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  resultsFooter: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    marginTop: 8,
  },
  serviceCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  serviceImage: {
    height: 140,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceImageIcon: {
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    padding: 12,
  },
  serviceImageText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  serviceContent: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  serviceTitle: {
    fontSize: 17,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
    marginBottom: 4,
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
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FEF3C7AA',
    gap: 4,
  },
  ratingPillText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#EA580CAA',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingTop: 6,
    paddingBottom: 4,
    paddingHorizontal: 6,
    backgroundColor: Colors.white,
    borderRadius: 12,
    shadowColor: Colors.textSecondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  serviceDesc: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  priceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 100,
  },
  priceLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.textLight,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  priceText: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.success,
  },
  priceUnit: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  seeDetailsBtn: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seeDetailsText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.white,
    textAlign: 'center',
    top: -2,
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
