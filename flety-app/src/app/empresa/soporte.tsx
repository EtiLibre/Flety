import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card, Vacio } from '@/components/empresa/ui';
import { Segmented } from '@/components/pedido/Choice';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useAuth } from '@/lib/auth';
import { bandejaSoporte, cerrarConsulta, responderConsulta, type ConsultaAdmin } from '@/lib/ayuda';
import { colors, fonts, radius } from '@/theme';

type Filtro = 'abierta' | 'respondida' | 'cerrada';

const fecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const ROL: Record<string, string> = { cliente: 'Cliente', chofer: 'Chofer', empresa: 'Empresa' };

// Superadmin: consultas que la gente deja en Ayuda cuando el asistente no les
// resuelve el problema. La respuesta les aparece en "Mis consultas".
export default function Soporte() {
  const { role } = useAuth();
  const [version, setVersion] = useState(0);
  const [res, setRes] = useState<{ v: number; consultas: ConsultaAdmin[]; error: string | null } | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('abierta');

  useEffect(() => {
    if (role !== 'superadmin') return;
    let cancelled = false;
    bandejaSoporte()
      .then((consultas) => !cancelled && setRes({ v: version, consultas, error: null }))
      .catch((e: Error) => !cancelled && setRes({ v: version, consultas: [], error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [role, version]);

  if (role && role !== 'superadmin') return <Redirect href="/empresa/panel" />;

  const consultas = res?.consultas ?? [];
  const abiertas = consultas.filter((c) => c.estado === 'abierta').length;
  const lista = consultas.filter((c) => c.estado === filtro);

  return (
    <EmpresaShell
      active="soporte"
      empresa={null}
      title="Soporte"
      subtitle="Consultas de clientes, choferes y empresas que el asistente no resolvió."
      aviso={res?.error}>
      <View style={{ maxWidth: 820, width: '100%', gap: 16 }}>
        <Segmented
          options={[
            { value: 'abierta', label: `Sin responder${abiertas ? ` · ${abiertas}` : ''}` },
            { value: 'respondida', label: 'Respondidas' },
            { value: 'cerrada', label: 'Cerradas' },
          ]}
          value={filtro}
          onChange={setFiltro}
        />
        {!res ? (
          <ActivityIndicator color={colors.ink} style={{ marginTop: 30 }} />
        ) : lista.length ? (
          lista.map((c) => <ConsultaCard key={c.id} c={c} onCambio={() => setVersion((v) => v + 1)} />)
        ) : (
          <Card>
            <Vacio texto={filtro === 'abierta' ? 'No hay consultas sin responder.' : 'Nada por acá.'} />
          </Card>
        )}
      </View>
    </EmpresaShell>
  );
}

function ConsultaCard({ c, onCambio }: { c: ConsultaAdmin; onCambio: () => void }) {
  const [texto, setTexto] = useState(c.respuesta ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(fn: () => Promise<void>) {
    setGuardando(true);
    setError(null);
    try {
      await fn();
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card>
      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={styles.asunto}>{c.asunto}</Text>
          <Text style={styles.meta}>
            {[c.rol ? (ROL[c.rol] ?? c.rol) : null, c.usuario, fecha.format(new Date(c.created_at))]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>
      <Text style={styles.mensaje}>{c.mensaje}</Text>
      {c.estado !== 'cerrada' ? (
        <>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            multiline
            maxLength={2000}
            placeholder="Escribí la respuesta…"
            placeholderTextColor={colors.muted}
            accessibilityLabel={`Respuesta a ${c.asunto}`}
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.acciones}>
            <Button
              title={c.estado === 'respondida' ? 'Actualizar respuesta' : 'Responder'}
              variant="dark"
              disabled={texto.trim().length < 2 || texto.trim() === (c.respuesta ?? '').trim()}
              loading={guardando}
              onPress={() => ejecutar(() => responderConsulta(c.id, texto))}
              style={{ flex: 1 }}
            />
            <Pressable
              accessibilityRole="button"
              disabled={guardando}
              onPress={() => ejecutar(() => cerrarConsulta(c.id))}
              style={styles.cerrar}>
              <Text style={styles.cerrarText}>Cerrar</Text>
            </Pressable>
          </View>
        </>
      ) : c.respuesta ? (
        <View style={styles.respuesta}>
          <Text style={styles.respuestaTitulo}>Respuesta</Text>
          <Text style={styles.mensaje}>{c.respuesta}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  asunto: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  mensaje: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink },
  input: {
    minHeight: 90,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cerrar: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrarText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  respuesta: { gap: 4, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface },
  respuestaTitulo: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
});
