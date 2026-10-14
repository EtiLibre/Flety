import { ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors, fonts } from '@/theme';

// Vista previa del producto en el hero: mapa oscuro con la ruta y una tarjeta
// de pedido en curso (canvas "Web · landing pública").
export function HeroPreview({ height }: { height: number }) {
  return (
    <View style={[styles.card, { height }]}>
      <Svg width="100%" height="100%" viewBox="0 0 560 460" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <Rect width={560} height={460} fill="#161B22" />
        <Rect x={350} y={40} width={150} height={110} rx={16} fill="#18251E" />
        <Rect x={40} y={300} width={130} height={100} rx={16} fill="#18251E" />
        <G stroke="#232A34" fill="none" strokeLinecap="round">
          <Path d="M-10 110 L570 80" strokeWidth={9} />
          <Path d="M-10 230 L570 190" strokeWidth={16} />
          <Path d="M-10 350 L570 320" strokeWidth={9} />
          <Path d="M100 -10 L120 470" strokeWidth={9} />
          <Path d="M250 -10 L276 470" strokeWidth={16} />
          <Path d="M420 -10 L436 470" strokeWidth={9} />
        </G>
        <Path d="M112 340 L118 226 L262 214 L256 104 L420 92" stroke={colors.accent} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={112} cy={340} r={11} fill="#F2F4F7" stroke="#161B22" strokeWidth={4} />
        <Rect x={408} y={80} width={24} height={24} rx={6} fill={colors.accent} stroke="#161B22" strokeWidth={3} />
        <Circle cx={262} cy={214} r={30} fill={colors.accent} fillOpacity={0.22} />
        <Circle cx={262} cy={214} r={18} fill={colors.white} />
        <G x={252} y={204} stroke={colors.ink} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M1 4h10v8H1z" />
          <Path d="M11 7h3l3 3v2h-6z" />
          <Circle cx={4.5} cy={13.5} r={1.6} />
          <Circle cx={14} cy={13.5} r={1.6} />
        </G>
      </Svg>

      <View style={styles.verified}>
        <ShieldCheck size={16} color={colors.success} strokeWidth={2.2} />
        <Text style={styles.verifiedText}>Empresa verificada</Text>
      </View>

      <View style={styles.status}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Tu chofer está en camino</Text>
          <Text style={styles.eta}>12 min</Text>
        </View>
        <View style={styles.progress}>
          <View style={[styles.bar, { backgroundColor: colors.ink }]} />
          <View style={[styles.bar, styles.barHalf]}>
            <View style={styles.barFill} />
          </View>
          <View style={styles.bar} />
          <View style={styles.bar} />
          <View style={styles.bar} />
        </View>
        <Text style={styles.statusDetail}>Camioneta · Mudanza mediana · 1 ayudante</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderRadius: 28, overflow: 'hidden', backgroundColor: '#161B22', borderWidth: 1, borderColor: '#232A34' },
  verified: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  verifiedText: { fontFamily: fonts.bold, fontSize: 13, color: colors.success },
  status: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    maxWidth: 360,
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  statusTitle: { flex: 1, fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  eta: { fontFamily: fonts.display, fontSize: 14, color: colors.ink, backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  progress: { flexDirection: 'row', gap: 5 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  barHalf: { backgroundColor: colors.line },
  barFill: { width: '55%', height: '100%', backgroundColor: colors.ink },
  statusDetail: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
