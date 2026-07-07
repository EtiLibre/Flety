"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { USER_ROLES, type UserRole } from "@/lib/types/roles";

type UserRow = {
  id: string;
  email: string;
  nombre: string | null;
  role: UserRole;
  company_id: string | null;
};

type CompanyOption = { id: string; nombre: string };

const selectClass =
  "rounded-lg border border-black/10 bg-transparent px-2 py-1 text-sm dark:border-white/15";

export function UsuariosTable({
  users,
  companies,
}: {
  users: UserRow[];
  companies: CompanyOption[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, { role: UserRole; companyId: string }>>(
    () =>
      Object.fromEntries(
        users.map((u) => [u.id, { role: u.role, companyId: u.company_id ?? "" }])
      )
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function handleSave(userId: string) {
    const draft = drafts[userId];
    setSavingId(userId);
    setErrorId(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({
        role: draft.role,
        company_id: draft.companyId || null,
      })
      .eq("id", userId);

    setSavingId(null);

    if (error) {
      setErrorId(userId);
      return;
    }

    router.refresh();
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-black/10 text-zinc-500 dark:border-white/10">
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">Rol</th>
            <th className="py-2 pr-4">Empresa</th>
            <th className="py-2 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const draft = drafts[u.id];
            const dirty =
              draft.role !== u.role || draft.companyId !== (u.company_id ?? "");

            return (
              <tr key={u.id} className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4">{u.nombre ?? "—"}</td>
                <td className="py-2 pr-4">
                  <select
                    className={selectClass}
                    value={draft.role}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [u.id]: { ...prev[u.id], role: e.target.value as UserRole },
                      }))
                    }
                  >
                    {USER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-4">
                  <select
                    className={selectClass}
                    value={draft.companyId}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [u.id]: { ...prev[u.id], companyId: e.target.value },
                      }))
                    }
                  >
                    <option value="">— sin empresa —</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-4">
                  <button
                    type="button"
                    disabled={!dirty || savingId === u.id}
                    onClick={() => handleSave(u.id)}
                    className="rounded-lg border border-black/10 px-3 py-1 text-sm disabled:opacity-40 dark:border-white/15"
                  >
                    {savingId === u.id ? "Guardando..." : "Guardar"}
                  </button>
                  {errorId === u.id && (
                    <span className="ml-2 text-xs text-red-600">Error</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
