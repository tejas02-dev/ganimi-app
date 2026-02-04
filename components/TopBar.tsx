import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    if (navigation?.openDrawer) {
      navigation.openDrawer();
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
        {/* Left: Profile icon to open drawer */}
        <TouchableOpacity onPress={openDrawer} style={styles.iconButton}>
          <Ionicons name="person-circle-outline" size={26} color={Colors.text} />
        </TouchableOpacity>

        {/* Center: Title */}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {/* Right: Settings icon */}
        <TouchableOpacity onPress={goToSettings} style={styles.iconButton}>
          <Ionicons name="settings-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  iconButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
});

