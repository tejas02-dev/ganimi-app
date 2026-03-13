import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { Typography } from '@/constants/typography';

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

const getCategoryGradient = (color?: string): [string, string] => {
  const key = (color || '').toLowerCase();
  return CATEGORY_GRADIENTS[key] ?? ['#60A5FA', '#2563EB'];
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

  return (
    <View style={styles.container}>
      {isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
      
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Featured Categories */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Featured Categories</Text>
            {categories.length > 3 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {}}
              >
                <Text style={styles.sectionAction}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredRow}
          >
            {categories.slice(0, 3).map((item) => {
              const [from, to] = getCategoryGradient(item.color);
              const serviceCount = item.serviceCount ?? 0;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  style={styles.featuredCardWrapper}
                  onPress={() =>
                    router.push({
                      pathname: '/(student)/category/[categoryId]' as any,
                      params: { categoryId: item.id },
                    })
                  }
                >
                  <LinearGradient
                    colors={[from, to]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.featuredCard}
                  >
                    <View style={styles.featuredTopRow}>
                      <View style={styles.featuredIconPill}>
                        <Ionicons name="layers-outline" size={20} color="#FFFFFF" />
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="rgba(248,250,252,0.9)"
                      />
                    </View>
                    <View style={styles.featuredTextBlock}>
                      <Text style={styles.featuredTitle} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.featuredMeta} numberOfLines={1}>
                        {serviceCount} {serviceCount === 1 ? 'Course' : 'Courses'}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Browse All */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Browse All</Text>
          </View>

          {categories.length === 0 && !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No categories found</Text>
              <Text style={styles.emptySubtitle}>Please check back later.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {categories.map((item) => {
                const [from] = getCategoryGradient(item.color);
                const serviceCount = item.serviceCount ?? 0;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.gridCard}
                    activeOpacity={0.9}
                    onPress={() =>
                      router.push({
                        pathname: '/(student)/category/[categoryId]' as any,
                        params: { categoryId: item.id },
                      })
                    }
                  >
                    <View style={[styles.gridIconCircle, { backgroundColor: from }]}>
                      <Ionicons name="musical-notes-outline" size={20} color="#FFFFFF" />
                    </View>
                    <Text style={styles.gridTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.gridMeta} numberOfLines={1}>
                      {serviceCount} {serviceCount === 1 ? 'Course' : 'Courses'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  headerRow: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  subtitle: {
    marginBottom: 12,
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  errorText: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
    color: Colors.error,
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  sectionAction: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.link,
  },
  featuredRow: {
    marginHorizontal:16,
    paddingBottom: 12,
    paddingRight: 16,
  },
  featuredCardWrapper: {
    marginRight: 12, 
  },
  featuredCard: {
    width: 260,
    height: 150,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
  },
  featuredTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredIconPill: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredTextBlock: {
    marginTop: 12,
  },
  featuredTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featuredMeta: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: 'rgba(241,245,249,0.9)',
  },
  emptyState: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.regular,
  },
  grid: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  gridCard: {
    width: '47%',
    borderRadius: 18,
    padding: 14,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  gridIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  gridMeta: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
});

