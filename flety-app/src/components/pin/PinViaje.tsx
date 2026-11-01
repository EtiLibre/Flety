import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { Degrade, SOMBRAS } from '@/plataforma/estilo';
import { colors, fonts, radius } from '@/theme';

// PIN del viaje (migración 0025): lo ve solo el cliente; el chofer o gruista
// se lo pide al llegar y lo escribe para empezar la carga o el traslado.

export function usePinViaje(tipo: 'pedido' | 'grua', id: string | null, activo: boolean) {
  const [res, setRes] = useState<{ id: string; pin: string | null } | null>(null);
  useEffect(() => {
    if (!id || !activo) return;
    let cancelled = false;
    const consulta =
      tipo === 'pedido'
        ? supabase.from('pines_viaje').select('pin').eq('order_id', id).maybeSingle()
        : supabase.schema('gruas').from('pines').select('pin').eq('solicitud_id', id).maybeSingle();
    consulta.then(({ data }) => !cancelled && setRes({ id, pin: (data as { pin: string } | null)?.pin ?? null }));
    return () => {
      cancelled = true;
    };
  }, [tipo, id, activo]);
  return activo && res?.id === id ? res.pin : null;
}

// Tarjeta del cliente con los 4 dígitos.
export function TarjetaPin({ pin, quien, grua }: { pin: string; quien: string; grua?: boolean }) {
  return (
    <View style={styles.tarjeta} accessibilityLabel={`PIN de este viaje: ${pin.split('').join(' ')}`}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={styles.titulo}>PIN de este viaje</Text>
        <Text style={styles.texto}>Decíselo a {quien} cuando llegue, así empieza.</Text>
      </View>
      <View style={styles.digitos}>
        {pin.split('').map((d, i) => (
          <Degrade
            key={i}
            nombre={grua ? 'fuego' : 'sol'}
            style={[styles.digito, { boxShadow: grua ? SOMBRAS.fuego : SOMBRAS.sol }]}>
            <Text style={[styles.digitoTexto, grua && { color: colors.white }]}>{d}</Text>
          </Degrade>
        ))}
      </View>
    </View>
  );
}

// Teclado del chofer/gruista para escribir el PIN que le dice el cliente.
export function IngresoPin({
  visible,
  titulo,
  grua,
  onCancelar,
  onConfirmar,
}: {
  visible: boolean;
  titulo: string;
  grua?: boolean;
  onCancelar: () => void;
  onConfirmar: (pin: string) => Promise<void>;
}) {
  const [pin, setPin] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      await onConfirmar(pin);
      setPin('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos verificar el PIN.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancelar}>
      <View style={styles.fondo}>
        <View style={styles.hoja}>
          <View style={styles.icono}>
            <ShieldCheck size={26} color={grua ? '#FF8A3D' : '#FFD452'} strokeWidth={2.2} />
          </View>
          <Text style={styles.hojaTitulo}>{titulo}</Text>
          <Text style={styles.hojaTexto}>Pedile al cliente los 4 números que ve en su app.</Text>
          <TextInput
            value={pin}
            onChangeText={(v) => {
              setPin(v.replace(/\D/g, '').slice(0, 4));
              setError(null);
            }}
            keyboardType="number-pad"
            maxLength={4}
            autoFocus
            placeholder="• • • •"
            placeholderTextColor={colors.dark.muted}
            accessibilityLabel="PIN del viaje"
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title="Empezar"
            variant={grua ? 'grua' : 'accent'}
            loading={enviando}
            disabled={pin.length !== 4}
            onPress={confirmar}
          />
          <Pressable accessibilityRole="button" onPress={onCancelar} style={styles.cancelar}>
            {enviando ? (
              <ActivityIndicator color={colors.dark.muted} />
            ) : (
              <Text style={styles.cancelarTexto}>Volver</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    boxShadow: '0px 1px 2px rgba(18,22,28,0.05), 0px 14px 30px -18px rgba(18,22,28,0.3)',
  },
  titulo: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  texto: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  digitos: { flexDirection: 'row', gap: 6 },
  digito: { width: 42, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  digitoTexto: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  hoja: {
    gap: 12,
    padding: 22,
    paddingBottom: 30,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: '#1A1F26',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  icono: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  hojaTitulo: { fontFamily: fonts.display, fontSize: 24, color: colors.dark.text },
  hojaTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.dark.muted },
  input: {
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 32,
    letterSpacing: 16,
    color: colors.dark.text,
  },
  error: { fontFamily: fonts.medium, fontSize: 13, color: '#FF8A80' },
  cancelar: { alignItems: 'center', paddingVertical: 10 },
  cancelarTexto: { fontFamily: fonts.semibold, fontSize: 15, color: colors.dark.muted },
});
