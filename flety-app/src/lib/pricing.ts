import { supabase } from './supabase';
import type { Vehiculo } from './types';

export type Tarifa = { vehiculo: Vehiculo; base: number; por_km: number; por_ayudante: number };

export async function fetchTarifas(): Promise<Tarifa[]> {
  const { data, error } = await supabase.from('tarifas').select('vehiculo, base, por_km, por_ayudante');
  if (error) throw error;
  return (data ?? []).map((t) => ({
    vehiculo: t.vehiculo as Vehiculo,
    base: Number(t.base),
    por_km: Number(t.por_km),
    por_ayudante: Number(t.por_ayudante),
  }));
}

// Misma fórmula que public.set_precio_estimado() (migración 0007), que es la
// que define el valor guardado. Esto es solo la vista previa.
export function precioEstimado(tarifa: Tarifa, km: number, ayudantes: number): number {
  const bruto = tarifa.base + tarifa.por_km * km + tarifa.por_ayudante * ayudantes;
  return Math.round(bruto / 100) * 100;
}

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function formatARS(value: number): string {
  return ars.format(value);
}
