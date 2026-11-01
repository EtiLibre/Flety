import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { useSvgId } from './svg-id';

// Grúa con plancha llevando un auto, de costado (mismo estilo que
// VehiculoIlustracion). Para la tarjeta de Grúas del inicio.
const VB = { w: 260, h: 130 };

function Rueda({ cx, r = 15 }: { cx: number; r?: number }) {
  return (
    <G>
      <Circle cx={cx} cy={104} r={r} fill="#1C2026" />
      <Circle cx={cx} cy={104} r={r * 0.53} fill="#9AA2AC" />
      <Circle cx={cx} cy={104} r={r * 0.2} fill="#5B6470" />
    </G>
  );
}

export function GruaIlustracion({ ancho = 260, acento = '#FF6B1A' }: { ancho?: number; acento?: string }) {
  const uid = useSvgId('grua-il');
  return (
    <Svg width={ancho} height={(ancho * VB.h) / VB.w} viewBox={`0 0 ${VB.w} ${VB.h}`} aria-hidden>
      <Defs>
        <LinearGradient id={`${uid}-grua-luz`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.18} />
        </LinearGradient>
        <LinearGradient id={`${uid}-grua-vidrio`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5D6B7C" />
          <Stop offset="1" stopColor="#1E252E" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={130} cy={120} rx={118} ry={6} fill="#12161C" opacity={0.12} />

      {/* Plancha inclinada apenas y el auto encima */}
      <Rect x={10} y={80} width={168} height={10} rx={3} fill="#2A313B" />
      <Path
        d="M30 80 Q30 64 44 62 L66 60 Q76 48 92 48 L124 48 Q138 48 146 60 L160 62 Q170 64 170 80 Z"
        fill="#E9ECEF"
        stroke="#12161C"
        strokeOpacity={0.18}
        strokeWidth={1.5}
      />
      <Path d="M76 60 Q84 52 94 52 L108 52 L108 60 Z" fill={`url(#${uid}-grua-vidrio)`} />
      <Path d="M114 52 L124 52 Q134 52 140 60 L114 60 Z" fill={`url(#${uid}-grua-vidrio)`} />
      <Circle cx={56} cy={80} r={9} fill="#1C2026" />
      <Circle cx={146} cy={80} r={9} fill="#1C2026" />

      {/* Cabina de la grúa */}
      <Path
        d="M182 52 H214 Q224 52 230 64 L242 80 Q248 84 248 92 V104 H182 Z"
        fill={acento}
        stroke="#12161C"
        strokeOpacity={0.18}
        strokeWidth={1.5}
      />
      <Path d="M182 52 H214 Q224 52 230 64 L242 80 Q248 84 248 92 V104 H182 Z" fill={`url(#${uid}-grua-luz)`} />
      <Path d="M204 58 H213 Q219 58 223 66 L231 80 H204 Z" fill={`url(#${uid}-grua-vidrio)`} />
      {/* Baliza */}
      <Rect x={190} y={44} width={16} height={8} rx={3} fill="#FFC233" />
      <Rect x={238} y={86} width={9} height={6} rx={2} fill="#FFF3C4" />
      {/* Chasis y ruedas */}
      <Rect x={8} y={94} width={242} height={10} rx={3} fill="#2A313B" />
      <Rueda cx={46} />
      <Rueda cx={82} />
      <Rueda cx={214} />
    </Svg>
  );
}
