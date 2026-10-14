import * as Location from 'expo-location';
import { LocateFixed, MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { buscarDirecciones, direccionDeCoordenadas } from '@/lib/geocoding';
import type { GeoPoint } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

// Campo de dirección con búsqueda (Photon) y, opcionalmente, "usar mi ubicación".
export function AddressField({
  label,
  placeholder,
  value,
  onChange,
  allowCurrentLocation,
}: {
  label: string;
  placeholder: string;
  value: GeoPoint | null;
  onChange: (point: GeoPoint | null) => void;
  allowCurrentLocation?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [results, setResults] = useState<GeoPoint[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing || query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await buscarDirecciones(query, controller.signal);
        setResults(found);
        setError(found.length ? null : 'No encontramos esa dirección. Probá con calle y número.');
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
  }, [query, editing]);

  function select(point: GeoPoint) {
    onChange(point);
    setEditing(false);
    setQuery('');
    setResults([]);
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
            if (text.trim().length < 3) setResults([]);
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
        <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value?.direccion ?? placeholder}`} onPress={() => setEditing(true)}>
          <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
            {value?.direccion ?? placeholder}
          </Text>
        </Pressable>
      )}

      {editing && (results.length > 0 || searching || allowCurrentLocation) ? (
        <View style={styles.results}>
          {allowCurrentLocation ? (
            <Pressable accessibilityRole="button" onPress={useCurrentLocation} style={styles.result}>
              {locating ? <ActivityIndicator size="small" color={colors.ink} /> : <LocateFixed size={18} color={colors.ink} />}
              <Text style={styles.resultText}>Usar mi ubicación actual</Text>
            </Pressable>
          ) : null}
          {searching ? (
            <View style={styles.result}>
              <ActivityIndicator size="small" color={colors.muted} />
              <Text style={styles.resultMuted}>Buscando…</Text>
            </View>
          ) : null}
          {results.map((r) => (
            <Pressable key={`${r.lat},${r.lng}`} accessibilityRole="button" onPress={() => select(r)} style={styles.result}>
              <MapPin size={18} color={colors.muted} />
              <Text style={styles.resultText} numberOfLines={2}>
                {r.direccion}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  resultText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  resultMuted: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  error: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, marginTop: 4 },
});
