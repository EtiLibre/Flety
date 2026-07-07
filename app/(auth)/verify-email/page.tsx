"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="flex flex-col gap-6 text-center">
      <h1 className="text-xl font-semibold">Confirmá tu email</h1>
      <p className="text-sm text-zinc-500">
        Te enviamos un link de confirmación cuando creaste la cuenta. Si no lo
        encontrás, pedí que te lo reenviemos.
      </p>

      <form onSubmit={handleResend} className="flex flex-col gap-3 text-left">
        <input
          type="email"
          placeholder="Email"
          required
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {status === "sent" && (
          <p className="text-sm text-emerald-600">Email reenviado.</p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-600">
            No pudimos reenviar el email. Probá de nuevo.
          </p>
        )}

        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-lg bg-foreground py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {status === "sending" ? "Enviando..." : "Reenviar email"}
        </button>
      </form>

      <Link href="/login" className="text-sm hover:underline">
        Volver a iniciar sesión
      </Link>
    </div>
  );
}
