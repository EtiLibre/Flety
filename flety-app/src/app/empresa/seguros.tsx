import { Redirect } from 'expo-router';
import { Check, ExternalLink, FileText, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card, Vacio } from '@/components/empresa/ui';
import { Segmented } from '@/components/pedido/Choice';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useAuth } from '@/lib/auth';
import { fechaAVista } from '@/lib/perfilChofer';
import {
  cambiarExigirSeguro,
  diasParaVencer,
  empezoVigencia,
  ESTADO_SEGURO,
  estadoPoliza,
  exigeSeguro,
  LINKS_VERIFICACION,
  mismaPatente,
  polizasParaVerificar,
  TIPO_SEGURO,
  urlArchivoPoliza,
  verificarPoliza,
  type PolizaAdmin,
} from '@/lib/seguros';
import { colors, fonts, radius } from '@/theme';

type Filtro = 'pendiente' | 'verificada' | 'rechazada' | 'por_vencer';

// Superadmin: pólizas que cargan los choferes. No hay un servicio público para
// consultarlas, así que se revisan a mano con los controles automáticos de abajo.
export default function Seguros() {
  const { role } = useAuth();
  const [version, setVersion] = useState(0);
  const [res, setRes] = useState<{ v: number; polizas: PolizaAdmin[]; error: string | null } | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('pendiente');

  useEffect(() => {
    if (role !== 'superadmin') return;
    let cancelled = false;
    polizasParaVerificar()
      .then((polizas) => !cancelled && setRes({ v: version, polizas, error: null }))
      .catch((e: Error) => !cancelled && setRes({ v: version, polizas: [], error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [role, version]);

  if (role && role !== 'superadmin') return <Redirect href="/empresa/panel" />;

  const polizas = res?.polizas ?? [];
  const porVencer = polizas.filter((p) => p.estado === 'verificada' && estadoPoliza(p) === 'por_vencer');
  const lista =
    filtro === 'por_vencer'
      ? porVencer
      : polizas.filter((p) => p.estado === filtro && (filtro !== 'pendiente' || diasParaVencer(p.vigencia_hasta) >= 0));
  const pendientes = polizas.filter((p) => p.estado === 'pendiente' && diasParaVencer(p.vigencia_hasta) >= 0).length;

  return (
    <EmpresaShell
      active="seguros"
      empresa={null}
      title="Seguros"
      subtitle="Pólizas de los choferes: revisalas y marcalas como verificadas."
      aviso={res?.error}>
      <View style={{ maxWidth: 900, width: '100%', gap: 16 }}>
        <ExigirSeguro />
        <Card title="Cómo verificar una póliza">
          <Text style={styles.texto}>
            1. Abrí el certificado y fijate que coincidan aseguradora, número, patente y fechas con lo cargado.{'\n'}
            2. Consultá la vigencia por patente en la app oficial “Mi Seguro” de la SSN, o con la autogestión o el
            teléfono de la aseguradora.{'\n'}
            3. Si dudás de la aseguradora, buscala en el registro de entidades habilitadas de la SSN.
          </Text>
          <View style={styles.links}>
            <Enlace texto="App Mi Seguro (SSN)" url={LINKS_VERIFICACION.miSeguro} />
            <Enlace texto="Aseguradoras habilitadas" url={LINKS_VERIFICACION.aseguradorasHabilitadas} />
            <Enlace texto="Seguro digital (Mi Argentina)" url={LINKS_VERIFICACION.seguroDigital} />
          </View>
        </Card>
        <Segmented
          options={[
            { value: 'pendiente', label: `Por revisar${pendientes ? ` · ${pendientes}` : ''}` },
            { value: 'por_vencer', label: `Por vencer${porVencer.length ? ` · ${porVencer.length}` : ''}` },
            { value: 'verificada', label: 'Verificadas' },
            { value: 'rechazada', label: 'Rechazadas' },
          ]}
          value={filtro}
          onChange={setFiltro}
        />
        {!res ? (
          <ActivityIndicator color={colors.ink} style={{ marginTop: 20 }} />
        ) : lista.length ? (
          lista.map((p) => <PolizaFila key={p.id} p={p} onCambio={() => setVersion((v) => v + 1)} />)
        ) : (
          <Card>
            <Vacio texto="No hay pólizas en esta lista." />
          </Card>
        )}
      </View>
    </EmpresaShell>
  );
}

function Enlace({ texto, url }: { texto: string; url: string }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(url)} style={styles.enlace}>
      <ExternalLink size={14} color={colors.ink} />
      <Text style={styles.enlaceText}>{texto}</Text>
    </Pressable>
  );
}

function ExigirSeguro() {
  const [valor, setValor] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    exigeSeguro().then((v) => !cancelled && setValor(v));
    return () => {
      cancelled = true;
    };
  }, []);

  async function cambiar(v: boolean) {
    setValor(v);
    setError(null);
    try {
      await cambiarExigirSeguro(v);
    } catch (e) {
      setValor(!v);
      setError(e instanceof Error ? e.message : 'No se pudo cambiar.');
    }
  }

  return (
    <Card>
      <View style={styles.exigir}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={styles.titulo}>Exigir seguro verificado</Text>
          <Text style={styles.texto}>
            Si está activado, solo aparecen en el marketplace los choferes con la póliza del vehículo verificada y
            vigente.
          </Text>
        </View>
        {valor === null ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Switch value={valor} onValueChange={cambiar} accessibilityLabel="Exigir seguro verificado" />
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

function PolizaFila({ p, onCambio }: { p: PolizaAdmin; onCambio: () => void }) {
  const [abriendo, setAbriendo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [rechazando, setRechazando] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dias = diasParaVencer(p.vigencia_hasta);
  const e = estadoPoliza(p);

  // Controles automáticos.
  const checks = [
    {
      ok: dias >= 0,
      texto: dias >= 0 ? `Vigente hasta el ${fechaAVista(p.vigencia_hasta)} (${dias} días)` : 'Vencida',
    },
    {
      ok: empezoVigencia(p.vigencia_desde),
      texto: `Desde el ${fechaAVista(p.vigencia_desde)}`,
    },
    ...(p.tipo === 'automotor'
      ? [
          {
            ok: mismaPatente(p.patente, p.patente_vehiculo),
            texto: p.patente_vehiculo
              ? `Patente ${p.patente ?? '—'} ${mismaPatente(p.patente, p.patente_vehiculo) ? '=' : '≠'} vehículo ${p.patente_vehiculo}`
              : 'El chofer no cargó la patente de su vehículo',
          },
        ]
      : []),
  ];

  async function ver() {
    setAbriendo(true);
    const url = await urlArchivoPoliza(p.archivo);
    setAbriendo(false);
    if (url) Linking.openURL(url);
  }

  async function decidir(ok: boolean) {
    setEnviando(ok ? 'ok' : 'no');
    setError(null);
    try {
      await verificarPoliza(p.id, ok, motivo);
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setEnviando(null);
    }
  }

  return (
    <Card>
      <View style={styles.fila}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={styles.titulo}>
            {p.chofer ?? 'Empresa'} · {p.empresa ?? '—'}
          </Text>
          <Text style={styles.texto}>
            {TIPO_SEGURO[p.tipo].titulo} · {p.aseguradora} · Póliza {p.numero_poliza}
          </Text>
        </View>
        <Text style={[styles.badge, { backgroundColor: ESTADO_SEGURO[e].bg, color: ESTADO_SEGURO[e].fg }]}>
          {ESTADO_SEGURO[e].label.replace('Seguro ', '')}
        </Text>
      </View>
      <View style={{ gap: 4 }}>
        {checks.map((c) => (
          <View key={c.texto} style={styles.check}>
            {c.ok ? (
              <Check size={15} color={colors.success} strokeWidth={3} />
            ) : (
              <X size={15} color={colors.danger} strokeWidth={3} />
            )}
            <Text style={[styles.texto, { color: c.ok ? colors.ink : colors.danger }]}>{c.texto}</Text>
          </View>
        ))}
      </View>
      {p.motivo_rechazo ? <Text style={styles.error}>Motivo: {p.motivo_rechazo}</Text> : null}
      <Pressable accessibilityRole="button" onPress={ver} style={styles.enlace}>
        {abriendo ? <ActivityIndicator size="small" color={colors.ink} /> : <FileText size={15} color={colors.ink} />}
        <Text style={styles.enlaceText}>Ver certificado</Text>
      </Pressable>
      {p.estado === 'pendiente' ? (
        rechazando ? (
          <View style={{ gap: 8 }}>
            <TextInput
              value={motivo}
              onChangeText={setMotivo}
              maxLength={300}
              placeholder="Motivo (lo ve el chofer). Ej.: la patente no coincide"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Motivo del rechazo"
              style={styles.input}
            />
            <View style={styles.acciones}>
              <Button
                title="Rechazar póliza"
                variant="danger"
                disabled={motivo.trim().length < 4}
                loading={enviando === 'no'}
                onPress={() => decidir(false)}
                style={{ flex: 1 }}
              />
              <Pressable accessibilityRole="button" onPress={() => setRechazando(false)} style={styles.secundario}>
                <Text style={styles.secundarioText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.acciones}>
            <Button
              title="Verificada"
              variant="dark"
              loading={enviando === 'ok'}
              onPress={() => decidir(true)}
              style={{ flex: 1 }}
            />
            <Pressable accessibilityRole="button" onPress={() => setRechazando(true)} style={styles.secundario}>
              <Text style={styles.secundarioText}>Rechazar</Text>
            </Pressable>
          </View>
        )
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  titulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  texto: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  enlaceText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, textDecorationLine: 'underline' },
  exigir: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  badge: {
    fontFamily: fonts.bold,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  check: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
  },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secundario: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secundarioText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
});
