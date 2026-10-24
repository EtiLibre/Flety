import { supabase } from './supabase';

// Pagos de los fletes (migración 0018). El cliente le paga a la empresa al
// terminar el viaje: en efectivo al chofer o por transferencia a la empresa.

export type MetodoPago = 'efectivo' | 'transferencia' | 'mercadopago';
export type EstadoPago = 'informado' | 'confirmado' | 'rechazado';

export type Pago = {
  order_id: string;
  company_id: string | null;
  monto: number;
  metodo: MetodoPago;
  estado: EstadoPago;
  informado_por: 'cliente' | 'chofer' | 'empresa';
  referencia: string | null;
  created_at: string;
  confirmado_at: string | null;
};

export const METODO_LABEL: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  mercadopago: 'Mercado Pago',
};

// Cómo lo ve el cliente / la empresa.
export const ESTADO_PAGO: Record<EstadoPago | 'pendiente', { label: string; bg: string; fg: string }> = {
  pendiente: { label: 'Pendiente', bg: '#FEF3C7', fg: '#92400E' },
  informado: { label: 'Por confirmar', bg: '#E0E7FF', fg: '#3730A3' },
  confirmado: { label: 'Pagado', bg: '#DCFCE7', fg: '#166534' },
  rechazado: { label: 'No se recibió', bg: '#FEE2E2', fg: '#991B1B' },
};

// Desde que cargan las cosas ya se puede pagar (igual que flete_pagable en la base).
export const ESTADOS_PAGABLES = ['cargando', 'en_camino_destino', 'entregado', 'confirmado', 'liquidado', 'en_disputa'];

const COLS = 'order_id, company_id, monto, metodo, estado, informado_por, referencia, created_at, confirmado_at';

function normalizar(p: Pago): Pago {
  return { ...p, monto: Number(p.monto) };
}

function errorMigracion(message: string) {
  return message.includes('does not exist') || message.includes('schema cache');
}

export async function pagoDelFlete(orderId: string): Promise<Pago | null> {
  const { data } = await supabase.from('pagos').select(COLS).eq('order_id', orderId).maybeSingle();
  return data ? normalizar(data as Pago) : null;
}

// Estado de pago de varios fletes (para listas).
export async function pagosDeFletes(orderIds: string[]): Promise<Record<string, Pago>> {
  if (!orderIds.length) return {};
  const { data } = await supabase.from('pagos').select(COLS).in('order_id', orderIds);
  return Object.fromEntries(((data as Pago[]) ?? []).map((p) => [p.order_id, normalizar(p)]));
}

export async function informarPago(orderId: string, metodo: 'efectivo' | 'transferencia', referencia: string) {
  const { error } = await supabase.rpc('informar_pago', {
    p_order: orderId,
    p_metodo: metodo,
    p_referencia: referencia.trim() || null,
  });
  if (error) {
    throw new Error(
      errorMigracion(error.message)
        ? 'Falta actualizar la base de datos (migración 0018).'
        : error.message.startsWith('Este') || error.message.startsWith('Solo')
          ? error.message
          : 'No pudimos guardar el pago. Probá de nuevo.'
    );
  }
}

export async function registrarCobro(orderId: string, metodo: MetodoPago) {
  const { error } = await supabase.rpc('registrar_cobro', { p_order: orderId, p_metodo: metodo });
  if (error) {
    throw new Error(
      errorMigracion(error.message)
        ? 'Falta actualizar la base de datos (migración 0018).'
        : error.message.startsWith('Este') || error.message.startsWith('Solo')
          ? error.message
          : 'No pudimos registrar el cobro. Probá de nuevo.'
    );
  }
}

export async function rechazarPago(orderId: string) {
  const { error } = await supabase.rpc('rechazar_pago', { p_order: orderId });
  if (error) throw new Error('No pudimos marcar el pago. Probá de nuevo.');
}

// ── Datos de cobro de la empresa ─────────────────────────────────────────
export type DatosCobro = {
  nombre: string;
  cobro_alias: string | null;
  cobro_cbu: string | null;
  cobro_titular: string | null;
  cobro_banco: string | null;
  acepta_efectivo: boolean;
  acepta_transferencia: boolean;
};

export async function datosCobro(companyId: string): Promise<DatosCobro | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('nombre, cobro_alias, cobro_cbu, cobro_titular, cobro_banco, acepta_efectivo, acepta_transferencia')
    .eq('id', companyId)
    .maybeSingle();
  if (error) {
    // Sin la migración 0018: al menos el nombre de la empresa.
    const { data: base } = await supabase.from('companies').select('nombre').eq('id', companyId).maybeSingle();
    return base
      ? {
          nombre: base.nombre as string,
          cobro_alias: null,
          cobro_cbu: null,
          cobro_titular: null,
          cobro_banco: null,
          acepta_efectivo: true,
          acepta_transferencia: true,
        }
      : null;
  }
  return (data as DatosCobro | null) ?? null;
}

export async function guardarDatosCobro(companyId: string, d: Omit<DatosCobro, 'nombre'>) {
  const { error } = await supabase
    .from('companies')
    .update({
      cobro_alias: d.cobro_alias?.trim() || null,
      cobro_cbu: d.cobro_cbu?.replace(/\D/g, '') || null,
      cobro_titular: d.cobro_titular?.trim() || null,
      cobro_banco: d.cobro_banco?.trim() || null,
      acepta_efectivo: d.acepta_efectivo,
      acepta_transferencia: d.acepta_transferencia,
    })
    .eq('id', companyId);
  if (error) {
    throw new Error(
      errorMigracion(error.message)
        ? 'Falta actualizar la base de datos (migración 0018).'
        : 'No pudimos guardar los datos. Revisá el alias (6 a 20 caracteres) y el CBU/CVU (22 números).'
    );
  }
}

// ── Historiales ──────────────────────────────────────────────────────────
type Lugar = { direccion?: string } | null;

export type PagoConFlete = Pago & {
  empresa: string | null;
  flete: { tipo: string; origen: Lugar; destino: Lugar; created_at: string } | null;
};

type FilaPago = Pago & {
  company: { nombre: string } | { nombre: string }[] | null;
  order: PagoConFlete['flete'] | PagoConFlete['flete'][];
};

function conFlete(r: FilaPago): PagoConFlete {
  const c = Array.isArray(r.company) ? r.company[0] : r.company;
  const o = Array.isArray(r.order) ? r.order[0] : r.order;
  return { ...normalizar(r), empresa: c?.nombre ?? null, flete: o ?? null };
}

const COLS_HISTORIAL = `${COLS}, company:companies(nombre), order:orders(tipo, origen, destino, created_at)`;

export async function misPagos(clienteId: string): Promise<PagoConFlete[]> {
  const { data, error } = await supabase
    .from('pagos')
    .select(COLS_HISTORIAL)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });
  if (error)
    throw new Error(
      errorMigracion(error.message)
        ? 'Falta actualizar la base de datos (migración 0018).'
        : 'No pudimos cargar tus pagos.'
    );
  return ((data ?? []) as unknown as FilaPago[]).map(conFlete);
}

// Empresa (su empresa) o superadmin (todas).
export async function pagosDeEmpresa(companyId: string | null): Promise<PagoConFlete[]> {
  let q = supabase.from('pagos').select(COLS_HISTORIAL).order('created_at', { ascending: false }).limit(200);
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  if (error)
    throw new Error(
      errorMigracion(error.message)
        ? 'Falta actualizar la base de datos (migración 0018).'
        : 'No pudimos cargar los cobros.'
    );
  return ((data ?? []) as unknown as FilaPago[]).map(conFlete);
}

// Fletes ya calificados por el cliente (para avisar cuáles faltan).
export async function fletesCalificados(orderIds: string[]): Promise<Set<string>> {
  if (!orderIds.length) return new Set();
  const { data } = await supabase.from('calificaciones').select('order_id').in('order_id', orderIds);
  return new Set(((data as { order_id: string }[]) ?? []).map((c) => c.order_id));
}
