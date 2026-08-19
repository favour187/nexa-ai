import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";
import { ReminderEngine } from "@/components/notifications/ReminderEngine";
import { PushRegistrar } from "@/components/notifications/PushRegistrar";

// Always evaluate auth per request so the redirect/login decision is correct.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <AppShell userEmail={user.email ?? null}>
      {children}
      <PushRegistrar />
      <ReminderEngine />
    </AppShell>
  );
}
