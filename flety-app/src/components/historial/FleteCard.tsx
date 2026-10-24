import { ChevronRight, Package, RotateCcw, Route, Truck } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Pedido } from '@/lib/orders';
import { formatARS } from '@/lib/pricing';
import { ESTADO_LABELS, TERMINAL_ESTADOS } from '@/lib/state-machine';
import { TAMANO_LABEL, TIPO_LABEL, VEHICULO_LABEL, type TipoServicio } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';
import { paleta, type Tema } from '@/theme/tema';

const fechaCorta = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const ICONO: Record<TipoServicio, typeof Truck> = { flete: Truck, mudanza: Package, larga_distancia: Route };

export type GrupoFlete = 'en_curso' | 'terminados' | 'cancelados';

const CANCELADOS = ['cancelado_cliente', 'cancelado_empresa', 'reembolsado'];

export function grupoDe(p: Pedido): GrupoFlete {
  if (CANCELADOS.includes(p.estado)) return 'cancelados';
  if (TERMINAL_ESTADOS.includes(p.estado) || p.estado === 'entregado') return 'terminados';
  return 'en_curso';
}

const TONO: Record<GrupoFlete, { bg: string; fg: string }> = {
  en_curso: { bg: '#FEF3C7', fg: '#92400E' },
  terminados: { bg: '#DCFCE7', fg: '#166534' },
  cancelados: { bg: '#F3F4F6', fg: '#4B5563' },
};

// "Avenida San Martín 1200, Mendoza" -> "Avenida San Martín 1200"
const corta = (d: string | undefined | null) => d?.split(',')[0]?.trim() || '—';

// Un flete en el historial (cliente: Mis fletes; chofer: Mis viajes).
export function FleteCard({
  pedido,
  tema,
  onPress,
  onRepetir,
  monto,
}: {
  pedido: Pedido;
  tema: Tema;
  onPress?: () => void;
  onRepetir?: () => void;
  // Por defecto, el precio estimado.
  monto?: number | null;
}) {
  const p = paleta(tema);
  const grupo = grupoDe(pedido);
  const Icono = ICONO[pedido.tipo] ?? Truck;
  const cuando = pedido.programado_para ?? pedido.created_at;
  const precio = monto !== undefined ? monto : pedido.precio_estimado;
  const titulo = [TIPO_LABEL[pedido.tipo], pedido.tamano ? TAMANO_LABEL[pedido.tamano].titulo : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titulo}, ${ESTADO_LABELS[pedido.estado]}, de ${corta(pedido.origen?.direccion)} a ${corta(
        pedido.destino?.direccion
      )}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.card,
        { backgroundColor: p.card, borderColor: p.cardBorder },
        hovered && !!onPress && { borderColor: p.muted },
        pressed && { opacity: 0.9 },
      ]}>
      <View style={styles.top}>
        <View style={[styles.icono, { backgroundColor: grupo === 'en_curso' ? colors.accent : p.chip }]}>
          <Icono size={19} color={grupo === 'en_curso' ? colors.ink : p.text} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.titulo, { color: p.text }]} numberOfLines={1}>
            {titulo}
          </Text>
          <Text style={[styles.fecha, { color: p.muted }]}>
            {pedido.programado_para ? 'Programado · ' : ''}
            {mayuscula(fechaCorta.format(new Date(cuando)))}
          </Text>
        </View>
        <Text style={[styles.estado, { backgroundColor: TONO[grupo].bg, color: TONO[grupo].fg }]} numberOfLines={1}>
          {ESTADO_LABELS[pedido.estado]}
        </Text>
      </View>

      <View style={styles.ruta}>
        <View style={styles.linea}>
          <View style={[styles.dot, { backgroundColor: p.text }]} />
          <View style={[styles.trazo, { backgroundColor: p.line }]} />
          <View style={[styles.dot, styles.dotFin]} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
          <Text style={[styles.dir, { color: p.text }]} numberOfLines={1}>
            {corta(pedido.origen?.direccion)}
          </Text>
          <Text style={[styles.dir, { color: p.text }]} numberOfLines={1}>
            {corta(pedido.destino?.direccion)}
          </Text>
        </View>
      </View>

      <View style={[styles.pie, { borderTopColor: p.line }]}>
        <Text style={[styles.detalle, { color: p.muted }]} numberOfLines={1}>
          {[
            pedido.vehiculo ? VEHICULO_LABEL[pedido.vehiculo].titulo : null,
            pedido.distancia_km ? `${pedido.distancia_km.toFixed(1).replace('.', ',')} km` : null,
          ]
            .filter(Boolean)
            .join(' · ') || ' '}
        </Text>
        {precio != null ? <Text style={[styles.precio, { color: p.text }]}>{formatARS(precio)}</Text> : null}
        {onPress ? <ChevronRight size={18} color={p.muted} /> : null}
      </View>

      {onRepetir ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pedir de nuevo este flete"
          onPress={onRepetir}
          style={({ pressed }) => [styles.repetir, { borderColor: p.cardBorder }, pressed && { opacity: 0.8 }]}>
          <RotateCcw size={15} color={p.text} strokeWidth={2.2} />
          <Text style={[styles.repetirText, { color: p.text }]}>Pedir de nuevo</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 14, borderRadius: 20, borderWidth: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: fonts.bold, fontSize: 15 },
  fecha: { fontFamily: fonts.regular, fontSize: 12, marginTop: 1 },
  estado: {
    maxWidth: 130,
    fontFamily: fonts.bold,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  ruta: { flexDirection: 'row', gap: 12, paddingLeft: 14 },
  linea: { alignItems: 'center', paddingVertical: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotFin: { backgroundColor: colors.accent },
  trazo: { width: 2, flex: 1, marginVertical: 3 },
  dir: { fontFamily: fonts.medium, fontSize: 14 },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1 },
  detalle: { flex: 1, fontFamily: fonts.regular, fontSize: 13 },
  precio: { fontFamily: fonts.display, fontSize: 16 },
  repetir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  repetirText: { fontFamily: fonts.bold, fontSize: 13 },
});
