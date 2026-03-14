import React from 'react';
import { useRouter } from 'expo-router';
import { UnderDevelopment } from '@/components/UnderDevelopment';

export default function StudentReportsScreen() {
  const router = useRouter();

  return (
    <UnderDevelopment
      onReturn={() => router.replace('/(student)/dashboard' as any)}
      returnLabel="Return to Dashboard"
    />
  );
}
