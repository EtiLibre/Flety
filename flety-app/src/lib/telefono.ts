import { supabase } from '@/lib/supabase';

// Verificación del teléfono por WhatsApp (migración 0027): el usuario manda
// "FLETY 123456" al WhatsApp de Flety y queda verificado el número desde el
// que lo mandó.

export type CodigoVerificacion = { id: string; codigo: string; whatsapp: string; expira_at: string };

export const ERROR_TELEFONO = /Verificá tu teléfono/;

// ¿Hace falta verificar antes de pedir o ponerse disponible?
export async function necesitaVerificarTelefono(): Promise<boolean> {
  const { data: sesion } = await supabase.auth.getSession();
  const uid = sesion.session?.user.id;
  if (!uid) return false;
  const [config, usuario] = await Promise.all([
    supabase.from('config').select('valor').eq('clave', 'verificar_telefono').maybeSingle(),
    supabase.from('users').select('telefono_verificado_at').eq('id', uid).maybeSingle(),
  ]);
  return config.data?.valor === true && !usuario.data?.telefono_verificado_at;
}

export async function iniciarVerificacion(): Promise<CodigoVerificacion> {
  const { data, error } = await supabase.rpc('iniciar_verificacion_telefono');
  const fila = (data as CodigoVerificacion[] | null)?.[0];
  if (error || !fila) {
    throw new Error(
      error && /disponible|muchos códigos|Iniciá sesión/.test(error.message)
        ? error.message
        : 'No pudimos generar el código. Probá de nuevo.'
    );
  }
  return fila;
}

export async function estadoVerificacion(id: string) {
  const { data } = await supabase.from('verificaciones_telefono').select('estado, telefono').eq('id', id).maybeSingle();
  return data as { estado: 'pendiente' | 'verificado' | 'vencido'; telefono: string | null } | null;
}

export function linkWhatsapp(whatsapp: string, codigo: string) {
  return `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`FLETY ${codigo}`)}`;
}

// "5492615551234" → "+54 9 261 555 1234" (resto de los países: tal cual).
export function formatoWhatsapp(n: string) {
  const d = n.replace(/\D/g, '');
  const ar = d.match(/^549(\d{3})(\d{3})(\d{4})$/);
  return ar ? `+54 9 ${ar[1]} ${ar[2]} ${ar[3]}` : `+${d}`;
}

// ── Superadmin ──
export async function configVerificacion() {
  const { data } = await supabase
    .from('config')
    .select('clave, valor')
    .in('clave', ['verificar_telefono', 'whatsapp_flety']);
  const v = (clave: string) => data?.find((f) => f.clave === clave)?.valor;
  return { exigir: v('verificar_telefono') === true, whatsapp: (v('whatsapp_flety') as string | null) ?? null };
}

export async function guardarConfigVerificacion(
  clave: 'verificar_telefono' | 'whatsapp_flety',
  valor: boolean | string
) {
  const { error } = await supabase.from('config').upsert({ clave, valor, updated_at: new Date().toISOString() });
  if (error) throw new Error('No pudimos guardar la configuración.');
}
