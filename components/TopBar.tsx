import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '@/constants/typography';

type TopBarProps = {
  navigation: any;
  options: {
    title?: string;
  };
};

export function TopBar({ navigation, options }: TopBarProps) {
  const insets = useSafeAreaInsets();

  const title = options.title ?? 'Ganimi';

  const openDrawer = () => {
    if (typeof navigation?.openDrawer === 'function') {
      navigation.openDrawer();
    } else if (navigation?.navigate) {
      navigation.navigate('menu');
    }
  };

  const goToProfile = () => {
    if (navigation?.navigate) {
      navigation.navigate('profile');
    }
  };

  const goToSettings = () => {
    if (navigation?.navigate) {
      navigation.navigate('settings');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top || 12 }]}>
      <View style={styles.inner}>
        {/* Left: Hamburger opens drawer, Profile navigates to profile */}
        <View style={styles.leftIcons}>
          <TouchableOpacity onPress={openDrawer} style={styles.iconButton}>
            <Ionicons name="menu" size={20} color={Colors.drawerInactiveTintColor} />
          </TouchableOpacity>
        </View>

        {/* Center: Title */}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {/* Right: Settings icon */}
        <TouchableOpacity onPress={goToSettings} style={styles.iconButton}>
          <Ionicons name="settings" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginTop: 10,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: Colors.background,

  },
  leftIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
});

