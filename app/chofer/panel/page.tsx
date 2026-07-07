import { createClient } from "@/lib/supabase/server";
import { ChoferPanel } from "@/components/chofer/chofer-panel";

export default async function ChoferPanelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: driver } = await supabase
    .from("drivers")
    .select("id, disponibilidad")
    .eq("user_id", user?.id ?? "")
    .single();

  if (!driver) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-8">
        <h1 className="text-xl font-semibold">Panel de chofer</h1>
        <p className="text-sm text-amber-600">
          Tu empresa todavía no completó tu alta como chofer (falta la ficha de
          vehículo).
        </p>
      </div>
    );
  }

  const { data: activeOrder } = await supabase
    .from("orders")
    .select("id, tipo, estado, origen, destino, cliente_id")
    .eq("driver_id", driver.id)
    .in("estado", ["asignado", "en_camino_origen", "cargando", "en_camino_destino"])
    .maybeSingle();

  return <ChoferPanel driver={driver} initialActiveOrder={activeOrder} />;
}
