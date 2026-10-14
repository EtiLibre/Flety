// Traduce los errores más comunes de Supabase Auth a mensajes claros en castellano.
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Confirmá tu email antes de ingresar: revisá tu bandeja de entrada.';
  if (m.includes('already registered')) return 'Ya existe una cuenta con ese email. Probá iniciar sesión.';
  if (m.includes('password should be at least')) return 'La contraseña tiene que tener al menos 6 caracteres.';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'Ese email no parece válido.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Esperá un momento y probá de nuevo.';
  if (m.includes('network') || m.includes('fetch')) return 'No pudimos conectarnos. Revisá tu conexión.';
  return 'Algo salió mal. Probá de nuevo.';
}
