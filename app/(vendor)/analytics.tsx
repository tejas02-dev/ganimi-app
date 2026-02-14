import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { VendorVerificationGate } from '@/components/VendorVerificationGate';

export default function VendorAnalyticsScreen() {
  return (
    <VendorVerificationGate>
      <View style={styles.container}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>
          Performance metrics and insights will be available here.
        </Text>
      </View>
    </VendorVerificationGate>
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
  },
});

