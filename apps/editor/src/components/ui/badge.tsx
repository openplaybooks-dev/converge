import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "muted" | "primary" | "success" | "warning" | "danger";
}) {
  const tones: Record<string, string> = {
    muted:
      "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]",
    primary:
      "bg-[var(--color-accent)] text-[var(--color-foreground)] border-transparent",
    success: "bg-[var(--color-success)]/15 text-[var(--color-success)] border-transparent",
    warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-transparent",
    danger: "bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-transparent",
  };
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
