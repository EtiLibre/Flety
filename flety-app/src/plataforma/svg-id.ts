import { useId } from 'react';

// Id único por dibujo para los degradés/patrones SVG. Con ids fijos, si la
// misma ilustración está también en una pantalla oculta (el router deja las
// anteriores montadas), el navegador usa esa definición y el relleno no se
// pinta: la ilustración aparece "vacía".
export function useSvgId(prefijo: string) {
  return `${prefijo}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}
