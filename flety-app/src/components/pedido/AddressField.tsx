import * as Location from 'expo-location';
import { BookmarkPlus, Briefcase, Crosshair, House, LocateFixed, MapPin, Star, Store } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { buscarDirecciones, direccionDeCoordenadas } from '@/lib/geocoding';
import {
  buscarLugares,
  coincideGuardado,
  esNombrePersonal,
  guardarLugar,
  misLugares,
  puntoDeGuardado,
  puntoDeLugar,
  sugerirLugar,
  type Lugar,
  type LugarGuardado,
} from '@/lib/lugares';

import { MapPinPicker } from './MapPinPicker';
import type { GeoPoint } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

// Campo de dirección: lugares guardados (Casa, Trabajo… solo del usuario),
// lugares por nombre (base pública), calles (Photon), "usar mi ubicación" y
// marcar o ajustar el punto en el mapa. Un punto se puede guardar como lugar
// propio o, si es un comercio o lugar público, sugerir su nombre para todos.
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
  // Punto marcado en el mapa (o "Guardar lugar"): se ofrece guardarlo o ponerle nombre.
  const [sugerir, setSugerir] = useState<GeoPoint | null>(null);
  const [guardados, setGuardados] = useState<LugarGuardado[] | null>(null);
  const [versionGuardados, setVersionGuardados] = useState(0);
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

  // Los lugares guardados se cargan al empezar a escribir (y al guardar uno nuevo).
  const cargarGuardados = editing || versionGuardados > 0;
  useEffect(() => {
    if (!cargarGuardados) return;
    let cancelled = false;
    misLugares().then((l) => !cancelled && setGuardados(l));
    return () => {
      cancelled = true;
    };
  }, [cargarGuardados, versionGuardados]);
  const guardadosVisibles = (guardados ?? []).filter((g) => coincideGuardado(g, query));
  const yaGuardado =
    !!value && (guardados ?? []).some((g) => Math.abs(g.lat - value.lat) < 1e-4 && Math.abs(g.lng - value.lng) < 1e-4);

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
        <View style={styles.acciones}>
          <Pressable accessibilityRole="button" onPress={() => setPicker(true)} style={styles.adjust} hitSlop={6}>
            <Crosshair size={13} color={colors.muted} strokeWidth={2.2} />
            <Text style={styles.adjustText}>Ajustar el punto en el mapa</Text>
          </Pressable>
          {!yaGuardado && !sugerir ? (
            <Pressable accessibilityRole="button" onPress={() => setSugerir(value)} style={styles.adjust} hitSlop={6}>
              <BookmarkPlus size={13} color={colors.muted} strokeWidth={2.2} />
              <Text style={styles.adjustText}>Guardar lugar</Text>
            </Pressable>
          ) : null}
        </View>
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
          {guardadosVisibles.map((g) => {
            const Icono = /casa|hogar/i.test(g.etiqueta)
              ? House
              : /trabajo|oficina/i.test(g.etiqueta)
                ? Briefcase
                : Star;
            return (
              <Pressable
                key={g.id}
                accessibilityRole="button"
                accessibilityLabel={`${g.etiqueta}${g.direccion ? `, ${g.direccion}` : ''}`}
                onPress={() => select(puntoDeGuardado(g))}
                style={styles.result}>
                <View style={[styles.lugarIcono, { backgroundColor: '#EEF1F4' }]}>
                  <Icono size={16} color={colors.ink} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.lugarNombre} numberOfLines={1}>
                    {g.etiqueta}
                  </Text>
                  {g.direccion ? (
                    <Text style={styles.resultMuted} numberOfLines={1}>
                      {g.direccion}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
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
      {sugerir && !editing ? (
        <GuardarLugar
          punto={sugerir}
          onGuardado={() => setVersionGuardados((v) => v + 1)}
          onListo={() => setSugerir(null)}
        />
      ) : null}

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

// Después de marcar un punto: guardarlo como lugar propio (Casa, Trabajo…:
// solo lo ve el usuario) o, si es un comercio o lugar público, sugerir su
// nombre (lo revisa Flety antes de que aparezca para todos).
function GuardarLugar({
  punto,
  onGuardado,
  onListo,
}: {
  punto: GeoPoint;
  onGuardado: () => void;
  onListo: () => void;
}) {
  const [modo, setModo] = useState<'propio' | 'otro' | 'publico'>('propio');
  const [nombre, setNombre] = useState('');
  const [estado, setEstado] = useState<'editando' | 'enviando' | 'listo'>('editando');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function guardar(etiqueta: string) {
    setEstado('enviando');
    setError(null);
    try {
      await guardarLugar(etiqueta, punto);
      onGuardado();
      setMensaje(`Guardado como «${etiqueta.trim()}». Solo lo ves vos.`);
      setEstado('listo');
      setTimeout(onListo, 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardarlo.');
      setEstado('editando');
    }
  }

  async function sugerir() {
    if (esNombrePersonal(nombre)) {
      setError('Ese nombre es personal: guardalo como lugar tuyo, así solo lo ves vos.');
      return;
    }
    setEstado('enviando');
    setError(null);
    try {
      await sugerirLugar(nombre, punto);
      setMensaje('¡Gracias! Lo revisamos y, si está bien, aparece en la búsqueda para todos.');
      setEstado('listo');
      setTimeout(onListo, 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardarlo.');
      setEstado('editando');
    }
  }

  if (estado === 'listo') return <Text style={styles.sugerirOk}>{mensaje}</Text>;
  const enviando = estado === 'enviando';
  const valido = nombre.trim().length >= 2;

  return (
    <View style={styles.sugerir}>
      {modo === 'publico' ? (
        <>
          <Text style={styles.sugerirTitulo}>Sugerir un comercio o lugar público</Text>
          <Text style={styles.resultMuted}>
            Por ejemplo, un negocio, un club o un edificio conocido. Lo revisamos antes de mostrarlo a todos. No pongas
            casas ni lugares personales.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.sugerirTitulo}>¿Querés guardar este lugar?</Text>
          <Text style={styles.resultMuted}>Solo lo ves vos. La próxima vez lo elegís de un toque.</Text>
          <View style={styles.etiquetas}>
            {[
              { e: 'Casa', Icono: House },
              { e: 'Trabajo', Icono: Briefcase },
            ].map(({ e, Icono }) => (
              <Pressable
                key={e}
                accessibilityRole="button"
                disabled={enviando}
                onPress={() => guardar(e)}
                style={styles.etiqueta}>
                <Icono size={15} color={colors.ink} strokeWidth={2.2} />
                <Text style={styles.etiquetaTexto}>{e}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: modo === 'otro' }}
              disabled={enviando}
              onPress={() => setModo('otro')}
              style={[styles.etiqueta, modo === 'otro' && styles.etiquetaOn]}>
              <Star size={15} color={colors.ink} strokeWidth={2.2} />
              <Text style={styles.etiquetaTexto}>Otro nombre</Text>
            </Pressable>
          </View>
        </>
      )}

      {modo !== 'propio' ? (
        <View style={styles.sugerirFila}>
          <TextInput
            value={nombre}
            onChangeText={(v) => {
              setNombre(v);
              setError(null);
            }}
            placeholder={modo === 'publico' ? 'Nombre del comercio o lugar' : 'Ej.: Gimnasio, Depto de Ana'}
            placeholderTextColor={colors.muted}
            accessibilityLabel={modo === 'publico' ? 'Nombre del comercio o lugar' : 'Nombre para tu lugar'}
            maxLength={modo === 'publico' ? 120 : 40}
            autoFocus
            style={styles.sugerirInput}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!valido || enviando}
            onPress={() => (modo === 'publico' ? sugerir() : guardar(nombre))}
            style={[styles.sugerirBoton, !valido && { opacity: 0.5 }]}>
            {enviando ? (
              <ActivityIndicator size="small" color={colors.ink} />
            ) : (
              <Text style={styles.sugerirBotonTexto}>{modo === 'publico' ? 'Sugerir' : 'Guardar'}</Text>
            )}
          </Pressable>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.acciones}>
        {modo === 'publico' ? (
          <Pressable accessibilityRole="button" onPress={() => setModo('propio')} hitSlop={6}>
            <Text style={styles.adjustText}>Mejor guardarlo para mí</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setModo('publico')} hitSlop={6}>
            <Text style={styles.adjustText}>¿Es un comercio o lugar público?</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={onListo} hitSlop={6}>
          <Text style={styles.adjustText}>No, gracias</Text>
        </Pressable>
      </View>
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
  acciones: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 6 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#F1D58A',
  },
  etiquetaOn: { backgroundColor: '#FFE8A3', borderColor: '#E8B400' },
  etiquetaTexto: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
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
