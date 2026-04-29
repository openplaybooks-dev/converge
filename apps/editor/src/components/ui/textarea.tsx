import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[64px] w-full resize-y rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
