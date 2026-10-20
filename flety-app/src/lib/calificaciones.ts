import { supabase } from './supabase';

// Calificación del cliente a la empresa/chofer de un pedido (migración 0011).
export type Calificacion = { estrellas: number; comentario: string | null };

export async function miCalificacion(orderId: string): Promise<Calificacion | null> {
  const { data } = await supabase
    .from('calificaciones')
    .select('estrellas, comentario')
    .eq('order_id', orderId)
    .maybeSingle();
  return (data as Calificacion | null) ?? null;
}

export async function calificar(orderId: string, estrellas: number, comentario: string) {
  const { error } = await supabase
    .from('calificaciones')
    .insert({ order_id: orderId, estrellas, comentario: comentario.trim() || null });
  if (error) throw new Error('No pudimos guardar tu calificación. Probá de nuevo.');
}
