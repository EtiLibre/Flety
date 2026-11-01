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
      /máximo|personal/.test(error.message) ? error.message : 'No pudimos guardar el lugar. Probá de nuevo más tarde.'
    );
  }
}

// ¿Nombre de un lugar personal? (mismo criterio que public.es_nombre_personal, 0031)
const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const PARIENTES = 'mama|papa|abuela|abuelo|abuelos|suegra|suegro|suegros|novia|novio|tia|tio|hermana|hermano';
const PERSONALES = [
  /^(casa|hogar|trabajo|laburo|oficina|depto|dpto|departamento|domicilio|aca|aqui|home|work)$/,
  /^(mi|mis) (casa|hogar|trabajo|laburo|oficina|depto|dpto|departamento|lugar|domicilio)/,
  new RegExp(
    `^(la )?(casa|depto|dpto|departamento|lo) (de|del) (mi |mis |la |el )?(${PARIENTES}|hijo|hija|amiga|amigo)( |$)`
  ),
  new RegExp(`^(${PARIENTES})$`),
  /^[0-9 ]+$/,
];
export function esNombrePersonal(nombre: string) {
  const t = normalizar(nombre);
  return PERSONALES.some((re) => re.test(t));
}

// ── Lugares guardados (privados: Casa, Trabajo…), migración 0031 ──
export type LugarGuardado = { id: string; etiqueta: string; direccion: string | null; lat: number; lng: number };

export async function misLugares(): Promise<LugarGuardado[]> {
  const { data, error } = await supabase
    .from('lugares_guardados')
    .select('id, etiqueta, direccion, lat, lng')
    .order('created_at');
  if (error) return [];
  return (data as LugarGuardado[]) ?? [];
}

export function puntoDeGuardado(g: LugarGuardado): GeoPoint {
  return { lat: g.lat, lng: g.lng, direccion: g.direccion ?? g.etiqueta };
}

export function coincideGuardado(g: LugarGuardado, q: string) {
  const t = normalizar(q);
  return !t || normalizar(g.etiqueta).includes(t) || normalizar(g.direccion ?? '').includes(t);
}

// Guarda (o reemplaza, si ya había uno con ese nombre) un lugar propio.
export async function guardarLugar(etiqueta: string, punto: GeoPoint) {
  const nombre = etiqueta.trim();
  const fila = { etiqueta: nombre, direccion: punto.direccion?.slice(0, 200) ?? null, lat: punto.lat, lng: punto.lng };
  const existente = (await misLugares()).find((g) => normalizar(g.etiqueta) === normalizar(nombre));
  const { error } = existente
    ? await supabase.from('lugares_guardados').update(fila).eq('id', existente.id)
    : await supabase.from('lugares_guardados').insert(fila);
  if (error) {
    throw new Error(error.message.includes('15 lugares') ? error.message : 'No pudimos guardar el lugar.');
  }
}

export async function borrarLugar(id: string) {
  const { error } = await supabase.from('lugares_guardados').delete().eq('id', id);
  if (error) throw new Error('No pudimos borrar el lugar.');
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
