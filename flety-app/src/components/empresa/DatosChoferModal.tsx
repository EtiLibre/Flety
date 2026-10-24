import { Lock, Phone, ShieldCheck, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AvatarFletero } from '@/components/AvatarFletero';
import { describirVehiculoChofer } from '@/components/empresa/ui';
import { nombreChofer, type Chofer } from '@/lib/empresa';
import { completitud, datosPrivados, edad, fechaAVista, fotoPerfil, type DatosPrivados } from '@/lib/perfilChofer';
import {
  diasParaVencer,
  ESTADO_SEGURO,
  estadoPoliza,
  polizasDelChofer,
  resumenSeguro,
  type Poliza,
} from '@/lib/seguros';
import { colors, fonts, radius } from '@/theme';

type Carga = {
  id: string;
  foto: string | null;
  datos: DatosPrivados | null;
  error: string | null;
  polizas: Poliza[];
};

// Ficha del chofer para su empresa (y el superadmin): datos personales que
// cargó en "Mi perfil". Los clientes nunca ven esto.
export function DatosChoferModal({ chofer, onClose }: { chofer: Chofer | null; onClose: () => void }) {
  return (
    <Modal visible={!!chofer} transparent animationType="fade" onRequestClose={onClose}>
      {chofer ? <Ficha chofer={chofer} onClose={onClose} /> : null}
    </Modal>
  );
}

function Ficha({ chofer, onClose }: { chofer: Chofer; onClose: () => void }) {
  const [carga, setCarga] = useState<Carga | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fotoPerfil(chofer.id).catch(() => null),
      polizasDelChofer(chofer.id).catch(() => [] as Poliza[]),
      datosPrivados(chofer.id)
        .then((datos) => ({ datos, error: null }))
        .catch((e: Error) => ({ datos: null, error: e.message })),
    ]).then(([foto, polizas, r]) => !cancelled && setCarga({ id: chofer.id, foto, polizas, ...r }));
    return () => {
      cancelled = true;
    };
  }, [chofer.id]);

  const c = carga?.id === chofer.id ? carga : null;
  const nombre = nombreChofer(chofer);
  const dd = c?.datos ?? null;
  const { hechos, total, completo } = completitud(dd);
  const vencida = !!dd?.licencia_vencimiento && new Date(`${dd.licencia_vencimiento}T23:59:59`) < new Date();

  return (
    <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar ficha">
      <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={styles.close}>
          <X size={20} color={colors.ink} strokeWidth={2.3} />
        </Pressable>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.cabecera}>
            <AvatarFletero nombre={nombre} foto={c?.foto} tam={64} textStyle={styles.avatarText} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={styles.nombre}>{nombre}</Text>
              {chofer.email ? <Text style={styles.muted}>{chofer.email}</Text> : null}
              <Text style={styles.muted}>{describirVehiculoChofer(chofer)}</Text>
            </View>
          </View>

          {c ? <SeguroChofer polizas={c.polizas} /> : null}

          <View style={styles.privado}>
            <Lock size={14} color={colors.muted} strokeWidth={2.2} />
            <Text style={[styles.muted, { flex: 1 }]}>
              Datos privados: los ven el chofer, tu empresa y Flety. Los clientes no.
            </Text>
          </View>

          {!c ? (
            <ActivityIndicator color={colors.ink} style={{ marginVertical: 30 }} />
          ) : c.error ? (
            <Text style={styles.error}>{c.error}</Text>
          ) : (
            <>
              <Text style={[styles.estado, completo ? styles.estadoOk : styles.estadoFalta]}>
                {completo ? 'Datos completos' : `Cargó ${hechos} de ${total} datos`}
              </Text>
              {!dd ? (
                <Text style={styles.muted}>Todavía no cargó sus datos. Pedile que complete “Mi perfil” en la app.</Text>
              ) : (
                <View style={styles.tabla}>
                  <Fila label="DNI" valor={dd.dni} />
                  <Fila
                    label="Nacimiento"
                    valor={
                      dd.fecha_nacimiento
                        ? `${fechaAVista(dd.fecha_nacimiento)} (${edad(dd.fecha_nacimiento)} años)`
                        : ''
                    }
                  />
                  <Fila label="Teléfono" valor={dd.telefono} telefono />
                  <Fila label="Domicilio" valor={[dd.domicilio, dd.localidad].filter(Boolean).join(', ')} />
                  <Fila
                    label="Licencia"
                    valor={[
                      dd.licencia_categoria && `Categoría ${dd.licencia_categoria}`,
                      dd.licencia_vencimiento && `vence ${fechaAVista(dd.licencia_vencimiento)}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    alerta={vencida ? 'Vencida' : null}
                  />
                  <Fila label="Emergencia" valor={dd.emergencia_nombre} />
                  <Fila label="Tel. emergencia" valor={dd.emergencia_telefono} telefono />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

function SeguroChofer({ polizas }: { polizas: Poliza[] }) {
  const resumen = resumenSeguro(polizas);
  const auto = polizas.find((p) => p.tipo === 'automotor' && estadoPoliza(p) !== 'vencido') ?? polizas[0];
  return (
    <View style={styles.seguro}>
      <ShieldCheck size={18} color={ESTADO_SEGURO[resumen].fg} strokeWidth={2.2} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[styles.seguroEstado, { color: ESTADO_SEGURO[resumen].fg }]}>{ESTADO_SEGURO[resumen].label}</Text>
        {auto ? (
          <Text style={styles.muted}>
            {auto.aseguradora} · Póliza {auto.numero_poliza} · vence {fechaAVista(auto.vigencia_hasta)}
            {diasParaVencer(auto.vigencia_hasta) >= 0 ? ` (${diasParaVencer(auto.vigencia_hasta)} días)` : ''}
          </Text>
        ) : (
          <Text style={styles.muted}>Pedile que cargue su póliza en Cuenta → Mi seguro.</Text>
        )}
      </View>
    </View>
  );
}

function Fila({
  label,
  valor,
  telefono,
  alerta,
}: {
  label: string;
  valor: string;
  telefono?: boolean;
  alerta?: string | null;
}) {
  return (
    <View style={styles.fila}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valorRow}>
        {valor ? (
          telefono ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(`tel:${valor.replace(/[^\d+]/g, '')}`)}
              style={styles.tel}>
              <Phone size={13} color={colors.ink} strokeWidth={2.2} />
              <Text style={[styles.valor, styles.link]}>{valor}</Text>
            </Pressable>
          ) : (
            <Text style={styles.valor}>{valor}</Text>
          )
        ) : (
          <Text style={styles.falta}>Sin cargar</Text>
        )}
        {alerta ? <Text style={styles.alerta}>{alerta}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,22,28,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    backgroundColor: colors.white,
    borderRadius: 28,
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
  },
  close: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 20, gap: 14 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: 44 },
  avatarText: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  nombre: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  seguro: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  seguroEstado: { fontFamily: fonts.bold, fontSize: 14 },
  privado: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  estado: {
    alignSelf: 'flex-start',
    fontFamily: fonts.bold,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  estadoOk: { backgroundColor: '#DCFCE7', color: '#166534' },
  estadoFalta: { backgroundColor: '#FEF3C7', color: '#92400E' },
  tabla: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  fila: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  label: { width: 110, fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  valorRow: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  valor: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  link: { textDecorationLine: 'underline' },
  tel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  falta: { fontFamily: fonts.regular, fontSize: 14, color: '#B45309' },
  alerta: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#B91C1C',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
});
