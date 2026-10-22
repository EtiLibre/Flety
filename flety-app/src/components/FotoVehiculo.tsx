import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VehiculoIlustracion } from '@/components/VehiculoIlustracion';
import { fotosDelModelo, resolverFoto } from '@/lib/fotoModelo';
import type { Vehiculo } from '@/lib/types';
import type { DatosVehiculo, FotoModelo } from '@/lib/vehiculos';
import { colors, fonts } from '@/theme';

// La foto real del vehículo: la del chofer, si no la del modelo (Wikimedia
// Commons, con crédito) y si tampoco hay, el dibujo generado.

// Busca la foto del modelo cuando el vehículo no tiene una guardada.
function useFotoBuscada(marca: string | null, modelo: string | null, anio?: string) {
  const clave = marca && modelo ? `${marca}|${modelo}|${anio ?? ''}` : null;
  const [res, setRes] = useState<{ clave: string; foto: FotoModelo | null } | null>(null);
  useEffect(() => {
    if (!clave || !marca || !modelo) return;
    let cancelled = false;
    fotosDelModelo(marca, modelo, anio, 1).then((f) => !cancelled && setRes({ clave, foto: f[0] ?? null }));
    return () => {
      cancelled = true;
    };
  }, [clave, marca, modelo, anio]);
  return res?.clave === clave ? res.foto : null;
}

function useFoto(vehiculo: DatosVehiculo | null | undefined) {
  const r = resolverFoto(vehiculo);
  const buscada = useFotoBuscada(
    r.tipo === 'buscar' ? r.marca : null,
    r.tipo === 'buscar' ? r.modelo : null,
    vehiculo?.anio
  );
  if (r.tipo === 'propia') return { propias: r.urls, modelo: null };
  if (r.tipo === 'modelo') return { propias: [], modelo: r.foto };
  return { propias: [], modelo: buscada };
}

// Miniatura para listas (marketplace).
export function FotoVehiculoMini({
  vehiculo,
  tipo,
  ancho = 66,
}: {
  vehiculo: DatosVehiculo | null | undefined;
  tipo: Vehiculo;
  ancho?: number;
}) {
  const { propias, modelo } = useFoto(vehiculo);
  const [fallo, setFallo] = useState<string | null>(null);
  const url = propias[0] ?? modelo?.url ?? null;
  if (!url || fallo === url) {
    return <VehiculoIlustracion tipo={tipo} color={vehiculo?.color ?? 'blanco'} ancho={ancho} />;
  }
  return (
    <Image
      source={{ uri: url }}
      style={{ width: ancho, height: Math.round(ancho * 0.62), borderRadius: 10, backgroundColor: '#E9ECEF' }}
      contentFit="cover"
      transition={200}
      onError={() => setFallo(url)}
      accessibilityLabel="Foto del vehículo"
    />
  );
}

// Foto grande para el perfil, con crédito si es la del modelo.
export function FotoVehiculo({
  vehiculo,
  tipo,
  fondo = '#EEF0F2',
}: {
  vehiculo: DatosVehiculo | null | undefined;
  tipo: Vehiculo;
  fondo?: string;
}) {
  const { propias, modelo } = useFoto(vehiculo);
  const [fallidas, setFallidas] = useState<string[]>([]);
  const [ancho, setAncho] = useState(0);
  const [pagina, setPagina] = useState(0);

  const urls = propias.filter((u) => !fallidas.includes(u));
  const modeloOk = modelo && !fallidas.includes(modelo.url) ? modelo : null;
  const fallar = (u: string) => setFallidas((f) => [...f, u]);

  if (urls.length) {
    return (
      <View style={{ gap: 6 }}>
        <View style={[styles.marco, { backgroundColor: fondo }]} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => ancho && setPagina(Math.round(e.nativeEvent.contentOffset.x / ancho))}
            onScroll={(e) => ancho && setPagina(Math.round(e.nativeEvent.contentOffset.x / ancho))}
            scrollEventThrottle={64}>
            {urls.map((u, i) => (
              <Image
                key={u}
                source={{ uri: u }}
                style={{ width: ancho || 1, aspectRatio: 16 / 10 }}
                contentFit="cover"
                transition={200}
                onError={() => fallar(u)}
                accessibilityLabel={`Foto ${i + 1} del vehículo`}
              />
            ))}
          </ScrollView>
          {urls.length > 1 ? (
            <View style={styles.puntos} pointerEvents="none">
              {urls.map((u, i) => (
                <View key={u} style={[styles.punto, i === pagina && styles.puntoOn]} />
              ))}
            </View>
          ) : null}
        </View>
        <Text style={styles.nota}>Fotos del vehículo cargadas por el fletero.</Text>
      </View>
    );
  }

  if (modeloOk) {
    return (
      <View style={{ gap: 6 }}>
        <View style={[styles.marco, { backgroundColor: fondo }]}>
          <Image
            source={{ uri: modeloOk.url }}
            style={{ width: '100%', aspectRatio: 16 / 10 }}
            contentFit="cover"
            transition={200}
            onError={() => fallar(modeloOk.url)}
            accessibilityLabel="Foto de referencia del modelo"
          />
          <View style={styles.etiqueta}>
            <Text style={styles.etiquetaText}>Foto de referencia del modelo</Text>
          </View>
        </View>
        <CreditoFoto foto={modeloOk} />
      </View>
    );
  }

  return (
    <View style={{ gap: 6 }}>
      <View style={[styles.marco, styles.dibujo, { backgroundColor: fondo }]}>
        <VehiculoIlustracion tipo={tipo} color={vehiculo?.color ?? 'blanco'} ancho={250} />
      </View>
      <Text style={styles.nota}>Dibujo generado por Flety según el tipo y el color del vehículo.</Text>
    </View>
  );
}

// Crédito que piden las licencias de Wikimedia Commons (autor + licencia + fuente).
export function CreditoFoto({ foto, oscuro }: { foto: FotoModelo; oscuro?: boolean }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => Linking.openURL(foto.pagina)}
      hitSlop={6}
      style={{ alignSelf: 'flex-start' }}>
      <Text style={[styles.nota, oscuro && { color: colors.dark.muted }]} numberOfLines={2}>
        {oscuro ? '' : 'No es el vehículo del fletero: es una foto del mismo modelo. '}Foto: {foto.autor}
        {foto.licencia ? ` · ${foto.licencia}` : ''} · <Text style={styles.link}>Wikimedia Commons</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  marco: { width: '100%', borderRadius: 20, overflow: 'hidden' },
  dibujo: { alignItems: 'center', paddingVertical: 10 },
  puntos: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  puntoOn: { backgroundColor: colors.white, width: 18 },
  etiqueta: {
    position: 'absolute',
    left: 10,
    top: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(18,22,28,0.72)',
  },
  etiquetaText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.white },
  nota: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.muted },
  link: { textDecorationLine: 'underline' },
});
