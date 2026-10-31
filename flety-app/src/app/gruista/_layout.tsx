import { Stack, usePathname } from 'expo-router';
import { View } from 'react-native';

import { RequireRole } from '@/components/Guards';
import { BarraInferior } from '@/components/nav/BarraInferior';
import { irGruista, RUTAS_GRUISTA, TABS_GRUISTA } from '@/modulos/gruas/nav';
import { G } from '@/modulos/gruas/ui';
import { colors } from '@/theme';

// App del gruista (Grúas). Cualquier usuario puede darse de alta como gruista
// independiente, como empresa de auxilio o con el código de su empresa; lo que
// puede hacer lo deciden las funciones y políticas del esquema "gruas".
export default function GruistaLayout() {
  const pathname = usePathname();
  const activo = TABS_GRUISTA.find((t) => RUTAS_GRUISTA[t.id] === pathname)?.id ?? null;

  return (
    <RequireRole allow={['cliente', 'chofer', 'empresa', 'superadmin']}>
      <View style={{ flex: 1, backgroundColor: colors.dark.bg }}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={({ route }) => ({
              headerShown: false,
              animation: ['index', 'historial', 'ayuda', 'cuenta'].includes(route.name) ? 'none' : 'default',
            })}
          />
        </View>
        {activo ? (
          <BarraInferior
            items={TABS_GRUISTA}
            activo={activo}
            onIr={irGruista}
            tema="oscuro"
            acento={{ fondo: G.acento, icono: colors.white }}
          />
        ) : null}
      </View>
    </RequireRole>
  );
}
