import { createClient } from "@/lib/supabase/server";
import { SimularPagoButton } from "@/components/admin/simular-pago-button";

export default async function AdminPedidosPage() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, tipo, estado, monto_total, created_at")
    .eq("estado", "pendiente")
    .order("created_at");

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Pedidos pendientes de pago</h1>
      <p className="text-sm text-zinc-500">
        Todavía no hay integración real de pagos (sección 10.1). Este botón
        simula la confirmación de pago para poder probar el resto del flujo
        (cola de asignación, notificaciones).
      </p>

      {!orders?.length && <p className="text-sm text-zinc-500">No hay pedidos pendientes.</p>}

      <ul className="flex flex-col gap-2">
        {orders?.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/10"
          >
            <span className="capitalize">{o.tipo.replace("_", " ")}</span>
            <SimularPagoButton orderId={o.id} tipo={o.tipo} />
          </li>
        ))}
      </ul>
    </div>
  );
}
