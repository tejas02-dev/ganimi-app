import React, { useState } from 'react';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { TopBar } from '@/components/TopBar';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { tokenStorage } from '@/services/tokenStorage';

function StudentDrawerContent(props: any) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = async () => {
    setMenuVisible(false);
    await logout();
    router.replace('/login');
  };

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.drawerScroll}
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Ganimi</Text>
          <Text style={styles.logoSubtitle}>Student</Text>
        </View>
        <Text style={styles.sectionLabel}>Main Navigation</Text>
        <DrawerItemList {...props} />
        {/* Temporary dev: clear tokens for testing refresh */}
        <View style={styles.devSection}>
          <Text style={styles.sectionLabel}>Dev (testing)</Text>
          <TouchableOpacity
            style={styles.devButton}
            onPress={async () => {
              await tokenStorage.deleteAccessToken();
              Alert.alert('Done', 'Access token deleted. Next API call should trigger refresh.');
            }}
          >
            <Text style={styles.devButtonText}>Delete access token</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.devButton}
            onPress={async () => {
              await tokenStorage.deleteRefreshToken();
              Alert.alert('Done', 'Refresh token deleted.');
            }}
          >
            <Text style={styles.devButtonText}>Delete refresh token</Text>
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>

      <View style={styles.userSection}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {user?.name?.charAt(0)?.toUpperCase() ?? 'S'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name ?? 'Student'}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user?.email ?? 'student@example.com'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={styles.menuButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <Pressable style={styles.menuCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.menuUserRow}>
              <View style={styles.menuAvatar}>
                <Text style={styles.menuAvatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() ?? 'S'}
                </Text>
              </View>
              <View style={styles.menuUserInfo}>
                <Text style={styles.menuUserName} numberOfLines={1}>
                  {user?.name ?? 'Student'}
                </Text>
                <Text style={styles.menuUserEmail} numberOfLines={1}>
                  {user?.email ?? ''}
                </Text>
              </View>
            </View>
            <View style={styles.menuSeparator} />
            <TouchableOpacity
              style={styles.menuLogoutRow}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={styles.menuLogoutText}>Log out</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function StudentLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        header: (props) => <TopBar {...props} />,
        drawerType: 'slide',
        drawerActiveTintColor: '#FFFFFF',
        drawerInactiveTintColor: Colors.textSecondary,
        drawerActiveBackgroundColor: Colors.primary,
        drawerLabelStyle: {
          fontSize: 14,
          fontWeight: '500',
        },
        drawerItemStyle: {
          borderRadius: 10,
          marginVertical: 2,
          paddingVertical: 0,
        },
        sceneContainerStyle: {
          backgroundColor: Colors.background,
        },
      }}
      drawerContent={(props) => <StudentDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: 'Profile',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="browse-categories"
        options={{
          title: 'Browse Categories',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="vendor-directory"
        options={{
          title: 'Vendor Directory',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="my-services"
        options={{
          title: 'My Services',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="my-orders"
        options={{
          title: 'My Orders',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="reports"
        options={{
          title: 'Reports',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: 'Settings',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="events"
        options={{
          title: 'Events',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="contact-us"
        options={{
          title: 'Contact Us',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="call-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="support"
        options={{
          title: 'Support',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="help-circle-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden detail routes (still navigable, not shown in drawer) */}
      <Drawer.Screen
        name="category/[categoryId]"
        options={{
          href: null,
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="course/[courseId]"
        options={{
          href: null,
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="service/[serviceId]"
        options={{
          href: null,
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="service/[serviceId]/book"
        options={{
          href: null,
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerScroll: {
    paddingTop: 40,
  },
  logoContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  logoSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionLabel: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  devSection: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  devButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  devButtonText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#F9FAFB',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#FFF',
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    marginLeft: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  menuButton: {
    padding: 4,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  menuCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuAvatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  menuUserInfo: {
    flex: 1,
    marginLeft: 12,
  },
  menuUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  menuUserEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  menuLogoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLogoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.error,
  },
});

