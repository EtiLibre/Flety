import Svg, { Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { TRUCK_SIZE } from './truck-sprite';

// Versión iOS/Android del camioncito (misma figura que TRUCK_3D_SVG).
// Sombra sin desenfoque (react-native-svg no soporta bien los filtros): dos capas suaves.
export function TruckSprite() {
  return (
    <Svg width={TRUCK_SIZE.width} height={TRUCK_SIZE.height} viewBox="0 0 44 80">
      <Defs>
        <LinearGradient id="cab" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#D99B00" />
          <Stop offset="0.22" stopColor="#FFC233" />
          <Stop offset="0.5" stopColor="#FFD873" />
          <Stop offset="0.78" stopColor="#FFC233" />
          <Stop offset="1" stopColor="#D99B00" />
        </LinearGradient>
        <LinearGradient id="box" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#CDD3DB" />
          <Stop offset="0.15" stopColor="#F4F6F8" />
          <Stop offset="0.5" stopColor="#FFFFFF" />
          <Stop offset="0.85" stopColor="#F4F6F8" />
          <Stop offset="1" stopColor="#CDD3DB" />
        </LinearGradient>
        <LinearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3A4450" />
          <Stop offset="1" stopColor="#12161C" />
        </LinearGradient>
      </Defs>
      <Rect x={7.5} y={5} width={32} height={75} rx={9} fill="rgba(18,22,28,0.12)" />
      <Rect x={8.5} y={6} width={30} height={72} rx={8} fill="rgba(18,22,28,0.16)" />
      <Rect x={6.5} y={13} width={4} height={9} rx={1.6} fill="#232A33" />
      <Rect x={33.5} y={13} width={4} height={9} rx={1.6} fill="#232A33" />
      <Rect x={5} y={55} width={4} height={11} rx={1.6} fill="#232A33" />
      <Rect x={35} y={55} width={4} height={11} rx={1.6} fill="#232A33" />
      <Rect x={7} y={27} width={30} height={49} rx={4} fill="url(#box)" stroke="rgba(18,22,28,0.22)" strokeWidth={0.8} />
      <Rect x={10} y={30} width={24} height={43} rx={2.5} fill="none" stroke="rgba(18,22,28,0.08)" strokeWidth={1} />
      <Path d="M13 34.5h18M13 69h18" stroke="rgba(18,22,28,0.07)" strokeWidth={1} />
      <Rect x={15} y={44.5} width={14} height={14} rx={4} fill="#FFC233" />
      <Path d="M19.4 48h6v2.3h-3.4v1.5h2.9v2.2h-2.9v3h-2.6z" fill="#12161C" />
      <Rect x={9} y={75} width={4.5} height={1.6} rx={0.8} fill="#E5484D" />
      <Rect x={30.5} y={75} width={4.5} height={1.6} rx={0.8} fill="#E5484D" />
      <Rect x={13} y={23} width={18} height={5} fill="#2A313B" />
      <Path
        d="M9 11Q9 3 17 3H27Q35 3 35 11V22.5Q35 25 32.5 25H11.5Q9 25 9 22.5Z"
        fill="url(#cab)"
        stroke="rgba(18,22,28,0.25)"
        strokeWidth={0.8}
      />
      <Path d="M12.2 8.2Q22 5.8 31.8 8.2L30.2 14.2Q22 13.2 13.8 14.2Z" fill="url(#glass)" />
      <Path d="M15 8.6Q18.5 7.6 22 7.4L20.6 13.4Q17.8 13.5 15.4 13.9Z" fill="rgba(255,255,255,0.16)" />
      <Rect x={12.5} y={15.5} width={19} height={7.5} rx={2.5} fill="rgba(255,255,255,0.2)" />
      <Ellipse cx={7.2} cy={10.5} rx={2.2} ry={1.4} fill="#232A33" />
      <Ellipse cx={36.8} cy={10.5} rx={2.2} ry={1.4} fill="#232A33" />
      <Rect x={11.5} y={3.4} width={4.5} height={1.8} rx={0.9} fill="#FFFBEA" />
      <Rect x={28} y={3.4} width={4.5} height={1.8} rx={0.9} fill="#FFFBEA" />
    </Svg>
  );
}
