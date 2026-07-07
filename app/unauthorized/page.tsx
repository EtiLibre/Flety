import Link from "next/link";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { ROLE_HOME } from "@/lib/types/roles";

export default async function UnauthorizedPage() {
  const profile = await getUserProfile();
  const homeHref = profile ? ROLE_HOME[profile.role] : "/login";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">No tenés permiso para ver esto</h1>
      <p className="text-sm text-zinc-500">
        Tu cuenta no tiene el rol necesario para acceder a esta sección.
      </p>
      <Link href={homeHref} className="text-sm hover:underline">
        Volver a mi panel
      </Link>
    </div>
  );
}
