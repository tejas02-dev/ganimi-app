import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';

const MENU_ITEMS = [
  { route: '/(student)/vendor-directory' as const, label: 'Vendor Directory', icon: 'business-outline' as const },
  { route: '/(student)/my-orders' as const, label: 'My Orders', icon: 'cart-outline' as const },
  { route: '/(student)/live' as const, label: 'Live Sessions', icon: 'videocam-outline' as const },
  { route: '/(student)/reports' as const, label: 'Reports', icon: 'bar-chart-outline' as const },
  { route: '/(student)/favorites' as const, label: 'Favorites', icon: 'heart-outline' as const },
  { route: '/(student)/notifications' as const, label: 'Notifications', icon: 'notifications-outline' as const },
  { route: '/(student)/reminders' as const, label: 'Reminders', icon: 'time-outline' as const },
  { route: '/(student)/events' as const, label: 'Events', icon: 'calendar-outline' as const },
  { route: '/(student)/settings' as const, label: 'Settings', icon: 'settings-outline' as const },
  { route: '/(student)/contact-us' as const, label: 'Contact Us', icon: 'call-outline' as const },
  { route: '/(student)/support' as const, label: 'Support', icon: 'help-circle-outline' as const },
];

export default function StudentMenuScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Menu</Text>
      <Text style={styles.subtitle}>{user?.email ?? 'Student'}</Text>

      {MENU_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.route}
          style={styles.row}
          onPress={() => router.push(item.route as any)}
          activeOpacity={0.7}
        >
          <Ionicons name={item.icon} size={22} color={Colors.textSecondary} />
          <Text style={styles.rowLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.row, styles.logoutRow]}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={22} color={Colors.error} />
        <Text style={styles.logoutText}>Log out</Text>
        <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  logoutRow: {
    marginTop: 16,
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.error,
  },
});
