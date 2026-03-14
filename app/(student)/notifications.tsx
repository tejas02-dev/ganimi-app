import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { notificationService } from '@/services/notification.service';
import type { NotificationItem } from '@/types/notification';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/typography';

type TabKey = 'all' | 'unread' | 'archive';

function getRelativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatSourceDate(item: NotificationItem): string {
  try {
    const d = new Date(item.createdAt);
    if (Number.isNaN(d.getTime())) return item.createdByRole || 'SYSTEM';
    const source =
      item.createdByRole === 'ganimi_admin'
        ? 'GANIMI SUPPORT'
        : (item as any).createdByName
          ? String((item as any).createdByName).toUpperCase()
          : (item.createdByRole || 'SYSTEM').toUpperCase();
    const date = d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const time = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${source} • ${date} • ${time}`;
  } catch {
    return item.createdByRole || 'SYSTEM';
  }
}

type NotificationStyle = {
  barColor: string;
  iconBg: string;
  pillBg: string;
  pillText: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

function getStyleForType(type: string): NotificationStyle {
  const t = (type || 'info').toLowerCase();
  if (t === 'alert')
    return {
      barColor: '#F59E0B',
      iconBg: '#F59E0B',
      pillBg: '#FEF3C7',
      pillText: '#B45309',
      icon: 'warning',
      label: 'ALERT',
    };
  if (t === 'event' || t === 'success')
    return {
      barColor: '#22C55E',
      iconBg: '#22C55E',
      pillBg: '#DCFCE7',
      pillText: '#16A34A',
      icon: 'checkmark-circle',
      label: 'SUCCESS',
    };
  if (t === 'urgent')
    return {
      barColor: '#EF4444',
      iconBg: '#EF4444',
      pillBg: '#FEE2E2',
      pillText: '#DC2626',
      icon: 'notifications',
      label: 'URGENT',
    };
  return {
    barColor: '#2563EB',
    iconBg: '#2563EB',
    pillBg: '#DBEAFE',
    pillText: '#1D4ED8',
    icon: 'school',
    label: 'INFO',
  };
}

export default function StudentNotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const loadNotifications = useCallback(async (isRefresh?: boolean) => {
    try {
      setError(null);
      if (!isRefresh) setIsLoading(true);
      const res = await notificationService.getMyNotifications();
      const data = (res as any).data ?? res?.data ?? [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Failed to load notifications', e);
      setError(e?.message || 'Unable to load notifications. Please try again.');
    } finally {
      setIsLoading(false);
      if (isRefresh) setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadNotifications(true);
  };

  const filteredList = useMemo(() => {
    let list = notifications;
    if (activeTab === 'archive') list = []; // No archived list from API yet
    // Latest first
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [activeTab, notifications]);

  const renderCard = ({ item }: { item: NotificationItem }) => {
    const style = getStyleForType(item.type);
    const relativeTime = getRelativeTime(item.createdAt);
    const sourceLine = formatSourceDate(item);
    const isUnread = true; // Could use item.read when API supports it

    return (
      <View style={styles.card}>
        <View style={[styles.leftBar, { backgroundColor: style.barColor }]} />
        <View style={styles.cardInner}>
          <View style={[styles.iconCircle, { backgroundColor: style.pillBg }]}>
            <Ionicons name={style.icon} size={20} color={style.barColor} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardTopRow}>
              <View style={[styles.pill, { backgroundColor: style.pillBg }]}>
                <Text style={[styles.pillText, { color: style.pillText }]}>
                  {style.label}
                </Text>
              </View>
              <View style={styles.timeRow}>
                {isUnread ? <View style={styles.unreadDot} /> : null}
                <Text style={styles.relativeTime}>{relativeTime}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardMessage} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.sourceLine} numberOfLines={1}>
              {sourceLine}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {(['all', 'unread', 'archive'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab && styles.tabLabelActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                You&apos;ll see important updates and announcements here.
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
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
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
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  leftBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardInner: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    minWidth: 0,
    gap: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width:40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 10,
    letterSpacing: 0.5,
    fontFamily: Typography.fontFamily.extraBold,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  relativeTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  cardTitle: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: Typography.fontFamily.extraBold,
    marginTop: 4,
  },
  cardMessage: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: 6,
  },
  sourceLine: {
    fontSize: 11,
    color: Colors.textLight,
    fontFamily: Typography.fontFamily.bold,
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
    fontFamily: Typography.fontFamily.extraBold,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.regular,
  },
});
