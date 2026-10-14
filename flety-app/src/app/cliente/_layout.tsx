import { Stack } from 'expo-router';

import { RequireRole } from '@/components/Guards';
import { PedidoDraftProvider } from '@/lib/pedido-draft';

export default function ClienteLayout() {
  return (
    <RequireRole allow={['cliente']}>
      <PedidoDraftProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </PedidoDraftProvider>
    </RequireRole>
  );
}
