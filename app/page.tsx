import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { ROLE_HOME } from "@/lib/types/roles";

export default async function Home() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  redirect(ROLE_HOME[profile.role]);
}
