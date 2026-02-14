import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { VendorVerificationGate } from '@/components/VendorVerificationGate';

export default function VendorLiveScreen() {
  return (
    <VendorVerificationGate>
      <View style={styles.container}>
        <Text style={styles.title}>Live Sessions</Text>
        <Text style={styles.subtitle}>
          Schedule and start your live classes from here.
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

