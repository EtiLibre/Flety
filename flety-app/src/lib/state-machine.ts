import type { UserRole } from './types';

// Espejo (para la UI) del trigger validate_order_transition de
// supabase/migrations/0004, que es la única autoridad real: si esto se
// desincroniza, el peor caso es un botón que falla al confirmar, no un agujero.
export const ORDER_ESTADOS = [
  'pendiente',
  'pagado',
  'buscando_asignacion',
  'asignado',
  'en_camino_origen',
  'cargando',
  'en_camino_destino',
  'entregado',
  'confirmado',
  'liquidado',
  'cancelado_cliente',
  'cancelado_empresa',
  'en_disputa',
  'reembolsado',
] as const;

export type OrderEstado = (typeof ORDER_ESTADOS)[number];

export const ESTADO_LABELS: Record<OrderEstado, string> = {
  pendiente: 'Pedido recibido',
  pagado: 'Pagado',
  buscando_asignacion: 'Buscando empresa',
  asignado: 'Empresa asignada',
  en_camino_origen: 'Chofer en camino al retiro',
  cargando: 'Cargando',
  en_camino_destino: 'En camino al destino',
  entregado: 'Entregado',
  confirmado: 'Confirmado',
  liquidado: 'Finalizado',
  cancelado_cliente: 'Cancelado',
  cancelado_empresa: 'Rechazado por la empresa',
  en_disputa: 'En revisión',
  reembolsado: 'Reembolsado',
};

// Estados donde el pedido ya terminó (para separar activos de historial).
export const TERMINAL_ESTADOS: OrderEstado[] = ['confirmado', 'liquidado', 'cancelado_cliente', 'reembolsado'];

// Línea de tiempo que ve el cliente, en orden.
export const TIMELINE: { estados: OrderEstado[]; label: string }[] = [
  { estados: ['pendiente', 'pagado'], label: 'Pedido recibido' },
  { estados: ['buscando_asignacion'], label: 'Buscando empresa' },
  { estados: ['asignado'], label: 'Empresa asignada' },
  { estados: ['en_camino_origen'], label: 'En camino al retiro' },
  { estados: ['cargando'], label: 'Cargando' },
  { estados: ['en_camino_destino'], label: 'En camino al destino' },
  { estados: ['entregado', 'confirmado', 'liquidado'], label: 'Entregado' },
];

export type OrderActionContext = {
  role: UserRole;
  isCliente: boolean;
  isEmpresaDuena: boolean;
  isChoferAsignado: boolean;
};

export type OrderAction = {
  id: string;
  label: string;
  from: OrderEstado[];
  to: OrderEstado;
  allowed: (ctx: OrderActionContext) => boolean;
  tone: 'primary' | 'secondary' | 'danger';
  confirm?: string;
};

export const ORDER_ACTIONS: OrderAction[] = [
  {
    id: 'confirmar_entrega',
    label: 'Confirmar que recibí el servicio',
    from: ['entregado'],
    to: 'confirmado',
    allowed: (ctx) => ctx.role === 'cliente' && ctx.isCliente,
    tone: 'primary',
  },
  {
    id: 'cancelar_cliente',
    label: 'Cancelar pedido',
    from: ['pendiente', 'pagado', 'buscando_asignacion', 'asignado'],
    to: 'cancelado_cliente',
    allowed: (ctx) => ctx.role === 'cliente' && ctx.isCliente,
    tone: 'danger',
    confirm: '¿Seguro que querés cancelar el pedido?',
  },
  {
    id: 'reportar_disputa',
    label: 'Reportar un problema',
    from: ['entregado', 'confirmado'],
    to: 'en_disputa',
    allowed: (ctx) => ctx.role === 'cliente' && ctx.isCliente,
    tone: 'secondary',
    confirm: '¿Querés reportar un problema con este pedido? Lo revisa el equipo de Flety.',
  },
];

export function getAvailableActions(estado: OrderEstado, ctx: OrderActionContext): OrderAction[] {
  return ORDER_ACTIONS.filter((action) => action.from.includes(estado) && action.allowed(ctx));
}
