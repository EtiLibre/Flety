import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { FleteCard, grupoDe, type GrupoFlete } from '@/components/historial/FleteCard';
import { PantallaTab } from '@/components/nav/PantallaTab';
import { Segmented } from '@/components/pedido/Choice';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { useMisPedidos } from '@/hooks/use-mis-pedidos';
import type { Pedido } from '@/lib/orders';
import { usePedidoDraft } from '@/lib/pedido-draft';
import { formatARS } from '@/lib/pricing';
import { colors, fonts } from '@/theme';

const VACIO: Record<GrupoFlete, string> = {
  en_curso: 'No tenés fletes en curso.',
  terminados: 'Todavía no terminaste ningún flete.',
  cancelados: 'No tenés fletes cancelados.',
};

// Historial del cliente: fletes en curso, terminados y cancelados.
export default function MisFletes() {
  const isWide = useIsWide();
  const { pedidos, loading } = useMisPedidos();
  const { update } = usePedidoDraft();
  const enCurso = pedidos.filter((p) => grupoDe(p) === 'en_curso');
  const [grupoElegido, setGrupo] = useState<GrupoFlete | null>(null);
  // Si hay alguno en curso, se abre ahí; si no, en terminados.
  const grupo = grupoElegido ?? (enCurso.length ? 'en_curso' : 'terminados');
  const lista = pedidos.filter((p) => grupoDe(p) === grupo);
  const terminados = pedidos.filter((p) => grupoDe(p) === 'terminados');
  const gastado = terminados.reduce((t, p) => t + (p.precio_estimado ?? 0), 0);

  function pedir() {
    router.push(isWide ? '/cliente/inicio' : '/cliente/nuevo-pedido');
  }

  // "Pedir de nuevo": mismo recorrido, tamaño y ayudantes; el resto se elige otra vez.
  function repetir(p: Pedido) {
    update({
      tipo: p.tipo,
      origen: p.origen,
      destino: p.destino,
      tamano: p.tamano ?? 'mediano',
      ayudantes: p.ayudantes ?? 1,
      cuando: { modo: 'ahora' },
      nota: p.nota ?? '',
      fotos: [],
      vehiculo: null,
    });
    pedir();
  }

  const contenido = (
    <>
      {terminados.length ? (
        <View style={styles.resumen}>
          <View style={styles.dato}>
            <Text style={styles.datoValor}>{terminados.length}</Text>
            <Text style={styles.datoLabel}>{terminados.length === 1 ? 'flete hecho' : 'fletes hechos'}</Text>
          </View>
          <View style={styles.sep} />
          <View style={styles.dato}>
            <Text style={styles.datoValor}>{formatARS(gastado)}</Text>
            <Text style={styles.datoLabel}>en total (estimado)</Text>
          </View>
        </View>
      ) : null}
      <Segmented
        options={[
          { value: 'en_curso', label: `En curso${enCurso.length ? ` · ${enCurso.length}` : ''}` },
          { value: 'terminados', label: 'Terminados' },
          { value: 'cancelados', label: 'Cancelados' },
        ]}
        value={grupo}
        onChange={setGrupo}
      />
      {loading ? (
        <ActivityIndicator color={colors.ink} style={{ marginTop: 20 }} />
      ) : lista.length ? (
        <View style={{ gap: 10 }}>
          {lista.map((p) => (
            <FleteCard
              key={p.id}
              pedido={p}
              tema="claro"
              onPress={() => router.push(`/cliente/pedidos/${p.id}`)}
              onRepetir={grupo !== 'en_curso' && p.origen && p.destino ? () => repetir(p) : undefined}
            />
          ))}
        </View>
      ) : (
        <View style={styles.vacio}>
          <Text style={styles.vacioText}>{VACIO[grupo]}</Text>
          {grupo === 'en_curso' ? (
            <Pressable accessibilityRole="button" onPress={pedir} style={styles.vacioBtn}>
              <Text style={styles.vacioBtnText}>Pedir un flete</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </>
  );

  const nuevo = (
    <Pressable accessibilityRole="button" accessibilityLabel="Pedir un flete" onPress={pedir} style={styles.nuevo}>
      <Plus size={18} color={colors.ink} strokeWidth={2.6} />
      <Text style={styles.nuevoText}>Pedir</Text>
    </Pressable>
  );

  if (isWide) {
    return (
      <ClienteShell
        active="pedidos"
        panel={
          <>
            <View style={styles.wideHead}>
              <Text style={styles.title} accessibilityRole="header">
                Mis fletes
              </Text>
              {nuevo}
            </View>
            {contenido}
          </>
        }
      />
    );
  }

  return (
    <PantallaTab
      titulo="Mis fletes"
      subtitulo="Tus fletes y mudanzas, en curso y anteriores."
      tema="claro"
      derecha={nuevo}>
      {contenido}
    </PantallaTab>
  );
}

const styles = StyleSheet.create({
  wideHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6, color: colors.ink },
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: colors.ink,
  },
  dato: { flex: 1, alignItems: 'center', gap: 2 },
  datoValor: { fontFamily: fonts.display, fontSize: 20, color: colors.white },
  datoLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.mutedOnInk },
  sep: { width: 1, height: 30, backgroundColor: '#2A313B' },
  vacio: { alignItems: 'center', gap: 12, paddingVertical: 30 },
  vacioText: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, textAlign: 'center' },
  vacioBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999, backgroundColor: colors.accent },
  vacioBtnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  nuevo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  nuevoText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
});
