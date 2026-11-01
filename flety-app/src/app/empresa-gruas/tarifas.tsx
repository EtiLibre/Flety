import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PaginaPanelGruas } from '@/components/gruas-empresa/Pagina';
import { tarifasDe } from '@/modulos/gruas/api';
import { EditorTarifas, type DatosTarifas } from '@/modulos/gruas/EditorTarifas';
import { useCatalogoGruas } from '@/modulos/gruas/hooks';
import type { Catalogo } from '@/modulos/gruas/tipos';
import { G } from '@/modulos/gruas/ui';
import { colors, fonts } from '@/theme';

const VACIAS: DatosTarifas = { tarifas: [], recargos: null, adicionales: [] };

// Tarifas de la empresa (las usan todos sus gruistas). El cliente ve este
// precio más la comisión de Flety.
export default function TarifasEmpresaGruas() {
  const { catalogo } = useCatalogoGruas();
  return (
    <PaginaPanelGruas
      active="tarifas"
      title="Tarifas"
      subtitle="Lo que cobra tu empresa por tipo de vehículo. El cliente ve este precio más la comisión de Flety.">
      {({ demo, empresa }) =>
        !catalogo ? (
          <ActivityIndicator color={G.acento} style={{ marginTop: 20 }} />
        ) : demo ? (
          <Contenedor>
            <EditorTarifas
              tiposIniciales={['auto', 'camioneta', 'moto']}
              dueno={{ empresa_id: empresa.id, prestador_id: null }}
              catalogo={catalogo}
              datos={VACIAS}
              soloVer
            />
          </Contenedor>
        ) : (
          <TarifasReales empresaId={empresa.id} catalogo={catalogo} />
        )
      }
    </PaginaPanelGruas>
  );
}

function TarifasReales({ empresaId, catalogo }: { empresaId: string; catalogo: Catalogo }) {
  const [res, setRes] = useState<{ id: string; datos: DatosTarifas | null; error: string | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    tarifasDe({ empresa_id: empresaId, prestador_id: null })
      .then((datos) => !cancelled && setRes({ id: empresaId, datos, error: null }))
      .catch((e: Error) => !cancelled && setRes({ id: empresaId, datos: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [empresaId]);
  const actual = res?.id === empresaId ? res : null;
  if (actual?.error) return <Text style={styles.error}>{actual.error}</Text>;
  if (!actual?.datos) return <ActivityIndicator color={G.acento} style={{ marginTop: 20 }} />;
  return (
    <Contenedor>
      <EditorTarifas
        tiposIniciales={actual.datos.tarifas.map((t) => t.tipo_vehiculo)}
        dueno={{ empresa_id: empresaId, prestador_id: null }}
        catalogo={catalogo}
        datos={actual.datos}
      />
    </Contenedor>
  );
}

// El editor es el mismo de la app del gruista (tema oscuro).
function Contenedor({ children }: { children: React.ReactNode }) {
  return <View style={styles.contenedor}>{children}</View>;
}

const styles = StyleSheet.create({
  contenedor: { maxWidth: 760, width: '100%', padding: 18, borderRadius: 22, backgroundColor: colors.dark.bg },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
});
