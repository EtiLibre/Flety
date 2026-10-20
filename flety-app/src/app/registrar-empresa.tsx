import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormScreen } from '@/components/FormScreen';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/lib/auth';
import { registrarEmpresa } from '@/lib/empresa';
import { colors, fonts } from '@/theme';

// Alta de empresa: una cuenta nueva carga nombre y CUIT; la empresa queda
// "esperando aprobación" hasta que el equipo de Flety la verifica (sección 10.3).
export default function RegistrarEmpresa() {
  const { session, role, initializing, recargarPerfil } = useAuth();
  const [nombre, setNombre] = useState('');
  const [cuit, setCuit] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!initializing && !session) {
    return <Redirect href={{ pathname: '/registro', params: { next: '/registrar-empresa' } }} />;
  }
  if (role === 'empresa') return <Redirect href="/empresa/panel" />;

  async function registrar() {
    setEnviando(true);
    setError(null);
    try {
      await registrarEmpresa(nombre, cuit);
      recargarPerfil();
      router.replace('/empresa/panel');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos registrar la empresa.');
      setEnviando(false);
    }
  }

  const cuitDigitos = cuit.replace(/\D/g, '');
  return (
    <FormScreen
      title="Registrá tu empresa"
      subtitle="Revisamos cada empresa antes de que reciba pedidos: CUIT, documentación y seguro de carga."
      footer={
        <Button
          title="Enviar para aprobación"
          onPress={registrar}
          loading={enviando}
          disabled={nombre.trim().length < 2 || cuitDigitos.length !== 11}
        />
      }>
      <TextField
        label="Nombre de la empresa"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Ej.: Fletes Cuyo"
        autoCapitalize="words"
      />
      <TextField
        label="CUIT"
        value={cuit}
        onChangeText={(v) => setCuit(v.replace(/[^0-9-]/g, '').slice(0, 13))}
        placeholder="30-12345678-9"
        keyboardType="number-pad"
      />
      {error ? (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <View style={styles.pasos}>
        {[
          'Te contactamos para pedirte la documentación y el seguro de carga.',
          'Cuando te aprobamos, ves la cola de pedidos de tu zona.',
          'Desde tu panel invitás a tus choferes con un código.',
        ].map((t, i) => (
          <Text key={t} style={styles.paso}>
            <Text style={styles.pasoNum}>{i + 1}. </Text>
            {t}
          </Text>
        ))}
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 14, padding: 14 },
  errorText: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
  pasos: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: colors.surface },
  paso: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  pasoNum: { fontFamily: fonts.bold, color: colors.ink },
});
