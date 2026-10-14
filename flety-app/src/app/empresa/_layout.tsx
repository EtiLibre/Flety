import { Stack } from 'expo-router';

import { RequireRole } from '@/components/Guards';

export default function EmpresaLayout() {
  return (
    <RequireRole allow={['empresa', 'superadmin', 'contabilidad']}>
      <Stack screenOptions={{ headerShown: false }} />
    </RequireRole>
  );
}
