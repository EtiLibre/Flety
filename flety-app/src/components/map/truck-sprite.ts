// Camioncito de Flety visto desde arriba (estilo apps de viaje): cabina
// amarilla de marca, caja blanca con la "F" en el techo, sombreado lateral y
// sombra suave. Frente hacia arriba (norte); el mapa lo rota según el rumbo.
// Misma figura que TruckSprite.tsx (nativo).
export const TRUCK_SIZE = { width: 40, height: 72 };

export const TRUCK_3D_SVG = `
<svg width="${TRUCK_SIZE.width}" height="${TRUCK_SIZE.height}" viewBox="0 0 44 80" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fl-cab" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#D99B00"/><stop offset="0.22" stop-color="#FFC233"/>
      <stop offset="0.5" stop-color="#FFD873"/><stop offset="0.78" stop-color="#FFC233"/><stop offset="1" stop-color="#D99B00"/>
    </linearGradient>
    <linearGradient id="fl-box" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#CDD3DB"/><stop offset="0.15" stop-color="#F4F6F8"/>
      <stop offset="0.5" stop-color="#FFFFFF"/><stop offset="0.85" stop-color="#F4F6F8"/><stop offset="1" stop-color="#CDD3DB"/>
    </linearGradient>
    <linearGradient id="fl-glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3A4450"/><stop offset="1" stop-color="#12161C"/>
    </linearGradient>
    <filter id="fl-shadow" x="-30%" y="-15%" width="160%" height="130%">
      <feGaussianBlur stdDeviation="2.2"/>
    </filter>
  </defs>
  <rect x="8.5" y="6" width="30" height="73" rx="8" fill="rgba(18,22,28,0.38)" filter="url(#fl-shadow)"/>
  <rect x="6.5" y="13" width="4" height="9" rx="1.6" fill="#232A33"/>
  <rect x="33.5" y="13" width="4" height="9" rx="1.6" fill="#232A33"/>
  <rect x="5" y="55" width="4" height="11" rx="1.6" fill="#232A33"/>
  <rect x="35" y="55" width="4" height="11" rx="1.6" fill="#232A33"/>
  <rect x="7" y="27" width="30" height="49" rx="4" fill="url(#fl-box)" stroke="rgba(18,22,28,0.22)" stroke-width="0.8"/>
  <rect x="10" y="30" width="24" height="43" rx="2.5" fill="none" stroke="rgba(18,22,28,0.08)" stroke-width="1"/>
  <path d="M13 34.5h18M13 69h18" stroke="rgba(18,22,28,0.07)" stroke-width="1"/>
  <rect x="15" y="44.5" width="14" height="14" rx="4" fill="#FFC233"/>
  <path d="M19.4 48h6v2.3h-3.4v1.5h2.9v2.2h-2.9v3h-2.6z" fill="#12161C"/>
  <rect x="9" y="75" width="4.5" height="1.6" rx="0.8" fill="#E5484D"/>
  <rect x="30.5" y="75" width="4.5" height="1.6" rx="0.8" fill="#E5484D"/>
  <rect x="13" y="23" width="18" height="5" fill="#2A313B"/>
  <path d="M9 11Q9 3 17 3H27Q35 3 35 11V22.5Q35 25 32.5 25H11.5Q9 25 9 22.5Z" fill="url(#fl-cab)" stroke="rgba(18,22,28,0.25)" stroke-width="0.8"/>
  <path d="M12.2 8.2Q22 5.8 31.8 8.2L30.2 14.2Q22 13.2 13.8 14.2Z" fill="url(#fl-glass)"/>
  <path d="M15 8.6Q18.5 7.6 22 7.4L20.6 13.4Q17.8 13.5 15.4 13.9Z" fill="rgba(255,255,255,0.16)"/>
  <rect x="12.5" y="15.5" width="19" height="7.5" rx="2.5" fill="rgba(255,255,255,0.2)"/>
  <ellipse cx="7.2" cy="10.5" rx="2.2" ry="1.4" fill="#232A33"/>
  <ellipse cx="36.8" cy="10.5" rx="2.2" ry="1.4" fill="#232A33"/>
  <rect x="11.5" y="3.4" width="4.5" height="1.8" rx="0.9" fill="#FFFBEA"/>
  <rect x="28" y="3.4" width="4.5" height="1.8" rx="0.9" fill="#FFFBEA"/>
</svg>`;
