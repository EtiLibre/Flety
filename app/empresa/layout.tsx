import { requireRole } from "@/lib/auth/require-role";

export default async function EmpresaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["empresa"]);
  return <>{children}</>;
}
