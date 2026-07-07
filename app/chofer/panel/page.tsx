import { getUserProfile } from "@/lib/auth/get-user-profile";
import { SignOutButton } from "@/components/sign-out-button";

export default async function ChoferPanelPage() {
  const profile = await getUserProfile();

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Hola, {profile?.nombre ?? profile?.email}</h1>
        <SignOutButton />
      </div>
      <p className="text-sm text-zinc-500">
        Rol: chofer. Acá va el switch de disponibilidad y los pedidos
        entrantes (sección 6.2, fases posteriores).
      </p>
    </div>
  );
}
