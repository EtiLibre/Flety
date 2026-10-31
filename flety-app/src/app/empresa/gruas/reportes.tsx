import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, StatCard, Vacio } from '@/components/empresa/ui';
import { Segmented } from '@/components/pedido/Choice';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { useAuth } from '@/lib/auth';
import { formatARS } from '@/lib/pricing';
import { nombreDe, reporte } from '@/modulos/gruas/api';
import { useCatalogoGruas } from '@/modulos/gruas/hooks';
import { G } from '@/modulos/gruas/ui';
import { colors, fonts } from '@/theme';

type Periodo = '7' | '30' | '90';

type Reporte = {
  solicitudes: number;
  finalizadas: number;
  en_curso: number;
  sin_grua: number;
  canceladas_cliente: number;
  canceladas_admin: number;
  facturacion: number;
  comisiones: number;
  pago_prestadores: number;
  min_asignacion: number | null;
  min_llegada: number | null;
  por_zona: { zona: string; n: number }[];
  por_tipo: Record<string, number>;
  ofertas: { enviadas: number; aceptadas: number; rechazadas: number; expiradas: number };
  prestadores: { aprobados: number; pendientes: number; disponibles: number };
};

function desdeHace(dias: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dias + 1);
  return d;
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

// Superadmin · Grúas: números del negocio (independientes de Mudanzas).
export default function ReportesGruas() {
  const { role } = useAuth();
  const isWide = useIsWide();
  const { catalogo } = useCatalogoGruas();
  const [periodo, setPeriodo] = useState<Periodo>('30');
  const [res, setRes] = useState<{ periodo: Periodo; r: Reporte | null; error: string | null } | null>(null);

  useEffect(() => {
    if (role !== 'superadmin') return;
    let cancelled = false;
    reporte(desdeHace(Number(periodo)))
      .then((r) => !cancelled && setRes({ periodo, r: r as unknown as Reporte, error: null }))
      .catch((e: Error) => !cancelled && setRes({ periodo, r: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [role, periodo]);

  if (role && role !== 'superadmin') return <Redirect href="/empresa/panel" />;

  const r = res?.periodo === periodo ? res.r : null;
  const fila = isWide ? { flexDirection: 'row' as const } : null;
  const maxZona = Math.max(1, ...(r?.por_zona ?? []).map((z) => z.n));

  return (
    <EmpresaShell
      active="gruasReportes"
      empresa={null}
      title="Grúas · Reportes"
      subtitle="Pedidos, facturación, comisiones y tiempos del servicio."
      aviso={res?.error}>
      <View style={{ maxWidth: 1000, width: '100%', gap: 16 }}>
        <View style={{ maxWidth: 420 }}>
          <Segmented
            options={[
              { value: '7', label: '7 días' },
              { value: '30', label: '30 días' },
              { value: '90', label: '90 días' },
            ]}
            value={periodo}
            onChange={setPeriodo}
          />
        </View>
        {!r ? (
          <Card>
            <Vacio texto={res?.error ? 'No pudimos cargar el reporte.' : 'Cargando…'} />
          </Card>
        ) : (
          <>
            <View style={[styles.stats, fila]}>
              <StatCard label="Facturación" value={formatARS(r.facturacion)} />
              <StatCard label="Comisiones" value={formatARS(r.comisiones)} />
              <StatCard label="Pago a gruistas" value={formatARS(r.pago_prestadores)} />
            </View>
            <View style={[styles.stats, fila]}>
              <StatCard label="Pedidos" value={String(r.solicitudes)} />
              <StatCard label="Finalizados" value={String(r.finalizadas)} suffix={pct(r.finalizadas, r.solicitudes)} />
              <StatCard label="Sin grúa" value={String(r.sin_grua)} suffix={pct(r.sin_grua, r.solicitudes)} />
              <StatCard label="Cancelados" value={String(r.canceladas_cliente + r.canceladas_admin)} />
            </View>
            <View style={[styles.stats, fila]}>
              <StatCard
                label="Asignación promedio"
                value={r.min_asignacion != null ? String(r.min_asignacion) : '—'}
                suffix="min"
              />
              <StatCard
                label="Llegada promedio"
                value={r.min_llegada != null ? String(r.min_llegada) : '—'}
                suffix="min"
              />
              <StatCard
                label="Ofertas aceptadas"
                value={pct(r.ofertas.aceptadas, r.ofertas.enviadas)}
                suffix={`de ${r.ofertas.enviadas}`}
              />
            </View>

            <View style={[styles.stats, fila]}>
              <Card title="Pedidos por zona" style={{ flex: 1 }}>
                {r.por_zona.length ? (
                  r.por_zona.map((z) => (
                    <View key={z.zona} style={{ gap: 4 }}>
                      <View style={styles.barraFila}>
                        <Text style={styles.texto}>{z.zona}</Text>
                        <Text style={styles.texto}>{z.n}</Text>
                      </View>
                      <View style={styles.barraFondo}>
                        <View style={[styles.barra, { width: `${(z.n / maxZona) * 100}%` }]} />
                      </View>
                    </View>
                  ))
                ) : (
                  <Vacio texto="Sin pedidos en el período." />
                )}
              </Card>
              <Card title="Por tipo de vehículo" style={{ flex: 1 }}>
                {Object.keys(r.por_tipo).length ? (
                  Object.entries(r.por_tipo)
                    .sort((a, b) => b[1] - a[1])
                    .map(([tipo, n]) => (
                      <View key={tipo} style={styles.barraFila}>
                        <Text style={styles.texto}>{nombreDe(catalogo?.tipos ?? [], tipo)}</Text>
                        <Text style={styles.texto}>{n}</Text>
                      </View>
                    ))
                ) : (
                  <Vacio texto="Sin pedidos en el período." />
                )}
              </Card>
              <Card title="Gruistas" style={{ flex: 1 }}>
                <View style={styles.barraFila}>
                  <Text style={styles.texto}>Aprobados</Text>
                  <Text style={styles.texto}>{r.prestadores.aprobados}</Text>
                </View>
                <View style={styles.barraFila}>
                  <Text style={styles.texto}>Para revisar</Text>
                  <Text style={styles.texto}>{r.prestadores.pendientes}</Text>
                </View>
                <View style={styles.barraFila}>
                  <Text style={styles.texto}>Disponibles ahora</Text>
                  <Text style={styles.texto}>{r.prestadores.disponibles}</Text>
                </View>
                <View style={styles.barraFila}>
                  <Text style={styles.texto}>Ofertas rechazadas / vencidas</Text>
                  <Text style={styles.texto}>
                    {r.ofertas.rechazadas} / {r.ofertas.expiradas}
                  </Text>
                </View>
              </Card>
            </View>
          </>
        )}
      </View>
    </EmpresaShell>
  );
}

const styles = StyleSheet.create({
  stats: { gap: 12 },
  texto: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  barraFila: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  barraFondo: { height: 8, borderRadius: 4, backgroundColor: colors.surface, overflow: 'hidden' },
  barra: { height: 8, borderRadius: 4, backgroundColor: G.acento },
});
