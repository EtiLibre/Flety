import type { EstadoSolicitud, TipoDocumento } from './tipos';

// Cómo se muestran los estados de una solicitud de grúa.
export const ESTADO_GRUA: Record<EstadoSolicitud, { titulo: string; corto: string }> = {
  buscando: { titulo: 'Buscando una grúa', corto: 'Buscando grúa' },
  asignada: { titulo: 'Grúa asignada', corto: 'Asignada' },
  en_camino: { titulo: 'La grúa va en camino', corto: 'En camino' },
  en_origen: { titulo: 'La grúa llegó', corto: 'En el lugar' },
  trasladando: { titulo: 'Trasladando tu vehículo', corto: 'Trasladando' },
  finalizada: { titulo: 'Servicio finalizado', corto: 'Finalizado' },
  sin_grua: { titulo: 'No encontramos una grúa', corto: 'Sin grúa' },
  cancelada_cliente: { titulo: 'Servicio cancelado', corto: 'Cancelado' },
  cancelada_admin: { titulo: 'Servicio cancelado', corto: 'Cancelado' },
};

export const ESTADOS_ACTIVOS: EstadoSolicitud[] = ['buscando', 'asignada', 'en_camino', 'en_origen', 'trasladando'];
export const ESTADOS_EN_SERVICIO: EstadoSolicitud[] = ['asignada', 'en_camino', 'en_origen', 'trasladando'];

// Línea de tiempo del cliente.
export const PASOS_CLIENTE: { estados: EstadoSolicitud[]; label: string }[] = [
  { estados: ['buscando'], label: 'Solicitud enviada' },
  { estados: ['asignada'], label: 'Grúa asignada' },
  { estados: ['en_camino'], label: 'En camino' },
  { estados: ['en_origen'], label: 'En el lugar' },
  { estados: ['trasladando'], label: 'Trasladando' },
  { estados: ['finalizada'], label: 'Finalizado' },
];

// Botón grande de la app del gruista según la etapa.
export const PASOS_GRUISTA: Partial<
  Record<EstadoSolicitud, { hacia: EstadoSolicitud; boton: string; destino: 'origen' | 'destino' }>
> = {
  asignada: { hacia: 'en_camino', boton: 'Salir hacia el vehículo', destino: 'origen' },
  en_camino: { hacia: 'en_origen', boton: 'Llegué al vehículo', destino: 'origen' },
  en_origen: { hacia: 'trasladando', boton: 'Ya lo cargué, empezar traslado', destino: 'destino' },
  trasladando: { hacia: 'finalizada', boton: 'Entregué el vehículo', destino: 'destino' },
};

export const TIPO_DOCUMENTO: Record<TipoDocumento, { titulo: string; obligatorio: boolean; vence: boolean }> = {
  licencia: { titulo: 'Licencia de conducir profesional', obligatorio: true, vence: true },
  seguro: { titulo: 'Seguro de la grúa (responsabilidad civil)', obligatorio: true, vence: true },
  vtv: { titulo: 'VTV / RTO de la grúa', obligatorio: false, vence: true },
  habilitacion: { titulo: 'Habilitación municipal o provincial', obligatorio: false, vence: true },
  dni: { titulo: 'DNI', obligatorio: false, vence: false },
};

export function esFinal(e: EstadoSolicitud) {
  return !ESTADOS_ACTIVOS.includes(e);
}
