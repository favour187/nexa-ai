import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover",
        className,
      )}
      {...props}
    />
  );
}
