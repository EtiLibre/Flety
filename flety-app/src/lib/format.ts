import { fechaDeKey, fechaKey, type Cuando } from './pedido-draft';

const fechaHora = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const diaCorto = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });

export function describirCuando(programadoPara: string | null): string {
  if (!programadoPara) return 'Ahora';
  return fechaHora.format(new Date(programadoPara));
}

export function describirCuandoDraft(cuando: Cuando): string {
  if (cuando.modo === 'ahora') return 'Ahora';
  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  const dia =
    cuando.fecha === fechaKey(hoy)
      ? 'Hoy'
      : cuando.fecha === fechaKey(manana)
        ? 'Mañana'
        : diaCorto.format(fechaDeKey(cuando.fecha));
  return `${dia}, ${cuando.hora}:00 h`;
}

export function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
