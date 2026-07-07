import { requireRole } from "@/lib/auth/require-role";
import { RoleNav } from "@/components/role-nav";

const LINKS = [
  { href: "/cliente/home", label: "Home" },
  { href: "/cliente/nuevo-pedido", label: "Nuevo pedido" },
  { href: "/cliente/pedidos", label: "Mis pedidos" },
];

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["cliente"]);
  return (
    <div className="flex flex-1 flex-col">
      <RoleNav links={LINKS} />
      {children}
    </div>
  );
}
