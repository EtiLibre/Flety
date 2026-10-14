import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { AppMap } from '@/components/map/AppMap';
import type { LatLng, MapMarker } from '@/components/map/types';
import { MobileMapLayout } from '@/components/MobileMapLayout';
import { Timeline } from '@/components/pedido/Timeline';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { confirmar } from '@/lib/confirm';
import { describirCuando, plural } from '@/lib/format';
import { fotosDelPedido, PEDIDO_COLUMNS, type Pedido } from '@/lib/orders';
import { formatARS } from '@/lib/pricing';
import { getAvailableActions, TERMINAL_ESTADOS, type OrderAction, type OrderEstado } from '@/lib/state-machine';
import { supabase } from '@/lib/supabase';
import { TAMANO_LABEL, TIPO_LABEL, VEHICULO_LABEL } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

const TITULOS: Record<OrderEstado, string> = {
  pendiente: 'Recibimos tu pedido',
  pagado: 'Recibimos tu pedido',
  buscando_asignacion: 'Buscando una empresa',
  asignado: 'Una empresa tomó tu pedido',
  en_camino_origen: 'Tu chofer está en camino',
  cargando: 'Están cargando tus cosas',
  en_camino_destino: 'Tu carga va en camino',
  entregado: 'Llegó tu carga',
  confirmado: 'Pedido completado',
  liquidado: 'Pedido completado',
  cancelado_cliente: 'Pedido cancelado',
  cancelado_empresa: 'Buscando otra empresa',
  en_disputa: 'Estamos revisando tu reclamo',
  reembolsado: 'Pedido reembolsado',
};

const SUBTITULOS: Partial<Record<OrderEstado, string>> = {
  pendiente: 'Te avisamos apenas una empresa verificada lo acepte.',
  pagado: 'Te avisamos apenas una empresa verificada lo acepte.',
  buscando_asignacion: 'Las empresas verificadas de tu zona ya pueden verlo.',
  asignado: 'En breve te asignan un chofer.',
  entregado: 'Confirmá que recibiste todo bien.',
};

export default function SeguimientoPedido() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isWide = useIsWide();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [chofer, setChofer] = useState<LatLng | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);

  // Pedido + actualizaciones en vivo (Supabase Realtime sobre orders).
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    supabase
      .from('orders')
      .select(PEDIDO_COLUMNS)
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setPedido(data as Pedido);
        else setNotFound(true);
      });
    fotosDelPedido(id).then((urls) => !cancelled && setFotos(urls));

    const channel = supabase
      .channel(`pedido-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
        setPedido((prev) => (prev ? { ...prev, ...(payload.new as Partial<Pedido>) } : prev));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Ubicación del chofer en vivo (Realtime sobre drivers).
  const driverId = pedido?.driver_id ?? null;
  useEffect(() => {
    if (!driverId) return;
    let cancelled = false;
    const read = (row: { ubicacion_actual?: LatLng | null }) => setChofer(row.ubicacion_actual ?? null);

    supabase
      .from('drivers')
      .select('ubicacion_actual')
      .eq('id', driverId)
      .maybeSingle()
      .then(({ data }) => !cancelled && data && read(data));

    const channel = supabase
      .channel(`chofer-${driverId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${driverId}` }, (payload) =>
        read(payload.new as { ubicacion_actual?: LatLng | null })
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  if (notFound) {
    return (
      <View style={styles.center}>
        <Text style={styles.subtitle}>No encontramos este pedido.</Text>
        <Button title="Volver al inicio" variant="dark" onPress={() => router.replace('/cliente/inicio')} />
      </View>
    );
  }

  if (!pedido) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  const markers: MapMarker[] = [];
  if (pedido.origen) markers.push({ id: 'origen', kind: 'origen', position: pedido.origen, label: 'Retiro' });
  if (pedido.destino) markers.push({ id: 'destino', kind: 'destino', position: pedido.destino, label: 'Entrega' });
  if (chofer) markers.push({ id: 'chofer', kind: 'chofer', position: chofer, label: 'Chofer' });

  const map = (
    <AppMap
      center={chofer ?? pedido.origen ?? { lat: -32.8895, lng: -68.8458 }}
      markers={markers}
      line={pedido.origen && pedido.destino ? [pedido.origen, pedido.destino] : undefined}
      fitToMarkers
      style={StyleSheet.absoluteFill}
    />
  );

  const contenido = <Contenido pedido={pedido} fotos={fotos} onChange={setPedido} />;

  if (isWide) return <ClienteShell active="pedidos" panel={contenido} map={map} />;
  return (
    <MobileMapLayout map={map} mapHeight={300} onBack={() => router.replace('/cliente/inicio')}>
      {contenido}
    </MobileMapLayout>
  );
}

function Contenido({ pedido, fotos, onChange }: { pedido: Pedido; fotos: string[]; onChange: (p: Pedido) => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activo = !TERMINAL_ESTADOS.includes(pedido.estado);
  const actions = getAvailableActions(pedido.estado, {
    role: 'cliente',
    isCliente: true,
    isEmpresaDuena: false,
    isChoferAsignado: false,
  });

  async function ejecutar(action: OrderAction) {
    if (action.confirm && !(await confirmar(action.confirm))) return;
    setPending(action.id);
    setError(null);
    const { data, error: updateError } = await supabase
      .from('orders')
      .update({ estado: action.to })
      .eq('id', pedido.id)
      .select(PEDIDO_COLUMNS)
      .single();
    setPending(null);
    if (updateError) setError('No pudimos actualizar el pedido. Probá de nuevo.');
    else if (data) onChange(data as Pedido);
  }

  return (
    <>
      <View style={styles.header}>
        {activo ? (
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>En vivo</Text>
          </View>
        ) : null}
        <Text style={styles.title} accessibilityRole="header">
          {TITULOS[pedido.estado]}
        </Text>
        {SUBTITULOS[pedido.estado] ? <Text style={styles.subtitle}>{SUBTITULOS[pedido.estado]}</Text> : null}
      </View>

      {activo ? <Timeline estado={pedido.estado} /> : null}

      <View style={styles.details}>
        <Detail label="Retiro" value={pedido.origen?.direccion ?? '—'} />
        <Detail label="Entrega" value={pedido.destino?.direccion ?? '—'} />
        <Detail
          label="Servicio"
          value={[
            TIPO_LABEL[pedido.tipo],
            pedido.tamano ? TAMANO_LABEL[pedido.tamano].titulo : null,
            plural(pedido.ayudantes, 'ayudante', 'ayudantes'),
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        <Detail label="Cuándo" value={describirCuando(pedido.programado_para)} />
        {pedido.vehiculo ? <Detail label="Vehículo" value={VEHICULO_LABEL[pedido.vehiculo].titulo} /> : null}
        {pedido.precio_estimado != null ? <Detail label="Precio estimado" value={formatARS(Number(pedido.precio_estimado))} /> : null}
      </View>

      {pedido.nota ? (
        <View style={styles.nota}>
          <Text style={styles.notaLabel}>Tu nota</Text>
          <Text style={styles.notaText}>{pedido.nota}</Text>
        </View>
      ) : null}

      {fotos.length ? (
        <View style={styles.fotosBlock}>
          <Text style={styles.notaLabel}>Fotos de la carga</Text>
          <View style={styles.fotos}>
            {fotos.map((url, index) => (
              <Pressable
                key={url}
                accessibilityRole="imagebutton"
                accessibilityLabel={`Ver foto ${index + 1} de la carga`}
                onPress={() => Linking.openURL(url)}>
                <Image source={{ uri: url }} style={styles.foto} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {actions.length ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Button
              key={action.id}
              title={action.label}
              variant={action.tone === 'primary' ? 'accent' : action.tone === 'danger' ? 'danger' : 'outline'}
              loading={pending === action.id}
              onPress={() => ejecutar(action)}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: colors.white },
  header: { gap: 8 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.successBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22A06B' },
  liveText: { fontFamily: fonts.bold, fontSize: 12, color: colors.success },
  title: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.5, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.muted },
  details: { gap: 10, paddingTop: 4 },
  detail: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  detailLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  detailValue: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, textAlign: 'right' },
  nota: { gap: 4, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface },
  notaLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  notaText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  fotosBlock: { gap: 8 },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  foto: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surface },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
  actions: { gap: 10 },
});
