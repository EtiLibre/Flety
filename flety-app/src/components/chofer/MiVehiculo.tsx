import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { CreditoFoto, FotoVehiculo } from '@/components/FotoVehiculo';
import { PatenteChip } from '@/components/VehiculoIlustracion';
import { borrarFotosVehiculo, guardarVehiculo, subirFotoVehiculo } from '@/lib/chofer';
import { fotoModeloValida, fotosDelModelo, urlFotoVehiculo } from '@/lib/fotoModelo';
import { VEHICULO_LABEL, type Vehiculo } from '@/lib/types';
import {
  COLORES,
  formatoPatente,
  patenteValida,
  type ColorVehiculo,
  type DatosVehiculo,
  type FotoModelo,
} from '@/lib/vehiculos';
import { colors, fonts, radius } from '@/theme';

const d = colors.dark;
const TIPOS: Vehiculo[] = ['utilitario', 'camioneta', 'camion'];
const ANIO_ACTUAL = new Date().getFullYear();
const MAX_FOTOS = 3;

// Fotos de referencia del modelo mientras el chofer escribe marca y modelo.
function useCandidatos(marca: string, modelo: string, anio: string) {
  const clave = marca.trim().length >= 2 && modelo.trim() ? `${marca.trim()}|${modelo.trim()}|${anio}` : null;
  const [res, setRes] = useState<{ clave: string; fotos: FotoModelo[] } | null>(null);
  useEffect(() => {
    if (!clave) return;
    let cancelled = false;
    // Espera a que deje de escribir.
    const t = setTimeout(() => {
      fotosDelModelo(marca, modelo, anio, 4).then((fotos) => !cancelled && setRes({ clave, fotos }));
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [clave, marca, modelo, anio]);
  if (!clave) return { buscando: false, fotos: [] };
  return res?.clave === clave ? { buscando: false, fotos: res.fotos } : { buscando: true, fotos: [] };
}

// El vehículo con el que el chofer aparece en el marketplace: sus fotos reales;
// si no sube, una foto del mismo modelo; y si no hay, el dibujo según tipo y color.
export function MiVehiculo({
  driverId,
  inicial,
  onGuardado,
}: {
  driverId: string;
  inicial: DatosVehiculo | null;
  onGuardado: () => void;
}) {
  const [tipo, setTipo] = useState<Vehiculo | null>(inicial?.tipo ?? null);
  const [marca, setMarca] = useState(inicial?.marca ?? '');
  const [modelo, setModelo] = useState(inicial?.modelo ?? '');
  const [anio, setAnio] = useState(inicial?.anio ?? '');
  const [color, setColor] = useState<ColorVehiculo>(inicial?.color ?? 'blanco');
  const [patente, setPatente] = useState(inicial?.patente ?? '');
  const [fotos, setFotos] = useState<string[]>(inicial?.fotos ?? []);
  const [borradas, setBorradas] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  // null = todavía no eligió: se usa la primera que encontramos.
  const [fotoModelo, setFotoModelo] = useState<FotoModelo | 'ninguna' | null>(
    inicial?.foto_modelo === 'ninguna' ? 'ninguna' : fotoModeloValida(inicial?.foto_modelo)
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidatos = useCandidatos(marca, modelo, anio);
  const modeloElegido = fotoModelo ?? candidatos.fotos[0] ?? null;
  // La elegida se muestra aunque ya no esté entre las que encontramos.
  const opciones =
    modeloElegido && modeloElegido !== 'ninguna' && !candidatos.fotos.some((f) => f.url === modeloElegido.url)
      ? [modeloElegido, ...candidatos.fotos.slice(0, 3)]
      : candidatos.fotos;

  // Si cambia el modelo, la foto elegida deja de valer.
  function cambiarMarca(v: string) {
    setMarca(v);
    setFotoModelo(null);
  }
  function cambiarModelo(v: string) {
    setModelo(v);
    setFotoModelo(null);
  }

  async function agregarFotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_FOTOS - fotos.length,
      quality: 0.7,
    });
    if (result.canceled) return;
    setSubiendo(true);
    setError(null);
    try {
      const nuevas: string[] = [];
      for (const [i, asset] of result.assets.slice(0, MAX_FOTOS - fotos.length).entries()) {
        nuevas.push(
          await subirFotoVehiculo(
            driverId,
            {
              uri: asset.uri,
              mimeType: asset.mimeType ?? 'image/jpeg',
              fileName: asset.fileName ?? `vehiculo-${i}.jpg`,
              file: asset.file,
            },
            i
          )
        );
      }
      setFotos((f) => [...f, ...nuevas].slice(0, MAX_FOTOS));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos subir la foto.');
    } finally {
      setSubiendo(false);
    }
  }

  function quitarFoto(path: string) {
    setFotos((f) => f.filter((x) => x !== path));
    // Las ya guardadas se borran al guardar; las recién subidas, ahora.
    if (inicial?.fotos?.includes(path)) setBorradas((b) => [...b, path]);
    else borrarFotosVehiculo([path]).catch(() => {});
  }

  const anioNum = Number(anio);
  const anioOk = !anio || (anio.length === 4 && anioNum >= 1970 && anioNum <= ANIO_ACTUAL + 1);
  const patenteOk = patenteValida(patente);
  const valido = !!tipo && marca.trim().length >= 2 && modelo.trim().length >= 1 && anioOk && patenteOk;

  async function guardar() {
    if (!tipo || !valido) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarVehiculo(driverId, {
        tipo,
        marca,
        modelo,
        anio,
        color,
        patente,
        fotos,
        foto_modelo: modeloElegido ?? 'ninguna',
      });
      borrarFotosVehiculo(borradas).catch(() => {});
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar tu vehículo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Tu vehículo</Text>
      <Text style={styles.text}>
        Los clientes lo ven en tu perfil al elegir fletero. Sin vehículo cargado no aparecés en el marketplace.
      </Text>

      <View style={styles.preview}>
        <View style={{ width: '100%' }}>
          <FotoVehiculo
            vehiculo={{ color, fotos, foto_modelo: modeloElegido ?? 'ninguna' }}
            tipo={tipo ?? 'camioneta'}
            fondo="#DDE1E5"
          />
        </View>
        <Text style={styles.previewText}>
          {[marca, modelo, anio].filter(Boolean).join(' ') || 'Así lo van a ver los clientes'}
        </Text>
        {patente ? <PatenteChip patente={formatoPatente(patente)} /> : null}
      </View>

      <Text style={styles.label}>Tipo</Text>
      <View style={styles.tipos} role="radiogroup" aria-label="Tipo de vehículo">
        {TIPOS.map((t) => (
          <Pressable
            key={t}
            role="radio"
            aria-checked={tipo === t}
            onPress={() => setTipo(t)}
            style={[styles.tipo, tipo === t && styles.tipoOn]}>
            <Text style={[styles.tipoText, tipo === t && styles.tipoTextOn]}>{VEHICULO_LABEL[t].titulo}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.fila}>
        <Campo label="Marca" value={marca} onChange={cambiarMarca} placeholder="Renault" flex={1} />
        <Campo label="Modelo" value={modelo} onChange={cambiarModelo} placeholder="Kangoo" flex={1} />
      </View>
      <View style={styles.fila}>
        <Campo
          label="Año"
          value={anio}
          onChange={(v) => setAnio(v.replace(/\D/g, '').slice(0, 4))}
          placeholder="2019"
          flex={1}
          numerico
          error={!anioOk ? 'Año inválido' : null}
        />
        <Campo
          label="Patente"
          value={patente}
          onChange={(v) => setPatente(formatoPatente(v))}
          placeholder="AE 123 FT"
          flex={1.3}
          error={patente && !patenteOk ? 'Ej.: AE 123 FT o ABC 123' : null}
        />
      </View>

      <Text style={styles.label}>Color</Text>
      <View style={styles.colores} role="radiogroup" aria-label="Color del vehículo">
        {(Object.keys(COLORES) as ColorVehiculo[]).map((c) => (
          <Pressable
            key={c}
            role="radio"
            aria-checked={color === c}
            accessibilityLabel={COLORES[c].label}
            onPress={() => setColor(c)}
            style={[styles.color, { backgroundColor: COLORES[c].hex }, color === c && styles.colorOn]}
          />
        ))}
      </View>
      <Text style={styles.colorNombre}>{COLORES[color].label}</Text>

      <View style={styles.seccion}>
        <Text style={styles.subtitulo}>
          Fotos de tu vehículo{' '}
          <Text style={styles.label}>
            {fotos.length}/{MAX_FOTOS}
          </Text>
        </Text>
        <Text style={styles.text}>
          Los clientes confían más con fotos reales. Sacalas de costado, con el vehículo entero y sin que se lea la
          patente.
        </Text>
        <View style={styles.fotos}>
          {fotos.map((path, i) => (
            <View key={path} style={styles.foto}>
              <Image
                source={{ uri: urlFotoVehiculo(path) }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                accessibilityLabel={`Foto ${i + 1} de tu vehículo`}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar foto ${i + 1}`}
                onPress={() => quitarFoto(path)}
                hitSlop={8}
                style={styles.quitar}>
                <X size={14} color={colors.white} strokeWidth={3} />
              </Pressable>
            </View>
          ))}
          {fotos.length < MAX_FOTOS ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Agregar fotos de tu vehículo"
              onPress={agregarFotos}
              disabled={subiendo}
              style={styles.agregar}>
              {subiendo ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <>
                  <Camera size={22} color={d.text} strokeWidth={2} />
                  <Text style={styles.agregarText}>Agregar</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>

      {!fotos.length && marca.trim() && modelo.trim() ? (
        <View style={styles.seccion}>
          <Text style={styles.subtitulo}>Foto de referencia de tu modelo</Text>
          <Text style={styles.text}>
            Mientras no subas fotos, los clientes ven una foto real del mismo modelo (aclarando que no es tu vehículo).
            Elegí la que más se parezca.
          </Text>
          {candidatos.buscando ? (
            <View style={styles.fila}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.text}>Buscando fotos del {modelo.trim()}…</Text>
            </View>
          ) : !opciones.length ? (
            <Text style={styles.text}>No encontramos fotos de este modelo: se va a ver el dibujo.</Text>
          ) : (
            <>
              <View style={styles.fotos} role="radiogroup" aria-label="Foto de referencia">
                {opciones.map((f, i) => {
                  const on = modeloElegido !== 'ninguna' && modeloElegido?.url === f.url;
                  return (
                    <Pressable
                      key={f.url}
                      role="radio"
                      aria-checked={on}
                      accessibilityLabel={`Foto de referencia ${i + 1}`}
                      onPress={() => setFotoModelo(f)}
                      style={[styles.foto, on && styles.fotoOn]}>
                      <Image source={{ uri: f.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      {on ? (
                        <View style={styles.elegida}>
                          <Check size={12} color={colors.ink} strokeWidth={3} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
                <Pressable
                  role="radio"
                  aria-checked={modeloElegido === 'ninguna'}
                  onPress={() => setFotoModelo('ninguna')}
                  style={[styles.foto, styles.ninguna, modeloElegido === 'ninguna' && styles.fotoOn]}>
                  <Text style={styles.agregarText}>Ninguna se parece</Text>
                </Pressable>
              </View>
              {modeloElegido && modeloElegido !== 'ninguna' ? <CreditoFoto foto={modeloElegido} oscuro /> : null}
            </>
          )}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Guardar vehículo" disabled={!valido} loading={guardando} onPress={guardar} />
    </View>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  flex,
  numerico,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  flex: number;
  numerico?: boolean;
  error?: string | null;
}) {
  return (
    <View style={{ flex, gap: 6, minWidth: 0 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#5B6470"
        accessibilityLabel={label}
        keyboardType={numerico ? 'number-pad' : 'default'}
        autoCapitalize={label === 'Patente' ? 'characters' : 'words'}
        style={[styles.input, !!error && { borderColor: '#FF8A80' }]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 18, borderRadius: 26, backgroundColor: d.surface, borderWidth: 1, borderColor: d.line },
  title: { fontFamily: fonts.display, fontSize: 22, color: d.text },
  text: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: d.muted },
  preview: { alignItems: 'center', gap: 8, padding: 12, borderRadius: 20, backgroundColor: '#E9ECEF' },
  previewText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: d.muted },
  tipos: { flexDirection: 'row', gap: 8 },
  tipo: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: d.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tipoOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tipoText: { fontFamily: fonts.semibold, fontSize: 13, color: d.text, textAlign: 'center' },
  tipoTextOn: { color: colors.ink, fontFamily: fonts.bold },
  fila: { flexDirection: 'row', gap: 10 },
  input: {
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: d.chip,
    borderWidth: 1,
    borderColor: d.line,
    paddingHorizontal: 14,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: d.text,
  },
  colores: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  color: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: d.line },
  colorOn: { borderWidth: 3, borderColor: colors.accent, transform: [{ scale: 1.1 }] },
  colorNombre: { fontFamily: fonts.medium, fontSize: 13, color: d.text },
  error: { fontFamily: fonts.medium, fontSize: 12, color: '#FF8A80' },
  seccion: { gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: d.line },
  subtitulo: { fontFamily: fonts.bold, fontSize: 16, color: d.text },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  foto: {
    width: 104,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: d.chip,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fotoOn: { borderColor: colors.accent },
  quitar: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(18,22,28,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agregar: {
    width: 104,
    height: 68,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: d.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  agregarText: { fontFamily: fonts.semibold, fontSize: 12, color: d.text, textAlign: 'center' },
  ninguna: { alignItems: 'center', justifyContent: 'center', padding: 6, borderColor: d.line, borderWidth: 1 },
  elegida: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
