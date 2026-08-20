import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-slate-200/80 bg-white shadow-card transition-all duration-300 ease-nexa hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover",
        className,
      )}
      {...props}
    />
  );
}
