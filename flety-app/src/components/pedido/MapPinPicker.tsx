import * as Location from 'expo-location';
import { ChevronLeft, LocateFixed, MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { AppMap } from '@/components/map/AppMap';
import { MENDOZA, type LatLng } from '@/components/map/types';
import { direccionDeCoordenadas } from '@/lib/geocoding';
import type { GeoPoint } from '@/lib/types';
import { colors, fonts } from '@/theme';

const FALLBACK = 'Punto marcado en el mapa';

const transicion = {
  transitionProperty: 'transform',
  transitionDuration: '180ms',
} as unknown as ViewStyle;

// Elegir el punto exacto en el mapa (estilo Uber): el pin queda fijo en el
// centro, se mueve el mapa debajo y al soltarlo se busca la dirección de ese punto.
export function MapPinPicker({
  visible,
  titulo,
  tipo,
  inicial,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  titulo: string;
  tipo: 'origen' | 'destino';
  inicial: GeoPoint | null;
  onCancel: () => void;
  onConfirm: (point: GeoPoint) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      {visible ? (
        <Picker titulo={titulo} tipo={tipo} inicial={inicial} onCancel={onCancel} onConfirm={onConfirm} />
      ) : null}
    </Modal>
  );
}

function Picker({
  titulo,
  tipo,
  inicial,
  onCancel,
  onConfirm,
}: {
  titulo: string;
  tipo: 'origen' | 'destino';
  inicial: GeoPoint | null;
  onCancel: () => void;
  onConfirm: (point: GeoPoint) => void;
}) {
  // `centro` solo cambia al tocar "Mi ubicación" (mueve el mapa); el resto lo mueve el usuario.
  const [centro, setCentro] = useState<LatLng>(inicial ?? MENDOZA);
  const [punto, setPunto] = useState<LatLng>(inicial ?? MENDOZA);
  const [moviendo, setMoviendo] = useState(false);
  const [direccion, setDireccion] = useState<{ key: string; texto: string } | null>(
    inicial ? { key: `${inicial.lat},${inicial.lng}`, texto: inicial.direccion } : null
  );
  const [localizando, setLocalizando] = useState(false);

  const key = `${punto.lat},${punto.lng}`;
  useEffect(() => {
    if (direccion?.key === key) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      direccionDeCoordenadas(punto.lat, punto.lng, FALLBACK, controller.signal)
        .then((p) => setDireccion({ key, texto: p.direccion }))
        .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // key resume el punto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const buscando = moviendo || direccion?.key !== key;

  async function miUbicacion() {
    setLocalizando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCentro(p);
        setPunto(p);
      }
    } finally {
      setLocalizando(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppMap
        center={centro}
        initialZoom={inicial ? 17 : 14}
        onMoveStart={() => setMoviendo(true)}
        onCenterChange={(c) => {
          setMoviendo(false);
          setPunto(c);
        }}
        style={StyleSheet.absoluteFill}
      />

      {/* Pin fijo en el centro: la punta marca el lugar; se "levanta" mientras se mueve el mapa. */}
      <View style={styles.pinLayer} pointerEvents="none">
        <View style={[styles.pinShadow, moviendo && styles.pinShadowUp]} />
        <View style={[styles.pin, transicion, { transform: [{ translateY: moviendo ? -12 : 0 }] }]}>
          <MapPin
            size={48}
            color={colors.ink}
            fill={tipo === 'destino' ? colors.accent : colors.white}
            strokeWidth={1.8}
          />
        </View>
      </View>

      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onCancel} style={styles.roundBtn}>
            <ChevronLeft size={22} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
          <View style={styles.titlePill}>
            <Text style={styles.titleText}>{titulo}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ir a mi ubicación"
            onPress={miUbicacion}
            style={styles.roundBtn}>
            {localizando ? (
              <ActivityIndicator size="small" color={colors.ink} />
            ) : (
              <LocateFixed size={20} color={colors.ink} strokeWidth={2.2} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.bottom}>
        <View style={styles.card}>
          <Text style={styles.hint}>Mové el mapa hasta que el pin quede en el lugar exacto</Text>
          <View style={styles.addressRow}>
            <View style={[styles.dot, tipo === 'destino' ? styles.dotDestino : styles.dotOrigen]} />
            <Text style={[styles.address, buscando && styles.addressMuted]} numberOfLines={2}>
              {buscando ? 'Buscando la dirección…' : (direccion?.texto ?? FALLBACK)}
            </Text>
          </View>
          <Button
            title="Confirmar ubicación"
            variant="dark"
            disabled={moviendo}
            onPress={() =>
              onConfirm({
                lat: punto.lat,
                lng: punto.lng,
                direccion: direccion?.key === key ? direccion.texto : FALLBACK,
              })
            }
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mapLand },
  pinLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  // La punta del pin (abajo al centro del ícono) cae justo en el centro del mapa.
  pin: { position: 'absolute', top: '50%', marginTop: -44, alignSelf: 'center' },
  pinShadow: {
    position: 'absolute',
    top: '50%',
    marginTop: -3,
    width: 10,
    height: 6,
    borderRadius: 5,
    backgroundColor: 'rgba(18,22,28,0.35)',
  },
  pinShadowUp: { width: 16, opacity: 0.6 },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 14 },
  roundBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(18, 22, 28, 0.16)',
  },
  titlePill: {
    flexShrink: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: colors.white,
    boxShadow: '0 4px 14px rgba(18, 22, 28, 0.16)',
  },
  titleText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 520,
    gap: 14,
    padding: 18,
    paddingBottom: 22,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
    boxShadow: '0 -8px 30px rgba(18, 22, 28, 0.12)',
  },
  hint: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, textAlign: 'center' },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  dot: { width: 12, height: 12 },
  dotOrigen: { borderRadius: 6, borderWidth: 3, borderColor: colors.ink, backgroundColor: colors.white },
  dotDestino: { borderRadius: 3, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.ink },
  address: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  addressMuted: { color: colors.muted },
});
