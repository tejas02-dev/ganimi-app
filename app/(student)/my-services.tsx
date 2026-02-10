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
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { serviceService } from '@/services/service.service';
import type { StudentService } from '@/types/service';
import { Ionicons } from '@expo/vector-icons';

export default function StudentMyServicesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [services, setServices] = useState<StudentService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const renderServiceCard = ({ item }: { item: StudentService }) => (
    <View style={styles.card}>
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
        {item.status ? (
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        ) : null}
      </View>

      {item.batchName ? (
        <View style={styles.infoRow}>
          <Ionicons name="school-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>
            Batch: {item.batchName}
          </Text>
        </View>
      ) : null}

      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.infoText}>{formatSchedule(item.schedule)}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.infoText}>{formatNextClass(item.nextClass)}</Text>
      </View>

      <TouchableOpacity
        style={styles.exploreButton}
        activeOpacity={0.9}
        onPress={() =>
          router.push({
            pathname: '/(student)/service/[serviceId]' as any,
            params: { serviceId: item.id, batchId: item.batchId ?? '' },
          })
        }
      >
        <Ionicons name="compass-outline" size={16} color="#FFF" />
        <Text style={styles.exploreButtonText}>Explore</Text>
      </TouchableOpacity>
    </View>
  );

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
        <Text style={styles.title}>My Services</Text>
        <Text style={styles.subtitle}>Services you&apos;re currently enrolled in</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={renderServiceCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No services yet</Text>
              <Text style={styles.emptySubtitle}>
                When you enroll in a service, it will appear here.
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
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ECFEFF',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'capitalize',
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
  exploreButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  exploreButtonText: {
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

