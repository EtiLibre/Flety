import { IdCard, Truck } from 'lucide-react-native';

import { CuentaForm, FilaCuenta } from '@/components/cuenta/CuentaForm';
import { PantallaTab } from '@/components/nav/PantallaTab';
import { useChofer } from '@/hooks/use-chofer';
import { useNavChofer } from '@/hooks/use-nav-chofer';
import { describirModelo } from '@/lib/vehiculos';

export default function CuentaChofer() {
  const { chofer } = useChofer();
  const ir = useNavChofer();
  return (
    <PantallaTab titulo="Cuenta" subtitulo={chofer?.empresa ? `Chofer de ${chofer.empresa}` : undefined} tema="oscuro">
      <CuentaForm tema="oscuro">
        {chofer ? (
          <>
            <FilaCuenta
              tema="oscuro"
              Icon={IdCard}
              titulo="Mi perfil"
              detalle="Foto, DNI, licencia y contacto de emergencia"
              onPress={() => ir('perfil')}
            />
            <FilaCuenta
              tema="oscuro"
              Icon={Truck}
              titulo="Mi vehículo"
              detalle={describirModelo(chofer.vehiculo ?? {}) ?? 'Cargá tu vehículo y sus fotos'}
              onPress={() => ir('vehiculo')}
            />
          </>
        ) : null}
      </CuentaForm>
    </PantallaTab>
  );
}
