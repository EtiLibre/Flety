// Espejo del enum public.user_role definido en supabase/migrations/0001_init_schema.sql
export const USER_ROLES = [
  "superadmin",
  "empresa",
  "chofer",
  "cliente",
  "contabilidad",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_HOME: Record<UserRole, string> = {
  superadmin: "/admin/dashboard",
  empresa: "/empresa/dashboard",
  chofer: "/chofer/panel",
  cliente: "/cliente/home",
  contabilidad: "/contabilidad/dashboard",
};
