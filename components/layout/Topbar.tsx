import { Brand } from "@/components/Brand";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { MobileNav } from "@/components/layout/MobileNav";

export function Topbar({ userEmail }: { userEmail: string | null }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2">
        {/* Hamburger + wordmark on mobile (Phase B); desktop keeps the
            persistent sidebar and shows the brand there. */}
        <MobileNav />
        <div className="md:hidden">
          <Brand />
        </div>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-4">
        {userEmail ? (
          <span className="hidden max-w-[40vw] truncate text-sm text-slate-500 sm:inline">
            {userEmail}
          </span>
        ) : null}
        <SignOutButton />
      </div>
    </header>
  );
}
