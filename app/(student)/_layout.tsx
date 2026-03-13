import React, { useState } from 'react';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { TopBar } from '@/components/TopBar';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '@/constants/typography';
import { BottomBar } from '@/components/BottomBar';

function StudentDrawerContent(props: any) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();

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
        <View style={[styles.userSection]}>
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
          style={[styles.menuOverlay, { paddingBottom: 24 + (insets.bottom || 0) }]}
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
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      
    </View>
  );
}

export default function StudentLayout() {
  return (
    <>
    <Drawer
      screenOptions={{
        headerShown: true,
        header: (props) => <TopBar {...props} />,
        drawerStyle: {
          width: '80%',
        },
        drawerType: 'front',
        drawerActiveTintColor: Colors.drawerActiveTintColor,
        drawerInactiveTintColor: Colors.textSecondary,
        drawerActiveBackgroundColor: Colors.drawerActive,
        drawerLabelStyle: {
          fontSize: 14,
          fontFamily: Typography.fontFamily.semiBold,
        },
        drawerItemStyle: {
          borderRadius: 20,
          marginVertical: 2,
          paddingVertical: 0,
        },
      }}
      drawerContent={(props) => <StudentDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: 'Profile',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="browse-categories"
        options={{
          title: 'Browse Categories',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="vendor-directory"
        options={{
          title: 'Vendor Directory',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="my-services"
        options={{
          title: 'My Services',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="my-orders"
        options={{
          title: 'My Orders',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="live"
        options={{
          title: 'Live Sessions',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="videocam" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="reports"
        options={{
          title: 'Reports',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: 'Settings',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="events"
        options={{
          title: 'Events',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="contact-us"
        options={{
          title: 'Contact Us',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="call" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="support"
        options={{
          title: 'Support',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="help-circle" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="menu"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="index"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="category/[categoryId]"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="course/[courseId]"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="service/[serviceId]"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="service/[serviceId]/book"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer>
    <BottomBar />
    </>
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
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: Colors.white,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
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
    fontFamily: Typography.fontFamily.semiBold,
    top: -2,
  },
  menuUserEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    top: -4,
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
    justifyContent: 'center',
  },
  menuLogoutText: {
    top: -2,
    fontSize: 16,
    color: Colors.error,
    fontFamily: Typography.fontFamily.semiBold,
  },
});
