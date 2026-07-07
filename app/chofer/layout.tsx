import { requireRole } from "@/lib/auth/require-role";

export default async function ChoferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["chofer"]);
  return <>{children}</>;
}
