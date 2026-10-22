import { Camera, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { CARD_BORDER } from '@/components/web/EmpresaShell';
import { useNavEmpresa } from '@/hooks/use-nav-empresa';
import { iniciales, nombreChofer, type Chofer, type EstadoChofer } from '@/lib/empresa';
import { describirCuando, plural } from '@/lib/format';
import type { Pedido } from '@/lib/orders';
import { TAMANO_LABEL, TIPO_LABEL, VEHICULO_LABEL } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

export function Card({
  title,
  right,
  children,
  style,
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      {title || right ? (
        <View style={styles.cardHeader}>
          {title ? (
            <Text style={styles.cardTitle} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function StatCard({
  label,
  value,
  suffix,
  dot,
}: {
  label: string;
  value: string;
  suffix?: string;
  dot?: boolean;
}) {
  return (
    <View style={[styles.card, styles.stat]}>
      <View style={styles.statLabelRow}>
        {dot ? <View style={styles.statDot} /> : null}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>
        {value}
        {suffix ? <Text style={styles.statSuffix}> {suffix}</Text> : null}
      </Text>
    </View>
  );
}

const BADGE_TONES = {
  success: { bg: colors.successBg, fg: colors.success },
  warn: { bg: '#FFF3D6', fg: '#7A4F00' },
  neutral: { bg: '#EEF0F2', fg: '#4A525C' },
  danger: { bg: colors.dangerBg, fg: colors.danger },
} as const;

export function Badge({ label, tone }: { label: string; tone: keyof typeof BADGE_TONES }) {
  const t = BADGE_TONES[tone];
  return <Text style={[styles.badge, { backgroundColor: t.bg, color: t.fg }]}>{label}</Text>;
}

export function EnVivo() {
  return (
    <View style={styles.live}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>En vivo</Text>
    </View>
  );
}

export function Vacio({ texto }: { texto: string }) {
  return <Text style={styles.vacio}>{texto}</Text>;
}

const ESTADO_CHOFER: Record<EstadoChofer, { label: string; tone: keyof typeof BADGE_TONES }> = {
  disponible: { label: 'Disponible', tone: 'success' },
  en_viaje: { label: 'En viaje', tone: 'warn' },
  no_disponible: { label: 'No disponible', tone: 'neutral' },
};

export function describirVehiculoChofer(chofer: Chofer): string {
  const tipo = chofer.vehiculo?.tipo ? VEHICULO_LABEL[chofer.vehiculo.tipo].titulo : 'Vehículo sin cargar';
  return chofer.vehiculo?.patente ? `${tipo} · ${chofer.vehiculo.patente}` : tipo;
}

export function ChoferFila({ chofer, estado }: { chofer: Chofer; estado: EstadoChofer }) {
  const nombre = nombreChofer(chofer);
  const e = ESTADO_CHOFER[estado];
  return (
    <View style={styles.chofer}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{iniciales(nombre)}</Text>
      </View>
      <View style={styles.choferText}>
        <Text style={styles.choferNombre} numberOfLines={1}>
          {nombre}
        </Text>
        <Text style={styles.choferDetalle} numberOfLines={1}>
          {describirVehiculoChofer(chofer)}
        </Text>
      </View>
      <Badge label={e.label} tone={e.tone} />
    </View>
  );
}

// "Avenida San Martín 1200, Mendoza" -> "Avenida San Martín 1200"
export function direccionCorta(direccion: string | undefined | null): string {
  return direccion?.split(',')[0]?.trim() || '—';
}

export function describirServicio(pedido: Pedido): string {
  return [TIPO_LABEL[pedido.tipo], pedido.tamano ? TAMANO_LABEL[pedido.tamano].titulo : null]
    .filter(Boolean)
    .join(' · ');
}

export type Columna = { titulo: string; flex?: number; width?: number; align?: 'right' };

function anchoColumna(c: Columna) {
  return c.width ? { width: c.width } : { flex: c.flex, minWidth: 0 };
}

export function TablaHeader({ columnas }: { columnas: Columna[] }) {
  return (
    <View style={styles.tableHeader}>
      {columnas.map((c) => (
        <Text key={c.titulo} style={[styles.th, anchoColumna(c), c.align === 'right' && { textAlign: 'right' }]}>
          {c.titulo}
        </Text>
      ))}
    </View>
  );
}

export const COLUMNAS_PEDIDO: Columna[] = [
  { titulo: 'Servicio', flex: 1.3 },
  { titulo: 'Fotos', width: 64 },
  { titulo: 'Recorrido', flex: 2 },
  { titulo: 'Cuándo', flex: 1 },
  { titulo: '', flex: 1 },
  { titulo: 'Acción', width: 196, align: 'right' },
];

// Un pedido: fila de tabla en desktop, tarjeta en el celular. Tocarlo abre el detalle.
export function PedidoFila({
  pedido,
  fotos,
  extra,
  accion,
  wide,
}: {
  pedido: Pedido;
  fotos: number;
  // Columna variable: chofer, estado, precio...
  extra?: React.ReactNode;
  accion?: React.ReactNode;
  wide: boolean;
}) {
  const nav = useNavEmpresa();
  const abrir = () => nav.abrirPedido(pedido.id);
  const servicio = describirServicio(pedido);
  const recorrido = `${direccionCorta(pedido.origen?.direccion)} → ${direccionCorta(pedido.destino?.direccion)}`;
  const fotosLabel = fotos ? plural(fotos, 'foto', 'fotos') : 'Sin fotos';

  if (wide) {
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${servicio}, ${recorrido}`}
        onPress={abrir}
        style={({ hovered }: { hovered?: boolean }) => [styles.row, hovered && styles.rowHover]}>
        <View style={[anchoColumna(COLUMNAS_PEDIDO[0]), { gap: 2 }]}>
          <Text style={styles.tdStrong}>{servicio}</Text>
          <Text style={styles.tdMuted}>
            {pedido.ayudantes ? plural(pedido.ayudantes, 'ayudante', 'ayudantes') : 'Sin ayudantes'}
          </Text>
        </View>
        <View style={[styles.fotosCell, anchoColumna(COLUMNAS_PEDIDO[1])]}>
          {fotos ? <Camera size={15} color={colors.ink} strokeWidth={2} /> : null}
          <Text style={fotos ? styles.td : styles.tdMuted}>{fotos || 'Sin fotos'}</Text>
        </View>
        <Text style={[styles.td, anchoColumna(COLUMNAS_PEDIDO[2])]} numberOfLines={2}>
          {recorrido}
        </Text>
        <Text style={[styles.td, anchoColumna(COLUMNAS_PEDIDO[3])]}>{describirCuando(pedido.programado_para)}</Text>
        <View style={anchoColumna(COLUMNAS_PEDIDO[4])}>{extra}</View>
        <View style={[styles.accionCell, anchoColumna(COLUMNAS_PEDIDO[5])]}>{accion}</View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${servicio}, ${recorrido}`}
      onPress={abrir}
      style={styles.item}>
      <View style={styles.itemTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.tdStrong}>{servicio}</Text>
          <Text style={styles.tdMuted}>
            {describirCuando(pedido.programado_para)} ·{' '}
            {pedido.ayudantes ? plural(pedido.ayudantes, 'ayudante', 'ayudantes') : 'sin ayudantes'} · {fotosLabel}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.muted} />
      </View>
      <Text style={styles.td} numberOfLines={2}>
        {recorrido}
      </Text>
      {extra || accion ? (
        <View style={styles.itemBottom}>
          <View style={{ flexShrink: 1 }}>{extra}</View>
          {accion}
        </View>
      ) : null}
    </Pressable>
  );
}

export function BotonChico({
  title,
  onPress,
  variant = 'accent',
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'accent' | 'dark' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}) {
  const v = {
    accent: { bg: colors.accent, fg: colors.ink, border: colors.accent },
    dark: { bg: colors.ink, fg: colors.white, border: colors.ink },
    outline: { bg: colors.white, fg: colors.ink, border: colors.line },
    danger: { bg: colors.white, fg: colors.danger, border: colors.line },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.botonChico,
        { backgroundColor: v.bg, borderColor: v.border },
        (pressed || inactive) && { opacity: 0.6 },
      ]}>
      <Text style={[styles.botonChicoText, { color: v.fg }]}>{loading ? '…' : title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    gap: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  stat: { flexGrow: 1, flexBasis: 150, gap: 6 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  statLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  statValue: { fontFamily: fonts.display, fontSize: 34, color: colors.ink },
  statSuffix: { fontFamily: fonts.display, fontSize: 18, color: colors.muted },
  badge: {
    alignSelf: 'flex-start',
    fontFamily: fonts.bold,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22A06B' },
  liveText: { fontFamily: fonts.bold, fontSize: 12, color: colors.success },
  vacio: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted, paddingVertical: 8 },
  chofer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 14, color: '#3A3F45' },
  choferText: { flex: 1, minWidth: 0 },
  choferNombre: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  choferDetalle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  tableHeader: { flexDirection: 'row', gap: 12, paddingBottom: 8 },
  th: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  rowHover: { backgroundColor: '#F8F9FA' },
  td: { fontFamily: fonts.regular, fontSize: 14, color: '#3A3F45' },
  tdStrong: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  tdMuted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  fotosCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accionCell: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  item: {
    gap: 8,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 4 },
  botonChico: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonChicoText: { fontFamily: fonts.bold, fontSize: 14 },
});
