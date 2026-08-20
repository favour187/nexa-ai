import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-base font-bold text-white shadow-glow-sm">
        <span className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/30" />
        N
      </span>
      <span className="text-lg font-semibold tracking-tight text-slate-900">
        NEXA
      </span>
    </span>
  );
}
