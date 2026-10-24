import { router } from 'expo-router';
import { History, LifeBuoy, Navigation, UserRound } from 'lucide-react-native';
import { createContext, useContext } from 'react';

import type { TabItem } from '@/components/nav/BarraInferior';

// Navegación de la app del chofer. En la demo (/preview-chofer, "Ver la app
// como chofer") se cambia de pantalla dentro de la demo en vez de ir a las
// rutas reales, que solo abren con una cuenta de chofer.
export type DestinoChofer = 'panel' | 'viajes' | 'ayuda' | 'cuenta' | 'perfil' | 'vehiculo' | 'seguro';

export const NavChoferDemoContext = createContext<((d: DestinoChofer) => void) | null>(null);

export const RUTAS_CHOFER = {
  panel: '/chofer/panel',
  viajes: '/chofer/viajes',
  ayuda: '/chofer/ayuda',
  cuenta: '/chofer/cuenta',
  perfil: '/chofer/perfil',
  vehiculo: '/chofer/vehiculo',
  seguro: '/chofer/seguro',
} as const;

export function useNavChofer() {
  const demo = useContext(NavChoferDemoContext);
  return (d: DestinoChofer) => {
    if (demo) return demo(d);
    if (d === 'perfil' || d === 'vehiculo' || d === 'seguro') router.push(RUTAS_CHOFER[d]);
    else router.navigate(RUTAS_CHOFER[d]);
  };
}

export type TabChofer = 'panel' | 'viajes' | 'ayuda' | 'cuenta';

// Barra de abajo de la app del chofer.
export const TABS_CHOFER: TabItem<TabChofer>[] = [
  { id: 'panel', label: 'Viaje', Icon: Navigation },
  { id: 'viajes', label: 'Mis viajes', Icon: History },
  { id: 'ayuda', label: 'Ayuda', Icon: LifeBuoy },
  { id: 'cuenta', label: 'Cuenta', Icon: UserRound },
];
