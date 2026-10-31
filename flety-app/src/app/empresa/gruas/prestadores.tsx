import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Badge, BotonChico, Card, Vacio } from '@/components/empresa/ui';
import { Segmented } from '@/components/pedido/Choice';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useAuth } from '@/lib/auth';
import { fechaAVista } from '@/lib/perfilChofer';
import {
  nombreDe,
  prestadoresAdmin,
  urlDocumento,
  verificarDocumento,
  verificarEmpresa,
  verificarPrestador,
  type PrestadorAdmin,
} from '@/modulos/gruas/api';
import { TIPO_DOCUMENTO } from '@/modulos/gruas/estados';
import { useCatalogoGruas } from '@/modulos/gruas/hooks';
import type { Documento } from '@/modulos/gruas/tipos';
import { colors, fonts, radius } from '@/theme';

type Filtro = 'pendiente' | 'aprobado' | 'otros';

const TONO = {
  pendiente: 'warn',
  aprobado: 'success',
  aprobada: 'success',
  verificado: 'success',
  rechazado: 'danger',
  rechazada: 'danger',
  suspendido: 'neutral',
  suspendida: 'neutral',
} as const;

function vencido(doc: Documento) {
  return !!doc.vence && doc.vence < new Date().toISOString().slice(0, 10);
}

// Superadmin · Grúas: alta y verificación de gruistas, empresas de auxilio y
// sus documentos.
export default function PrestadoresGruas() {
  const { role } = useAuth();
  const [version, setVersion] = useState(0);
  const [res, setRes] = useState<{ lista: PrestadorAdmin[]; error: string | null } | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('pendiente');

  useEffect(() => {
    if (role !== 'superadmin') return;
    let cancelled = false;
    prestadoresAdmin()
      .then((lista) => !cancelled && setRes({ lista, error: null }))
      .catch((e: Error) => !cancelled && setRes({ lista: [], error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [role, version]);

  if (role && role !== 'superadmin') return <Redirect href="/empresa/panel" />;

  const lista = res?.lista ?? [];
  const pendientes = lista.filter((p) => p.estado === 'pendiente');
  const visibles = lista.filter((p) =>
    filtro === 'otros' ? p.estado === 'rechazado' || p.estado === 'suspendido' : p.estado === filtro
  );

  return (
    <EmpresaShell
      active="gruasPrestadores"
      empresa={null}
      title="Grúas · Gruistas"
      subtitle="Revisá la grúa y los documentos antes de aprobar."
      aviso={res?.error}>
      <View style={{ maxWidth: 900, width: '100%', gap: 16 }}>
        <Segmented
          options={[
            { value: 'pendiente', label: `Para revisar${pendientes.length ? ` · ${pendientes.length}` : ''}` },
            { value: 'aprobado', label: 'Aprobados' },
            { value: 'otros', label: 'Rechazados' },
          ]}
          value={filtro}
          onChange={setFiltro}
        />
        {visibles.length ? (
          visibles.map((p) => <TarjetaPrestador key={p.id} p={p} onCambio={() => setVersion((v) => v + 1)} />)
        ) : (
          <Card>
            <Vacio texto={res ? 'No hay gruistas en esta lista.' : 'Cargando…'} />
          </Card>
        )}
      </View>
    </EmpresaShell>
  );
}

function TarjetaPrestador({ p, onCambio }: { p: PrestadorAdmin; onCambio: () => void }) {
  const { catalogo } = useCatalogoGruas();
  const [motivo, setMotivo] = useState('');
  const [accion, setAccion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const obligatorios = (Object.keys(TIPO_DOCUMENTO) as (keyof typeof TIPO_DOCUMENTO)[]).filter(
    (t) => TIPO_DOCUMENTO[t].obligatorio
  );
  const faltan = obligatorios.filter(
    (t) => !p.documentos.some((x) => x.tipo === t && x.estado === 'verificado' && !vencido(x))
  );

  async function ejecutar(nombre: string, fn: () => Promise<unknown>) {
    setAccion(nombre);
    setError(null);
    try {
      await fn();
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar.');
    } finally {
      setAccion(null);
    }
  }

  async function ver(doc: Documento) {
    const url = await urlDocumento(doc.archivo);
    if (url) Linking.openURL(url);
  }

  return (
    <Card title={p.nombre ?? 'Sin nombre'} right={<Badge label={p.estado} tone={TONO[p.estado]} />}>
      <Text style={styles.muted}>
        {[p.email, p.telefono, p.empresa ? `Empresa: ${p.empresa.nombre}` : 'Independiente']
          .filter(Boolean)
          .join(' · ')}
      </Text>

      {p.empresa && p.empresa.owner_id === p.user_id ? (
        <View style={styles.bloque}>
          <Text style={styles.subtitulo}>Empresa de auxilio (dueño)</Text>
          <View style={styles.filaAcciones}>
            <Text style={[styles.texto, { flex: 1 }]}>
              {p.empresa.nombre}
              {p.empresa.cuit ? ` · CUIT ${p.empresa.cuit}` : ''}
            </Text>
            <Badge label={p.empresa.estado} tone={TONO[p.empresa.estado]} />
            {p.empresa.estado !== 'aprobada' ? (
              <BotonChico
                title="Aprobar empresa"
                variant="dark"
                loading={accion === 'empresa'}
                onPress={() => ejecutar('empresa', () => verificarEmpresa(p.empresa!.id, 'aprobada'))}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.bloque}>
        <Text style={styles.subtitulo}>Grúa</Text>
        <Text style={styles.texto}>
          {p.unidad
            ? `${p.unidad.patente} · ${[p.unidad.marca, p.unidad.modelo].filter(Boolean).join(' ')} · ${nombreDe(
                catalogo?.modalidades ?? [],
                p.unidad.modalidad
              )} · lleva: ${p.unidad.tipos_vehiculo.map((t) => nombreDe(catalogo?.tipos ?? [], t)).join(', ')}`
            : 'Todavía no cargó la grúa.'}
        </Text>
      </View>

      <View style={styles.bloque}>
        <Text style={styles.subtitulo}>Documentos</Text>
        {p.documentos.length ? (
          p.documentos.map((doc) => (
            <View key={doc.id} style={styles.filaAcciones}>
              <Pressable accessibilityRole="link" onPress={() => ver(doc)} style={{ flex: 1, minWidth: 160 }}>
                <Text style={styles.link}>{TIPO_DOCUMENTO[doc.tipo].titulo}</Text>
                <Text style={styles.muted}>
                  {doc.vence ? `Vence ${fechaAVista(doc.vence)}${vencido(doc) ? ' (vencido)' : ''}` : 'Sin vencimiento'}
                </Text>
              </Pressable>
              <Badge label={doc.estado} tone={TONO[doc.estado]} />
              {doc.estado !== 'verificado' ? (
                <BotonChico
                  title="Verificar"
                  variant="dark"
                  loading={accion === `ok-${doc.id}`}
                  onPress={() => ejecutar(`ok-${doc.id}`, () => verificarDocumento(doc.id, true))}
                />
              ) : null}
              {doc.estado !== 'rechazado' ? (
                <BotonChico
                  title="Rechazar"
                  variant="danger"
                  loading={accion === `no-${doc.id}`}
                  onPress={() =>
                    ejecutar(`no-${doc.id}`, () => verificarDocumento(doc.id, false, motivo || 'Documento no válido'))
                  }
                />
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No subió documentos.</Text>
        )}
        {faltan.length ? (
          <Text style={styles.aviso}>
            Falta verificar: {faltan.map((t) => TIPO_DOCUMENTO[t].titulo).join(', ')}. Sin esto no recibe pedidos.
          </Text>
        ) : null}
      </View>

      <TextInput
        value={motivo}
        onChangeText={setMotivo}
        placeholder="Motivo (para rechazar o suspender; lo ve el gruista)"
        placeholderTextColor={colors.muted}
        style={styles.input}
        maxLength={300}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.filaAcciones}>
        {p.estado !== 'aprobado' ? (
          <BotonChico
            title="Aprobar gruista"
            loading={accion === 'aprobar'}
            disabled={!p.unidad}
            onPress={() => ejecutar('aprobar', () => verificarPrestador(p.id, 'aprobado'))}
          />
        ) : null}
        {p.estado === 'pendiente' ? (
          <BotonChico
            title="Rechazar"
            variant="danger"
            loading={accion === 'rechazar'}
            onPress={() => ejecutar('rechazar', () => verificarPrestador(p.id, 'rechazado', motivo))}
          />
        ) : null}
        {p.estado === 'aprobado' ? (
          <BotonChico
            title="Suspender"
            variant="danger"
            loading={accion === 'suspender'}
            onPress={() => ejecutar('suspender', () => verificarPrestador(p.id, 'suspendido', motivo))}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  bloque: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  subtitulo: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  texto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: '#B4410C' },
  filaAcciones: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  aviso: { fontFamily: fonts.medium, fontSize: 13, color: '#92400E' },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
  },
});
