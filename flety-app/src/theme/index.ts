// Tokens del diseño aprobado (canvas "Flety — Diseño de app").
export const colors = {
  ink: '#12161C',
  accent: '#FFC233',
  white: '#FFFFFF',
  surface: '#F1F3F5',
  line: '#DDE1E6',
  lineSoft: '#EEF0F2',
  handle: '#D5D9DE',
  muted: '#5B6470',
  mutedOnInk: '#A9B0BA',
  faintOnInk: '#8B95A1',
  mapLand: '#E9ECEF',
  success: '#146C43',
  successBg: '#E3F5EC',
  danger: '#B42318',
  dangerBg: '#FDECEA',
  // App del chofer (modo oscuro)
  dark: {
    bg: '#0F1318',
    surface: '#1A1F26',
    line: '#2A313B',
    chip: '#262C35',
    text: '#F2F4F7',
    muted: '#9AA4B1',
  },
} as const;

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  extrabold: 'Figtree_800ExtraBold',
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 18,
  sheet: 28,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const shadow = {
  floating: {
    shadowColor: '#12161C',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sheet: {
    shadowColor: '#12161C',
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
} as const;
