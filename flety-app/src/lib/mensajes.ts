import type { UserRole } from './types';
import { supabase } from './supabase';

// Chat del pedido entre el cliente, el chofer asignado y la empresa (migración 0011).
export type Mensaje = {
  id: string;
  order_id: string;
  autor_id: string;
  autor_rol: UserRole;
  texto: string;
  created_at: string;
};

const COLUMNAS = 'id, order_id, autor_id, autor_rol, texto, created_at';

export async function mensajesDelPedido(orderId: string): Promise<Mensaje[]> {
  const { data } = await supabase.from('mensajes').select(COLUMNAS).eq('order_id', orderId).order('created_at');
  return (data as Mensaje[] | null) ?? [];
}

export async function enviarMensaje(orderId: string, texto: string): Promise<Mensaje> {
  // autor_id y autor_rol los completa la base (trigger), no la app.
  const { data, error } = await supabase
    .from('mensajes')
    .insert({ order_id: orderId, texto })
    .select(COLUMNAS)
    .single();
  if (error || !data) throw new Error('No se pudo enviar el mensaje.');
  return data as Mensaje;
}

// Estados en los que se puede chatear (igual que chat_abierto en la base).
export const ESTADOS_CHAT = [
  'asignado',
  'en_camino_origen',
  'cargando',
  'en_camino_destino',
  'entregado',
  'en_disputa',
];

export const ROL_LABEL: Partial<Record<UserRole, string>> = {
  cliente: 'Cliente',
  chofer: 'Fletero',
  empresa: 'Empresa',
  superadmin: 'Flety',
};
