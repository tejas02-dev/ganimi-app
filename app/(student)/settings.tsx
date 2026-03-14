import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Typography } from '@/constants/typography';

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  isLast?: boolean;
};

function SettingsRow({ icon, label, onPress, isLast = false }: SettingsRowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, isLast && styles.rowLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={20} color={Colors.primary} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function StudentSettingsScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Account Settings */}
      <Text style={styles.sectionLabel}>ACCOUNT SETTINGS</Text>
      <View style={styles.card}>
        <SettingsRow
          icon="person"
          label="Edit Profile"
          onPress={() => router.push('/(student)/profile' as any)}
        />
        <SettingsRow
          icon="lock-closed"
          label="Change Password"
          onPress={() => router.push('/(student)/profile' as any)}
          isLast
        />
      </View>

      {/* Support & Legal */}
      <Text style={styles.sectionLabel}>SUPPORT & LEGAL</Text>
      <View style={styles.card}>
        <SettingsRow
          icon="help-circle"
          label="Help Center"
          onPress={() => router.push('/(student)/support' as any)}
        />
        <SettingsRow
          icon="shield"
          label="Privacy Policy"
          onPress={() => Linking.openURL('https://ganimii.com/privacy')}
        />
        <SettingsRow
          icon="document-text"
          label="Terms of Service"
          onPress={() => Linking.openURL('https://ganimii.com/terms')}
        />
        <SettingsRow
          icon="information-circle"
          label="About Ganimi"
          onPress={() => Alert.alert('Ganimi', 'Version 1.0.0')}
          isLast
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.extraBold,
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
});
