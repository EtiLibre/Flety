import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

// Estética "color con volumen" (canvas Flety · Propuesta): degradés en botones
// y tarjetas, sombras del mismo tono y vidrio con blur estilo Apple.

export const DEGRADES = {
  sol: ['#FFD452', '#FFB21E'],
  solSuave: ['#FFFBEB', '#FFE9A8'],
  fuego: ['#FF8A3D', '#F0520F'],
  fuegoSuave: ['#FFF4EC', '#FFD2B5'],
  grafito: ['#2E3640', '#12161C'],
  brasa: ['#3A1608', '#1E0A03'],
  peligro: ['#FFF1EF', '#FDE1DD'],
} as const;

export type NombreDegrade = keyof typeof DEGRADES;

// Sombra de color debajo de un botón o tarjeta.
export const SOMBRAS = {
  sol: '0px 12px 24px -10px rgba(255,166,0,0.85)',
  fuego: '0px 12px 24px -10px rgba(240,82,15,0.85)',
  grafito: '0px 12px 24px -10px rgba(18,22,28,0.8)',
  peligro: '0px 8px 18px -10px rgba(180,35,24,0.45)',
  tarjeta: '0px 1px 2px rgba(18,22,28,0.05), 0px 14px 30px -16px rgba(18,22,28,0.28)',
  flotante: '0px 18px 40px -14px rgba(18,22,28,0.35)',
  solTarjeta: '0px 22px 40px -22px rgba(255,159,28,0.75)',
  fuegoTarjeta: '0px 22px 40px -22px rgba(240,82,15,0.7)',
} as const;

export const FONDO_LIENZO = '#F6F7F9';

export function Degrade({
  nombre,
  colores,
  style,
  children,
  diagonal = false,
}: {
  nombre?: NombreDegrade;
  colores?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  diagonal?: boolean;
}) {
  const c = colores ?? DEGRADES[nombre ?? 'sol'];
  return (
    <LinearGradient
      colors={c as unknown as [string, string, ...string[]]}
      start={diagonal ? { x: 0, y: 0 } : { x: 0.5, y: 0 }}
      end={diagonal ? { x: 1, y: 1 } : { x: 0.5, y: 1 }}
      style={style}>
      {children}
    </LinearGradient>
  );
}

// Vidrio: fondo translúcido que desenfoca lo que hay detrás. En Android (donde
// el blur depende del equipo) queda como un fondo translúcido sin desenfoque.
export function Vidrio({
  oscuro = false,
  intensidad = 40,
  style,
  children,
}: {
  oscuro?: boolean;
  intensidad?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const borde = oscuro ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.75)';
  const fondo = oscuro ? 'rgba(30,36,45,0.55)' : 'rgba(255,255,255,0.6)';
  if (Platform.OS === 'android') {
    return (
      <View style={[{ backgroundColor: oscuro ? 'rgba(30,36,45,0.92)' : 'rgba(255,255,255,0.94)' }, style]}>
        {children}
      </View>
    );
  }
  return (
    <BlurView
      intensity={intensidad}
      tint={oscuro ? 'dark' : 'light'}
      style={[{ backgroundColor: fondo, borderColor: borde, borderWidth: 1, overflow: 'hidden' }, style]}>
      {children}
    </BlurView>
  );
}

// Luz de color en la esquina de una tarjeta.
export function Resplandor({ color, tamano = 190, style }: { color: string; tamano?: number; style?: ViewStyle }) {
  const id = `resplandor-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <View
      pointerEvents="none"
      style={[
        { position: 'absolute', right: -tamano * 0.28, top: -tamano * 0.32, width: tamano, height: tamano },
        style,
      ]}>
      <Svg width={tamano} height={tamano} aria-hidden>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.6} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={tamano / 2} cy={tamano / 2} r={tamano / 2} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

// ── Íconos (trazo como Lucide) ─────────────────────────────────────────────
type PropsIcono = { size?: number; color?: string; strokeWidth?: number };

// Camioneta con caja abierta y una caja de mudanza.
export function IconoCamioneta({ size = 24, color = '#12161C', strokeWidth = 2 }: PropsIcono) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Path d="M2 17v-5h11v5" />
      <Path d="M13 17V9h4l4 4v4h-1.5" />
      <Path d="M4.5 12V7.5h5V12" />
      <Path d="M8 17h3" />
      <Circle cx={5.5} cy={17.5} r={2} />
      <Circle cx={17.5} cy={17.5} r={2} />
    </Svg>
  );
}

// ── Ilustraciones ──────────────────────────────────────────────────────────
// Camioneta amarilla con la caja abierta llena de cajas de cartón (Mudanzas).
export function CamionetaIlustracion({ ancho = 120 }: { ancho?: number }) {
  return (
    <Svg width={ancho} height={(ancho * 74) / 120} viewBox="0 0 120 74" aria-hidden>
      <Defs>
        <SvgGradient id="cam-pintura" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFD452" />
          <Stop offset="1" stopColor="#FFA41B" />
        </SvgGradient>
        <SvgGradient id="cam-carton" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E2B07A" />
          <Stop offset="1" stopColor="#C98E52" />
        </SvgGradient>
      </Defs>
      <Ellipse cx={58} cy={68} rx={52} ry={4} fill="rgba(122,90,0,0.18)" />
      <Rect x={10} y={17} width={24} height={22} rx={2} fill="url(#cam-carton)" />
      <Rect x={19} y={17} width={6} height={22} fill="#F1D3A8" opacity={0.7} />
      <Rect x={36} y={24} width={20} height={15} rx={2} fill="url(#cam-carton)" />
      <Rect x={43} y={24} width={6} height={15} fill="#F1D3A8" opacity={0.7} />
      <Rect x={14} y={5} width={16} height={13} rx={2} fill="url(#cam-carton)" />
      <Rect x={20} y={5} width={4} height={13} fill="#F1D3A8" opacity={0.7} />
      <Path d="M5 36h59v18H5z" fill="url(#cam-pintura)" />
      <Path d="M5 36h59" stroke="#C98500" strokeWidth={2.5} />
      <Path d="M62 54V31a4 4 0 0 1 4-4h17l13 13v14z" fill="url(#cam-pintura)" />
      <Path d="M68 31h14l9 9H68z" fill="#12161C" />
      <Rect x={94} y={46} width={10} height={7} rx={2} fill="#12161C" />
      <Rect x={96} y={41} width={5} height={3} rx={1} fill="#FFF4D6" />
      <Rect x={4} y={53} width={100} height={5} rx={2} fill="#12161C" />
      <Circle cx={22} cy={59} r={8} fill="#12161C" />
      <Circle cx={22} cy={59} r={3} fill="#F1F3F5" />
      <Circle cx={84} cy={59} r={8} fill="#12161C" />
      <Circle cx={84} cy={59} r={3} fill="#F1F3F5" />
    </Svg>
  );
}

// Grúa de plancha naranja llevando un auto (Grúas y auxilio).
export function GruaPlanchaIlustracion({ ancho = 120, cabina }: { ancho?: number; cabina?: [string, string] }) {
  const [c1, c2] = cabina ?? ['#FF9A4D', '#E8430F'];
  return (
    <Svg width={ancho} height={(ancho * 74) / 120} viewBox="0 0 120 74" aria-hidden>
      <Defs>
        <SvgGradient id="grua-cabina" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c1} />
          <Stop offset="1" stopColor={c2} />
        </SvgGradient>
        <SvgGradient id="grua-auto" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6B7682" />
          <Stop offset="1" stopColor="#3E4752" />
        </SvgGradient>
      </Defs>
      <Ellipse cx={60} cy={68} rx={54} ry={4} fill="rgba(74,27,12,0.18)" />
      <Path d="M10 43v-6a3 3 0 0 1 3-3h8l8-7h20l8 7h6a4 4 0 0 1 4 4v5z" fill="url(#grua-auto)" />
      <Path d="M25 33l6-5h8v5z" fill="#DCE3EA" />
      <Path d="M41 28h7l6 5H41z" fill="#DCE3EA" />
      <Circle cx={21} cy={43} r={5} fill="#12161C" />
      <Circle cx={21} cy={43} r={2} fill="#C5CBD3" />
      <Circle cx={56} cy={43} r={5} fill="#12161C" />
      <Circle cx={56} cy={43} r={2} fill="#C5CBD3" />
      <Path d="M2 51l5-4h72v4z" fill="#2A1006" />
      <Path d="M14 47l4-6M60 47l-3-6" stroke="#FFC233" strokeWidth={1.5} />
      <Path d="M79 55V30a4 4 0 0 1 4-4h15l13 13v16z" fill="url(#grua-cabina)" />
      <Path d="M85 30h12l9 9H85z" fill="#2A1006" />
      <Rect x={86} y={22} width={9} height={4} rx={1.5} fill="#FFC233" />
      <Rect x={108} y={47} width={6} height={6} rx={2} fill="#2A1006" />
      <Rect x={8} y={51} width={104} height={5} rx={2} fill="#2A1006" />
      <Circle cx={24} cy={59} r={7.5} fill="#2A1006" />
      <Circle cx={24} cy={59} r={3} fill="#FFE9DC" />
      <Circle cx={41} cy={59} r={7.5} fill="#2A1006" />
      <Circle cx={41} cy={59} r={3} fill="#FFE9DC" />
      <Circle cx={97} cy={59} r={7.5} fill="#2A1006" />
      <Circle cx={97} cy={59} r={3} fill="#FFE9DC" />
    </Svg>
  );
}

export const estilosComunes = StyleSheet.create({
  tarjeta: { backgroundColor: '#FFFFFF', borderRadius: 22, boxShadow: SOMBRAS.tarjeta },
});
