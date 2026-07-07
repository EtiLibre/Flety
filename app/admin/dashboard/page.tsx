import { getUserProfile } from "@/lib/auth/get-user-profile";

export default async function AdminDashboardPage() {
  const profile = await getUserProfile();

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Hola, {profile?.nombre ?? profile?.email}</h1>
      <p className="text-sm text-zinc-500">
        Rol: superadmin. Gestioná usuarios y empresas desde el menú de arriba.
        Métricas globales y disputas quedan para una próxima pasada.
      </p>
    </div>
  );
}
