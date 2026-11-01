// Grúa de plancha vista desde arriba: cabina naranja con balizas y la plancha
// con un auto cargado (se lee "grúa" de un vistazo). Frente hacia arriba
// (norte); el mapa la rota según el rumbo. Sin filtros, así sirve también en
// iOS/Android con SvgXml.
export const GRUA_SIZE = { width: 40, height: 84 };

export const GRUA_3D_SVG = `
<svg width="${GRUA_SIZE.width}" height="${GRUA_SIZE.height}" viewBox="0 0 44 92" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gr-cab" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#D14E08"/><stop offset="0.22" stop-color="#FF7A2E"/>
      <stop offset="0.5" stop-color="#FFA064"/><stop offset="0.78" stop-color="#FF7A2E"/><stop offset="1" stop-color="#D14E08"/>
    </linearGradient>
    <linearGradient id="gr-auto" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7C8C9E"/><stop offset="0.5" stop-color="#D3DDE7"/><stop offset="1" stop-color="#7C8C9E"/>
    </linearGradient>
    <linearGradient id="gr-glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3A4450"/><stop offset="1" stop-color="#12161C"/>
    </linearGradient>
  </defs>
  <rect x="7.5" y="5" width="32" height="87" rx="9" fill="rgba(18,22,28,0.12)"/>
  <rect x="8.5" y="6" width="30" height="84" rx="8" fill="rgba(18,22,28,0.16)"/>
  <rect x="6.5" y="12" width="4" height="9" rx="1.6" fill="#232A33"/>
  <rect x="33.5" y="12" width="4" height="9" rx="1.6" fill="#232A33"/>
  <rect x="5" y="60" width="4" height="10" rx="1.6" fill="#232A33"/>
  <rect x="35" y="60" width="4" height="10" rx="1.6" fill="#232A33"/>
  <rect x="5" y="72" width="4" height="10" rx="1.6" fill="#232A33"/>
  <rect x="35" y="72" width="4" height="10" rx="1.6" fill="#232A33"/>
  <rect x="6" y="27" width="32" height="62" rx="3" fill="#5A636E"/>
  <rect x="7.5" y="28.5" width="29" height="59" rx="2.2" fill="#3E4651"/>
  <path d="M9 84h26M9 86.5h26" stroke="#6B7480" stroke-width="1"/>
  <rect x="11" y="34" width="22" height="44" rx="8" fill="url(#gr-auto)" stroke="rgba(18,22,28,0.3)" stroke-width="0.7"/>
  <path d="M13.2 44Q22 41.5 30.8 44L29.6 50Q22 49 14.4 50Z" fill="url(#gr-glass)"/>
  <rect x="14.6" y="51" width="14.8" height="13" rx="2.4" fill="rgba(255,255,255,0.35)"/>
  <path d="M14.4 65Q22 66 29.6 65L30.6 70Q22 72 13.4 70Z" fill="url(#gr-glass)"/>
  <path d="M8 39h28M8 74h28" stroke="#FFC233" stroke-width="1.4"/>
  <rect x="13" y="22" width="18" height="5" fill="#2A313B"/>
  <path d="M9 11Q9 3 17 3H27Q35 3 35 11V21.5Q35 24 32.5 24H11.5Q9 24 9 21.5Z" fill="url(#gr-cab)" stroke="rgba(18,22,28,0.25)" stroke-width="0.8"/>
  <path d="M12.2 8.2Q22 5.8 31.8 8.2L30.2 14.2Q22 13.2 13.8 14.2Z" fill="url(#gr-glass)"/>
  <path d="M15 8.6Q18.5 7.6 22 7.4L20.6 13.4Q17.8 13.5 15.4 13.9Z" fill="rgba(255,255,255,0.16)"/>
  <rect x="14" y="16" width="16" height="3.4" rx="1.7" fill="#FFC233" stroke="#B37A00" stroke-width="0.6"/>
  <ellipse cx="7.2" cy="10.5" rx="2.2" ry="1.4" fill="#232A33"/>
  <ellipse cx="36.8" cy="10.5" rx="2.2" ry="1.4" fill="#232A33"/>
  <rect x="11.5" y="3.4" width="4.5" height="1.8" rx="0.9" fill="#FFFBEA"/>
  <rect x="28" y="3.4" width="4.5" height="1.8" rx="0.9" fill="#FFFBEA"/>
</svg>`;
