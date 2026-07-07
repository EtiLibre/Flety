import { requireRole } from "@/lib/auth/require-role";

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["cliente"]);
  return <>{children}</>;
}
