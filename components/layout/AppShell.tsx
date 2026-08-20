import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail: string | null;
}) {
  return (
    <div className="flex min-h-dvh min-w-0">
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col overflow-x-hidden">
        <Topbar userEmail={userEmail} />
        <main className="min-w-0 flex-1 px-3 py-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
