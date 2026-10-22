import { router } from 'expo-router';
import { createContext, useContext } from 'react';

import type { SeccionEmpresa } from '@/components/web/EmpresaShell';

// Navegación del panel de empresas. En la demo (/preview-empresa, "Ver la app
// como empresa") se cambia de sección dentro de la demo en vez de ir a las
// pantallas reales, que sacarían al superadmin de la vista de usuario.
export type NavEmpresa = {
  ir: (seccion: SeccionEmpresa) => void;
  abrirPedido: (id: string) => void;
};

export const NavEmpresaDemoContext = createContext<NavEmpresa | null>(null);

const RUTAS: Record<SeccionEmpresa, Parameters<typeof router.navigate>[0]> = {
  panel: '/empresa/panel',
  pedidos: '/empresa/pedidos',
  choferes: '/empresa/choferes',
  tarifas: '/empresa/tarifas',
  empresas: '/empresa/empresas',
  contabilidad: '/empresa/contabilidad',
  marketing: '/empresa/marketing',
  anuncios: '/empresa/anuncios',
};

export function useNavEmpresa(): NavEmpresa {
  const demo = useContext(NavEmpresaDemoContext);
  if (demo) return demo;
  return {
    ir: (seccion) => router.navigate(RUTAS[seccion]),
    abrirPedido: (id) => router.push(`/empresa/pedidos/${id}`),
  };
}
