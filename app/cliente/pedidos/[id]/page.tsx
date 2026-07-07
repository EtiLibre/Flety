import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PedidoTracking } from "@/components/cliente/pedido-tracking";

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, tipo, estado, origen, destino, driver_id, company_id, created_at")
    .eq("id", id)
    .single();

  if (!order) notFound();

  let driver = null;
  if (order.driver_id) {
    const { data } = await supabase
      .from("drivers")
      .select("id, ubicacion_actual")
      .eq("id", order.driver_id)
      .single();
    driver = data;
  }

  return <PedidoTracking initialOrder={order} initialDriver={driver} />;
}
