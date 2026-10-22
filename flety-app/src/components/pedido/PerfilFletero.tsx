import { ShieldCheck, Star, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { AvatarFletero } from '@/components/AvatarFletero';
import { FotoVehiculo } from '@/components/FotoVehiculo';
import { PatenteChip } from '@/components/VehiculoIlustracion';
import { perfilDeEjemplo, perfilFletero, type Fletero, type PerfilFletero } from '@/lib/marketplace';
import { formatARS } from '@/lib/pricing';
import { VEHICULO_LABEL } from '@/lib/types';
import { describirModelo } from '@/lib/vehiculos';
import { colors, fonts, radius } from '@/theme';

const mesAnio = new Intl.DateTimeFormat('es-AR', { month: 'short', year: 'numeric' });

function haceCuanto(fecha: string) {
  const dias = Math.max(0, Math.round((Date.now() - new Date(fecha).getTime()) / 86_400_000));
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.round(dias / 30);
  return meses === 1 ? 'hace un mes' : `hace ${meses} meses`;
}

export function Estrellitas({ valor, tam = 14 }: { valor: number; tam?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }} accessibilityLabel={`${valor} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={tam}
          color={n <= Math.round(valor) ? '#E8A400' : '#C9CED5'}
          fill={n <= Math.round(valor) ? colors.accent : 'transparent'}
          strokeWidth={2}
        />
      ))}
    </View>
  );
}

// Contenido del perfil (se usa en la ventana del marketplace y en el seguimiento).
export function PerfilContenido({ perfil }: { perfil: PerfilFletero }) {
  const v = perfil.vehiculo;
  const modelo = describirModelo(v);
  return (
    <View style={styles.contenido}>
      <View style={styles.cabecera}>
        <AvatarFletero
          nombre={perfil.nombre}
          foto={perfil.foto_perfil}
          tam={64}
          style={styles.avatar}
          textStyle={styles.avatarText}
        />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text style={styles.nombre}>{perfil.nombre}</Text>
          <View style={styles.empresaRow}>
            {perfil.empresa_verificada ? <ShieldCheck size={14} color={colors.success} strokeWidth={2.2} /> : null}
            <Text style={styles.empresa} numberOfLines={1}>
              {perfil.empresa}
              {perfil.empresa_verificada ? <Text style={styles.verificada}> · verificada</Text> : null}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          {perfil.calificaciones ? (
            <>
              <Text style={styles.statValor}>★ {perfil.estrellas?.toFixed(1)}</Text>
              <Text style={styles.statLabel}>{perfil.calificaciones} calificaciones</Text>
            </>
          ) : (
            <>
              <Text style={styles.statValor}>Nuevo</Text>
              <Text style={styles.statLabel}>sin calificaciones</Text>
            </>
          )}
        </View>
        <View style={styles.statSep} />
        <View style={styles.stat}>
          <Text style={styles.statValor}>{perfil.viajes}</Text>
          <Text style={styles.statLabel}>{perfil.viajes === 1 ? 'viaje' : 'viajes'}</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.stat}>
          <Text style={styles.statValor} numberOfLines={1}>
            {mesAnio.format(new Date(perfil.desde)).replace(' de ', ' ')}
          </Text>
          <Text style={styles.statLabel}>en Flety desde</Text>
        </View>
      </View>

      <View style={styles.vehiculo}>
        <FotoVehiculo vehiculo={v} tipo={v.tipo ?? 'camioneta'} />
        <View style={styles.vehiculoInfo}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={styles.vehiculoTipo}>{v.tipo ? VEHICULO_LABEL[v.tipo].titulo : 'Vehículo'}</Text>
            <Text style={styles.vehiculoModelo}>{modelo ?? 'Modelo sin cargar'}</Text>
          </View>
          {v.patente ? <PatenteChip patente={v.patente} tapada={!v.patente_completa} /> : null}
        </View>
        {v.patente && !v.patente_completa ? (
          <Text style={styles.nota}>La patente completa la ves cuando acepta tu pedido.</Text>
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <Text style={styles.seccion}>Reseñas</Text>
        {perfil.resenas.length ? (
          perfil.resenas.map((r, i) => (
            <View key={i} style={styles.resena}>
              <View style={styles.resenaTop}>
                <Estrellitas valor={r.estrellas} tam={13} />
                <Text style={styles.resenaFecha}>{haceCuanto(r.fecha)}</Text>
              </View>
              <Text style={styles.resenaTexto}>{r.comentario}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.vacio}>Todavía no tiene reseñas con comentarios.</Text>
        )}
      </View>
    </View>
  );
}

// Ventana del perfil desde el marketplace, con "Elegir a…" abajo.
export function PerfilFleteroModal({
  fletero,
  onClose,
  onElegir,
}: {
  fletero: Fletero | null;
  onClose: () => void;
  onElegir?: (f: Fletero) => void;
}) {
  return (
    <Modal visible={!!fletero} transparent animationType="fade" onRequestClose={onClose}>
      {fletero ? <Ventana fletero={fletero} onClose={onClose} onElegir={onElegir} /> : null}
    </Modal>
  );
}

function Ventana({
  fletero,
  onClose,
  onElegir,
}: {
  fletero: Fletero;
  onClose: () => void;
  onElegir?: (f: Fletero) => void;
}) {
  const [perfil, setPerfil] = useState<{ id: string; p: PerfilFletero | null } | null>(
    fletero.demo ? { id: fletero.driver_id, p: perfilDeEjemplo(fletero) } : null
  );

  useEffect(() => {
    if (fletero.demo) return;
    let cancelled = false;
    perfilFletero(fletero.driver_id).then((p) => !cancelled && setPerfil({ id: fletero.driver_id, p }));
    return () => {
      cancelled = true;
    };
  }, [fletero]);

  const actual = perfil?.id === fletero.driver_id ? perfil : null;

  return (
    <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar perfil">
      <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={styles.close}>
          <X size={20} color={colors.ink} strokeWidth={2.3} />
        </Pressable>
        <ScrollView contentContainerStyle={styles.scroll}>
          {!actual ? (
            <ActivityIndicator color={colors.ink} style={{ marginVertical: 40 }} />
          ) : actual.p ? (
            <PerfilContenido perfil={actual.p} />
          ) : (
            <Text style={styles.vacio}>No pudimos cargar el perfil de este fletero.</Text>
          )}
        </ScrollView>
        {onElegir ? (
          <View style={styles.footer}>
            <Button
              title={`Elegir a ${fletero.nombre}${fletero.precio != null ? ` · ${formatARS(fletero.precio)}` : ''}`}
              variant="dark"
              onPress={() => onElegir(fletero)}
            />
          </View>
        ) : null}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(18,22,28,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.2)',
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
  scroll: { padding: 20, paddingTop: 22 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  contenido: { gap: 18 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: 44 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  nombre: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.4, color: colors.ink },
  empresaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  empresa: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  verificada: { fontFamily: fonts.medium, color: colors.success },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 6 },
  statSep: { width: 1, height: 28, backgroundColor: colors.line },
  statValor: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, textAlign: 'center' },
  vehiculo: { gap: 10 },
  vehiculoInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehiculoTipo: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  vehiculoModelo: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  nota: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  seccion: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  resena: { gap: 6, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  resenaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resenaFecha: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  resenaTexto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  vacio: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
});
