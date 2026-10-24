import { colors } from './index';

// Paleta de las pantallas compartidas (cuenta, ayuda, historial): clara para
// cliente y empresa, oscura para la app del chofer.
export type Tema = 'claro' | 'oscuro';

export type Paleta = {
  bg: string;
  card: string;
  cardBorder: string;
  text: string;
  muted: string;
  line: string;
  input: string;
  inputBorder: string;
  chip: string;
  error: string;
  ok: string;
  // Botón principal (amarillo en los dos temas).
  accent: string;
};

export function paleta(tema: Tema): Paleta {
  if (tema === 'oscuro') {
    return {
      bg: colors.dark.bg,
      card: colors.dark.surface,
      cardBorder: colors.dark.line,
      text: colors.dark.text,
      muted: colors.dark.muted,
      line: colors.dark.line,
      input: colors.dark.chip,
      inputBorder: colors.dark.line,
      chip: colors.dark.chip,
      error: '#FF8A80',
      ok: '#4ADE80',
      accent: colors.accent,
    };
  }
  return {
    bg: '#F4F5F7',
    card: colors.white,
    cardBorder: '#E3E6EA',
    text: colors.ink,
    muted: colors.muted,
    line: colors.lineSoft,
    input: colors.surface,
    inputBorder: colors.surface,
    chip: colors.surface,
    error: colors.danger,
    ok: colors.success,
    accent: colors.accent,
  };
}
