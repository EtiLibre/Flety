import type { UserRole } from "@/lib/types/roles";

// Espejo (para la UI) del trigger validate_order_transition en
// supabase/migrations/0004_orders_queue_and_state_machine.sql, que es la
// única autoridad real. Si esto se desincroniza, el peor caso es un botón
// que se muestra pero falla al confirmar en el servidor — no un agujero de
// seguridad.
export const ORDER_ESTADOS = [
  "pendiente",
  "pagado",
  "buscando_asignacion",
  "asignado",
  "en_camino_origen",
  "cargando",
  "en_camino_destino",
  "entregado",
  "confirmado",
  "liquidado",
  "cancelado_cliente",
  "cancelado_empresa",
  "en_disputa",
  "reembolsado",
] as const;

export type OrderEstado = (typeof ORDER_ESTADOS)[number];

// Estados donde ya no hay nada más que hacer desde la UI del cliente
// (para separar "mis pedidos activos" de "historial").
export const TERMINAL_ESTADOS: OrderEstado[] = [
  "confirmado",
  "liquidado",
  "cancelado_cliente",
  "reembolsado",
];

export const ESTADO_LABELS: Record<OrderEstado, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  buscando_asignacion: "Buscando empresa",
  asignado: "Asignado",
  en_camino_origen: "Chofer en camino al origen",
  cargando: "Cargando",
  en_camino_destino: "En camino al destino",
  entregado: "Entregado",
  confirmado: "Confirmado",
  liquidado: "Liquidado",
  cancelado_cliente: "Cancelado por el cliente",
  cancelado_empresa: "Rechazado por la empresa",
  en_disputa: "En disputa",
  reembolsado: "Reembolsado",
};

export type OrderActionContext = {
  role: UserRole;
  isCliente: boolean;
  isEmpresaDueña: boolean;
  isChoferAsignado: boolean;
};

export type OrderAction = {
  id: string;
  label: string;
  from: OrderEstado[];
  to: OrderEstado;
  allowed: (ctx: OrderActionContext) => boolean;
  /** Pide confirmación extra en la UI antes de ejecutar (acciones destructivas/irreversibles). */
  confirm?: boolean;
};

export const ORDER_ACTIONS: OrderAction[] = [
  {
    id: "claim",
    label: "Aceptar pedido",
    from: ["buscando_asignacion"],
    to: "asignado",
    allowed: (ctx) => ctx.role === "empresa",
  },
  {
    id: "iniciar_viaje",
    label: "Iniciar viaje",
    from: ["asignado"],
    to: "en_camino_origen",
    allowed: (ctx) => ctx.role === "chofer" && ctx.isChoferAsignado,
  },
  {
    id: "cargando",
    label: "Llegué, cargando",
    from: ["en_camino_origen"],
    to: "cargando",
    allowed: (ctx) => ctx.role === "chofer" && ctx.isChoferAsignado,
  },
  {
    id: "en_camino_destino",
    label: "En camino al destino",
    from: ["cargando"],
    to: "en_camino_destino",
    allowed: (ctx) => ctx.role === "chofer" && ctx.isChoferAsignado,
  },
  {
    id: "entregado",
    label: "Marcar entregado",
    from: ["en_camino_destino"],
    to: "entregado",
    allowed: (ctx) => ctx.role === "chofer" && ctx.isChoferAsignado,
  },
  {
    id: "confirmar_entrega",
    label: "Confirmar que recibí el servicio",
    from: ["entregado"],
    to: "confirmado",
    allowed: (ctx) => ctx.role === "cliente" && ctx.isCliente,
  },
  {
    id: "liquidar",
    label: "Marcar liquidado",
    from: ["confirmado"],
    to: "liquidado",
    allowed: (ctx) => ctx.role === "contabilidad",
  },
  {
    id: "rechazar_empresa",
    label: "Rechazar (vuelve a la cola)",
    from: ["asignado"],
    to: "cancelado_empresa",
    allowed: (ctx) => ctx.role === "empresa" && ctx.isEmpresaDueña,
    confirm: true,
  },
  {
    id: "cancelar_cliente",
    label: "Cancelar pedido",
    from: ["pendiente", "pagado", "buscando_asignacion", "asignado"],
    to: "cancelado_cliente",
    allowed: (ctx) => ctx.role === "cliente" && ctx.isCliente,
    confirm: true,
  },
  {
    id: "reportar_disputa",
    label: "Reportar un problema",
    from: ["entregado", "confirmado"],
    to: "en_disputa",
    allowed: (ctx) => ctx.role === "cliente" && ctx.isCliente,
    confirm: true,
  },
  {
    id: "resolver_disputa_confirmar",
    label: "Resolver disputa: confirmar entrega",
    from: ["en_disputa"],
    to: "confirmado",
    allowed: (ctx) => ctx.role === "superadmin",
  },
  {
    id: "resolver_disputa_reembolso",
    label: "Resolver disputa: reembolsar",
    from: ["en_disputa"],
    to: "reembolsado",
    allowed: (ctx) => ctx.role === "superadmin",
    confirm: true,
  },
];

export function getAvailableActions(
  estado: OrderEstado,
  ctx: OrderActionContext
): OrderAction[] {
  return ORDER_ACTIONS.filter(
    (action) => action.from.includes(estado) && action.allowed(ctx)
  );
}
