import { Stack } from 'expo-router';

import { RequireRole } from '@/components/Guards';

export default function ClienteLayout() {
  return (
    <RequireRole allow={['cliente']}>
      <Stack screenOptions={{ headerShown: false }} />
    </RequireRole>
  );
}
