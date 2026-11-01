import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import { useSvgId } from '@/plataforma/svg-id';

export const CANVAS_BG = '#F5F5F2';

// Fondo "lienzo" con grilla de puntos (estética de paneles flotantes).
export function DotCanvas({
  color = '#D7D7D2',
  gap = 22,
  id = 'flety-dots',
}: {
  color?: string;
  gap?: number;
  id?: string;
}) {
  const uid = useSvgId(id);
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
      <Defs>
        <Pattern id={uid} width={gap} height={gap} patternUnits="userSpaceOnUse">
          <Circle cx={gap / 2} cy={gap / 2} r={1.1} fill={color} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${uid})`} />
    </Svg>
  );
}
