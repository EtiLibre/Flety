import { requireRole } from "@/lib/auth/require-role";
import { RoleNav } from "@/components/role-nav";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/empresas", label: "Empresas" },
  { href: "/admin/pedidos", label: "Pedidos" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["superadmin"]);
  return (
    <div className="flex flex-1 flex-col">
      <RoleNav links={LINKS} />
      {children}
    </div>
  );
}
