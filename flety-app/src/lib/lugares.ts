import { MENDOZA } from '@/components/map/types';

import { supabase } from './supabase';
import type { GeoPoint } from './types';

// Lugares por nombre ("Wabi", "Hospital Central"): base abierta de Overture
// Maps + lugares que sugieren los usuarios y aprueba el equipo (migración
// 0023). Complementa la búsqueda de calles de Photon (lib/geocoding).

export type Lugar = {
  id: string;
  nombre: string;
  categoria: string | null;
  direccion: string | null;
  localidad: string | null;
  lat: number;
  lng: number;
  fuente: string;
};

// Dirección que queda guardada en el pedido: nombre del lugar + dónde está.
export function puntoDeLugar(l: Lugar): GeoPoint {
  const donde = [l.direccion, l.localidad].filter(Boolean).join(', ');
  return { lat: l.lat, lng: l.lng, direccion: donde ? `${l.nombre}, ${donde}` : l.nombre };
}

export async function buscarLugares(q: string, cerca?: { lat: number; lng: number } | null): Promise<Lugar[]> {
  const texto = q.trim();
  if (texto.length < 2) return [];
  const { data, error } = await supabase.rpc('buscar_lugares', {
    p_q: texto,
    p_lat: cerca?.lat ?? MENDOZA.lat,
    p_lng: cerca?.lng ?? MENDOZA.lng,
    p_limite: 5,
  });
  // Sin la migración 0023 (o sin sesión) solo se usa la búsqueda de calles.
  if (error) return [];
  return (data as Lugar[]) ?? [];
}

export async function sugerirLugar(nombre: string, punto: GeoPoint) {
  const { error } = await supabase.from('lugares_sugeridos').insert({
    nombre: nombre.trim(),
    direccion: punto.direccion?.slice(0, 200) ?? null,
    lat: punto.lat,
    lng: punto.lng,
  });
  if (error) {
    throw new Error(
      error.message.includes('máximo') ? error.message : 'No pudimos guardar el lugar. Probá de nuevo más tarde.'
    );
  }
}

// ── Superadmin ──────────────────────────────────────────────────────────
export type LugarSugerido = {
  id: string;
  nombre: string;
  direccion: string | null;
  lat: number;
  lng: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  created_at: string;
};

export async function lugaresSugeridos(estado: LugarSugerido['estado']): Promise<LugarSugerido[]> {
  const { data, error } = await supabase
    .from('lugares_sugeridos')
    .select('id, nombre, direccion, lat, lng, estado, created_at')
    .eq('estado', estado)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error('No pudimos cargar los lugares sugeridos. ¿Corriste la migración 0023?');
  return (data as LugarSugerido[]) ?? [];
}

export async function revisarLugar(id: string, aprobar: boolean, nombre?: string) {
  const { error } = await supabase.rpc('revisar_lugar_sugerido', {
    p_id: id,
    p_aprobar: aprobar,
    p_nombre: nombre ?? null,
  });
  if (error) throw new Error(error.message || 'No pudimos guardar la revisión.');
}
