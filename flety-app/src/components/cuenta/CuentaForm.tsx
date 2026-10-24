import { AtSign, Check, ChevronRight, Eye, EyeOff, KeyRound, LogOut, Mail, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth';
import {
  cambiarContrasena,
  cambiarEmail,
  EMAIL_RE,
  guardarCuenta,
  limpiarUsuario,
  miCuenta,
  USUARIO_RE,
  usuarioDisponible,
  type Cuenta,
} from '@/lib/cuenta';
import { iniciales } from '@/lib/empresa';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';
import { paleta, type Paleta, type Tema } from '@/theme/tema';

// "Mi cuenta", igual para cliente, chofer y empresa: datos personales, usuario,
// correo y contraseña. `children` agrega accesos propios de cada rol.
export function CuentaForm({ tema, children }: { tema: Tema; children?: React.ReactNode }) {
  const p = paleta(tema);
  const { session, nombre: nombreAuth, role } = useAuth();
  const userId = session?.user.id ?? null;
  const [carga, setCarga] = useState<{ id: string; cuenta: Cuenta | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    miCuenta(userId)
      .then((cuenta) => !cancelled && setCarga({ id: userId, cuenta, error: null }))
      .catch((e: Error) => !cancelled && setCarga({ id: userId, cuenta: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Vista de ejemplo (superadmin en /preview-*): sin sesión, datos de muestra.
  const demo: Cuenta | null = userId
    ? null
    : {
        email: 'ejemplo@flety.app',
        nombre: (nombreAuth ?? 'Usuario').split(' ')[0],
        apellido: (nombreAuth ?? '').split(' ').slice(1).join(' '),
        telefono: '261 555 1234',
        username: limpiarUsuario((nombreAuth ?? 'usuario').replace(/\s+/g, '.')),
      };
  const lista = demo ? { cuenta: demo, error: null } : carga?.id === userId ? carga : null;

  if (!lista)
    return <ActivityIndicator color={tema === 'oscuro' ? colors.accent : colors.ink} style={{ marginTop: 30 }} />;

  return (
    <View style={{ gap: 14 }}>
      {lista.error ? <Text style={[s.aviso, { color: p.error }]}>{lista.error}</Text> : null}
      {demo ? <Text style={[s.aviso, { color: p.muted }]}>Vista de ejemplo: los cambios no se guardan.</Text> : null}
      <Cabecera p={p} cuenta={lista.cuenta} rol={role} />
      {children}
      {lista.cuenta ? (
        <>
          <DatosPersonales key={userId ?? 'demo'} p={p} userId={userId} inicial={lista.cuenta} />
          <CambiarCorreo p={p} actual={lista.cuenta.email} habilitado={!!userId} />
          <CambiarContrasena p={p} email={lista.cuenta.email} habilitado={!!userId} />
        </>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => supabase.auth.signOut()}
        style={({ pressed }) => [
          s.salir,
          { borderColor: p.cardBorder, backgroundColor: p.card },
          pressed && { opacity: 0.8 },
        ]}>
        <LogOut size={18} color={p.error} strokeWidth={2.2} />
        <Text style={[s.salirText, { color: p.error }]}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const ROL_LABEL: Record<string, string> = {
  cliente: 'Cliente',
  chofer: 'Chofer',
  empresa: 'Empresa',
  superadmin: 'Administrador',
  contabilidad: 'Contabilidad',
  marketing: 'Marketing',
};

function Cabecera({ p, cuenta, rol }: { p: Paleta; cuenta: Cuenta | null; rol: string | null }) {
  const completo = cuenta ? [cuenta.nombre, cuenta.apellido].filter(Boolean).join(' ') : '';
  return (
    <View style={[s.card, s.cabecera, { backgroundColor: p.card, borderColor: p.cardBorder }]}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{iniciales(completo || cuenta?.email || 'F')}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[s.nombre, { color: p.text }]} numberOfLines={1}>
          {completo || 'Tu cuenta'}
        </Text>
        {cuenta?.username ? (
          <Text style={[s.muted, { color: p.muted }]} numberOfLines={1}>
            @{cuenta.username}
          </Text>
        ) : null}
        <Text style={[s.muted, { color: p.muted }]} numberOfLines={1}>
          {cuenta?.email}
          {rol ? ` · ${ROL_LABEL[rol] ?? rol}` : ''}
        </Text>
      </View>
    </View>
  );
}

// Fila de acceso (p. ej. "Mi vehículo") para el `children` de CuentaForm.
export function FilaCuenta({
  tema,
  Icon,
  titulo,
  detalle,
  onPress,
}: {
  tema: Tema;
  Icon: typeof Mail;
  titulo: string;
  detalle?: string;
  onPress: () => void;
}) {
  const p = paleta(tema);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        s.fila,
        { backgroundColor: p.card, borderColor: p.cardBorder },
        pressed && { opacity: 0.85 },
      ]}>
      <View style={[s.filaIcon, { backgroundColor: p.chip }]}>
        <Icon size={19} color={p.text} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.filaTitulo, { color: p.text }]}>{titulo}</Text>
        {detalle ? <Text style={[s.muted, { color: p.muted }]}>{detalle}</Text> : null}
      </View>
      <ChevronRight size={18} color={p.muted} strokeWidth={2} />
    </Pressable>
  );
}

// ── Datos personales ─────────────────────────────────────────────────────
function DatosPersonales({ p, userId, inicial }: { p: Paleta; userId: string | null; inicial: Cuenta }) {
  const { recargarPerfil } = useAuth();
  const [base, setBase] = useState(inicial);
  const [f, setF] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null);
  const disponible = useDisponible(f.username, base.username);

  const set = (campo: keyof Cuenta) => (v: string) => {
    setF((x) => ({ ...x, [campo]: v }));
    setEstado(null);
  };

  const errores: Partial<Record<keyof Cuenta, string>> = {};
  if (f.nombre.trim().length < 2) errores.nombre = 'Escribí tu nombre';
  if (f.apellido.trim().length < 2) errores.apellido = 'Escribí tu apellido';
  if (f.username && !USUARIO_RE.test(f.username)) errores.username = 'De 3 a 20: letras, números, punto o guion bajo';
  else if (disponible === false) errores.username = 'Ese usuario ya está en uso';
  if (f.telefono && f.telefono.replace(/\D/g, '').length < 8) errores.telefono = 'Teléfono incompleto';

  const cambio = (['nombre', 'apellido', 'username', 'telefono'] as const).some((k) => f[k].trim() !== base[k].trim());
  const valido = Object.keys(errores).length === 0;

  async function guardar() {
    if (!userId) return;
    setGuardando(true);
    setEstado(null);
    try {
      await guardarCuenta(userId, f);
      setBase(f);
      recargarPerfil();
      setEstado({ ok: true, texto: 'Datos guardados.' });
    } catch (e) {
      setEstado({ ok: false, texto: e instanceof Error ? e.message : 'No pudimos guardar tus datos.' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={[s.card, { backgroundColor: p.card, borderColor: p.cardBorder }]}>
      <Text style={[s.titulo, { color: p.text }]}>Datos personales</Text>
      <View style={s.filaCampos}>
        <Campo p={p} label="Nombre" value={f.nombre} onChangeText={set('nombre')} error={errores.nombre} />
        <Campo p={p} label="Apellido" value={f.apellido} onChangeText={set('apellido')} error={errores.apellido} />
      </View>
      <Campo
        p={p}
        label="Nombre de usuario"
        value={f.username}
        onChangeText={(v) => set('username')(limpiarUsuario(v))}
        placeholder="martin.gomez"
        autoCapitalize="none"
        prefijo={<AtSign size={16} color={p.muted} strokeWidth={2} />}
        error={errores.username}
        ayuda={
          f.username && f.username !== base.username && !errores.username
            ? disponible === null
              ? 'Comprobando…'
              : 'Disponible'
            : null
        }
      />
      <Campo
        p={p}
        label="Teléfono"
        value={f.telefono}
        onChangeText={(v) => set('telefono')(v.replace(/[^\d+\s-]/g, '').slice(0, 20))}
        placeholder="261 555 1234"
        keyboardType="phone-pad"
        error={errores.telefono}
      />
      {estado ? <Text style={[s.estado, { color: estado.ok ? p.ok : p.error }]}>{estado.texto}</Text> : null}
      <Button title="Guardar cambios" disabled={!cambio || !valido || !userId} loading={guardando} onPress={guardar} />
    </View>
  );
}

// null = comprobando (o sin cambios), true/false = respuesta.
function useDisponible(username: string, actual: string) {
  const consultar = !!username && username !== actual && USUARIO_RE.test(username);
  const [res, setRes] = useState<{ u: string; ok: boolean | null } | null>(null);
  useEffect(() => {
    if (!consultar) return;
    let cancelled = false;
    const t = setTimeout(() => {
      usuarioDisponible(username).then((ok) => !cancelled && setRes({ u: username, ok }));
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [consultar, username]);
  if (!consultar) return true;
  return res?.u === username ? res.ok : null;
}

// ── Correo ───────────────────────────────────────────────────────────────
function CambiarCorreo({ p, actual, habilitado }: { p: Paleta; actual: string; habilitado: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null);
  const valido = EMAIL_RE.test(email.trim()) && email.trim().toLowerCase() !== actual.toLowerCase();

  async function enviar() {
    setEnviando(true);
    setEstado(null);
    try {
      await cambiarEmail(email);
      setEstado({
        ok: true,
        texto: `Te mandamos un mail a ${email.trim()} (y otro a ${actual}). El cambio se aplica cuando lo confirmes.`,
      });
      setEmail('');
    } catch (e) {
      setEstado({ ok: false, texto: e instanceof Error ? e.message : 'No pudimos cambiar el correo.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={[s.card, { backgroundColor: p.card, borderColor: p.cardBorder }]}>
      <Plegable
        p={p}
        Icon={Mail}
        titulo="Correo electrónico"
        detalle={actual}
        abierto={abierto}
        onToggle={() => setAbierto((a) => !a)}
      />
      {abierto ? (
        <>
          <Campo
            p={p}
            label="Correo nuevo"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setEstado(null);
            }}
            placeholder="nombre@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {estado ? <Text style={[s.estado, { color: estado.ok ? p.ok : p.error }]}>{estado.texto}</Text> : null}
          <Button title="Cambiar correo" disabled={!valido || !habilitado} loading={enviando} onPress={enviar} />
        </>
      ) : null}
    </View>
  );
}

// ── Contraseña ───────────────────────────────────────────────────────────
function CambiarContrasena({ p, email, habilitado }: { p: Paleta; email: string; habilitado: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [ver, setVer] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null);

  const reglas = [
    { ok: nueva.length >= 8, texto: 'Al menos 8 caracteres' },
    { ok: /[A-Za-z]/.test(nueva) && /\d/.test(nueva), texto: 'Letras y números' },
    { ok: !!nueva && nueva === repetir, texto: 'Las dos coinciden' },
  ];
  const valido = !!actual && reglas.every((r) => r.ok);

  async function guardar() {
    setGuardando(true);
    setEstado(null);
    try {
      await cambiarContrasena(email, actual, nueva);
      setActual('');
      setNueva('');
      setRepetir('');
      setEstado({ ok: true, texto: 'Listo, tu contraseña cambió.' });
    } catch (e) {
      setEstado({ ok: false, texto: e instanceof Error ? e.message : 'No pudimos cambiar la contraseña.' });
    } finally {
      setGuardando(false);
    }
  }

  const ojo = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ver ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
      onPress={() => setVer((v) => !v)}
      hitSlop={8}>
      {ver ? <EyeOff size={18} color={p.muted} /> : <Eye size={18} color={p.muted} />}
    </Pressable>
  );

  return (
    <View style={[s.card, { backgroundColor: p.card, borderColor: p.cardBorder }]}>
      <Plegable
        p={p}
        Icon={KeyRound}
        titulo="Contraseña"
        detalle="Cambiala cuando quieras"
        abierto={abierto}
        onToggle={() => setAbierto((a) => !a)}
      />
      {abierto ? (
        <>
          <Campo
            p={p}
            label="Contraseña actual"
            value={actual}
            onChangeText={setActual}
            secureTextEntry={!ver}
            autoComplete="current-password"
            sufijo={ojo}
          />
          <Campo
            p={p}
            label="Contraseña nueva"
            value={nueva}
            onChangeText={setNueva}
            secureTextEntry={!ver}
            autoComplete="new-password"
          />
          <Campo
            p={p}
            label="Repetí la contraseña nueva"
            value={repetir}
            onChangeText={setRepetir}
            secureTextEntry={!ver}
            autoComplete="new-password"
          />
          <View style={{ gap: 4 }}>
            {reglas.map((r) => (
              <View key={r.texto} style={s.regla}>
                {r.ok ? (
                  <Check size={14} color={p.ok} strokeWidth={3} />
                ) : (
                  <X size={14} color={p.muted} strokeWidth={2.4} />
                )}
                <Text style={[s.muted, { color: r.ok ? p.ok : p.muted }]}>{r.texto}</Text>
              </View>
            ))}
          </View>
          {estado ? <Text style={[s.estado, { color: estado.ok ? p.ok : p.error }]}>{estado.texto}</Text> : null}
          <Button title="Cambiar contraseña" disabled={!valido || !habilitado} loading={guardando} onPress={guardar} />
        </>
      ) : null}
    </View>
  );
}

function Plegable({
  p,
  Icon,
  titulo,
  detalle,
  abierto,
  onToggle,
}: {
  p: Paleta;
  Icon: typeof Mail;
  titulo: string;
  detalle: string;
  abierto: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: abierto }}
      onPress={onToggle}
      style={s.plegable}>
      <View style={[s.filaIcon, { backgroundColor: p.chip }]}>
        <Icon size={18} color={p.text} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.filaTitulo, { color: p.text }]}>{titulo}</Text>
        <Text style={[s.muted, { color: p.muted }]} numberOfLines={1}>
          {detalle}
        </Text>
      </View>
      <Text style={[s.cambiar, { color: p.text }]}>{abierto ? 'Cancelar' : 'Cambiar'}</Text>
    </Pressable>
  );
}

function Campo({
  p,
  label,
  error,
  ayuda,
  prefijo,
  sufijo,
  ...input
}: TextInputProps & {
  p: Paleta;
  label: string;
  error?: string | null;
  ayuda?: string | null;
  prefijo?: React.ReactNode;
  sufijo?: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
      <Text style={[s.label, { color: p.muted }]}>{label}</Text>
      <View style={[s.input, { backgroundColor: p.input, borderColor: error ? p.error : p.inputBorder }]}>
        {prefijo}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={p.muted}
          style={[s.inputText, { color: p.text }]}
          {...input}
        />
        {sufijo}
      </View>
      {error ? (
        <Text style={[s.ayuda, { color: p.error }]}>{error}</Text>
      ) : ayuda ? (
        <Text style={[s.ayuda, { color: p.ok }]}>{ayuda}</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: 22, borderWidth: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.display, fontSize: 21, color: colors.ink },
  nombre: { fontFamily: fonts.display, fontSize: 21, letterSpacing: -0.3 },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  titulo: { fontFamily: fonts.bold, fontSize: 16 },
  filaCampos: { flexDirection: 'row', gap: 10 },
  label: { fontFamily: fonts.semibold, fontSize: 13 },
  input: {
    height: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputText: { flex: 1, minWidth: 0, height: '100%', fontFamily: fonts.semibold, fontSize: 16 },
  ayuda: { fontFamily: fonts.medium, fontSize: 12 },
  estado: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  aviso: { fontFamily: fonts.medium, fontSize: 13 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  filaIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { fontFamily: fonts.bold, fontSize: 15 },
  plegable: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cambiar: { fontFamily: fonts.bold, fontSize: 13, textDecorationLine: 'underline' },
  regla: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  salir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  salirText: { fontFamily: fonts.bold, fontSize: 15 },
});
