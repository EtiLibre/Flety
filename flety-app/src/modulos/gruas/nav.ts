import { router, type Href } from 'expo-router';
import { History, LifeBuoy, Navigation, UserRound } from 'lucide-react-native';

import type { TabItem } from '@/components/nav/BarraInferior';

// Las rutas índice de una carpeta con _layout se tipan como "/x/index", pero la
// URL real es "/x": por eso estas dos van como Href.
export const RUTA_PEDIR_GRUA = '/gruas' as Href;
export const RUTA_GRUISTA = '/gruista' as Href;

// Navegación de la app del gruista.
export const RUTAS_GRUISTA = {
  inicio: RUTA_GRUISTA,
  historial: '/gruista/historial',
  ayuda: '/gruista/ayuda',
  cuenta: '/gruista/cuenta',
  unidad: '/gruista/unidad',
  documentos: '/gruista/documentos',
  tarifas: '/gruista/tarifas',
  flota: '/gruista/flota',
} as const;

export type DestinoGruista = keyof typeof RUTAS_GRUISTA;
export type TabGruista = 'inicio' | 'historial' | 'ayuda' | 'cuenta';

export const TABS_GRUISTA: TabItem<TabGruista>[] = [
  { id: 'inicio', label: 'Servicio', Icon: Navigation },
  { id: 'historial', label: 'Historial', Icon: History },
  { id: 'ayuda', label: 'Ayuda', Icon: LifeBuoy },
  { id: 'cuenta', label: 'Cuenta', Icon: UserRound },
];

export function irGruista(d: DestinoGruista) {
  if (TABS_GRUISTA.some((t) => t.id === d)) router.navigate(RUTAS_GRUISTA[d]);
  else router.push(RUTAS_GRUISTA[d]);
}
