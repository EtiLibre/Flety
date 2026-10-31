import { CentroAyuda } from '@/components/ayuda/CentroAyuda';
import { PantallaTab } from '@/components/nav/PantallaTab';
import type { Destino } from '@/lib/ayuda';
import { irGruista, type DestinoGruista } from '@/modulos/gruas/nav';

const DESTINOS: Partial<Record<Destino, DestinoGruista>> = {
  panel: 'inicio',
  viajes: 'historial',
  cuenta: 'cuenta',
  unidad: 'unidad',
  vehiculo: 'unidad',
  documentos: 'documentos',
  seguro: 'documentos',
  tarifas: 'tarifas',
};

export default function AyudaGruista() {
  return (
    <PantallaTab titulo="Ayuda" subtitulo="Preguntale al asistente o escribinos." tema="oscuro">
      <CentroAyuda
        tema="oscuro"
        rol="gruista"
        onNavegar={(d) => {
          const destino = DESTINOS[d];
          if (destino) irGruista(destino);
        }}
      />
    </PantallaTab>
  );
}
