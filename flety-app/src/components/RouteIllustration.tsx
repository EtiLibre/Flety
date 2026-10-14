import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

// Ilustración de marca: cuadrícula oscura con una ruta punteada y un camión.
export function RouteIllustration() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 342 300" preserveAspectRatio="xMidYMid meet">
      <G stroke="#222933" strokeWidth={1}>
        <Path d="M0 40H342M0 100H342M0 160H342M0 220H342M0 280H342" />
        <Path d="M24 0V300M94 0V300M164 0V300M234 0V300M304 0V300" />
      </G>
      <Path d="M-10 214 C 80 196 130 120 352 88" stroke="#262E39" strokeWidth={12} fill="none" strokeLinecap="round" />
      <Path d="M-10 120 C 120 140 200 230 352 250" stroke="#1E252E" strokeWidth={8} fill="none" strokeLinecap="round" />
      <Path
        d="M60 236 C 110 230 122 172 168 152 S 250 96 280 84"
        stroke={colors.accent}
        strokeWidth={4}
        strokeDasharray="2 10"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={60} cy={236} r={18} fill={colors.ink} stroke={colors.white} strokeWidth={3} />
      <Circle cx={60} cy={236} r={6} fill={colors.white} />
      <Circle cx={282} cy={56} r={20} fill={colors.accent} />
      <Path d="M270 68 L282 90 L294 68 Z" fill={colors.accent} />
      <Circle cx={282} cy={56} r={7} fill={colors.ink} />
      <Rect x={144} y={132} width={48} height={36} rx={12} fill={colors.white} />
      <G x={156} y={138} stroke={colors.ink} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M2 6h12v10H2z" />
        <Path d="M14 10h4l4 4v2h-8z" />
        <Circle cx={6.5} cy={17.5} r={2} />
        <Circle cx={17.5} cy={17.5} r={2} />
      </G>
    </Svg>
  );
}
