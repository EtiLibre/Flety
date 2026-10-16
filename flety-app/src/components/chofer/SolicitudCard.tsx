import { Timer } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { useAhora } from '@/hooks/use-ahora';
import { describirCuando, plural } from '@/lib/format';
import { formatoCuenta, segundosRestantes } from '@/lib/marketplace';
import type { Pedido } from '@/lib/orders';
import { formatARS } from '@/lib/pricing';
import { TAMANO_LABEL, TIPO_LABEL, VEHICULO_LABEL } from '@/lib/types';
import { colors, fonts } from '@/theme';

const d = colors.dark;

// Un cliente eligió a este chofer en el marketplace: tiene unos minutos para
// aceptar; si no, el pedido pasa a la cola abierta (lo maneja la base, 0010).
export function SolicitudCard({
  pedido,
  cargando,
  onAceptar,
  onRechazar,
}: {
  pedido: Pedido;
  cargando: 'aceptar' | 'rechazar' | null;
  onAceptar: () => void;
  onRechazar: () => void;
}) {
  const ahora = useAhora(true);
  const quedan = segundosRestantes(pedido.solicitado_hasta, ahora);
  const servicio = [TIPO_LABEL[pedido.tipo], pedido.tamano ? TAMANO_LABEL[pedido.tamano].titulo : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.badge}>Te eligieron</Text>
        <View style={[styles.timer, !quedan && styles.timerOff]}>
          <Timer size={15} color={quedan ? d.text : d.muted} strokeWidth={2.2} />
          <Text style={[styles.timerText, !quedan && { color: d.muted }]}>
            {quedan ? `${formatoCuenta(quedan)} para responder` : 'Se terminó la reserva'}
          </Text>
        </View>
      </View>
      <Text style={styles.title}>{servicio}</Text>
      <View style={styles.chips}>
        <Text style={styles.chip}>{describirCuando(pedido.programado_para)}</Text>
        <Text style={styles.chip}>
          {pedido.ayudantes ? plural(pedido.ayudantes, 'ayudante', 'ayudantes') : 'Sin ayudantes'}
        </Text>
        {pedido.vehiculo ? <Text style={styles.chip}>{VEHICULO_LABEL[pedido.vehiculo].titulo}</Text> : null}
        {pedido.distancia_km != null ? (
          <Text style={styles.chip}>{Number(pedido.distancia_km).toFixed(1)} km</Text>
        ) : null}
      </View>
      <View style={styles.route}>
        <View style={styles.rail}>
          <View style={styles.dotA} />
          <View style={styles.railLine} />
          <View style={styles.dotB} />
        </View>
        <View style={{ flex: 1, gap: 12, minWidth: 0 }}>
          <View style={{ gap: 2 }}>
            <Text style={styles.small}>Retiro</Text>
            <Text style={styles.dir}>{pedido.origen?.direccion ?? '—'}</Text>
          </View>
          <View style={{ gap: 2 }}>
            <Text style={styles.small}>Entrega</Text>
            <Text style={styles.dir}>{pedido.destino?.direccion ?? '—'}</Text>
          </View>
        </View>
      </View>
      {pedido.nota ? <Text style={styles.nota}>“{pedido.nota}”</Text> : null}
      {pedido.precio_estimado != null ? (
        <View style={styles.precio}>
          <Text style={styles.small}>Precio del viaje (tarifas de tu empresa)</Text>
          <Text style={styles.precioValor}>{formatARS(Number(pedido.precio_estimado))}</Text>
        </View>
      ) : null}
      <View style={styles.buttons}>
        <Pressable
          accessibilityRole="button"
          disabled={!!cargando}
          onPress={onRechazar}
          style={({ pressed }) => [styles.rechazar, (pressed || cargando === 'rechazar') && { opacity: 0.6 }]}>
          <Text style={styles.rechazarText}>{cargando === 'rechazar' ? '…' : 'Rechazar'}</Text>
        </Pressable>
        <Button title="Aceptar viaje" loading={cargando === 'aceptar'} onPress={onAceptar} style={styles.aceptar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 18,
    borderRadius: 26,
    backgroundColor: d.surface,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
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
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: d.chip,
  },
  timerOff: { backgroundColor: 'transparent' },
  timerText: { fontFamily: fonts.bold, fontSize: 13, color: d.text },
  title: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.5, color: d.text },
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
  route: { flexDirection: 'row', gap: 14 },
  rail: { width: 12, alignItems: 'center', paddingVertical: 6 },
  dotA: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: d.text },
  railLine: { flex: 1, width: 0, borderLeftWidth: 2, borderStyle: 'dotted', borderColor: '#5B6470', marginVertical: 4 },
  dotB: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.accent },
  small: { fontFamily: fonts.regular, fontSize: 12, color: d.muted },
  dir: { fontFamily: fonts.semibold, fontSize: 15, color: d.text },
  nota: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: '#D5DBE3' },
  precio: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: d.line,
  },
  precioValor: { fontFamily: fonts.display, fontSize: 28, color: colors.accent },
  buttons: { flexDirection: 'row', gap: 10 },
  rechazar: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3A424D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rechazarText: { fontFamily: fonts.bold, fontSize: 16, color: d.text },
  aceptar: { flex: 2, height: 58, borderRadius: 18 },
});
