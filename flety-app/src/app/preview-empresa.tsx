import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmpresaPreviewContext, type DatosEmpresa } from '@/hooks/use-empresa';
import { NavEmpresaDemoContext, type NavEmpresa } from '@/hooks/use-nav-empresa';
import { PedidoPreviewContext } from '@/hooks/use-pedido-en-vivo';
import { AuthPreview, useAuth } from '@/lib/auth';
import type { Chofer } from '@/lib/empresa';
import type { Pedido } from '@/lib/orders';
import { avisar } from '@/lib/confirm';
import { MarketingPreviewContext, type Estadisticas } from '@/lib/marketing';
import { EN_VIAJE } from '@/lib/seguimiento';
import type { UserRole } from '@/lib/types';
import { FOTOS_EJEMPLO as FOTOS } from '@/dev/datos-ejemplo';
import { colors, fonts } from '@/theme';

import DetallePedidoEmpresa from './empresa/pedidos/[id]';
import PedidosEmpresa from './empresa/pedidos/index';
import AyudaEmpresa from './empresa/ayuda';
import ChoferesEmpresa from './empresa/choferes';
import CuentaEmpresa from './empresa/cuenta';
import Marketing from './empresa/marketing';
import PanelEmpresa from './empresa/panel';
import TarifasEmpresa from './empresa/tarifas';

// SOLO DESARROLLO: el panel de empresas con datos de ejemplo, sin iniciar
// sesión ni Supabase. ?vista=panel|pedidos|detalle y ?rol=empresa|superadmin.
// En producción redirige al inicio.

const base = {
  cliente_id: 'cli-1',
  nota: null,
  vehiculo: 'camioneta' as const,
  created_at: new Date().toISOString(),
  company_solicitada: null,
  driver_solicitado: null,
  solicitado_hasta: null,
};

const SAN_MARTIN = { lat: -32.8893605, lng: -68.8391999, direccion: 'Avenida General San Martín 1200, Mendoza' };
const VILLANUEVA = { lat: -32.8924301, lng: -68.8549776, direccion: 'Arístides Villanueva 300, Mendoza' };
const GODOY_CRUZ = { lat: -32.9254, lng: -68.8443, direccion: 'Perito Moreno 450, Godoy Cruz' };
const LUJAN = { lat: -33.0365, lng: -68.8789, direccion: 'Roque Sáenz Peña 900, Luján de Cuyo' };
const MAIPU = { lat: -32.9832, lng: -68.7838, direccion: 'Padre Vázquez 120, Maipú' };

const manana = new Date();
manana.setDate(manana.getDate() + 1);
manana.setHours(9, 0, 0, 0);

const PEDIDOS: Pedido[] = [
  {
    ...base,
    id: 'p-cola-1',
    company_id: null,
    driver_id: null,
    tipo: 'mudanza',
    tamano: 'mediano',
    ayudantes: 1,
    origen: SAN_MARTIN,
    destino: VILLANUEVA,
    estado: 'buscando_asignacion',
    programado_para: null,
    nota: 'Es un segundo piso por escalera. Hay que desarmar la cama.',
    distancia_km: 2.1,
    precio_estimado: 39500,
  },
  {
    ...base,
    id: 'p-cola-2',
    company_id: null,
    driver_id: null,
    tipo: 'flete',
    tamano: 'chico',
    ayudantes: 0,
    origen: GODOY_CRUZ,
    destino: MAIPU,
    estado: 'buscando_asignacion',
    programado_para: manana.toISOString(),
    vehiculo: 'utilitario',
    distancia_km: 9.4,
    precio_estimado: 23500,
  },
  {
    ...base,
    id: 'p-asig-1',
    company_id: 'emp-1',
    driver_id: null,
    tipo: 'mudanza',
    tamano: 'grande',
    ayudantes: 2,
    origen: LUJAN,
    destino: SAN_MARTIN,
    estado: 'asignado',
    programado_para: null,
    vehiculo: 'camion',
    nota: 'Casa completa: heladera, lavarropas y 3 camas.',
    distancia_km: 18.7,
    precio_estimado: 102700,
  },
  {
    ...base,
    id: 'p-curso-1',
    company_id: 'emp-1',
    driver_id: 'drv-2',
    tipo: 'flete',
    tamano: 'mediano',
    ayudantes: 1,
    origen: VILLANUEVA,
    destino: GODOY_CRUZ,
    estado: 'en_camino_destino',
    programado_para: null,
    distancia_km: 5.2,
    precio_estimado: 43200,
  },
  {
    ...base,
    id: 'p-hist-1',
    company_id: 'emp-1',
    driver_id: 'drv-1',
    tipo: 'flete',
    tamano: 'chico',
    ayudantes: 0,
    origen: MAIPU,
    destino: SAN_MARTIN,
    estado: 'confirmado',
    programado_para: null,
    distancia_km: 12.3,
    precio_estimado: 36100,
  },
];

const CHOFERES: Chofer[] = [
  {
    id: 'drv-1',
    user_id: 'u1',
    disponibilidad: true,
    vehiculo: { tipo: 'camioneta', patente: 'AE 123 FT' },
    ubicacion_actual: null,
    nombre: 'Martín Gómez',
    email: null,
  },
  {
    id: 'drv-2',
    user_id: 'u2',
    disponibilidad: true,
    vehiculo: { tipo: 'camion', patente: 'AB 987 KL' },
    ubicacion_actual: { lat: -32.9101, lng: -68.8467 },
    nombre: 'Lucía Fernández',
    email: null,
  },
  {
    id: 'drv-3',
    user_id: 'u3',
    disponibilidad: true,
    vehiculo: { tipo: 'utilitario', patente: 'AC 456 MZ' },
    ubicacion_actual: null,
    nombre: 'Diego Sosa',
    email: null,
  },
  {
    id: 'drv-4',
    user_id: 'u4',
    disponibilidad: false,
    vehiculo: { tipo: 'camioneta' },
    ubicacion_actual: null,
    nombre: 'Pablo Ruiz',
    email: null,
  },
];

const DATOS: DatosEmpresa = {
  empresa: { id: 'emp-1', nombre: 'Fletes Cuyo', estado_aprobacion: 'aprobada' },
  cola: PEDIDOS.filter((p) => p.company_id === null),
  pedidos: PEDIDOS.filter((p) => p.company_id !== null),
  choferes: CHOFERES,
  fotos: { 'p-cola-1': 3, 'p-asig-1': 2 },
  clientes: { 'cli-1': 'Ana Pérez' },
};

const VISTAS = ['panel', 'pedidos', 'choferes', 'tarifas', 'detalle', 'marketing', 'ayuda', 'cuenta'] as const;
type Vista = (typeof VISTAS)[number];

// Estadísticas de ejemplo (30 días) para ver el panel de marketing.
const ESTADISTICAS: Estadisticas = {
  visitas: 4820,
  sesiones: 1960,
  registros: 212,
  pedidos: 138,
  completados: 117,
  por_dia: Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const finde = d.getDay() === 0 || d.getDay() === 6;
    return {
      dia,
      sesiones: Math.round(45 + i * 1.6 + (finde ? 22 : 0) + ((i * 37) % 13)),
      pedidos: Math.round(3 + i / 6),
    };
  }),
  dispositivos: { mobile: 1310, desktop: 560, tablet: 90 },
  sistemas: { Android: 980, iOS: 360, Windows: 420, macOS: 150, Linux: 50 },
  navegadores: { Chrome: 1240, Safari: 410, Samsung: 160, Edge: 90, Firefox: 60 },
  roles: { visitante: 1380, cliente: 450, chofer: 90, empresa: 40 },
  pantallas: [
    { pantalla: '/', n: 2100 },
    { pantalla: '/registro', n: 640 },
    { pantalla: '/cliente/inicio', n: 590 },
    { pantalla: '/cliente/opciones', n: 300 },
    { pantalla: '/cliente/pedidos/:id', n: 280 },
  ],
  zonas: [
    { zona: 'Mendoza', n: 52 },
    { zona: 'Godoy Cruz', n: 31 },
    { zona: 'Guaymallén', n: 24 },
    { zona: 'Luján de Cuyo', n: 15 },
    { zona: 'Maipú', n: 11 },
    { zona: 'Las Heras', n: 5 },
  ],
  tipos: { flete: 81, mudanza: 46, larga_distancia: 11 },
  horas: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((hora) => ({
    hora,
    n: Math.round(14 - Math.abs(hora - 11) * 1.4 + (hora === 18 ? 6 : 0)),
  })),
  anuncios: [
    { id: 'a1', titulo: '20% off en tu primera mudanza', activo: true, vistas: 920, clicks: 74 },
    { id: 'a2', titulo: 'Sumate como fletero', activo: false, vistas: 310, clicks: 18 },
  ],
};

export default function PreviewEmpresa() {
  const params = useLocalSearchParams<{ vista?: string; rol?: string; pedido?: string }>();
  // En producción, solo el superadmin ("Ver la app como…" del panel).
  const { role } = useAuth();
  if (!__DEV__ && role !== 'superadmin') return <Redirect href="/" />;
  const vista: Vista = VISTAS.find((v) => v === params.vista) ?? 'panel';
  const rol: UserRole = vista === 'marketing' ? 'marketing' : params.rol === 'superadmin' ? 'superadmin' : 'empresa';
  const detalle = PEDIDOS.find((p) => p.id === params.pedido) ?? PEDIDOS[2];
  const enViaje = EN_VIAJE.includes(detalle.estado);
  const choferDetalle = CHOFERES.find((c) => c.id === detalle.driver_id);

  // El menú y los links del panel cambian de sección dentro de la demo (no a
  // las pantallas reales, que sacarían al superadmin de la vista de usuario).
  const nav: NavEmpresa = {
    ir: (seccion) => {
      if ((VISTAS as readonly string[]).includes(seccion)) router.setParams({ vista: seccion, pedido: undefined });
      else avisar('Esa sección no está en la demo de empresa.');
    },
    abrirPedido: (id) => router.setParams({ vista: 'detalle', pedido: id }),
  };

  return (
    <AuthPreview value={{ role: rol, nombre: 'Empresa de ejemplo', companyId: rol === 'empresa' ? 'emp-1' : null }}>
      <NavEmpresaDemoContext.Provider value={nav}>
        <EmpresaPreviewContext.Provider value={rol === 'empresa' ? DATOS : { ...DATOS, empresa: null }}>
          <PedidoPreviewContext.Provider
            value={{
              pedido: detalle,
              chofer: enViaje ? (choferDetalle?.ubicacion_actual ?? null) : null,
              fotos: DATOS.fotos[detalle.id] ? FOTOS.slice(0, DATOS.fotos[detalle.id]) : [],
            }}>
            {/* Atajos solo en desarrollo, en una franja arriba (no tapan la barra de abajo). */}
            {__DEV__ ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.switcher}
                contentContainerStyle={styles.switcherContent}>
                {VISTAS.map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => router.setParams({ vista: v })}
                    style={[styles.chip, v === vista && styles.chipOn]}>
                    <Text style={[styles.chipText, v === vista && { color: colors.ink }]}>{v}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            <View style={{ flex: 1 }}>
              {vista === 'panel' ? <PanelEmpresa /> : null}
              {vista === 'pedidos' ? <PedidosEmpresa /> : null}
              {vista === 'choferes' ? <ChoferesEmpresa /> : null}
              {vista === 'ayuda' ? <AyudaEmpresa /> : null}
              {vista === 'cuenta' ? <CuentaEmpresa /> : null}
              {vista === 'tarifas' ? <TarifasEmpresa /> : null}
              {vista === 'detalle' ? <DetallePedidoEmpresa /> : null}
              {vista === 'marketing' ? (
                <MarketingPreviewContext.Provider value={ESTADISTICAS}>
                  <Marketing />
                </MarketingPreviewContext.Provider>
              ) : null}
            </View>
          </PedidoPreviewContext.Provider>
        </EmpresaPreviewContext.Provider>
      </NavEmpresaDemoContext.Provider>
    </AuthPreview>
  );
}

const styles = StyleSheet.create({
  switcher: { flexGrow: 0, backgroundColor: '#0B0E12' },
  switcherContent: { gap: 6, paddingHorizontal: 10, paddingVertical: 7 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white },
});
