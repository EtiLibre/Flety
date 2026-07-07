"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export function NuevaEmpresaForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [cuit, setCuit] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("companies")
      .insert({ nombre, cuit: cuit || null });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setNombre("");
    setCuit("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500">Nombre</label>
        <input
          className={inputClass}
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500">CUIT (opcional)</label>
        <input
          className={inputClass}
          value={cuit}
          onChange={(e) => setCuit(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
      >
        {loading ? "Creando..." : "Nueva empresa"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
