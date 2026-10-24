import { Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { calificar, miCalificacion, type Calificacion } from '@/lib/calificaciones';
import { colors, fonts, radius } from '@/theme';

const ETIQUETAS = ['', 'Muy mal', 'Mal', 'Bien', 'Muy bien', '¡Excelente!'];

// El cliente califica a la empresa y al chofer. Con el flete entregado (sin
// confirmar), `confirmarAntes` confirma la entrega en el mismo paso.
export function CalificarCard({
  orderId,
  quien,
  confirmarAntes,
}: {
  orderId: string;
  quien: string;
  confirmarAntes?: () => Promise<void>;
}) {
  const [hecha, setHecha] = useState<{ id: string; calif: Calificacion | null } | null>(null);
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    miCalificacion(orderId).then((calif) => !cancelled && setHecha({ id: orderId, calif }));
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!hecha || hecha.id !== orderId) return null;

  if (hecha.calif) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>¡Gracias por calificar!</Text>
        <Estrellas valor={hecha.calif.estrellas} />
        {hecha.calif.comentario ? <Text style={styles.comentario}>“{hecha.calif.comentario}”</Text> : null}
      </View>
    );
  }

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      if (confirmarAntes) await confirmarAntes();
      await calificar(orderId, estrellas, comentario);
      setHecha({ id: orderId, calif: { estrellas, comentario: comentario.trim() || null } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar tu calificación.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {confirmarAntes ? `¿Llegó todo bien? Calificá a ${quien}` : `¿Cómo te fue con ${quien}?`}
      </Text>
      <Text style={styles.muted}>
        {confirmarAntes
          ? 'Al enviar, confirmás que recibiste el servicio. Tu calificación ayuda a otros clientes a elegir.'
          : 'Tu calificación ayuda a otros clientes a elegir fletero.'}
      </Text>
      <Estrellas valor={estrellas} onChange={setEstrellas} />
      {estrellas ? <Text style={styles.etiqueta}>{ETIQUETAS[estrellas]}</Text> : null}
      {estrellas ? (
        <TextInput
          value={comentario}
          onChangeText={setComentario}
          placeholder="Contanos algo más (opcional)"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={500}
          accessibilityLabel="Comentario"
          style={styles.input}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={confirmarAntes ? 'Confirmar y calificar' : 'Enviar calificación'}
        variant="dark"
        disabled={!estrellas}
        loading={enviando}
        onPress={enviar}
      />
    </View>
  );
}

function Estrellas({ valor, onChange }: { valor: number; onChange?: (v: number) => void }) {
  return (
    <View style={styles.estrellas} role={onChange ? 'radiogroup' : undefined} aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= valor;
        const icon = (
          <Star
            size={34}
            color={on ? '#E8A400' : '#C9CED5'}
            fill={on ? colors.accent : 'transparent'}
            strokeWidth={1.8}
          />
        );
        return onChange ? (
          <Pressable
            key={n}
            role="radio"
            aria-checked={n === valor}
            accessibilityLabel={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
            onPress={() => onChange(n)}
            hitSlop={4}>
            {icon}
          </Pressable>
        ) : (
          <View key={n}>{icon}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  title: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.3, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  estrellas: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  etiqueta: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  comentario: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  input: {
    minHeight: 72,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: 12,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
});
