// Espejo de public.user_role (supabase/migrations/0001_init_schema.sql en la raíz del repo).
export type UserRole = 'superadmin' | 'empresa' | 'chofer' | 'cliente' | 'contabilidad';

export const ROLE_HOME = {
  cliente: '/cliente/inicio',
  chofer: '/chofer/panel',
  empresa: '/empresa/panel',
  superadmin: '/empresa/panel',
  contabilidad: '/empresa/panel',
} as const satisfies Record<UserRole, string>;
