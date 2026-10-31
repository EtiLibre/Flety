import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { FileText, ImageIcon, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { confirmar } from '@/lib/confirm';
import type { FotoLocal } from '@/lib/pedido-draft';
import { fechaAVista, fechaDeVista, mascaraFecha } from '@/lib/perfilChofer';
import { borrarDocumento, subirDocumento, urlDocumento } from '@/modulos/gruas/api';
import { TIPO_DOCUMENTO } from '@/modulos/gruas/estados';
import { useMiGruista } from '@/modulos/gruas/hooks';
import { Campo, estilosGruista as eg, Subpantalla, Tarjeta } from '@/modulos/gruas/pantalla';
import type { Documento, TipoDocumento } from '@/modulos/gruas/tipos';
import { G } from '@/modulos/gruas/ui';
import { colors, fonts, radius } from '@/theme';

const d = colors.dark;

const ESTADO_DOC: Record<Documento['estado'], { label: string; color: string }> = {
  pendiente: { label: 'En revisión', color: G.acento },
  verificado: { label: 'Verificado', color: '#4ADE80' },
  rechazado: { label: 'Rechazado', color: '#FF8A80' },
};

function vencido(doc: Documento) {
  return !!doc.vence && doc.vence < new Date().toISOString().slice(0, 10);
}

// Documentos del gruista: licencia, seguro, VTV, habilitación. Los revisa el
// equipo de la plataforma; los obligatorios vencidos frenan los pedidos.
export default function DocumentosGruista() {
  const { gruista, cargando, recargar } = useMiGruista();
  return (
    <Subpantalla
      titulo="Mis documentos"
      subtitulo="Los revisamos para aprobar tu cuenta. Avisamos antes de que venzan.">
      {cargando ? (
        <ActivityIndicator color={G.acento} />
      ) : !gruista ? (
        <Text style={eg.muted}>Primero date de alta como gruista.</Text>
      ) : (
        (Object.keys(TIPO_DOCUMENTO) as TipoDocumento[]).map((tipo) => (
          <TarjetaDocumento
            key={tipo}
            tipo={tipo}
            prestadorId={gruista.prestador.id}
            doc={gruista.documentos.find((x) => x.tipo === tipo) ?? null}
            onCambio={recargar}
          />
        ))
      )}
    </Subpantalla>
  );
}

function TarjetaDocumento({
  tipo,
  prestadorId,
  doc,
  onCambio,
}: {
  tipo: TipoDocumento;
  prestadorId: string;
  doc: Documento | null;
  onCambio: () => void;
}) {
  const info = TIPO_DOCUMENTO[tipo];
  const [archivo, setArchivo] = useState<FotoLocal | null>(null);
  const [vence, setVence] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isoVence = vence ? fechaDeVista(vence) : null;
  const listo = !!archivo && (!info.vence || !!isoVence);

  async function elegirFoto() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setArchivo({
      uri: a.uri,
      mimeType: a.mimeType ?? 'image/jpeg',
      fileName: a.fileName ?? `${tipo}.jpg`,
      file: a.file,
    });
  }

  async function elegirPdf() {
    const r = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setArchivo({ uri: a.uri, mimeType: a.mimeType ?? 'application/pdf', fileName: a.name, file: a.file });
  }

  async function guardar() {
    if (!archivo) return;
    setGuardando(true);
    setError(null);
    try {
      await subirDocumento(prestadorId, tipo, info.vence ? isoVence : null, archivo);
      setArchivo(null);
      setVence('');
      setAbierto(false);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos subir el documento.');
    } finally {
      setGuardando(false);
    }
  }

  async function ver() {
    if (!doc) return;
    const url = await urlDocumento(doc.archivo);
    if (url) Linking.openURL(url);
  }

  async function borrar() {
    if (!doc || !(await confirmar('¿Borrar este documento?'))) return;
    try {
      await borrarDocumento(doc);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos borrarlo.');
    }
  }

  const estado = doc ? (vencido(doc) ? { label: 'Vencido', color: '#FF8A80' } : ESTADO_DOC[doc.estado]) : null;

  return (
    <Tarjeta>
      <View style={styles.top}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={eg.fuerte}>{info.titulo}</Text>
          <Text style={eg.muted}>{info.obligatorio ? 'Obligatorio' : 'Opcional'}</Text>
        </View>
        {estado ? (
          <Text style={[styles.estado, { color: estado.color, borderColor: estado.color }]}>{estado.label}</Text>
        ) : null}
      </View>

      {doc ? (
        <View style={styles.doc}>
          <Pressable accessibilityRole="button" onPress={ver} style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.link}>Ver archivo</Text>
            {doc.vence ? <Text style={eg.muted}>Vence el {fechaAVista(doc.vence)}</Text> : null}
            {doc.estado === 'rechazado' && doc.motivo ? <Text style={eg.error}>{doc.motivo}</Text> : null}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Borrar documento" onPress={borrar} hitSlop={8}>
            <Trash2 size={18} color={d.muted} />
          </Pressable>
        </View>
      ) : null}

      {abierto ? (
        <View style={{ gap: 10 }}>
          <View style={eg.fila}>
            <Pressable accessibilityRole="button" onPress={elegirFoto} style={styles.subir}>
              <ImageIcon size={18} color={d.text} />
              <Text style={styles.subirTexto}>Foto</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={elegirPdf} style={styles.subir}>
              <FileText size={18} color={d.text} />
              <Text style={styles.subirTexto}>PDF</Text>
            </Pressable>
          </View>
          {archivo ? (
            <Text style={eg.muted} numberOfLines={1}>
              {archivo.fileName}
            </Text>
          ) : null}
          {info.vence ? (
            <Campo
              label="Vence el"
              value={vence}
              onChangeText={(v) => setVence(mascaraFecha(v))}
              keyboardType="number-pad"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              error={vence.length === 10 && !isoVence ? 'Revisá la fecha.' : null}
            />
          ) : null}
          {error ? <Text style={eg.error}>{error}</Text> : null}
          <Button title="Subir" variant="grua" loading={guardando} disabled={!listo} onPress={guardar} />
        </View>
      ) : (
        <Button title={doc ? 'Cargar uno nuevo' : 'Cargar'} variant="oscuro" onPress={() => setAbierto(true)} />
      )}
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  estado: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  doc: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  link: { fontFamily: fonts.bold, fontSize: 14, color: G.acento },
  subir: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: d.line,
    backgroundColor: d.chip,
  },
  subirTexto: { fontFamily: fonts.semibold, fontSize: 14, color: d.text },
});
