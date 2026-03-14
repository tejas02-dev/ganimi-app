import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { serviceService } from '@/services/service.service';
import type { StudentService } from '@/types/service';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/typography';

export default function StudentMyServicesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [services, setServices] = useState<StudentService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    if (!user?.id) {
      setError('User not found');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      if (!isRefreshing) setIsLoading(true);
      const response = await serviceService.getStudentServices(user.id);
      setServices(response.data || []);
    } catch (e: any) {
      console.error('Failed to load student services', e);
      setError(e?.message || 'Unable to load services. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadServices();
  };

  const formatSchedule = (schedule?: string) => {
    if (!schedule) return 'Schedule not available';
    return schedule.split(',').join(', ');
  };

  const formatNextClass = (nextClass?: string) => {
    if (!nextClass) return 'Next class not scheduled';
    const date = new Date(nextClass);
    if (isNaN(date.getTime())) return 'Next class not scheduled';
    return date.toLocaleString();
  };

  const filteredServices = useMemo(() => {
    if (activeTab === 'completed') {
      return services.filter((s) => s.status?.toLowerCase() === 'completed');
    }
    // Treat anything not explicitly completed as ongoing
    return services.filter((s) => s.status?.toLowerCase() !== 'completed');
  }, [activeTab, services]);

  const renderServiceCard = ({ item }: { item: StudentService }) => {
    // Placeholder progress values until backend provides real progress
    const progress = 0.65;
    const progressPercentLabel = '65% Complete';
    const lessonsLabel = '12/18 Lessons';

    return (
      <View style={styles.card}>
        {/* Image placeholder */}
        <View style={styles.cardImage}>
          <Ionicons
            name="image-outline"
            size={32}
            color={Colors.primary}
            style={styles.cardImageIcon}
          />
        </View>

        {/* Content */}
        <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>

          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardProvider} numberOfLines={1}>
            {item.batchName ? item.batchName : 'Enrolled service'}
          </Text>
          </View>
          {/* Progress row */}
          {/* <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>{progressPercentLabel}</Text>
            <Text style={styles.progressMeta}>{lessonsLabel}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View> */}

          {/* View details button */}
          <TouchableOpacity
            style={styles.detailsButton}
            activeOpacity={0.9}
            onPress={() =>
              router.push({
                pathname: '/(student)/service/[serviceId]' as any,
                params: { serviceId: item.id, batchId: item.batchId ?? '' },
              })
            }
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Learning</Text>
        <Text style={styles.subtitle}>Track your enrolled services</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.8}
          onPress={() => setActiveTab('ongoing')}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'ongoing' && styles.tabLabelActive,
            ]}
          >
            Ongoing
          </Text>
          {activeTab === 'ongoing' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.8}
          onPress={() => setActiveTab('completed')}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'completed' && styles.tabLabelActive,
            ]}
          >
            Completed
          </Text>
          {activeTab === 'completed' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item.id}
        renderItem={renderServiceCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {activeTab === 'ongoing' ? 'No ongoing services' : 'No completed services yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'ongoing'
                  ? 'New services you enroll in will appear here.'
                  : 'Completed services will move to this tab.'}
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
    paddingBottom: 4,
    paddingTop: 8,
  },
  title: {
    fontSize: 22,
    color: Colors.text,
    fontFamily: Typography.fontFamily.extraBold,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  tabItem: {
    marginRight: 24,
  },
  tabLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  tabUnderline: {
    marginTop: 4,
    height: 2,
    borderRadius: 999,
    backgroundColor: Colors.primary,
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
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardImage: {
    height: 140,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageIcon: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    padding: 14,
  },
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: Typography.fontFamily.extraBold,
  },
  cardProvider: {
    marginTop: 4,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'flex-start',
    backgroundColor: Colors.backgroundSecondary,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  progressMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  detailsButton: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButtonText: {
    fontSize: 14,
    top: -2,
    color: Colors.white,
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

