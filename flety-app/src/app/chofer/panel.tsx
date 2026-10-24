import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Camera, LogOut, MapPin, Navigation, User } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnuncioPopup } from '@/components/AnuncioPopup';
import { Button } from '@/components/Button';
import { MiVehiculo } from '@/components/chofer/MiVehiculo';
import { SolicitudCard } from '@/components/chofer/SolicitudCard';
import { UnirseEmpresa } from '@/components/chofer/UnirseEmpresa';
import { ChatPedido } from '@/components/pedido/ChatPedido';
import { AppMap } from '@/components/map/AppMap';
import { MENDOZA, type MapMarker } from '@/components/map/types';
import { useAccion } from '@/hooks/use-accion';
import { useChofer } from '@/hooks/use-chofer';
import { useCompartirUbicacion } from '@/hooks/use-compartir-ubicacion';
import { useIsWide } from '@/hooks/use-is-wide';
import { useNavChofer } from '@/hooks/use-nav-chofer';
import { usePedidoEnVivo } from '@/hooks/use-pedido-en-vivo';
import { useRuta } from '@/hooks/use-ruta';
import { avanzarViaje, cambiarDisponibilidad, ETAPAS, PASOS_VIAJE, urlNavegacion } from '@/lib/chofer';
import { confirmar } from '@/lib/confirm';
import { describirCuando, plural } from '@/lib/format';
import { aceptarComoChofer, liberarSolicitud } from '@/lib/marketplace';
import type { Pedido } from '@/lib/orders';
import { formatARS } from '@/lib/pricing';
import { supabase } from '@/lib/supabase';
import { TAMANO_LABEL, TIPO_LABEL, VEHICULO_LABEL } from '@/lib/types';
import { colors, fonts } from '@/theme';

const d = colors.dark;

function servicio(p: Pedido) {
  return [TIPO_LABEL[p.tipo], p.tamano ? TAMANO_LABEL[p.tamano].titulo : null].filter(Boolean).join(' · ');
}

export default function PanelChofer() {
  const isWide = useIsWide();
  const { chofer, pedidos, solicitudes, hechosHoy, clientes, loading, recargar } = useChofer();
  const accion = useAccion(recargar);
  const [disponibleLocal, setDisponibleLocal] = useState<boolean | null>(null);
  const disponible = disponibleLocal ?? chofer?.disponibilidad ?? false;

  const actual = pedidos[0] ?? null;
  const proximos = pedidos.slice(1);
  const enViaje = !!actual && actual.estado !== 'asignado';
  // El GPS se comparte mientras está disponible o en un viaje.
  const gps = useCompartirUbicacion(chofer?.id ?? null, disponible || enViaje);
  const yo = gps.posicion ?? chofer?.ubicacion_actual ?? null;

  const paso = actual ? PASOS_VIAJE.find((p) => p.desde === actual.estado) : undefined;
  const objetivo = actual && paso ? (paso.destino === 'origen' ? actual.origen : actual.destino) : null;
  // Ruta: de donde estoy al objetivo; mientras carga, la ruta de la entrega.
  const { ruta } = useRuta(actual?.estado === 'cargando' ? [actual.origen, actual.destino] : [yo, objetivo ?? null]);

  const { fotos: fotosActual } = usePedidoEnVivo(actual?.id);

  async function toggleDisponible() {
    if (!chofer) return;
    const nuevo = !disponible;
    setDisponibleLocal(nuevo);
    accion.ejecutar('disponible', async () => {
      try {
        await cambiarDisponibilidad(chofer.id, nuevo);
      } catch (e) {
        setDisponibleLocal(!nuevo);
        throw e;
      }
    });
  }

  async function avanzar() {
    if (!actual || !paso) return;
    if (paso.hacia === 'entregado' && !(await confirmar('¿Confirmás que entregaste toda la carga?'))) return;
    accion.ejecutar('avanzar', () => avanzarViaje(actual.id, paso.hacia));
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Cuenta de chofer sin empresa (o sin fila en drivers): primero, sumarse con un código.
  if (!chofer) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.joinContent}>
          <UnirseEmpresa />
          <Salir />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const markers: MapMarker[] = [];
  if (actual?.origen) markers.push({ id: 'origen', kind: 'origen', position: actual.origen, label: 'Retiro' });
  if (actual?.destino) markers.push({ id: 'destino', kind: 'destino', position: actual.destino, label: 'Entrega' });
  if (yo) markers.push({ id: 'yo', kind: 'chofer', position: yo, label: 'Vos' });

  const mapa = (
    <AppMap
      center={yo ?? actual?.origen ?? MENDOZA}
      markers={markers}
      line={actual ? ruta?.coords : undefined}
      fitToMarkers={markers.length > 1}
      tone="dark"
      padding={isWide ? undefined : { top: 200, right: 50, bottom: 380, left: 50 }}
      style={StyleSheet.absoluteFill}
    />
  );

  const barra = (
    <View style={styles.topBlock}>
      <View style={styles.topRow}>
        <BotonCuenta empresa={chofer.empresa} />
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: disponible }}
          accessibilityLabel="Disponible para recibir viajes"
          onPress={toggleDisponible}
          style={[styles.toggle, disponible && styles.toggleOn]}>
          <Text style={styles.toggleText}>{disponible ? 'Estás disponible' : 'No estás disponible'}</Text>
          <View style={[styles.switch, disponible && styles.switchOn]}>
            <View style={styles.knob} />
          </View>
        </Pressable>
      </View>
      {enViaje && actual && paso ? (
        <Indicacion pedido={actual} paso={paso} minutos={ruta?.duracionMin ?? null} />
      ) : (
        <View style={styles.stats}>
          <Stat label="Viajes de hoy" valor={String(hechosHoy)} />
          <Stat label="Asignados" valor={String(pedidos.length)} />
        </View>
      )}
      <EstadoGps estado={gps.estado} />
    </View>
  );

  // Solicitudes del marketplace (un cliente lo eligió): van primero.
  const solicitud = solicitudes[0] ?? null;
  const tarjetaSolicitud = solicitud ? (
    <SolicitudCard
      pedido={solicitud}
      cargando={
        accion.pendiente === `aceptar-${solicitud.id}`
          ? 'aceptar'
          : accion.pendiente === `rechazar-${solicitud.id}`
            ? 'rechazar'
            : null
      }
      onAceptar={() =>
        accion.ejecutar(`aceptar-${solicitud.id}`, () => aceptarComoChofer(solicitud.id, chofer.id, chofer.company_id))
      }
      onRechazar={() => accion.ejecutar(`rechazar-${solicitud.id}`, () => liberarSolicitud(solicitud.id))}
    />
  ) : null;

  // Sin vehículo cargado no aparece en el marketplace: se lo pedimos.
  const tarjetaVehiculo = !chofer.vehiculo?.tipo ? (
    <MiVehiculo driverId={chofer.id} inicial={chofer.vehiculo} onGuardado={recargar} />
  ) : null;

  const tarjeta = actual ? (
    actual.estado === 'asignado' ? (
      <Asignado
        pedido={actual}
        cliente={clientes[actual.cliente_id] ?? null}
        fotos={fotosActual}
        minutos={ruta?.duracionMin ?? null}
        cargando={accion.pendiente === 'avanzar'}
        onEmpezar={avanzar}
      />
    ) : (
      <EnViaje
        pedido={actual}
        cliente={clientes[actual.cliente_id] ?? null}
        fotos={fotosActual}
        boton={paso?.boton ?? null}
        cargando={accion.pendiente === 'avanzar'}
        onAvanzar={avanzar}
      />
    )
  ) : (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{disponible ? 'Esperando viajes' : 'Estás fuera de servicio'}</Text>
      <Text style={styles.muted}>
        {disponible
          ? `Los clientes cercanos te pueden elegir, y ${chofer.empresa ?? 'tu empresa'} te puede asignar pedidos.`
          : 'Marcate disponible para aparecer en el marketplace y recibir viajes.'}
      </Text>
    </View>
  );

  const extra = (
    <>
      {accion.error ? <Text style={styles.error}>{accion.error}</Text> : null}
      {proximos.length ? (
        <View style={styles.card}>
          <Text style={styles.label}>Próximos asignados</Text>
          {proximos.map((p) => (
            <View key={p.id} style={styles.proximo}>
              <Text style={styles.proximoTitle}>{servicio(p)}</Text>
              <Text style={styles.muted} numberOfLines={1}>
                {describirCuando(p.programado_para)} · {p.origen?.direccion.split(',')[0]}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );

  if (isWide) {
    return (
      <View style={[styles.screen, styles.wide]}>
        <StatusBar style="light" />
        <AnuncioPopup audiencia="chofer" />
        <ScrollView style={styles.widePanel} contentContainerStyle={styles.widePanelContent}>
          {barra}
          {tarjetaSolicitud}
          {tarjetaVehiculo}
          {tarjeta}
          {extra}
        </ScrollView>
        <View style={styles.wideMap}>{mapa}</View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <AnuncioPopup audiencia="chofer" />
      {mapa}
      <SafeAreaView edges={['top']} style={styles.overlayTop} pointerEvents="box-none">
        {barra}
      </SafeAreaView>
      <View style={styles.overlayBottom} pointerEvents="box-none">
        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} bounces={false}>
          {tarjetaSolicitud}
          {tarjetaVehiculo}
          {tarjeta}
          {extra}
        </ScrollView>
      </View>
    </View>
  );
}

function Indicacion({
  pedido,
  paso,
  minutos,
}: {
  pedido: Pedido;
  paso: (typeof PASOS_VIAJE)[number];
  minutos: number | null;
}) {
  const lugar = paso.destino === 'origen' ? pedido.origen : pedido.destino;
  const tiempo = pedido.estado === 'cargando' || minutos == null ? '' : ` · ${minutos} min`;
  return (
    <View style={styles.indicacion}>
      <View style={styles.indicacionIcon}>
        <MapPin size={24} color={colors.ink} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.muted}>
          {paso.indicacion}
          {tiempo}
        </Text>
        <Text style={styles.indicacionDir} numberOfLines={2}>
          {lugar?.direccion ?? '—'}
        </Text>
      </View>
      {lugar ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Abrir navegación"
          onPress={() => Linking.openURL(urlNavegacion(lugar))}
          style={styles.navBtn}>
          <Navigation size={20} color={d.text} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Asignado({
  pedido,
  cliente,
  fotos,
  minutos,
  cargando,
  onEmpezar,
}: {
  pedido: Pedido;
  cliente: string | null;
  fotos: string[];
  minutos: number | null;
  cargando: boolean;
  onEmpezar: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.badge}>{pedido.programado_para ? 'Viaje programado' : 'Nuevo viaje'}</Text>
        <Text style={styles.cuando}>{describirCuando(pedido.programado_para)}</Text>
      </View>
      <Text style={styles.bigTitle}>{servicio(pedido)}</Text>
      <View style={styles.chips}>
        <Chip texto={pedido.ayudantes ? plural(pedido.ayudantes, 'ayudante', 'ayudantes') : 'Sin ayudantes'} />
        {pedido.vehiculo ? <Chip texto={VEHICULO_LABEL[pedido.vehiculo].titulo} /> : null}
        {pedido.distancia_km != null ? <Chip texto={`${Number(pedido.distancia_km).toFixed(1)} km`} /> : null}
      </View>
      <Fotos pedidoId={pedido.id} fotos={fotos} />
      <Recorrido pedido={pedido} minutos={minutos} />
      <ChatPedido orderId={pedido.id} titulo={cliente?.split(' ')[0] ?? 'el cliente'} abierto tono="dark" />
      {pedido.nota ? <Nota texto={pedido.nota} /> : null}
      {pedido.precio_estimado != null ? (
        <View style={styles.precio}>
          <Text style={styles.muted}>Precio estimado del viaje</Text>
          <Text style={styles.precioValor}>{formatARS(Number(pedido.precio_estimado))}</Text>
        </View>
      ) : null}
      <Button title="Salir hacia el retiro" loading={cargando} onPress={onEmpezar} style={styles.mainBtn} />
      <Text style={[styles.muted, { textAlign: 'center' }]}>
        ¿No podés hacerlo? Avisale a tu empresa para que lo reasigne.
      </Text>
    </View>
  );
}

function EnViaje({
  pedido,
  cliente,
  fotos,
  boton,
  cargando,
  onAvanzar,
}: {
  pedido: Pedido;
  cliente: string | null;
  fotos: string[];
  boton: string | null;
  cargando: boolean;
  onAvanzar: () => void;
}) {
  return (
    <View style={styles.card}>
      <View
        style={styles.etapas}
        accessibilityLabel={`Etapa: ${ETAPAS.find((e) => e.estados.includes(pedido.estado))?.label ?? ''}`}>
        {ETAPAS.map((etapa, i) => {
          const actualIdx = ETAPAS.findIndex((e) => e.estados.includes(pedido.estado));
          const hecho = i <= actualIdx;
          return (
            <View key={etapa.label} style={styles.etapa}>
              <View style={[styles.etapaBar, hecho && styles.etapaBarOn]} />
              <Text style={[styles.etapaText, i === actualIdx && styles.etapaTextOn]}>{etapa.label}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.cliente}>
        <View style={styles.clienteAvatar}>
          <User size={22} color={d.muted} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.clienteNombre}>{cliente ?? 'Cliente'}</Text>
          <Text style={styles.muted}>
            {servicio(pedido)} ·{' '}
            {pedido.ayudantes ? plural(pedido.ayudantes, 'ayudante', 'ayudantes') : 'sin ayudantes'}
          </Text>
        </View>
      </View>
      {pedido.nota ? <Nota texto={pedido.nota} /> : null}
      <Fotos pedidoId={pedido.id} fotos={fotos} />
      <ChatPedido orderId={pedido.id} titulo={cliente?.split(' ')[0] ?? 'el cliente'} abierto tono="dark" />
      {boton ? <Button title={boton} loading={cargando} onPress={onAvanzar} style={styles.mainBtn} /> : null}
    </View>
  );
}

function Recorrido({ pedido, minutos }: { pedido: Pedido; minutos: number | null }) {
  return (
    <View style={styles.recorrido}>
      <View style={styles.rail}>
        <View style={styles.dotOrigen} />
        <View style={styles.railLine} />
        <View style={styles.dotDestino} />
      </View>
      <View style={{ flex: 1, gap: 14, minWidth: 0 }}>
        <View style={{ gap: 2 }}>
          <Text style={styles.small}>Retiro{minutos != null ? ` · a ${minutos} min de vos` : ''}</Text>
          <Text style={styles.dir}>{pedido.origen?.direccion ?? '—'}</Text>
        </View>
        <View style={{ gap: 2 }}>
          <Text style={styles.small}>Entrega</Text>
          <Text style={styles.dir}>{pedido.destino?.direccion ?? '—'}</Text>
        </View>
      </View>
    </View>
  );
}

function Fotos({ pedidoId, fotos }: { pedidoId: string; fotos: string[] }) {
  if (!fotos.length) return <Text style={styles.small}>El cliente no subió fotos de la carga.</Text>;
  return (
    <View style={styles.fotosRow}>
      {fotos.slice(0, 4).map((url, i) => (
        <Pressable
          key={url}
          accessibilityRole="imagebutton"
          accessibilityLabel={`Ver foto ${i + 1} de la carga`}
          onPress={() => router.push({ pathname: '/chofer/fotos/[id]', params: { id: pedidoId, i: String(i) } })}
          style={styles.fotoThumb}>
          <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Pressable>
      ))}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.fotosLabel}>
          <Camera size={14} color={d.text} strokeWidth={2.2} />
          <Text style={styles.fotosTitle}>Fotos de la carga · {fotos.length}</Text>
        </View>
        <Text style={styles.small}>Tocá para verlas en grande</Text>
      </View>
    </View>
  );
}

function Nota({ texto }: { texto: string }) {
  return (
    <View style={styles.nota}>
      <Text style={styles.small}>Nota del cliente</Text>
      <Text style={styles.notaText}>{texto}</Text>
    </View>
  );
}

function Chip({ texto }: { texto: string }) {
  return <Text style={styles.chip}>{texto}</Text>;
}

function Stat({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.small}>{label}</Text>
      <Text style={styles.statValor}>{valor}</Text>
    </View>
  );
}

function EstadoGps({ estado }: { estado: ReturnType<typeof useCompartirUbicacion>['estado'] }) {
  if (estado === 'apagado' || estado === 'activo') return null;
  const texto =
    estado === 'pidiendo'
      ? 'Buscando tu ubicación…'
      : estado === 'denegado'
        ? 'Activá el permiso de ubicación: tu empresa y el cliente no te ven en el mapa.'
        : 'No pudimos leer tu ubicación.';
  return <Text style={[styles.gps, estado !== 'pidiendo' && styles.gpsWarn]}>{texto}</Text>;
}

// Acceso a la cuenta (el resto del menú está en la barra de abajo).
function BotonCuenta({ empresa }: { empresa: string | null }) {
  const ir = useNavChofer();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={empresa ? `Mi cuenta, chofer de ${empresa}` : 'Mi cuenta'}
      onPress={() => ir('cuenta')}
      style={styles.menuBtn}>
      <User size={22} color={d.text} strokeWidth={2} />
    </Pressable>
  );
}

function Salir() {
  return (
    <Pressable accessibilityRole="button" onPress={() => supabase.auth.signOut()} style={styles.salir}>
      <LogOut size={18} color="#FF8A80" strokeWidth={2} />
      <Text style={styles.salirText}>Cerrar sesión</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: d.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  joinContent: {
    padding: 20,
    gap: 16,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  wide: { flexDirection: 'row' },
  widePanel: { width: 440, flexGrow: 0, borderRightWidth: 1, borderRightColor: d.line },
  widePanelContent: { padding: 20, gap: 14 },
  wideMap: { flex: 1 },
  overlayTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12 },
  overlayBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '64%' },
  sheetScroll: { flexGrow: 0 },
  sheetContent: { padding: 12, paddingBottom: 20, gap: 10 },
  topBlock: { gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10 },
  menuBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: d.line,
    backgroundColor: d.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    position: 'absolute',
    top: 60,
    left: 0,
    minWidth: 220,
    padding: 6,
    borderRadius: 16,
    backgroundColor: d.surface,
    borderWidth: 1,
    borderColor: d.line,
  },
  menuEmpresa: { fontFamily: fonts.semibold, fontSize: 13, color: d.muted, paddingHorizontal: 12, paddingVertical: 10 },
  salir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    height: 44,
    alignSelf: 'stretch',
  },
  salirText: { fontFamily: fonts.semibold, fontSize: 15, color: '#FF8A80' },
  toggle: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    paddingLeft: 18,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: d.surface,
    borderWidth: 1,
    borderColor: d.line,
  },
  toggleOn: { borderColor: '#22A06B' },
  toggleText: { fontFamily: fonts.bold, fontSize: 16, color: d.text },
  switch: { width: 52, height: 32, borderRadius: 16, backgroundColor: '#3A424D', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: '#22A06B', alignItems: 'flex-end' },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    gap: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: d.surface,
    borderWidth: 1,
    borderColor: d.line,
  },
  statValor: { fontFamily: fonts.display, fontSize: 22, color: d.text },
  gps: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: d.muted,
    backgroundColor: d.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  gpsWarn: { color: '#FFD27A', backgroundColor: '#3A2E12' },
  indicacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 22,
    backgroundColor: d.surface,
    borderWidth: 1,
    borderColor: d.line,
  },
  indicacionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicacionDir: { fontFamily: fonts.bold, fontSize: 17, color: d.text },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: d.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { gap: 14, padding: 18, borderRadius: 26, backgroundColor: d.surface, borderWidth: 1, borderColor: d.line },
  cardTitle: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.3, color: d.text },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badge: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cuando: { fontFamily: fonts.semibold, fontSize: 14, color: d.text },
  bigTitle: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.5, color: d.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#D5DBE3',
    backgroundColor: d.chip,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  recorrido: { flexDirection: 'row', gap: 14 },
  rail: { width: 12, alignItems: 'center', paddingTop: 6, paddingBottom: 6 },
  dotOrigen: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: d.text },
  railLine: { flex: 1, width: 0, borderLeftWidth: 2, borderStyle: 'dotted', borderColor: '#5B6470', marginVertical: 4 },
  dotDestino: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.accent },
  small: { fontFamily: fonts.regular, fontSize: 12, color: d.muted },
  dir: { fontFamily: fonts.semibold, fontSize: 15, color: d.text },
  muted: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: d.muted },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: d.muted },
  precio: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: d.line,
  },
  precioValor: { fontFamily: fonts.display, fontSize: 28, color: colors.accent },
  mainBtn: { height: 60, borderRadius: 18 },
  fotosRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fotoThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: d.chip,
    borderWidth: 1,
    borderColor: '#333B46',
  },
  fotosLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fotosTitle: { fontFamily: fonts.bold, fontSize: 14, color: d.text },
  nota: { gap: 4, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#222831' },
  notaText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: '#D5DBE3' },
  etapas: { flexDirection: 'row', gap: 6 },
  etapa: { flex: 1, gap: 6 },
  etapaBar: { height: 4, borderRadius: 2, backgroundColor: d.line },
  etapaBarOn: { backgroundColor: colors.accent },
  etapaText: { fontFamily: fonts.medium, fontSize: 11, color: d.muted },
  etapaTextOn: { fontFamily: fonts.bold, color: d.text },
  cliente: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clienteAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: d.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clienteNombre: { fontFamily: fonts.bold, fontSize: 16, color: d.text },
  proximo: { gap: 2, paddingTop: 10, borderTopWidth: 1, borderTopColor: d.line },
  proximoTitle: { fontFamily: fonts.semibold, fontSize: 15, color: d.text },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: '#FF8A80',
    backgroundColor: '#3A1B1B',
    padding: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
});
