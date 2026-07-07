import { requireRole } from "@/lib/auth/require-role";

export default async function ContabilidadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["contabilidad"]);
  return <>{children}</>;
}
