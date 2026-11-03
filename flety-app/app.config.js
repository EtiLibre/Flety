// Completa app.json con lo que depende del entorno de compilación (EAS).
// En Android, el mapa nativo (Google Maps) necesita una clave: sin ella la app
// se cierra al mostrar un mapa. Si GOOGLE_MAPS_ANDROID_KEY no está cargada en
// EAS, se compila igual y AppMap muestra un aviso en lugar del mapa.
module.exports = ({ config }) => {
  const clave = process.env.GOOGLE_MAPS_ANDROID_KEY;
  return {
    ...config,
    android: { ...config.android, ...(clave ? { config: { googleMaps: { apiKey: clave } } } : {}) },
    extra: { ...config.extra, mapasAndroid: !!clave },
  };
};
