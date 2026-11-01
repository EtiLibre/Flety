import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';

import { tarifasDe } from '@/modulos/gruas/api';
import { EditorTarifas, type DatosTarifas } from '@/modulos/gruas/EditorTarifas';
import { useCatalogoGruas, useMiGruista } from '@/modulos/gruas/hooks';
import { estilosGruista as eg, Subpantalla, Tarjeta } from '@/modulos/gruas/pantalla';
import type { Dueno } from '@/modulos/gruas/tipos';
import { G } from '@/modulos/gruas/ui';


// Tarifas del dueño (gruista independiente o empresa de auxilio). El cliente
// ve este precio más la comisión de la plataforma.
export default function TarifasGruista() {
  const { gruista, cargando } = useMiGruista();
  const { catalogo } = useCatalogoGruas();
  const gestiona = !!gruista && (!gruista.prestador.empresa_id || gruista.esDueno);
  const dueno: Dueno | null = gruista
    ? gruista.empresa
      ? { empresa_id: gruista.empresa.id, prestador_id: null }
      : { empresa_id: null, prestador_id: gruista.prestador.id }
    : null;
  const clave = dueno ? `${dueno.empresa_id}:${dueno.prestador_id}` : null;
  const [res, setRes] = useState<{ clave: string; datos: DatosTarifas | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!clave || !gestiona) return;
    let cancelled = false;
    const [empresa_id, prestador_id] = clave.split(':').map((x) => (x === 'null' ? null : x));
    tarifasDe({ empresa_id, prestador_id })
      .then((datos) => !cancelled && setRes({ clave, datos, error: null }))
      .catch((e: Error) => !cancelled && setRes({ clave, datos: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [clave, gestiona]);

  const actual = res && res.clave === clave ? res : null;

  return (
    <Subpantalla
      titulo={gruista?.esDueno ? 'Tarifas de la empresa' : 'Mis tarifas'}
      subtitulo="Lo que cobrás vos. El cliente ve este precio más la comisión de la plataforma.">
      {cargando || !catalogo ? (
        <ActivityIndicator color={G.acento} />
      ) : !gruista ? (
        <Text style={eg.muted}>Primero date de alta como gruista.</Text>
      ) : !gestiona ? (
        <Tarjeta>
          <Text style={eg.texto}>Las tarifas las define {gruista.empresa?.nombre ?? 'tu empresa'}.</Text>
        </Tarjeta>
      ) : actual?.error ? (
        <Text style={eg.error}>{actual.error}</Text>
      ) : !actual?.datos || !dueno ? (
        <ActivityIndicator color={G.acento} />
      ) : (
        <EditorTarifas
          tiposIniciales={gruista.unidad?.tipos_vehiculo ?? []}
          dueno={dueno}
          catalogo={catalogo}
          datos={actual.datos}
        />
      )}
    </Subpantalla>
  );
}
