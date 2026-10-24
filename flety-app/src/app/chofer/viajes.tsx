import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { FleteCard } from '@/components/historial/FleteCard';
import { PantallaTab } from '@/components/nav/PantallaTab';
import { useChofer } from '@/hooks/use-chofer';
import { HECHOS, resumen, useMisViajes, type Periodo } from '@/hooks/use-mis-viajes';
import type { Pedido } from '@/lib/orders';
import { formatARS } from '@/lib/pricing';
import { colors, fonts } from '@/theme';

const d = colors.dark;

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
];

const dia = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

function claveDia(p: Pedido) {
  const f = new Date(p.programado_para ?? p.created_at);
  return `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`;
}

function tituloDia(p: Pedido) {
  const f = new Date(p.programado_para ?? p.created_at);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  if (f.toDateString() === hoy.toDateString()) return 'Hoy';
  if (f.toDateString() === ayer.toDateString()) return 'Ayer';
  const t = dia.format(f);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Historial del chofer: lo que hizo hoy, en la semana y en el mes, y la lista
// de viajes por día.
export default function MisViajes() {
  const { chofer } = useChofer();
  const { viajes, loading, error } = useMisViajes(chofer?.id ?? null);
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [filtro, setFiltro] = useState<'todos' | 'hechos'>('todos');
  const r = resumen(viajes, periodo);

  const lista = filtro === 'hechos' ? viajes.filter((v) => HECHOS.includes(v.estado)) : viajes;
  const grupos: { clave: string; titulo: string; items: Pedido[] }[] = [];
  for (const v of lista) {
    const clave = claveDia(v);
    const g = grupos.find((x) => x.clave === clave);
    if (g) g.items.push(v);
    else grupos.push({ clave, titulo: tituloDia(v), items: [v] });
  }

  return (
    <PantallaTab titulo="Mis viajes" subtitulo="Tus viajes y lo que facturaste." tema="oscuro">
      <View style={styles.resumen}>
        <View style={styles.periodos} role="tablist">
          {PERIODOS.map((p) => (
            <Pressable
              key={p.id}
              role="tab"
              aria-selected={periodo === p.id}
              onPress={() => setPeriodo(p.id)}
              style={[styles.periodo, periodo === p.id && styles.periodoOn]}>
              <Text style={[styles.periodoText, periodo === p.id && styles.periodoTextOn]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.total}>{formatARS(r.total)}</Text>
        <Text style={styles.totalLabel}>facturado en viajes terminados</Text>
        <View style={styles.datos}>
          <Dato valor={String(r.viajes)} label={r.viajes === 1 ? 'viaje' : 'viajes'} />
          <View style={styles.sep} />
          <Dato valor={`${Math.round(r.km)} km`} label="recorridos" />
          <View style={styles.sep} />
          <Dato valor={r.viajes ? formatARS(Math.round(r.total / r.viajes)) : '—'} label="por viaje" />
        </View>
        <Text style={styles.nota}>
          Precio de cada viaje según las tarifas de tu empresa. Lo que cobrás lo arreglás con ella.
        </Text>
      </View>

      <View style={styles.filtros}>
        {(['todos', 'hechos'] as const).map((f) => (
          <Pressable
            key={f}
            accessibilityRole="button"
            accessibilityState={{ selected: filtro === f }}
            onPress={() => setFiltro(f)}
            style={[styles.filtro, filtro === f && styles.filtroOn]}>
            <Text style={[styles.filtroText, filtro === f && styles.filtroTextOn]}>
              {f === 'todos' ? 'Todos' : 'Terminados'}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
      ) : grupos.length ? (
        grupos.map((g) => (
          <View key={g.clave} style={{ gap: 10 }}>
            <Text style={styles.dia}>{g.titulo}</Text>
            {g.items.map((v) => (
              <FleteCard key={v.id} pedido={v} tema="oscuro" />
            ))}
          </View>
        ))
      ) : (
        <Text style={styles.vacio}>
          Todavía no tenés viajes. Activá “Estás disponible” en Viaje para empezar a recibir.
        </Text>
      )}
    </PantallaTab>
  );
}

function Dato({ valor, label }: { valor: string; label: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoValor} numberOfLines={1}>
        {valor}
      </Text>
      <Text style={styles.datoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  resumen: {
    gap: 4,
    padding: 18,
    borderRadius: 24,
    backgroundColor: d.surface,
    borderWidth: 1,
    borderColor: d.line,
  },
  periodos: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  periodo: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: d.chip },
  periodoOn: { backgroundColor: colors.accent },
  periodoText: { fontFamily: fonts.semibold, fontSize: 13, color: d.text },
  periodoTextOn: { fontFamily: fonts.bold, color: colors.ink },
  total: { fontFamily: fonts.display, fontSize: 36, letterSpacing: -0.8, color: d.text },
  totalLabel: { fontFamily: fonts.regular, fontSize: 13, color: d.muted },
  datos: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  dato: { flex: 1, alignItems: 'center', gap: 2 },
  datoValor: { fontFamily: fonts.bold, fontSize: 16, color: d.text },
  datoLabel: { fontFamily: fonts.regular, fontSize: 12, color: d.muted },
  sep: { width: 1, height: 28, backgroundColor: d.line },
  nota: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: d.muted, marginTop: 12 },
  filtros: { flexDirection: 'row', gap: 8 },
  filtro: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: d.line },
  filtroOn: { backgroundColor: d.text, borderColor: d.text },
  filtroText: { fontFamily: fonts.semibold, fontSize: 13, color: d.text },
  filtroTextOn: { color: colors.ink },
  dia: { fontFamily: fonts.bold, fontSize: 14, color: d.muted, marginTop: 4 },
  vacio: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: d.muted,
    textAlign: 'center',
    marginTop: 20,
  },
  error: { fontFamily: fonts.medium, fontSize: 13, color: '#FF8A80' },
});
