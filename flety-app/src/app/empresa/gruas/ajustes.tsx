import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { BotonChico, Card } from '@/components/empresa/ui';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useAuth } from '@/lib/auth';
import { catalogo as cargarCatalogo, config as cargarConfig, guardarConfig, guardarZona } from '@/modulos/gruas/api';
import type { Zona } from '@/modulos/gruas/tipos';
import { G } from '@/modulos/gruas/ui';
import { colors, fonts, radius } from '@/theme';

type Config = Record<string, unknown>;

const NUMEROS: { clave: string; label: string; ayuda: string; sufijo: string }[] = [
  {
    clave: 'comision_pct',
    label: 'Comisión de la plataforma',
    ayuda: 'Se suma a la tarifa del gruista.',
    sufijo: '%',
  },
  { clave: 'segundos_oferta', label: 'Tiempo para aceptar', ayuda: 'Por cada grúa a la que se ofrece.', sufijo: 'seg' },
  { clave: 'radio_km', label: 'Radio de búsqueda', ayuda: 'Distancia máxima de la grúa al vehículo.', sufijo: 'km' },
  { clave: 'max_ofertas', label: 'Grúas a consultar', ayuda: 'Antes de avisar “sin grúa”.', sufijo: '' },
  { clave: 'velocidad_kmh', label: 'Velocidad promedio', ayuda: 'Para estimar la llegada.', sufijo: 'km/h' },
];

const CANCELACION: { clave: string; label: string }[] = [
  { clave: 'asignada', label: 'Grúa asignada' },
  { clave: 'en_camino', label: 'Grúa en camino' },
  { clave: 'en_origen', label: 'Grúa en el lugar' },
];

const soloNum = (v: string) => v.replace(/[^\d.]/g, '').slice(0, 6);

// Superadmin · Grúas: reglas del negocio (comisión, despacho, cancelación) y
// zonas de cobertura. Todo independiente de Mudanzas.
export default function AjustesGruas() {
  const { role } = useAuth();
  const [version, setVersion] = useState(0);
  const [res, setRes] = useState<{ config: Config; zonas: Zona[]; error: string | null } | null>(null);

  useEffect(() => {
    if (role !== 'superadmin') return;
    let cancelled = false;
    Promise.all([cargarConfig(), cargarCatalogo(true)])
      .then(([config, cat]) => !cancelled && setRes({ config, zonas: cat.zonas, error: null }))
      .catch((e: Error) => !cancelled && setRes({ config: {}, zonas: [], error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [role, version]);

  if (role && role !== 'superadmin') return <Redirect href="/empresa/panel" />;

  return (
    <EmpresaShell
      active="gruasAjustes"
      empresa={null}
      title="Grúas · Ajustes"
      subtitle="Comisión, reglas del despacho, cancelaciones y zonas."
      aviso={res?.error}>
      <View style={{ maxWidth: 900, width: '100%', gap: 16 }}>
        {res ? (
          <>
            <Reglas key={`r-${version}`} config={res.config} onGuardado={() => setVersion((v) => v + 1)} />
            <Zonas key={`z-${version}`} zonas={res.zonas} onGuardado={() => setVersion((v) => v + 1)} />
          </>
        ) : (
          <Card>
            <Text style={styles.muted}>Cargando…</Text>
          </Card>
        )}
      </View>
    </EmpresaShell>
  );
}

function Reglas({ config, onGuardado }: { config: Config; onGuardado: () => void }) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(NUMEROS.map((n) => [n.clave, String(config[n.clave] ?? '')]))
  );
  const canc = (config.cancelacion ?? {}) as Record<string, number>;
  const [cancelacion, setCancelacion] = useState<Record<string, string>>(() =>
    Object.fromEntries(CANCELACION.map((c) => [c.clave, String(canc[c.clave] ?? 0)]))
  );
  const [exigir, setExigir] = useState(config.exigir_documentos !== false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      for (const n of NUMEROS) {
        const v = Number(valores[n.clave]);
        if (!Number.isFinite(v) || v < 0) throw new Error(`Revisá “${n.label}”.`);
        await guardarConfig(n.clave, v);
      }
      await guardarConfig('exigir_documentos', exigir);
      await guardarConfig('cancelacion', {
        buscando: 0,
        ...Object.fromEntries(CANCELACION.map((c) => [c.clave, Math.min(100, Number(cancelacion[c.clave]) || 0)])),
      });
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card title="Reglas del negocio">
      <View style={styles.grilla}>
        {NUMEROS.map((n) => (
          <View key={n.clave} style={styles.campo}>
            <Text style={styles.label}>{n.label}</Text>
            <View style={styles.inputFila}>
              <TextInput
                accessibilityLabel={n.label}
                value={valores[n.clave]}
                onChangeText={(v) => setValores((x) => ({ ...x, [n.clave]: soloNum(v) }))}
                keyboardType="decimal-pad"
                style={[styles.input, { flex: 1 }]}
              />
              {n.sufijo ? <Text style={styles.sufijo}>{n.sufijo}</Text> : null}
            </View>
            <Text style={styles.muted}>{n.ayuda}</Text>
          </View>
        ))}
      </View>

      <View style={styles.switchFila}>
        <View style={{ flex: 1 }}>
          <Text style={styles.texto}>Exigir documentos verificados y vigentes</Text>
          <Text style={styles.muted}>Licencia profesional y seguro de la grúa para recibir pedidos.</Text>
        </View>
        <Switch value={exigir} onValueChange={setExigir} trackColor={{ true: G.acento, false: colors.line }} />
      </View>

      <Text style={[styles.label, { marginTop: 6 }]}>Cargo por cancelación del cliente (% del precio)</Text>
      <View style={styles.grilla}>
        {CANCELACION.map((c) => (
          <View key={c.clave} style={styles.campo}>
            <Text style={styles.muted}>{c.label}</Text>
            <View style={styles.inputFila}>
              <TextInput
                accessibilityLabel={`Cargo con ${c.label}`}
                value={cancelacion[c.clave]}
                onChangeText={(v) => setCancelacion((x) => ({ ...x, [c.clave]: soloNum(v).slice(0, 3) }))}
                keyboardType="number-pad"
                style={[styles.input, { flex: 1 }]}
              />
              <Text style={styles.sufijo}>%</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.muted}>Mientras se busca grúa, cancelar es siempre gratis.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ alignSelf: 'flex-start' }}>
        <BotonChico title="Guardar reglas" variant="dark" loading={guardando} onPress={guardar} />
      </View>
    </Card>
  );
}

function Zonas({ zonas, onGuardado }: { zonas: Zona[]; onGuardado: () => void }) {
  const [nueva, setNueva] = useState({ provincia: '', ciudad: '', lat: '', lng: '' });
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activas = zonas.filter((z) => z.activa).length;

  async function guardar(id: string, fn: () => Promise<unknown>) {
    setGuardando(id);
    setError(null);
    try {
      await fn();
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar la zona.');
    } finally {
      setGuardando(null);
    }
  }

  const latOk = Number.isFinite(Number(nueva.lat)) && nueva.lat !== '' && Math.abs(Number(nueva.lat)) <= 90;
  const lngOk = Number.isFinite(Number(nueva.lng)) && nueva.lng !== '' && Math.abs(Number(nueva.lng)) <= 180;

  return (
    <Card title={`Zonas de cobertura · ${activas} activa${activas === 1 ? '' : 's'}`}>
      <Text style={styles.muted}>
        Los clientes solo pueden pedir grúa dentro de una zona activa. Activá una ciudad cuando tenga gruistas
        aprobados.
      </Text>
      {zonas.map((z) => (
        <FilaZona
          key={z.id}
          z={z}
          guardando={guardando === z.id}
          onGuardar={(c) => guardar(z.id, () => guardarZona({ ...z, ...c }))}
        />
      ))}

      <Text style={[styles.label, { marginTop: 8 }]}>Sumar una ciudad</Text>
      <View style={styles.grilla}>
        <TextInput
          placeholder="Provincia"
          placeholderTextColor={colors.muted}
          value={nueva.provincia}
          onChangeText={(v) => setNueva((n) => ({ ...n, provincia: v }))}
          style={[styles.input, styles.campo]}
        />
        <TextInput
          placeholder="Ciudad"
          placeholderTextColor={colors.muted}
          value={nueva.ciudad}
          onChangeText={(v) => setNueva((n) => ({ ...n, ciudad: v }))}
          style={[styles.input, styles.campo]}
        />
        <TextInput
          placeholder="Latitud (-32.89)"
          placeholderTextColor={colors.muted}
          value={nueva.lat}
          onChangeText={(v) => setNueva((n) => ({ ...n, lat: v.replace(/[^\d.-]/g, '') }))}
          style={[styles.input, styles.campo]}
        />
        <TextInput
          placeholder="Longitud (-68.84)"
          placeholderTextColor={colors.muted}
          value={nueva.lng}
          onChangeText={(v) => setNueva((n) => ({ ...n, lng: v.replace(/[^\d.-]/g, '') }))}
          style={[styles.input, styles.campo]}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ alignSelf: 'flex-start' }}>
        <BotonChico
          title="Agregar zona"
          variant="outline"
          loading={guardando === 'nueva'}
          disabled={nueva.provincia.trim().length < 2 || nueva.ciudad.trim().length < 2 || !latOk || !lngOk}
          onPress={() =>
            guardar('nueva', async () => {
              await guardarZona({ ...nueva, lat: Number(nueva.lat), lng: Number(nueva.lng) });
              setNueva({ provincia: '', ciudad: '', lat: '', lng: '' });
            })
          }
        />
      </View>
    </Card>
  );
}

function FilaZona({ z, guardando, onGuardar }: { z: Zona; guardando: boolean; onGuardar: (c: Partial<Zona>) => void }) {
  const [radio, setRadio] = useState(String(z.radio_km));
  const [recargo, setRecargo] = useState(String(z.recargo_pct));
  const [comision, setComision] = useState(z.comision_pct == null ? '' : String(z.comision_pct));
  const cambio =
    radio !== String(z.radio_km) ||
    recargo !== String(z.recargo_pct) ||
    comision !== (z.comision_pct == null ? '' : String(z.comision_pct));

  return (
    <View style={styles.zona}>
      <View style={{ flex: 1, minWidth: 160 }}>
        <Text style={styles.texto}>{z.ciudad}</Text>
        <Text style={styles.muted}>{z.provincia}</Text>
      </View>
      <View style={styles.zonaCampo}>
        <Text style={styles.muted}>Radio km</Text>
        <TextInput
          accessibilityLabel={`Radio de ${z.ciudad}`}
          value={radio}
          onChangeText={(v) => setRadio(soloNum(v))}
          style={styles.inputChico}
        />
      </View>
      <View style={styles.zonaCampo}>
        <Text style={styles.muted}>Recargo %</Text>
        <TextInput
          accessibilityLabel={`Recargo de ${z.ciudad}`}
          value={recargo}
          onChangeText={(v) => setRecargo(soloNum(v))}
          style={styles.inputChico}
        />
      </View>
      <View style={styles.zonaCampo}>
        <Text style={styles.muted}>Comisión %</Text>
        <TextInput
          accessibilityLabel={`Comisión de ${z.ciudad}`}
          value={comision}
          placeholder="general"
          placeholderTextColor={colors.muted}
          onChangeText={(v) => setComision(soloNum(v))}
          style={styles.inputChico}
        />
      </View>
      {cambio ? (
        <BotonChico
          title="Guardar"
          variant="dark"
          loading={guardando}
          onPress={() =>
            onGuardar({
              radio_km: Number(radio) || z.radio_km,
              recargo_pct: Number(recargo) || 0,
              comision_pct: comision === '' ? null : Number(comision),
            })
          }
        />
      ) : null}
      <Switch
        accessibilityLabel={`Zona ${z.ciudad} activa`}
        value={z.activa}
        disabled={guardando}
        onValueChange={(v) => onGuardar({ activa: v })}
        trackColor={{ true: G.acento, false: colors.line }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  campo: { flexGrow: 1, flexBasis: 180, gap: 4 },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  texto: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  inputFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  inputChico: {
    width: 76,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
  },
  sufijo: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  switchFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zona: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  zonaCampo: { gap: 2 },
});
