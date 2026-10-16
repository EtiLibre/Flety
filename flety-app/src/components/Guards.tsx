import { Redirect, useGlobalSearchParams, type Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { ROLE_HOME, type UserRole } from '@/lib/types';
import { colors } from '@/theme';

function Loader({ dark }: { dark?: boolean }) {
  return (
    <View style={[styles.loader, { backgroundColor: dark ? colors.ink : colors.white }]}>
      <ActivityIndicator color={dark ? colors.accent : colors.ink} />
    </View>
  );
}

// Pantallas para usuarios sin sesión (bienvenida, login, registro): si ya hay
// sesión, manda al inicio que corresponde a su rol.
export function PublicOnly({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  const { session, role, loadingProfile } = useAuth();
  const { next } = useGlobalSearchParams<{ next?: string }>();
  if (session && loadingProfile) return <Loader dark={dark} />;
  if (session && role) return <Redirect href={destinoDespuesDeEntrar(role, next)} />;
  return <>{children}</>;
}

// ?next= solo acepta destinos propios conocidos (no URLs externas): seguir el
// pedido empezado sin cuenta (cliente) o sumarse como chofer con un código.
function destinoDespuesDeEntrar(role: UserRole, next: string | undefined): Href {
  if (next === '/unirse' && (role === 'cliente' || role === 'chofer')) return '/unirse';
  if (role === 'cliente' && (next === '/cliente/opciones' || next === '/cliente/inicio')) return next;
  return ROLE_HOME[role];
}

// Secciones por rol. Esto es solo navegación: la seguridad real la ponen las
// políticas RLS de Supabase (supabase/migrations/0002 y 0004).
export function RequireRole({ allow, children }: { allow: UserRole[]; children: React.ReactNode }) {
  const { session, role, loadingProfile } = useAuth();
  if (!session) return <Redirect href="/" />;
  if (loadingProfile || !role) return <Loader />;
  if (!allow.includes(role)) return <Redirect href={ROLE_HOME[role]} />;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
