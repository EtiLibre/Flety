import { Redirect } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { AnuncioModal } from '@/components/AnuncioPopup';
import { Button } from '@/components/Button';
import { Badge, BotonChico, Card, Vacio } from '@/components/empresa/ui';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useAccion } from '@/hooks/use-accion';
import { useIsWide } from '@/hooks/use-is-wide';
import { useAuth } from '@/lib/auth';
import { confirmar } from '@/lib/confirm';
import { borrarAnuncio, guardarAnuncio, todosLosAnuncios, type Anuncio, type Audiencia } from '@/lib/marketing';
import { colors, fonts, radius } from '@/theme';

const AUDIENCIAS: { id: Audiencia; label: string; detalle: string }[] = [
  { id: 'visitante', label: 'Visitantes', detalle: 'En la página de inicio, sin cuenta' },
  { id: 'cliente', label: 'Clientes', detalle: 'Al entrar a su inicio' },
  { id: 'chofer', label: 'Choferes', detalle: 'En la app del chofer' },
  { id: 'empresa', label: 'Empresas', detalle: 'En el panel de empresa' },
];

type Form = {
  id?: string;
  titulo: string;
  texto: string;
  imagen_url: string;
  cta_texto: string;
  cta_url: string;
  audiencia: Audiencia[];
  activo: boolean;
};

const VACIO: Form = {
  titulo: '',
  texto: '',
  imagen_url: '',
  cta_texto: '',
  cta_url: '',
  audiencia: ['visitante', 'cliente'],
  activo: false,
};

// Marketing: crear y administrar pop-ups. Cada uno aparece una sola vez por
// dispositivo a la audiencia elegida; las vistas y los clicks se ven en Marketing.
export default function Anuncios() {
  const { role } = useAuth();
  const isWide = useIsWide();
  const [lista, setLista] = useState<Anuncio[] | null>(null);
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState<Form>(VACIO);
  const [preview, setPreview] = useState(false);
  const { pendiente, error, ejecutar } = useAccion(() => setVersion((v) => v + 1));

  useEffect(() => {
    let cancelled = false;
    todosLosAnuncios().then((l) => !cancelled && setLista(l));
    return () => {
      cancelled = true;
    };
  }, [version]);

  if (role && role !== 'marketing' && role !== 'superadmin') return <Redirect href="/empresa/panel" />;

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const valido = form.titulo.trim().length >= 2 && form.audiencia.length > 0;

  function editar(a: Anuncio) {
    setForm({
      id: a.id,
      titulo: a.titulo,
      texto: a.texto ?? '',
      imagen_url: a.imagen_url ?? '',
      cta_texto: a.cta_texto ?? '',
      cta_url: a.cta_url ?? '',
      audiencia: a.audiencia,
      activo: a.activo,
    });
  }

  const comoAnuncio: Anuncio = {
    id: form.id ?? 'preview',
    titulo: form.titulo || 'Título del anuncio',
    texto: form.texto || null,
    imagen_url: form.imagen_url.startsWith('https://') ? form.imagen_url : null,
    cta_texto: form.cta_texto || null,
    cta_url: form.cta_url || null,
    audiencia: form.audiencia,
    activo: form.activo,
    desde: null,
    hasta: null,
    created_at: new Date().toISOString(),
  };

  const editor = (
    <Card title={form.id ? 'Editar anuncio' : 'Nuevo anuncio'} style={isWide ? { flex: 1, minWidth: 0 } : undefined}>
      <Campo
        label="Título"
        value={form.titulo}
        onChange={(titulo) => set({ titulo })}
        max={80}
        placeholder="Ej.: 20% off en tu primera mudanza"
      />
      <Campo
        label="Texto"
        value={form.texto}
        onChange={(texto) => set({ texto })}
        max={300}
        multiline
        placeholder="Contá la promo en una o dos líneas"
      />
      <Campo
        label="Imagen (link https, opcional)"
        value={form.imagen_url}
        onChange={(imagen_url) => set({ imagen_url })}
        placeholder="https://…/promo.jpg"
      />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Campo
            label="Texto del botón"
            value={form.cta_texto}
            onChange={(cta_texto) => set({ cta_texto })}
            max={30}
            placeholder="Pedir ahora"
          />
        </View>
        <View style={{ flex: 1.4 }}>
          <Campo
            label="Link del botón"
            value={form.cta_url}
            onChange={(cta_url) => set({ cta_url })}
            placeholder="/registro o https://…"
          />
        </View>
      </View>

      <Text style={styles.label}>¿A quién se lo mostramos?</Text>
      <View style={styles.audiencias}>
        {AUDIENCIAS.map((a) => {
          const on = form.audiencia.includes(a.id);
          return (
            <Pressable
              key={a.id}
              role="checkbox"
              aria-checked={on}
              onPress={() =>
                set({ audiencia: on ? form.audiencia.filter((x) => x !== a.id) : [...form.audiencia, a.id] })
              }
              style={[styles.audiencia, on && styles.audienciaOn]}>
              <View style={[styles.check, on && styles.checkOn]}>
                {on ? <Check size={12} color={colors.white} strokeWidth={3} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.audienciaTitle}>{a.label}</Text>
                <Text style={styles.muted}>{a.detalle}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.audienciaTitle}>Activo</Text>
          <Text style={styles.muted}>Si hay varios activos para una audiencia, se muestra el más nuevo.</Text>
        </View>
        <Switch
          value={form.activo}
          onValueChange={(activo) => set({ activo })}
          trackColor={{ true: '#22A06B', false: '#D5D9DE' }}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.row}>
        <Button title="Vista previa" variant="outline" onPress={() => setPreview(true)} style={{ flex: 1 }} />
        <Button
          title={form.id ? 'Guardar cambios' : 'Crear anuncio'}
          variant="dark"
          disabled={!valido}
          loading={pendiente === 'guardar'}
          onPress={() =>
            ejecutar('guardar', async () => {
              await guardarAnuncio(form);
              setForm(VACIO);
            })
          }
          style={{ flex: 1 }}
        />
      </View>
      {form.id ? (
        <Pressable onPress={() => setForm(VACIO)}>
          <Text style={styles.link}>Cancelar edición</Text>
        </Pressable>
      ) : null}
    </Card>
  );

  const listado = (
    <Card title="Tus anuncios" style={isWide ? { flex: 1, minWidth: 0 } : undefined}>
      {!lista ? (
        <ActivityIndicator color={colors.ink} />
      ) : lista.length ? (
        lista.map((a) => (
          <View key={a.id} style={styles.item}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={styles.audienciaTitle} numberOfLines={1}>
                {a.titulo}
              </Text>
              <Text style={styles.muted} numberOfLines={1}>
                Para: {a.audiencia.map((x) => AUDIENCIAS.find((y) => y.id === x)?.label ?? x).join(', ')}
              </Text>
            </View>
            <Badge label={a.activo ? 'Activo' : 'Pausado'} tone={a.activo ? 'success' : 'neutral'} />
            <View style={styles.itemAcciones}>
              <BotonChico title="Editar" variant="outline" onPress={() => editar(a)} />
              <BotonChico
                title={a.activo ? 'Pausar' : 'Activar'}
                variant={a.activo ? 'outline' : 'accent'}
                loading={pendiente === `act-${a.id}`}
                onPress={() => ejecutar(`act-${a.id}`, () => guardarAnuncio({ ...a, activo: !a.activo }))}
              />
              <BotonChico
                title="Borrar"
                variant="danger"
                loading={pendiente === `del-${a.id}`}
                onPress={async () => {
                  if (await confirmar(`¿Borrar el anuncio "${a.titulo}"?`))
                    ejecutar(`del-${a.id}`, () => borrarAnuncio(a.id));
                }}
              />
            </View>
          </View>
        ))
      ) : (
        <Vacio texto="Todavía no hay anuncios. Creá el primero con el formulario." />
      )}
    </Card>
  );

  return (
    <EmpresaShell
      active="anuncios"
      empresa={null}
      title="Anuncios"
      subtitle="Pop-ups para promociones, novedades o avisos.">
      <View style={[styles.columns, !isWide && { flexDirection: 'column' }]}>
        {editor}
        {listado}
      </View>
      {preview ? <AnuncioModal anuncio={comoAnuncio} onClose={() => setPreview(false)} preview /> : null}
    </EmpresaShell>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  max,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        maxLength={max}
        multiline={multiline}
        accessibilityLabel={label}
        autoCapitalize="none"
        style={[styles.input, multiline && { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  input: {
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
  },
  audiencias: { gap: 8 },
  audiencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  audienciaOn: { borderColor: colors.ink, backgroundColor: '#FAFAF8' },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  audienciaTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  link: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  item: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  itemAcciones: { flexDirection: 'row', gap: 6 },
});
