"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PendingUser = { id: string; nombre: string | null; email: string };
type OnboardedDriver = {
  id: string;
  user_id: string;
  disponibilidad: boolean;
  user: PendingUser | null;
};

export function ChoferesManager({
  pending,
  onboarded,
}: {
  pending: PendingUser[];
  onboarded: OnboardedDriver[];
}) {
  const router = useRouter();
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  async function handleAlta(userId: string) {
    setPendingActionId(userId);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profile?.company_id) {
        await supabase
          .from("drivers")
          .insert({ user_id: userId, company_id: profile.company_id });
      }
    }

    setPendingActionId(null);
    router.refresh();
  }

  async function handleBaja(driverId: string) {
    if (!window.confirm("¿Dar de baja a este chofer?")) return;
    setPendingActionId(driverId);
    const supabase = createClient();
    await supabase.from("drivers").delete().eq("id", driverId);
    setPendingActionId(null);
    router.refresh();
  }

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Pendientes de alta</h2>
        <p className="text-xs text-zinc-500">
          Usuarios que superadmin marcó como &quot;chofer&quot; de tu empresa, pero
          todavía no tienen ficha de vehículo.
        </p>
        {!pending.length && <p className="text-sm text-zinc-500">No hay choferes pendientes.</p>}
        <ul className="flex flex-col gap-2">
          {pending.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/10"
            >
              <span>{u.nombre ?? u.email}</span>
              <button
                type="button"
                disabled={pendingActionId === u.id}
                onClick={() => handleAlta(u.id)}
                className="rounded-lg border border-black/10 px-3 py-1 text-xs disabled:opacity-40 dark:border-white/15"
              >
                Dar de alta
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Mi flota</h2>
        {!onboarded.length && <p className="text-sm text-zinc-500">Todavía no diste de alta a ningún chofer.</p>}
        <ul className="flex flex-col gap-2">
          {onboarded.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/10"
            >
              <div className="flex items-center gap-2">
                <span>{d.user?.nombre ?? d.user?.email ?? "—"}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    d.disponibilidad
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-zinc-500/15 text-zinc-500"
                  }`}
                >
                  {d.disponibilidad ? "Disponible" : "No disponible"}
                </span>
              </div>
              <button
                type="button"
                disabled={pendingActionId === d.id}
                onClick={() => handleBaja(d.id)}
                className="rounded-lg border border-black/10 px-3 py-1 text-xs disabled:opacity-40 dark:border-white/15"
              >
                Dar de baja
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
