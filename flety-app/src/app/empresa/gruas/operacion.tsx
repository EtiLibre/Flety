import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotonChico, Card, EnVivo, StatCard, Vacio } from '@/components/empresa/ui';
import { AppMap } from '@/components/map/AppMap';
import type { MapMarker } from '@/components/map/types';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { useAuth } from '@/lib/auth';
import { confirmar } from '@/lib/confirm';
import { formatARS } from '@/lib/pricing';
import { cancelar, nombreDe, operaciones, solicitudesRecientes } from '@/modulos/gruas/api';
import { ESTADOS_ACTIVOS } from '@/modulos/gruas/estados';
import { useCatalogoGruas } from '@/modulos/gruas/hooks';
import type { Prestador, Solicitud } from '@/modulos/gruas/tipos';
import { EstadoBadge } from '@/modulos/gruas/ui';
import { colors, fonts, radius } from '@/theme';

const MENDOZA = { lat: -32.8895, lng: -68.8458 };
const hora = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

type Datos = { activas: Solicitud[]; prestadores: Prestador[]; recientes: Solicitud[] };

// Superadmin · Grúas: lo que está pasando ahora (pedidos en curso y grúas
// disponibles en el mapa), con refresco cada 10 s.
export default function OperacionGruas() {
  const { role } = useAuth();
  const isWide = useIsWide();
  const { catalogo } = useCatalogoGruas();
  const [version, setVersion] = useState(0);
  const [res, setRes] = useState<{ datos: Datos | null; error: string | null } | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);

  useEffect(() => {
    if (role !== 'superadmin') return;
    let cancelled = false;
    Promise.all([operaciones(), solicitudesRecientes()])
      .then(
        ([op, recientes]) =>
          !cancelled &&
          setRes({ datos: { activas: op.solicitudes, prestadores: op.prestadores, recientes }, error: null })
      )
      .catch((e: Error) => !cancelled && setRes({ datos: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [role, version]);

  useEffect(() => {
    if (role !== 'superadmin') return;
    const t = setInterval(() => setVersion((v) => v + 1), 10000);
    return () => clearInterval(t);
  }, [role]);

  if (role && role !== 'superadmin') return <Redirect href="/empresa/panel" />;

  const d = res?.datos;
  const activas = d?.activas ?? [];
  const disponibles = (d?.prestadores ?? []).filter((p) => p.disponible && p.lat != null && p.lng != null);
  const buscando = activas.filter((s) => s.estado === 'buscando').length;

  const markers: MapMarker[] = [
    ...disponibles.map((p) => ({ id: `p-${p.id}`, kind: 'grua' as const, position: { lat: p.lat!, lng: p.lng! } })),
    ...activas.map((s) => ({ id: `s-${s.id}`, kind: 'origen' as const, position: s.origen, label: s.estado })),
  ];

  async function cancelarSolicitud(s: Solicitud) {
    if (!(await confirmar('¿Cancelar este servicio de grúa? Se le avisa al cliente.'))) return;
    setCancelando(s.id);
    try {
      await cancelar(s.id, 'Cancelado por la plataforma');
      setVersion((v) => v + 1);
    } finally {
      setCancelando(null);
    }
  }

  return (
    <EmpresaShell
      active="gruasOperacion"
      empresa={null}
      title="Grúas · Operación"
      subtitle="Pedidos en curso y grúas disponibles, en vivo."
      actions={<EnVivo />}
      aviso={res?.error}>
      <View style={[styles.stats, isWide && { flexDirection: 'row' }]}>
        <StatCard label="En curso" value={String(activas.length)} dot />
        <StatCard label="Buscando grúa" value={String(buscando)} />
        <StatCard label="Grúas disponibles" value={String(disponibles.length)} />
        <StatCard label="Gruistas aprobados" value={String(d?.prestadores.length ?? 0)} />
      </View>

      <View style={styles.mapa}>
        <AppMap
          center={MENDOZA}
          markers={markers}
          fitToMarkers={markers.length > 1}
          initialZoom={11}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <Card title="Servicios en curso">
        {activas.length ? (
          activas.map((s) => (
            <View key={s.id} style={styles.fila}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <View style={styles.filaTop}>
                  <EstadoBadge estado={s.estado} />
                  <Text style={styles.muted}>{hora.format(new Date(s.created_at))}</Text>
                </View>
                <Text style={styles.texto} numberOfLines={1}>
                  {s.origen.direccion ?? 'Sin dirección'} → {s.destino?.direccion ?? '—'}
                </Text>
                <Text style={styles.muted} numberOfLines={1}>
                  {nombreDe(catalogo?.tipos ?? [], s.tipo_vehiculo)} · {s.distancia_km} km ·{' '}
                  {formatARS(s.precio_total ?? s.precio_max ?? 0)}
                </Text>
              </View>
              <BotonChico
                title="Cancelar"
                variant="danger"
                loading={cancelando === s.id}
                onPress={() => cancelarSolicitud(s)}
              />
            </View>
          ))
        ) : (
          <Vacio texto="No hay servicios de grúa en curso." />
        )}
      </Card>

      <Card title="Últimos pedidos">
        {d?.recientes.length ? (
          d.recientes
            .filter((s) => !ESTADOS_ACTIVOS.includes(s.estado))
            .slice(0, 20)
            .map((s) => (
              <View key={s.id} style={styles.fila}>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <View style={styles.filaTop}>
                    <EstadoBadge estado={s.estado} />
                    <Text style={styles.muted}>{hora.format(new Date(s.created_at))}</Text>
                  </View>
                  <Text style={styles.texto} numberOfLines={1}>
                    {s.origen.direccion ?? 'Sin dirección'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.monto}>{s.precio_total != null ? formatARS(s.precio_total) : '—'}</Text>
                  {s.comision ? <Text style={styles.muted}>Comisión {formatARS(s.comision)}</Text> : null}
                </View>
              </View>
            ))
        ) : (
          <Vacio texto="Todavía no hay pedidos de grúa." />
        )}
      </Card>
    </EmpresaShell>
  );
}

const styles = StyleSheet.create({
  stats: { gap: 12 },
  mapa: {
    height: 360,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  filaTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  texto: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  monto: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
});
