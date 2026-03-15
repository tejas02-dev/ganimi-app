import React from 'react';
import { useRouter } from 'expo-router';
import { VendorVerificationGate } from '@/components/VendorVerificationGate';
import { UnderDevelopment } from '@/components/UnderDevelopment';

export default function VendorAnalyticsScreen() {
  const router = useRouter();

  return (
    <VendorVerificationGate>
      <UnderDevelopment
        onReturn={() => router.navigate('/(vendor)/dashboard' as any)}
        returnLabel="Return to Dashboard"
      />
    </VendorVerificationGate>
  );
}
