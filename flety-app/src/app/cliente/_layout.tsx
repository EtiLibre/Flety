import { router, Stack, usePathname } from 'expo-router';
import { House, LifeBuoy, Package, UserRound } from 'lucide-react-native';
import { View } from 'react-native';

import { RequireRole } from '@/components/Guards';
import { BarraInferior, type TabItem } from '@/components/nav/BarraInferior';
import { useIsWide } from '@/hooks/use-is-wide';

type Tab = 'inicio' | 'fletes' | 'ayuda' | 'cuenta';

const TABS: TabItem<Tab>[] = [
  { id: 'inicio', label: 'Inicio', Icon: House },
  { id: 'fletes', label: 'Mis fletes', Icon: Package },
  { id: 'ayuda', label: 'Ayuda', Icon: LifeBuoy },
  { id: 'cuenta', label: 'Cuenta', Icon: UserRound },
];

const RUTAS = {
  inicio: '/cliente/inicio',
  fletes: '/cliente/pedidos',
  ayuda: '/cliente/ayuda',
  cuenta: '/cliente/cuenta',
} as const;

// Pantallas principales: muestran la barra de abajo. En el resto (pedir,
// elegir fletero, seguimiento) se oculta para dejar todo el espacio al flujo.
function tabDe(pathname: string): Tab | null {
  const t = (Object.keys(RUTAS) as Tab[]).find((k) => RUTAS[k] === pathname);
  return t ?? null;
}

export default function ClienteLayout() {
  const isWide = useIsWide();
  const pathname = usePathname();
  const activo = tabDe(pathname);

  return (
    // superadmin: "Ver la app como cliente" desde el panel.
    <RequireRole allow={['cliente', 'superadmin']}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={({ route }) => ({
              headerShown: false,
              // Entre pestañas no hay animación de "ir hacia adelante".
              animation: ['inicio', 'pedidos/index', 'ayuda', 'cuenta'].includes(route.name) ? 'none' : 'default',
            })}
          />
        </View>
        {!isWide && activo ? (
          <BarraInferior items={TABS} activo={activo} onIr={(id) => router.navigate(RUTAS[id])} tema="claro" />
        ) : null}
      </View>
    </RequireRole>
  );
}
