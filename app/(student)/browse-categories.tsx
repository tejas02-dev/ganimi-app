import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { categoryService } from '@/services/category.service';
import type { StudentCategory } from '@/types/category';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  cyan: ['#22D3EE', '#0EA5E9'],
  blue: ['#60A5FA', '#2563EB'],
  green: ['#4ADE80', '#16A34A'],
  emerald: ['#34D399', '#059669'],
  indigo: ['#818CF8', '#4F46E5'],
  purple: ['#C4B5FD', '#8B5CF6'],
  pink: ['#F9A8D4', '#EC4899'],
  orange: ['#FDBA74', '#F97316'],
  amber: ['#FACC15', '#D97706'],
};

export default function BrowseCategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<StudentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setError(null);
      if (!isRefreshing) setIsLoading(true);
      const data = await categoryService.getStudentCategories();
      setCategories(data || []);
    } catch (e: any) {
      console.error('Failed to load student categories', e);
      setError(e?.message || 'Unable to load categories. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCategories();
  };

  const renderCategoryCard = ({ item }: { item: StudentCategory }) => {
    const enrolled = item.enrolled ?? 0;
    const serviceCount = item.serviceCount ?? 0;
    const colorKey = (item.color || '').toLowerCase();
    const gradientColors =
      CATEGORY_GRADIENTS[colorKey] ?? ['#22D3EE', '#0EA5E9'];

    return (
      <View style={styles.cardWrapper}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleCol}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              {item.description ? (
                <Text style={styles.cardSubtitle} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.statsRow}>
            <Text style={styles.statsText}>
              {serviceCount} {serviceCount === 1 ? 'Service' : 'Services'}
            </Text>
            <Text style={styles.statsDot}>•</Text>
            <Text style={styles.statsText}>
              {enrolled > 0
                ? `${enrolled} Student${enrolled > 1 ? 's' : ''} Enrolled`
                : '0 Students Enrolled'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.9}
            onPress={() =>
              router.push({
                pathname: '/(student)/category/[categoryId]' as any,
                params: { categoryId: item.id },
              })
            }
          >
            <Ionicons name="eye-outline" size={16} color="#FFF" />
            <Text style={styles.primaryButtonText}>View</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Service Categories</Text>
        <Text style={styles.subtitle}>Discover services by category</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategoryCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No categories found</Text>
              <Text style={styles.emptySubtitle}>Please check back later.</Text>
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
    marginBottom: 4,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorText: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
    color: Colors.error,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  cardWrapper: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 16,
    padding: 16,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#F9FAFB',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  statsText: {
    fontSize: 13,
    color: '#F9FAFB',
    fontWeight: '500',
  },
  statsDot: {
    marginHorizontal: 6,
    color: '#E5E7EB',
  },
  primaryButton: {
    marginTop: 4,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 6,
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

