import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';

const VERIFIED_STATUS = 'approved';

/**
 * For vendor-only screens: blocks access until vendor isVerified === 'approved'.
 * Shows a message and CTA to profile; otherwise renders children.
 */
export function VendorVerificationGate({ children }: { children: ReactNode }) {
  const { user, vendorProfile } = useAuth();
  const router = useRouter();

  const isVendor = user?.role === 'vendor';
  const verificationValue =
    vendorProfile?.isVerified ??
    vendorProfile?.verificationStatus ??
    (user as any)?.isVerified ??
    (user as any)?.verificationStatus;
  const isVerified = verificationValue === VERIFIED_STATUS;

  if (!isVendor || isVerified) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="shield-checkmark-outline" size={56} color={Colors.primary} />
      </View>
      <Text style={styles.title}>Verification required</Text>
      <Text style={styles.message}>
        You need to complete verification to access these pages. Please visit the profile page to
        start verification.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(vendor)/profile')}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Go to Profile</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: Colors.backgroundSecondary,
  },
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
