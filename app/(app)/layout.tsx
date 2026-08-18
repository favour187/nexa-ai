import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";

// Always evaluate auth per request so the redirect/login decision is correct
// whether or not Supabase was configured at build time.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  return <AppShell userEmail={user.email ?? null}>{children}</AppShell>;
}
