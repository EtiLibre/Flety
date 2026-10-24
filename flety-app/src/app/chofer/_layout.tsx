import { Stack, usePathname } from 'expo-router';
import { View } from 'react-native';

import { RequireRole } from '@/components/Guards';
import { BarraInferior } from '@/components/nav/BarraInferior';
import { RUTAS_CHOFER, TABS_CHOFER, useNavChofer, type TabChofer } from '@/hooks/use-nav-chofer';

export default function ChoferLayout() {
  const pathname = usePathname();
  const ir = useNavChofer();
  const activo = (Object.keys(RUTAS_CHOFER) as (keyof typeof RUTAS_CHOFER)[]).find(
    (k) => RUTAS_CHOFER[k] === pathname && TABS_CHOFER.some((t) => t.id === k)
  ) as TabChofer | undefined;

  return (
    <RequireRole allow={['chofer']}>
      <View style={{ flex: 1, backgroundColor: '#0F1318' }}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={({ route }) => ({
              headerShown: false,
              animation: ['panel', 'viajes', 'ayuda', 'cuenta'].includes(route.name) ? 'none' : 'default',
            })}
          />
        </View>
        {activo ? <BarraInferior items={TABS_CHOFER} activo={activo} onIr={ir} tema="oscuro" /> : null}
      </View>
    </RequireRole>
  );
}
