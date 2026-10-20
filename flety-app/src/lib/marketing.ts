import { createContext } from 'react';

import { supabase } from './supabase';

// Panel de marketing (migración 0013): todo llega agregado desde la base.
export type Estadisticas = {
  visitas: number;
  sesiones: number;
  registros: number;
  pedidos: number;
  completados: number;
  por_dia: { dia: string; sesiones: number; pedidos: number }[];
  dispositivos: Record<string, number>;
  sistemas: Record<string, number>;
  navegadores: Record<string, number>;
  roles: Record<string, number>;
  pantallas: { pantalla: string; n: number }[];
  zonas: { zona: string; n: number }[];
  tipos: Record<string, number>;
  horas: { hora: number; n: number }[];
  anuncios: { id: string; titulo: string; activo: boolean; vistas: number; clicks: number }[];
};

// SOLO DESARROLLO: estadísticas de ejemplo para /preview-empresa?vista=marketing.
export const MarketingPreviewContext = createContext<Estadisticas | null>(null);

export async function estadisticas(desde: Date): Promise<Estadisticas> {
  const { data, error } = await supabase.rpc('estadisticas_marketing', { p_desde: desde.toISOString() });
  if (error)
    throw new Error(error.message?.startsWith('Solo ') ? error.message : 'No pudimos cargar las estadísticas.');
  return data as Estadisticas;
}

// Record -> lista ordenada de mayor a menor (para las barras).
export function ordenar(r: Record<string, number> | null | undefined, etiquetas?: Record<string, string>) {
  return Object.entries(r ?? {})
    .map(([k, n]) => ({ label: etiquetas?.[k] ?? k, n: Number(n) }))
    .sort((a, b) => b.n - a.n);
}

export const DISPOSITIVO_LABEL: Record<string, string> = {
  mobile: 'Celular',
  tablet: 'Tablet',
  desktop: 'Computadora',
};
export const ROL_LABEL: Record<string, string> = {
  visitante: 'Visitantes',
  cliente: 'Clientes',
  chofer: 'Choferes',
  empresa: 'Empresas',
  superadmin: 'Admin',
  contabilidad: 'Contabilidad',
  marketing: 'Marketing',
};
export const PANTALLA_LABEL: Record<string, string> = {
  '/': 'Landing',
  '/login': 'Login',
  '/registro': 'Registro',
  '/cliente/inicio': 'Inicio del cliente',
  '/cliente/opciones': 'Elegir vehículo/fletero',
  '/cliente/pedidos': 'Mis pedidos',
  '/cliente/pedidos/:id': 'Seguimiento',
  '/chofer/panel': 'App del chofer',
  '/empresa/panel': 'Panel de empresa',
};

// ── Anuncios ────────────────────────────────────────────────────────────
export type Audiencia = 'visitante' | 'cliente' | 'chofer' | 'empresa';

export type Anuncio = {
  id: string;
  titulo: string;
  texto: string | null;
  imagen_url: string | null;
  cta_texto: string | null;
  cta_url: string | null;
  audiencia: Audiencia[];
  activo: boolean;
  desde: string | null;
  hasta: string | null;
  created_at: string;
};

const COLUMNAS = 'id, titulo, texto, imagen_url, cta_texto, cta_url, audiencia, activo, desde, hasta, created_at';

export async function todosLosAnuncios(): Promise<Anuncio[]> {
  const { data } = await supabase.from('anuncios').select(COLUMNAS).order('created_at', { ascending: false });
  return (data as Anuncio[] | null) ?? [];
}

export async function guardarAnuncio(a: Partial<Anuncio> & { titulo: string }) {
  const fila = {
    titulo: a.titulo.trim(),
    texto: a.texto?.trim() || null,
    imagen_url: a.imagen_url?.trim() || null,
    cta_texto: a.cta_texto?.trim() || null,
    cta_url: a.cta_url?.trim() || null,
    audiencia: a.audiencia ?? ['visitante', 'cliente'],
    activo: a.activo ?? false,
    desde: a.desde ?? null,
    hasta: a.hasta ?? null,
  };
  const { error } = a.id
    ? await supabase.from('anuncios').update(fila).eq('id', a.id)
    : await supabase.from('anuncios').insert(fila);
  if (error) {
    throw new Error(
      error.message?.includes('check')
        ? 'Revisá los datos: la imagen tiene que ser un link https y el link del botón, https o /ruta.'
        : 'No pudimos guardar el anuncio.'
    );
  }
}

export async function borrarAnuncio(id: string) {
  const { error } = await supabase.from('anuncios').delete().eq('id', id);
  if (error) throw new Error('No pudimos borrar el anuncio.');
}

// El anuncio vigente para esta audiencia (la base ya filtra activos y fechas).
export async function anuncioPara(audiencia: Audiencia): Promise<Anuncio | null> {
  const { data } = await supabase
    .from('anuncios')
    .select(COLUMNAS)
    .contains('audiencia', [audiencia])
    .order('created_at', { ascending: false })
    .limit(1);
  return ((data as Anuncio[] | null) ?? [])[0] ?? null;
}

export function registrarEventoAnuncio(anuncioId: string, tipo: 'vista' | 'click' | 'cierre') {
  supabase
    .from('anuncio_eventos')
    .insert({ anuncio_id: anuncioId, tipo })
    .then(() => {});
}
