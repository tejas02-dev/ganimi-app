import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { TopBar } from '@/components/TopBar';
import { View, Text, StyleSheet } from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';

function StudentDrawerContent(props: any) {
  const { user } = useAuth();

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
      </View>
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
});

