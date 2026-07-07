import { createClient } from "@/lib/supabase/server";
import { LiquidarButton } from "@/components/contabilidad/liquidar-button";

export default async function ContabilidadPedidosPage() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, tipo, monto_total, created_at")
    .eq("estado", "confirmado")
    .order("created_at");

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Liquidaciones pendientes</h1>
      <p className="text-sm text-zinc-500">
        Pedidos confirmados por el cliente, listos para liquidar a la
        empresa. Sin montos reales de comisión todavía (sección 10.1).
      </p>

      {!orders?.length && (
        <p className="text-sm text-zinc-500">No hay pedidos pendientes de liquidar.</p>
      )}

      <ul className="flex flex-col gap-2">
        {orders?.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/10"
          >
            <span>
              {o.tipo} — {o.monto_total ? `$${o.monto_total}` : "sin monto"}
            </span>
            <LiquidarButton orderId={o.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
