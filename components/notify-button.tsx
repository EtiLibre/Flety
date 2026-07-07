"use client";

import { useState } from "react";
import { subscribeToPush } from "@/lib/push/subscribe";

export function NotifyButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "denied" | "unsupported">(
    "idle"
  );

  async function handleClick() {
    setStatus("loading");
    const result = await subscribeToPush();
    setStatus(result);
  }

  if (status === "ok") {
    return <span className="text-sm text-emerald-600 dark:text-emerald-400">Notificaciones activadas</span>;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "loading"}
      className="rounded-lg border border-black/10 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-white/15"
    >
      {status === "denied"
        ? "Permiso denegado"
        : status === "unsupported"
          ? "No disponible"
          : status === "loading"
            ? "Activando..."
            : "Activar notificaciones"}
    </button>
  );
}
