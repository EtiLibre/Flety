import { router } from 'expo-router';
import { ChevronDown, ChevronUp, Clock, MapPinOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { AppMap } from '@/components/map/AppMap';
import { MENDOZA, type MapMarker } from '@/components/map/types';
import { MobileMapLayout } from '@/components/MobileMapLayout';
import { AddressField } from '@/components/pedido/AddressField';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useIsWide } from '@/hooks/use-is-wide';
import { useRuta } from '@/hooks/use-ruta';
import { formatARS } from '@/lib/pricing';
import type { GeoPoint } from '@/lib/types';
import { cotizar, solicitar } from '@/modulos/gruas/api';
import { ESTADOS_ACTIVOS } from '@/modulos/gruas/estados';
import { useCatalogoGruas, useMisSolicitudesGrua } from '@/modulos/gruas/hooks';
import type { ResultadoCotizar } from '@/modulos/gruas/tipos';
import { Chips, Desglose, G } from '@/modulos/gruas/ui';
import { IconoGrua } from '@/plataforma/IconoGrua';
import { colors, fonts, radius } from '@/theme';

// Pedir una grúa: dónde está el vehículo, a dónde va, qué vehículo es y qué
// le pasa. Muestra las grúas disponibles cerca y el precio antes de pedir.
export default function PedirGrua() {
  const isWide = useIsWide();
  const ubicacion = useCurrentLocation();
  const { catalogo, error: errorCatalogo } = useCatalogoGruas();
  const { solicitudes } = useMisSolicitudesGrua();
  const activa = solicitudes.find((s) => ESTADOS_ACTIVOS.includes(s.estado));

  const [origen, setOrigen] = useState<GeoPoint | null>(null);
  const [destino, setDestino] = useState<GeoPoint | null>(null);
  const [tipo, setTipo] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [situaciones, setSituaciones] = useState<string[]>([]);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [patente, setPatente] = useState('');
  const [nota, setNota] = useState('');
  const [verDesglose, setVerDesglose] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { ruta } = useRuta([origen, destino]);
  const listos = !!origen && !!destino && !!tipo;
  const claveCotizacion = listos
    ? `${origen.lat},${origen.lng}|${destino.lat},${destino.lng}|${tipo}|${situaciones.join(',')}|${ruta?.distanciaKm ?? ''}`
    : null;
  const [cot, setCot] = useState<{ clave: string; res: ResultadoCotizar | null; error: string | null } | null>(null);
  const [refresco, setRefresco] = useState(0);

  useEffect(() => {
    if (!claveCotizacion || !origen || !destino || !tipo) return;
    let cancelled = false;
    const t = setTimeout(() => {
      cotizar({ origen, destino, distanciaKm: ruta?.distanciaKm ?? null, tipo, situaciones })
        .then((res) => !cancelled && setCot({ clave: claveCotizacion, res, error: null }))
        .catch((e: Error) => !cancelled && setCot({ clave: claveCotizacion, res: null, error: e.message }));
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // Las grúas se mueven: se vuelve a cotizar cada 30 s (refresco).
  }, [claveCotizacion, refresco, origen, destino, tipo, situaciones, ruta?.distanciaKm]);

  useEffect(() => {
    if (!claveCotizacion) return;
    const t = setInterval(() => setRefresco((r) => r + 1), 30_000);
    return () => clearInterval(t);
  }, [claveCotizacion]);

  const res = cot?.clave === claveCotizacion ? cot.res : null;
  const cotizando = !!claveCotizacion && cot?.clave !== claveCotizacion;
  const opciones = res && res.cobertura ? res.opciones : [];
  const recomendada = opciones[0] ?? null;
  const valido = listos && !!motivo && !!recomendada;

  async function pedir() {
    if (!valido || !origen || !destino || !tipo || !motivo || !recomendada) return;
    setEnviando(true);
    setError(null);
    try {
      const id = await solicitar({
        origen,
        destino,
        distanciaKm: ruta?.distanciaKm ?? null,
        tipo,
        vehiculo: { marca: marca.trim(), modelo: modelo.trim(), patente: patente.trim().toUpperCase() },
        motivo,
        situaciones,
        nota,
        precioMax: recomendada.total,
      });
      router.replace({ pathname: '/gruas/[id]', params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos pedir la grúa.');
    } finally {
      setEnviando(false);
    }
  }

  const markers: MapMarker[] = [];
  if (!origen && ubicacion.status === 'located') markers.push({ id: 'yo', kind: 'user', position: ubicacion.position });
  if (origen) markers.push({ id: 'origen', kind: 'origen', position: origen, label: 'Vehículo' });
  if (destino) markers.push({ id: 'destino', kind: 'destino', position: destino, label: 'Destino' });
  opciones.forEach((o, i) => markers.push({ id: `grua-${i}`, kind: 'grua', position: { lat: o.lat, lng: o.lng } }));

  const mapa = (
    <AppMap
      center={origen ?? ubicacion.position ?? MENDOZA}
      markers={markers}
      line={ruta?.coords}
      fitToMarkers={markers.length > 1}
      style={StyleSheet.absoluteFill}
    />
  );

  const contenido = (
    <View style={{ gap: 16 }}>
      <View style={styles.cabecera}>
        <View style={styles.icono}>
          <IconoGrua size={22} color={colors.white} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo} accessibilityRole="header">
            Pedir una grúa
          </Text>
          <Text style={styles.sub}>Ves el precio y cuánto tarda antes de confirmar.</Text>
        </View>
      </View>

      {activa ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/gruas/[id]', params: { id: activa.id } })}
          style={styles.activa}>
          <Text style={styles.activaTexto}>Tenés una grúa en curso · Ver</Text>
        </Pressable>
      ) : null}
      {errorCatalogo ? <Text style={styles.error}>{errorCatalogo}</Text> : null}

      <AddressField
        label="¿Dónde está el vehículo?"
        placeholder="Buscá la dirección o usá tu ubicación"
        value={origen}
        onChange={setOrigen}
        allowCurrentLocation
        tipo="origen"
      />
      <AddressField
        label="¿A dónde lo llevamos?"
        placeholder="Taller, casa, concesionaria…"
        value={destino}
        onChange={setDestino}
      />

      <Seccion titulo="Tipo de vehículo">
        {catalogo ? (
          <Chips
            opciones={catalogo.tipos.filter((t) => t.activo !== false)}
            valor={tipo}
            onCambio={(v) => setTipo(v)}
          />
        ) : (
          <ActivityIndicator color={G.acento} />
        )}
      </Seccion>

      <Seccion titulo="¿Qué le pasa?">
        {catalogo ? (
          <Chips
            opciones={catalogo.motivos.filter((t) => t.activo !== false)}
            valor={motivo}
            onCambio={(v) => setMotivo(v)}
          />
        ) : null}
      </Seccion>

      {catalogo?.situaciones.length ? (
        <Seccion titulo="¿Alguna de estas situaciones? (opcional)">
          <Chips
            multiple
            opciones={catalogo.situaciones.filter((t) => t.activo !== false)}
            valor={situaciones}
            onCambio={(v) => setSituaciones((a) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]))}
          />
        </Seccion>
      ) : null}

      <Seccion titulo="Tu vehículo (opcional)">
        <View style={styles.filaCampos}>
          <Campo valor={marca} onCambio={setMarca} placeholder="Marca" />
          <Campo valor={modelo} onCambio={setModelo} placeholder="Modelo" />
        </View>
        <View style={styles.filaCampos}>
          <Campo valor={patente} onCambio={(v) => setPatente(v.toUpperCase())} placeholder="Patente" />
          <View style={{ flex: 1 }} />
        </View>
        <TextInput
          value={nota}
          onChangeText={setNota}
          placeholder="Algo más que deba saber la grúa (piso, cochera, referencias…)"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={500}
          accessibilityLabel="Información adicional"
          style={[styles.campo, styles.nota]}
        />
      </Seccion>

      <View style={styles.precio}>
        {!listos ? (
          <Text style={styles.sub}>Completá dónde está, a dónde va y el tipo de vehículo para ver el precio.</Text>
        ) : cotizando ? (
          <View style={styles.filaCentro}>
            <ActivityIndicator color={G.acento} />
            <Text style={styles.sub}>Buscando grúas cerca…</Text>
          </View>
        ) : cot?.error ? (
          <Text style={styles.error}>{cot.error}</Text>
        ) : res && !res.cobertura ? (
          <View style={styles.filaCentro}>
            <MapPinOff size={20} color={G.textoSuave} />
            <Text style={[styles.sub, { flex: 1 }]}>
              Todavía no llegamos a esa zona.{' '}
              {catalogo
                ? `Hoy funciona en: ${catalogo.zonas
                    .filter((z) => z.activa)
                    .map((z) => z.ciudad)
                    .join(', ')}.`
                : ''}
            </Text>
          </View>
        ) : !recomendada ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.sub}>Ahora no hay grúas disponibles cerca. Probá de nuevo en unos minutos.</Text>
            <Button title="Volver a buscar" variant="outline" onPress={() => setRefresco((r) => r + 1)} />
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <View style={styles.recomendada}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recoLabel}>Grúa más cercana</Text>
                <Text style={styles.recoPrecio}>{formatARS(recomendada.total)}</Text>
              </View>
              <View style={styles.eta}>
                <Clock size={14} color={G.texto} />
                <Text style={styles.etaTexto}>~{recomendada.eta_min} min</Text>
              </View>
            </View>
            <Text style={styles.sub}>
              {opciones.length === 1 ? '1 grúa disponible cerca' : `${opciones.length} grúas disponibles cerca`}
              {res && res.cobertura ? ` · ${res.km} km de traslado` : ''}. Si la más cercana no acepta, se la ofrecemos
              a la siguiente sin cobrarte más.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: verDesglose }}
              onPress={() => setVerDesglose((v) => !v)}
              style={styles.desgloseBtn}>
              <Text style={styles.desgloseTexto}>Ver detalle del precio</Text>
              {verDesglose ? <ChevronUp size={16} color={colors.ink} /> : <ChevronDown size={16} color={colors.ink} />}
            </Pressable>
            {verDesglose ? <Desglose c={recomendada.cotizacion} /> : null}
          </View>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={!valido || enviando || !!activa}
        onPress={pedir}
        style={[styles.boton, (!valido || !!activa) && { opacity: 0.45 }]}>
        {enviando ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.botonTexto}>
            {recomendada ? `Solicitar grúa · ${formatARS(recomendada.total)}` : 'Solicitar grúa'}
          </Text>
        )}
      </Pressable>
      {!motivo && listos && recomendada ? <Text style={styles.sub}>Elegí qué le pasa al vehículo.</Text> : null}
    </View>
  );

  if (isWide) return <ClienteShell active="inicio" panel={contenido} map={mapa} />;
  return (
    <MobileMapLayout map={mapa} mapHeight={260}>
      {contenido}
    </MobileMapLayout>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.seccion}>{titulo}</Text>
      {children}
    </View>
  );
}

function Campo({
  valor,
  onCambio,
  placeholder,
}: {
  valor: string;
  onCambio: (v: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={valor}
      onChangeText={onCambio}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      accessibilityLabel={placeholder}
      maxLength={40}
      style={[styles.campo, { flex: 1 }]}
    />
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: G.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted },
  activa: { padding: 12, borderRadius: radius.md, backgroundColor: G.suave },
  activaTexto: { fontFamily: fonts.bold, fontSize: 14, color: G.texto },
  seccion: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  filaCampos: { flexDirection: 'row', gap: 8 },
  campo: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
  },
  nota: { height: 72, paddingTop: 12, textAlignVertical: 'top' },
  precio: { gap: 8, padding: 14, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line },
  filaCentro: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recomendada: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recoLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  recoPrecio: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6, color: colors.ink },
  eta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: G.suave,
  },
  etaTexto: { fontFamily: fonts.bold, fontSize: 14, color: G.texto },
  desgloseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  desgloseTexto: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, textDecorationLine: 'underline' },
  boton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: G.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
});
