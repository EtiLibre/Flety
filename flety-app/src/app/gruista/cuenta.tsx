import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowLeftRight, Camera, FileText, LayoutGrid, Tag, Truck, Users } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { CuentaForm, FilaCuenta } from '@/components/cuenta/CuentaForm';
import { PantallaTab } from '@/components/nav/PantallaTab';
import { useAuth } from '@/lib/auth';
import { ROLE_HOME } from '@/lib/types';
import { cambiarFoto, urlFoto } from '@/modulos/gruas/api';
import { useMiGruista } from '@/modulos/gruas/hooks';
import { irGruista } from '@/modulos/gruas/nav';
import { estilosGruista as eg } from '@/modulos/gruas/pantalla';
import { G } from '@/modulos/gruas/ui';
import { colors, fonts } from '@/theme';

const ESTADO = {
  pendiente: 'Alta en revisión',
  aprobado: 'Gruista aprobado',
  rechazado: 'Alta rechazada',
  suspendido: 'Cuenta suspendida',
} as const;

export default function CuentaGruista() {
  const { role, nombre } = useAuth();
  const { gruista, recargar } = useMiGruista();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = gruista?.prestador;
  const foto = urlFoto(p?.foto);
  const gestiona = !!gruista && (!p?.empresa_id || gruista.esDueno);

  async function elegirFoto() {
    if (!p) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setSubiendo(true);
    setError(null);
    try {
      await cambiarFoto(
        p.id,
        { uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg', fileName: a.fileName ?? 'foto.jpg', file: a.file },
        p.foto
      );
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos subir la foto.');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <PantallaTab
      titulo="Cuenta"
      subtitulo={p ? `${ESTADO[p.estado]}${gruista?.empresa ? ` · ${gruista.empresa.nombre}` : ''}` : undefined}
      tema="oscuro">
      {p ? (
        <View style={styles.perfil}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cambiar foto de perfil"
            onPress={elegirFoto}
            style={styles.avatar}>
            {foto ? <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            {subiendo ? (
              <ActivityIndicator color={colors.white} />
            ) : foto ? null : (
              <Camera size={24} color={colors.white} />
            )}
          </Pressable>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={eg.fuerte}>{nombre ?? 'Gruista'}</Text>
            <Text style={eg.muted}>
              {foto ? 'Tocá la foto para cambiarla.' : 'Subí una foto: la ve el cliente cuando vas en camino.'}
            </Text>
            {error ? <Text style={eg.error}>{error}</Text> : null}
          </View>
        </View>
      ) : null}
      <CuentaForm tema="oscuro">
        {gruista ? (
          <>
            <FilaCuenta
              tema="oscuro"
              Icon={Truck}
              titulo="Mi grúa"
              detalle={gruista.unidad ? gruista.unidad.patente : 'Cargá tu grúa'}
              onPress={() => irGruista('unidad')}
            />
            <FilaCuenta
              tema="oscuro"
              Icon={FileText}
              titulo="Mis documentos"
              detalle="Licencia, seguro, VTV y habilitación"
              onPress={() => irGruista('documentos')}
            />
            {gestiona ? (
              <FilaCuenta
                tema="oscuro"
                Icon={Tag}
                titulo={gruista.esDueno ? 'Tarifas de la empresa' : 'Mis tarifas'}
                detalle="Salida, km, recargos y adicionales"
                onPress={() => irGruista('tarifas')}
              />
            ) : null}
            {gruista.esDueno ? (
              <FilaCuenta
                tema="oscuro"
                Icon={LayoutGrid}
                titulo="Panel de la empresa"
                detalle="Servicios, gruistas y tarifas de tu empresa de grúas"
                onPress={() => router.push('/empresa-gruas' as never)}
              />
            ) : null}
            {gruista.esDueno ? (
              <FilaCuenta
                tema="oscuro"
                Icon={Users}
                titulo="Mi flota"
                detalle="Gruistas de tu empresa y códigos de invitación"
                onPress={() => irGruista('flota')}
              />
            ) : null}
          </>
        ) : null}
        {role ? (
          <FilaCuenta
            tema="oscuro"
            Icon={ArrowLeftRight}
            titulo="Volver a Flety"
            detalle="Pedir fletes y grúas como cliente"
            onPress={() => router.replace(ROLE_HOME[role])}
          />
        ) : null}
      </CuentaForm>
    </PantallaTab>
  );
}

const styles = StyleSheet.create({
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: G.acento,
  },
  nombre: { fontFamily: fonts.bold, fontSize: 16 },
});
