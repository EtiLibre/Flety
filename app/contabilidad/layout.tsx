import { requireRole } from "@/lib/auth/require-role";
import { RoleNav } from "@/components/role-nav";

const LINKS = [
  { href: "/contabilidad/dashboard", label: "Dashboard" },
  { href: "/contabilidad/pedidos", label: "Liquidaciones" },
];

export default async function ContabilidadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["contabilidad"]);
  return (
    <div className="flex flex-1 flex-col">
      <RoleNav links={LINKS} />
      {children}
    </div>
  );
}
