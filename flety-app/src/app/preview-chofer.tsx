import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FOTOS_EJEMPLO } from '@/dev/datos-ejemplo';
import { ChoferPreviewContext, type DatosChofer } from '@/hooks/use-chofer';
import { PedidoPreviewContext } from '@/hooks/use-pedido-en-vivo';
import { AuthPreview } from '@/lib/auth';
import type { Pedido } from '@/lib/orders';
import { colors, fonts } from '@/theme';

import PanelChofer from './chofer/panel';

// SOLO DESARROLLO: la app del chofer con datos de ejemplo, sin iniciar sesión
// ni Supabase. ?estado=asignado|en_camino_origen|cargando|en_camino_destino|libre|sin-empresa
// (los botones que escriben en la base fallan acá, es esperado). En producción redirige al inicio.

const ESTADOS = ['asignado', 'en_camino_origen', 'cargando', 'en_camino_destino', 'libre', 'sin-empresa'] as const;

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
};

const CHOFER = {
  id: 'drv-1',
  company_id: 'emp-1',
  disponibilidad: true,
  ubicacion_actual: { lat: -32.8788, lng: -68.8303 },
  empresa: 'Fletes Cuyo',
};

export default function PreviewChofer() {
  const params = useLocalSearchParams<{ estado?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  const estado = ESTADOS.find((e) => e === params.estado) ?? 'asignado';

  const pedido = estado === 'libre' || estado === 'sin-empresa' ? null : { ...PEDIDO, estado };
  const datos: DatosChofer = {
    chofer: estado === 'sin-empresa' ? null : CHOFER,
    pedidos: pedido ? [pedido] : [],
    hechosHoy: 2,
    clientes: { 'cli-1': 'Ana Pérez' },
  };

  return (
    <AuthPreview value={{ role: 'chofer', nombre: 'Martín Gómez' }}>
      <ChoferPreviewContext.Provider value={datos}>
        <PedidoPreviewContext.Provider value={pedido ? { pedido, chofer: null, fotos: FOTOS_EJEMPLO } : null}>
          <View style={{ flex: 1 }}>
            <PanelChofer />
            <View style={styles.switcher}>
              {ESTADOS.map((e) => (
                <Pressable key={e} onPress={() => router.setParams({ estado: e })} style={[styles.chip, e === estado && styles.chipOn]}>
                  <Text style={[styles.chipText, e === estado && { color: colors.ink }]}>{e.replace(/_/g, ' ')}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </PedidoPreviewContext.Provider>
      </ChoferPreviewContext.Provider>
    </AuthPreview>
  );
}

const styles = StyleSheet.create({
  switcher: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: 360,
    gap: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.white },
});
