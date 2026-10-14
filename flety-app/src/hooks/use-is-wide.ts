import { useWindowDimensions } from 'react-native';

// A partir de este ancho se usa el layout desktop (panel + mapa) del canvas.
export const WIDE_BREAKPOINT = 900;

export function useIsWide() {
  const { width } = useWindowDimensions();
  return width >= WIDE_BREAKPOINT;
}
