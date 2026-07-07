"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleMapsProvider } from "@/lib/maps/provider";
import { AddressAutocomplete } from "@/lib/maps/address-autocomplete";
import type { GeoPoint } from "@/lib/types/database";

const TIPOS = [
  { value: "flete", label: "Flete" },
  { value: "mudanza", label: "Mudanza" },
  { value: "larga_distancia", label: "Larga distancia" },
] as const;

export default function NuevoPedidoPage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["value"]>("flete");
  const [origen, setOrigen] = useState<GeoPoint | null>(null);
  const [destino, setDestino] = useState<GeoPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!origen || !destino) {
      setError("Elegí origen y destino de la lista de sugerencias.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError("Sesión expirada, volvé a iniciar sesión.");
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .insert({ cliente_id: user.id, tipo, origen, destino })
      .select("id")
      .single();

    setLoading(false);

    if (error || !data) {
      setError(error?.message ?? "No se pudo crear el pedido.");
      return;
    }

    router.push(`/cliente/pedidos/${data.id}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Nuevo pedido</h1>

      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Tipo de servicio</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
            className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <GoogleMapsProvider>
          <AddressAutocomplete label="Origen" placeholder="Dirección de origen" onSelect={setOrigen} />
          <AddressAutocomplete label="Destino" placeholder="Dirección de destino" onSelect={setDestino} />
        </GoogleMapsProvider>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-foreground py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {loading ? "Creando pedido..." : "Pedir cotización"}
        </button>
      </form>
    </div>
  );
}
