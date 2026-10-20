import { Redirect } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { BarList, Columnas } from '@/components/empresa/charts';
import { Card, StatCard } from '@/components/empresa/ui';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { useAuth } from '@/lib/auth';
import {
  DISPOSITIVO_LABEL,
  estadisticas,
  ordenar,
  PANTALLA_LABEL,
  ROL_LABEL,
  MarketingPreviewContext,
  type Estadisticas,
} from '@/lib/marketing';
import { TIPO_LABEL } from '@/lib/types';
import { colors, fonts } from '@/theme';

const RANGOS = [
  { dias: 7, label: '7 días' },
  { dias: 30, label: '30 días' },
  { dias: 90, label: '90 días' },
] as const;

const diaCorto = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const diaLargo = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

function fechaDe(dia: string) {
  const [y, m, d] = dia.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Panel de marketing: de dónde y cómo usan Flety (dispositivos, zonas, horarios)
// y cómo rinden los anuncios. Todo agregado y anónimo.
export default function Marketing() {
  const { role } = useAuth();
  const isWide = useIsWide();
  const [dias, setDias] = useState<number>(30);
  const [datos, setDatos] = useState<{ dias: number; e: Estadisticas } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preview = useContext(MarketingPreviewContext);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    desde.setDate(desde.getDate() - (dias - 1));
    estadisticas(desde)
      .then((e) => !cancelled && setDatos({ dias, e }))
      .catch(
        (err) => !cancelled && setError(err instanceof Error ? err.message : 'No pudimos cargar las estadísticas.')
      );
    return () => {
      cancelled = true;
    };
  }, [dias, preview]);

  if (role && role !== 'marketing' && role !== 'superadmin') return <Redirect href="/empresa/panel" />;

  const e = preview ?? (datos?.dias === dias ? datos.e : null);
  const conversion = e && e.sesiones ? Math.round((e.pedidos / e.sesiones) * 1000) / 10 : 0;
  const horas = Array.from({ length: 24 }, (_, h) => ({
    label: `${h}:00 a ${h + 1}:00`,
    corto: `${h}h`,
    n: e?.horas.find((x) => x.hora === h)?.n ?? 0,
  }));

  return (
    <EmpresaShell
      active="marketing"
      empresa={null}
      title="Marketing"
      subtitle="Cómo y desde dónde usan Flety. Datos anónimos y agregados."
      actions={
        <View style={styles.rangos} role="tablist">
          {RANGOS.map((r) => (
            <Pressable
              key={r.dias}
              role="tab"
              aria-selected={dias === r.dias}
              onPress={() => setDias(r.dias)}
              style={[styles.rango, dias === r.dias && styles.rangoOn]}>
              <Text style={[styles.rangoText, dias === r.dias && styles.rangoTextOn]}>{r.label}</Text>
            </Pressable>
          ))}
        </View>
      }>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!e ? (
        !error ? (
          <ActivityIndicator color={colors.ink} style={{ marginTop: 40 }} />
        ) : null
      ) : (
        <>
          <View style={styles.stats}>
            <StatCard label="Sesiones" value={e.sesiones.toLocaleString('es-AR')} dot />
            <StatCard label="Cuentas nuevas" value={e.registros.toLocaleString('es-AR')} />
            <StatCard label="Pedidos" value={e.pedidos.toLocaleString('es-AR')} />
            <StatCard label="Pedidos por cada 100 sesiones" value={String(conversion)} />
          </View>

          <Card title="Sesiones por día">
            <Columnas
              unidad="sesiones"
              items={e.por_dia.map((d) => ({
                label: diaLargo.format(fechaDe(d.dia)),
                corto: diaCorto.format(fechaDe(d.dia)),
                n: d.sesiones,
              }))}
            />
          </Card>

          <View style={[styles.grid, !isWide && styles.gridNarrow]}>
            <Card title="Dispositivos" style={isWide ? styles.col : undefined}>
              <BarList items={ordenar(e.dispositivos, DISPOSITIVO_LABEL)} />
            </Card>
            <Card title="Sistema operativo" style={isWide ? styles.col : undefined}>
              <BarList items={ordenar(e.sistemas).slice(0, 6)} />
            </Card>
            <Card title="Navegador" style={isWide ? styles.col : undefined}>
              <BarList items={ordenar(e.navegadores).slice(0, 6)} />
            </Card>
          </View>

          <View style={[styles.grid, !isWide && styles.gridNarrow]}>
            <Card title="Zonas con más pedidos" style={isWide ? styles.col : undefined}>
              <Text style={styles.muted}>Según la localidad del retiro.</Text>
              <BarList
                items={e.zonas.map((z) => ({ label: z.zona || 'Sin localidad', n: z.n }))}
                vacio="Todavía no hay pedidos."
              />
            </Card>
            <Card title="Tipo de servicio" style={isWide ? styles.col : undefined}>
              <BarList items={ordenar(e.tipos, TIPO_LABEL)} vacio="Todavía no hay pedidos." />
            </Card>
            <Card title="Quiénes entran" style={isWide ? styles.col : undefined}>
              <BarList items={ordenar(e.roles, ROL_LABEL)} />
            </Card>
          </View>

          <View style={[styles.grid, !isWide && styles.gridNarrow]}>
            <Card title="¿A qué hora piden?" style={isWide ? [styles.col, { flex: 2 }] : undefined}>
              <Columnas unidad="pedidos" items={horas} alto={120} />
            </Card>
            <Card title="Pantallas más vistas" style={isWide ? styles.col : undefined}>
              <BarList items={e.pantallas.map((p) => ({ label: PANTALLA_LABEL[p.pantalla] ?? p.pantalla, n: p.n }))} />
            </Card>
          </View>

          <Card title="Embudo">
            <BarList
              items={[
                { label: 'Sesiones', n: e.sesiones },
                { label: 'Cuentas nuevas', n: e.registros },
                { label: 'Pedidos', n: e.pedidos },
                { label: 'Entregados', n: e.completados },
              ]}
              pctDe="primero"
            />
          </Card>

          <Card title="Anuncios">
            {e.anuncios.length ? (
              e.anuncios.map((a) => (
                <View key={a.id} style={styles.anuncio}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.anuncioTitulo} numberOfLines={1}>
                      {a.titulo}
                    </Text>
                    <Text style={styles.muted}>{a.activo ? 'Activo' : 'Pausado'}</Text>
                  </View>
                  <Dato label="Vistas" valor={a.vistas} />
                  <Dato label="Clicks" valor={a.clicks} />
                  <Dato label="CTR" valor={a.vistas ? `${Math.round((a.clicks / a.vistas) * 1000) / 10}%` : '—'} />
                </View>
              ))
            ) : (
              <Text style={styles.muted}>Todavía no creaste anuncios. Hacelo desde “Anuncios”.</Text>
            )}
          </Card>
        </>
      )}
    </EmpresaShell>
  );
}

function Dato({ label, valor }: { label: string; valor: number | string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.datoValor}>{typeof valor === 'number' ? valor.toLocaleString('es-AR') : valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rangos: { flexDirection: 'row', gap: 6 },
  rango: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E6EA',
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  rangoOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  rangoText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  rangoTextOn: { color: colors.white },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  grid: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  gridNarrow: { flexDirection: 'column', alignItems: 'stretch' },
  col: { flex: 1, minWidth: 0 },
  muted: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  anuncio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  anuncioTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  dato: { alignItems: 'flex-end', minWidth: 56 },
  datoValor: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
});
