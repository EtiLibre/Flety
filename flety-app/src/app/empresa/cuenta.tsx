import { View } from 'react-native';

import { CuentaForm } from '@/components/cuenta/CuentaForm';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useEmpresa } from '@/hooks/use-empresa';

export default function CuentaEmpresa() {
  const { empresa } = useEmpresa();
  return (
    <EmpresaShell
      active="cuenta"
      empresa={empresa}
      title="Mi cuenta"
      subtitle={empresa ? `Usuario de ${empresa.nombre}` : 'Tus datos y tu contraseña.'}>
      <View style={{ maxWidth: 640, width: '100%' }}>
        <CuentaForm tema="claro" />
      </View>
    </EmpresaShell>
  );
}
