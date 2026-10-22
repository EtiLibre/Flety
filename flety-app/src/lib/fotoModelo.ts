import { Platform } from 'react-native';

import { supabase } from './supabase';
import type { DatosVehiculo, FotoModelo } from './vehiculos';

// Fotos reales del vehículo:
// 1. las que subió el chofer (bucket público "vehiculos", migración 0015);
// 2. si no subió, una foto de referencia del modelo de Wikimedia Commons
//    (libre, con autor y licencia, que hay que mostrar);
// 3. si tampoco hay, la app muestra el dibujo generado.

export const VEHICULOS_BUCKET = 'vehiculos';

export function urlFotoVehiculo(path: string) {
  return supabase.storage.from(VEHICULOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

// Solo rutas guardadas en storage (nunca URLs arbitrarias).
function rutasValidas(fotos: unknown): string[] {
  if (!Array.isArray(fotos)) return [];
  return fotos.filter((f): f is string => typeof f === 'string' && /^[0-9a-f-]{36}\/[\w.-]+$/i.test(f)).slice(0, 3);
}

const HOST_FOTOS = /^https:\/\/(upload|thumb)\.wikimedia\.org\//;

// Solo fotos de Wikimedia Commons.
export function fotoModeloValida(f: unknown): FotoModelo | null {
  if (!f || typeof f !== 'object') return null;
  const x = f as Partial<FotoModelo>;
  if (typeof x.url !== 'string' || !HOST_FOTOS.test(x.url)) return null;
  if (typeof x.pagina !== 'string' || !x.pagina.startsWith('https://commons.wikimedia.org/')) return null;
  return {
    url: x.url,
    pagina: x.pagina,
    autor: String(x.autor ?? '').slice(0, 120),
    licencia: String(x.licencia ?? ''),
  };
}

export type FotoResuelta =
  | { tipo: 'propia'; urls: string[] }
  | { tipo: 'modelo'; foto: FotoModelo }
  | { tipo: 'buscar'; marca: string; modelo: string }
  | { tipo: 'dibujo' };

// Qué mostrar para un vehículo, sin pedir nada a la red todavía.
export function resolverFoto(v: DatosVehiculo | null | undefined): FotoResuelta {
  if (!v) return { tipo: 'dibujo' };
  const propias = rutasValidas(v.fotos);
  if (propias.length) return { tipo: 'propia', urls: propias.map(urlFotoVehiculo) };
  if (v.foto_modelo === 'ninguna') return { tipo: 'dibujo' };
  const modelo = fotoModeloValida(v.foto_modelo);
  if (modelo) return { tipo: 'modelo', foto: modelo };
  // Cargado antes de que existieran las fotos (o fletero de ejemplo): se busca.
  if (v.marca && v.modelo) return { tipo: 'buscar', marca: v.marca, modelo: v.modelo };
  return { tipo: 'dibujo' };
}

// ── Búsqueda en Wikimedia Commons ─────────────────────────────────────────

const API = 'https://commons.wikimedia.org/w/api.php';

// Palabras del modelo que no ayudan a buscar ("F-100 con caja" -> "F-100").
const RELLENO = new Set([
  'con',
  'caja',
  'cerrada',
  'furgon',
  'furgón',
  'doble',
  'simple',
  'cabina',
  'chasis',
  'utilitario',
  'camioneta',
  'camion',
  'camión',
  'pickup',
  'pick-up',
]);

// Fotos que no muestran el vehículo entero (choques, interiores, detalles…).
const EXCLUIR =
  /\b(crash|wreck|accident|unfall|interior|innenraum|cockpit|dashboard|armaturen\w*|engine|logo|badge|emblem|details?|wheels?|felgen?|rear|heck|trunk|kofferraum|headlights?|taillights?|lego|toys?|diecast|scale model|modell|burnt|burned|fire|rally|racing)\b/i;

const compacto = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

function palabrasModelo(modelo: string) {
  return modelo
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w && !RELLENO.has(w.toLowerCase()));
}

function textoPlano(html: string) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type Pagina = {
  title: string;
  index: number;
  imageinfo?: {
    mime: string;
    width: number;
    height: number;
    thumburl?: string;
    descriptionurl: string;
    extmetadata?: Record<string, { value: string }>;
  }[];
};

const cache = new Map<string, Promise<FotoModelo[]>>();
const CLAVE_LOCAL = 'flety:fotos-modelo:v2';

function leerLocal(): Record<string, FotoModelo[]> {
  if (Platform.OS !== 'web') return {};
  try {
    return JSON.parse(localStorage.getItem(CLAVE_LOCAL) ?? '{}');
  } catch {
    return {};
  }
}

function guardarLocal(clave: string, fotos: FotoModelo[]) {
  if (Platform.OS !== 'web') return;
  try {
    const todo = leerLocal();
    todo[clave] = fotos;
    // Solo las últimas 40 búsquedas.
    const recortado = Object.fromEntries(Object.entries(todo).slice(-40));
    localStorage.setItem(CLAVE_LOCAL, JSON.stringify(recortado));
  } catch {
    // Sin almacenamiento (modo privado): no pasa nada, se vuelve a buscar.
  }
}

// Hasta `max` fotos del modelo, las más parecidas primero. Nunca falla: si no
// hay red o no encuentra nada, devuelve [].
export function fotosDelModelo(marca: string, modelo: string, anio?: string, max = 4): Promise<FotoModelo[]> {
  const palabras = palabrasModelo(modelo);
  const marcaPrincipal = marca.trim().split(/[\s-]+/)[0] ?? '';
  if (!palabras.length || marcaPrincipal.length < 2) return Promise.resolve([]);
  const clave = compacto(`${marca}|${palabras.join(' ')}|${anio ?? ''}`);

  const enCache = cache.get(clave);
  if (enCache) return enCache.then((f) => f.slice(0, max));
  const local = leerLocal()[clave];
  if (local) {
    cache.set(clave, Promise.resolve(local));
    return Promise.resolve(local.slice(0, max));
  }

  const pedido = buscar(marca, marcaPrincipal, palabras, anio)
    .then((fotos) => {
      if (fotos.length) guardarLocal(clave, fotos);
      return fotos;
    })
    .catch(() => {
      cache.delete(clave);
      return [] as FotoModelo[];
    });
  cache.set(clave, pedido);
  return pedido.then((f) => f.slice(0, max));
}

async function buscar(marca: string, marcaPrincipal: string, palabras: string[], anio?: string) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${marca} ${palabras[0]}`,
    gsrnamespace: '6',
    gsrlimit: '30',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '800',
    iiextmetadatafilter: 'Artist|LicenseShortName',
  });
  const res = await fetch(`${API}?${params}`, {
    headers: Platform.OS === 'web' ? undefined : { 'User-Agent': 'FletyApp/1.0 (https://flety-nine.vercel.app)' },
  });
  if (!res.ok) throw new Error(`Commons ${res.status}`);
  const json = (await res.json()) as { query?: { pages?: Record<string, Pagina> } };
  const paginas = Object.values(json.query?.pages ?? {});

  const claveModelo = compacto(palabras[0]);
  const resto = palabras.slice(1).map(compacto);
  const claveMarca = compacto(marcaPrincipal);
  const anioNum = Number(anio);

  return (
    paginas
      .flatMap((p) => {
        const info = p.imageinfo?.[0];
        if (!info?.thumburl || info.mime !== 'image/jpeg') return [];
        const titulo = p.title.replace(/^File:/, '');
        const t = compacto(titulo);
        if (!t.includes(claveModelo) || EXCLUIR.test(titulo)) return [];
        const ratio = info.width / info.height;
        if (ratio < 1.15 || ratio > 2.4 || info.width < 640) return [];

        // Puntaje: marca y resto del modelo en el nombre, año cercano, vista de costado/frente.
        let puntos = 30 - p.index;
        if (t.includes(claveMarca)) puntos += 20;
        puntos += resto.filter((r) => r && t.includes(r)).length * 8;
        const anioFoto = Number(titulo.match(/\b(19[5-9]\d|20[0-4]\d)\b/)?.[1]);
        if (anioNum && anioFoto) {
          const dif = Math.abs(anioNum - anioFoto);
          puntos += dif <= 6 ? 15 - dif * 2 : dif > 12 ? -25 : 0;
        }
        // Un vehículo moderno no se parece a uno de colección.
        if (anioNum >= 1990 && /oldtimer|classic|vintage|antique|clásico|us-car/i.test(titulo)) puntos -= 25;
        if (/side|seite|lateral|front|frente|vorne/i.test(titulo)) puntos += 6;

        const meta = info.extmetadata ?? {};
        const foto: FotoModelo = {
          // Sin los parámetros de seguimiento.
          url: info.thumburl.split('?')[0],
          pagina: info.descriptionurl,
          autor: textoPlano(meta.Artist?.value ?? '').slice(0, 120) || 'Autor en Wikimedia Commons',
          licencia: textoPlano(meta.LicenseShortName?.value ?? ''),
        };
        return fotoModeloValida(foto) ? [{ foto, puntos }] : [];
      })
      .sort((a, b) => b.puntos - a.puntos)
      .map((x) => x.foto)
      // Sin fotos casi iguales (misma serie del mismo autor).
      .filter(
        (f, i, todas) =>
          todas.findIndex((o) => o.autor === f.autor && o.pagina.slice(0, 60) === f.pagina.slice(0, 60)) === i
      )
      .slice(0, 8)
  );
}
