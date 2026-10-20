import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

// Gráficos simples del panel (web y celular, sin librerías). Un solo color:
// comparan cantidades, no identidades. Los valores van en texto, no en color.
const BARRA = colors.ink;
const PISTA = '#EEF0F2';

// Barras horizontales: categoría, barra proporcional y valor (con % del total).
export function BarList({
  items,
  vacio = 'Sin datos todavía.',
  pctDe = 'total',
}: {
  items: { label: string; n: number }[];
  vacio?: string;
  // Embudos: el % se calcula sobre el primer paso, no sobre la suma.
  pctDe?: 'total' | 'primero';
}) {
  const max = Math.max(1, ...items.map((i) => i.n));
  const total = items.reduce((a, i) => a + i.n, 0);
  const base = pctDe === 'primero' ? items[0]?.n || 1 : total;
  if (!items.length || !total) return <Text style={styles.vacio}>{vacio}</Text>;
  return (
    <View style={styles.list} accessibilityRole="list">
      {items.map((i) => (
        <View key={i.label} style={styles.item} accessibilityLabel={`${i.label}: ${i.n}`}>
          <View style={styles.itemTop}>
            <Text style={styles.label} numberOfLines={1}>
              {i.label}
            </Text>
            <Text style={styles.valor}>
              {i.n.toLocaleString('es-AR')} <Text style={styles.pct}>· {Math.round((i.n / base) * 100)}%</Text>
            </Text>
          </View>
          <View style={styles.pista}>
            <View style={[styles.barra, { width: `${Math.max(2, (i.n / max) * 100)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Columnas (días u horas). Pasando el mouse o tocando una, se ve su valor.
export function Columnas({
  items,
  alto = 140,
  unidad,
}: {
  items: { label: string; corto: string; n: number }[];
  alto?: number;
  unidad: string;
}) {
  const [activa, setActiva] = useState<number | null>(null);
  const max = Math.max(1, ...items.map((i) => i.n));
  const sel = activa != null ? items[activa] : null;
  const total = items.reduce((a, i) => a + i.n, 0);
  // Etiquetas del eje: primera, del medio y última (no todas, para no amontonar).
  const marcas = new Set([0, Math.floor((items.length - 1) / 2), items.length - 1]);
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.tooltip} accessibilityLiveRegion="polite">
        {sel
          ? `${sel.label}: ${sel.n.toLocaleString('es-AR')} ${unidad}`
          : `Total: ${total.toLocaleString('es-AR')} ${unidad}`}
      </Text>
      <View style={[styles.columnas, { height: alto }]}>
        {items.map((i, idx) => (
          <Pressable
            key={i.label}
            accessibilityLabel={`${i.label}: ${i.n} ${unidad}`}
            onHoverIn={() => setActiva(idx)}
            onHoverOut={() => setActiva(null)}
            onPress={() => setActiva(idx === activa ? null : idx)}
            style={styles.colHit}>
            <View
              style={[
                styles.col,
                { height: `${Math.max(i.n ? 3 : 1, (i.n / max) * 100)}%` },
                activa === idx && { backgroundColor: colors.accent },
                !i.n && { backgroundColor: PISTA },
              ]}
            />
          </Pressable>
        ))}
      </View>
      <View style={styles.eje}>
        {[...marcas].map((idx) => (
          <Text key={idx} style={styles.ejeText}>
            {items[idx]?.corto}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  vacio: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, paddingVertical: 8 },
  list: { gap: 12 },
  item: { gap: 6 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  valor: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  pct: { fontFamily: fonts.regular, color: colors.muted },
  pista: { height: 8, borderRadius: 4, backgroundColor: PISTA, overflow: 'hidden' },
  barra: { height: 8, borderRadius: 4, backgroundColor: BARRA },
  tooltip: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  columnas: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  colHit: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  col: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: BARRA },
  eje: { flexDirection: 'row', justifyContent: 'space-between' },
  ejeText: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
});
