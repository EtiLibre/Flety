import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AccionCola } from '@/components/empresa/AccionCola';
import { ColaExtra } from '@/components/empresa/ColaExtra';
import {
  Badge,
  BotonChico,
  Card,
  ChoferFila,
  COLUMNAS_PEDIDO,
  EnVivo,
  PedidoFila,
  TablaHeader,
  Vacio,
} from '@/components/empresa/ui';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useAccion } from '@/hooks/use-accion';
import { useEmpresa } from '@/hooks/use-empresa';
import { useIsWide } from '@/hooks/use-is-wide';
import { confirmar } from '@/lib/confirm';
import { estadoDelChofer, grupoDelEstado, nombreChofer, rechazarPedido, type GrupoPedidos } from '@/lib/empresa';
import type { Pedido } from '@/lib/orders';
import { ESTADO_LABELS } from '@/lib/state-machine';
import { colors, fonts } from '@/theme';

const TABS: { id: GrupoPedidos; label: string; titulo: string; vacio: string }[] = [
  { id: 'cola', label: 'En cola', titulo: 'Esperando una empresa', vacio: 'No hay pedidos en la cola ahora.' },
  {
    id: 'asignados',
    label: 'Asignados',
    titulo: 'Aceptados, esperando que arranque el viaje',
    vacio: 'No tenés pedidos aceptados sin arrancar.',
  },
  { id: 'en_curso', label: 'En curso', titulo: 'Viajes en curso', vacio: 'No hay viajes en curso.' },
  {
    id: 'historial',
    label: 'Historial',
    titulo: 'Terminados y cancelados',
    vacio: 'Todavía no hay pedidos terminados.',
  },
];

const ESTADO_TONE: Partial<Record<Pedido['estado'], 'success' | 'warn' | 'neutral' | 'danger'>> = {
  confirmado: 'success',
  liquidado: 'success',
  entregado: 'success',
  en_disputa: 'danger',
  cancelado_cliente: 'neutral',
  reembolsado: 'neutral',
};

export default function PedidosEmpresa() {
  const isWide = useIsWide();
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: GrupoPedidos = TABS.some((t) => t.id === params.tab) ? (params.tab as GrupoPedidos) : 'cola';
  const { empresa, cola, pedidos, choferes, fotos, clientes, loading, recargar, esAdmin } = useEmpresa();
  const { pendiente, error, ejecutar } = useAccion(recargar);

  const grupos: Record<GrupoPedidos, Pedido[]> = { cola, asignados: [], en_curso: [], historial: [] };
  for (const p of pedidos) {
    const g = grupoDelEstado(p.estado);
    if (g) grupos[g].push(p);
  }
  const actual = TABS.find((t) => t.id === tab)!;
  const lista = grupos[tab];
  const disponibles = choferes.filter((c) => estadoDelChofer(c, pedidos) === 'disponible');

  async function rechazar(p: Pedido) {
    if (!(await confirmar('¿Rechazar este pedido? Vuelve a la cola para que lo tome otra empresa.'))) return;
    ejecutar(`rechazar-${p.id}`, () => rechazarPedido(p.id));
  }

  function columnaExtra(p: Pedido) {
    if (tab === 'cola') return <ColaExtra pedido={p} empresa={empresa} />;
    if (tab === 'asignados') {
      const chofer = choferes.find((c) => c.id === p.driver_id);
      return chofer ? (
        <Text style={styles.strong}>{nombreChofer(chofer)}</Text>
      ) : (
        <Badge label="Sin chofer" tone="warn" />
      );
    }
    const sub = clientes[p.cliente_id];
    return (
      <View style={{ gap: 4 }}>
        <Badge label={ESTADO_LABELS[p.estado]} tone={ESTADO_TONE[p.estado] ?? 'warn'} />
        {sub ? <Text style={styles.muted}>{sub}</Text> : null}
      </View>
    );
  }

  function accion(p: Pedido) {
    if (tab === 'cola') return <AccionCola pedido={p} empresa={empresa} pendiente={pendiente} ejecutar={ejecutar} />;
    if (tab === 'asignados' && !esAdmin) {
      return (
        <>
          <BotonChico
            title={p.driver_id ? 'Cambiar' : 'Asignar'}
            variant="dark"
            onPress={() => router.push(`/empresa/pedidos/${p.id}`)}
          />
          <BotonChico
            title="Rechazar"
            variant="danger"
            loading={pendiente === `rechazar-${p.id}`}
            onPress={() => rechazar(p)}
          />
        </>
      );
    }
    return <BotonChico title="Ver" variant="outline" onPress={() => router.push(`/empresa/pedidos/${p.id}`)} />;
  }

  const columnas = COLUMNAS_PEDIDO.map((c, i) =>
    i === 4 ? { ...c, titulo: tab === 'cola' ? 'Precio est.' : tab === 'asignados' ? 'Chofer' : 'Estado' } : c
  );

  return (
    <EmpresaShell
      active="pedidos"
      empresa={empresa}
      title="Pedidos"
      subtitle={
        esAdmin ? 'Todos los pedidos de Flety.' : 'Aceptá pedidos de la cola y asignales un chofer de tu flota.'
      }>
      <View style={styles.tabs} role="tablist" aria-label="Estado de los pedidos">
        {TABS.map((t) => {
          const selected = t.id === tab;
          const count = grupos[t.id].length;
          return (
            <Pressable
              key={t.id}
              role="tab"
              aria-selected={selected}
              onPress={() => router.setParams({ tab: t.id })}
              style={[styles.tab, selected && styles.tabActive]}>
              <Text style={[styles.tabText, selected && styles.tabTextActive]}>{t.label}</Text>
              {count && t.id !== 'historial' ? (
                <Text style={[styles.tabCount, selected && styles.tabCountActive]}>{count}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.ink} style={{ marginTop: 40 }} />
      ) : (
        <View style={[styles.columns, !isWide && styles.columnsNarrow]}>
          <Card
            title={actual.titulo}
            right={tab === 'cola' ? <EnVivo /> : undefined}
            style={isWide && { flex: 2, minWidth: 0 }}>
            {lista.length ? (
              <>
                {isWide ? <TablaHeader columnas={columnas} /> : null}
                <View style={!isWide && styles.cards}>
                  {lista.map((p) => (
                    <PedidoFila
                      key={p.id}
                      pedido={p}
                      fotos={fotos[p.id] ?? 0}
                      wide={isWide}
                      extra={columnaExtra(p)}
                      accion={accion(p)}
                    />
                  ))}
                </View>
              </>
            ) : (
              <Vacio texto={actual.vacio} />
            )}
          </Card>

          {!esAdmin ? (
            <Card title="Disponibles ahora" style={isWide && styles.side}>
              {disponibles.length ? (
                disponibles.map((c) => <ChoferFila key={c.id} chofer={c} estado="disponible" />)
              ) : (
                <Vacio texto="Ningún chofer de tu flota está disponible ahora." />
              )}
              <Text style={styles.muted}>
                Solo aparecen los choferes de tu flota que marcaron “Disponible” en su app.
              </Text>
            </Card>
          ) : null}
        </View>
      )}
    </EmpresaShell>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E3E6EA',
  },
  tabActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  tabText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  tabTextActive: { color: colors.white },
  tabCount: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.ink,
    backgroundColor: colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tabCountActive: { backgroundColor: colors.accent },
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  columnsNarrow: { flexDirection: 'column', alignItems: 'stretch' },
  side: { flex: 1, minWidth: 280 },
  cards: { gap: 10 },
  strong: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.danger,
    backgroundColor: colors.dangerBg,
    padding: 14,
    borderRadius: 14,
    overflow: 'hidden',
  },
});
