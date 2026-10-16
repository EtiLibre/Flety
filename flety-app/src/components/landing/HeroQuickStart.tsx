import { router } from 'expo-router';
import { ArrowRight, Package, Route, Truck } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AddressField } from '@/components/pedido/AddressField';
import { usePedidoDraft } from '@/lib/pedido-draft';
import type { TipoServicio } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

const TIPOS: { tipo: TipoServicio; label: string; Icon: typeof Truck }[] = [
  { tipo: 'flete', label: 'Flete', Icon: Truck },
  { tipo: 'mudanza', label: 'Mudanza', Icon: Package },
  { tipo: 'larga_distancia', label: 'Larga distancia', Icon: Route },
];

// Arranque rápido del pedido desde el hero: tipo + retiro + entrega, y sigue en
// /pedir con eso cargado (sin cuenta todavía).
export function HeroQuickStart() {
  const { draft, update } = usePedidoDraft();
  const listo = !!draft.origen && !!draft.destino;

  return (
    <View style={styles.card}>
      <View style={styles.tipos} role="radiogroup" aria-label="Tipo de servicio">
        {TIPOS.map(({ tipo, label, Icon }) => {
          const on = draft.tipo === tipo;
          return (
            <Pressable
              key={tipo}
              role="radio"
              aria-checked={on}
              onPress={() => update({ tipo })}
              style={({ hovered }: { hovered?: boolean }) => [
                styles.tipo,
                on && styles.tipoOn,
                !on && hovered && styles.tipoHover,
              ]}>
              <Icon size={16} color={colors.ink} strokeWidth={2.2} />
              <Text style={[styles.tipoText, on && styles.tipoTextOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.route}>
        <View style={styles.rail}>
          <View style={styles.dotA} />
          <View style={styles.railLine} />
          <View style={styles.dotB} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AddressField
            label="Retiro"
            placeholder="¿Dónde retiramos?"
            value={draft.origen}
            onChange={(origen) => update({ origen })}
            allowCurrentLocation
          />
          <View style={styles.divider} />
          <AddressField
            label="Entrega"
            placeholder="¿A dónde va?"
            value={draft.destino}
            onChange={(destino) => update({ destino })}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/pedir')}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.cta,
          hovered && { backgroundColor: '#FFCB4D' },
          pressed && { transform: [{ scale: 0.98 }] },
        ]}>
        <Text style={styles.ctaText}>{listo ? 'Ver fleteros y precios' : 'Pedir un flete'}</Text>
        <ArrowRight size={20} color={colors.ink} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 14,
    borderRadius: 24,
    backgroundColor: colors.white,
    maxWidth: 520,
    width: '100%',
    boxShadow: '0 30px 70px rgba(0, 0, 0, 0.35)',
    zIndex: 5,
  },
  tipos: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 16, backgroundColor: colors.surface },
  tipo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 12,
  },
  tipoOn: { backgroundColor: colors.white, boxShadow: '0 2px 6px rgba(18, 22, 28, 0.10)' },
  tipoHover: { backgroundColor: '#E8EBEE' },
  tipoText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  tipoTextOn: { fontFamily: fonts.bold, color: colors.ink },
  route: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rail: { width: 12, alignItems: 'center', paddingTop: 34, paddingBottom: 30 },
  dotA: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  railLine: { flex: 1, width: 0, borderLeftWidth: 2, borderStyle: 'dotted', borderColor: '#8B95A1', marginVertical: 6 },
  dotB: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  divider: { height: 1, backgroundColor: colors.line },
  cta: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
});
