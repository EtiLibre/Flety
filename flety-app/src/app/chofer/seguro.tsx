import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, FileText, ImageIcon, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ChoferPreviewContext, useChofer } from '@/hooks/use-chofer';
import { useNavChofer } from '@/hooks/use-nav-chofer';
import { confirmar } from '@/lib/confirm';
import { fechaAVista, fechaDeVista, mascaraFecha } from '@/lib/perfilChofer';
import {
  ASEGURADORAS,
  borrarPoliza,
  cargarPoliza,
  diasParaVencer,
  ESTADO_SEGURO,
  estadoPoliza,
  mismaPatente,
  polizasDelChofer,
  resumenSeguro,
  TIPO_SEGURO,
  urlArchivoPoliza,
  type ArchivoLocal,
  type Poliza,
  type TipoSeguro,
} from '@/lib/seguros';
import { formatoPatente } from '@/lib/vehiculos';
import { colors, fonts, radius } from '@/theme';

const d = colors.dark;

// Mi seguro (chofer): carga la póliza de su vehículo y ve si está vigente y
// verificada por Flety. Avisa antes de que venza.
export default function SeguroChofer() {
  const { chofer, loading } = useChofer();
  const ir = useNavChofer();
  // En la demo no hay base: se ve como un chofer sin póliza cargada.
  const preview = useContext(ChoferPreviewContext);
  const driverId = chofer?.id ?? null;
  const [version, setVersion] = useState(0);
  const [res, setRes] = useState<{ clave: string; polizas: Poliza[]; error: string | null } | null>(null);
  const [cargando, setCargando] = useState(false);
  const clave = `${driverId}:${version}`;

  useEffect(() => {
    if (!driverId || preview) return;
    let cancelled = false;
    polizasDelChofer(driverId)
      .then((polizas) => !cancelled && setRes({ clave, polizas, error: null }))
      .catch((e: Error) => !cancelled && setRes({ clave, polizas: [], error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [driverId, clave, preview]);

  const actual = preview ? { clave, polizas: [], error: null } : res?.clave === clave ? res : null;
  const polizas = actual?.polizas ?? [];
  const resumen = resumenSeguro(polizas);
  const volver = () => (router.canGoBack() ? router.back() : ir('cuenta'));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={volver} style={styles.back}>
            <ChevronLeft size={22} color={d.text} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.titulo}>Mi seguro</Text>
        </View>

        {loading || (driverId && !actual) ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : !chofer ? (
          <Text style={styles.texto}>Primero sumate a una empresa con tu código de invitación.</Text>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.estadoRow}>
                <ShieldCheck size={22} color={resumen === 'verificado' ? '#4ADE80' : colors.accent} strokeWidth={2.2} />
                <Text
                  style={[
                    styles.badge,
                    { backgroundColor: ESTADO_SEGURO[resumen].bg, color: ESTADO_SEGURO[resumen].fg },
                  ]}>
                  {ESTADO_SEGURO[resumen].label}
                </Text>
              </View>
              <Text style={styles.texto}>
                {resumen === 'verificado'
                  ? 'Tu seguro está vigente y verificado. Los clientes lo ven en tu perfil.'
                  : resumen === 'por_vencer'
                    ? 'Tu seguro vence pronto: cargá la renovación para no quedarte sin cobertura.'
                    : resumen === 'en_revision'
                      ? 'Estamos revisando tu póliza. Te avisamos cuando esté verificada.'
                      : resumen === 'rechazado'
                        ? 'No pudimos verificar tu póliza. Mirá el motivo abajo y cargala de nuevo.'
                        : resumen === 'vencido'
                          ? 'Tu seguro está vencido. Sin seguro vigente no deberías hacer viajes.'
                          : 'Cargá el seguro de responsabilidad civil de tu vehículo (es obligatorio para circular).'}
              </Text>
              {actual?.error ? <Text style={styles.error}>{actual.error}</Text> : null}
            </View>

            {cargando ? (
              <FormPoliza
                companyId={chofer.company_id}
                driverId={chofer.id}
                patenteVehiculo={chofer.vehiculo?.patente ?? ''}
                onListo={() => {
                  setCargando(false);
                  setVersion((v) => v + 1);
                }}
                onCancelar={() => setCargando(false)}
              />
            ) : (
              <Button
                title={polizas.length ? 'Cargar otra póliza o renovación' : 'Cargar mi póliza'}
                onPress={() => setCargando(true)}
              />
            )}

            {polizas.map((p) => (
              <PolizaCard
                key={p.id}
                p={p}
                patenteVehiculo={chofer.vehiculo?.patente ?? null}
                onBorrada={() => setVersion((v) => v + 1)}
              />
            ))}

            <View style={styles.ayuda}>
              <Text style={styles.ayudaTitulo}>¿Cómo verificamos tu seguro?</Text>
              <Text style={styles.texto}>
                Revisamos el certificado que subís (aseguradora, número de póliza, patente y fechas) y lo confirmamos
                con la aseguradora o con la app oficial “Mi Seguro” de la Superintendencia de Seguros. Te avisamos 15
                días antes de que venza.
              </Text>
              <Text style={styles.texto}>
                Tip: podés descargar el certificado desde Mi Argentina o desde la app de tu aseguradora.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PolizaCard({
  p,
  patenteVehiculo,
  onBorrada,
}: {
  p: Poliza;
  patenteVehiculo: string | null;
  onBorrada: () => void;
}) {
  const e = estadoPoliza(p);
  const dias = diasParaVencer(p.vigencia_hasta);
  const [abriendo, setAbriendo] = useState(false);
  const patenteDistinta =
    p.tipo === 'automotor' && !!p.patente && !!patenteVehiculo && !mismaPatente(p.patente, patenteVehiculo);

  async function ver() {
    setAbriendo(true);
    const url = await urlArchivoPoliza(p.archivo);
    setAbriendo(false);
    if (url) Linking.openURL(url);
  }

  async function borrar() {
    if (!(await confirmar('¿Borrar esta póliza?'))) return;
    try {
      await borrarPoliza(p);
      onBorrada();
    } catch {
      // Si falla, la póliza sigue en la lista.
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.polizaHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.polizaTitulo}>{TIPO_SEGURO[p.tipo].titulo}</Text>
          <Text style={styles.texto}>
            {p.aseguradora} · Póliza {p.numero_poliza}
            {p.patente ? ` · ${p.patente}` : ''}
          </Text>
        </View>
        <Text style={[styles.badge, { backgroundColor: ESTADO_SEGURO[e].bg, color: ESTADO_SEGURO[e].fg }]}>
          {e === 'verificado'
            ? 'Verificada'
            : e === 'por_vencer'
              ? `Vence en ${dias} d`
              : ESTADO_SEGURO[e].label.replace('Seguro ', '')}
        </Text>
      </View>
      <Text style={styles.vigencia}>
        Vigencia: {fechaAVista(p.vigencia_desde)} al {fechaAVista(p.vigencia_hasta)}
        {dias >= 0 ? ` · ${dias === 0 ? 'vence hoy' : `quedan ${dias} días`}` : ' · vencida'}
      </Text>
      {p.estado === 'rechazada' && p.motivo_rechazo ? (
        <Text style={styles.error}>Motivo: {p.motivo_rechazo}</Text>
      ) : null}
      {patenteDistinta ? (
        <Text style={styles.error}>La patente de la póliza no coincide con la de tu vehículo ({patenteVehiculo}).</Text>
      ) : null}
      <View style={styles.acciones}>
        <Pressable accessibilityRole="button" onPress={ver} style={styles.accion}>
          {abriendo ? <ActivityIndicator color={d.text} size="small" /> : <FileText size={16} color={d.text} />}
          <Text style={styles.accionText}>Ver certificado</Text>
        </Pressable>
        {p.estado !== 'verificada' ? (
          <Pressable accessibilityRole="button" onPress={borrar} style={styles.accion}>
            <Trash2 size={16} color="#FF8A80" />
            <Text style={[styles.accionText, { color: '#FF8A80' }]}>Borrar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function FormPoliza({
  companyId,
  driverId,
  patenteVehiculo,
  onListo,
  onCancelar,
}: {
  companyId: string;
  driverId: string;
  patenteVehiculo: string;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoSeguro>('automotor');
  const [aseguradora, setAseguradora] = useState('');
  const [numero, setNumero] = useState('');
  const [patente, setPatente] = useState(patenteVehiculo);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [archivo, setArchivo] = useState<ArchivoLocal | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isoDesde = desde ? fechaDeVista(desde) : '';
  const isoHasta = hasta ? fechaDeVista(hasta) : '';
  const errores: Record<string, string> = {};
  if (isoDesde === null) errores.desde = 'Fecha inválida';
  if (isoHasta === null) errores.hasta = 'Fecha inválida';
  else if (isoDesde && isoHasta && isoHasta < isoDesde) errores.hasta = 'Tiene que ser después del inicio';
  else if (isoHasta && diasParaVencer(isoHasta) < 0) errores.hasta = 'Esta póliza ya está vencida';
  const sugerencias =
    aseguradora.trim().length >= 1
      ? ASEGURADORAS.filter(
          (a) => a.toLowerCase().includes(aseguradora.trim().toLowerCase()) && a !== aseguradora
        ).slice(0, 4)
      : [];
  const valido =
    aseguradora.trim().length >= 2 &&
    numero.trim().length >= 3 &&
    !!isoDesde &&
    !!isoHasta &&
    !Object.keys(errores).length &&
    !!archivo &&
    (tipo !== 'automotor' || patente.trim().length >= 6);

  async function elegirFoto() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setArchivo({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg', name: a.fileName ?? 'poliza.jpg', file: a.file });
  }

  async function elegirPdf() {
    const r = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setArchivo({ uri: a.uri, mimeType: a.mimeType ?? 'application/pdf', name: a.name, file: a.file });
  }

  async function guardar() {
    if (!archivo || !isoDesde || !isoHasta) return;
    setGuardando(true);
    setError(null);
    try {
      await cargarPoliza(
        { companyId, driverId, tipo, aseguradora, numero, patente, desde: isoDesde, hasta: isoHasta },
        archivo
      );
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar la póliza.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.polizaTitulo}>Nueva póliza</Text>
      <Text style={styles.label}>Tipo de seguro</Text>
      <View style={{ gap: 8 }} role="radiogroup">
        {(Object.keys(TIPO_SEGURO) as TipoSeguro[]).map((t) => (
          <Pressable
            key={t}
            role="radio"
            aria-checked={tipo === t}
            onPress={() => setTipo(t)}
            style={[styles.tipo, tipo === t && styles.tipoOn]}>
            <Text style={[styles.tipoTitulo, tipo === t && { color: colors.ink }]}>{TIPO_SEGURO[t].titulo}</Text>
            <Text style={[styles.tipoDetalle, tipo === t && { color: '#3A3F45' }]}>{TIPO_SEGURO[t].detalle}</Text>
          </Pressable>
        ))}
      </View>

      <Campo label="Aseguradora" value={aseguradora} onChange={setAseguradora} placeholder="La Segunda" />
      {sugerencias.length ? (
        <View style={styles.chips}>
          {sugerencias.map((a) => (
            <Pressable key={a} accessibilityRole="button" onPress={() => setAseguradora(a)} style={styles.chip}>
              <Text style={styles.chipText}>{a}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.fila}>
        <Campo label="N.º de póliza" value={numero} onChange={setNumero} placeholder="1234567" />
        {tipo === 'automotor' ? (
          <Campo
            label="Patente"
            value={patente}
            onChange={(v) => setPatente(formatoPatente(v))}
            placeholder="AE 123 FT"
            error={
              patente && patenteVehiculo && !mismaPatente(patente, patenteVehiculo) ? 'No es la de tu vehículo' : null
            }
          />
        ) : null}
      </View>
      <View style={styles.fila}>
        <Campo
          label="Vigente desde"
          value={desde}
          onChange={(v) => setDesde(mascaraFecha(v))}
          placeholder="DD/MM/AAAA"
          numerico
          error={errores.desde}
        />
        <Campo
          label="Vigente hasta"
          value={hasta}
          onChange={(v) => setHasta(mascaraFecha(v))}
          placeholder="DD/MM/AAAA"
          numerico
          error={errores.hasta}
        />
      </View>

      <Text style={styles.label}>Certificado de cobertura</Text>
      <Text style={styles.texto}>Que se lean bien la aseguradora, el número, la patente y las fechas.</Text>
      <View style={styles.fila}>
        <Pressable accessibilityRole="button" onPress={elegirFoto} style={styles.subir}>
          <ImageIcon size={18} color={d.text} />
          <Text style={styles.subirText}>Foto</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={elegirPdf} style={styles.subir}>
          <FileText size={18} color={d.text} />
          <Text style={styles.subirText}>PDF</Text>
        </Pressable>
      </View>
      {archivo ? <Text style={styles.archivo}>Archivo: {archivo.name}</Text> : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Enviar a verificar" disabled={!valido} loading={guardando} onPress={guardar} />
      <Pressable accessibilityRole="button" onPress={onCancelar} style={{ alignSelf: 'center' }}>
        <Text style={styles.cancelar}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  numerico,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  numerico?: boolean;
  error?: string | null;
}) {
  return (
    <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#5B6470"
        accessibilityLabel={label}
        keyboardType={numerico ? 'number-pad' : 'default'}
        autoCapitalize={label === 'Patente' ? 'characters' : 'words'}
        style={[styles.input, !!error && { borderColor: '#FF8A80' }]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: d.bg },
  content: { padding: 16, paddingBottom: 40, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: d.surface,
    borderWidth: 1,
    borderColor: d.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontFamily: fonts.display, fontSize: 26, color: d.text },
  card: { gap: 10, padding: 16, borderRadius: 22, backgroundColor: d.surface, borderWidth: 1, borderColor: d.line },
  estadoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    fontFamily: fonts.bold,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  texto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: d.muted },
  error: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: '#FF8A80' },
  polizaHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  polizaTitulo: { fontFamily: fonts.bold, fontSize: 16, color: d.text },
  vigencia: { fontFamily: fonts.semibold, fontSize: 13, color: d.text },
  acciones: { flexDirection: 'row', gap: 16, paddingTop: 4 },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accionText: { fontFamily: fonts.semibold, fontSize: 13, color: d.text },
  ayuda: { gap: 8, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: d.line },
  ayudaTitulo: { fontFamily: fonts.bold, fontSize: 15, color: d.text },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: d.muted },
  tipo: { gap: 2, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: d.line },
  tipoOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tipoTitulo: { fontFamily: fonts.bold, fontSize: 14, color: d.text },
  tipoDetalle: { fontFamily: fonts.regular, fontSize: 12, color: d.muted },
  fila: { flexDirection: 'row', gap: 10 },
  input: {
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: d.chip,
    borderWidth: 1,
    borderColor: d.line,
    paddingHorizontal: 14,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: d.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: d.chip },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: d.text },
  subir: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: d.line,
  },
  subirText: { fontFamily: fonts.semibold, fontSize: 14, color: d.text },
  archivo: { fontFamily: fonts.medium, fontSize: 13, color: d.text },
  cancelar: { fontFamily: fonts.semibold, fontSize: 14, color: d.muted, textDecorationLine: 'underline' },
});
