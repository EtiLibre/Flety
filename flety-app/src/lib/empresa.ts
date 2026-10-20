import type { LatLng } from '@/components/map/types';

import { EN_VIAJE } from './seguimiento';
import type { OrderEstado } from './state-machine';
import { supabase } from './supabase';
import type { Vehiculo } from './types';

// Datos del panel de empresas. Lo que cada uno puede ver/tocar lo deciden las
// políticas RLS y el trigger validate_order_transition (migraciones 0004/0008):
// estas funciones solo arman los pedidos a Supabase.

export type Empresa = { id: string; nombre: string; estado_aprobacion: 'pendiente' | 'aprobada' | 'rechazada' };

export type Chofer = {
  id: string;
  user_id: string;
  disponibilidad: boolean;
  vehiculo: { tipo?: Vehiculo; patente?: string } | null;
  ubicacion_actual: LatLng | null;
  nombre: string | null;
  email: string | null;
};

export const CHOFER_COLUMNS = 'id, user_id, disponibilidad, vehiculo, ubicacion_actual, user:users(nombre, email)';

export type ChoferRow = Omit<Chofer, 'nombre' | 'email'> & {
  user: { nombre: string | null; email: string | null } | { nombre: string | null; email: string | null }[] | null;
};

export function choferDeRow(row: ChoferRow): Chofer {
  const user = Array.isArray(row.user) ? row.user[0] : row.user;
  return {
    id: row.id,
    user_id: row.user_id,
    disponibilidad: row.disponibilidad,
    vehiculo: row.vehiculo,
    ubicacion_actual: row.ubicacion_actual,
    nombre: user?.nombre ?? null,
    email: user?.email ?? null,
  };
}

export function nombreChofer(chofer: Pick<Chofer, 'nombre' | 'email'>): string {
  return chofer.nombre || chofer.email?.split('@')[0] || 'Chofer';
}

export function iniciales(texto: string): string {
  const partes = texto.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || 'C';
}

// Pestañas de "Pedidos" en el panel.
export type GrupoPedidos = 'cola' | 'asignados' | 'en_curso' | 'historial';

export function grupoDelEstado(estado: OrderEstado): Exclude<GrupoPedidos, 'cola'> | null {
  if (estado === 'asignado') return 'asignados';
  if (EN_VIAJE.includes(estado) || estado === 'entregado' || estado === 'en_disputa') return 'en_curso';
  if (['confirmado', 'liquidado', 'cancelado_cliente', 'reembolsado'].includes(estado)) return 'historial';
  return null;
}

export type EstadoChofer = 'en_viaje' | 'disponible' | 'no_disponible';

export function estadoDelChofer(
  chofer: Chofer,
  pedidosActivos: { driver_id: string | null; estado: OrderEstado }[]
): EstadoChofer {
  if (pedidosActivos.some((p) => p.driver_id === chofer.id && EN_VIAJE.includes(p.estado))) return 'en_viaje';
  return chofer.disponibilidad ? 'disponible' : 'no_disponible';
}

// Traduce los errores del trigger/RLS a algo que se pueda mostrar.
function mensajeDeError(error: { message?: string } | null, fallback: string): string {
  const message = error?.message ?? '';
  if (message.startsWith('Solo ') || message.includes('no permitida')) return message;
  return fallback;
}

export async function aceptarPedido(orderId: string, companyId: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({ estado: 'asignado', company_id: companyId })
    .eq('id', orderId)
    .eq('estado', 'buscando_asignacion')
    .is('company_id', null)
    .select('id');
  if (error) throw new Error(mensajeDeError(error, 'No pudimos aceptar el pedido. Probá de nuevo.'));
  if (!data?.length) throw new Error('Otra empresa ya tomó este pedido.');
}

// asignado -> cancelado_empresa: el trigger lo devuelve solo a la cola.
export async function rechazarPedido(orderId: string) {
  const { error } = await supabase.from('orders').update({ estado: 'cancelado_empresa' }).eq('id', orderId);
  if (error) throw new Error(mensajeDeError(error, 'No pudimos rechazar el pedido. Probá de nuevo.'));
}

export async function asignarChofer(orderId: string, driverId: string) {
  const { error } = await supabase.from('orders').update({ driver_id: driverId }).eq('id', orderId);
  if (error) throw new Error(mensajeDeError(error, 'No pudimos asignar el chofer. Probá de nuevo.'));
}

// Solo superadmin: mientras no haya pagos reales (sección 10.1 del doc), el
// paso pendiente -> pagado se simula a mano y el pedido entra a la cola.
export async function simularPago(orderId: string) {
  const { error } = await supabase.from('orders').update({ estado: 'pagado' }).eq('id', orderId);
  if (error) throw new Error(mensajeDeError(error, 'No pudimos pasar el pedido a la cola.'));
}

// Cantidad de fotos por pedido (para la tabla).
export async function contarFotos(orderIds: string[]): Promise<Record<string, number>> {
  if (!orderIds.length) return {};
  const { data } = await supabase.from('order_photos').select('order_id').in('order_id', orderIds);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.order_id as string] = (counts[row.order_id as string] ?? 0) + 1;
  return counts;
}

// Nombres de los clientes de los pedidos tomados (policy de la migración 0008).
export async function nombresDeClientes(userIds: string[]): Promise<Record<string, string>> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return {};
  const { data } = await supabase.from('users').select('id, nombre, email').in('id', ids);
  const nombres: Record<string, string> = {};
  for (const u of data ?? []) nombres[u.id as string] = (u.nombre as string) || (u.email as string);
  return nombres;
}

// ── Invitaciones de choferes (migración 0009) ──────────────────────────────
export type Invitacion = { code: string; created_at: string; expires_at: string; used_at: string | null };

export async function crearInvitacion(): Promise<Invitacion> {
  const { data, error } = await supabase.rpc('crear_invitacion');
  if (error || !data)
    throw new Error(error?.message?.startsWith('Solo ') ? error.message : 'No pudimos crear el código.');
  return data as Invitacion;
}

// Códigos sin usar y vigentes de la empresa.
export async function invitacionesVigentes(): Promise<Invitacion[]> {
  const { data } = await supabase
    .from('company_invites')
    .select('code, created_at, expires_at, used_at')
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  return (data as Invitacion[] | null) ?? [];
}

export async function borrarInvitacion(code: string) {
  const { error } = await supabase.from('company_invites').delete().eq('code', code);
  if (error) throw new Error('No pudimos borrar el código.');
}

// ── Alta de empresa y aprobación (migración 0011) ───────────────────────────
export async function registrarEmpresa(nombre: string, cuit: string): Promise<string> {
  const { data, error } = await supabase.rpc('registrar_empresa', { p_nombre: nombre, p_cuit: cuit });
  if (error) {
    const msg = error.message ?? '';
    throw new Error(
      msg.startsWith('El ') || msg.startsWith('Esta ') || msg.startsWith('Tenés')
        ? msg
        : 'No pudimos registrar la empresa.'
    );
  }
  return data as string;
}

export type EmpresaAdmin = Empresa & { cuit: string | null; created_at: string };

export async function todasLasEmpresas(): Promise<EmpresaAdmin[]> {
  const { data } = await supabase
    .from('companies')
    .select('id, nombre, cuit, estado_aprobacion, created_at')
    .order('created_at', { ascending: false });
  return (data as EmpresaAdmin[] | null) ?? [];
}

export async function cambiarAprobacion(companyId: string, estado: Empresa['estado_aprobacion']) {
  const { error } = await supabase.from('companies').update({ estado_aprobacion: estado }).eq('id', companyId);
  if (error) throw new Error('No pudimos actualizar la empresa.');
}
