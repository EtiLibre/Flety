import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { AppMap } from '@/components/map/AppMap';
import type { MapMarker } from '@/components/map/types';
import { MobileMapLayout } from '@/components/MobileMapLayout';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { useRuta } from '@/hooks/use-ruta';
import { confirmar } from '@/lib/confirm';
import { metrosEntre } from '@/lib/geo';
import { formatARS } from '@/lib/pricing';
import { cancelar, confirmarPrecio, fotosDeSolicitud, solicitar } from '@/modulos/gruas/api';
import { FotosSolicitud } from '@/modulos/gruas/FotosSolicitud';
import { ESTADO_GRUA, ESTADOS_ACTIVOS, ESTADOS_EN_SERVICIO } from '@/modulos/gruas/estados';
import { useCatalogoGruas, useSolicitudGrua } from '@/modulos/gruas/hooks';
import type { Solicitud } from '@/modulos/gruas/tipos';
import { CalificarGrua, ChatGrua, CuentaEspera, Desglose, G, LineaTiempo, TarjetaGruista } from '@/modulos/gruas/ui';
import { TarjetaPin, usePinViaje } from '@/components/pin/PinViaje';
import { AccionesSeguridad } from '@/components/pin/AccionesSeguridad';
import { useVerificarTelefono } from '@/components/telefono/VerificarTelefono';
import { colors, fonts, radius } from '@/theme';

const SUBTITULO: Partial<Record<Solicitud['estado'], string>> = {
  buscando: 'Le estamos ofreciendo tu pedido a la grúa disponible más cercana.',
  asignada: 'La grúa aceptó y se está preparando para salir.',
  en_camino: 'Podés seguirla en el mapa.',
  en_origen: 'La grúa está en el lugar. Ya están cargando tu vehículo.',
  trasladando: 'Tu vehículo va en camino al destino.',
  finalizada: 'Tu vehículo llegó a destino.',
  sin_grua: 'Ninguna grúa cercana pudo tomar el pedido. Probá de nuevo en unos minutos.',
};

// Seguimiento en vivo de una grúa: estado, grúa en el mapa, chat y calificación.
export default function SeguimientoGrua() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isWide = useIsWide();
  const { solicitud: s, grua, noExiste, recargar } = useSolicitudGrua(id);
  const { catalogo } = useCatalogoGruas();
  const [accion, setAccion] = useState<string | null>(null);
  const verificacion = useVerificarTelefono();
  // El PIN se muestra hasta que empieza el traslado.
  const pin = usePinViaje(
    'grua',
    s?.id ?? null,
    !!s && ['buscando', 'asignada', 'en_camino', 'en_origen'].includes(s.estado)
  );
  const [error, setError] = useState<string | null>(null);

  const posGrua = grua?.lat != null && grua?.lng != null ? { lat: grua.lat, lng: grua.lng } : null;
  const enCaminoAlOrigen = !!s && (s.estado === 'asignada' || s.estado === 'en_camino');
  const { ruta } = useRuta(
    s ? (enCaminoAlOrigen && posGrua ? [posGrua, s.origen] : [s.origen, s.destino]) : [null, null]
  );

  if (noExiste) {
    return (
      <View style={styles.centro}>
        <Text style={styles.sub}>No encontramos este servicio.</Text>
        <Button title="Volver al inicio" variant="dark" onPress={() => router.replace('/cliente/inicio')} />
      </View>
    );
  }
  if (!s) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={G.acento} />
      </View>
    );
  }

  const eta =
    enCaminoAlOrigen && posGrua ? Math.max(1, Math.round((metrosEntre(posGrua, s.origen) / 1000 / 35) * 60) + 1) : null;

  async function ejecutar(nombre: string, fn: () => Promise<unknown>) {
    setAccion(nombre);
    setError(null);
    try {
      await fn();
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos completar la acción.');
    } finally {
      setAccion(null);
    }
  }

  async function onCancelar() {
    if (!s) return;
    const cargo = s.estado === 'en_camino' || s.estado === 'en_origen';
    const ok = await confirmar(
      cargo
        ? '¿Cancelar? La grúa ya salió: puede corresponder un cargo por cancelación.'
        : '¿Seguro que querés cancelar la grúa?'
    );
    if (ok) ejecutar('cancelar', () => cancelar(s.id, 'Cancelado por el cliente'));
  }

  async function reintentar() {
    if (!s) return;
    ejecutar('reintentar', async () => {
      // Las mismas fotos del pedido anterior (siguen en su carpeta).
      const fotos = (await fotosDeSolicitud(s.id)).map((f) => f.path);
      const nuevo = await solicitar({
        origen: s.origen,
        destino: s.destino,
        distanciaKm: s.distancia_km,
        tipo: s.tipo_vehiculo,
        vehiculo: s.vehiculo,
        motivo: s.motivo,
        situaciones: s.situaciones,
        nota: s.nota ?? '',
        precioMax: s.precio_max,
        fotos,
      });
      router.replace({ pathname: '/gruas/[id]', params: { id: nuevo } });
    });
  }

  const markers: MapMarker[] = [{ id: 'origen', kind: 'origen', position: s.origen, label: 'Tu vehículo' }];
  if (s.destino) markers.push({ id: 'destino', kind: 'destino', position: s.destino, label: 'Destino' });
  if (posGrua && ESTADOS_EN_SERVICIO.includes(s.estado)) {
    markers.push({ id: 'grua', kind: 'grua', position: posGrua, label: 'Grúa' });
  }

  const mapa = (
    <AppMap
      center={posGrua ?? s.origen}
      markers={markers}
      line={ruta?.coords}
      fitToMarkers
      style={StyleSheet.absoluteFill}
    />
  );

  const activa = ESTADOS_ACTIVOS.includes(s.estado);
  const nombreTipo = catalogo?.tipos.find((t) => t.id === s.tipo_vehiculo)?.nombre ?? s.tipo_vehiculo;

  const contenido = (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        {activa ? (
          <View style={styles.vivo}>
            <View style={styles.vivoPunto} />
            <Text style={styles.vivoTexto}>En vivo</Text>
          </View>
        ) : null}
        <Text style={styles.titulo} accessibilityRole="header">
          {ESTADO_GRUA[s.estado].titulo}
        </Text>
        {eta != null && s.estado === 'en_camino' ? <Text style={styles.eta}>Llega en ~{eta} min</Text> : null}
        {SUBTITULO[s.estado] ? <Text style={styles.sub}>{SUBTITULO[s.estado]}</Text> : null}
      </View>

      {activa || s.estado === 'finalizada' ? <LineaTiempo estado={s.estado} /> : null}

      {s.estado === 'buscando' && !s.precio_sugerido ? (
        <View style={styles.buscando}>
          <ActivityIndicator color={G.acento} />
          <Text style={[styles.sub, { flex: 1 }]}>Si no responde en unos segundos, pasamos a la siguiente grúa.</Text>
        </View>
      ) : null}

      {s.estado === 'buscando' && s.precio_sugerido ? (
        <View style={styles.aviso}>
          <Text style={styles.avisoTitulo}>Las grúas disponibles ahora cobran {formatARS(s.precio_sugerido)}</Text>
          <Text style={styles.sub}>
            La grúa al precio que aceptaste no está disponible. ¿Confirmás el nuevo precio para seguir buscando?
          </Text>
          <Button
            title={`Confirmar ${formatARS(s.precio_sugerido)}`}
            variant="dark"
            loading={accion === 'precio'}
            onPress={() => ejecutar('precio', () => confirmarPrecio(s.id, s.precio_sugerido!))}
          />
        </View>
      ) : null}

      {s.estado === 'en_origen' && s.en_origen_at ? <CuentaEspera desde={s.en_origen_at} /> : null}
      {pin && s.estado !== 'buscando' ? <TarjetaPin pin={pin} quien="el gruista" grua /> : null}
      {grua && ESTADOS_EN_SERVICIO.includes(s.estado) ? <TarjetaGruista g={grua} eta={eta} /> : null}
      {ESTADOS_EN_SERVICIO.includes(s.estado) ? (
        <AccionesSeguridad
          texto={`Estoy usando Flety: grúa${grua?.unidad.patente ? ` patente ${grua.unidad.patente}` : ''}${grua ? `, gruista ${grua.nombre}` : ''}. De ${s.origen.direccion ?? 'mi ubicación'} a ${s.destino?.direccion ?? 'destino'}.`}
        />
      ) : null}
      {ESTADOS_EN_SERVICIO.includes(s.estado) || s.estado === 'finalizada' ? (
        <ChatGrua solicitudId={s.id} abierto={ESTADOS_EN_SERVICIO.includes(s.estado)} />
      ) : null}

      {s.estado === 'finalizada' && grua ? <CalificarGrua solicitudId={s.id} nombre={grua.nombre} /> : null}

      <FotosSolicitud solicitudId={s.id} />
      <View style={styles.detalle}>
        <Fila
          label="Vehículo"
          valor={[nombreTipo, s.vehiculo.marca, s.vehiculo.modelo, s.vehiculo.patente].filter(Boolean).join(' · ')}
        />
        <Fila label="Retiro" valor={s.origen.direccion ?? '—'} />
        <Fila label="Destino" valor={s.destino?.direccion ?? '—'} />
        <Fila label="Distancia" valor={`${s.distancia_km} km`} />
        {s.precio_total != null ? <Fila label="Precio" valor={formatARS(s.precio_total)} /> : null}
        {s.precio_total == null && s.precio_max != null ? (
          <Fila label="Precio aceptado" valor={formatARS(s.precio_max)} />
        ) : null}
        {s.cargo_cancelacion ? <Fila label="Cargo por cancelación" valor={formatARS(s.cargo_cancelacion)} /> : null}
      </View>

      {s.cotizacion && (s.estado === 'finalizada' || ESTADOS_EN_SERVICIO.includes(s.estado)) ? (
        <View style={styles.detalle}>
          <Desglose c={s.cotizacion} />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {s.estado === 'sin_grua' ? (
        <Button
          title="Volver a buscar una grúa"
          variant="dark"
          loading={accion === 'reintentar'}
          onPress={() => verificacion.antesDe(reintentar)}
        />
      ) : null}
      {activa && s.estado !== 'trasladando' ? (
        <Button title="Cancelar grúa" variant="danger" loading={accion === 'cancelar'} onPress={onCancelar} />
      ) : null}
      {!activa ? (
        <Button title="Volver al inicio" variant="outline" onPress={() => router.replace('/cliente/inicio')} />
      ) : null}
    </View>
  );

  if (isWide) return <ClienteShell active="pedidos" panel={contenido} map={mapa} />;
  return (
    <MobileMapLayout map={mapa} mapHeight={300} onBack={() => router.replace('/cliente/inicio')}>
      {verificacion.modal}
      {contenido}
    </MobileMapLayout>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.filaLabel}>{label}</Text>
      <Text style={styles.filaValor}>{valor || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: colors.white,
  },
  vivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: G.suave,
  },
  vivoPunto: { width: 8, height: 8, borderRadius: 4, backgroundColor: G.acento },
  vivoTexto: { fontFamily: fonts.bold, fontSize: 12, color: G.texto },
  titulo: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.ink },
  eta: { fontFamily: fonts.bold, fontSize: 16, color: G.textoSuave },
  sub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  buscando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: G.suave,
  },
  aviso: { gap: 8, padding: 14, borderRadius: radius.lg, backgroundColor: G.suave },
  avisoTitulo: { fontFamily: fonts.bold, fontSize: 16, color: G.texto },
  detalle: { gap: 8, padding: 14, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line },
  fila: { flexDirection: 'row', gap: 12 },
  filaLabel: { width: 104, fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  filaValor: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
});
