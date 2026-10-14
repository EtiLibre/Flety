import { Check } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { TIMELINE, type OrderEstado } from '@/lib/state-machine';
import { colors, fonts } from '@/theme';

// Línea de tiempo vertical del pedido (canvas "Web · seguimiento").
export function Timeline({ estado }: { estado: OrderEstado }) {
  const current = TIMELINE.findIndex((step) => step.estados.includes(estado));

  return (
    <View accessibilityRole="list">
      {TIMELINE.map((step, index) => {
        const done = current > index || (current === index && index === TIMELINE.length - 1);
        const active = current === index && !done;
        const last = index === TIMELINE.length - 1;
        return (
          <View key={step.label} style={styles.item} accessibilityLabel={`${step.label}${done ? ', completado' : active ? ', en curso' : ''}`}>
            <View style={styles.rail}>
              {done ? (
                <View style={styles.dotDone}>
                  <Check size={12} color={colors.white} strokeWidth={3.4} />
                </View>
              ) : active ? (
                <View style={styles.dotActive} />
              ) : (
                <View style={styles.dotIdle} />
              )}
              {!last ? <View style={[styles.line, { backgroundColor: done ? colors.ink : colors.line }]} /> : null}
            </View>
            <Text style={[styles.label, done && styles.labelDone, active && styles.labelActive]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: 14 },
  rail: { alignItems: 'center' },
  dotDone: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  dotActive: { width: 22, height: 22, borderRadius: 11, borderWidth: 6, borderColor: colors.accent, backgroundColor: colors.ink },
  dotIdle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white },
  line: { width: 2, height: 20 },
  label: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, paddingTop: 1 },
  labelDone: { fontFamily: fonts.semibold, color: colors.ink },
  labelActive: { fontFamily: fonts.bold, color: colors.ink },
});
