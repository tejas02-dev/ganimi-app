import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function VendorSettingsScreen() {
  const router = useRouter();

  const goToProfile = () => {
    router.push('/(vendor)/profile' as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Configure your account and preferences.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>

        <TouchableOpacity style={styles.item} onPress={goToProfile} activeOpacity={0.8}>
          <View style={styles.itemLeft}>
            <View style={styles.itemIconWrap}>
              <Ionicons name="person-outline" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.itemTitle}>Update profile</Text>
              <Text style={styles.itemSubtitle}>Edit your business details</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={goToProfile} activeOpacity={0.8}>
          <View style={styles.itemLeft}>
            <View style={styles.itemIconWrap}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.itemTitle}>Update password</Text>
              <Text style={styles.itemSubtitle}>Change your account password</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  section: {
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  itemSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

