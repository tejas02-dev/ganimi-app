import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
  ToastAndroid,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiService } from '@/services/api';

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  isLast?: boolean;
  trailing?: React.ReactNode;
};

function SettingsRow({ icon, label, onPress, isLast = false, trailing }: SettingsRowProps) {
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
      {trailing ?? <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />}
    </TouchableOpacity>
  );
}

export default function VendorSettingsScreen() {
  const router = useRouter();
  const [isConnectingZoom, setIsConnectingZoom] = useState(false);
  const { zoom } = useLocalSearchParams();

  useEffect(() => {
    if (zoom === 'connected') {
      ToastAndroid.show('Zoom connected successfully', ToastAndroid.SHORT);
    } else if (zoom === 'connection-error') {
      ToastAndroid.show('Zoom connection error', ToastAndroid.SHORT);
    }
  }, [zoom]);

  const handleConnectZoom = async () => {
    setIsConnectingZoom(true);
    try {
      const response = await apiService.get<{ data?: string }>('/zoom/auth-url?platform=mobile');
      const url = response?.data;
      if (url && typeof url === 'string') {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Unable to open Zoom authorization link.');
        }
      } else {
        Alert.alert('Error', 'Invalid response from server.');
      }
    } catch {
      Alert.alert('Error', 'Failed to connect Zoom account.');
    } finally {
      setIsConnectingZoom(false);
    }
  };

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
          onPress={() => router.push('/(vendor)/profile' as any)}
        />
        <SettingsRow
          icon="lock-closed"
          label="Change Password"
          onPress={() => router.push('/(vendor)/profile' as any)}
          isLast
        />
      </View>

      {/* Integrations */}
      <Text style={styles.sectionLabel}>INTEGRATIONS</Text>
      <View style={styles.card}>
        <SettingsRow
          icon="videocam"
          label="Connect Zoom"
          onPress={handleConnectZoom}
          isLast
          trailing={
            isConnectingZoom ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            )
          }
        />
      </View>

      {/* Support & Legal */}
      <Text style={styles.sectionLabel}>SUPPORT & LEGAL</Text>
      <View style={styles.card}>
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
