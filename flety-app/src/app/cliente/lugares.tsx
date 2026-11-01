import { router } from 'expo-router';
import { Briefcase, ChevronLeft, House, Star, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PantallaTab } from '@/components/nav/PantallaTab';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { confirmar } from '@/lib/confirm';
import { borrarLugar, misLugares, type LugarGuardado } from '@/lib/lugares';
import { colors, fonts, radius } from '@/theme';

// Lugares guardados del cliente (Casa, Trabajo…). Son privados: solo los ve
// él. Se agregan desde cualquier campo de dirección ("Guardar lugar").
export default function MisLugares() {
  const isWide = useIsWide();
  const [version, setVersion] = useState(0);
  const [res, setRes] = useState<{ v: number; lista: LugarGuardado[] } | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    misLugares().then((lista) => !cancelled && setRes({ v: version, lista }));
    return () => {
      cancelled = true;
    };
  }, [version]);

  async function borrar(g: LugarGuardado) {
    if (!(await confirmar(`¿Borrar «${g.etiqueta}» de tus lugares?`))) return;
    setBorrando(g.id);
    setError(null);
    try {
      await borrarLugar(g.id);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos borrarlo.');
    } finally {
      setBorrando(null);
    }
  }

  const contenido = (
    <View style={{ gap: 12 }}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.volver} hitSlop={8}>
        <ChevronLeft size={18} color={colors.ink} />
        <Text style={styles.volverTexto}>Cuenta</Text>
      </Pressable>
      <Text style={styles.texto}>
        Solo los ves vos. Para agregar uno, elegí una dirección al pedir y tocá «Guardar lugar».
      </Text>
      {!res ? (
        <ActivityIndicator color={colors.ink} style={{ marginTop: 20 }} />
      ) : res.lista.length ? (
        res.lista.map((g) => {
          const Icono = /casa|hogar/i.test(g.etiqueta) ? House : /trabajo|oficina/i.test(g.etiqueta) ? Briefcase : Star;
          return (
            <View key={g.id} style={styles.fila}>
              <View style={styles.icono}>
                <Icono size={18} color={colors.ink} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.nombre}>{g.etiqueta}</Text>
                {g.direccion ? (
                  <Text style={styles.texto} numberOfLines={2}>
                    {g.direccion}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Borrar ${g.etiqueta}`}
                disabled={borrando === g.id}
                onPress={() => borrar(g)}
                hitSlop={8}
                style={styles.borrar}>
                {borrando === g.id ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <Trash2 size={18} color={colors.danger} />
                )}
              </Pressable>
            </View>
          );
        })
      ) : (
        <Text style={styles.vacio}>Todavía no guardaste lugares.</Text>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );

  if (isWide) {
    return (
      <ClienteShell
        active="cuenta"
        panel={
          <>
            <Text style={styles.titulo} accessibilityRole="header">
              Mis lugares
            </Text>
            {contenido}
          </>
        }
      />
    );
  }
  return (
    <PantallaTab titulo="Mis lugares" tema="claro">
      {contenido}
    </PantallaTab>
  );
}

const styles = StyleSheet.create({
  titulo: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6, color: colors.ink },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  volverTexto: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  texto: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    boxShadow: '0px 8px 22px -14px rgba(18,22,28,0.3)',
  },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF4D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  borrar: { padding: 6 },
  vacio: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 20 },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
});
