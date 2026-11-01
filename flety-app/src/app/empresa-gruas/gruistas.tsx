import * as Clipboard from 'expo-clipboard';
import { Copy } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, BotonChico, Card, Vacio } from '@/components/empresa/ui';
import { PaginaPanelGruas } from '@/components/gruas-empresa/Pagina';
import { iniciales } from '@/lib/empresa';
import { crearInvitacion } from '@/modulos/gruas/api';
import type { GruistaFlota } from '@/modulos/gruas/panelEmpresa';
import { G } from '@/modulos/gruas/ui';
import { colors, fonts, radius } from '@/theme';

const fecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });

const ESTADO: Record<GruistaFlota['estado'], { label: string; tone: 'success' | 'warn' | 'neutral' | 'danger' }> = {
  aprobado: { label: 'Aprobado', tone: 'success' },
  pendiente: { label: 'En revisión', tone: 'warn' },
  rechazado: { label: 'Rechazado', tone: 'danger' },
  suspendido: { label: 'Suspendido', tone: 'neutral' },
};

// Gruistas de la empresa y códigos para sumar nuevos (cada uno se registra en
// Flety y escribe el código en su app).
export default function GruistasEmpresa() {
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <PaginaPanelGruas active="gruistas" title="Gruistas" subtitle="Tu flota y los códigos para sumar gruistas.">
      {({ demo, datos, cargando, recargar }) => {
        if (cargando || !datos) return <ActivityIndicator color={G.acento} style={{ marginTop: 20 }} />;

        async function crear() {
          setCreando(true);
          setError(null);
          try {
            const code = await crearInvitacion();
            setNuevo(code);
            recargar();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'No pudimos crear el código.');
          } finally {
            setCreando(false);
          }
        }

        return (
          <View style={{ gap: 20 }}>
            <Card title={`Tu flota · ${datos.gruistas.length}`}>
              {datos.gruistas.length ? (
                <View style={{ gap: 8 }}>
                  {datos.gruistas.map((g) => (
                    <View key={g.id} style={styles.fila}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarTexto}>{iniciales(g.nombre ?? 'G')}</Text>
                        {g.estado === 'aprobado' ? (
                          <View style={[styles.punto, { backgroundColor: g.disponible ? '#22C55E' : '#B5BCC5' }]} />
                        ) : null}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.nombre} numberOfLines={1}>
                          {g.nombre ?? 'Gruista'}
                        </Text>
                        <Text style={styles.texto}>
                          {g.estado === 'aprobado' ? (g.disponible ? 'Disponible' : 'No disponible') : 'Sin habilitar'}
                          {g.telefono ? ` · ${g.telefono}` : ''}
                        </Text>
                      </View>
                      <Badge label={ESTADO[g.estado].label} tone={ESTADO[g.estado].tone} />
                    </View>
                  ))}
                </View>
              ) : (
                <Vacio texto="Todavía no sumaste gruistas." />
              )}
            </Card>

            <Card
              title="Sumar un gruista"
              right={<BotonChico title="Crear código" onPress={crear} loading={creando} disabled={demo} />}>
              <Text style={styles.texto}>
                Pasale el código: se registra en Flety, elige «Tengo grúa» y lo escribe. Después carga su licencia y el
                seguro, y Flety lo habilita.
              </Text>
              {nuevo ? <Codigo code={nuevo} destacado /> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {datos.codigos.map((c) => (
                <View key={c.code} style={styles.codigoFila}>
                  <Codigo code={c.code} />
                  <Text style={styles.texto}>
                    {c.used_at
                      ? `Usado el ${fecha.format(new Date(c.used_at))}`
                      : new Date(c.expires_at) < new Date()
                        ? 'Vencido'
                        : `Vence el ${fecha.format(new Date(c.expires_at))}`}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        );
      }}
    </PaginaPanelGruas>
  );
}

function Codigo({ code, destacado }: { code: string; destacado?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Copiar código ${code}`}
      onPress={async () => {
        await Clipboard.setStringAsync(code);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      }}
      style={[styles.codigo, destacado && styles.codigoNuevo]}>
      <Text style={[styles.codigoTexto, destacado && { fontSize: 22 }]}>{code}</Text>
      <Copy size={14} color={G.texto} />
      <Text style={styles.copiar}>{copiado ? 'Copiado' : 'Copiar'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: G.suave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontFamily: fonts.bold, fontSize: 14, color: G.texto },
  punto: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  nombre: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  texto: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  codigoFila: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  codigo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: G.suave,
  },
  codigoNuevo: { borderWidth: 2, borderColor: G.acento },
  codigoTexto: { fontFamily: fonts.display, fontSize: 16, letterSpacing: 1.5, color: colors.ink },
  copiar: { fontFamily: fonts.bold, fontSize: 12, color: G.texto },
});
