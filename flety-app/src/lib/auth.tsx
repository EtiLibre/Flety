import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from './supabase';
import type { UserRole } from './types';

type AuthState = {
  session: Session | null;
  role: UserRole | null;
  nombre: string | null;
  // Empresa a la que pertenece (rol empresa/chofer), si tiene.
  companyId: string | null;
  // true solo mientras se lee la sesión guardada al abrir la app.
  initializing: boolean;
  // true si hay sesión pero todavía no llegó el rol desde public.users.
  loadingProfile: boolean;
};

const AuthContext = createContext<AuthState>({
  session: null,
  role: null,
  nombre: null,
  companyId: null,
  initializing: true,
  loadingProfile: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [profile, setProfile] = useState<{
    userId: string;
    role: UserRole;
    nombre: string | null;
    companyId: string | null;
  } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  // El rol vive en public.users (fila creada por el trigger on_auth_user_created).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('users')
      .select('role, nombre, company_id')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        // Sin fila todavía: se trata como cliente (es el rol por defecto del trigger).
        setProfile({
          userId,
          role: (data?.role as UserRole) ?? 'cliente',
          nombre: data?.nombre ?? null,
          companyId: data?.company_id ?? null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const currentProfile = profile && profile.userId === userId ? profile : null;

  return (
    <AuthContext.Provider
      value={{
        session,
        role: currentProfile?.role ?? null,
        nombre: currentProfile?.nombre ?? null,
        companyId: currentProfile?.companyId ?? null,
        initializing: !sessionLoaded,
        loadingProfile: !!userId && !currentProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

// SOLO DESARROLLO: sesión simulada para las vistas previas (/preview-*), que
// no tocan Supabase. La seguridad real no depende de esto (RLS).
export function AuthPreview({ value, children }: { value: Partial<AuthState>; children: React.ReactNode }) {
  return (
    <AuthContext.Provider
      value={{ session: null, role: null, nombre: null, companyId: null, initializing: false, loadingProfile: false, ...value }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
