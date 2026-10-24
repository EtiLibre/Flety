import { authErrorMessage } from './auth-errors';
import { supabase } from './supabase';

// "Mi cuenta" (migración 0017): datos de public.users y credenciales de
// Supabase Auth (correo y contraseña). Igual para todos los roles.

export type Cuenta = {
  email: string;
  nombre: string; // nombre(s) de pila
  apellido: string;
  telefono: string;
  username: string;
};

// public.users.nombre guarda el nombre completo (se muestra en toda la app).
// Si hay apellido guardado y el nombre termina con él, se separa.
function separar(completo: string, apellido: string | null) {
  const c = completo.trim();
  if (apellido && c.toLowerCase().endsWith(apellido.toLowerCase())) {
    return { nombre: c.slice(0, c.length - apellido.length).trim(), apellido };
  }
  const [primero, ...resto] = c.split(/\s+/);
  return { nombre: primero ?? '', apellido: apellido ?? resto.join(' ') };
}

export async function miCuenta(userId: string): Promise<Cuenta> {
  const { data, error } = await supabase
    .from('users')
    .select('email, nombre, apellido, telefono, username')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    throw new Error(
      error.message.includes('does not exist') || error.message.includes('schema cache')
        ? 'Falta actualizar la base de datos (migración 0017).'
        : 'No pudimos cargar tu cuenta.'
    );
  }
  const n = separar(data?.nombre ?? '', data?.apellido ?? null);
  return {
    email: data?.email ?? '',
    nombre: n.nombre,
    apellido: n.apellido,
    telefono: data?.telefono ?? '',
    username: data?.username ?? '',
  };
}

export const USUARIO_RE = /^[a-z0-9._]{3,20}$/;

export function limpiarUsuario(v: string) {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 20);
}

export async function usuarioDisponible(username: string) {
  const { data, error } = await supabase.rpc('usuario_disponible', { p_username: username });
  if (error) return null;
  return data as boolean;
}

export async function guardarCuenta(userId: string, c: Omit<Cuenta, 'email'>) {
  const nombre = c.nombre.trim().replace(/\s+/g, ' ');
  const apellido = c.apellido.trim().replace(/\s+/g, ' ');
  const { error } = await supabase
    .from('users')
    .update({
      nombre: [nombre, apellido].filter(Boolean).join(' '),
      apellido: apellido || null,
      telefono: c.telefono.trim() || null,
      username: c.username.trim() || null,
    })
    .eq('id', userId);
  if (error) {
    if (error.code === '23505') throw new Error('Ese nombre de usuario ya está en uso.');
    throw new Error('No pudimos guardar tus datos. Revisá que estén bien escritos.');
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Supabase manda un mail de confirmación; el cambio se aplica al confirmarlo.
export async function cambiarEmail(email: string) {
  const { error } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() });
  if (error) {
    throw new Error(
      error.message.toLowerCase().includes('already')
        ? 'Ese correo ya tiene una cuenta en Flety.'
        : 'No pudimos cambiar el correo. Probá de nuevo en unos minutos.'
    );
  }
}

// Para cambiarla, primero se comprueba la contraseña actual.
export async function cambiarContrasena(email: string, actual: string, nueva: string) {
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password: actual });
  if (authError) throw new Error('La contraseña actual no es correcta.');
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) {
    throw new Error(
      error.message.toLowerCase().includes('different')
        ? 'La nueva contraseña tiene que ser distinta de la actual.'
        : authErrorMessage(error.message)
    );
  }
}
