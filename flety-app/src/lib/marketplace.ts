import type { LatLng } from '@/components/map/types';

import type { Pedido } from './orders';
import type { Tarifa } from './pricing';
import { supabase } from './supabase';
import type { Vehiculo } from './types';

// Marketplace (migración 0010): fleteros disponibles cerca del retiro, con el
// precio de las tarifas de su empresa.

export type Fletero = {
  driver_id: string;
  nombre: string;
  empresa: string;
  company_id: string;
  vehiculo: Vehiculo;
  distancia_km: number;
  // Aproximada (~100 m).
  posicion: LatLng;
  precio: number | null;
  // Reputación (promedio de estrellas y cuántas calificaciones tiene).
  estrellas: number | null;
  calificaciones: number;
};

type FleteroRow = {
  driver_id: string;
  nombre: string;
  empresa: string;
  company_id: string;
  vehiculo: Vehiculo;
  distancia_km: number | string;
  lat: number;
  lng: number;
  precio: number | string | null;
  estrellas: number | string | null;
  calificaciones: number | null;
};

export async function fleterosDisponibles(
  origen: LatLng,
  km: number,
  ayudantes: number,
  vehiculo: Vehiculo
): Promise<Fletero[]> {
  const { data, error } = await supabase.rpc('fleteros_disponibles', {
    p_lat: origen.lat,
    p_lng: origen.lng,
    p_km: km,
    p_ayudantes: ayudantes,
    p_vehiculo: vehiculo,
  });
  if (error) throw error;
  return ((data as FleteroRow[] | null) ?? []).map((r) => ({
    driver_id: r.driver_id,
    nombre: r.nombre,
    empresa: r.empresa,
    company_id: r.company_id,
    vehiculo: r.vehiculo,
    distancia_km: Number(r.distancia_km),
    posicion: { lat: r.lat, lng: r.lng },
    precio: r.precio == null ? null : Number(r.precio),
    estrellas: r.estrellas == null ? null : Number(r.estrellas),
    calificaciones: r.calificaciones ?? 0,
  }));
}

// Minutos aproximados en llegar al retiro (ciudad, ~25 km/h promedio).
export function minutosHasta(distanciaKm: number) {
  return Math.max(2, Math.round((distanciaKm / 25) * 60));
}

// ── Reserva del fletero elegido ─────────────────────────────────────────
// El pedido está "reservado" para el fletero elegido hasta solicitado_hasta.
export function reservaVigente(
  p: Pick<Pedido, 'estado' | 'company_solicitada' | 'solicitado_hasta'>,
  ahora = Date.now()
) {
  return (
    p.estado === 'buscando_asignacion' &&
    !!p.company_solicitada &&
    !!p.solicitado_hasta &&
    new Date(p.solicitado_hasta).getTime() > ahora
  );
}

export function segundosRestantes(hasta: string | null, ahora = Date.now()) {
  if (!hasta) return 0;
  return Math.max(0, Math.round((new Date(hasta).getTime() - ahora) / 1000));
}

export function formatoCuenta(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// El elegido libera el pedido: pasa a la cola abierta.
export async function liberarSolicitud(orderId: string) {
  const { error } = await supabase
    .from('orders')
    .update({ company_solicitada: null, driver_solicitado: null })
    .eq('id', orderId);
  if (error) throw new Error('No pudimos liberar el pedido. Probá de nuevo.');
}

// El chofer elegido acepta: queda asignado a él y a su empresa.
export async function aceptarComoChofer(orderId: string, driverId: string, companyId: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({ estado: 'asignado', company_id: companyId, driver_id: driverId })
    .eq('id', orderId)
    .eq('estado', 'buscando_asignacion')
    .select('id');
  if (error) throw new Error(error.message?.startsWith('Solo ') ? error.message : 'No pudimos aceptar el viaje.');
  if (!data?.length) throw new Error('Ese viaje ya no está disponible.');
}

// ── Tarifas de la empresa ───────────────────────────────────────────────
export async function tarifasDeEmpresa(companyId: string): Promise<Tarifa[]> {
  const { data } = await supabase
    .from('company_tarifas')
    .select('vehiculo, base, por_km, por_ayudante')
    .eq('company_id', companyId);
  return (data ?? []).map((t) => ({
    vehiculo: t.vehiculo as Vehiculo,
    base: Number(t.base),
    por_km: Number(t.por_km),
    por_ayudante: Number(t.por_ayudante),
  }));
}

export async function guardarTarifas(companyId: string, tarifas: Tarifa[]) {
  const { error } = await supabase
    .from('company_tarifas')
    .upsert(tarifas.map((t) => ({ ...t, company_id: companyId, updated_at: new Date().toISOString() })));
  if (error) throw new Error('No pudimos guardar las tarifas. Probá de nuevo.');
}
