import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/roles";

export type UserProfile = {
  id: string;
  email: string;
  nombre: string | null;
  role: UserRole;
  companyId: string | null;
};

// Devuelve null si no hay sesión o si todavía no existe la fila en public.users
// (p. ej. justo después del signup, antes de completar el registro).
export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, nombre, role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    nombre: profile.nombre,
    role: profile.role,
    companyId: profile.company_id,
  };
}
