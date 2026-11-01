import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';

import { Chips, G } from './ui';

// Opciones más comunes a la vista y el resto con "Ver más". La opción "Otro"
// abre un campo para escribir cuál es.
export function OpcionesConMas({
  opciones,
  comunes,
  valor,
  onCambio,
  multiple,
  otro,
  falta,
}: {
  opciones: { id: string; nombre: string }[];
  comunes: string[];
  valor: string[] | string | null;
  onCambio: (v: string) => void;
  multiple?: boolean;
  otro: { id: string; texto: string; onTexto: (t: string) => void; placeholder: string };
  falta?: boolean;
}) {
  const [verTodo, setVerTodo] = useState(false);
  const elegidos = Array.isArray(valor) ? valor : valor ? [valor] : [];
  const otroOpcion = opciones.find((o) => o.id === otro.id);
  const resto = opciones.filter((o) => o.id !== otro.id);
  const comunesOrdenadas = comunes.flatMap((id) => resto.filter((o) => o.id === id));
  // Una opción elegida que no es común sigue a la vista aunque se cierre "Ver más".
  const visibles = verTodo
    ? resto
    : [...comunesOrdenadas, ...resto.filter((o) => !comunes.includes(o.id) && elegidos.includes(o.id))];
  const ocultas = resto.length - visibles.length;
  const conOtro = elegidos.includes(otro.id);

  return (
    <View style={{ gap: 10 }}>
      <Chips
        multiple={multiple}
        opciones={otroOpcion ? [...visibles, otroOpcion] : visibles}
        valor={valor}
        onCambio={onCambio}
      />
      {ocultas > 0 || verTodo ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: verTodo }}
          onPress={() => setVerTodo((v) => !v)}
          hitSlop={6}
          style={styles.verMas}>
          <Text style={styles.verMasTexto}>{verTodo ? 'Ver menos' : `Ver más (${ocultas})`}</Text>
          {verTodo ? <ChevronUp size={15} color={G.texto} /> : <ChevronDown size={15} color={G.texto} />}
        </Pressable>
      ) : null}
      {conOtro ? (
        <TextInput
          value={otro.texto}
          onChangeText={otro.onTexto}
          placeholder={otro.placeholder}
          placeholderTextColor={colors.muted}
          maxLength={120}
          accessibilityLabel={otro.placeholder}
          autoFocus
          style={[styles.campo, falta && !otro.texto.trim() && styles.campoFalta]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
  },
  campoFalta: { borderWidth: 1.5, borderColor: colors.danger },
  verMas: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  verMasTexto: { fontFamily: fonts.bold, fontSize: 14, color: G.texto, textDecorationLine: 'underline' },
});
