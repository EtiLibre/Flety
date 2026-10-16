import { Link, router, useLocalSearchParams } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormScreen } from '@/components/FormScreen';
import { TextField } from '@/components/TextField';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme';

export default function Registro() {
  // ?next=/cliente/opciones (pedido empezado sin cuenta) o /unirse ("Quiero ser fletero").
  const { next } = useLocalSearchParams<{ next?: string }>();
  const fletero = next === '/unirse';
  const conNext = next ? { next } : undefined;
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleRegistro() {
    setError(null);
    if (!nombre.trim() || !email.trim() || !password) {
      setError('Completá todos los campos.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña tiene que tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // El trigger handle_new_user copia este nombre a public.users (migración 0006).
      options: { data: { nombre: nombre.trim() } },
    });
    setLoading(false);

    if (signUpError) {
      setError(authErrorMessage(signUpError.message));
      return;
    }
    // Si Supabase pide confirmar el email, no hay sesión todavía.
    if (!data.session) setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <FormScreen
        title="Revisá tu email"
        footer={<Button title="Ir a iniciar sesión" variant="dark" onPress={() => router.replace({ pathname: '/login', params: conNext })} />}>
        <View style={styles.sentCard}>
          <MailCheck size={32} color={colors.ink} strokeWidth={1.8} />
          <Text style={styles.sentText}>
            Te mandamos un link de confirmación a <Text style={styles.bold}>{sentTo}</Text>. Confirmá tu cuenta y
            después iniciá sesión.
          </Text>
        </View>
      </FormScreen>
    );
  }

  return (
    <FormScreen
      title={fletero ? 'Sumate como fletero' : 'Crear cuenta'}
      subtitle={
        fletero
          ? 'Creá tu cuenta y después escribí el código que te dio tu empresa.'
          : next
            ? 'Tu pedido queda guardado: creá tu cuenta y te mostramos vehículos y precios.'
            : 'En un minuto estás pidiendo tu primer flete.'
      }
      footer={<Button title="Crear cuenta" onPress={handleRegistro} loading={loading} />}>
      <TextField
        label="Nombre"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Cómo te llamás"
        autoComplete="name"
        textContentType="name"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="Mínimo 6 caracteres"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={handleRegistro}
      />
      {error ? (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <Text style={styles.footnote}>
        ¿Ya tenés cuenta?{' '}
        <Link href={{ pathname: '/login', params: conNext }} style={styles.link}>
          Iniciar sesión
        </Link>
      </Text>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 14, padding: 14 },
  errorText: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
  footnote: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, textAlign: 'center' },
  link: { fontFamily: fonts.semibold, color: colors.ink, textDecorationLine: 'underline' },
  sentCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 12 },
  sentText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.ink },
  bold: { fontFamily: fonts.bold },
});
