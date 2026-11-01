import * as Location from 'expo-location';
import { Crosshair, LocateFixed, MapPin, Store } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { buscarDirecciones, direccionDeCoordenadas } from '@/lib/geocoding';
import { buscarLugares, puntoDeLugar, sugerirLugar, type Lugar } from '@/lib/lugares';

import { MapPinPicker } from './MapPinPicker';
import type { GeoPoint } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

// Campo de dirección: busca lugares por nombre (base propia) y calles (Photon),
// "usar mi ubicación" y marcar o ajustar el punto en el mapa. Si se marca en
// el mapa, se puede sugerir el nombre del lugar para que lo encuentren otros.
export function AddressField({
  label,
  placeholder,
  value,
  onChange,
  allowCurrentLocation,
  tipo = 'destino',
}: {
  label: string;
  placeholder: string;
  value: GeoPoint | null;
  onChange: (point: GeoPoint | null) => void;
  allowCurrentLocation?: boolean;
  // Cómo se ve el pin en el mapa.
  tipo?: 'origen' | 'destino';
}) {
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [results, setResults] = useState<GeoPoint[]>([]);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  // Punto marcado en el mapa: se ofrece ponerle nombre.
  const [sugerir, setSugerir] = useState<GeoPoint | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Los lugares se ordenan por cercanía al punto que ya había (si hay).
  const cercaLat = value?.lat;
  const cercaLng = value?.lng;

  useEffect(() => {
    if (!editing || query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const [found, encontrados] = await Promise.all([
          buscarDirecciones(query, controller.signal).catch((e: Error) => {
            if (e.name === 'AbortError') throw e;
            return [] as GeoPoint[];
          }),
          buscarLugares(query, cercaLat != null && cercaLng != null ? { lat: cercaLat, lng: cercaLng } : null),
        ]);
        if (controller.signal.aborted) return;
        setLugares(encontrados);
        setResults(found);
        setError(
          found.length || encontrados.length
            ? null
            : 'No lo encontramos. Probá con calle y número, o marcalo en el mapa.'
        );
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError('No pudimos buscar direcciones. Revisá tu conexión.');
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, editing, cercaLat, cercaLng]);

  function select(point: GeoPoint) {
    onChange(point);
    setEditing(false);
    setQuery('');
    setResults([]);
    setLugares([]);
    setError(null);
  }

  async function useCurrentLocation() {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Necesitamos permiso de ubicación para usar tu posición actual.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      select(await direccionDeCoordenadas(pos.coords.latitude, pos.coords.longitude));
    } catch {
      setError('No pudimos obtener tu ubicación.');
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label} nativeID={`addr-${label}`}>
        {label}
      </Text>
      {editing ? (
        <TextInput
          autoFocus
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (text.trim().length < 3) {
              setResults([]);
              setLugares([]);
            }
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          accessibilityLabel={label}
          accessibilityLabelledBy={`addr-${label}`}
          style={styles.input}
          onBlur={() => {
            // Deja tiempo a que el toque en una sugerencia se registre.
            setTimeout(() => setEditing(false), 200);
          }}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value?.direccion ?? placeholder}`}
          onPress={() => setEditing(true)}>
          <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
            {value?.direccion ?? placeholder}
          </Text>
        </Pressable>
      )}

      {!editing && value ? (
        <Pressable accessibilityRole="button" onPress={() => setPicker(true)} style={styles.adjust} hitSlop={6}>
          <Crosshair size={13} color={colors.muted} strokeWidth={2.2} />
          <Text style={styles.adjustText}>Ajustar el punto en el mapa</Text>
        </Pressable>
      ) : null}

      {editing ? (
        <View style={styles.results}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setEditing(false);
              setPicker(true);
            }}
            style={styles.result}>
            <Crosshair size={18} color={colors.ink} />
            <Text style={styles.resultText}>Marcar en el mapa</Text>
          </Pressable>
          {allowCurrentLocation ? (
            <Pressable accessibilityRole="button" onPress={useCurrentLocation} style={styles.result}>
              {locating ? (
                <ActivityIndicator size="small" color={colors.ink} />
              ) : (
                <LocateFixed size={18} color={colors.ink} />
              )}
              <Text style={styles.resultText}>Usar mi ubicación actual</Text>
            </Pressable>
          ) : null}
          {searching ? (
            <View style={styles.result}>
              <ActivityIndicator size="small" color={colors.muted} />
              <Text style={styles.resultMuted}>Buscando…</Text>
            </View>
          ) : null}
          {lugares.map((l) => (
            <Pressable
              key={l.id}
              accessibilityRole="button"
              accessibilityLabel={`${l.nombre}${l.direccion ? `, ${l.direccion}` : ''}`}
              onPress={() => select(puntoDeLugar(l))}
              style={styles.result}>
              <View style={styles.lugarIcono}>
                <Store size={16} color="#7A5A00" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.lugarNombre} numberOfLines={1}>
                  {l.nombre}
                </Text>
                <Text style={styles.resultMuted} numberOfLines={1}>
                  {[l.categoria, l.direccion ?? l.localidad].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </Pressable>
          ))}
          {results.map((r) => (
            <Pressable
              key={`${r.lat},${r.lng}`}
              accessibilityRole="button"
              onPress={() => select(r)}
              style={styles.result}>
              <MapPin size={18} color={colors.muted} />
              <Text style={styles.resultText} numberOfLines={2}>
                {r.direccion}
              </Text>
            </Pressable>
          ))}
          {lugares.length ? <Text style={styles.fuente}>Lugares: Overture Maps Foundation</Text> : null}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {sugerir && !editing ? <SugerirNombre punto={sugerir} onListo={() => setSugerir(null)} /> : null}

      <MapPinPicker
        visible={picker}
        titulo={`Marcá el punto de ${label.toLowerCase()}`}
        tipo={tipo}
        inicial={value}
        onCancel={() => setPicker(false)}
        onConfirm={(point) => {
          setPicker(false);
          select(point);
          setSugerir(point);
        }}
      />
    </View>
  );
}

// Después de marcar en el mapa: "¿este lugar tiene nombre?". Lo revisa el
// equipo de Flety y queda disponible en la búsqueda para todos.
function SugerirNombre({ punto, onListo }: { punto: GeoPoint; onListo: () => void }) {
  const [nombre, setNombre] = useState('');
  const [estado, setEstado] = useState<'editando' | 'enviando' | 'listo'>('editando');
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEstado('enviando');
    setError(null);
    try {
      await sugerirLugar(nombre, punto);
      setEstado('listo');
      setTimeout(onListo, 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardarlo.');
      setEstado('editando');
    }
  }

  if (estado === 'listo') {
    return <Text style={styles.sugerirOk}>¡Gracias! Lo revisamos y va a aparecer en la búsqueda para todos.</Text>;
  }
  return (
    <View style={styles.sugerir}>
      <Text style={styles.sugerirTitulo}>¿Este lugar tiene nombre?</Text>
      <Text style={styles.resultMuted}>Por ejemplo, un comercio o un edificio. Así lo encuentran otros.</Text>
      <View style={styles.sugerirFila}>
        <TextInput
          value={nombre}
          onChangeText={setNombre}
          placeholder="Nombre del lugar"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Nombre del lugar"
          maxLength={120}
          style={styles.sugerirInput}
        />
        <Pressable
          accessibilityRole="button"
          disabled={nombre.trim().length < 2 || estado === 'enviando'}
          onPress={enviar}
          style={[styles.sugerirBoton, nombre.trim().length < 2 && { opacity: 0.5 }]}>
          {estado === 'enviando' ? (
            <ActivityIndicator size="small" color={colors.ink} />
          ) : (
            <Text style={styles.sugerirBotonTexto}>Sugerir</Text>
          )}
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" onPress={onListo} hitSlop={6}>
        <Text style={styles.adjustText}>No, gracias</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  lugarIcono: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4D6',
  },
  lugarNombre: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  fuente: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, padding: 8, textAlign: 'right' },
  sugerir: {
    marginTop: 10,
    gap: 6,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FFE9A8',
  },
  sugerirTitulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  sugerirFila: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  sugerirInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
  },
  sugerirBoton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFC233',
  },
  sugerirBotonTexto: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink },
  sugerirOk: { marginTop: 8, fontFamily: fonts.semibold, fontSize: 13, color: colors.success },
  wrapper: { gap: 2, paddingVertical: 10 },
  label: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  value: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, paddingVertical: 2 },
  placeholder: { color: colors.muted },
  input: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 2,
    outlineStyle: 'none',
  } as object,
  results: {
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  resultText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  resultMuted: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  error: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, marginTop: 4 },
  adjust: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingTop: 4 },
  adjustText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted, textDecorationLine: 'underline' },
});
