import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
