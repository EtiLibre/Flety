import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Badge, BotonChico, Card, StatCard, Vacio } from '@/components/empresa/ui';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useAccion } from '@/hooks/use-accion';
import { useIsWide } from '@/hooks/use-is-wide';
import { useAuth } from '@/lib/auth';
import { confirmar } from '@/lib/confirm';
import {
  csvLiquidaciones,
  datosContables,
  descargarArchivo,
  guardarComisionDefault,
  liquidaciones,
  marcarLiquidados,
} from '@/lib/contabilidad';
import type { Pedido } from '@/lib/orders';
import { formatARS } from '@/lib/pricing';
import { colors, fonts, radius } from '@/theme';

type Periodo = 'mes' | 'anterior' | '90';

function rango(p: Periodo): { desde: Date; hasta: Date; label: string } {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const mesFmt = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });
  if (p === 'anterior') {
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    return { desde, hasta: inicioMes, label: mesFmt.format(desde) };
  }
  if (p === '90') {
    const desde = new Date(hoy);
    desde.setDate(desde.getDate() - 90);
    return { desde, hasta: new Date(hoy.getTime() + 86_400_000), label: 'últimos 90 días' };
  }
  return { desde: inicioMes, hasta: new Date(hoy.getTime() + 86_400_000), label: mesFmt.format(inicioMes) };
}

// Panel de contabilidad (sección 6.5): comisiones, liquidaciones a empresas y exportación.
export default function Contabilidad() {
  const { role } = useAuth();
  const isWide = useIsWide();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [datos, setDatos] = useState<Awaited<ReturnType<typeof datosContables>> | null>(null);
  const [version, setVersion] = useState(0);
  const [pctEdit, setPctEdit] = useState<string | null>(null);
  const { pendiente, error, ejecutar } = useAccion(() => setVersion((v) => v + 1));
  const r = rango(periodo);

  useEffect(() => {
    let cancelled = false;
    const { desde, hasta } = rango(periodo);
    datosContables(desde, hasta).then((d) => !cancelled && setDatos(d));
    return () => {
      cancelled = true;
    };
  }, [periodo, version]);

  if (role && role !== 'contabilidad' && role !== 'superadmin') return <Redirect href="/empresa/panel" />;

  const filas = datos ? liquidaciones(datos.empresas, datos.pedidos, datos.pctDefault) : [];
  const total = filas.reduce((a, f) => a + f.total, 0);
  const comision = filas.reduce((a, f) => a + f.comision, 0);
  const aLiquidar = filas.reduce((a, f) => a + f.netoPendiente, 0);
  const liquidado = filas.reduce((a, f) => a + f.netoLiquidado, 0);
  const disputas = datos?.pedidos.filter((p) => p.estado === 'en_disputa').length ?? 0;
  const sinConfirmar = datos?.pedidos.filter((p) => p.estado === 'entregado').length ?? 0;

  async function liquidar(nombre: string, pedidos: Pedido[]) {
    if (!(await confirmar(`¿Marcar ${pedidos.length} pedido(s) de ${nombre} como liquidados?`))) return;
    ejecutar(`liq-${nombre}`, () => marcarLiquidados(pedidos.map((p) => p.id)));
  }

  return (
    <EmpresaShell
      active="contabilidad"
      empresa={null}
      title="Contabilidad"
      subtitle="Comisiones de Flety y lo que corresponde liquidar a cada empresa."
      actions={
        filas.length ? (
          <BotonChico
            title="Exportar CSV"
            variant="dark"
            onPress={() =>
              descargarArchivo(
                `flety-liquidaciones-${r.label.replace(/\s+/g, '-')}.csv`,
                csvLiquidaciones(filas, r.label)
              )
            }
          />
        ) : undefined
      }>
      <View style={styles.aviso}>
        <Text style={styles.avisoText}>
          Todavía no hay cobros por la plataforma: los montos son los precios estimados de los pedidos confirmados.
          Cuando se integre Mercado Pago, este panel muestra los pagos reales (ver docs/pagos-contable-legal.md).
        </Text>
      </View>

      <View style={styles.periodos} role="tablist">
        {(
          [
            ['mes', 'Este mes'],
            ['anterior', 'Mes anterior'],
            ['90', 'Últimos 90 días'],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            role="tab"
            aria-selected={periodo === id}
            onPress={() => setPeriodo(id)}
            style={[styles.periodo, periodo === id && styles.periodoOn]}>
            <Text style={[styles.periodoText, periodo === id && styles.periodoTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!datos ? (
        <ActivityIndicator color={colors.ink} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.stats}>
            <StatCard label="Facturación estimada" value={formatARS(total)} dot />
            <StatCard label="Comisión Flety" value={formatARS(comision)} />
            <StatCard label="A liquidar a empresas" value={formatARS(aLiquidar)} />
            <StatCard label="Ya liquidado" value={formatARS(liquidado)} />
          </View>

          {disputas || sinConfirmar ? (
            <View style={styles.alertas}>
              {disputas ? (
                <Badge label={`${disputas} pedido(s) en disputa: no se liquidan hasta resolverse`} tone="danger" />
              ) : null}
              {sinConfirmar ? (
                <Badge label={`${sinConfirmar} entregado(s) esperando confirmación del cliente`} tone="warn" />
              ) : null}
            </View>
          ) : null}

          <Card title={`Liquidaciones · ${r.label}`}>
            {filas.length ? (
              <>
                {isWide ? (
                  <View style={styles.thRow}>
                    {['Empresa', 'Pedidos', 'Total', 'Comisión', 'Neto', 'A liquidar', ''].map((h, i) => (
                      <Text
                        key={i}
                        style={[styles.th, i === 0 ? { flex: 2 } : { flex: 1 }, i > 0 && { textAlign: 'right' }]}>
                        {h}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {filas.map((f) => (
                  <View key={f.empresa.id} style={[styles.fila, !isWide && styles.filaNarrow]}>
                    <View style={isWide ? { flex: 2 } : { width: '100%' }}>
                      <Text style={styles.nombre}>{f.empresa.nombre}</Text>
                      <Text style={styles.muted}>Comisión {f.pct}%</Text>
                    </View>
                    <Celda wide={isWide} label="Pedidos" valor={String(f.pedidos)} />
                    <Celda wide={isWide} label="Total" valor={formatARS(f.total)} />
                    <Celda wide={isWide} label="Comisión" valor={formatARS(f.comision)} />
                    <Celda wide={isWide} label="Neto" valor={formatARS(f.neto)} />
                    <Celda wide={isWide} label="A liquidar" valor={formatARS(f.netoPendiente)} fuerte />
                    <View style={isWide ? { flex: 1, alignItems: 'flex-end' } : undefined}>
                      {f.pendientes.length ? (
                        <BotonChico
                          title={`Liquidar (${f.pendientes.length})`}
                          loading={pendiente === `liq-${f.empresa.nombre}`}
                          onPress={() => liquidar(f.empresa.nombre, f.pendientes)}
                        />
                      ) : (
                        <Badge label="Al día" tone="success" />
                      )}
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <Vacio texto="No hay pedidos confirmados en este período." />
            )}
          </Card>

          {role === 'superadmin' ? (
            <Card title="Comisión por defecto">
              <Text style={styles.muted}>Se aplica a las empresas que no tienen una comisión propia.</Text>
              <View style={styles.pctRow}>
                <View style={styles.pctInput}>
                  <TextInput
                    value={pctEdit ?? String(datos.pctDefault)}
                    onChangeText={(v) => setPctEdit(v.replace(/[^0-9.]/g, '').slice(0, 5))}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Comisión por defecto en porcentaje"
                    style={styles.input}
                  />
                  <Text style={styles.pct}>%</Text>
                </View>
                <BotonChico
                  title="Guardar"
                  variant="dark"
                  disabled={pctEdit == null || Number(pctEdit) > 50}
                  loading={pendiente === 'pct'}
                  onPress={() =>
                    ejecutar('pct', async () => {
                      await guardarComisionDefault(Number(pctEdit));
                      setPctEdit(null);
                    })
                  }
                />
              </View>
            </Card>
          ) : null}
        </>
      )}
    </EmpresaShell>
  );
}

function Celda({ wide, label, valor, fuerte }: { wide: boolean; label: string; valor: string; fuerte?: boolean }) {
  if (wide) return <Text style={[styles.td, { flex: 1, textAlign: 'right' }, fuerte && styles.tdFuerte]}>{valor}</Text>;
  return (
    <View style={styles.celdaNarrow}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.td, fuerte && styles.tdFuerte]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: { padding: 14, borderRadius: 14, backgroundColor: '#FFF3D6' },
  avisoText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: '#7A4F00' },
  periodos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  periodo: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E6EA',
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  periodoOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  periodoText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  periodoTextOn: { color: colors.white },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  alertas: { gap: 8 },
  thRow: { flexDirection: 'row', gap: 12, paddingBottom: 8 },
  th: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  filaNarrow: { flexWrap: 'wrap' },
  celdaNarrow: { minWidth: '30%', gap: 2 },
  nombre: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  td: { fontFamily: fonts.medium, fontSize: 14, color: '#3A3F45' },
  tdFuerte: { fontFamily: fonts.bold, color: colors.ink },
  pctRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pctInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    width: 120,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.ink, minWidth: 0 },
  pct: { fontFamily: fonts.semibold, fontSize: 16, color: colors.muted },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
});
