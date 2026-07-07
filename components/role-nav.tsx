import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { NotifyButton } from "@/components/notify-button";

export function RoleNav({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between border-b border-black/10 px-8 py-4 dark:border-white/10">
      <nav className="flex gap-4 text-sm">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <NotifyButton />
        <SignOutButton />
      </div>
    </div>
  );
}
