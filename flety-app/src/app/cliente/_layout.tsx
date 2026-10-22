import { Stack } from 'expo-router';

import { RequireRole } from '@/components/Guards';

export default function ClienteLayout() {
  return (
    // superadmin: "Ver la app como cliente" desde el panel.
    <RequireRole allow={['cliente', 'superadmin']}>
      <Stack screenOptions={{ headerShown: false }} />
    </RequireRole>
  );
}
