import type { FotoLocal } from './pedido-draft';
import { supabase } from './supabase';

// Perfil del chofer (migración 0016).
// Público: nombre de pila + inicial, foto de perfil, calificaciones y vehículo.
// Privado (driver_datos): solo lo ven el chofer, su empresa y el superadmin.

export const PERFILES_BUCKET = 'perfiles';

export function urlFotoPerfil(path: string | null | undefined) {
  if (!path || !/^[0-9a-f-]{36}\/[\w.-]+$/i.test(path)) return null;
  return supabase.storage.from(PERFILES_BUCKET).getPublicUrl(path).data.publicUrl;
}

export type DatosPrivados = {
  dni: string;
  fecha_nacimiento: string; // AAAA-MM-DD
  telefono: string;
  domicilio: string;
  localidad: string;
  licencia_categoria: string;
  licencia_vencimiento: string; // AAAA-MM-DD
  emergencia_nombre: string;
  emergencia_telefono: string;
};

export const DATOS_VACIOS: DatosPrivados = {
  dni: '',
  fecha_nacimiento: '',
  telefono: '',
  domicilio: '',
  localidad: '',
  licencia_categoria: '',
  licencia_vencimiento: '',
  emergencia_nombre: '',
  emergencia_telefono: '',
};

const CAMPOS = Object.keys(DATOS_VACIOS) as (keyof DatosPrivados)[];

// Categorías de la licencia nacional de conducir que sirven para fletes.
export const CATEGORIAS_LICENCIA = ['B1', 'B2', 'C1', 'C2', 'C3', 'E1'];

export function completitud(d: DatosPrivados | null) {
  const hechos = d ? CAMPOS.filter((c) => d[c].trim()).length : 0;
  return { hechos, total: CAMPOS.length, completo: hechos === CAMPOS.length };
}

// "AAAA-MM-DD" <-> "DD/MM/AAAA"
export function fechaAVista(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export function fechaDeVista(v: string) {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) || d.getDate() !== Number(m[1]) ? null : iso;
}

// Mientras escribe: "01011990" -> "01/01/1990"
export function mascaraFecha(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 8);
  return [n.slice(0, 2), n.slice(2, 4), n.slice(4)].filter(Boolean).join('/');
}

export function edad(iso: string) {
  const n = new Date(`${iso}T12:00:00`);
  const hoy = new Date();
  let e = hoy.getFullYear() - n.getFullYear();
  if (hoy.getMonth() < n.getMonth() || (hoy.getMonth() === n.getMonth() && hoy.getDate() < n.getDate())) e -= 1;
  return e;
}

export async function datosPrivados(driverId: string): Promise<DatosPrivados | null> {
  const { data, error } = await supabase
    .from('driver_datos')
    .select(CAMPOS.join(', '))
    .eq('driver_id', driverId)
    .maybeSingle();
  if (error) throw new Error('No pudimos cargar los datos. ¿Corriste la migración 0016?');
  if (!data) return null;
  const row = data as unknown as Record<string, string | null>;
  return Object.fromEntries(CAMPOS.map((c) => [c, row[c] ?? ''])) as DatosPrivados;
}

export async function guardarDatosPrivados(driverId: string, d: DatosPrivados) {
  const fila = Object.fromEntries(CAMPOS.map((c) => [c, d[c].trim() || null]));
  const { error } = await supabase
    .from('driver_datos')
    .upsert({ driver_id: driverId, ...fila, updated_at: new Date().toISOString() });
  if (error) throw new Error('No pudimos guardar tus datos. Revisá que estén bien escritos.');
}

export async function fotoPerfil(driverId: string): Promise<string | null> {
  const { data } = await supabase.from('drivers').select('foto_perfil').eq('id', driverId).maybeSingle();
  return (data?.foto_perfil as string | null) ?? null;
}

// Sube la foto nueva, la deja como foto de perfil y borra la anterior.
export async function cambiarFotoPerfil(driverId: string, foto: FotoLocal, anterior: string | null) {
  const ext = foto.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${driverId}/perfil-${Date.now()}.${ext}`;
  const body = foto.file ?? (await (await fetch(foto.uri)).arrayBuffer());
  const { error } = await supabase.storage
    .from(PERFILES_BUCKET)
    .upload(path, body, { contentType: foto.mimeType, upsert: false });
  if (error) throw new Error('No pudimos subir la foto. Probá de nuevo.');
  const { error: rowError } = await supabase.from('drivers').update({ foto_perfil: path }).eq('id', driverId);
  if (rowError) {
    await supabase.storage.from(PERFILES_BUCKET).remove([path]);
    throw new Error('No pudimos guardar la foto. Probá de nuevo.');
  }
  if (anterior) await supabase.storage.from(PERFILES_BUCKET).remove([anterior]);
  return path;
}

export async function guardarNombre(userId: string, nombre: string) {
  const { error } = await supabase.from('users').update({ nombre: nombre.trim() }).eq('id', userId);
  if (error) throw new Error('No pudimos guardar tu nombre.');
}
