import { CentroAyuda } from '@/components/ayuda/CentroAyuda';
import { PantallaTab } from '@/components/nav/PantallaTab';
import { useNavChofer, type DestinoChofer } from '@/hooks/use-nav-chofer';
import type { Destino } from '@/lib/ayuda';

const DESTINOS: Partial<Record<Destino, DestinoChofer>> = {
  panel: 'panel',
  viajes: 'viajes',
  cuenta: 'cuenta',
  perfil: 'perfil',
  vehiculo: 'vehiculo',
  seguro: 'seguro',
};

export default function AyudaChofer() {
  const ir = useNavChofer();
  return (
    <PantallaTab titulo="Ayuda" subtitulo="Preguntale al asistente o escribinos." tema="oscuro">
      <CentroAyuda
        tema="oscuro"
        rol="chofer"
        onNavegar={(d) => {
          const destino = DESTINOS[d];
          if (destino) ir(destino);
        }}
      />
    </PantallaTab>
  );
}
