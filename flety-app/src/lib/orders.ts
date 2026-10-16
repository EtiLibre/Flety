import { distanciaEstimadaKm } from './distance';
import { programadoPara, type FotoLocal, type PedidoDraft } from './pedido-draft';
import type { OrderEstado } from './state-machine';
import { supabase } from './supabase';
import type { GeoPoint, Tamano, TipoServicio, Vehiculo } from './types';

export const FOTOS_BUCKET = 'pedido-fotos';

export type Pedido = {
  id: string;
  cliente_id: string;
  company_id: string | null;
  driver_id: string | null;
  tipo: TipoServicio;
  origen: GeoPoint | null;
  destino: GeoPoint | null;
  estado: OrderEstado;
  tamano: Tamano | null;
  ayudantes: number;
  programado_para: string | null;
  nota: string | null;
  vehiculo: Vehiculo | null;
  distancia_km: number | null;
  precio_estimado: number | null;
  created_at: string;
  // Marketplace (migración 0010): fletero elegido por el cliente y hasta cuándo lo tiene reservado.
  company_solicitada: string | null;
  driver_solicitado: string | null;
  solicitado_hasta: string | null;
};

export const PEDIDO_COLUMNS =
  'id, cliente_id, company_id, driver_id, tipo, origen, destino, estado, tamano, ayudantes, programado_para, nota, vehiculo, distancia_km, precio_estimado, created_at, company_solicitada, driver_solicitado, solicitado_hasta';

// Crea el pedido (queda en "pendiente") y sube las fotos. Si alguna foto falla,
// el pedido igual queda creado: se informa cuántas no se pudieron subir.
export async function crearPedido(
  draft: PedidoDraft,
  vehiculo: Vehiculo,
  clienteId: string,
  // Distancia por calles (ruteo). Si no está disponible, se estima en línea recta.
  distanciaKm?: number,
  // Fletero elegido en el marketplace (si no, va a la cola abierta).
  driverSolicitado?: string | null
): Promise<{ id: string; fotosFallidas: number }> {
  if (!draft.origen || !draft.destino) throw new Error('Falta origen o destino');

  const { data, error } = await supabase
    .from('orders')
    .insert({
      cliente_id: clienteId,
      tipo: draft.tipo,
      origen: draft.origen,
      destino: draft.destino,
      tamano: draft.tamano,
      ayudantes: draft.ayudantes,
      programado_para: programadoPara(draft.cuando)?.toISOString() ?? null,
      nota: draft.nota.trim() || null,
      vehiculo,
      distancia_km: distanciaKm ?? distanciaEstimadaKm(draft.origen, draft.destino),
      driver_solicitado: driverSolicitado ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    // Mensajes del trigger (p. ej. el fletero dejó de estar disponible) se muestran tal cual.
    const msg = error?.message ?? '';
    throw new Error(msg.startsWith('Ese ') ? msg : 'No pudimos crear el pedido. Revisá tu conexión y probá de nuevo.');
  }

  let fotosFallidas = 0;
  for (const [index, foto] of draft.fotos.entries()) {
    try {
      await subirFoto(data.id, foto, index);
    } catch {
      fotosFallidas += 1;
    }
  }

  return { id: data.id, fotosFallidas };
}

async function subirFoto(orderId: string, foto: FotoLocal, index: number) {
  const ext = foto.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${orderId}/${Date.now()}-${index}.${ext}`;
  const body = foto.file ?? (await (await fetch(foto.uri)).arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(FOTOS_BUCKET)
    .upload(path, body, { contentType: foto.mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const { error: rowError } = await supabase.from('order_photos').insert({ order_id: orderId, path });
  if (rowError) throw rowError;
}

// URLs firmadas (1 hora) de las fotos de un pedido. Storage solo las entrega si
// quien pregunta puede ver el pedido (políticas de la migración 0007).
export async function fotosDelPedido(orderId: string): Promise<string[]> {
  const { data: rows } = await supabase.from('order_photos').select('path').eq('order_id', orderId).order('created_at');
  if (!rows?.length) return [];
  const { data } = await supabase.storage.from(FOTOS_BUCKET).createSignedUrls(
    rows.map((r) => r.path as string),
    3600
  );
  return (data ?? []).flatMap((d) => (d.signedUrl ? [d.signedUrl] : []));
}
