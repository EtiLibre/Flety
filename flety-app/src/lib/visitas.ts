import { Dimensions, Platform } from 'react-native';

import { supabase } from './supabase';

// Estadísticas de uso para marketing (migración 0013). Anónimas: tipo de
// dispositivo, sistema, navegador y pantalla. Sin IP ni ubicación.

let sesion: string | null = null;
function idSesion() {
  if (sesion) return sesion;
  try {
    const guardada = globalThis.sessionStorage?.getItem('flety:sesion');
    if (guardada) return (sesion = guardada);
  } catch {
    // sin sessionStorage (nativo): la sesión dura lo que la app abierta
  }
  sesion = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  try {
    globalThis.sessionStorage?.setItem('flety:sesion', sesion);
  } catch {
    // ídem
  }
  return sesion;
}

function dispositivo(): {
  plataforma: 'web' | 'ios' | 'android';
  dispositivo: 'mobile' | 'tablet' | 'desktop';
  sistema: string;
  navegador: string | null;
} {
  if (Platform.OS !== 'web') {
    const { width, height } = Dimensions.get('window');
    return {
      plataforma: Platform.OS === 'ios' ? 'ios' : 'android',
      dispositivo: Math.min(width, height) >= 600 ? 'tablet' : 'mobile',
      sistema: Platform.OS === 'ios' ? 'iOS' : 'Android',
      navegador: 'App',
    };
  }
  const ua = globalThis.navigator?.userAgent ?? '';
  const tablet = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const mobile = !tablet && /Mobi|iPhone|Android/i.test(ua);
  const sistema = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'iOS'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Otro';
  const navegador = /Edg\//.test(ua)
    ? 'Edge'
    : /SamsungBrowser/.test(ua)
      ? 'Samsung'
      : /OPR\//.test(ua)
        ? 'Opera'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Chrome\//.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : 'Otro';
  return { plataforma: 'web', dispositivo: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop', sistema, navegador };
}

let ultima: { pantalla: string; at: number } | null = null;

// Registra que se vio una pantalla (ignora repeticiones seguidas de la misma).
export function registrarVisita(ruta: string) {
  // Los ids de pedido no importan para las estadísticas: /cliente/pedidos/:id.
  const pantalla = ruta.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, ':id');
  if (__DEV__ || pantalla.startsWith('/preview')) return;
  const ahora = Date.now();
  if (ultima && ultima.pantalla === pantalla && ahora - ultima.at < 30_000) return;
  ultima = { pantalla, at: ahora };
  const d = dispositivo();
  let origen: string | null = null;
  try {
    origen = globalThis.document?.referrer ? new URL(globalThis.document.referrer).hostname : null;
  } catch {
    origen = null;
  }
  // Fuego y olvido: si falla, no molesta al usuario.
  supabase
    .from('visitas')
    .insert({ sesion: idSesion(), pantalla: pantalla.slice(0, 80), origen, ...d })
    .then(() => {});
}
