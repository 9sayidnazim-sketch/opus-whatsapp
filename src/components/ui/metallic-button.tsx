import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export function MetallicButton({
  children,
  className,
  type = "button",
  ...props
}: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type={type}
      className={cn(
        "opus-silver-control opus-metallic-button inline-flex min-h-11 items-center justify-center rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default MetallicButton;
