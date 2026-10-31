import { Redirect } from 'expo-router';
import { History, House, LifeBuoy, UserRound } from 'lucide-react-native';
import { View } from 'react-native';

import { BarraInferior } from '@/components/nav/BarraInferior';
import { useIsWide } from '@/hooks/use-is-wide';
import { AuthPreview, useAuth } from '@/lib/auth';

import InicioPlataforma from './cliente/inicio';

// SOLO DESARROLLO (y superadmin): el inicio de la plataforma como lo ve un
// cliente, sin iniciar sesión. En producción redirige al inicio.
export default function PreviewInicio() {
  const { role } = useAuth();
  const isWide = useIsWide();
  if (!__DEV__ && role !== 'superadmin') return <Redirect href="/" />;
  return (
    <AuthPreview value={{ role: 'cliente', nombre: 'Martín Gómez' }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <InicioPlataforma />
        </View>
        {isWide ? null : (
          <BarraInferior
            items={[
              { id: 'inicio', label: 'Inicio', Icon: House },
              { id: 'actividad', label: 'Actividad', Icon: History },
              { id: 'ayuda', label: 'Ayuda', Icon: LifeBuoy },
              { id: 'cuenta', label: 'Cuenta', Icon: UserRound },
            ]}
            activo="inicio"
            onIr={() => {}}
            tema="claro"
          />
        )}
      </View>
    </AuthPreview>
  );
}
