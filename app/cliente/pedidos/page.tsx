import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ESTADO_LABELS } from "@/lib/orders/state-machine";

export default async function ClientePedidosPage() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, tipo, estado, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Mis pedidos</h1>

      {!orders?.length && <p className="text-sm text-zinc-500">Todavía no pediste ningún servicio.</p>}

      <ul className="flex flex-col gap-2">
        {orders?.map((o) => (
          <li key={o.id}>
            <Link
              href={`/cliente/pedidos/${o.id}`}
              className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 text-sm hover:bg-black/[.02] dark:border-white/10 dark:hover:bg-white/[.04]"
            >
              <span className="capitalize">{o.tipo.replace("_", " ")}</span>
              <span className="text-zinc-500">{ESTADO_LABELS[o.estado]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
