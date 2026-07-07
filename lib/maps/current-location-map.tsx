"use client";

import { useEffect, useState } from "react";
import { Map, Marker } from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY } from "./provider";

export function CurrentLocationMap() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      const id = setTimeout(() => setError("Tu navegador no soporta geolocalización."), 0);
      return () => clearTimeout(id);
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError("No pudimos acceder a tu ubicación."),
      { enableHighAccuracy: true }
    );
  }, []);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-black/10 p-4 text-center text-sm text-zinc-500 dark:border-white/10">
        Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — acá va el mapa con tu ubicación.
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!position) {
    return <p className="text-sm text-zinc-500">Buscando tu ubicación...</p>;
  }

  return (
    <div className="h-64 w-full overflow-hidden rounded-lg">
      <Map defaultCenter={position} defaultZoom={15} disableDefaultUI>
        <Marker position={position} />
      </Map>
    </div>
  );
}
