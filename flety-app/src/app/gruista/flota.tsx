import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { crearInvitacion, flota, invitaciones } from '@/modulos/gruas/api';
import { useMiGruista } from '@/modulos/gruas/hooks';
import { estilosGruista as eg, Subpantalla, Tarjeta, Titulo } from '@/modulos/gruas/pantalla';
import type { Prestador } from '@/modulos/gruas/tipos';
import { G } from '@/modulos/gruas/ui';
import { colors, fonts } from '@/theme';

const d = colors.dark;

type Invitacion = { code: string; expires_at: string; used_at: string | null; created_at: string };
type Datos = { gruistas: (Prestador & { nombre: string | null })[]; codigos: Invitacion[] };

const ESTADO: Record<Prestador['estado'], string> = {
  pendiente: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  suspendido: 'Suspendido',
};

// Mi flota (dueño de una empresa de auxilio): sus gruistas y los códigos para
// sumar nuevos.
export default function FlotaGruista() {
  const { gruista, cargando } = useMiGruista();
  const empresaId = gruista?.esDueno ? (gruista.empresa?.id ?? null) : null;
  const [version, setVersion] = useState(0);
  const [res, setRes] = useState<{ clave: string; datos: Datos | null; error: string | null } | null>(null);
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clave = `${empresaId}:${version}`;

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    Promise.all([flota(empresaId), invitaciones(empresaId)])
      .then(([gruistas, codigos]) => !cancelled && setRes({ clave, datos: { gruistas, codigos }, error: null }))
      .catch((e: Error) => !cancelled && setRes({ clave, datos: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [empresaId, clave]);

  const actual = res?.clave === clave ? res : null;

  async function crear() {
    setCreando(true);
    setError(null);
    try {
      const code = await crearInvitacion();
      setNuevo(code);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos crear el código.');
    } finally {
      setCreando(false);
    }
  }

  return (
    <Subpantalla titulo="Mi flota" subtitulo={gruista?.empresa?.nombre}>
      {cargando ? (
        <ActivityIndicator color={G.acento} />
      ) : !empresaId ? (
        <Text style={eg.muted}>Esta sección es para el dueño de una empresa de auxilio.</Text>
      ) : (
        <>
          <Tarjeta>
            <Titulo>Sumar un gruista</Titulo>
            <Text style={eg.muted}>
              Generá un código y pasáselo. Lo canjea en “Panel de gruista → Tengo un código”. Vence en 7 días y sirve
              una sola vez.
            </Text>
            {nuevo ? (
              <View style={styles.codigo}>
                <Text style={styles.codigoTexto} selectable>
                  {nuevo}
                </Text>
                <Button title="Copiar" variant="oscuro" onPress={() => Clipboard.setStringAsync(nuevo)} />
              </View>
            ) : null}
            {error ? <Text style={eg.error}>{error}</Text> : null}
            <Button title="Generar código" variant="grua" loading={creando} onPress={crear} />
          </Tarjeta>

          {!actual ? (
            <ActivityIndicator color={G.acento} />
          ) : actual.error ? (
            <Text style={eg.error}>{actual.error}</Text>
          ) : (
            <>
              <Tarjeta>
                <Titulo>Gruistas ({actual.datos?.gruistas.length ?? 0})</Titulo>
                {actual.datos?.gruistas.map((p) => (
                  <View key={p.id} style={styles.fila}>
                    <View style={[styles.punto, { backgroundColor: p.disponible ? '#4ADE80' : d.muted }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={eg.fuerte} numberOfLines={1}>
                        {p.nombre ?? 'Sin nombre'}
                        {p.user_id === gruista?.prestador.user_id ? ' (vos)' : ''}
                      </Text>
                      <Text style={eg.muted}>
                        {ESTADO[p.estado]} · {p.disponible ? 'Disponible' : 'No disponible'}
                      </Text>
                    </View>
                  </View>
                ))}
              </Tarjeta>
              {actual.datos?.codigos.length ? (
                <Tarjeta>
                  <Titulo>Códigos recientes</Titulo>
                  {actual.datos.codigos.map((c) => (
                    <View key={c.code} style={styles.fila}>
                      <Text style={[eg.fuerte, { flex: 1 }]}>{c.code}</Text>
                      <Text style={eg.muted}>{c.used_at ? 'Usado' : estadoCodigo(c.expires_at)}</Text>
                    </View>
                  ))}
                </Tarjeta>
              ) : null}
            </>
          )}
        </>
      )}
    </Subpantalla>
  );
}

function estadoCodigo(expira: string) {
  return new Date(expira).getTime() < Date.now() ? 'Vencido' : 'Sin usar';
}

const styles = StyleSheet.create({
  codigo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codigoTexto: { flex: 1, fontFamily: fonts.display, fontSize: 28, letterSpacing: 2, color: G.acento },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  punto: { width: 10, height: 10, borderRadius: 5 },
});
