import { getUserProfile } from "@/lib/auth/get-user-profile";
import { createClient } from "@/lib/supabase/server";
import { ChoferesManager } from "@/components/empresa/choferes-manager";

export default async function EmpresaChoferesPage() {
  const profile = await getUserProfile();
  const companyId = profile?.companyId;

  if (!companyId) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-8">
        <h1 className="text-xl font-semibold">Choferes</h1>
        <p className="text-sm text-amber-600">
          Tu usuario todavía no tiene una empresa asignada (lo hace superadmin desde
          /admin/usuarios).
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: choferUsers }, { data: drivers }] = await Promise.all([
    supabase
      .from("users")
      .select("id, nombre, email")
      .eq("role", "chofer")
      .eq("company_id", companyId),
    supabase
      .from("drivers")
      .select("id, user_id, disponibilidad")
      .eq("company_id", companyId),
  ]);

  const onboardedUserIds = new Set((drivers ?? []).map((d) => d.user_id));
  const pending = (choferUsers ?? []).filter((u) => !onboardedUserIds.has(u.id));
  const onboarded = (drivers ?? []).map((d) => ({
    ...d,
    user: choferUsers?.find((u) => u.id === d.user_id) ?? null,
  }));

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Choferes</h1>
      <ChoferesManager pending={pending} onboarded={onboarded} />
    </div>
  );
}
