import { Minus, Package, Plus, Route, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { cuandoProgramadoInicial, draftListoParaCotizar, usePedidoDraft } from '@/lib/pedido-draft';
import { TAMANO_LABEL, TIPO_LABEL, type Tamano, type TipoServicio } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

import { AddressField } from './AddressField';
import { Choice, Segmented } from './Choice';
import { FechaHoraPicker } from './FechaHoraPicker';
import { PhotoPicker } from './PhotoPicker';

const TIPOS: { tipo: TipoServicio; Icon: typeof Truck }[] = [
  { tipo: 'flete', Icon: Truck },
  { tipo: 'mudanza', Icon: Package },
  { tipo: 'larga_distancia', Icon: Route },
];

const TAMANOS: Tamano[] = ['chico', 'mediano', 'grande'];
const MAX_AYUDANTES = 4;

// Formulario de "¿Qué movemos hoy?" (mismo componente en desktop y celular).
export function PedidoForm({ onContinue }: { onContinue: () => void }) {
  const { draft, update } = usePedidoDraft();
  const [error, setError] = useState<string | null>(null);

  function continuar() {
    const problema = draftListoParaCotizar(draft);
    setError(problema);
    if (!problema) onContinue();
  }

  return (
    <View style={styles.form}>
      <View style={styles.tipos}>
        {TIPOS.map(({ tipo, Icon }) => {
          const active = draft.tipo === tipo;
          return (
            <Pressable
              key={tipo}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => update({ tipo })}
              style={[styles.tipo, { backgroundColor: active ? colors.accent : colors.surface }]}>
              <Icon size={24} color={colors.ink} strokeWidth={2} />
              <Text style={styles.tipoText}>{TIPO_LABEL[tipo]}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.route}>
        <View style={styles.routeRail}>
          <View style={styles.dotOrigen} />
          <View style={styles.railLine} />
          <View style={styles.dotDestino} />
        </View>
        <View style={styles.routeFields}>
          <AddressField
            label="Retiro"
            placeholder="¿Dónde retiramos?"
            value={draft.origen}
            onChange={(origen) => update({ origen })}
            allowCurrentLocation
          />
          <View style={styles.divider} />
          <AddressField
            label="Entrega"
            placeholder="¿A dónde va?"
            value={draft.destino}
            onChange={(destino) => update({ destino })}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>¿Qué vas a mover?</Text>
        <View style={styles.row}>
          {TAMANOS.map((tamano) => (
            <Choice
              key={tamano}
              title={TAMANO_LABEL[tamano].titulo}
              detail={TAMANO_LABEL[tamano].detalle}
              selected={draft.tamano === tamano}
              onPress={() => update({ tamano })}
            />
          ))}
        </View>
      </View>

      <View style={styles.ayudantes}>
        <View>
          <Text style={styles.sectionTitle}>Ayudantes</Text>
          <Text style={styles.muted}>Para cargar y descargar</Text>
        </View>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quitar ayudante"
            disabled={draft.ayudantes === 0}
            onPress={() => update({ ayudantes: draft.ayudantes - 1 })}
            style={[styles.stepButton, styles.stepButtonLight, draft.ayudantes === 0 && { opacity: 0.4 }]}>
            <Minus size={18} color={colors.ink} strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.stepValue} accessibilityLiveRegion="polite">
            {draft.ayudantes}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sumar ayudante"
            disabled={draft.ayudantes === MAX_AYUDANTES}
            onPress={() => update({ ayudantes: draft.ayudantes + 1 })}
            style={[styles.stepButton, styles.stepButtonDark, draft.ayudantes === MAX_AYUDANTES && { opacity: 0.4 }]}>
            <Plus size={18} color={colors.white} strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>¿Cuándo?</Text>
        <Segmented
          options={[
            { value: 'ahora', label: 'Ahora' },
            { value: 'programado', label: 'Programar' },
          ]}
          value={draft.cuando.modo}
          onChange={(modo) => update({ cuando: modo === 'ahora' ? { modo: 'ahora' } : cuandoProgramadoInicial() })}
        />
        {draft.cuando.modo === 'programado' ? (
          <FechaHoraPicker
            value={draft.cuando}
            onChange={({ fecha, hora }) => update({ cuando: { modo: 'programado', fecha, hora } })}
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle} nativeID="nota-label">
          Nota para la empresa <Text style={styles.muted}>(opcional)</Text>
        </Text>
        <TextInput
          value={draft.nota}
          onChangeText={(nota) => update({ nota })}
          placeholder="Ej.: es un tercer piso por escalera, hay que desarmar la cama…"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={500}
          accessibilityLabelledBy="nota-label"
          accessibilityLabel="Nota para la empresa"
          style={styles.nota}
        />
      </View>

      <PhotoPicker fotos={draft.fotos} onChange={(fotos) => update({ fotos })} />

      {error ? (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Button title="Ver vehículos y precios" onPress={continuar} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 22 },
  tipos: { flexDirection: 'row', gap: 8 },
  tipo: { flex: 1, borderRadius: radius.lg, padding: 12, gap: 10 },
  tipoText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  route: { flexDirection: 'row', gap: 14, paddingHorizontal: 16, paddingVertical: 4, borderRadius: radius.xl, backgroundColor: colors.surface },
  routeRail: { width: 12, alignItems: 'center', paddingTop: 34, paddingBottom: 30 },
  dotOrigen: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: colors.ink, backgroundColor: colors.white },
  railLine: { flex: 1, width: 0, borderLeftWidth: 2, borderStyle: 'dotted', borderColor: '#8B95A1', marginVertical: 6 },
  dotDestino: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.ink },
  routeFields: { flex: 1, minWidth: 0 },
  divider: { height: 1, backgroundColor: colors.line },
  section: { gap: 10 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', gap: 8 },
  ayudantes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stepButtonLight: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  stepButtonDark: { backgroundColor: colors.ink },
  stepValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, minWidth: 16, textAlign: 'center' },
  nota: {
    minHeight: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: 14,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 14, padding: 14 },
  errorText: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
});
