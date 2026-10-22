import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { COLORES, type ColorVehiculo } from '@/lib/vehiculos';
import type { Vehiculo } from '@/lib/types';
import { fonts } from '@/theme';

// Dibujo lateral del vehículo, generado por la plataforma según el tipo y
// pintado del color que cargó el chofer (no es una foto real).
const VB = { w: 260, h: 130 };

function Rueda({ cx }: { cx: number }) {
  return (
    <G>
      <Circle cx={cx} cy={102} r={17} fill="#1C2026" />
      <Circle cx={cx} cy={102} r={9} fill="#9AA2AC" />
      <Circle cx={cx} cy={102} r={3.5} fill="#5B6470" />
    </G>
  );
}

export function VehiculoIlustracion({
  tipo = 'camioneta',
  color = 'blanco',
  ancho = 260,
}: {
  tipo?: Vehiculo;
  color?: ColorVehiculo;
  ancho?: number;
}) {
  const pintura = COLORES[color]?.hex ?? COLORES.blanco.hex;
  const id = `veh-${tipo}-${color}`;
  return (
    <Svg width={ancho} height={(ancho * VB.h) / VB.w} viewBox={`0 0 ${VB.w} ${VB.h}`} aria-hidden>
      <Defs>
        {/* Brillo arriba y sombra abajo, sobre cualquier color. */}
        <LinearGradient id={`${id}-luz`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.18} />
        </LinearGradient>
        <LinearGradient id={`${id}-vidrio`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5D6B7C" />
          <Stop offset="1" stopColor="#1E252E" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={130} cy={118} rx={112} ry={7} fill="#12161C" opacity={0.12} />

      {tipo === 'utilitario' ? (
        <G>
          {/* Furgón chico tipo Kangoo/Partner, mirando a la derecha. */}
          <Path d="M28 100 V58 Q28 40 46 38 L150 36 Q168 36 180 48 L202 70 Q226 72 234 84 Q238 90 238 100 Z" fill={pintura} />
          <Path d="M28 100 V58 Q28 40 46 38 L150 36 Q168 36 180 48 L202 70 Q226 72 234 84 Q238 90 238 100 Z" fill={`url(#${id}-luz)`} />
          <Path d="M156 44 Q166 44 174 52 L192 70 H156 Z" fill={`url(#${id}-vidrio)`} />
          <Rect x={104} y={44} width={46} height={26} rx={4} fill={`url(#${id}-vidrio)`} />
          <Path d="M100 42 V96 M152 42 V96" stroke="#000" strokeOpacity={0.12} strokeWidth={1.5} />
          <Rect x={226} y={80} width={10} height={6} rx={2} fill="#FFF3C4" />
          <Rect x={26} y={68} width={5} height={10} rx={2} fill="#E5484D" />
          <Rueda cx={70} />
          <Rueda cx={196} />
        </G>
      ) : tipo === 'camion' ? (
        <G>
          {/* Camión con caja (mudanzas grandes). */}
          <Rect x={14} y={22} width={156} height={74} rx={6} fill="#F4F5F7" />
          <Rect x={14} y={22} width={156} height={74} rx={6} fill="#000" opacity={0.04} />
          <Path d="M22 34 H162" stroke="#D5DAE0" strokeWidth={2} />
          <Rect x={70} y={48} width={44} height={22} rx={4} fill="#FFC233" />
          <Path d="M84 54 h9 v3 h-5 v2 h4 v3 h-4 v5 h-4 z" fill="#12161C" />
          <Path d="M174 44 H212 Q222 44 228 56 L240 74 Q246 78 246 88 V100 H174 Z" fill={pintura} />
          <Path d="M174 44 H212 Q222 44 228 56 L240 74 Q246 78 246 88 V100 H174 Z" fill={`url(#${id}-luz)`} />
          <Path d="M200 50 H211 Q217 50 221 58 L230 74 H200 Z" fill={`url(#${id}-vidrio)`} />
          <Rect x={236} y={82} width={9} height={6} rx={2} fill="#FFF3C4" />
          <Rect x={12} y={84} width={236} height={10} rx={3} fill="#2A313B" />
          <Rueda cx={48} />
          <Rueda cx={88} />
          <Rueda cx={212} />
        </G>
      ) : (
        <G>
          {/* Camioneta con caja cerrada (el flete típico). */}
          <Rect x={18} y={34} width={128} height={62} rx={6} fill="#F4F5F7" />
          <Rect x={18} y={34} width={128} height={62} rx={6} fill="#000" opacity={0.04} />
          <Path d="M26 46 H138" stroke="#D5DAE0" strokeWidth={2} />
          <Rect x={62} y={56} width={40} height={20} rx={4} fill="#FFC233" />
          <Path d="M75 61 h8 v3 h-4 v2 h3 v3 h-3 v5 h-4 z" fill="#12161C" />
          <Path d="M150 48 H196 Q206 48 212 58 L226 78 Q240 80 242 90 V100 H150 Z" fill={pintura} />
          <Path d="M150 48 H196 Q206 48 212 58 L226 78 Q240 80 242 90 V100 H150 Z" fill={`url(#${id}-luz)`} />
          <Path d="M176 54 H195 Q201 54 205 61 L217 78 H176 Z" fill={`url(#${id}-vidrio)`} />
          <Rect x={233} y={84} width={9} height={6} rx={2} fill="#FFF3C4" />
          <Rect x={16} y={86} width={228} height={9} rx={3} fill="#2A313B" />
          <Rueda cx={58} />
          <Rueda cx={204} />
        </G>
      )}
    </Svg>
  );
}

// Patente argentina (Mercosur): franja azul arriba y letras negras.
export function PatenteChip({ patente, tapada }: { patente: string; tapada?: boolean }) {
  return (
    <View style={styles.patente} accessibilityLabel={`Patente ${tapada ? 'parcial ' : ''}${patente.split('').join(' ')}`}>
      <View style={styles.franja}>
        <Text style={styles.franjaText}>REPÚBLICA ARGENTINA</Text>
      </View>
      <Text style={styles.numero}>{patente}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  patente: {
    alignSelf: 'flex-start',
    minWidth: 112,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#12161C',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  franja: { backgroundColor: '#1F4E9C', paddingVertical: 1, alignItems: 'center' },
  franjaText: { fontFamily: fonts.bold, fontSize: 6.5, letterSpacing: 0.6, color: '#FFFFFF' },
  numero: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 1.5,
    color: '#12161C',
    textAlign: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
});
