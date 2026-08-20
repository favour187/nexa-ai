import { Brand } from "@/components/Brand";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { MobileNav } from "@/components/layout/MobileNav";

export function Topbar({ userEmail }: { userEmail: string | null }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 min-w-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 sm:px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-1.5">
        {/* Hamburger + wordmark on mobile (Phase B); desktop keeps the
            persistent sidebar and shows the brand there. */}
        <MobileNav />
        <div className="min-w-0 md:hidden">
          <Brand />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {userEmail ? (
          <span className="hidden max-w-[28vw] truncate text-sm text-slate-500 lg:inline">
            {userEmail}
          </span>
        ) : null}
        <SignOutButton />
      </div>
    </header>
  );
}
