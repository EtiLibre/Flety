import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmpresaPreviewContext, type DatosEmpresa } from '@/hooks/use-empresa';
import { PedidoPreviewContext } from '@/hooks/use-pedido-en-vivo';
import { AuthPreview } from '@/lib/auth';
import type { Chofer } from '@/lib/empresa';
import type { Pedido } from '@/lib/orders';
import type { UserRole } from '@/lib/types';
import { FOTOS_EJEMPLO as FOTOS } from '@/dev/datos-ejemplo';
import { colors, fonts } from '@/theme';

import DetallePedidoEmpresa from './empresa/pedidos/[id]';
import PedidosEmpresa from './empresa/pedidos/index';
import PanelEmpresa from './empresa/panel';

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

const VISTAS = ['panel', 'pedidos', 'detalle', 'en-viaje'] as const;

export default function PreviewEmpresa() {
  const params = useLocalSearchParams<{ vista?: string; rol?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  const vista = VISTAS.find((v) => v === params.vista) ?? 'panel';
  const rol: UserRole = params.rol === 'superadmin' ? 'superadmin' : 'empresa';
  const detalle = vista === 'en-viaje' ? PEDIDOS[3] : PEDIDOS[2];

  return (
    <AuthPreview value={{ role: rol, nombre: 'Empresa de ejemplo', companyId: rol === 'empresa' ? 'emp-1' : null }}>
      <EmpresaPreviewContext.Provider value={rol === 'empresa' ? DATOS : { ...DATOS, empresa: null }}>
        <PedidoPreviewContext.Provider
          value={{
            pedido: detalle,
            chofer: vista === 'en-viaje' ? CHOFERES[1].ubicacion_actual : null,
            fotos: vista === 'en-viaje' ? [] : FOTOS,
          }}>
          <View style={{ flex: 1 }}>
            {vista === 'panel' ? <PanelEmpresa /> : null}
            {vista === 'pedidos' ? <PedidosEmpresa /> : null}
            {vista === 'detalle' || vista === 'en-viaje' ? <DetallePedidoEmpresa /> : null}
            <View style={styles.switcher}>
              {VISTAS.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => router.setParams({ vista: v })}
                  style={[styles.chip, v === vista && styles.chipOn]}>
                  <Text style={[styles.chipText, v === vista && { color: colors.ink }]}>{v}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </PedidoPreviewContext.Provider>
      </EmpresaPreviewContext.Provider>
    </AuthPreview>
  );
}

const styles = StyleSheet.create({
  switcher: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    gap: 6,
    padding: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(18,22,28,0.85)',
  },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white },
});
