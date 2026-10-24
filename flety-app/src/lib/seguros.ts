import { supabase } from './supabase';

// Seguros de los choferes (migración 0018). No hay un servicio público para
// consultar pólizas en Argentina: la app controla fechas y patente, y Flety
// verifica cada póliza a mano (certificado, app "Mi Seguro" de la SSN o la
// autogestión de la aseguradora).

export type TipoSeguro = 'automotor' | 'carga' | 'personas';
export type EstadoPoliza = 'pendiente' | 'verificada' | 'rechazada';
// Resumen por chofer (función estado_seguro).
export type EstadoSeguro = 'verificado' | 'por_vencer' | 'en_revision' | 'rechazado' | 'vencido' | 'sin_seguro';

export const SEGUROS_BUCKET = 'seguros';
export const DIAS_AVISO = 15;

export const TIPO_SEGURO: Record<TipoSeguro, { titulo: string; detalle: string }> = {
  automotor: {
    titulo: 'Responsabilidad civil del vehículo',
    detalle: 'Obligatorio por ley para circular. Es el que pide Flety.',
  },
  carga: { titulo: 'Carga transportada', detalle: 'Cubre las cosas del cliente durante el viaje.' },
  personas: { titulo: 'Accidentes personales', detalle: 'Para vos y tus ayudantes.' },
};

export const ESTADO_SEGURO: Record<EstadoSeguro, { label: string; bg: string; fg: string }> = {
  verificado: { label: 'Seguro verificado', bg: '#DCFCE7', fg: '#166534' },
  por_vencer: { label: 'Seguro por vencer', bg: '#FEF3C7', fg: '#92400E' },
  en_revision: { label: 'Seguro en revisión', bg: '#E0E7FF', fg: '#3730A3' },
  rechazado: { label: 'Póliza rechazada', bg: '#FEE2E2', fg: '#991B1B' },
  vencido: { label: 'Seguro vencido', bg: '#FEE2E2', fg: '#991B1B' },
  sin_seguro: { label: 'Sin seguro cargado', bg: '#F3F4F6', fg: '#4B5563' },
};

// Aseguradoras frecuentes en autos y utilitarios (sugerencias; se puede escribir otra).
export const ASEGURADORAS = [
  'La Segunda',
  'Sancor Seguros',
  'Federación Patronal',
  'San Cristóbal',
  'Mercantil Andina',
  'Rivadavia Seguros',
  'Allianz',
  'Zurich',
  'La Caja',
  'Rus',
  'Mapfre',
  'Provincia Seguros',
  'Galicia Seguros',
  'Río Uruguay Seguros',
  'Cooperación Seguros',
  'Integrity Seguros',
];

// Accesos para verificar (públicos).
export const LINKS_VERIFICACION = {
  miSeguro: 'https://www.argentina.gob.ar/aplicaciones/mi-seguro',
  aseguradorasHabilitadas: 'https://seguro2.ssn.gob.ar/sujetoshabilitados',
  seguroDigital: 'https://www.argentina.gob.ar/miargentina/servicios/seguro-digital-de-tu-vehiculo',
};

export type Poliza = {
  id: string;
  company_id: string;
  driver_id: string | null;
  tipo: TipoSeguro;
  aseguradora: string;
  numero_poliza: string;
  patente: string | null;
  vigencia_desde: string;
  vigencia_hasta: string;
  archivo: string;
  estado: EstadoPoliza;
  motivo_rechazo: string | null;
  verificado_at: string | null;
  created_at: string;
};

const COLS =
  'id, company_id, driver_id, tipo, aseguradora, numero_poliza, patente, vigencia_desde, vigencia_hasta, archivo, estado, motivo_rechazo, verificado_at, created_at';

function errorMigracion(message: string) {
  return message.includes('does not exist') || message.includes('schema cache');
}

// ¿Ya empezó la vigencia?
export function empezoVigencia(desde: string) {
  return new Date(`${desde}T00:00:00`).getTime() <= Date.now();
}

// Días que faltan para que venza (negativo: vencida).
export function diasParaVencer(hasta: string) {
  const fin = new Date(`${hasta}T23:59:59`);
  return Math.ceil((fin.getTime() - Date.now()) / 86_400_000);
}

// Estado de una póliza como lo ve el usuario.
export function estadoPoliza(p: Poliza): EstadoSeguro {
  const dias = diasParaVencer(p.vigencia_hasta);
  const empezo = new Date(`${p.vigencia_desde}T00:00:00`).getTime() <= Date.now();
  if (dias < 0) return 'vencido';
  if (p.estado === 'rechazada') return 'rechazado';
  if (p.estado === 'pendiente') return 'en_revision';
  if (!empezo) return 'en_revision';
  return dias <= DIAS_AVISO ? 'por_vencer' : 'verificado';
}

// Resumen del chofer a partir de sus pólizas (igual que estado_seguro en la base).
export function resumenSeguro(polizas: Poliza[]): EstadoSeguro {
  const auto = polizas.filter((p) => p.tipo === 'automotor');
  if (!auto.length) return 'sin_seguro';
  const estados = auto.map(estadoPoliza);
  for (const e of ['verificado', 'por_vencer', 'en_revision', 'rechazado'] as const) if (estados.includes(e)) return e;
  return 'vencido';
}

export async function polizasDelChofer(driverId: string): Promise<Poliza[]> {
  const { data, error } = await supabase
    .from('seguros')
    .select(COLS)
    .eq('driver_id', driverId)
    .order('vigencia_hasta', { ascending: false });
  if (error) {
    throw new Error(
      errorMigracion(error.message)
        ? 'Falta actualizar la base de datos (migración 0018).'
        : 'No pudimos cargar tus pólizas.'
    );
  }
  return (data as Poliza[]) ?? [];
}

export type ArchivoLocal = { uri: string; mimeType: string; name: string; file?: File };

export async function cargarPoliza(
  datos: {
    companyId: string;
    driverId: string | null;
    tipo: TipoSeguro;
    aseguradora: string;
    numero: string;
    patente: string;
    desde: string; // AAAA-MM-DD
    hasta: string;
  },
  archivo: ArchivoLocal
) {
  const ext =
    archivo.mimeType === 'application/pdf' ? 'pdf' : (archivo.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg');
  const path = `${datos.companyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const body = archivo.file ?? (await (await fetch(archivo.uri)).arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(SEGUROS_BUCKET)
    .upload(path, body, { contentType: archivo.mimeType, upsert: false });
  if (upErr) {
    throw new Error(
      errorMigracion(upErr.message) || upErr.message.includes('Bucket not found')
        ? 'Falta actualizar la base de datos (migración 0018).'
        : 'No pudimos subir el archivo. Probá con otra foto o PDF (máx. 10 MB).'
    );
  }
  const { error } = await supabase.from('seguros').insert({
    company_id: datos.companyId,
    driver_id: datos.driverId,
    tipo: datos.tipo,
    aseguradora: datos.aseguradora.trim(),
    numero_poliza: datos.numero.trim(),
    patente: datos.patente.trim() || null,
    vigencia_desde: datos.desde,
    vigencia_hasta: datos.hasta,
    archivo: path,
  });
  if (error) {
    await supabase.storage.from(SEGUROS_BUCKET).remove([path]);
    throw new Error('No pudimos guardar la póliza. Revisá los datos y probá de nuevo.');
  }
}

export async function borrarPoliza(p: Poliza) {
  const { error } = await supabase.from('seguros').delete().eq('id', p.id);
  if (error) throw new Error('No pudimos borrar la póliza.');
  await supabase.storage.from(SEGUROS_BUCKET).remove([p.archivo]);
}

// Link temporal (10 min) para ver el certificado.
export async function urlArchivoPoliza(path: string) {
  const { data } = await supabase.storage.from(SEGUROS_BUCKET).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

// ── Flety (superadmin) ───────────────────────────────────────────────────
export type PolizaAdmin = Poliza & {
  empresa: string | null;
  chofer: string | null;
  patente_vehiculo: string | null;
};

export async function polizasParaVerificar(): Promise<PolizaAdmin[]> {
  const { data, error } = await supabase
    .from('seguros')
    .select(`${COLS}, company:companies(nombre), driver:drivers(vehiculo, user:users(nombre))`)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    throw new Error(
      errorMigracion(error.message)
        ? 'Falta actualizar la base de datos (migración 0018).'
        : 'No pudimos cargar las pólizas.'
    );
  }
  type Fila = Poliza & {
    company: { nombre: string } | { nombre: string }[] | null;
    driver: {
      vehiculo: { patente?: string } | null;
      user: { nombre: string | null } | { nombre: string | null }[] | null;
    } | null;
  };
  return ((data ?? []) as unknown as Fila[]).map((r) => {
    const c = Array.isArray(r.company) ? r.company[0] : r.company;
    const d = Array.isArray(r.driver) ? r.driver[0] : r.driver;
    const u = d ? (Array.isArray(d.user) ? d.user[0] : d.user) : null;
    return {
      ...r,
      empresa: c?.nombre ?? null,
      chofer: u?.nombre ?? null,
      patente_vehiculo: d?.vehiculo?.patente ?? null,
    };
  });
}

export async function verificarPoliza(id: string, ok: boolean, motivo?: string) {
  const { error } = await supabase.rpc('verificar_seguro', { p_id: id, p_ok: ok, p_motivo: motivo ?? null });
  if (error) throw new Error('No pudimos guardar la verificación.');
}

export async function exigeSeguro(): Promise<boolean> {
  const { data } = await supabase.from('config').select('valor').eq('clave', 'exigir_seguro').maybeSingle();
  return data?.valor === true;
}

export async function cambiarExigirSeguro(valor: boolean) {
  const { error } = await supabase
    .from('config')
    .upsert({ clave: 'exigir_seguro', valor, updated_at: new Date().toISOString() });
  if (error) throw new Error('No pudimos cambiar la configuración.');
}

// "AE 123 FT" == "ae123ft"
export function mismaPatente(a: string | null | undefined, b: string | null | undefined) {
  const n = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return !!n(a) && n(a) === n(b);
}
