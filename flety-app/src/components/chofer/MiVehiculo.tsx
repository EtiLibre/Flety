import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { PatenteChip, VehiculoIlustracion } from '@/components/VehiculoIlustracion';
import { guardarVehiculo } from '@/lib/chofer';
import { VEHICULO_LABEL, type Vehiculo } from '@/lib/types';
import { COLORES, formatoPatente, patenteValida, type ColorVehiculo, type DatosVehiculo } from '@/lib/vehiculos';
import { colors, fonts, radius } from '@/theme';

const d = colors.dark;
const TIPOS: Vehiculo[] = ['utilitario', 'camioneta', 'camion'];
const ANIO_ACTUAL = new Date().getFullYear();

// El vehículo con el que el chofer aparece en el marketplace. Con el tipo y el
// color, la plataforma dibuja el vehículo (vista previa en vivo).
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
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anioNum = Number(anio);
  const anioOk = !anio || (anio.length === 4 && anioNum >= 1970 && anioNum <= ANIO_ACTUAL + 1);
  const patenteOk = patenteValida(patente);
  const valido = !!tipo && marca.trim().length >= 2 && modelo.trim().length >= 1 && anioOk && patenteOk;

  async function guardar() {
    if (!tipo || !valido) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarVehiculo(driverId, { tipo, marca, modelo, anio, color, patente });
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
        <VehiculoIlustracion tipo={tipo ?? 'camioneta'} color={color} ancho={240} />
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
        <Campo label="Marca" value={marca} onChange={setMarca} placeholder="Renault" flex={1} />
        <Campo label="Modelo" value={modelo} onChange={setModelo} placeholder="Kangoo" flex={1} />
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
  preview: { alignItems: 'center', gap: 8, padding: 14, borderRadius: 20, backgroundColor: '#E9ECEF' },
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
});
