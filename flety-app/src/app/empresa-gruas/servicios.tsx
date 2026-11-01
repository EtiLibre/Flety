import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Card, Vacio } from '@/components/empresa/ui';
import { FilaServicio } from '@/components/gruas-empresa/FilaServicio';
import { PaginaPanelGruas } from '@/components/gruas-empresa/Pagina';
import { Segmented } from '@/components/pedido/Choice';
import { ESTADOS_ACTIVOS } from '@/modulos/gruas/estados';
import { useCatalogoGruas } from '@/modulos/gruas/hooks';
import { nombreGruista } from '@/modulos/gruas/panelEmpresa';
import type { Solicitud } from '@/modulos/gruas/tipos';
import { G } from '@/modulos/gruas/ui';

type Grupo = 'en_curso' | 'terminados' | 'cancelados';

const grupoDe = (s: Solicitud): Grupo =>
  ESTADOS_ACTIVOS.includes(s.estado) ? 'en_curso' : s.estado === 'finalizada' ? 'terminados' : 'cancelados';

const VACIO: Record<Grupo, string> = {
  en_curso: 'No hay servicios en curso.',
  terminados: 'Todavía no hay servicios terminados.',
  cancelados: 'No hay servicios cancelados.',
};

// Servicios que hicieron (o están haciendo) los gruistas de la empresa.
export default function ServiciosEmpresaGruas() {
  const { catalogo } = useCatalogoGruas();
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  return (
    <PaginaPanelGruas
      active="servicios"
      title="Servicios"
      subtitle="Todo lo que hizo tu flota, con lo que cobra la empresa.">
      {({ demo, datos, cargando }) => {
        if (cargando || !datos) return <ActivityIndicator color={G.acento} style={{ marginTop: 20 }} />;
        const cuenta = (g: Grupo) => datos.servicios.filter((s) => grupoDe(s) === g).length;
        const actual = grupo ?? (cuenta('en_curso') ? 'en_curso' : 'terminados');
        const lista = datos.servicios.filter((s) => grupoDe(s) === actual);
        return (
          <View style={{ gap: 16 }}>
            <Segmented
              options={[
                { value: 'en_curso', label: `En curso${cuenta('en_curso') ? ` · ${cuenta('en_curso')}` : ''}` },
                { value: 'terminados', label: 'Terminados' },
                { value: 'cancelados', label: 'Cancelados' },
              ]}
              value={actual}
              onChange={setGrupo}
            />
            {lista.length ? (
              <View style={{ gap: 10 }}>
                {lista.map((s) => (
                  <FilaServicio
                    key={s.id}
                    s={s}
                    catalogo={catalogo}
                    gruista={nombreGruista(datos, s.prestador_id)}
                    demo={demo}
                  />
                ))}
              </View>
            ) : (
              <Card>
                <Vacio texto={VACIO[actual]} />
              </Card>
            )}
          </View>
        );
      }}
    </PaginaPanelGruas>
  );
}
