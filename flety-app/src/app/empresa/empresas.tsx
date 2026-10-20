import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Badge, BotonChico, Card, Vacio } from '@/components/empresa/ui';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useAccion } from '@/hooks/use-accion';
import { useIsWide } from '@/hooks/use-is-wide';
import { useAuth } from '@/lib/auth';
import { cambiarAprobacion, todasLasEmpresas, type EmpresaAdmin } from '@/lib/empresa';
import { colors, fonts } from '@/theme';

const fecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

const ESTADO: Record<EmpresaAdmin['estado_aprobacion'], { label: string; tone: 'success' | 'warn' | 'danger' }> = {
  pendiente: { label: 'Esperando aprobación', tone: 'warn' },
  aprobada: { label: 'Aprobada', tone: 'success' },
  rechazada: { label: 'Rechazada', tone: 'danger' },
};

function formatoCuit(cuit: string | null) {
  if (!cuit || cuit.length !== 11) return cuit ?? '—';
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
}

// Solo superadmin: curaduría de empresas (sección 10.3). Las pendientes primero.
export default function EmpresasAdmin() {
  const { role } = useAuth();
  const isWide = useIsWide();
  const [empresas, setEmpresas] = useState<EmpresaAdmin[] | null>(null);
  const [version, setVersion] = useState(0);
  const { pendiente, error, ejecutar } = useAccion(() => setVersion((v) => v + 1));

  useEffect(() => {
    let cancelled = false;
    todasLasEmpresas().then((lista) => !cancelled && setEmpresas(lista));
    return () => {
      cancelled = true;
    };
  }, [version]);

  if (role && role !== 'superadmin') return <Redirect href="/empresa/panel" />;

  const orden = ['pendiente', 'aprobada', 'rechazada'] as const;
  const lista = [...(empresas ?? [])].sort(
    (a, b) => orden.indexOf(a.estado_aprobacion) - orden.indexOf(b.estado_aprobacion)
  );

  return (
    <EmpresaShell
      active="empresas"
      empresa={null}
      title="Empresas"
      subtitle="Aprobá las empresas después de verificar CUIT, documentación y seguro de carga.">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!empresas ? (
        <ActivityIndicator color={colors.ink} style={{ marginTop: 40 }} />
      ) : (
        <Card>
          {lista.length ? (
            lista.map((e) => {
              const est = ESTADO[e.estado_aprobacion];
              return (
                <View key={e.id} style={[styles.fila, !isWide && styles.filaNarrow]}>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={styles.nombre}>{e.nombre}</Text>
                    <Text style={styles.muted}>
                      CUIT {formatoCuit(e.cuit)} · alta {fecha.format(new Date(e.created_at))}
                    </Text>
                  </View>
                  <Badge label={est.label} tone={est.tone} />
                  <View style={styles.acciones}>
                    {e.estado_aprobacion !== 'aprobada' ? (
                      <BotonChico
                        title="Aprobar"
                        loading={pendiente === `ok-${e.id}`}
                        onPress={() => ejecutar(`ok-${e.id}`, () => cambiarAprobacion(e.id, 'aprobada'))}
                      />
                    ) : null}
                    {e.estado_aprobacion !== 'rechazada' ? (
                      <BotonChico
                        title={e.estado_aprobacion === 'aprobada' ? 'Suspender' : 'Rechazar'}
                        variant="danger"
                        loading={pendiente === `no-${e.id}`}
                        onPress={() => ejecutar(`no-${e.id}`, () => cambiarAprobacion(e.id, 'rechazada'))}
                      />
                    ) : null}
                  </View>
                </View>
              );
            })
          ) : (
            <Vacio texto="Todavía no se registró ninguna empresa." />
          )}
        </Card>
      )}
    </EmpresaShell>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  filaNarrow: { flexWrap: 'wrap' },
  nombre: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  acciones: { flexDirection: 'row', gap: 8 },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
});
