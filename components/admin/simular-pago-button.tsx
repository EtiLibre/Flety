"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyUsers } from "@/lib/notify/notify-users";

export function SimularPagoButton({ orderId, tipo }: { orderId: string; tipo: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();

    await supabase.from("orders").update({ estado: "pagado" }).eq("id", orderId);

    const { data: companies } = await supabase
      .from("companies")
      .select("id")
      .eq("estado_aprobacion", "aprobada");

    const companyIds = (companies ?? []).map((c) => c.id);
    if (companyIds.length) {
      const { data: empresaUsers } = await supabase
        .from("users")
        .select("id")
        .eq("role", "empresa")
        .in("company_id", companyIds);

      notifyUsers(
        (empresaUsers ?? []).map((u) => u.id),
        { title: "Nuevo pedido disponible", body: `Hay un pedido de ${tipo} en la cola`, url: "/empresa/dashboard" }
      );
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      className="rounded-lg border border-black/10 px-3 py-1 text-xs disabled:opacity-40 dark:border-white/15"
    >
      {loading ? "Simulando..." : "Simular pago"}
    </button>
  );
}
