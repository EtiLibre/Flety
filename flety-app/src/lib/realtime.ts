// Nombre único para cada canal de Supabase Realtime.
// supabase.channel(nombre) devuelve el canal existente si ya hay uno con ese
// nombre, y agregarle escuchas (.on) a un canal ya suscripto tira un error que
// deja la pantalla en blanco. Pasa, por ejemplo, al ir de Panel a Pedidos: la
// pantalla anterior sigue montada con su canal abierto. Con un sufijo al azar,
// cada pantalla tiene el suyo.
export function canal(base: string) {
  return `${base}:${Math.random().toString(36).slice(2, 10)}`;
}
