import { Stack } from 'expo-router';

import { RequireRole } from '@/components/Guards';

// Panel de la empresa de grúas (independiente del de empresas de Mudanzas).
// Quién entra lo decide cada pantalla (dueño de una empresa del esquema "gruas"
// o el superadmin con datos de ejemplo); la seguridad la ponen las políticas.
export default function EmpresaGruasLayout() {
  return (
    <RequireRole allow={['cliente', 'chofer', 'empresa', 'superadmin']}>
      <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
    </RequireRole>
  );
}
