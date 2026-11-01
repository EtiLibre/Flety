import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BotonChico, Card, Vacio } from '@/components/empresa/ui';
import { Segmented } from '@/components/pedido/Choice';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useAuth } from '@/lib/auth';
import { lugaresSugeridos, revisarLugar, type LugarSugerido } from '@/lib/lugares';
import { colors, fonts, radius } from '@/theme';

const fecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Superadmin: lugares que sugieren los usuarios al marcar un punto en el mapa.
// Al aprobarlos pasan a la búsqueda de lugares de toda la plataforma.
export default function LugaresSugeridos() {
  const { role } = useAuth();
  const [estado, setEstado] = useState<LugarSugerido['estado']>('pendiente');
  const [version, setVersion] = useState(0);
  const [res, setRes] = useState<{ clave: string; lista: LugarSugerido[]; error: string | null } | null>(null);
  const clave = `${estado}:${version}`;

  useEffect(() => {
    if (role !== 'superadmin') return;
    let cancelled = false;
    lugaresSugeridos(estado)
      .then((lista) => !cancelled && setRes({ clave, lista, error: null }))
      .catch((e: Error) => !cancelled && setRes({ clave, lista: [], error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [role, estado, clave]);

  if (role && role !== 'superadmin') return <Redirect href="/empresa/panel" />;
  const actual = res?.clave === clave ? res : null;

  return (
    <EmpresaShell
      active="lugares"
      empresa={null}
      title="Lugares sugeridos"
      subtitle="Comercios y lugares que cargan los usuarios. Al aprobarlos aparecen en la búsqueda."
      aviso={actual?.error}>
      <View style={{ maxWidth: 900, width: '100%', gap: 16 }}>
        <Segmented
          options={[
            { value: 'pendiente', label: 'Para revisar' },
            { value: 'aprobado', label: 'Aprobados' },
            { value: 'rechazado', label: 'Rechazados' },
          ]}
          value={estado}
          onChange={setEstado}
        />
        {!actual ? (
          <Card>
            <Vacio texto="Cargando…" />
          </Card>
        ) : actual.lista.length ? (
          actual.lista.map((l) => (
            <FilaLugar key={l.id} l={l} editable={estado === 'pendiente'} onCambio={() => setVersion((v) => v + 1)} />
          ))
        ) : (
          <Card>
            <Vacio texto="No hay lugares en esta lista." />
          </Card>
        )}
      </View>
    </EmpresaShell>
  );
}

function FilaLugar({ l, editable, onCambio }: { l: LugarSugerido; editable: boolean; onCambio: () => void }) {
  const [nombre, setNombre] = useState(l.nombre);
  const [accion, setAccion] = useState<'si' | 'no' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revisar(aprobar: boolean) {
    setAccion(aprobar ? 'si' : 'no');
    setError(null);
    try {
      await revisarLugar(l.id, aprobar, nombre);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar.');
      setAccion(null);
    }
  }

  return (
    <Card>
      <View style={styles.fila}>
        <View style={{ flex: 1, minWidth: 220, gap: 6 }}>
          {editable ? (
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              accessibilityLabel="Nombre del lugar"
              maxLength={120}
              style={styles.input}
            />
          ) : (
            <Text style={styles.nombre}>{l.nombre}</Text>
          )}
          <Text style={styles.muted}>{l.direccion ?? 'Sin dirección'}</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              Linking.openURL(`https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=18/${l.lat}/${l.lng}`)
            }>
            <Text style={styles.link}>Ver el punto en el mapa · {fecha.format(new Date(l.created_at))}</Text>
          </Pressable>
        </View>
        {editable ? (
          <View style={styles.acciones}>
            <BotonChico title="Aprobar" loading={accion === 'si'} onPress={() => revisar(true)} />
            <BotonChico title="Rechazar" variant="danger" loading={accion === 'no'} onPress={() => revisar(false)} />
          </View>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  nombre: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: '#B4410C' },
  acciones: { flexDirection: 'row', gap: 8 },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  input: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.ink,
  },
});
