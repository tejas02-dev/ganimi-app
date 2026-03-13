import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Typography } from '@/constants/typography';
import { categoryService } from '@/services/category.service';
import type { StudentCategory } from '@/types/category';

export default function StudentDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<StudentCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const gettingStartedItems: {
    key: 'profile' | 'browse' | 'live';
    title: string;
    subtitle: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    iconColor: string;
    iconStyle?: 'green' | 'purple';
    primary: boolean;
    cta: string;
    onPress: () => void;
  }[] = [
    {
      key: 'profile',
      title: 'Complete Profile',
      subtitle: 'Help mentors understand your learning goals.',
      icon: 'person-circle-outline' as const,
      iconColor: Colors.primary,
      primary: true,
      cta: 'Set up now',
      onPress: () => router.navigate('/(student)/profile' as any),
    },
    {
      key: 'browse',
      title: 'Browse Categories',
      subtitle: 'Explore our wide range of topics.',
      icon: 'compass-outline' as const,
      iconColor: '#16A34A',
      iconStyle: 'green' as const,
      primary: false,
      cta: 'Start exploring',
      onPress: () => router.navigate('/(student)/browse-categories' as any),
    },
    {
      key: 'live',
      title: 'Join Live Session',
      subtitle: 'See upcoming classes and join on time.',
      icon: 'videocam-outline' as const,
      iconColor: '#7C3AED',
      iconStyle: 'purple' as const,
      primary: false,
      cta: 'View sessions',
      onPress: () => router.navigate('/(student)/live' as any),
    },
  ];

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesError(null);
        setIsLoadingCategories(true);
        const data = await categoryService.getStudentCategories();
        console.log('data', data);
        setCategories(data || []);
      } catch (e: any) {
        console.error('Failed to load student categories for dashboard', e);
        setCategories([]);
        setCategoriesError('Unable to load categories.');
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Hi, {user?.name ?? 'Student'} 👋</Text>
      <Text style={styles.subheading}>Ready to continue your learning journey?</Text>

      {/* Getting Started */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Getting Started</Text>
        <Text style={styles.sectionAction}>View all</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gettingStartedRow}
      >
        {gettingStartedItems.map((item) => (
          <View key={item.key} style={styles.gettingCard}>
            <View style={styles.gettingCardContent}>
              <View
                style={[
                  styles.gettingIcon,
                  item.iconStyle === 'green' && styles.gettingIconGreen,
                  item.iconStyle === 'purple' && styles.gettingIconPurple,
                ]}
              >
                <Ionicons name={item.icon} size={20} color={item.iconColor} />
              </View>
              <Text style={styles.gettingTitle}>{item.title}</Text>
              <Text style={styles.gettingSubtitle}>{item.subtitle}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={item.onPress}
              style={item.primary ? styles.gettingButton : styles.gettingButtonSecondary}
            >
              <Text
                style={
                  item.primary ? styles.gettingButtonText : styles.gettingButtonSecondaryText
                }
              >
                {item.cta}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Browse by Category */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Browse by Category</Text>
        <TouchableOpacity onPress={() => router.navigate('/(student)/browse-categories' as any)}>
          <Text style={styles.sectionAction}>View all</Text>
        </TouchableOpacity>
      </View>

      {isLoadingCategories ? (
        <View style={styles.categoriesLoadingRow}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.categoriesLoadingText}>Loading categories...</Text>
        </View>
      ) : categoriesError ? (
        <Text style={styles.categoriesErrorText}>{categoriesError}</Text>
      ) : (
        <View style={styles.categoriesGrid}>
          {categories.slice(0, 7).map((cat) => {
            const colorKey = (cat.color || '').toLowerCase();
            let bgColor = '#EEF2FF';
            let iconColor = Colors.primary;

            switch (colorKey) {
              case 'green':
              case 'emerald':
                bgColor = '#DCFCE7';
                iconColor = '#16A34A';
                break;
              case 'purple':
              case 'indigo':
                bgColor = '#EDE9FE';
                iconColor = '#7C3AED';
                break;
              case 'orange':
              case 'amber':
                bgColor = '#FFEDD5';
                iconColor = '#EA580C';
                break;
              case 'pink':
                bgColor = '#FFE4E6';
                iconColor = '#DB2777';
                break;
              case 'blue':
              case 'cyan':
                bgColor = '#DBEAFE';
                iconColor = '#2563EB';
                break;
              default:
                break;
            }

            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryPill}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: '/(student)/category/[categoryId]' as any,
                    params: { categoryId: cat.id },
                  })
                }
              >
                <View style={[styles.categoryIconCircle, { backgroundColor: bgColor }]}>
                  <Ionicons name="grid" size={20} color={iconColor} />
                </View>
                <Text style={styles.categoryLabel} numberOfLines={1}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.categoryPill}
            activeOpacity={0.8}
            onPress={() => router.navigate('/(student)/browse-categories' as any)}
          >
            <View style={styles.categoryIconCircle}>
              <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
            </View>
            <Text style={styles.categoryLabel}>More</Text>
          </TouchableOpacity>
        </View>
      )}
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
  heading: {
    fontSize: 20,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  subheading: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    fontFamily: Typography.fontFamily.regular,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  sectionAction: {
    fontSize: 13,
    color: Colors.link,
    fontFamily: Typography.fontFamily.semiBold,
  },
  gettingStartedRow: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 12,
  },
  gettingCard: {
    flex: 1,
    width: 220,
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginRight: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  gettingCardContent: {
    flex: 1,
    justifyContent: "flex-start",
  },
  gettingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gettingIconGreen: {
    backgroundColor: '#DCFCE7',
  },
  gettingIconPurple: {
    backgroundColor: '#EDE9FE',
  },
  gettingTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  gettingSubtitle: {
    fontSize: 12,
    letterSpacing: 0.6,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  gettingButton: {
    alignSelf: 'stretch',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  gettingButtonText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#FFFFFF',
    textAlign: 'center',
    top: -1,
  },
  gettingButtonSecondary: {
    alignSelf: 'stretch',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  gettingButtonSecondaryText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primary,
    textAlign: 'center',
    top: -1,
  },
  categoriesLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  categoriesLoadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  categoriesErrorText: {
    fontSize: 13,
    color: Colors.error,
    fontFamily: Typography.fontFamily.regular,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 2,
    marginBottom: 16,
    marginTop: 4,
  },
  categoryPill: {
    width: '22%',
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  categoryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryLabel: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: Typography.fontFamily.medium,
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
});

