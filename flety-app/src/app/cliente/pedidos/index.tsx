import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { FleteCard, grupoDe, type GrupoFlete } from '@/components/historial/FleteCard';
import { PantallaTab } from '@/components/nav/PantallaTab';
import { Segmented } from '@/components/pedido/Choice';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useAvisosFletes } from '@/hooks/use-avisos-fletes';
import { useIsWide } from '@/hooks/use-is-wide';
import { useMisPedidos } from '@/hooks/use-mis-pedidos';
import type { Pedido } from '@/lib/orders';
import { usePedidoDraft } from '@/lib/pedido-draft';
import { formatARS } from '@/lib/pricing';
import { HistorialGruas } from '@/modulos/gruas/Historial';
import { RUTA_PEDIR_GRUA } from '@/modulos/gruas/nav';
import { servicio, SERVICIOS, type ServicioId } from '@/plataforma/servicios';
import { colors, fonts } from '@/theme';

const VACIO: Record<GrupoFlete, string> = {
  en_curso: 'No tenés fletes en curso.',
  programados: 'No tenés mudanzas ni fletes programados.',
  terminados: 'Todavía no terminaste ningún flete.',
  cancelados: 'No tenés fletes cancelados.',
};

// Actividad del cliente: el historial de cada servicio (Mudanzas: fletes en
// curso, terminados y cancelados; Grúas: sus servicios de grúa).
export default function MisFletes() {
  const isWide = useIsWide();
  const { pedidos, loading } = useMisPedidos();
  const { update } = usePedidoDraft();
  const { porCalificar, porPagar } = useAvisosFletes(pedidos);
  const enCurso = pedidos.filter((p) => grupoDe(p) === 'en_curso');
  const programados = pedidos.filter((p) => grupoDe(p) === 'programados');
  const [grupoElegido, setGrupo] = useState<GrupoFlete | null>(null);
  const [servicioTab, setServicioTab] = useState<ServicioId>('mudanzas');
  // Se abre en curso si hay alguno; si no, en programados; si no, en terminados.
  const grupo = grupoElegido ?? (enCurso.length ? 'en_curso' : programados.length ? 'programados' : 'terminados');
  const lista = pedidos.filter((p) => grupoDe(p) === grupo);
  // Los programados, del más próximo al más lejano.
  if (grupo === 'programados') lista.sort((a, b) => (a.programado_para ?? '').localeCompare(b.programado_para ?? ''));
  const terminados = pedidos.filter((p) => grupoDe(p) === 'terminados');
  const gastado = terminados.reduce((t, p) => t + (p.precio_estimado ?? 0), 0);

  function pedir() {
    router.push(isWide ? '/cliente/mudanzas' : '/cliente/nuevo-pedido');
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
      carga: p.carga ?? '',
      vehiculo: null,
    });
    pedir();
  }

  const mudanzas = (
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
          { value: 'programados', label: 'Programados' },
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
              onRepetir={
                grupo !== 'en_curso' && grupo !== 'programados' && p.origen && p.destino ? () => repetir(p) : undefined
              }
              avisos={[
                ...(porPagar.has(p.id) ? [{ label: 'Pago pendiente', bg: '#FEF3C7', fg: '#92400E' }] : []),
                ...(porCalificar.has(p.id) ? [{ label: '★ Calificá a tu fletero', bg: '#FFF7D6', fg: '#7A5A00' }] : []),
              ]}
            />
          ))}
        </View>
      ) : (
        <View style={styles.vacio}>
          <Text style={styles.vacioText}>{VACIO[grupo]}</Text>
          {grupo === 'en_curso' || grupo === 'programados' ? (
            <Pressable accessibilityRole="button" onPress={pedir} style={styles.vacioBtn}>
              <Text style={styles.vacioBtnText}>
                {grupo === 'programados' ? 'Programar una mudanza' : 'Pedir un flete'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </>
  );

  // Cada servicio muestra su propio historial (los datos no se mezclan).
  const contenido = (
    <>
      <SelectorServicio valor={servicioTab} onCambio={setServicioTab} />
      {servicioTab === 'mudanzas' ? mudanzas : <HistorialGruas />}
    </>
  );

  const esGrua = servicioTab === 'gruas';
  const nuevo = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={esGrua ? 'Pedir una grúa' : 'Pedir un flete'}
      onPress={esGrua ? () => router.push(RUTA_PEDIR_GRUA) : pedir}
      style={[styles.nuevo, esGrua && { backgroundColor: servicio('gruas').color.acento }]}>
      <Plus size={18} color={esGrua ? colors.white : colors.ink} strokeWidth={2.6} />
      <Text style={[styles.nuevoText, esGrua && { color: colors.white }]}>Pedir</Text>
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
                Actividad
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
    <PantallaTab titulo="Actividad" subtitulo="Tus servicios, en curso y anteriores." tema="claro" derecha={nuevo}>
      {contenido}
    </PantallaTab>
  );
}

function SelectorServicio({ valor, onCambio }: { valor: ServicioId; onCambio: (v: ServicioId) => void }) {
  return (
    <View style={styles.selector} role="tablist" aria-label="Servicio">
      {SERVICIOS.map((s) => {
        const on = s.id === valor;
        return (
          <Pressable
            key={s.id}
            role="tab"
            aria-selected={on}
            onPress={() => onCambio(s.id)}
            style={[styles.selectorItem, on && { backgroundColor: s.color.suave, borderColor: s.color.acento }]}>
            <s.Icon size={17} color={on ? s.color.texto : colors.muted} strokeWidth={2.2} />
            <Text style={[styles.selectorTexto, on && { color: s.color.texto, fontFamily: fonts.bold }]}>
              {s.nombre}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  selector: { flexDirection: 'row', gap: 8 },
  selectorItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  selectorTexto: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
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
