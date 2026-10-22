import { Truck } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { VEHICULO_LABEL, type Vehiculo } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

function VehicleIcon({ vehiculo }: { vehiculo: Vehiculo }) {
  if (vehiculo === 'camioneta') return <Truck size={28} color={colors.ink} strokeWidth={1.8} />;
  const d =
    vehiculo === 'utilitario'
      ? ['M2 16V9a2 2 0 0 1 2-2h9l5 4h2a2 2 0 0 1 2 2v3', 'M2 16h20']
      : ['M1 4h14v12H1z', 'M15 8h4l4 4v4h-8z'];
  const wheels =
    vehiculo === 'utilitario'
      ? [
          [7, 17.5],
          [17, 17.5],
        ]
      : [
          [6, 18],
          [18, 18],
        ];
  return (
    <Svg
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.ink}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round">
      {d.map((path) => (
        <Path key={path} d={path} />
      ))}
      {wheels.map(([cx, cy]) => (
        <Circle key={`${cx}`} cx={cx} cy={cy} r={2} />
      ))}
    </Svg>
  );
}

export function VehicleOption({
  vehiculo,
  precio,
  selected,
  onPress,
}: {
  vehiculo: Vehiculo;
  precio: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  const label = VEHICULO_LABEL[vehiculo];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label.titulo}, ${label.detalle}${precio ? `, ${precio}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected ? styles.selected : styles.idle, pressed && { opacity: 0.85 }]}>
      <View style={[styles.icon, { backgroundColor: selected ? colors.accent : colors.surface }]}>
        <VehicleIcon vehiculo={vehiculo} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{label.titulo}</Text>
        <Text style={styles.detail}>{label.detalle}</Text>
      </View>
      <Text style={styles.price}>{precio ?? '—'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
  },
  idle: { borderWidth: 1, borderColor: colors.line, margin: 1 },
  selected: { borderWidth: 2, borderColor: colors.ink },
  icon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  detail: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  price: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
});
