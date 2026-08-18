import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
        N
      </span>
      <span className="text-base font-semibold tracking-tight text-slate-900">
        NEXA
      </span>
    </span>
  );
}
