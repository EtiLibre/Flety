import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Camera, ChevronLeft, Eye, Lock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { PerfilContenido } from '@/components/pedido/PerfilFletero';
import { useChofer } from '@/hooks/use-chofer';
import { useNavChofer } from '@/hooks/use-nav-chofer';
import { useAuth } from '@/lib/auth';
import { iniciales } from '@/lib/empresa';
import { perfilFletero, type PerfilFletero } from '@/lib/marketplace';
import {
  CATEGORIAS_LICENCIA,
  cambiarFotoPerfil,
  completitud,
  DATOS_VACIOS,
  datosPrivados,
  edad,
  fechaAVista,
  fechaDeVista,
  fotoPerfil,
  guardarDatosPrivados,
  guardarNombre,
  mascaraFecha,
  urlFotoPerfil,
  type DatosPrivados,
} from '@/lib/perfilChofer';
import { colors, fonts, radius } from '@/theme';

const d = colors.dark;

type Carga = { id: string; foto: string | null; datos: DatosPrivados | null; error: string | null };

// Perfil del chofer: la parte pública (foto y nombre) y sus datos personales,
// que solo ven él, su empresa y Flety.
export default function PerfilChofer() {
  const { chofer, loading } = useChofer();
  const ir = useNavChofer();
  const driverId = chofer?.id ?? null;
  const [carga, setCarga] = useState<Carga | null>(null);

  useEffect(() => {
    if (!driverId) return;
    let cancelled = false;
    Promise.all([
      fotoPerfil(driverId).catch(() => null),
      datosPrivados(driverId)
        .then((datos) => ({ datos, error: null }))
        .catch((e: Error) => ({ datos: null, error: e.message })),
    ]).then(([foto, r]) => !cancelled && setCarga({ id: driverId, foto, ...r }));
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  const lista = carga && carga.id === driverId ? carga : null;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={() => (router.canGoBack() ? router.back() : ir('cuenta'))}
            style={styles.back}>
            <ChevronLeft size={22} color={d.text} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.titulo}>Mi perfil</Text>
        </View>

        {loading || (driverId && !lista) ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : !chofer || !lista ? (
          <Text style={styles.texto}>Primero sumate a una empresa con tu código de invitación.</Text>
        ) : (
          <>
            <Publico driverId={chofer.id} fotoInicial={lista.foto} />
            {lista.error ? <Text style={styles.error}>{lista.error}</Text> : null}
            <FormDatos key={chofer.id} driverId={chofer.id} inicial={lista.datos} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Lo que ven los clientes ──────────────────────────────────────────────
function Publico({ driverId, fotoInicial }: { driverId: string; fotoInicial: string | null }) {
  const { session, nombre: nombreAuth, recargarPerfil } = useAuth();
  const [foto, setFoto] = useState(fotoInicial);
  const [subiendo, setSubiendo] = useState(false);
  const [nombre, setNombre] = useState(nombreAuth ?? '');
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<PerfilFletero | null | 'cargando'>(null);

  const url = urlFotoPerfil(foto);
  const nombreCambio = nombre.trim().length >= 3 && nombre.trim() !== (nombreAuth ?? '');

  async function elegirFoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    setSubiendo(true);
    setError(null);
    try {
      const path = await cambiarFotoPerfil(
        driverId,
        { uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg', fileName: a.fileName ?? 'perfil.jpg', file: a.file },
        foto
      );
      setFoto(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos subir la foto.');
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar() {
    if (!session) return;
    setGuardandoNombre(true);
    setError(null);
    try {
      await guardarNombre(session.user.id, nombre);
      recargarPerfil();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar tu nombre.');
    } finally {
      setGuardandoNombre(false);
    }
  }

  async function verComoCliente() {
    setVista('cargando');
    setVista(await perfilFletero(driverId));
  }

  return (
    <View style={styles.card}>
      <View style={styles.fotoRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={url ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
          onPress={elegirFoto}
          disabled={subiendo}
          style={styles.avatar}>
          {url ? (
            <Image source={{ uri: url }} style={styles.avatarImg} contentFit="cover" transition={200} />
          ) : (
            <Text style={styles.avatarText}>{iniciales(nombre || 'Chofer')}</Text>
          )}
          {subiendo ? (
            <View style={styles.avatarCargando}>
              <ActivityIndicator color={colors.white} />
            </View>
          ) : null}
          <View style={styles.camara}>
            <Camera size={15} color={colors.ink} strokeWidth={2.4} />
          </View>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={styles.subtitulo}>{url ? 'Tu foto de perfil' : 'Subí una foto tuya'}</Text>
          <Text style={styles.texto}>De frente y con buena luz: los clientes confían más cuando ven quién va.</Text>
        </View>
      </View>

      <Campo label="Nombre y apellido" value={nombre} onChange={setNombre} placeholder="Martín Gómez" />
      {nombreCambio ? <Button title="Guardar nombre" loading={guardandoNombre} onPress={guardar} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.publicoInfo}>
        <Eye size={16} color={d.muted} strokeWidth={2} />
        <Text style={[styles.texto, { flex: 1 }]}>
          Los clientes ven tu nombre de pila con la inicial del apellido, tu foto, tus calificaciones y tu vehículo.
          Nunca tus datos personales.
        </Text>
      </View>
      <Pressable accessibilityRole="button" onPress={verComoCliente} style={styles.linkBtn}>
        <Text style={styles.link}>Ver cómo me ven los clientes</Text>
      </Pressable>

      <Modal visible={vista !== null} animationType="slide" onRequestClose={() => setVista(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitulo}>Así te ven los clientes</Text>
            <Pressable accessibilityRole="button" onPress={() => setVista(null)}>
              <Text style={styles.modalCerrar}>Cerrar</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
            {vista === 'cargando' ? (
              <ActivityIndicator color={colors.ink} style={{ marginTop: 40 }} />
            ) : vista ? (
              <PerfilContenido perfil={vista} />
            ) : (
              <Text style={styles.modalVacio}>
                Todavía no aparecés en el marketplace: cargá tu vehículo y esperá a que tu empresa esté aprobada.
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ── Datos privados ───────────────────────────────────────────────────────
function FormDatos({ driverId, inicial }: { driverId: string; inicial: DatosPrivados | null }) {
  const base = inicial ?? DATOS_VACIOS;
  const [f, setF] = useState({
    ...base,
    fecha_nacimiento: fechaAVista(base.fecha_nacimiento),
    licencia_vencimiento: fechaAVista(base.licencia_vencimiento),
  });
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null);
  const set = (campo: keyof DatosPrivados) => (v: string) => {
    setF((x) => ({ ...x, [campo]: v }));
    setEstado(null);
  };

  const nacimiento = f.fecha_nacimiento ? fechaDeVista(f.fecha_nacimiento) : '';
  const vencimiento = f.licencia_vencimiento ? fechaDeVista(f.licencia_vencimiento) : '';
  const errores: Partial<Record<keyof DatosPrivados, string>> = {};
  if (f.dni && !/^\d{7,8}$/.test(f.dni)) errores.dni = 'Entre 7 y 8 números';
  if (nacimiento === null) errores.fecha_nacimiento = 'Fecha inválida (DD/MM/AAAA)';
  else if (nacimiento && (edad(nacimiento) < 18 || edad(nacimiento) > 85))
    errores.fecha_nacimiento = 'Tenés que ser mayor de 18';
  if (f.telefono && f.telefono.replace(/\D/g, '').length < 8) errores.telefono = 'Teléfono incompleto';
  if (vencimiento === null) errores.licencia_vencimiento = 'Fecha inválida (DD/MM/AAAA)';
  if (f.emergencia_telefono && f.emergencia_telefono.replace(/\D/g, '').length < 8)
    errores.emergencia_telefono = 'Teléfono incompleto';
  const vencida = !!vencimiento && new Date(`${vencimiento}T23:59:59`) < new Date();

  const datos: DatosPrivados = {
    ...f,
    fecha_nacimiento: nacimiento || '',
    licencia_vencimiento: vencimiento || '',
  };
  const { hechos, total, completo } = completitud(datos);
  const valido = Object.keys(errores).length === 0;

  async function guardar() {
    if (!valido) return;
    setGuardando(true);
    setEstado(null);
    try {
      await guardarDatosPrivados(driverId, datos);
      setEstado({ ok: true, texto: completo ? 'Datos guardados.' : 'Guardado. Completá lo que falta cuando puedas.' });
    } catch (e) {
      setEstado({ ok: false, texto: e instanceof Error ? e.message : 'No pudimos guardar tus datos.' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.privadoHead}>
        <Text style={styles.subtitulo}>Datos personales</Text>
        <View style={styles.privado}>
          <Lock size={12} color={colors.accent} strokeWidth={2.4} />
          <Text style={styles.privadoText}>Privado</Text>
        </View>
      </View>
      <Text style={styles.texto}>
        Solo los ven vos, tu empresa y Flety (para verificar tu identidad y ante cualquier problema en un viaje). Los
        clientes nunca los ven.
      </Text>

      <View style={{ gap: 6 }}>
        <View style={styles.progresoRow}>
          <Text style={styles.label}>{completo ? 'Perfil completo' : `Completaste ${hechos} de ${total}`}</Text>
        </View>
        <View style={styles.barra}>
          <View style={[styles.barraLlena, { width: `${(hechos / total) * 100}%` }, completo && styles.barraOk]} />
        </View>
      </View>

      <Seccion titulo="Identidad" />
      <View style={styles.fila}>
        <Campo
          label="DNI"
          value={f.dni}
          onChange={(v) => set('dni')(v.replace(/\D/g, '').slice(0, 8))}
          placeholder="30123456"
          numerico
          error={errores.dni}
        />
        <Campo
          label="Fecha de nacimiento"
          value={f.fecha_nacimiento}
          onChange={(v) => set('fecha_nacimiento')(mascaraFecha(v))}
          placeholder="DD/MM/AAAA"
          numerico
          error={errores.fecha_nacimiento}
        />
      </View>

      <Seccion titulo="Contacto y domicilio" />
      <Campo
        label="Teléfono"
        value={f.telefono}
        onChange={(v) => set('telefono')(v.replace(/[^\d+\s-]/g, '').slice(0, 20))}
        placeholder="261 555 1234"
        telefono
        error={errores.telefono}
      />
      <Campo
        label="Domicilio"
        value={f.domicilio}
        onChange={set('domicilio')}
        placeholder="Calle y número, piso, depto."
      />
      <Campo label="Localidad" value={f.localidad} onChange={set('localidad')} placeholder="Godoy Cruz" />

      <Seccion titulo="Licencia de conducir" />
      <Text style={styles.label}>Categoría</Text>
      <View style={styles.chips} role="radiogroup" aria-label="Categoría de la licencia">
        {CATEGORIAS_LICENCIA.map((c) => (
          <Pressable
            key={c}
            role="radio"
            aria-checked={f.licencia_categoria === c}
            onPress={() => set('licencia_categoria')(f.licencia_categoria === c ? '' : c)}
            style={[styles.chip, f.licencia_categoria === c && styles.chipOn]}>
            <Text style={[styles.chipText, f.licencia_categoria === c && styles.chipTextOn]}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <Campo
        label="Vencimiento"
        value={f.licencia_vencimiento}
        onChange={(v) => set('licencia_vencimiento')(mascaraFecha(v))}
        placeholder="DD/MM/AAAA"
        numerico
        error={errores.licencia_vencimiento ?? (vencida ? 'Tu licencia está vencida: renovala para trabajar.' : null)}
      />

      <Seccion titulo="Contacto de emergencia" />
      <View style={styles.fila}>
        <Campo
          label="Nombre"
          value={f.emergencia_nombre}
          onChange={set('emergencia_nombre')}
          placeholder="Laura (hermana)"
        />
        <Campo
          label="Teléfono"
          value={f.emergencia_telefono}
          onChange={(v) => set('emergencia_telefono')(v.replace(/[^\d+\s-]/g, '').slice(0, 20))}
          placeholder="261 555 9876"
          telefono
          error={errores.emergencia_telefono}
        />
      </View>

      {estado ? <Text style={estado.ok ? styles.ok : styles.error}>{estado.texto}</Text> : null}
      <Button title="Guardar datos" disabled={!valido} loading={guardando} onPress={guardar} />
    </View>
  );
}

function Seccion({ titulo }: { titulo: string }) {
  return <Text style={styles.seccion}>{titulo}</Text>;
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  numerico,
  telefono,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  numerico?: boolean;
  telefono?: boolean;
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
        keyboardType={numerico ? 'number-pad' : telefono ? 'phone-pad' : 'default'}
        autoCapitalize={numerico || telefono ? 'none' : 'words'}
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
  card: { gap: 12, padding: 18, borderRadius: 26, backgroundColor: d.surface, borderWidth: 1, borderColor: d.line },
  fotoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarText: { fontFamily: fonts.display, fontSize: 32, color: colors.ink },
  avatarImg: { position: 'absolute', top: 0, left: 0, width: 92, height: 92, borderRadius: 46 },
  avatarCargando: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 46,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camara: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: d.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitulo: { fontFamily: fonts.bold, fontSize: 17, color: d.text },
  texto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: d.muted },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: d.muted },
  seccion: { fontFamily: fonts.bold, fontSize: 14, color: d.text, marginTop: 6 },
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
  publicoInfo: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingTop: 4 },
  linkBtn: { alignSelf: 'flex-start' },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent, textDecorationLine: 'underline' },
  privadoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  privado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,194,51,0.12)',
  },
  privadoText: { fontFamily: fonts.bold, fontSize: 11, color: colors.accent },
  progresoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  barra: { height: 6, borderRadius: 3, backgroundColor: d.chip, overflow: 'hidden' },
  barraLlena: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  barraOk: { backgroundColor: '#22C55E' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minWidth: 52,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: d.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: d.text },
  chipTextOn: { color: colors.ink, fontFamily: fonts.bold },
  error: { fontFamily: fonts.medium, fontSize: 12, color: '#FF8A80' },
  ok: { fontFamily: fonts.medium, fontSize: 13, color: '#4ADE80' },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  modalTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  modalCerrar: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' },
  modalVacio: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
});
