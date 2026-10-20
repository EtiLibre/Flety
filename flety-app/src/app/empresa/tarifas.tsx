import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/empresa/ui';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useEmpresa } from '@/hooks/use-empresa';
import { useIsWide } from '@/hooks/use-is-wide';
import { guardarTarifas, tarifasDeEmpresa } from '@/lib/marketplace';
import { fetchTarifas, formatARS, precioEstimado, type Tarifa } from '@/lib/pricing';
import { VEHICULO_LABEL, type Vehiculo } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

const VEHICULOS: Vehiculo[] = ['utilitario', 'camioneta', 'camion'];
const CAMPOS: { key: 'base' | 'por_km' | 'por_ayudante'; label: string }[] = [
  { key: 'base', label: 'Base' },
  { key: 'por_km', label: 'Por km' },
  { key: 'por_ayudante', label: 'Por ayudante' },
];

type Form = Record<Vehiculo, Record<'base' | 'por_km' | 'por_ayudante', string>>;

// Cada empresa define sus precios: con esto se calcula lo que ve el cliente en
// el marketplace al elegir uno de sus choferes. Sin cargar, se usan los de Flety.
export default function TarifasEmpresa() {
  const isWide = useIsWide();
  const { empresa, esAdmin } = useEmpresa();
  const [flety, setFlety] = useState<Tarifa[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  const companyId = empresa?.id ?? null;
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    Promise.all([fetchTarifas(), tarifasDeEmpresa(companyId)]).then(([base, propias]) => {
      if (cancelled) return;
      setFlety(base);
      const inicial = {} as Form;
      for (const v of VEHICULOS) {
        const t = propias.find((x) => x.vehiculo === v) ?? base.find((x) => x.vehiculo === v);
        inicial[v] = {
          base: t ? String(t.base) : '',
          por_km: t ? String(t.por_km) : '',
          por_ayudante: t ? String(t.por_ayudante) : '',
        };
      }
      setForm(inicial);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  function cambiar(v: Vehiculo, campo: keyof Form[Vehiculo], valor: string) {
    setMensaje(null);
    setForm((f) => (f ? { ...f, [v]: { ...f[v], [campo]: valor.replace(/[^0-9]/g, '') } } : f));
  }

  async function guardar() {
    if (!form || !companyId) return;
    setGuardando(true);
    setMensaje(null);
    try {
      await guardarTarifas(
        companyId,
        VEHICULOS.map((v) => ({
          vehiculo: v,
          base: Number(form[v].base || 0),
          por_km: Number(form[v].por_km || 0),
          por_ayudante: Number(form[v].por_ayudante || 0),
        }))
      );
      setMensaje({ ok: true, texto: 'Listo: los clientes ya ven tus precios nuevos.' });
    } catch (e) {
      setMensaje({ ok: false, texto: e instanceof Error ? e.message : 'No pudimos guardar.' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <EmpresaShell
      active="tarifas"
      empresa={empresa}
      title="Tarifas"
      subtitle="Lo que cobra tu empresa. Con esto se calcula el precio que ve el cliente al elegir a uno de tus choferes.">
      {esAdmin ? (
        <Text style={styles.texto}>Las tarifas las carga cada empresa desde su panel.</Text>
      ) : !form ? (
        <ActivityIndicator color={colors.ink} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={[styles.grid, !isWide && { flexDirection: 'column' }]}>
            {VEHICULOS.map((v) => {
              const t = {
                vehiculo: v,
                base: Number(form[v].base || 0),
                por_km: Number(form[v].por_km || 0),
                por_ayudante: Number(form[v].por_ayudante || 0),
              };
              const ref = flety.find((x) => x.vehiculo === v);
              return (
                <Card key={v} title={VEHICULO_LABEL[v].titulo} style={isWide ? styles.col : undefined}>
                  <Text style={styles.muted}>{VEHICULO_LABEL[v].detalle}</Text>
                  {CAMPOS.map(({ key, label }) => (
                    <View key={key} style={styles.campo}>
                      <Text style={styles.label}>{label}</Text>
                      <View style={styles.inputWrap}>
                        <Text style={styles.peso}>$</Text>
                        <TextInput
                          value={form[v][key]}
                          onChangeText={(valor) => cambiar(v, key, valor)}
                          keyboardType="number-pad"
                          accessibilityLabel={`${label} para ${VEHICULO_LABEL[v].titulo}`}
                          placeholder={ref ? String(ref[key]) : '0'}
                          placeholderTextColor={colors.muted}
                          style={styles.input}
                        />
                      </View>
                    </View>
                  ))}
                  <View style={styles.ejemplo}>
                    <Text style={styles.muted}>Ejemplo: 8 km con 1 ayudante</Text>
                    <Text style={styles.ejemploValor}>{formatARS(precioEstimado(t, 8, 1))}</Text>
                  </View>
                </Card>
              );
            })}
          </View>
          {mensaje ? (
            <Text style={[styles.mensaje, !mensaje.ok && { color: colors.danger }]}>{mensaje.texto}</Text>
          ) : null}
          <Button title="Guardar tarifas" variant="dark" loading={guardando} onPress={guardar} style={styles.guardar} />
          <Text style={styles.muted}>
            Los pedidos que van a la cola abierta (“cualquier empresa”) usan el precio estimado de Flety.
          </Text>
        </>
      )}
    </EmpresaShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  col: { flex: 1, minWidth: 0 },
  texto: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  campo: { gap: 6 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  peso: { fontFamily: fonts.semibold, fontSize: 16, color: colors.muted },
  input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, minWidth: 0 },
  ejemplo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  ejemploValor: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  mensaje: { fontFamily: fonts.semibold, fontSize: 14, color: colors.success },
  guardar: { alignSelf: 'flex-start', paddingHorizontal: 28 },
});
