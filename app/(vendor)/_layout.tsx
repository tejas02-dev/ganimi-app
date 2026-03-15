import React, { useState } from 'react';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { TopBar } from '@/components/TopBar';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '@/constants/typography';
import { VendorBottomBar } from '@/components/BottomBar';

function VendorDrawerContent(props: any) {
  const { user, vendorProfile, logout } = useAuth();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    setMenuVisible(false);
    await logout();
    router.replace('/login');
  };

  const profilePicture = vendorProfile?.profilePicture ?? user?.profilePicture;

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.drawerScroll}
      >
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.userAvatarImage} />
            ) : (
              <Text style={styles.userAvatarText}>
                {user?.name?.charAt(0)?.toUpperCase() ?? 'V'}
              </Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name ?? 'Vendor'}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email ?? 'vendor@example.com'}
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

        <DrawerItemList {...props} />
      </DrawerContentScrollView>

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
            {/* User info in popup */}
            <View style={styles.menuUserRow}>
              <View style={styles.menuAvatar}>
                {profilePicture ? (
                  <Image source={{ uri: profilePicture }} style={styles.menuAvatarImage} />
                ) : (
                  <Text style={styles.menuAvatarText}>
                    {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </Text>
                )}
              </View>
              <View style={styles.menuUserInfo}>
                <Text style={styles.menuUserName} numberOfLines={1}>
                  {user?.name ?? 'Vendor'}
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

export default function VendorLayout() {
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
      drawerContent={(props) => <VendorDrawerContent {...props} />}
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
        name="services"
        options={{
          title: 'My Services',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="bookings"
        options={{
          title: 'My Bookings',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
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
        name="analytics"
        options={{
          title: 'Analytics',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
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
        name="live"
        options={{
          title: 'Live',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="videocam" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="content"
        options={{
          title: 'Content',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="courses"
        options={{
          title: 'Courses',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="contact"
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
      {/* Hidden detail routes (still navigable, not shown in drawer) */}
      <Drawer.Screen
        name="service/[serviceId]"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="batch/[batchId]"
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
    </Drawer>
    <VendorBottomBar />
    </>
  );
}

const styles = StyleSheet.create({
  drawerScroll: {
    paddingTop: 40,
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
  userAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  userAvatarText: {
    color: '#FFF',
    fontFamily: Typography.fontFamily.bold,
  },
  userInfo: {
    flex: 1,
    marginLeft: 8,
  },
  userName: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
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
  menuAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  menuAvatarText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
  },
  menuUserInfo: {
    flex: 1,
    marginLeft: 12,
  },
  menuUserName: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
  },
  menuUserEmail: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
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
    fontSize: 16,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.error,
  },
});

