"use client";

import { useEffect, useRef } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY } from "./provider";
import type { GeoPoint } from "@/lib/types/database";

export function AddressAutocomplete({
  label,
  placeholder,
  onSelect,
}: {
  label: string;
  placeholder?: string;
  onSelect: (point: GeoPoint) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary("places");

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      fields: ["geometry", "formatted_address"],
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const location = place.geometry?.location;
      if (!location) return;
      onSelect({
        lat: location.lat(),
        lng: location.lng(),
        direccion: place.formatted_address ?? inputRef.current?.value ?? "",
      });
    });

    return () => listener.remove();
  }, [placesLib, onSelect]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-zinc-500">{label}</label>
      <input
        ref={inputRef}
        type="text"
        disabled={!GOOGLE_MAPS_API_KEY}
        placeholder={
          GOOGLE_MAPS_API_KEY ? placeholder : "Autocompletado deshabilitado (falta API key)"
        }
        className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 disabled:opacity-60 dark:border-white/15 dark:focus:border-white/40"
      />
    </div>
  );
}
