import { CircleCheck, MessageCircle, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import {
  estadoVerificacion,
  formatoWhatsapp,
  iniciarVerificacion,
  linkWhatsapp,
  necesitaVerificarTelefono,
  type CodigoVerificacion,
} from '@/lib/telefono';
import { Degrade, SOMBRAS } from '@/plataforma/estilo';
import { colors, fonts, radius } from '@/theme';

const VERDE = ['#3EE07F', '#1FB65A'] as const;

// Hoja "Verificá tu teléfono": el usuario manda el código por WhatsApp y la
// app espera la confirmación (consulta cada 3 s).
export function VerificarTelefono({
  visible,
  onCerrar,
  onVerificado,
}: {
  visible: boolean;
  onCerrar: () => void;
  onVerificado: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <View style={styles.fondo}>
        {/* Se monta de nuevo en cada apertura: arranca siempre de cero. */}
        {visible ? <Contenido onCerrar={onCerrar} onVerificado={onVerificado} /> : null}
      </View>
    </Modal>
  );
}

type Paso =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'esperando'; c: CodigoVerificacion }
  | { tipo: 'vencido' }
  | { tipo: 'listo'; telefono: string | null };

function Contenido({ onCerrar, onVerificado }: { onCerrar: () => void; onVerificado: () => void }) {
  const [paso, setPaso] = useState<Paso>({ tipo: 'cargando' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelled = false;
    iniciarVerificacion()
      .then((c) => !cancelled && setPaso({ tipo: 'esperando', c }))
      .catch((e: Error) => !cancelled && setPaso({ tipo: 'error', mensaje: e.message }));
    return () => {
      cancelled = true;
    };
  }, [intento]);

  const esperandoId = paso.tipo === 'esperando' ? paso.c.id : null;
  useEffect(() => {
    if (!esperandoId) return;
    let cancelled = false;
    const id = setInterval(async () => {
      const e = await estadoVerificacion(esperandoId);
      if (cancelled || !e) return;
      if (e.estado === 'verificado') setPaso({ tipo: 'listo', telefono: e.telefono });
      else if (e.estado === 'vencido') setPaso({ tipo: 'vencido' });
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [esperandoId]);

  function otraVez() {
    setPaso({ tipo: 'cargando' });
    setIntento((i) => i + 1);
  }

  return (
    <View style={styles.hoja}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onCerrar} style={styles.cerrar}>
        <X size={20} color={colors.muted} />
      </Pressable>

      {paso.tipo === 'listo' ? (
        <>
          <Degrade colores={VERDE} diagonal style={[styles.icono, { boxShadow: SOMBRAS.flotante }]}>
            <CircleCheck size={28} color={colors.white} strokeWidth={2.2} />
          </Degrade>
          <Text style={styles.titulo}>¡Teléfono verificado!</Text>
          <Text style={styles.texto}>
            {paso.telefono ? `Listo: ${formatoWhatsapp(paso.telefono)} quedó asociado a tu cuenta.` : 'Listo.'}
          </Text>
          <Button title="Seguir" onPress={onVerificado} />
        </>
      ) : (
        <>
          <Degrade colores={VERDE} diagonal style={[styles.icono, { boxShadow: SOMBRAS.flotante }]}>
            <MessageCircle size={28} color={colors.white} strokeWidth={2.2} />
          </Degrade>
          <Text style={styles.titulo}>Verificá tu teléfono</Text>
          <Text style={styles.texto}>
            Mandanos este código por WhatsApp. Verificamos el número desde el que lo mandes, así el fletero o el gruista
            te pueden contactar.
          </Text>

          {paso.tipo === 'cargando' ? (
            <ActivityIndicator color={colors.ink} style={{ marginVertical: 24 }} />
          ) : paso.tipo === 'error' ? (
            <>
              <Text style={styles.error}>{paso.mensaje}</Text>
              <Button title="Probar de nuevo" variant="dark" onPress={otraVez} />
            </>
          ) : paso.tipo === 'vencido' ? (
            <>
              <Text style={styles.error}>El código venció.</Text>
              <Button title="Pedir otro código" variant="dark" onPress={otraVez} />
            </>
          ) : (
            <>
              <View style={styles.codigo} accessibilityLabel={`Código: FLETY ${paso.c.codigo.split('').join(' ')}`}>
                <Text style={styles.codigoTexto} selectable>
                  FLETY {paso.c.codigo}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => Linking.openURL(linkWhatsapp(paso.c.whatsapp, paso.c.codigo))}
                style={({ pressed }) => pressed && { opacity: 0.88 }}>
                <Degrade
                  colores={VERDE}
                  style={[styles.boton, { boxShadow: '0px 10px 22px -10px rgba(31,182,90,0.7)' }]}>
                  <MessageCircle size={20} color={colors.white} strokeWidth={2.4} />
                  <Text style={styles.botonTexto}>Mandar por WhatsApp</Text>
                </Degrade>
              </Pressable>
              <Text style={styles.chico}>
                ¿Estás en la compu? Desde tu celular, mandá <Text style={styles.negrita}>FLETY {paso.c.codigo}</Text>{' '}
                por WhatsApp al <Text style={styles.negrita}>{formatoWhatsapp(paso.c.whatsapp)}</Text>.
              </Text>
              <View style={styles.esperando} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={colors.muted} />
                <Text style={styles.chico}>Esperando tu mensaje…</Text>
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

// Antes de pedir o de ponerse disponible: si Flety exige teléfono verificado y
// todavía no lo está, abre la hoja y sigue con la acción cuando se verifica.
export function useVerificarTelefono() {
  const [pendiente, setPendiente] = useState<null | (() => void)>(null);

  async function antesDe(accion: () => void) {
    let falta = false;
    try {
      falta = await necesitaVerificarTelefono();
    } catch {
      // Si no se pudo consultar, decide el servidor (avisa con un error).
    }
    if (falta) setPendiente(() => accion);
    else accion();
  }

  const modal = (
    <VerificarTelefono
      visible={!!pendiente}
      onCerrar={() => setPendiente(null)}
      onVerificado={() => {
        const accion = pendiente;
        setPendiente(null);
        accion?.();
      }}
    />
  );
  return { antesDe, modal };
}

const styles = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(18,22,28,0.5)' },
  hoja: {
    gap: 14,
    padding: 22,
    paddingBottom: 30,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.white,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  cerrar: { position: 'absolute', top: 14, right: 14, padding: 8, zIndex: 1 },
  icono: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: fonts.display, fontSize: 25, letterSpacing: -0.4, color: colors.ink },
  texto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  codigo: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#F2F4F6',
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  codigoTexto: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 3, color: colors.ink },
  boton: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  botonTexto: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.white },
  chico: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted },
  negrita: { fontFamily: fonts.bold, color: colors.ink },
  esperando: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
});
