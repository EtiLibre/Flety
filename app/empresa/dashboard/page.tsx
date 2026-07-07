import { getUserProfile } from "@/lib/auth/get-user-profile";
import { createClient } from "@/lib/supabase/server";
import { ColaPedidos } from "@/components/empresa/cola-pedidos";
import { PedidosAsignados } from "@/components/empresa/pedidos-asignados";
import { ESTADO_LABELS } from "@/lib/orders/state-machine";

export default async function EmpresaDashboardPage() {
  const profile = await getUserProfile();
  const supabase = await createClient();
  const companyId = profile?.companyId;

  const [{ data: cola }, { data: asignados }, { data: enCurso }, { data: drivers }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id, tipo, origen, destino, cliente_id, created_at")
        .eq("estado", "buscando_asignacion")
        .is("company_id", null)
        .order("created_at"),
      companyId
        ? supabase
            .from("orders")
            .select("id, tipo, origen, destino, driver_id, cliente_id")
            .eq("estado", "asignado")
            .eq("company_id", companyId)
        : Promise.resolve({ data: [] }),
      companyId
        ? supabase
            .from("orders")
            .select("id, tipo, estado")
            .in("estado", ["en_camino_origen", "cargando", "en_camino_destino"])
            .eq("company_id", companyId)
        : Promise.resolve({ data: [] }),
      companyId
        ? supabase
            .from("drivers")
            .select("id, user_id, disponibilidad")
            .eq("company_id", companyId)
        : Promise.resolve({ data: [] }),
    ]);

  const driverUserIds = (drivers ?? []).map((d) => d.user_id);
  const { data: driverUsers } = driverUserIds.length
    ? await supabase.from("users").select("id, nombre, email").in("id", driverUserIds)
    : { data: [] };

  const availableDrivers = (drivers ?? [])
    .filter((d) => d.disponibilidad)
    .map((d) => ({
      id: d.id,
      userId: d.user_id,
      nombre: driverUsers?.find((u) => u.id === d.user_id)?.nombre ?? null,
      email: driverUsers?.find((u) => u.id === d.user_id)?.email ?? "",
    }));

  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      <h1 className="text-xl font-semibold">Hola, {profile?.nombre ?? profile?.email}</h1>

      {!companyId && (
        <p className="text-sm text-amber-600">
          Tu usuario todavía no tiene una empresa asignada (lo hace superadmin desde
          /admin/usuarios).
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Cola de pedidos sin asignar</h2>
        <ColaPedidos orders={cola ?? []} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Mis pedidos asignados</h2>
        <PedidosAsignados orders={asignados ?? []} availableDrivers={availableDrivers} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">En curso</h2>
        {!enCurso?.length && <p className="text-sm text-zinc-500">Nada en curso ahora mismo.</p>}
        <ul className="flex flex-col gap-2">
          {enCurso?.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/10"
            >
              <span className="capitalize">{o.tipo.replace("_", " ")}</span>
              <span className="text-zinc-500">{ESTADO_LABELS[o.estado]}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
