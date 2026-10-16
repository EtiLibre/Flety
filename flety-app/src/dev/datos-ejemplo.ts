// SOLO DESARROLLO: datos de ejemplo para las vistas previas (/preview-*).

// Foto "de cajas" dibujada en SVG, para no depender de imágenes externas.
export function fotoEjemplo(fondo: string, cajas: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
<rect width="800" height="500" fill="${fondo}"/><rect y="360" width="800" height="140" fill="#00000018"/>
<rect x="140" y="230" width="210" height="170" rx="8" fill="${cajas}"/><rect x="140" y="300" width="210" height="16" fill="#00000022"/>
<rect x="380" y="180" width="260" height="220" rx="8" fill="${cajas}" opacity=".85"/><rect x="380" y="270" width="260" height="18" fill="#00000022"/>
<rect x="250" y="120" width="170" height="110" rx="8" fill="${cajas}" opacity=".95"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const FOTOS_EJEMPLO = [fotoEjemplo('#E9E3D8', '#C89B63'), fotoEjemplo('#DDE4EA', '#B7865A'), fotoEjemplo('#EFE9E1', '#D2A673')];
