"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyUsers } from "@/lib/notify/notify-users";

type AssignedOrder = {
  id: string;
  tipo: string;
  origen: { direccion: string } | null;
  destino: { direccion: string } | null;
  driver_id: string | null;
  cliente_id: string;
};

type DriverOption = { id: string; userId: string; nombre: string | null; email: string };

export function PedidosAsignados({
  orders,
  availableDrivers,
}: {
  orders: AssignedOrder[];
  availableDrivers: DriverOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleAsignarChofer(order: AssignedOrder) {
    const driverId = selected[order.id];
    if (!driverId) return;

    setPendingId(order.id);
    const supabase = createClient();
    await supabase.from("orders").update({ driver_id: driverId }).eq("id", order.id);
    setPendingId(null);

    const driver = availableDrivers.find((d) => d.id === driverId);
    notifyUsers([order.cliente_id], {
      title: "Te asignamos un chofer",
      url: `/cliente/pedidos/${order.id}`,
    });
    if (driver) {
      notifyUsers([driver.userId], {
        title: "Nuevo pedido asignado",
        body: `Tenés un ${order.tipo.replace("_", " ")} para retirar`,
        url: "/chofer/panel",
      });
    }

    router.refresh();
  }

  async function handleRechazar(orderId: string) {
    if (!window.confirm("¿Rechazar este pedido? Vuelve a la cola para otra empresa.")) return;

    setPendingId(orderId);
    const supabase = createClient();
    await supabase.from("orders").update({ estado: "cancelado_empresa" }).eq("id", orderId);
    setPendingId(null);
    router.refresh();
  }

  if (!orders.length) {
    return <p className="text-sm text-zinc-500">No tenés pedidos asignados sin chofer.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {orders.map((o) => (
        <li
          key={o.id}
          className="flex flex-col gap-2 rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/10 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col">
            <span className="capitalize">{o.tipo.replace("_", " ")}</span>
            {o.origen && (
              <span className="text-xs text-zinc-500">
                {o.origen.direccion} → {o.destino?.direccion}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!o.driver_id && (
              <>
                <select
                  className="rounded-lg border border-black/10 bg-transparent px-2 py-1 text-sm dark:border-white/15"
                  value={selected[o.id] ?? ""}
                  onChange={(e) =>
                    setSelected((prev) => ({ ...prev, [o.id]: e.target.value }))
                  }
                >
                  <option value="">Elegir chofer disponible</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre ?? d.email}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selected[o.id] || pendingId === o.id}
                  onClick={() => handleAsignarChofer(o)}
                  className="rounded-lg border border-black/10 px-3 py-1 text-xs disabled:opacity-40 dark:border-white/15"
                >
                  Asignar
                </button>
              </>
            )}
            <button
              type="button"
              disabled={pendingId === o.id}
              onClick={() => handleRechazar(o.id)}
              className="rounded-lg border border-black/10 px-3 py-1 text-xs disabled:opacity-40 dark:border-white/15"
            >
              Rechazar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
