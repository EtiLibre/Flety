"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleMapsProvider } from "@/lib/maps/provider";
import { Map, Marker } from "@vis.gl/react-google-maps";
import { ESTADO_LABELS, getAvailableActions, type OrderAction } from "@/lib/orders/state-machine";
import { notifyUsers } from "@/lib/notify/notify-users";
import type { Database } from "@/lib/types/database";

type OrderRow = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  "id" | "tipo" | "estado" | "origen" | "destino" | "driver_id" | "company_id" | "created_at"
>;
type DriverRow = Pick<Database["public"]["Tables"]["drivers"]["Row"], "id" | "ubicacion_actual">;

const MENDOZA_CENTER = { lat: -32.8908, lng: -68.8272 };

export function PedidoTracking({
  initialOrder,
  initialDriver,
}: {
  initialOrder: OrderRow;
  initialDriver: DriverRow | null;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [driver, setDriver] = useState(initialDriver);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`order-tracking-${order.id}`)
      .on<OrderRow>(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` },
        (payload) => setOrder(payload.new as OrderRow)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.id]);

  useEffect(() => {
    if (!order.driver_id) {
      const id = setTimeout(() => setDriver(null), 0);
      return () => clearTimeout(id);
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`driver-tracking-${order.driver_id}`)
      .on<DriverRow>(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "drivers", filter: `id=eq.${order.driver_id}` },
        (payload) => setDriver(payload.new as DriverRow)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.driver_id]);

  const actions = getAvailableActions(order.estado, {
    role: "cliente",
    isCliente: true,
    isEmpresaDueña: false,
    isChoferAsignado: false,
  });

  async function handleAction(action: OrderAction) {
    if (action.confirm && !window.confirm(`${action.label}?`)) return;
    setPendingAction(action.id);
    const supabase = createClient();
    await supabase.from("orders").update({ estado: action.to }).eq("id", order.id);
    setPendingAction(null);

    if (action.id === "reportar_disputa") {
      const [{ data: superadmins }, { data: empresaUsers }] = await Promise.all([
        supabase.from("users").select("id").eq("role", "superadmin"),
        order.company_id
          ? supabase.from("users").select("id").eq("role", "empresa").eq("company_id", order.company_id)
          : Promise.resolve({ data: [] }),
      ]);

      notifyUsers([...(superadmins ?? []), ...(empresaUsers ?? [])].map((u) => u.id), {
        title: "Disputa reportada",
        body: `El cliente reportó un problema con un ${order.tipo.replace("_", " ")}.`,
        url: `/cliente/pedidos/${order.id}`,
      });
    }

    router.refresh();
  }

  const markers = [
    order.origen && { key: "origen", position: order.origen, label: "O" },
    order.destino && { key: "destino", position: order.destino, label: "D" },
    driver?.ubicacion_actual && {
      key: "chofer",
      position: driver.ubicacion_actual,
      label: "C",
    },
  ].filter(Boolean) as { key: string; position: { lat: number; lng: number }; label: string }[];

  const center = driver?.ubicacion_actual ?? order.origen ?? MENDOZA_CENTER;

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold capitalize">{order.tipo.replace("_", " ")}</h1>
        <span className="rounded-full bg-black/5 px-3 py-1 text-sm dark:bg-white/10">
          {ESTADO_LABELS[order.estado]}
        </span>
      </div>

      <GoogleMapsProvider>
        <div className="h-72 w-full overflow-hidden rounded-lg">
          <Map defaultCenter={center} defaultZoom={13} disableDefaultUI>
            {markers.map((m) => (
              <Marker key={m.key} position={m.position} label={m.label} />
            ))}
          </Map>
        </div>
      </GoogleMapsProvider>

      <div className="flex flex-col gap-1 text-sm text-zinc-500">
        {order.origen && <p>Origen: {order.origen.direccion}</p>}
        {order.destino && <p>Destino: {order.destino.direccion}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={pendingAction === action.id}
            onClick={() => handleAction(action)}
            className="rounded-lg border border-black/10 px-4 py-2 text-sm disabled:opacity-40 dark:border-white/15"
          >
            {pendingAction === action.id ? "Enviando..." : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
