import { Redirect, router } from 'expo-router';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { AppMap } from '@/components/map/AppMap';
import { MobileMapLayout } from '@/components/MobileMapLayout';
import type { MapMarker } from '@/components/map/types';
import { Segmented } from '@/components/pedido/Choice';
import { FleteroOption } from '@/components/pedido/FleteroOption';
import { RouteSummary } from '@/components/pedido/RouteSummary';
import { VehicleOption } from '@/components/pedido/VehicleOption';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { useRuta } from '@/hooks/use-ruta';
import { useAuth } from '@/lib/auth';
import { avisar } from '@/lib/confirm';
import { distanciaEstimadaKm } from '@/lib/distance';
import { describirCuandoDraft, plural } from '@/lib/format';
import { fleterosDisponibles, type Fletero } from '@/lib/marketplace';
import { crearPedido } from '@/lib/orders';
import { draftListoParaCotizar, usePedidoDraft } from '@/lib/pedido-draft';
import { fetchTarifas, formatARS, precioEstimado, type Tarifa } from '@/lib/pricing';
import type { Ruta } from '@/lib/routing';
import { TAMANO_LABEL, TIPO_LABEL, VEHICULO_LABEL, type GeoPoint, type Tamano, type Vehiculo } from '@/lib/types';
import { colors, fonts } from '@/theme';

const VEHICULOS: Vehiculo[] = ['utilitario', 'camioneta', 'camion'];
const SUGERIDO: Record<Tamano, Vehiculo> = { chico: 'utilitario', mediano: 'camioneta', grande: 'camion' };

// "Cualquier empresa": cola abierta con el precio de Flety. "Elegir fletero": marketplace.
type Modo = 'cualquiera' | 'elegir';

// Fleteros disponibles cerca del retiro (se vuelve a buscar si cambia el pedido).
function useFleteros(origen: GeoPoint | null, km: number, ayudantes: number, vehiculo: Vehiculo) {
  const key = origen ? `${origen.lat},${origen.lng}:${Math.round(km * 10)}:${ayudantes}:${vehiculo}` : '';
  const [estado, setEstado] = useState<{ key: string; fleteros: Fletero[]; error: boolean }>({
    key: '',
    fleteros: [],
    error: false,
  });

  useEffect(() => {
    if (!origen) return;
    let cancelled = false;
    fleterosDisponibles(origen, km, ayudantes, vehiculo)
      .then((fleteros) => !cancelled && setEstado({ key, fleteros, error: false }))
      .catch(() => !cancelled && setEstado({ key, fleteros: [], error: true }));
    return () => {
      cancelled = true;
    };
    // key resume origen/km/ayudantes/vehículo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const listo = estado.key === key;
  return { fleteros: listo ? estado.fleteros : [], cargando: !!origen && !listo, error: listo && estado.error };
}

export default function Opciones() {
  const isWide = useIsWide();
  const { draft } = usePedidoDraft();
  const { ruta, cargando } = useRuta([draft.origen, draft.destino]);
  const [modo, setModo] = useState<Modo>('cualquiera');
  const [elegido, setElegido] = useState<string | null>(null);
  // Distancia real por calles; si el ruteo falla, una estimación en línea recta.
  const km =
    ruta?.distanciaKm ?? (draft.origen && draft.destino ? distanciaEstimadaKm(draft.origen, draft.destino) : 0);
  const vehiculo = draft.vehiculo ?? SUGERIDO[draft.tamano];
  const marketplace = useFleteros(draft.origen, km, draft.ayudantes, vehiculo);

  // Al recargar la página en web el borrador se pierde: volvemos al formulario.
  if (draftListoParaCotizar(draft)) {
    return <Redirect href={isWide ? '/cliente/inicio' : '/cliente/nuevo-pedido'} />;
  }

  const origen = draft.origen!;
  const destino = draft.destino!;
  const markers: MapMarker[] = [
    { id: 'origen', kind: 'origen', position: origen, label: 'Retiro' },
    { id: 'destino', kind: 'destino', position: destino, label: 'Entrega' },
  ];
  // En "Elegir fletero" se ven los fleteros disponibles cerca (ubicación aproximada).
  if (modo === 'elegir') {
    for (const f of marketplace.fleteros) {
      markers.push({
        id: `f-${f.driver_id}`,
        kind: 'chofer',
        position: f.posicion,
        label: `${f.nombre}, ${f.empresa}`,
      });
    }
  }
  const map = (
    <AppMap center={origen} markers={markers} line={ruta?.coords} fitToMarkers style={StyleSheet.absoluteFill} />
  );
  const contenido = (
    <OpcionesContenido
      ruta={ruta}
      km={km}
      vehiculo={vehiculo}
      cargandoRuta={cargando}
      modo={modo}
      onModo={setModo}
      marketplace={marketplace}
      elegido={elegido}
      onElegir={setElegido}
    />
  );

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

function OpcionesContenido({
  ruta,
  km,
  vehiculo,
  cargandoRuta,
  modo,
  onModo,
  marketplace,
  elegido,
  onElegir,
}: {
  ruta: Ruta | null;
  km: number;
  vehiculo: Vehiculo;
  cargandoRuta: boolean;
  modo: Modo;
  onModo: (m: Modo) => void;
  marketplace: ReturnType<typeof useFleteros>;
  elegido: string | null;
  onElegir: (id: string | null) => void;
}) {
  const { session } = useAuth();
  const { draft, update, reset } = usePedidoDraft();
  const [tarifas, setTarifas] = useState<Tarifa[] | null>(null);
  const [tarifasError, setTarifasError] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fletero = modo === 'elegir' ? (marketplace.fleteros.find((f) => f.driver_id === elegido) ?? null) : null;

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
      // Con fletero elegido, el vehículo es el suyo y el precio, el de su empresa.
      const v = fletero?.vehiculo ?? vehiculo;
      const { id, fotosFallidas } = await crearPedido(
        { ...draft, vehiculo: v },
        v,
        session.user.id,
        ruta?.distanciaKm,
        fletero?.driver_id
      );
      reset();
      if (fotosFallidas > 0) {
        avisar(`Tu pedido se creó, pero ${plural(fotosFallidas, 'foto no se pudo', 'fotos no se pudieron')} subir.`);
      }
      router.replace(`/cliente/pedidos/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos crear el pedido. Revisá tu conexión y probá de nuevo.');
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

      <Segmented
        options={[
          { value: 'cualquiera', label: 'Cualquier empresa' },
          {
            value: 'elegir',
            label: marketplace.fleteros.length ? `Elegir fletero · ${marketplace.fleteros.length}` : 'Elegir fletero',
          },
        ]}
        value={modo}
        onChange={onModo}
      />

      {modo === 'cualquiera' ? (
        <>
          <View style={styles.titles}>
            <Text style={styles.title} accessibilityRole="header">
              Elegí el vehículo
            </Text>
            <Text style={styles.subtitle}>
              Lo toma la primera empresa verificada disponible. Precio estimado de Flety.
            </Text>
          </View>
          <View style={styles.options} accessibilityRole="radiogroup">
            {VEHICULOS.map((v) => (
              <VehicleOption
                key={v}
                vehiculo={v}
                precio={precioDe(v)}
                selected={vehiculo === v}
                onPress={() => update({ vehiculo: v })}
              />
            ))}
          </View>
          {tarifasError ? (
            <Text style={styles.errorText}>No pudimos cargar los precios. Igual podés confirmar el pedido.</Text>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.titles}>
            <Text style={styles.title} accessibilityRole="header">
              Elegí tu fletero
            </Text>
            <Text style={styles.subtitle}>
              Disponibles ahora cerca del retiro, con el precio de su empresa. Tiene 5 minutos para aceptar; si no, lo
              toma otra empresa.
            </Text>
          </View>
          {marketplace.cargando ? (
            <ActivityIndicator color={colors.ink} />
          ) : marketplace.fleteros.length ? (
            <View style={styles.options} accessibilityRole="radiogroup">
              {marketplace.fleteros.map((f) => (
                <FleteroOption
                  key={f.driver_id}
                  fletero={f}
                  selected={elegido === f.driver_id}
                  onPress={() => onElegir(f.driver_id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.vacio}>
              <Text style={styles.vacioTitle}>
                {marketplace.error ? 'No pudimos buscar fleteros.' : 'No hay fleteros disponibles cerca ahora.'}
              </Text>
              <Text style={styles.subtitle}>Pedí a cualquier empresa: la primera disponible toma tu pedido.</Text>
            </View>
          )}
        </>
      )}

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
        title={
          modo === 'elegir'
            ? fletero
              ? `Pedirle a ${fletero.nombre}`
              : 'Elegí un fletero'
            : `Confirmar ${VEHICULO_LABEL[vehiculo].titulo.toLowerCase()}`
        }
        variant="dark"
        onPress={confirmar}
        loading={enviando}
        disabled={cargandoRuta || (modo === 'elegir' && !fletero)}
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
  vacio: { gap: 4, padding: 16, borderRadius: 16, backgroundColor: colors.surface },
  vacioTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustText: { fontFamily: fonts.medium, fontSize: 13, color: colors.success },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 14, padding: 14 },
  errorText: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
});
