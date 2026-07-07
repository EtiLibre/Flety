import { getUserProfile } from "@/lib/auth/get-user-profile";

export default async function ContabilidadDashboardPage() {
  const profile = await getUserProfile();

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Hola, {profile?.nombre ?? profile?.email}</h1>
      <p className="text-sm text-zinc-500">
        Rol: contabilidad. Fondos retenidos/liberados con montos reales
        dependen del modelo de pagos (sección 10.1, todavía pendiente). Por
        ahora podés marcar pedidos confirmados como liquidados en
        &quot;Liquidaciones&quot;.
      </p>
    </div>
  );
}
