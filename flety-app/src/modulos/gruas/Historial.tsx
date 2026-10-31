import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Segmented } from '@/components/pedido/Choice';
import { formatARS } from '@/lib/pricing';
import { IconoGrua } from '@/plataforma/IconoGrua';
import { colors, fonts } from '@/theme';

import { ESTADOS_ACTIVOS } from './estados';
import { useMisSolicitudesGrua } from './hooks';
import { RUTA_PEDIR_GRUA } from './nav';
import type { Solicitud } from './tipos';
import { EstadoBadge, G } from './ui';

type Grupo = 'en_curso' | 'terminados' | 'cancelados';

const VACIO: Record<Grupo, string> = {
  en_curso: 'No tenés grúas en curso.',
  terminados: 'Todavía no usaste ninguna grúa.',
  cancelados: 'No tenés servicios de grúa cancelados.',
};

const fecha = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function grupoGrua(s: Solicitud): Grupo {
  if (ESTADOS_ACTIVOS.includes(s.estado)) return 'en_curso';
  return s.estado === 'finalizada' ? 'terminados' : 'cancelados';
}

// Historial de grúas del cliente (pestaña "Grúas" de Actividad).
export function HistorialGruas() {
  const { solicitudes, cargando, error } = useMisSolicitudesGrua();
  const enCurso = solicitudes.filter((s) => grupoGrua(s) === 'en_curso');
  const [elegido, setElegido] = useState<Grupo | null>(null);
  const grupo = elegido ?? (enCurso.length ? 'en_curso' : 'terminados');
  const lista = solicitudes.filter((s) => grupoGrua(s) === grupo);

  return (
    <>
      <Segmented
        options={[
          { value: 'en_curso', label: `En curso${enCurso.length ? ` · ${enCurso.length}` : ''}` },
          { value: 'terminados', label: 'Terminados' },
          { value: 'cancelados', label: 'Cancelados' },
        ]}
        value={grupo}
        onChange={setElegido}
      />
      {cargando ? (
        <ActivityIndicator color={G.acento} style={{ marginTop: 20 }} />
      ) : error ? (
        <Text style={styles.vacioText}>{error}</Text>
      ) : lista.length ? (
        <View style={{ gap: 10 }}>
          {lista.map((s) => (
            <TarjetaSolicitud key={s.id} s={s} />
          ))}
        </View>
      ) : (
        <View style={styles.vacio}>
          <IconoGrua size={36} color={G.acento} />
          <Text style={styles.vacioText}>{VACIO[grupo]}</Text>
          {grupo !== 'cancelados' ? (
            <Pressable accessibilityRole="button" onPress={() => router.push(RUTA_PEDIR_GRUA)} style={styles.vacioBtn}>
              <Text style={styles.vacioBtnText}>Pedir una grúa</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </>
  );
}

function TarjetaSolicitud({ s }: { s: Solicitud }) {
  const precio = s.precio_total ?? s.precio_max;
  const vehiculo = [s.vehiculo.marca, s.vehiculo.modelo].filter(Boolean).join(' ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/gruas/[id]', params: { id: s.id } })}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.icono}>
        <IconoGrua size={20} color={G.texto} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={styles.filaTop}>
          <Text style={styles.fecha} numberOfLines={1}>
            {fecha.format(new Date(s.created_at))}
          </Text>
          <EstadoBadge estado={s.estado} />
        </View>
        <Text style={styles.direccion} numberOfLines={1}>
          {s.origen.direccion ?? 'Ubicación del vehículo'}
        </Text>
        <Text style={styles.detalle} numberOfLines={1}>
          {['→ ' + (s.destino?.direccion ?? 'Destino'), vehiculo].filter(Boolean).join(' · ')}
        </Text>
        {precio != null ? <Text style={styles.precio}>{formatARS(precio)}</Text> : null}
      </View>
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: G.suave,
  },
  filaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  fecha: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  direccion: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  detalle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  precio: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  vacio: { alignItems: 'center', gap: 12, paddingVertical: 30 },
  vacioText: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, textAlign: 'center' },
  vacioBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999, backgroundColor: G.acento },
  vacioBtnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
});
