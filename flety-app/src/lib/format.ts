import { DIAS, FRANJAS, type Cuando } from './pedido-draft';

const fechaHora = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function describirCuando(programadoPara: string | null): string {
  if (!programadoPara) return 'Ahora';
  return fechaHora.format(new Date(programadoPara));
}

export function describirCuandoDraft(cuando: Cuando): string {
  if (cuando.modo === 'ahora') return 'Ahora';
  return `${DIAS[cuando.dia]}, ${FRANJAS[cuando.franja].label}`;
}

export function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
