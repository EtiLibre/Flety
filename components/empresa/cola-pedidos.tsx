"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyUsers } from "@/lib/notify/notify-users";

type QueueOrder = {
  id: string;
  tipo: string;
  origen: { direccion: string } | null;
  destino: { direccion: string } | null;
  cliente_id: string;
  created_at: string;
};

export function ColaPedidos({ orders }: { orders: QueueOrder[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [takenId, setTakenId] = useState<string | null>(null);

  async function handleAceptar(orderId: string, clienteId: string) {
    setPendingId(orderId);
    setTakenId(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPendingId(null);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      setPendingId(null);
      return;
    }

    const { data } = await supabase
      .from("orders")
      .update({ company_id: profile.company_id, estado: "asignado" })
      .eq("id", orderId)
      .eq("estado", "buscando_asignacion")
      .is("company_id", null)
      .select("id")
      .maybeSingle();

    setPendingId(null);

    if (!data) {
      setTakenId(orderId);
      return;
    }

    notifyUsers([clienteId], {
      title: "Tu pedido fue aceptado",
      body: "Una empresa va a coordinar tu servicio.",
      url: `/cliente/pedidos/${orderId}`,
    });

    router.refresh();
  }

  if (!orders.length) {
    return <p className="text-sm text-zinc-500">No hay pedidos en la cola ahora mismo.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {orders.map((o) => (
        <li
          key={o.id}
          className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/10"
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
            {takenId === o.id && (
              <span className="text-xs text-amber-600">Ya lo tomó otra empresa</span>
            )}
            <button
              type="button"
              disabled={pendingId === o.id}
              onClick={() => handleAceptar(o.id, o.cliente_id)}
              className="rounded-lg border border-black/10 px-3 py-1 text-xs disabled:opacity-40 dark:border-white/15"
            >
              {pendingId === o.id ? "Aceptando..." : "Aceptar"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
