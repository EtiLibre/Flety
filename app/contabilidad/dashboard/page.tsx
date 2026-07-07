import { getUserProfile } from "@/lib/auth/get-user-profile";
import { SignOutButton } from "@/components/sign-out-button";

export default async function ContabilidadDashboardPage() {
  const profile = await getUserProfile();

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Hola, {profile?.nombre ?? profile?.email}</h1>
        <SignOutButton />
      </div>
      <p className="text-sm text-zinc-500">
        Rol: contabilidad. Acá van fondos retenidos/liberados y liquidaciones
        (sección 6.5) — solo lectura, se habilita junto con el modelo de pagos
        (sección 10.1, todavía pendiente).
      </p>
    </div>
  );
}
