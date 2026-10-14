import { Stack } from 'expo-router';

import { PublicOnly } from '@/components/Guards';

export default function AuthLayout() {
  return (
    <PublicOnly>
      <Stack screenOptions={{ headerShown: false }} />
    </PublicOnly>
  );
}
