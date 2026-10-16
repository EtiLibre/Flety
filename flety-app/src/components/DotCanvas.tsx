import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

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
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
      <Defs>
        <Pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse">
          <Circle cx={gap / 2} cy={gap / 2} r={1.1} fill={color} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
