import { createClient } from "@/lib/supabase/server";
import { EmpresasTable } from "@/components/admin/empresas-table";
import { NuevaEmpresaForm } from "@/components/admin/nueva-empresa-form";

export default async function AdminEmpresasPage() {
  const supabase = await createClient();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, nombre, cuit, estado_aprobacion, comision_pct")
    .order("nombre");

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Empresas</h1>
      </div>
      <NuevaEmpresaForm />
      <EmpresasTable companies={companies ?? []} />
    </div>
  );
}
