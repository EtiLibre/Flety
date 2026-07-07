import { createClient } from "@/lib/supabase/server";
import { UsuariosTable } from "@/components/admin/usuarios-table";

export default async function AdminUsuariosPage() {
  const supabase = await createClient();

  const [{ data: users }, { data: companies }] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, nombre, role, company_id")
      .order("email"),
    supabase.from("companies").select("id, nombre").order("nombre"),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Usuarios</h1>
      <p className="text-sm text-zinc-500">
        Asignar rol y empresa. Es la única forma de convertir a alguien en
        empresa/chofer/contabilidad (por diseño, sección 3 del doc).
      </p>
      <UsuariosTable users={users ?? []} companies={companies ?? []} />
    </div>
  );
}
