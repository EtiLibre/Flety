import { Stack } from 'expo-router';

import { RequireRole } from '@/components/Guards';

export default function ChoferLayout() {
  return (
    <RequireRole allow={['chofer']}>
      <Stack screenOptions={{ headerShown: false }} />
    </RequireRole>
  );
}
