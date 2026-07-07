import { requireRole } from "@/lib/auth/require-role";
import { RoleNav } from "@/components/role-nav";

const LINKS = [
  { href: "/empresa/dashboard", label: "Dashboard" },
  { href: "/empresa/choferes", label: "Choferes" },
];

export default async function EmpresaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["empresa"]);
  return (
    <div className="flex flex-1 flex-col">
      <RoleNav links={LINKS} />
      {children}
    </div>
  );
}
