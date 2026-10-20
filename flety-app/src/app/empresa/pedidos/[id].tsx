import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Link, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Expand } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { AccionCola } from '@/components/empresa/AccionCola';
import { ChatPedido } from '@/components/pedido/ChatPedido';
import { Badge, Card, ChoferFila, describirServicio, EnVivo, Vacio } from '@/components/empresa/ui';
import { AppMap } from '@/components/map/AppMap';
import type { MapMarker } from '@/components/map/types';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useAccion } from '@/hooks/use-accion';
import { useEmpresa } from '@/hooks/use-empresa';
import { useIsWide } from '@/hooks/use-is-wide';
import { usePedidoEnVivo } from '@/hooks/use-pedido-en-vivo';
import { useRuta } from '@/hooks/use-ruta';
import { useAuth } from '@/lib/auth';
import { confirmar } from '@/lib/confirm';
import {
  asignarChofer,
  estadoDelChofer,
  nombreChofer,
  nombresDeClientes,
  rechazarPedido,
  type Chofer,
} from '@/lib/empresa';
import { describirCuando, plural } from '@/lib/format';
import { ESTADOS_CHAT } from '@/lib/mensajes';
import type { Pedido } from '@/lib/orders';
import { formatARS } from '@/lib/pricing';
import { EN_VIAJE, tramoSeguimiento } from '@/lib/seguimiento';
import { ESTADO_LABELS, TERMINAL_ESTADOS } from '@/lib/state-machine';
import { VEHICULO_LABEL } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

function estadoParaEmpresa(p: Pedido): string {
  if (p.estado === 'asignado') return p.driver_id ? 'Chofer asignado · por salir' : 'Aceptado · esperando chofer';
  if (p.estado === 'buscando_asignacion') return 'En cola · esperando empresa';
  if (p.estado === 'pendiente') return 'Pendiente de pago';
  if (p.estado === 'entregado') return 'Entregado · falta que el cliente confirme';
  return ESTADO_LABELS[p.estado];
}

export default function DetallePedidoEmpresa() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isWide = useIsWide();
  const { role } = useAuth();
  const { empresa, choferes, pedidos, recargar } = useEmpresa();
  const { pedido, notFound, chofer: ubicacionChofer, fotos } = usePedidoEnVivo(id);
  const { pendiente, error, ejecutar } = useAccion(recargar);
  const [cliente, setCliente] = useState<string | null>(null);

  const clienteId = pedido?.company_id ? pedido.cliente_id : null;
  useEffect(() => {
    if (!clienteId) return;
    let cancelled = false;
    nombresDeClientes([clienteId]).then((n) => !cancelled && setCliente(n[clienteId] ?? null));
    return () => {
      cancelled = true;
    };
  }, [clienteId]);

  const tramo = pedido ? tramoSeguimiento(pedido.estado, pedido.origen, pedido.destino, ubicacionChofer) : null;
  const { ruta } = useRuta(tramo?.puntos ?? [null, null]);

  const volver = (
    <Link href="/empresa/pedidos" style={styles.back}>
      <ArrowLeft size={16} color={colors.ink} strokeWidth={2.2} />
      <Text style={styles.backText}>Pedidos</Text>
    </Link>
  );

  if (notFound || !pedido) {
    return (
      <EmpresaShell active="pedidos" empresa={empresa} title={notFound ? 'Pedido no encontrado' : 'Cargando…'}>
        {volver}
        {notFound ? (
          <Vacio texto="No existe o ya no lo podés ver (por ejemplo, si otra empresa lo tomó de la cola)." />
        ) : (
          <ActivityIndicator color={colors.ink} />
        )}
      </EmpresaShell>
    );
  }

  const enViaje = ubicacionChofer && EN_VIAJE.includes(pedido.estado) ? ubicacionChofer : null;
  const markers: MapMarker[] = [];
  if (pedido.origen) markers.push({ id: 'origen', kind: 'origen', position: pedido.origen, label: 'Retiro' });
  if (pedido.destino) markers.push({ id: 'destino', kind: 'destino', position: pedido.destino, label: 'Entrega' });
  if (enViaje) markers.push({ id: 'chofer', kind: 'chofer', position: enViaje, label: 'Chofer' });
  const eta = enViaje && tramo?.etaLabel && ruta ? `${tramo.etaLabel} ${ruta.duracionMin} min` : null;

  const choferAsignado = choferes.find((c) => c.id === pedido.driver_id) ?? null;
  const esDuena = role === 'superadmin' || (!!empresa && pedido.company_id === empresa.id);
  const activo = !TERMINAL_ESTADOS.includes(pedido.estado);

  const mapa = (
    <View style={[styles.mapa, { height: isWide ? 320 : 240 }]}>
      <AppMap
        center={enViaje ?? pedido.origen ?? { lat: -32.8895, lng: -68.8458 }}
        markers={markers}
        line={ruta?.coords}
        fitToMarkers
        style={StyleSheet.absoluteFill}
      />
      {eta ? <Text style={styles.eta}>{eta}</Text> : null}
    </View>
  );

  const accionCard = (
    <Card
      title={pedido.estado === 'asignado' && esDuena ? 'Asignar chofer' : 'Estado'}
      right={activo ? <EnVivo /> : undefined}>
      {pedido.estado === 'asignado' && esDuena && role !== 'contabilidad' ? (
        <SelectorChofer
          pedido={pedido}
          choferes={choferes}
          pedidos={pedidos}
          pendiente={pendiente}
          onAsignar={(driverId) => ejecutar('asignar', () => asignarChofer(pedido.id, driverId))}
          onRechazar={async () => {
            if (!(await confirmar('¿Rechazar este pedido? Vuelve a la cola para que lo tome otra empresa.'))) return;
            ejecutar('rechazar', () => rechazarPedido(pedido.id));
          }}
        />
      ) : pedido.company_id === null && ['pendiente', 'buscando_asignacion'].includes(pedido.estado) ? (
        <View style={styles.stack}>
          <Text style={styles.texto}>
            {pedido.estado === 'pendiente'
              ? 'El cliente todavía no pagó. Mientras no haya pagos en la app, el superadmin lo pasa a la cola.'
              : 'Cuando lo aceptes, asignale un chofer de tu flota.'}
          </Text>
          <View style={styles.inline}>
            <AccionCola pedido={pedido} empresa={empresa} pendiente={pendiente} ejecutar={ejecutar} />
          </View>
        </View>
      ) : (
        <View style={styles.stack}>
          <Badge label={estadoParaEmpresa(pedido)} tone={activo ? 'warn' : 'neutral'} />
          {choferAsignado ? (
            <ChoferFila chofer={choferAsignado} estado={estadoDelChofer(choferAsignado, pedidos)} />
          ) : null}
          {EN_VIAJE.includes(pedido.estado) ? (
            <Text style={styles.texto}>El chofer avanza el viaje desde su app; acá lo ves en vivo.</Text>
          ) : null}
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );

  const fotosCard = <FotosCard fotos={fotos} />;

  // La empresa dueña chatea con el cliente; el superadmin puede leer el historial.
  const chat =
    pedido.company_id && esDuena ? (
      <ChatPedido
        orderId={pedido.id}
        titulo={cliente?.split(' ')[0] ?? 'el cliente'}
        abierto={role === 'empresa' && ESTADOS_CHAT.includes(pedido.estado)}
      />
    ) : null;

  const notaCard = pedido.nota ? (
    <Card title="Nota del cliente">
      <Text style={styles.texto}>{pedido.nota}</Text>
    </Card>
  ) : null;

  const detalleCard = (
    <Card title="Detalle">
      <Dato label="Retiro" valor={pedido.origen?.direccion ?? '—'} />
      <Dato label="Entrega" valor={pedido.destino?.direccion ?? '—'} />
      <Dato label="Cuándo" valor={describirCuando(pedido.programado_para)} />
      <Dato label="Ayudantes" valor={pedido.ayudantes ? String(pedido.ayudantes) : 'Sin ayudantes'} />
      {pedido.vehiculo ? <Dato label="Vehículo pedido" valor={VEHICULO_LABEL[pedido.vehiculo].titulo} /> : null}
      {pedido.distancia_km != null ? (
        <Dato label="Distancia" valor={`${Number(pedido.distancia_km).toFixed(1)} km`} />
      ) : null}
      {pedido.precio_estimado != null ? (
        <Dato label="Precio estimado" valor={formatARS(Number(pedido.precio_estimado))} />
      ) : null}
      {cliente ? <Dato label="Cliente" valor={cliente} /> : null}
    </Card>
  );

  return (
    <EmpresaShell
      active="pedidos"
      empresa={empresa}
      title={describirServicio(pedido)}
      subtitle={estadoParaEmpresa(pedido)}>
      {volver}
      {isWide ? (
        <View style={styles.columns}>
          <View style={[styles.col, { flex: 1.5 }]}>
            {mapa}
            {fotosCard}
            {notaCard}
          </View>
          <View style={[styles.col, { flex: 1, minWidth: 320 }]}>
            {accionCard}
            {chat}
            {chat}
            {detalleCard}
          </View>
        </View>
      ) : (
        <View style={styles.col}>
          {mapa}
          {accionCard}
          {fotosCard}
          {notaCard}
          {detalleCard}
        </View>
      )}
    </EmpresaShell>
  );
}

function SelectorChofer({
  pedido,
  choferes,
  pedidos,
  pendiente,
  onAsignar,
  onRechazar,
}: {
  pedido: Pedido;
  choferes: Chofer[];
  pedidos: Pedido[];
  pendiente: string | null;
  onAsignar: (driverId: string) => void;
  onRechazar: () => void;
}) {
  const [elegido, setElegido] = useState<string | null>(pedido.driver_id);
  // Disponibles primero; los que están en viaje no se pueden elegir.
  const opciones = choferes
    .map((c) => ({ chofer: c, estado: estadoDelChofer(c, pedidos) }))
    .sort((a, b) => Number(b.estado === 'disponible') - Number(a.estado === 'disponible'));
  const cambio = !!elegido && elegido !== pedido.driver_id;

  return (
    <View style={styles.stack}>
      {opciones.length ? (
        <View role="radiogroup" aria-label="Choferes de tu flota" style={styles.opciones}>
          {opciones.map(({ chofer, estado }) => {
            const selected = elegido === chofer.id;
            const bloqueado = estado === 'en_viaje' && chofer.id !== pedido.driver_id;
            return (
              <Pressable
                key={chofer.id}
                role="radio"
                aria-checked={selected}
                aria-disabled={bloqueado}
                disabled={bloqueado}
                onPress={() => setElegido(chofer.id)}
                style={[styles.opcion, selected && styles.opcionSelected, bloqueado && { opacity: 0.5 }]}>
                <View style={{ flex: 1 }}>
                  <ChoferFila chofer={chofer} estado={estado} />
                </View>
                <View style={[styles.radio, selected && styles.radioOn]}>
                  {selected ? <Check size={14} color={colors.white} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Vacio texto="Tu flota todavía no tiene choferes. Sumalos desde la sección Choferes." />
      )}
      {pedido.driver_id && !cambio ? (
        <Text style={styles.texto}>
          Asignado a {nombreChofer(choferes.find((c) => c.id === pedido.driver_id) ?? { nombre: null, email: null })}.
          Cuando arranque, lo vas a ver moverse en el mapa.
        </Text>
      ) : null}
      <Button
        title={pedido.driver_id ? 'Cambiar chofer' : 'Asignar chofer'}
        variant="dark"
        disabled={!cambio}
        loading={pendiente === 'asignar'}
        onPress={() => elegido && onAsignar(elegido)}
      />
      <Button
        title="Rechazar pedido (vuelve a la cola)"
        variant="danger"
        loading={pendiente === 'rechazar'}
        onPress={onRechazar}
      />
    </View>
  );
}

function FotosCard({ fotos }: { fotos: string[] }) {
  const [index, setIndex] = useState(0);
  const actual = fotos[Math.min(index, fotos.length - 1)];
  return (
    <Card
      title="Fotos de la carga"
      right={
        <Text style={styles.muted}>
          {fotos.length ? `${plural(fotos.length, 'foto', 'fotos')} · del cliente` : null}
        </Text>
      }>
      {actual ? (
        <>
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel={`Abrir la foto ${index + 1} en tamaño completo`}
            onPress={() => Linking.openURL(actual)}
            style={styles.fotoGrande}>
            <Image source={{ uri: actual }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            <View style={styles.expand}>
              <Expand size={16} color={colors.white} strokeWidth={2.2} />
            </View>
          </Pressable>
          {fotos.length > 1 ? (
            <View style={styles.thumbs}>
              {fotos.map((url, i) => (
                <Pressable
                  key={url}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver foto ${i + 1}`}
                  aria-pressed={i === index}
                  onPress={() => setIndex(i)}
                  style={[styles.thumb, i === index && styles.thumbOn]}>
                  <Image source={{ uri: url }} style={styles.thumbImg} contentFit="cover" />
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <Vacio texto="El cliente no subió fotos de la carga." />
      )}
    </Card>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoLabel}>{label}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  col: { gap: 20, minWidth: 0 },
  mapa: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.mapLand,
    borderWidth: 1,
    borderColor: '#E3E6EA',
  },
  eta: {
    position: 'absolute',
    top: 14,
    left: 14,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stack: { gap: 12 },
  inline: { flexDirection: 'row' },
  texto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: '#3A3F45' },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
  opciones: { gap: 8 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  opcionSelected: { borderWidth: 2, borderColor: colors.ink, padding: 11 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  fotoGrande: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  expand: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(18,22,28,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { borderRadius: 12, borderWidth: 2, borderColor: 'transparent', padding: 2 },
  thumbOn: { borderColor: colors.ink },
  thumbImg: { width: 60, height: 60, borderRadius: 9, backgroundColor: colors.surface },
  dato: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  datoLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  datoValor: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, textAlign: 'right' },
});
