import type { FotoLocal } from '@/lib/pedido-draft';
import { supabase } from '@/lib/supabase';
import type { GeoPoint } from '@/lib/types';

import {
  PRESTADOR_COLS,
  SOLICITUD_COLS,
  type Adicional,
  type Catalogo,
  type Documento,
  type Dueno,
  type Empresa,
  type GruaAsignada,
  type Oferta,
  type Prestador,
  type Recargos,
  type ResultadoCotizar,
  type Solicitud,
  type Tarifa,
  type TipoDocumento,
  type Unidad,
  type Vehiculo,
  type Zona,
} from './tipos';

// Acceso a la base de Grúas (esquema "gruas"). Las reglas viven en la base:
// la app llama funciones (cotizar, solicitar, responder…) y lee con permisos.

const g = () => supabase.schema('gruas');

function errorDe(e: { message?: string } | null, porDefecto: string): Error {
  const m = e?.message ?? '';
  if (m.includes('schema must be one of') || m.includes('does not exist') || m.includes('schema cache')) {
    return new Error('Falta activar Grúas en la base de datos (migraciones 0020 a 0022).');
  }
  // Los mensajes de las funciones de la base ya están en español.
  if (m && !/^[a-z_ ]+$/.test(m) && !m.includes('violates') && !m.includes('permission')) return new Error(m);
  return new Error(porDefecto);
}

// ── Catálogo ─────────────────────────────────────────────────────────────
let catalogoCache: Catalogo | null = null;

export async function catalogo(forzar = false): Promise<Catalogo> {
  if (catalogoCache && !forzar) return catalogoCache;
  const [tipos, motivos, situaciones, modalidades, zonas] = await Promise.all([
    g().from('tipos_vehiculo').select('id, nombre, orden, activo').order('orden'),
    g().from('motivos').select('id, nombre, orden, activo, en_el_lugar').order('orden'),
    g().from('situaciones').select('id, nombre, orden, activo').order('orden'),
    g().from('modalidades').select('id, nombre, descripcion'),
    g()
      .from('zonas')
      .select('id, provincia, ciudad, lat, lng, radio_km, recargo_pct, comision_pct, activa')
      .order('provincia'),
  ]);
  const fallo = [tipos, motivos, situaciones, modalidades, zonas].find((r) => r.error);
  if (fallo) throw errorDe(fallo.error, 'No pudimos cargar Grúas.');
  catalogoCache = {
    tipos: tipos.data ?? [],
    motivos: motivos.data ?? [],
    situaciones: situaciones.data ?? [],
    modalidades: modalidades.data ?? [],
    zonas: (zonas.data as Zona[]) ?? [],
  };
  return catalogoCache;
}

export function nombreDe(lista: { id: string; nombre: string }[], id: string | null | undefined) {
  return lista.find((x) => x.id === id)?.nombre ?? id ?? '';
}

// ── Cliente ──────────────────────────────────────────────────────────────
export async function cotizar(p: {
  origen: GeoPoint;
  destino: GeoPoint | null;
  distanciaKm: number | null;
  tipo: string;
  situaciones: string[];
}): Promise<ResultadoCotizar> {
  const { data, error } = await g().rpc('cotizar', {
    p_origen: p.origen,
    p_destino: p.destino,
    p_distancia_km: p.distanciaKm,
    p_tipo: p.tipo,
    p_situaciones: p.situaciones,
  });
  if (error) throw errorDe(error, 'No pudimos calcular el precio.');
  return data as ResultadoCotizar;
}

export async function solicitar(p: {
  origen: GeoPoint;
  destino: GeoPoint | null;
  distanciaKm: number | null;
  tipo: string;
  vehiculo: Vehiculo;
  motivo: string;
  situaciones: string[];
  nota: string;
  precioMax: number | null;
  // Rutas en el bucket gruas-fotos (subirFotosGrua); al menos una.
  fotos: string[];
  // Grúa elegida por el cliente (si no, la más cercana).
  prestador?: string | null;
}): Promise<string> {
  const { data, error } = await g().rpc('solicitar', {
    p_origen: p.origen,
    p_destino: p.destino,
    p_distancia_km: p.distanciaKm,
    p_tipo: p.tipo,
    p_vehiculo: p.vehiculo,
    p_motivo: p.motivo,
    p_situaciones: p.situaciones,
    p_nota: p.nota,
    p_precio_max: p.precioMax,
    p_fotos: p.fotos,
    p_prestador: p.prestador ?? null,
  });
  if (error) throw errorDe(error, 'No pudimos pedir la grúa. Probá de nuevo.');
  return data as string;
}

export async function solicitud(id: string): Promise<Solicitud | null> {
  const { data } = await g().from('solicitudes').select(SOLICITUD_COLS).eq('id', id).maybeSingle();
  return (data as Solicitud | null) ?? null;
}

export async function misSolicitudes(clienteId: string): Promise<Solicitud[]> {
  const { data, error } = await g()
    .from('solicitudes')
    .select(SOLICITUD_COLS)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw errorDe(error, 'No pudimos cargar tus servicios de grúa.');
  return (data as Solicitud[]) ?? [];
}

export async function confirmarPrecio(id: string, precio: number) {
  const { error } = await g().rpc('confirmar_precio', { p_solicitud: id, p_precio_max: precio });
  if (error) throw errorDe(error, 'No pudimos confirmar el precio.');
}

export async function cancelar(id: string, motivo = '') {
  const { error } = await g().rpc('cancelar', { p_solicitud: id, p_motivo: motivo });
  if (error) throw errorDe(error, 'No pudimos cancelar.');
}

export async function revisar(id: string) {
  await g().rpc('revisar', { p_solicitud: id });
}

export async function gruaAsignada(id: string): Promise<GruaAsignada | null> {
  const { data, error } = await g().rpc('grua_asignada', { p_solicitud: id });
  if (error) return null;
  return (data as GruaAsignada | null) ?? null;
}

export async function calificar(id: string, estrellas: number, comentario: string) {
  const { error } = await g().rpc('calificar', { p_solicitud: id, p_estrellas: estrellas, p_comentario: comentario });
  if (error) throw errorDe(error, 'No pudimos guardar tu calificación.');
}

export async function miCalificacion(id: string): Promise<{ estrellas: number; comentario: string | null } | null> {
  const { data } = await g()
    .from('calificaciones')
    .select('estrellas, comentario')
    .eq('solicitud_id', id)
    .maybeSingle();
  return data ?? null;
}

export async function eventos(id: string): Promise<{ estado: string; created_at: string }[]> {
  const { data } = await g().from('eventos').select('estado, created_at').eq('solicitud_id', id).order('created_at');
  return data ?? [];
}

// ── Chat ─────────────────────────────────────────────────────────────────
export type MensajeGrua = { id: string; solicitud_id: string; autor_id: string; texto: string; created_at: string };

export async function mensajes(solicitudId: string): Promise<MensajeGrua[]> {
  const { data } = await g()
    .from('mensajes')
    .select('id, solicitud_id, autor_id, texto, created_at')
    .eq('solicitud_id', solicitudId)
    .order('created_at');
  return data ?? [];
}

export async function enviarMensaje(solicitudId: string, autorId: string, texto: string) {
  const { error } = await g()
    .from('mensajes')
    .insert({ solicitud_id: solicitudId, autor_id: autorId, texto: texto.trim() });
  if (error) throw errorDe(error, 'No pudimos enviar el mensaje.');
}

// ── Gruista ──────────────────────────────────────────────────────────────
export type MiGruista = {
  prestador: Prestador;
  empresa: Empresa | null;
  // Soy el dueño de la empresa (gestiono flota y tarifas).
  esDueno: boolean;
  unidad: Unidad | null;
  documentos: Documento[];
};

export async function miGruista(userId: string): Promise<MiGruista | null> {
  const { data: p, error } = await g().from('prestadores').select(PRESTADOR_COLS).eq('user_id', userId).maybeSingle();
  if (error) throw errorDe(error, 'No pudimos cargar tu cuenta de gruista.');
  if (!p) return null;
  const prestador = p as Prestador;
  const [emp, uni, docs] = await Promise.all([
    prestador.empresa_id
      ? g().from('empresas').select('*').eq('id', prestador.empresa_id).maybeSingle()
      : Promise.resolve({ data: null }),
    g()
      .from('unidades')
      .select('*')
      .eq('prestador_id', prestador.id)
      .eq('activa', true)
      .order('created_at', { ascending: false })
      .limit(1),
    g().from('documentos').select('*').eq('prestador_id', prestador.id).order('created_at', { ascending: false }),
  ]);
  const empresa = (emp.data as Empresa | null) ?? null;
  return {
    prestador,
    empresa,
    esDueno: !!empresa && empresa.owner_id === userId,
    unidad: ((uni.data as Unidad[] | null) ?? [])[0] ?? null,
    documentos: (docs.data as Documento[]) ?? [],
  };
}

export async function alta(p: {
  tipo: 'independiente' | 'empresa';
  empresaNombre: string;
  cuit: string;
  zonaId: string | null;
  telefono: string;
}) {
  const { error } = await g().rpc('alta', {
    p_tipo: p.tipo,
    p_empresa_nombre: p.empresaNombre,
    p_cuit: p.cuit,
    p_zona: p.zonaId,
    p_telefono: p.telefono,
  });
  if (error) throw errorDe(error, 'No pudimos completar el alta.');
}

export async function canjearInvitacion(code: string, telefono: string) {
  const { error } = await g().rpc('canjear_invitacion', { p_code: code, p_telefono: telefono });
  if (error) throw errorDe(error, 'El código no es válido.');
}

export async function setDisponible(prestadorId: string, disponible: boolean) {
  const { error } = await g().from('prestadores').update({ disponible }).eq('id', prestadorId);
  if (error) throw errorDe(error, 'No pudimos cambiar tu disponibilidad.');
}

export async function actualizarPerfil(
  prestadorId: string,
  cambios: { telefono?: string; zona_id?: string | null; foto?: string }
) {
  const { error } = await g().from('prestadores').update(cambios).eq('id', prestadorId);
  if (error) throw errorDe(error, 'No pudimos guardar los cambios.');
}

export async function actualizarUbicacion(lat: number, lng: number) {
  await g().rpc('actualizar_ubicacion', { p_lat: lat, p_lng: lng });
}

export async function ofertasVigentes(prestadorId: string): Promise<Oferta[]> {
  const { data } = await g()
    .from('ofertas')
    .select(
      'id, solicitud_id, prestador_id, cotizacion, precio_total, precio_prestador, comision, distancia_km, eta_min, estado, enviada_at, vence_at'
    )
    .eq('prestador_id', prestadorId)
    .eq('estado', 'enviada')
    .order('enviada_at', { ascending: false });
  return ((data as Oferta[]) ?? []).filter((o) => new Date(o.vence_at).getTime() > Date.now() - 2000);
}

export async function responderOferta(ofertaId: string, acepta: boolean) {
  const { error } = await g().rpc('responder_oferta', { p_oferta: ofertaId, p_acepta: acepta });
  if (error) throw errorDe(error, 'No pudimos responder la oferta.');
}

export async function avanzar(solicitudId: string, estado: string, pin?: string) {
  const { error } = await g().rpc('avanzar', { p_solicitud: solicitudId, p_estado: estado, p_pin: pin ?? null });
  if (error) throw errorDe(error, 'No pudimos avanzar el servicio.');
}

export async function serviciosDelGruista(prestadorId: string): Promise<Solicitud[]> {
  const { data, error } = await g()
    .from('solicitudes')
    .select(SOLICITUD_COLS)
    .eq('prestador_id', prestadorId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw errorDe(error, 'No pudimos cargar tus servicios.');
  return (data as Solicitud[]) ?? [];
}

export async function guardarUnidad(
  prestadorId: string,
  u: Omit<Unidad, 'id' | 'prestador_id' | 'activa'>,
  id?: string
) {
  const fila = { ...u, prestador_id: prestadorId, patente: u.patente.toUpperCase().trim(), activa: true };
  const { error } = id ? await g().from('unidades').update(fila).eq('id', id) : await g().from('unidades').insert(fila);
  if (error) throw errorDe(error, 'No pudimos guardar tu grúa. Revisá los datos.');
}

const DOCS_BUCKET = 'gruas-documentos';
const PERFILES_BUCKET = 'gruas-perfiles';
const FOTOS_BUCKET = 'gruas-fotos';

async function subir(bucket: string, path: string, foto: FotoLocal) {
  const body = foto.file ?? (await (await fetch(foto.uri)).arrayBuffer());
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType: foto.mimeType, upsert: false });
  if (error) throw new Error('No pudimos subir el archivo. Probá con otro (máx. 10 MB).');
}

export async function subirDocumento(
  prestadorId: string,
  tipo: TipoDocumento,
  vence: string | null,
  archivo: FotoLocal
) {
  const ext =
    archivo.mimeType === 'application/pdf' ? 'pdf' : (archivo.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg');
  const path = `${prestadorId}/${tipo}-${Date.now()}.${ext}`;
  await subir(DOCS_BUCKET, path, archivo);
  const { error } = await g().from('documentos').insert({ prestador_id: prestadorId, tipo, vence, archivo: path });
  if (error) {
    await supabase.storage.from(DOCS_BUCKET).remove([path]);
    throw errorDe(error, 'No pudimos guardar el documento.');
  }
}

export async function borrarDocumento(d: Documento) {
  const { error } = await g().from('documentos').delete().eq('id', d.id);
  if (error) throw errorDe(error, 'No pudimos borrar el documento.');
  await supabase.storage.from(DOCS_BUCKET).remove([d.archivo]);
}

export async function urlDocumento(path: string) {
  const { data } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

export async function cambiarFoto(prestadorId: string, foto: FotoLocal, anterior: string | null) {
  const ext = foto.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${prestadorId}/foto-${Date.now()}.${ext}`;
  await subir(PERFILES_BUCKET, path, foto);
  await actualizarPerfil(prestadorId, { foto: path });
  if (anterior) await supabase.storage.from(PERFILES_BUCKET).remove([anterior]);
  return path;
}

export function urlFoto(path: string | null | undefined) {
  if (!path) return null;
  return supabase.storage.from(PERFILES_BUCKET).getPublicUrl(path).data.publicUrl;
}

// ── Tarifas del dueño (empresa o gruista independiente) ─────────────────
// Columna y valor que identifican al dueño de las tarifas.
function dueno(d: Dueno): [string, string] {
  return d.empresa_id ? ['empresa_id', d.empresa_id] : ['prestador_id', d.prestador_id!];
}

export async function tarifasDe(d: Dueno) {
  const [col, val] = dueno(d);
  const [t, r, a] = await Promise.all([
    g().from('tarifas').select('*').eq(col, val),
    g().from('tarifa_recargos').select('*').eq(col, val),
    g().from('tarifa_adicionales').select('*').eq(col, val),
  ]);
  const fallo = [t, r, a].find((x) => x.error);
  if (fallo) throw errorDe(fallo.error, 'No pudimos cargar tus tarifas.');
  return {
    tarifas: (t.data as Tarifa[]) ?? [],
    recargos: ((r.data as Recargos[]) ?? [])[0] ?? null,
    adicionales: (a.data as Adicional[]) ?? [],
  };
}

export async function guardarTarifas(d: Dueno, tarifas: Tarifa[], recargos: Recargos, adicionales: Adicional[]) {
  const propio = { empresa_id: d.empresa_id, prestador_id: d.empresa_id ? null : d.prestador_id };
  const [col, val] = dueno(d);
  // Se reemplazan las del dueño (borrar + insertar).
  for (const tabla of ['tarifas', 'tarifa_recargos', 'tarifa_adicionales']) {
    const { error } = await g().from(tabla).delete().eq(col, val);
    if (error) throw errorDe(error, 'No pudimos guardar tus tarifas.');
  }
  const filas = tarifas.map((t) => ({
    ...propio,
    tipo_vehiculo: t.tipo_vehiculo,
    base: t.base,
    por_km: t.por_km,
    km_incluidos: t.km_incluidos,
    minimo: t.minimo,
  }));
  if (filas.length) {
    const { error } = await g().from('tarifas').insert(filas);
    if (error) throw errorDe(error, 'No pudimos guardar tus tarifas.');
  }
  const { error: er } = await g()
    .from('tarifa_recargos')
    .insert({
      ...propio,
      nocturno_pct: recargos.nocturno_pct,
      nocturno_desde: recargos.nocturno_desde,
      nocturno_hasta: recargos.nocturno_hasta,
      finde_pct: recargos.finde_pct,
    });
  if (er) throw errorDe(er, 'No pudimos guardar los recargos.');
  const ad = adicionales
    .filter((a) => a.monto > 0)
    .map((a) => ({ ...propio, situacion_id: a.situacion_id, monto: a.monto }));
  if (ad.length) {
    const { error } = await g().from('tarifa_adicionales').insert(ad);
    if (error) throw errorDe(error, 'No pudimos guardar los adicionales.');
  }
}

// ── Empresa de auxilio: flota e invitaciones ────────────────────────────
export async function flota(empresaId: string): Promise<(Prestador & { nombre: string | null })[]> {
  const { data, error } = await g()
    .from('prestadores')
    .select(PRESTADOR_COLS)
    .eq('empresa_id', empresaId)
    .order('created_at');
  if (error) throw errorDe(error, 'No pudimos cargar tu flota.');
  const lista = (data as Prestador[]) ?? [];
  const { data: users } = await supabase
    .from('users')
    .select('id, nombre')
    .in(
      'id',
      lista.map((p) => p.user_id)
    );
  return lista.map((p) => ({ ...p, nombre: users?.find((u) => u.id === p.user_id)?.nombre ?? null }));
}

export async function invitaciones(empresaId: string) {
  const { data } = await g()
    .from('invitaciones')
    .select('code, expires_at, used_at, created_at')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(10);
  return data ?? [];
}

export async function crearInvitacion(): Promise<string> {
  const { data, error } = await g().rpc('crear_invitacion');
  if (error) throw errorDe(error, 'No pudimos crear el código.');
  return (data as { code: string }).code;
}

// ── Superadmin ──────────────────────────────────────────────────────────
export async function config(): Promise<Record<string, unknown>> {
  const { data, error } = await g().from('config').select('clave, valor');
  if (error) throw errorDe(error, 'No pudimos cargar la configuración.');
  return Object.fromEntries((data ?? []).map((r) => [r.clave, r.valor]));
}

export async function guardarConfig(clave: string, valor: unknown) {
  const { error } = await g().from('config').upsert({ clave, valor, updated_at: new Date().toISOString() });
  if (error) throw errorDe(error, 'No pudimos guardar la configuración.');
}

export async function guardarZona(z: Partial<Zona> & { provincia: string; ciudad: string; lat: number; lng: number }) {
  const fila = {
    provincia: z.provincia.trim(),
    ciudad: z.ciudad.trim(),
    lat: z.lat,
    lng: z.lng,
    radio_km: z.radio_km ?? 40,
    recargo_pct: z.recargo_pct ?? 0,
    comision_pct: z.comision_pct ?? null,
    activa: z.activa ?? false,
  };
  const { error } = z.id ? await g().from('zonas').update(fila).eq('id', z.id) : await g().from('zonas').insert(fila);
  if (error) throw errorDe(error, 'No pudimos guardar la zona.');
  catalogoCache = null;
}

export type PrestadorAdmin = Prestador & {
  nombre: string | null;
  email: string | null;
  empresa: Empresa | null;
  unidad: Unidad | null;
  documentos: Documento[];
};

export async function prestadoresAdmin(): Promise<PrestadorAdmin[]> {
  const { data, error } = await g()
    .from('prestadores')
    .select(PRESTADOR_COLS)
    .order('created_at', { ascending: false });
  if (error) throw errorDe(error, 'No pudimos cargar los gruistas.');
  const lista = (data as Prestador[]) ?? [];
  if (!lista.length) return [];
  const ids = lista.map((p) => p.id);
  const [users, emps, unis, docs] = await Promise.all([
    supabase
      .from('users')
      .select('id, nombre, email')
      .in(
        'id',
        lista.map((p) => p.user_id)
      ),
    g().from('empresas').select('*'),
    g().from('unidades').select('*').in('prestador_id', ids).eq('activa', true),
    g().from('documentos').select('*').in('prestador_id', ids).order('created_at', { ascending: false }),
  ]);
  return lista.map((p) => {
    const u = users.data?.find((x) => x.id === p.user_id);
    return {
      ...p,
      nombre: u?.nombre ?? null,
      email: u?.email ?? null,
      empresa: ((emps.data as Empresa[]) ?? []).find((e) => e.id === p.empresa_id) ?? null,
      unidad: ((unis.data as Unidad[]) ?? []).find((x) => x.prestador_id === p.id) ?? null,
      documentos: ((docs.data as Documento[]) ?? []).filter((d) => d.prestador_id === p.id),
    };
  });
}

export async function verificarPrestador(id: string, estado: string, motivo = '') {
  const { error } = await g().rpc('verificar_prestador', { p_prestador: id, p_estado: estado, p_motivo: motivo });
  if (error) throw errorDe(error, 'No pudimos guardar.');
}

export async function verificarEmpresa(id: string, estado: string, motivo = '') {
  const { error } = await g().rpc('verificar_empresa', { p_empresa: id, p_estado: estado, p_motivo: motivo });
  if (error) throw errorDe(error, 'No pudimos guardar.');
}

export async function verificarDocumento(id: string, ok: boolean, motivo = '') {
  const { error } = await g().rpc('verificar_documento', { p_documento: id, p_ok: ok, p_motivo: motivo });
  if (error) throw errorDe(error, 'No pudimos guardar.');
}

export async function operaciones() {
  const [sol, pres] = await Promise.all([
    g()
      .from('solicitudes')
      .select(SOLICITUD_COLS)
      .in('estado', ['buscando', 'asignada', 'en_camino', 'en_origen', 'trasladando'])
      .order('created_at', { ascending: false }),
    g().from('prestadores').select(PRESTADOR_COLS).eq('estado', 'aprobado'),
  ]);
  if (sol.error) throw errorDe(sol.error, 'No pudimos cargar las operaciones.');
  return { solicitudes: (sol.data as Solicitud[]) ?? [], prestadores: (pres.data as Prestador[]) ?? [] };
}

export async function solicitudesRecientes(): Promise<Solicitud[]> {
  const { data } = await g()
    .from('solicitudes')
    .select(SOLICITUD_COLS)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data as Solicitud[]) ?? [];
}

export async function reporte(desde: Date): Promise<Record<string, unknown>> {
  const { data, error } = await g().rpc('reporte', { p_desde: desde.toISOString() });
  if (error) throw errorDe(error, 'No pudimos cargar el reporte.');
  return (data as Record<string, unknown>) ?? {};
}

// ── Fotos del vehículo (migración 0029) ─────────────────────────────────
// Se suben a <cliente_id>/… antes de pedir; solicitar() las asocia al pedido.
export async function subirFotosGrua(clienteId: string, fotos: FotoLocal[]): Promise<string[]> {
  const paths: string[] = [];
  for (const [i, foto] of fotos.entries()) {
    const ext = foto.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const path = `${clienteId}/${Date.now()}-${i}.${ext}`;
    await subir(FOTOS_BUCKET, path, foto);
    paths.push(path);
  }
  return paths;
}

export async function fotosDeSolicitud(solicitudId: string): Promise<{ path: string; url: string }[]> {
  const { data: filas } = await g().from('fotos').select('path').eq('solicitud_id', solicitudId).order('created_at');
  if (!filas?.length) return [];
  const paths = filas.map((f) => f.path as string);
  const { data } = await supabase.storage.from(FOTOS_BUCKET).createSignedUrls(paths, 3600);
  return (data ?? []).flatMap((d, i) => (d.signedUrl ? [{ path: paths[i], url: d.signedUrl }] : []));
}
