"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAvailableActions, ESTADO_LABELS, type OrderAction } from "@/lib/orders/state-machine";
import { notifyUsers } from "@/lib/notify/notify-users";
import type { Database } from "@/lib/types/database";

type Driver = { id: string; disponibilidad: boolean };
type ActiveOrder = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  "id" | "tipo" | "estado" | "origen" | "destino" | "cliente_id"
> | null;

export function ChoferPanel({
  driver,
  initialActiveOrder,
}: {
  driver: Driver;
  initialActiveOrder: ActiveOrder;
}) {
  const router = useRouter();
  const [disponibilidad, setDisponibilidad] = useState(driver.disponibilidad);
  const [togglingDisponibilidad, setTogglingDisponibilidad] = useState(false);
  const [order] = useState(initialActiveOrder);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  async function handleToggleDisponibilidad() {
    setTogglingDisponibilidad(true);
    const next = !disponibilidad;
    const supabase = createClient();
    await supabase.from("drivers").update({ disponibilidad: next }).eq("id", driver.id);
    setDisponibilidad(next);
    setTogglingDisponibilidad(false);
    router.refresh();
  }

  useEffect(() => {
    if (!order || !("geolocation" in navigator)) return;

    const supabase = createClient();
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        supabase
          .from("drivers")
          .update({
            ubicacion_actual: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              direccion: "",
            },
          })
          .eq("id", driver.id)
          .then(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [order, driver.id]);

  const actions = order
    ? getAvailableActions(order.estado, {
        role: "chofer",
        isCliente: false,
        isEmpresaDueña: false,
        isChoferAsignado: true,
      })
    : [];

  async function handleAction(action: OrderAction) {
    if (!order) return;
    setPendingAction(action.id);
    const supabase = createClient();
    await supabase.from("orders").update({ estado: action.to }).eq("id", order.id);
    setPendingAction(null);

    notifyUsers([order.cliente_id], {
      title: ESTADO_LABELS[action.to],
      body: `Tu ${order.tipo.replace("_", " ")} cambió de estado.`,
      url: `/cliente/pedidos/${order.id}`,
    });

    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Panel de chofer</h1>
        <button
          type="button"
          disabled={togglingDisponibilidad}
          onClick={handleToggleDisponibilidad}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            disponibilidad
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-zinc-500/15 text-zinc-500"
          }`}
        >
          {disponibilidad ? "Disponible" : "No disponible"}
        </button>
      </div>

      {!order && (
        <p className="text-sm text-zinc-500">No tenés ningún pedido activo ahora mismo.</p>
      )}

      {order && (
        <div className="flex flex-col gap-4 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="capitalize font-medium">{order.tipo.replace("_", " ")}</span>
            <span className="text-sm text-zinc-500">{ESTADO_LABELS[order.estado]}</span>
          </div>
          {order.origen && <p className="text-sm text-zinc-500">Origen: {order.origen.direccion}</p>}
          {order.destino && <p className="text-sm text-zinc-500">Destino: {order.destino.direccion}</p>}

          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={pendingAction === action.id}
                onClick={() => handleAction(action)}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
              >
                {pendingAction === action.id ? "Enviando..." : action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
