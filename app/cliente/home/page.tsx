import Link from "next/link";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { createClient } from "@/lib/supabase/server";
import { CurrentLocationMap } from "@/lib/maps/current-location-map";
import { GoogleMapsProvider } from "@/lib/maps/provider";
import { ESTADO_LABELS, TERMINAL_ESTADOS } from "@/lib/orders/state-machine";

export default async function ClienteHomePage() {
  const profile = await getUserProfile();
  const supabase = await createClient();

  const { data: activeOrders } = await supabase
    .from("orders")
    .select("id, tipo, estado, created_at")
    .not("estado", "in", `(${TERMINAL_ESTADOS.join(",")})`)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Hola, {profile?.nombre ?? profile?.email}</h1>

      <GoogleMapsProvider>
        <CurrentLocationMap />
      </GoogleMapsProvider>

      <Link
        href="/cliente/nuevo-pedido"
        className="w-fit rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        Pedir servicio
      </Link>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500">Pedidos activos</h2>
        {!activeOrders?.length && (
          <p className="text-sm text-zinc-500">No tenés pedidos activos.</p>
        )}
        <ul className="flex flex-col gap-2">
          {activeOrders?.map((o) => (
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
    </div>
  );
}
