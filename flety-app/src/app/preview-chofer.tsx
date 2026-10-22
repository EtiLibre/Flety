import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FOTOS_EJEMPLO } from '@/dev/datos-ejemplo';
import { ChoferPreviewContext, PerfilPreviewContext, type DatosChofer } from '@/hooks/use-chofer';
import { PedidoPreviewContext } from '@/hooks/use-pedido-en-vivo';
import { AuthPreview, useAuth } from '@/lib/auth';
import type { Pedido } from '@/lib/orders';
import { colors, fonts } from '@/theme';

import PanelChofer from './chofer/panel';
import PerfilChofer from './chofer/perfil';

// SOLO DESARROLLO: la app del chofer con datos de ejemplo, sin iniciar sesión
// ni Supabase. ?estado=solicitud|asignado|en_camino_origen|cargando|en_camino_destino|libre|sin-empresa|vehiculo|perfil
// (los botones que escriben en la base fallan acá, es esperado). En producción redirige al inicio.

const ESTADOS = [
  'solicitud',
  'asignado',
  'en_camino_origen',
  'cargando',
  'en_camino_destino',
  'libre',
  'sin-empresa',
  'vehiculo',
  'perfil',
] as const;

const ETIQUETAS: Record<(typeof ESTADOS)[number], string> = {
  solicitud: 'Solicitud',
  asignado: 'Asignado',
  en_camino_origen: 'Yendo al retiro',
  cargando: 'Cargando',
  en_camino_destino: 'Yendo al destino',
  libre: 'Sin viaje',
  'sin-empresa': 'Sin empresa',
  vehiculo: 'Vehículo',
  perfil: 'Perfil',
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

  const pedido =
    estado === 'libre' ||
    estado === 'sin-empresa' ||
    estado === 'solicitud' ||
    estado === 'vehiculo' ||
    estado === 'perfil'
      ? null
      : { ...PEDIDO, estado };
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
        : estado === 'vehiculo'
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
            <View style={{ flex: 1 }}>
              <PerfilPreviewContext.Provider value={() => router.setParams({ estado: 'perfil' })}>
                {estado === 'perfil' ? <PerfilChofer /> : <PanelChofer />}
              </PerfilPreviewContext.Provider>
            </View>
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
