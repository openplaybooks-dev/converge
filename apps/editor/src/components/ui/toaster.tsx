"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      richColors={false}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-md border bg-[var(--color-card)] text-[var(--color-foreground)] shadow",
          title: "text-sm font-medium",
          description: "text-xs text-[var(--color-muted-foreground)]",
          actionButton:
            "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
          cancelButton: "bg-[var(--color-muted)]",
          error:
            "border-[color:var(--color-danger)]/40 bg-[color-mix(in_oklch,_var(--color-danger)_10%,_var(--color-card))]",
          success:
            "border-[color:var(--color-success)]/40 bg-[color-mix(in_oklch,_var(--color-success)_10%,_var(--color-card))]",
        },
      }}
    />
  );
}
