import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '@/constants/typography';
import { usePathname, useRouter } from 'expo-router';

export function BottomBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const items = [
    {
      key: 'dashboard',
      label: 'Home',
      icon: 'home' as const,
      iconFocused: 'home' as const,
    },
    {
      key: 'browse-categories',
      label: 'Browse',
      icon: 'compass' as const,
      iconFocused: 'compass' as const,
    },
    {
      key: 'my-services',
      label: 'My Learning',
      icon: 'book' as const,
      iconFocused: 'book' as const,
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: 'person' as const,
      iconFocused: 'person' as const,
    },
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 8 }]}>
      {items.map((item) => {
        const focused = pathname?.startsWith(`/(student)/${item.key}`);
        const iconName = focused ? item.iconFocused : item.icon;
        const color = focused ? Colors.tabActive : Colors.tabInactive;

        return (
          <TouchableOpacity
            key={item.key}
            style={styles.tab}
            activeOpacity={0.8}
            onPress={() => router.navigate(`/(student)/${item.key}` as any)}
          >
            <Ionicons name={iconName} size={22} color={color} />
            <Text
              style={[
                styles.label,
                focused && styles.labelFocused,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 4,
    borderColor: 'red',
  },
  label: {
    fontSize: 11,
    color: Colors.tabInactive,
    fontFamily: Typography.fontFamily.regular,
  },
  labelFocused: {
    color: Colors.tabActive,
    fontFamily: Typography.fontFamily.semiBold,
  },
});

