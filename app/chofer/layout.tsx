import { requireRole } from "@/lib/auth/require-role";
import { RoleNav } from "@/components/role-nav";

const LINKS = [{ href: "/chofer/panel", label: "Panel" }];

export default async function ChoferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["chofer"]);
  return (
    <div className="flex flex-1 flex-col">
      <RoleNav links={LINKS} />
      {children}
    </div>
  );
}
