"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CompanyRow = {
  id: string;
  nombre: string;
  cuit: string | null;
  estado_aprobacion: "pendiente" | "aprobada" | "rechazada";
  comision_pct: number | null;
};

const badgeClass: Record<CompanyRow["estado_aprobacion"], string> = {
  pendiente: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  aprobada: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  rechazada: "bg-red-500/15 text-red-600 dark:text-red-400",
};

export function EmpresasTable({ companies }: { companies: CompanyRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function setEstado(id: string, estado: CompanyRow["estado_aprobacion"]) {
    setPendingId(id);
    const supabase = createClient();
    await supabase.from("companies").update({ estado_aprobacion: estado }).eq("id", id);
    setPendingId(null);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-black/10 text-zinc-500 dark:border-white/10">
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">CUIT</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id} className="border-b border-black/5 dark:border-white/5">
              <td className="py-2 pr-4">{c.nombre}</td>
              <td className="py-2 pr-4">{c.cuit ?? "—"}</td>
              <td className="py-2 pr-4">
                <span className={`rounded-full px-2 py-0.5 text-xs ${badgeClass[c.estado_aprobacion]}`}>
                  {c.estado_aprobacion}
                </span>
              </td>
              <td className="flex gap-2 py-2 pr-4">
                {c.estado_aprobacion !== "aprobada" && (
                  <button
                    type="button"
                    disabled={pendingId === c.id}
                    onClick={() => setEstado(c.id, "aprobada")}
                    className="rounded-lg border border-black/10 px-3 py-1 text-xs disabled:opacity-40 dark:border-white/15"
                  >
                    Aprobar
                  </button>
                )}
                {c.estado_aprobacion !== "rechazada" && (
                  <button
                    type="button"
                    disabled={pendingId === c.id}
                    onClick={() => setEstado(c.id, "rechazada")}
                    className="rounded-lg border border-black/10 px-3 py-1 text-xs disabled:opacity-40 dark:border-white/15"
                  >
                    Rechazar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
