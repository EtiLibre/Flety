import { Check, Clock, Star } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatARS } from '@/lib/pricing';
import { iniciales } from '@/lib/empresa';
import { GruaPlanchaIlustracion } from '@/plataforma/estilo';
import { colors, fonts, radius } from '@/theme';

import { nombreDe, urlFoto } from './api';
import type { Catalogo, OpcionGrua } from './tipos';
import { G } from './ui';

// Una grúa disponible para elegir: quién es (gruista y empresa), qué grúa
// tiene, a cuánto está y cuánto cobra por este servicio.
export function GruaOption({
  o,
  catalogo,
  seleccionada,
  onPress,
}: {
  o: OpcionGrua;
  catalogo: Catalogo | null;
  seleccionada: boolean;
  onPress: () => void;
}) {
  const foto = urlFoto(o.foto);
  const modalidad = o.modalidad ? nombreDe(catalogo?.modalidades ?? [], o.modalidad) : 'Grúa';
  const unidad = [o.unidad?.marca, o.unidad?.modelo].filter(Boolean).join(' ');
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: seleccionada }}
      accessibilityLabel={`${o.nombre}${o.empresa ? `, ${o.empresa}` : ''}, ${modalidad}, a ${o.eta_min} minutos, ${formatARS(o.total)}`}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.opcion,
        seleccionada ? styles.on : styles.off,
        !seleccionada && hovered && { backgroundColor: '#FFFAF6' },
        pressed && { opacity: 0.9 },
      ]}>
      <View style={[styles.avatar, seleccionada && { backgroundColor: G.acento }]}>
        {foto ? (
          <Image source={{ uri: foto }} style={styles.avatarFoto} accessibilityIgnoresInvertColors />
        ) : (
          <Text style={[styles.avatarTexto, seleccionada && { color: colors.white }]}>{iniciales(o.nombre)}</Text>
        )}
        <View style={styles.enLinea} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={styles.nombre} numberOfLines={1}>
          {o.nombre} <Text style={styles.empresa}>· {o.empresa ?? 'Independiente'}</Text>
        </Text>
        <Text style={styles.detalle} numberOfLines={1}>
          {modalidad}
          {unidad ? ` · ${unidad}` : ''}
        </Text>
        <View style={styles.fila}>
          {o.calificaciones ? (
            <>
              <Star size={12} color="#E8A400" fill="#FFC233" strokeWidth={2} />
              <Text style={styles.rating}>
                {o.estrellas?.toFixed(1)} <Text style={styles.ratingMuted}>({o.calificaciones})</Text>
              </Text>
            </>
          ) : (
            <Text style={styles.nuevo}>Nuevo en Flety</Text>
          )}
          <View style={styles.eta}>
            <Clock size={11} color={G.texto} strokeWidth={2.4} />
            <Text style={styles.etaTexto}>~{o.eta_min} min</Text>
          </View>
        </View>
      </View>
      <View style={styles.derecha}>
        <GruaPlanchaIlustracion ancho={58} />
        <Text style={styles.precio}>{formatARS(o.total)}</Text>
        {seleccionada ? (
          <View style={styles.check}>
            <Check size={12} color={colors.white} strokeWidth={3} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
  },
  off: { borderWidth: 1, borderColor: colors.line, margin: 1 },
  on: { borderWidth: 2, borderColor: G.acento, boxShadow: '0px 10px 24px -14px rgba(232,67,15,0.55)' },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: G.suave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFoto: { width: 46, height: 46, borderRadius: 23 },
  avatarTexto: { fontFamily: fonts.bold, fontSize: 15, color: G.texto },
  enLinea: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.white,
  },
  nombre: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  empresa: { fontFamily: fonts.medium, color: colors.muted },
  detalle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rating: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  ratingMuted: { fontFamily: fonts.regular, color: colors.muted },
  nuevo: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#2F45B5',
    backgroundColor: '#E8EEFF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  eta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: G.suave,
  },
  etaTexto: { fontFamily: fonts.bold, fontSize: 11, color: G.texto },
  derecha: { alignItems: 'flex-end', gap: 2 },
  precio: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: G.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
