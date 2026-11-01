import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/empresa/ui';
import { formatARS } from '@/lib/pricing';
import { nombreDe } from '@/modulos/gruas/api';
import { ESTADO_GRUA, ESTADOS_ACTIVOS } from '@/modulos/gruas/estados';
import { FotosSolicitud } from '@/modulos/gruas/FotosSolicitud';
import type { Catalogo, Solicitud } from '@/modulos/gruas/tipos';
import { colors, fonts, radius } from '@/theme';

const fecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const corta = (d: string | null | undefined) => d?.split(',')[0]?.trim() || '—';

// Un servicio de la empresa: qué, dónde, quién lo hace, estado y lo que cobra
// la empresa. Al tocarlo se ven las fotos y la nota del cliente.
export function FilaServicio({
  s,
  catalogo,
  gruista,
  demo,
}: {
  s: Solicitud;
  catalogo: Catalogo | null;
  gruista: string;
  demo?: boolean;
}) {
  const [abierta, setAbierta] = useState(false);
  const activo = ESTADOS_ACTIVOS.includes(s.estado);
  const cancelado = s.estado.startsWith('cancelada') || s.estado === 'sin_grua';
  const tono = activo ? 'warn' : cancelado ? 'neutral' : 'success';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: abierta }}
      onPress={() => setAbierta((a) => !a)}
      style={({ hovered }: { hovered?: boolean }) => [styles.fila, hovered && { backgroundColor: '#FFFBF8' }]}>
      <View style={styles.arriba}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={styles.titulo} numberOfLines={1}>
            {nombreDe(catalogo?.tipos ?? [], s.tipo_vehiculo)} · {nombreDe(catalogo?.motivos ?? [], s.motivo)}
          </Text>
          <Text style={styles.texto} numberOfLines={1}>
            {corta(s.origen.direccion)}
            {s.destino ? ` → ${corta(s.destino.direccion)}` : ' · en el lugar'}
          </Text>
          <Text style={styles.chico}>
            {fecha.format(new Date(s.created_at))} · {gruista}
          </Text>
        </View>
        <View style={styles.derecha}>
          <Badge label={ESTADO_GRUA[s.estado].corto} tone={tono} />
          {s.precio_prestador && !cancelado ? <Text style={styles.precio}>{formatARS(s.precio_prestador)}</Text> : null}
          {abierta ? <ChevronUp size={16} color={colors.muted} /> : <ChevronDown size={16} color={colors.muted} />}
        </View>
      </View>
      {abierta ? (
        <View style={styles.detalle}>
          {s.nota ? <Text style={styles.texto}>Nota del cliente: {s.nota}</Text> : null}
          {s.motivo_cancelacion ? <Text style={styles.texto}>Motivo: {s.motivo_cancelacion}</Text> : null}
          {s.precio_total ? (
            <Text style={styles.chico}>
              El cliente pagó {formatARS(s.precio_total)} · tu empresa cobra {formatARS(s.precio_prestador ?? 0)} ·
              comisión Flety {formatARS(s.comision ?? 0)}
            </Text>
          ) : null}
          {demo ? (
            <Text style={styles.chico}>(En la vista de ejemplo no hay fotos.)</Text>
          ) : (
            <FotosSolicitud solicitudId={s.id} />
          )}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    gap: 10,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#EEE7E1',
  },
  arriba: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  titulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  texto: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  chico: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  derecha: { alignItems: 'flex-end', gap: 6 },
  precio: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  detalle: { gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1ECE7' },
});
