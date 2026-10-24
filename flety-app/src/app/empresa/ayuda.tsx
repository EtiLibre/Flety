import { View } from 'react-native';

import { CentroAyuda } from '@/components/ayuda/CentroAyuda';
import { EmpresaShell, type SeccionEmpresa } from '@/components/web/EmpresaShell';
import { useEmpresa } from '@/hooks/use-empresa';
import { useNavEmpresa } from '@/hooks/use-nav-empresa';
import type { Destino } from '@/lib/ayuda';

const DESTINOS: Partial<Record<Destino, SeccionEmpresa>> = {
  panel: 'panel',
  pedidos: 'pedidos',
  choferes: 'choferes',
  tarifas: 'tarifas',
  cuenta: 'cuenta',
  cobros: 'cobros',
};

export default function AyudaEmpresa() {
  const { empresa } = useEmpresa();
  const nav = useNavEmpresa();
  return (
    <EmpresaShell active="ayuda" empresa={empresa} title="Ayuda" subtitle="Preguntale al asistente o escribinos.">
      <View style={{ maxWidth: 720, width: '100%' }}>
        <CentroAyuda
          tema="claro"
          rol="empresa"
          onNavegar={(d) => {
            const s = DESTINOS[d];
            if (s) nav.ir(s);
          }}
        />
      </View>
    </EmpresaShell>
  );
}
