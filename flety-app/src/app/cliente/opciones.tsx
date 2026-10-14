import { Redirect, router } from 'expo-router';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { AppMap } from '@/components/map/AppMap';
import { MobileMapLayout } from '@/components/MobileMapLayout';
import { RouteSummary } from '@/components/pedido/RouteSummary';
import { VehicleOption } from '@/components/pedido/VehicleOption';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { useRuta } from '@/hooks/use-ruta';
import { useAuth } from '@/lib/auth';
import { avisar } from '@/lib/confirm';
import { distanciaEstimadaKm } from '@/lib/distance';
import { describirCuandoDraft, plural } from '@/lib/format';
import { crearPedido } from '@/lib/orders';
import { draftListoParaCotizar, usePedidoDraft } from '@/lib/pedido-draft';
import { fetchTarifas, formatARS, precioEstimado, type Tarifa } from '@/lib/pricing';
import type { Ruta } from '@/lib/routing';
import { TAMANO_LABEL, TIPO_LABEL, VEHICULO_LABEL, type Tamano, type Vehiculo } from '@/lib/types';
import { colors, fonts } from '@/theme';

const VEHICULOS: Vehiculo[] = ['utilitario', 'camioneta', 'camion'];
const SUGERIDO: Record<Tamano, Vehiculo> = { chico: 'utilitario', mediano: 'camioneta', grande: 'camion' };

export default function Opciones() {
  const isWide = useIsWide();
  const { draft } = usePedidoDraft();
  const { ruta, cargando } = useRuta([draft.origen, draft.destino]);

  // Al recargar la página en web el borrador se pierde: volvemos al formulario.
  if (draftListoParaCotizar(draft)) {
    return <Redirect href={isWide ? '/cliente/inicio' : '/cliente/nuevo-pedido'} />;
  }

  const origen = draft.origen!;
  const destino = draft.destino!;
  const map = (
    <AppMap
      center={origen}
      markers={[
        { id: 'origen', kind: 'origen', position: origen, label: 'Retiro' },
        { id: 'destino', kind: 'destino', position: destino, label: 'Entrega' },
      ]}
      line={ruta?.coords}
      fitToMarkers
      style={StyleSheet.absoluteFill}
    />
  );
  const contenido = <OpcionesContenido ruta={ruta} cargandoRuta={cargando} />;

  if (isWide) {
    return (
      <ClienteShell
        active="pedir"
        panel={
          <>
            <Pressable accessibilityRole="link" onPress={() => router.back()} style={styles.backLink}>
              <ChevronLeft size={18} color={colors.ink} strokeWidth={2.2} />
              <Text style={styles.backText}>Editar pedido</Text>
            </Pressable>
            {contenido}
          </>
        }
        map={map}
      />
    );
  }

  return <MobileMapLayout map={map}>{contenido}</MobileMapLayout>;
}

function OpcionesContenido({ ruta, cargandoRuta }: { ruta: Ruta | null; cargandoRuta: boolean }) {
  const { session } = useAuth();
  const { draft, update, reset } = usePedidoDraft();
  const [tarifas, setTarifas] = useState<Tarifa[] | null>(null);
  const [tarifasError, setTarifasError] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehiculo = draft.vehiculo ?? SUGERIDO[draft.tamano];
  // Distancia real por calles; si el ruteo falla, una estimación en línea recta.
  const km = ruta?.distanciaKm ?? distanciaEstimadaKm(draft.origen!, draft.destino!);

  useEffect(() => {
    fetchTarifas()
      .then(setTarifas)
      .catch(() => setTarifasError(true));
  }, []);

  function precioDe(v: Vehiculo): string | null {
    const tarifa = tarifas?.find((t) => t.vehiculo === v);
    return tarifa ? formatARS(precioEstimado(tarifa, km, draft.ayudantes)) : null;
  }

  async function confirmar() {
    if (!session) return;
    setEnviando(true);
    setError(null);
    try {
      const { id, fotosFallidas } = await crearPedido({ ...draft, vehiculo }, vehiculo, session.user.id, ruta?.distanciaKm);
      reset();
      if (fotosFallidas > 0) {
        avisar(`Tu pedido se creó, pero ${plural(fotosFallidas, 'foto no se pudo', 'fotos no se pudieron')} subir.`);
      }
      router.replace(`/cliente/pedidos/${id}`);
    } catch {
      setError('No pudimos crear el pedido. Revisá tu conexión y probá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <>
      <RouteSummary
        origen={draft.origen!.direccion}
        destino={draft.destino!.direccion}
        chips={[
          `${TIPO_LABEL[draft.tipo]} · ${TAMANO_LABEL[draft.tamano].titulo}`,
          plural(draft.ayudantes, 'ayudante', 'ayudantes'),
          describirCuandoDraft(draft.cuando),
          ruta ? `${ruta.distanciaKm} km · ${ruta.duracionMin} min de viaje` : `~${km} km`,
          ...(draft.fotos.length ? [plural(draft.fotos.length, 'foto', 'fotos')] : []),
        ]}
      />

      <View style={styles.titles}>
        <Text style={styles.title} accessibilityRole="header">
          Elegí el vehículo
        </Text>
        <Text style={styles.subtitle}>Precio estimado según distancia y ayudantes.</Text>
      </View>

      <View style={styles.options} accessibilityRole="radiogroup">
        {VEHICULOS.map((v) => (
          <VehicleOption key={v} vehiculo={v} precio={precioDe(v)} selected={vehiculo === v} onPress={() => update({ vehiculo: v })} />
        ))}
      </View>
      {tarifasError ? <Text style={styles.errorText}>No pudimos cargar los precios. Igual podés confirmar el pedido.</Text> : null}

      <View style={styles.trust}>
        <ShieldCheck size={18} color={colors.success} strokeWidth={2} />
        <Text style={styles.trustText}>Solo empresas verificadas, con seguro de carga</Text>
      </View>

      {error ? (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Button
        title={`Confirmar ${VEHICULO_LABEL[vehiculo].titulo.toLowerCase()}`}
        variant="dark"
        onPress={confirmar}
        loading={enviando}
        disabled={cargandoRuta}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  titles: { gap: 4 },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  options: { gap: 10 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustText: { fontFamily: fonts.medium, fontSize: 13, color: colors.success },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 14, padding: 14 },
  errorText: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
});
