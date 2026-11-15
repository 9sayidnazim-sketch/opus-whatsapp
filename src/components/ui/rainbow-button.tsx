import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export function RainbowButton({
  children,
  className,
  type = "button",
  ...props
}: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type={type}
      className={cn(
        "opus-rainbow-button inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
