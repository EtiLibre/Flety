import type { LatLng } from '@/components/map/types';

import type { OrderEstado } from './state-machine';
import { supabase } from './supabase';
import type { Vehiculo } from './types';
import type { DatosVehiculo } from './vehiculos';

// App del chofer. Qué transición puede hacer lo decide el trigger
// validate_order_transition (migración 0004): solo el chofer asignado avanza
// el viaje, y en este orden.

export type PasoViaje = {
  desde: OrderEstado;
  hacia: OrderEstado;
  // Botón principal mientras el pedido está en `desde`.
  boton: string;
  // Indicación de arriba ("Dirigite al retiro"...).
  indicacion: string;
  // A dónde navegar en este tramo.
  destino: 'origen' | 'destino';
};

export const PASOS_VIAJE: PasoViaje[] = [
  {
    desde: 'asignado',
    hacia: 'en_camino_origen',
    boton: 'Salir hacia el retiro',
    indicacion: 'Retiro',
    destino: 'origen',
  },
  {
    desde: 'en_camino_origen',
    hacia: 'cargando',
    boton: 'Llegué al retiro',
    indicacion: 'Dirigite al retiro',
    destino: 'origen',
  },
  {
    desde: 'cargando',
    hacia: 'en_camino_destino',
    boton: 'Ya cargué, salir a la entrega',
    indicacion: 'Cargando en',
    destino: 'origen',
  },
  {
    desde: 'en_camino_destino',
    hacia: 'entregado',
    boton: 'Entregué la carga',
    indicacion: 'Dirigite a la entrega',
    destino: 'destino',
  },
];

// Barra de progreso del viaje (canvas "Chofer · viaje").
export const ETAPAS: { label: string; estados: OrderEstado[] }[] = [
  { label: 'Al retiro', estados: ['en_camino_origen'] },
  { label: 'Cargando', estados: ['cargando'] },
  { label: 'Al destino', estados: ['en_camino_destino'] },
  { label: 'Entregado', estados: ['entregado', 'confirmado', 'liquidado'] },
];

// Estados en los que el pedido es "del chofer" y está pendiente o en curso.
export const ESTADOS_ACTIVOS_CHOFER: OrderEstado[] = ['asignado', 'en_camino_origen', 'cargando', 'en_camino_destino'];

export type MiChofer = {
  id: string;
  company_id: string;
  disponibilidad: boolean;
  ubicacion_actual: LatLng | null;
  vehiculo: DatosVehiculo | null;
  empresa: string | null;
};

export async function miChofer(userId: string): Promise<MiChofer | null> {
  const { data } = await supabase
    .from('drivers')
    .select('id, company_id, disponibilidad, ubicacion_actual, vehiculo, company:companies(nombre)')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return null;
  const company = Array.isArray(data.company) ? data.company[0] : data.company;
  return {
    id: data.id,
    company_id: data.company_id,
    disponibilidad: data.disponibilidad,
    ubicacion_actual: data.ubicacion_actual,
    vehiculo: data.vehiculo,
    empresa: (company as { nombre?: string } | null)?.nombre ?? null,
  };
}

// El vehículo con el que aparece en el marketplace.
export async function guardarVehiculo(driverId: string, vehiculo: DatosVehiculo & { tipo: Vehiculo }) {
  // Solo los campos con valor (jsonb limpio).
  const limpio = Object.fromEntries(
    Object.entries({
      tipo: vehiculo.tipo,
      marca: vehiculo.marca?.trim(),
      modelo: vehiculo.modelo?.trim(),
      anio: vehiculo.anio?.trim(),
      color: vehiculo.color,
      patente: vehiculo.patente?.trim().toUpperCase(),
    }).filter(([, v]) => !!v)
  );
  const { error } = await supabase.from('drivers').update({ vehiculo: limpio }).eq('id', driverId);
  if (error) throw new Error('No pudimos guardar tu vehículo. Probá de nuevo.');
}

export async function cambiarDisponibilidad(driverId: string, disponible: boolean) {
  const { error } = await supabase.from('drivers').update({ disponibilidad: disponible }).eq('id', driverId);
  if (error) throw new Error('No pudimos cambiar tu disponibilidad. Probá de nuevo.');
}

export async function avanzarViaje(orderId: string, hacia: OrderEstado) {
  const { error } = await supabase.from('orders').update({ estado: hacia }).eq('id', orderId);
  if (error) {
    throw new Error(
      error.message?.startsWith('Solo ') ? error.message : 'No pudimos actualizar el viaje. Probá de nuevo.'
    );
  }
}

export async function enviarUbicacion(driverId: string, position: LatLng) {
  // Redondeo a ~1 m: alcanza para el mapa y no guarda más precisión de la necesaria.
  const ubicacion = { lat: Number(position.lat.toFixed(5)), lng: Number(position.lng.toFixed(5)) };
  await supabase.from('drivers').update({ ubicacion_actual: ubicacion }).eq('id', driverId);
}

export async function canjearInvitacion(codigo: string): Promise<string> {
  const { data, error } = await supabase.rpc('canjear_invitacion', { p_code: codigo });
  if (error) {
    const msg = error.message ?? '';
    throw new Error(
      msg.includes('código') || msg.startsWith('Ya sos') || msg.startsWith('Esta cuenta')
        ? msg
        : 'No pudimos usar el código. Probá de nuevo.'
    );
  }
  return (data as string) ?? 'tu empresa';
}

// Abre la navegación en Google Maps (en el celular abre la app si está instalada).
export function urlNavegacion(destino: LatLng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${destino.lat},${destino.lng}&travelmode=driving`;
}
