import { Brand } from "@/components/Brand";
import { SignOutButton } from "@/components/auth/SignOutButton";

export function Topbar({ userEmail }: { userEmail: string | null }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="md:hidden">
        <Brand />
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-4">
        {userEmail ? (
          <span className="text-sm text-slate-500">{userEmail}</span>
        ) : null}
        <SignOutButton />
      </div>
    </header>
  );
}
