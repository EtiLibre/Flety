import { StyleSheet, Text, View } from 'react-native';

import { AppMap } from '@/components/map/AppMap';
import { MENDOZA, type MapMarker } from '@/components/map/types';
import { useUltimaPosicion, useVehiculosCerca } from '@/lib/cercanos';
import { useFlotaAmbiente } from '@/lib/flota-ambiente';
import { colors, fonts } from '@/theme';

// Mapa del inicio, como el de DiDi: camionetas y grúas circulando alrededor
// antes de pedir. Si hay choferes o gruistas reales disponibles cerca se
// muestran esos (con cuántos hay); si no, vehículos de ambiente que solo
// decoran (la leyenda no promete disponibilidad).
export function MapaCercanos({ grande }: { grande?: boolean }) {
  const pos = useUltimaPosicion();
  const centro = pos ?? MENDOZA;
  const vehiculos = useVehiculosCerca(centro);
  const hayReales = !!vehiculos?.length;
  const ambiente = useFlotaAmbiente(centro, !hayReales);

  const markers: MapMarker[] = hayReales
    ? vehiculos.map((v, i) => ({
        id: `${v.servicio}-${i}`,
        kind: v.servicio === 'gruas' ? 'flotaGrua' : 'flotaFlete',
        position: { lat: v.lat, lng: v.lng },
        label: v.servicio === 'gruas' ? 'Grúa disponible' : 'Flete disponible',
      }))
    : ambiente;
  if (pos) markers.push({ id: 'yo', kind: 'user', position: pos, label: 'Vos' });

  const fletes = vehiculos?.filter((v) => v.servicio === 'mudanzas').length ?? 0;
  const gruas = vehiculos?.filter((v) => v.servicio === 'gruas').length ?? 0;

  return (
    <View style={[styles.marco, grande ? styles.grande : styles.tarjeta]}>
      <AppMap center={centro} markers={markers} initialZoom={13} estatico={!grande} style={StyleSheet.absoluteFill} />
      <View
        style={[styles.leyenda, grande && styles.leyendaGrande]}
        pointerEvents="none"
        accessibilityLiveRegion="polite">
        {!hayReales ? (
          <Text style={styles.leyendaTexto}>Fletes, mudanzas y grúas en un toque</Text>
        ) : (
          <>
            {fletes ? (
              <View style={styles.item}>
                <View style={[styles.punto, { backgroundColor: '#FFC233' }]} />
                <Text style={styles.leyendaTexto}>
                  {fletes} {fletes === 1 ? 'flete' : 'fletes'}
                </Text>
              </View>
            ) : null}
            {gruas ? (
              <View style={styles.item}>
                <View style={[styles.punto, { backgroundColor: '#FF6B1A' }]} />
                <Text style={styles.leyendaTexto}>
                  {gruas} {gruas === 1 ? 'grúa' : 'grúas'}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.leyendaTexto, { color: colors.muted }]}>cerca tuyo</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  marco: { overflow: 'hidden', backgroundColor: '#E9ECEF' },
  tarjeta: {
    height: 210,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: colors.white,
    boxShadow: '0px 1px 2px rgba(18,22,28,0.05), 0px 16px 32px -18px rgba(18,22,28,0.35)',
  },
  grande: { flex: 1 },
  leyenda: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    boxShadow: '0px 4px 12px -4px rgba(18,22,28,0.25)',
  },
  leyendaGrande: { left: 20, bottom: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  punto: { width: 9, height: 9, borderRadius: 5 },
  leyendaTexto: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
});
