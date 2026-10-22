import { Link, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AnuncioPopup } from '@/components/AnuncioPopup';
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
  StatCard,
  TablaHeader,
  Vacio,
} from '@/components/empresa/ui';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useAccion } from '@/hooks/use-accion';
import { useEmpresa } from '@/hooks/use-empresa';
import { useIsWide } from '@/hooks/use-is-wide';
import { useAuth } from '@/lib/auth';
import { estadoDelChofer, nombreChofer } from '@/lib/empresa';
import { EN_VIAJE } from '@/lib/seguimiento';
import { colors, fonts } from '@/theme';

const MAX_FILAS = 6;

export default function PanelEmpresa() {
  const isWide = useIsWide();
  const { role } = useAuth();
  const { empresa, cola, pedidos, choferes, fotos, loading, error: errorCarga, recargar } = useEmpresa();
  const { pendiente, error, ejecutar } = useAccion(recargar);

  const enCurso = pedidos.filter((p) => EN_VIAJE.includes(p.estado));
  const sinChofer = pedidos.filter((p) => p.estado === 'asignado' && !p.driver_id);
  const estados = choferes.map((c) => ({ chofer: c, estado: estadoDelChofer(c, pedidos) }));
  const disponibles = estados.filter((e) => e.estado === 'disponible').length;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  // "Completado" = el cliente confirmó la entrega. No hay pagos reales todavía (sección 10.1).
  const completadosMes = pedidos.filter(
    (p) => ['confirmado', 'liquidado'].includes(p.estado) && new Date(p.created_at) >= inicioMes
  ).length;

  return (
    <EmpresaShell
      aviso={errorCarga}
      active="panel"
      empresa={empresa}
      title="Panel de operaciones"
      subtitle="Pedidos de tu zona y tu flota, en tiempo real.">
      {loading ? (
        <ActivityIndicator color={colors.ink} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.stats}>
            <StatCard label="Pedidos en cola" value={String(cola.length)} dot />
            <StatCard label="Choferes disponibles" value={String(disponibles)} suffix={`de ${choferes.length}`} />
            <StatCard label="Viajes en curso" value={String(enCurso.length)} />
            <StatCard label="Completados este mes" value={String(completadosMes)} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={[styles.columns, !isWide && styles.columnsNarrow]}>
            <View style={[styles.mainCol, isWide && { flex: 2 }]}>
              <Card title="Cola de pedidos" right={<EnVivo />}>
                {cola.length ? (
                  <>
                    {isWide ? (
                      <TablaHeader
                        columnas={COLUMNAS_PEDIDO.map((c, i) => (i === 4 ? { ...c, titulo: 'Precio est.' } : c))}
                      />
                    ) : null}
                    <View style={!isWide && styles.cards}>
                      {cola.slice(0, MAX_FILAS).map((p) => (
                        <PedidoFila
                          key={p.id}
                          pedido={p}
                          fotos={fotos[p.id] ?? 0}
                          wide={isWide}
                          extra={<ColaExtra pedido={p} empresa={empresa} />}
                          accion={<AccionCola pedido={p} empresa={empresa} pendiente={pendiente} ejecutar={ejecutar} />}
                        />
                      ))}
                    </View>
                    {cola.length > MAX_FILAS ? (
                      <Link href="/empresa/pedidos" style={styles.link}>
                        Ver los {cola.length} pedidos en cola
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <Vacio
                    texto={
                      empresa && empresa.estado_aprobacion !== 'aprobada'
                        ? 'La cola aparece cuando Flety aprueba tu empresa.'
                        : 'No hay pedidos esperando. Te aparecen acá apenas un cliente pide un servicio.'
                    }
                  />
                )}
              </Card>

              {sinChofer.length ? (
                <Card
                  title="Aceptados, esperando chofer"
                  right={<Badge label={String(sinChofer.length)} tone="warn" />}>
                  <View style={!isWide && styles.cards}>
                    {sinChofer.slice(0, MAX_FILAS).map((p) => (
                      <PedidoFila
                        key={p.id}
                        pedido={p}
                        fotos={fotos[p.id] ?? 0}
                        wide={isWide}
                        extra={<Badge label="Sin chofer" tone="warn" />}
                        accion={<AbrirDetalle id={p.id} />}
                      />
                    ))}
                  </View>
                </Card>
              ) : null}
            </View>

            <Card title="Tu flota" style={isWide ? styles.sideCol : undefined}>
              {estados.length ? (
                estados
                  .slice(0, 6)
                  .map(({ chofer, estado }) => <ChoferFila key={chofer.id} chofer={chofer} estado={estado} />)
              ) : (
                <Vacio texto="Todavía no hay choferes en tu flota." />
              )}
              {enCurso.length ? (
                <Text style={styles.muted}>
                  En viaje:{' '}
                  {enCurso
                    .map((p) => choferes.find((c) => c.id === p.driver_id))
                    .filter((c) => !!c)
                    .map((c) => nombreChofer(c))
                    .join(', ')}
                </Text>
              ) : null}
              <Link href="/empresa/choferes" style={styles.link}>
                Ver todos los choferes
              </Link>
            </Card>
          </View>
        </>
      )}
      {role === 'empresa' ? <AnuncioPopup audiencia="empresa" /> : null}
    </EmpresaShell>
  );
}

function AbrirDetalle({ id }: { id: string }) {
  return <BotonChico title="Asignar" variant="dark" onPress={() => router.push(`/empresa/pedidos/${id}`)} />;
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  columnsNarrow: { flexDirection: 'column', alignItems: 'stretch' },
  mainCol: { gap: 24, minWidth: 0 },
  sideCol: { flex: 1, minWidth: 280 },
  cards: { gap: 10 },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  precio: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
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
