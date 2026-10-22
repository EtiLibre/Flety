import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppMap } from '@/components/map/AppMap';
import type { LatLng, MapMarker } from '@/components/map/types';
import { MobileMapLayout } from '@/components/MobileMapLayout';
import { Segmented } from '@/components/pedido/Choice';
import { PedidoForm } from '@/components/pedido/PedidoForm';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { useRuta } from '@/hooks/use-ruta';
import { useAuth } from '@/lib/auth';
import { avisar } from '@/lib/confirm';
import { rumbo } from '@/lib/geo';
import { PedidoDraftProvider, usePedidoDraft } from '@/lib/pedido-draft';
import { colors, fonts } from '@/theme';

// SOLO DESARROLLO: vista previa del mapa sin iniciar sesión, con un pedido de
// ejemplo y un chofer simulado que recorre la ruta real paso a paso (como se
// verá en vivo cuando el chofer comparta su ubicación). En producción redirige al inicio.
const EJEMPLO = {
  origen: { lat: -32.8893605, lng: -68.8391999, direccion: 'Avenida General San Martín 1200, Mendoza' },
  destino: { lat: -32.8924301, lng: -68.8549776, direccion: 'Arístides Villanueva 300, Mendoza' },
};
// Desde dónde sale el chofer simulado hacia el retiro.
const SALIDA_CHOFER: LatLng = { lat: -32.8788, lng: -68.8303 };
const PASO_MS = 1100;

type Fase = 'retiro' | 'entrega';

export default function PreviewMapa() {
  // En producción, solo el superadmin ("Ver la app como…" del panel).
  const { role } = useAuth();
  if (!__DEV__ && role !== 'superadmin') return <Redirect href="/" />;
  return (
    <PedidoDraftProvider initial={EJEMPLO}>
      <Preview />
    </PedidoDraftProvider>
  );
}

function Preview() {
  const isWide = useIsWide();
  const { draft } = usePedidoDraft();
  const [fase, setFase] = useState<Fase>('retiro');

  // Ruta que recorre el chofer simulado según la fase.
  const { ruta } = useRuta(fase === 'retiro' ? [SALIDA_CHOFER, draft.origen] : [draft.origen, draft.destino]);
  const coords = ruta?.coords ?? [];
  const rutaId = coords.length ? `${fase}:${coords[0].lat},${coords[0].lng}:${coords.length}` : '';
  const [avance, setAvance] = useState<{ rutaId: string; paso: number }>({ rutaId: '', paso: 0 });
  const paso = avance.rutaId === rutaId ? avance.paso : 0;

  useEffect(() => {
    if (!rutaId) return;
    const total = coords.length;
    const timer = setInterval(() => {
      setAvance((prev) => {
        const actual = prev.rutaId === rutaId ? prev.paso : 0;
        if (actual >= total - 1) {
          // Llegó: pasa a la otra fase (al retiro → a la entrega → vuelve a empezar).
          setFase((f) => (f === 'retiro' ? 'entrega' : 'retiro'));
          return prev;
        }
        return { rutaId, paso: actual + 1 };
      });
    }, PASO_MS);
    return () => clearInterval(timer);
    // coords cambia junto con rutaId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutaId]);

  const camion = coords[paso];
  const heading = camion && coords[paso + 1] ? rumbo(camion, coords[paso + 1]) : undefined;
  // Arranca un punto atrás: mientras el camión se desliza, la línea queda debajo suyo.
  const restante = coords.slice(Math.max(0, paso - 1));
  const etaMin = ruta ? Math.max(1, Math.round(ruta.duracionMin * (1 - paso / Math.max(1, coords.length - 1)))) : null;

  const markers: MapMarker[] = [];
  if (draft.origen) markers.push({ id: 'origen', kind: 'origen', position: draft.origen, label: 'Retiro' });
  if (draft.destino) markers.push({ id: 'destino', kind: 'destino', position: draft.destino, label: 'Entrega' });
  if (camion) markers.push({ id: 'chofer', kind: 'chofer', position: camion, heading, label: 'Chofer (simulado)' });

  const map = (
    <AppMap
      center={draft.origen ?? SALIDA_CHOFER}
      markers={markers}
      line={restante.length > 1 ? restante : undefined}
      fitToMarkers
      style={StyleSheet.absoluteFill}
    />
  );

  const panel = (
    <>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          Vista previa: el camión es un chofer simulado que recorre la ruta real. En un pedido de verdad se mueve con la
          ubicación que comparte el chofer desde su app.
        </Text>
      </View>

      <View style={styles.live}>
        <Text style={styles.liveTitle}>{fase === 'retiro' ? 'Tu chofer está en camino' : 'Tu carga va en camino'}</Text>
        {etaMin ? (
          <Text style={styles.eta}>
            {fase === 'retiro' ? 'Llega al retiro en' : 'Llega a la entrega en'} {etaMin} min
          </Text>
        ) : null}
        <Segmented
          options={[
            { value: 'retiro', label: 'Yendo al retiro' },
            { value: 'entrega', label: 'Yendo a la entrega' },
          ]}
          value={fase}
          onChange={setFase}
        />
      </View>

      <Text style={styles.title}>¿Qué movemos hoy?</Text>
      <PedidoForm onContinue={() => avisar('En la vista previa no se crean pedidos.')} />
    </>
  );

  if (isWide) return <ClienteShell active="pedir" panel={panel} map={map} />;
  return (
    <MobileMapLayout map={map} mapHeight={380}>
      {panel}
    </MobileMapLayout>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: '#FFF3D6', borderRadius: 14, padding: 12 },
  noticeText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: '#7A4F00' },
  live: { gap: 10, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.line },
  liveTitle: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.4, color: colors.ink },
  eta: {
    alignSelf: 'flex-start',
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6, color: colors.ink },
});
