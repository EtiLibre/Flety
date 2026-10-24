import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FOTOS_EJEMPLO } from '@/dev/datos-ejemplo';
import { BarraInferior } from '@/components/nav/BarraInferior';
import { ChoferPreviewContext, type DatosChofer } from '@/hooks/use-chofer';
import { ViajesPreviewContext } from '@/hooks/use-mis-viajes';
import { NavChoferDemoContext, TABS_CHOFER, type DestinoChofer, type TabChofer } from '@/hooks/use-nav-chofer';
import { PedidoPreviewContext } from '@/hooks/use-pedido-en-vivo';
import { AuthPreview, useAuth } from '@/lib/auth';
import type { Pedido } from '@/lib/orders';
import { colors, fonts } from '@/theme';

import AyudaChofer from './chofer/ayuda';
import CuentaChofer from './chofer/cuenta';
import PanelChofer from './chofer/panel';
import PerfilChofer from './chofer/perfil';
import SeguroChofer from './chofer/seguro';
import VehiculoChofer from './chofer/vehiculo';
import MisViajes from './chofer/viajes';

// SOLO DESARROLLO: la app del chofer con datos de ejemplo, sin iniciar sesión
// ni Supabase. ?estado=solicitud|asignado|en_camino_origen|cargando|en_camino_destino|libre|sin-empresa|sin-vehiculo|viajes|ayuda|cuenta|perfil|vehiculo|seguro
// (los botones que escriben en la base fallan acá, es esperado). En producción redirige al inicio.

const ESTADOS = [
  'solicitud',
  'asignado',
  'en_camino_origen',
  'cargando',
  'en_camino_destino',
  'libre',
  'sin-empresa',
  'sin-vehiculo',
  'viajes',
  'ayuda',
  'cuenta',
  'perfil',
  'vehiculo',
  'seguro',
] as const;


const ETIQUETAS: Record<(typeof ESTADOS)[number], string> = {
  solicitud: 'Solicitud',
  asignado: 'Asignado',
  en_camino_origen: 'Yendo al retiro',
  cargando: 'Cargando',
  en_camino_destino: 'Yendo al destino',
  libre: 'Sin viaje',
  'sin-empresa': 'Sin empresa',
  'sin-vehiculo': 'Sin vehículo',
  viajes: 'Mis viajes',
  ayuda: 'Ayuda',
  cuenta: 'Cuenta',
  perfil: 'Perfil',
  vehiculo: 'Mi vehículo',
  seguro: 'Mi seguro',
};

const PEDIDO: Pedido = {
  id: 'p-chofer-1',
  cliente_id: 'cli-1',
  company_id: 'emp-1',
  driver_id: 'drv-1',
  tipo: 'mudanza',
  tamano: 'mediano',
  ayudantes: 1,
  origen: { lat: -32.8893605, lng: -68.8391999, direccion: 'Avenida General San Martín 1200, Mendoza' },
  destino: { lat: -32.8924301, lng: -68.8549776, direccion: 'Arístides Villanueva 300, Mendoza' },
  estado: 'asignado',
  programado_para: null,
  nota: 'Es un segundo piso por escalera. Hay que desarmar la cama.',
  vehiculo: 'camioneta',
  distancia_km: 2.1,
  precio_estimado: 39500,
  created_at: new Date().toISOString(),
  company_solicitada: null,
  driver_solicitado: null,
  solicitado_hasta: null,
};

// Reserva de ejemplo: ~4,5 minutos desde que se abre la vista previa.
const RESERVA_HASTA = new Date(Date.now() + 4 * 60_000 + 32_000).toISOString();

// Historial de ejemplo para "Mis viajes".
function haceDias(dias: number, hora: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, 15, 0, 0);
  return d.toISOString();
}

const VIAJES: Pedido[] = [
  { ...PEDIDO, id: 'v1', estado: 'confirmado', created_at: haceDias(0, 9), precio_estimado: 39500 },
  {
    ...PEDIDO,
    id: 'v2',
    tipo: 'flete',
    tamano: 'chico',
    estado: 'liquidado',
    created_at: haceDias(1, 16),
    distancia_km: 6.4,
    precio_estimado: 31700,
    origen: { lat: -32.9, lng: -68.85, direccion: 'Belgrano 450, Godoy Cruz' },
    destino: { lat: -32.88, lng: -68.8, direccion: 'Bandera de los Andes 2100, Guaymallén' },
  },
  {
    ...PEDIDO,
    id: 'v3',
    estado: 'cancelado_cliente',
    created_at: haceDias(2, 11),
    precio_estimado: 45200,
  },
  {
    ...PEDIDO,
    id: 'v4',
    tipo: 'mudanza',
    tamano: 'grande',
    ayudantes: 2,
    estado: 'liquidado',
    created_at: haceDias(4, 8),
    distancia_km: 11.8,
    precio_estimado: 78900,
    origen: { lat: -32.95, lng: -68.86, direccion: 'San Martín Sur 800, Luján de Cuyo' },
    destino: { lat: -32.89, lng: -68.84, direccion: 'Sarmiento 120, Mendoza' },
  },
];

const CHOFER = {
  id: 'drv-1',
  company_id: 'emp-1',
  disponibilidad: true,
  ubicacion_actual: { lat: -32.8788, lng: -68.8303 },
  vehiculo: { tipo: 'camioneta' as const, patente: 'AE 123 FT' },
  empresa: 'Fletes Cuyo',
};

export default function PreviewChofer() {
  const params = useLocalSearchParams<{ estado?: string }>();
  // En producción, solo el superadmin ("Ver la app como…" del panel).
  const { role } = useAuth();
  if (!__DEV__ && role !== 'superadmin') return <Redirect href="/" />;
  const estado = ESTADOS.find((e) => e === params.estado) ?? 'asignado';
  // Las pestañas y los accesos de Cuenta cambian de pantalla dentro de la demo.
  const ir = (d: DestinoChofer) => router.setParams({ estado: d === 'panel' ? 'asignado' : d });
  const tab: TabChofer | null =
    estado === 'perfil' || estado === 'vehiculo' || estado === 'seguro'
      ? null
      : estado === 'viajes' || estado === 'ayuda' || estado === 'cuenta'
        ? estado
        : 'panel';

  // Solo los estados de viaje tienen un pedido en curso.
  const pedido: Pedido | null =
    estado === 'asignado' || estado === 'en_camino_origen' || estado === 'cargando' || estado === 'en_camino_destino'
      ? { ...PEDIDO, estado }
      : null;
  // Un cliente lo eligió en el marketplace: reserva de 5 minutos.
  const solicitud: Pedido | null =
    estado === 'solicitud'
      ? {
          ...PEDIDO,
          id: 'p-solicitud',
          estado: 'buscando_asignacion',
          company_id: null,
          driver_id: null,
          company_solicitada: 'emp-1',
          driver_solicitado: 'drv-1',
          solicitado_hasta: RESERVA_HASTA,
        }
      : null;
  const datos: DatosChofer = {
    chofer:
      estado === 'sin-empresa'
        ? null
        : estado === 'sin-vehiculo'
          ? // Sin tipo cargado: muestra el formulario del vehículo (fotos y foto del modelo).
            { ...CHOFER, vehiculo: { marca: 'Renault', modelo: 'Kangoo', anio: '2021', color: 'rojo' as const } }
          : CHOFER,
    pedidos: pedido ? [pedido] : [],
    solicitudes: solicitud ? [solicitud] : [],
    hechosHoy: 2,
    clientes: { 'cli-1': 'Ana Pérez' },
  };

  return (
    <AuthPreview value={{ role: 'chofer', nombre: 'Martín Gómez' }}>
      <ChoferPreviewContext.Provider value={datos}>
        <PedidoPreviewContext.Provider value={pedido ? { pedido, chofer: null, fotos: FOTOS_EJEMPLO } : null}>
          <View style={{ flex: 1 }}>
            {/* Selector de estados de ejemplo: una franja arriba (no flota sobre la app). */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.switcher}
              contentContainerStyle={styles.switcherContent}>
              {ESTADOS.map((e) => (
                <Pressable
                  key={e}
                  accessibilityRole="button"
                  accessibilityState={{ selected: e === estado }}
                  onPress={() => router.setParams({ estado: e })}
                  style={[styles.chip, e === estado && styles.chipOn]}>
                  <Text style={[styles.chipText, e === estado && { color: colors.ink }]}>{ETIQUETAS[e]}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <NavChoferDemoContext.Provider value={ir}>
              <ViajesPreviewContext.Provider value={VIAJES}>
                <View style={{ flex: 1 }}>
                  {estado === 'viajes' ? (
                    <MisViajes />
                  ) : estado === 'ayuda' ? (
                    <AyudaChofer />
                  ) : estado === 'cuenta' ? (
                    <CuentaChofer />
                  ) : estado === 'perfil' ? (
                    <PerfilChofer />
                  ) : estado === 'vehiculo' ? (
                    <VehiculoChofer />
                  ) : estado === 'seguro' ? (
                    <SeguroChofer />
                  ) : (
                    <PanelChofer />
                  )}
                </View>
                {tab ? <BarraInferior items={TABS_CHOFER} activo={tab} onIr={ir} tema="oscuro" /> : null}
              </ViajesPreviewContext.Provider>
            </NavChoferDemoContext.Provider>
          </View>
        </PedidoPreviewContext.Provider>
      </ChoferPreviewContext.Provider>
    </AuthPreview>
  );
}

const styles = StyleSheet.create({
  switcher: { flexGrow: 0, backgroundColor: '#0B0E12', borderBottomWidth: 1, borderBottomColor: '#2A313B' },
  switcherContent: { gap: 6, paddingHorizontal: 10, paddingVertical: 7 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: '#1A1F26' },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white },
});
