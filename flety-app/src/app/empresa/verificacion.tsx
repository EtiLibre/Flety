import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { BotonChico, Card } from '@/components/empresa/ui';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useAuth } from '@/lib/auth';
import { configVerificacion, formatoWhatsapp, guardarConfigVerificacion } from '@/lib/telefono';
import { colors, fonts, radius } from '@/theme';

const WEBHOOK = `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''}/functions/v1/whatsapp-webhook`;

// Superadmin: verificación del teléfono por WhatsApp (migración 0027 + Edge
// Function whatsapp-webhook). Primero se carga el número de Flety y después
// se activa la exigencia.
export default function Verificacion() {
  const { role } = useAuth();
  const [cfg, setCfg] = useState<{ exigir: boolean; whatsapp: string | null } | null>(null);
  const [numero, setNumero] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (role !== 'superadmin') return;
    let cancelled = false;
    configVerificacion().then((c) => {
      if (cancelled) return;
      setCfg(c);
      setNumero(c.whatsapp ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [role]);

  if (role && role !== 'superadmin') return <Redirect href="/empresa/panel" />;

  const limpio = numero.replace(/\D/g, '');

  async function guardarNumero() {
    if (!cfg) return;
    setGuardando(true);
    setAviso(null);
    try {
      await guardarConfigVerificacion('whatsapp_flety', limpio);
      setCfg({ ...cfg, whatsapp: limpio });
      setAviso('Número guardado.');
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarExigir(v: boolean) {
    if (!cfg) return;
    setCfg({ ...cfg, exigir: v });
    setAviso(null);
    try {
      await guardarConfigVerificacion('verificar_telefono', v);
    } catch (e) {
      setCfg({ ...cfg, exigir: !v });
      setAviso(e instanceof Error ? e.message : 'No se pudo cambiar.');
    }
  }

  return (
    <EmpresaShell
      active="verificacion"
      empresa={null}
      title="Verificación de teléfono"
      subtitle="El usuario manda un código por WhatsApp al número de Flety y queda verificado su teléfono.">
      <View style={{ maxWidth: 900, width: '100%', gap: 16 }}>
        {!cfg ? (
          <ActivityIndicator color={colors.ink} style={{ marginTop: 20 }} />
        ) : (
          <>
            <Card title="Número de WhatsApp de Flety">
              <Text style={styles.texto}>
                Con código de país y sin espacios, como lo muestra Meta. Ejemplo de Mendoza: 5492615551234.
              </Text>
              <View style={styles.fila}>
                <TextInput
                  value={numero}
                  onChangeText={setNumero}
                  placeholder="5492615551234"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  accessibilityLabel="Número de WhatsApp de Flety"
                  style={styles.input}
                />
                <BotonChico
                  title="Guardar"
                  onPress={guardarNumero}
                  loading={guardando}
                  disabled={limpio.length < 10 || limpio === cfg.whatsapp}
                />
              </View>
              {cfg.whatsapp ? <Text style={styles.texto}>Actual: {formatoWhatsapp(cfg.whatsapp)}</Text> : null}
            </Card>

            <Card>
              <View style={styles.fila}>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={styles.titulo}>Exigir teléfono verificado</Text>
                  <Text style={styles.texto}>
                    Los clientes lo verifican al pedir su primer servicio; los choferes y gruistas, al ponerse
                    disponibles. Activalo recién cuando el webhook esté funcionando (probalo con tu cuenta).
                  </Text>
                </View>
                <Switch
                  value={cfg.exigir}
                  onValueChange={cambiarExigir}
                  disabled={!cfg.whatsapp}
                  accessibilityLabel="Exigir teléfono verificado"
                />
              </View>
              {!cfg.whatsapp ? <Text style={styles.texto}>Primero cargá el número de WhatsApp.</Text> : null}
            </Card>
            {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}

            <Card title="Cómo conectarlo (una sola vez)">
              <Text style={styles.texto}>
                1. En developers.facebook.com creá una app tipo “Empresa” y agregale el producto WhatsApp.{'\n'}
                2. Registrá el número de Flety (un chip que no esté usado en la app común de WhatsApp) y copiá el
                “Identificador del número de teléfono”.{'\n'}
                3. En Supabase → Edge Functions, publicá la función whatsapp-webhook con “Verify JWT” apagado y cargá
                los secretos WHATSAPP_VERIFY_TOKEN (un texto que inventes), WHATSAPP_APP_SECRET (Configuración de la app
                → Básica → Clave secreta), FLETY_SECRET_KEY (tu clave sb_secret_…) y, para contestar “¡Listo!”,
                WHATSAPP_TOKEN y WHATSAPP_PHONE_ID.{'\n'}
                4. En Meta → WhatsApp → Configuración → Webhook, pegá esta URL y el mismo token del paso 3, y suscribite
                al campo “messages”:
              </Text>
              <Text style={styles.url} selectable>
                {WEBHOOK}
              </Text>
              <Text style={styles.texto}>
                5. Cargá el número arriba, probá “Verificar” desde tu cuenta de cliente y, si anda, activá la exigencia.
              </Text>
            </Card>
          </>
        )}
      </View>
    </EmpresaShell>
  );
}

const styles = StyleSheet.create({
  titulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  texto: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.muted },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  input: {
    flex: 1,
    minWidth: 200,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
  },
  url: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F2F4F6',
  },
  aviso: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
});
