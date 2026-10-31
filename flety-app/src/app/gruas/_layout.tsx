import { Stack } from 'expo-router';

import { RequireRole } from '@/components/Guards';

// Grúas · experiencia del cliente (pedir y seguir una grúa). Independiente de
// Mudanzas: sus propias pantallas, datos y reglas (esquema "gruas").
export default function GruasLayout() {
  return (
    <RequireRole allow={['cliente', 'superadmin']}>
      <Stack screenOptions={{ headerShown: false }} />
    </RequireRole>
  );
}
