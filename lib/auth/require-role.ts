import "server-only";
import { redirect } from "next/navigation";
import { getUserProfile, type UserProfile } from "./get-user-profile";
import type { UserRole } from "@/lib/types/roles";

// Guard de UX para los layouts de sección: la barrera real de seguridad son
// las políticas RLS de Postgres (supabase/migrations/0002_rls_policies.sql).
export async function requireRole(allowed: UserRole[]): Promise<UserProfile> {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!allowed.includes(profile.role)) {
    redirect("/unauthorized");
  }

  return profile;
}
