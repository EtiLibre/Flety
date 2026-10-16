import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { guardarVehiculo } from '@/lib/chofer';
import { VEHICULO_LABEL, type Vehiculo } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

const d = colors.dark;
const TIPOS: Vehiculo[] = ['utilitario', 'camioneta', 'camion'];

// El vehículo con el que el chofer aparece en el marketplace (tipo + patente).
export function MiVehiculo({
  driverId,
  inicial,
  onGuardado,
}: {
  driverId: string;
  inicial: { tipo?: Vehiculo; patente?: string } | null;
  onGuardado: () => void;
}) {
  const [tipo, setTipo] = useState<Vehiculo | null>(inicial?.tipo ?? null);
  const [patente, setPatente] = useState(inicial?.patente ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (!tipo) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarVehiculo(driverId, { tipo, patente });
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
        Los clientes lo ven al elegir fletero. Sin vehículo cargado no aparecés en el marketplace.
      </Text>
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
      <TextInput
        value={patente}
        onChangeText={(v) => setPatente(v.toUpperCase().slice(0, 10))}
        placeholder="Patente (opcional)"
        placeholderTextColor="#5B6470"
        autoCapitalize="characters"
        accessibilityLabel="Patente"
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Guardar vehículo" disabled={!tipo} loading={guardando} onPress={guardar} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 18, borderRadius: 26, backgroundColor: d.surface, borderWidth: 1, borderColor: d.line },
  title: { fontFamily: fonts.display, fontSize: 22, color: d.text },
  text: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: d.muted },
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
  input: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: d.chip,
    borderWidth: 1,
    borderColor: d.line,
    paddingHorizontal: 16,
    fontFamily: fonts.semibold,
    fontSize: 16,
    letterSpacing: 1,
    color: d.text,
  },
  error: { fontFamily: fonts.medium, fontSize: 14, color: '#FF8A80' },
});
