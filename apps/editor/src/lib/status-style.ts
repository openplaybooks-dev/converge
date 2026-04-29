export type RunState =
  | "pending"
  | "running"
  | "complete"
  | "failed"
  | "skipped";

export interface StatusPresentation {
  label: string;
  /** CSS color expression for the status dot / accent. */
  color: string;
  /** CSS color expression for a semi-transparent fill. */
  tint: string;
  /** Whether this state should pulse on the canvas. */
  animated: boolean;
}

export function presentStatus(state: RunState | undefined | null): StatusPresentation {
  switch (state) {
    case "running":
      return {
        label: "Running",
        color: "var(--color-primary)",
        tint: "color-mix(in oklch, var(--color-primary) 18%, transparent)",
        animated: true,
      };
    case "complete":
      return {
        label: "Complete",
        color: "var(--color-success)",
        tint: "color-mix(in oklch, var(--color-success) 16%, transparent)",
        animated: false,
      };
    case "failed":
      return {
        label: "Failed",
        color: "var(--color-danger)",
        tint: "color-mix(in oklch, var(--color-danger) 16%, transparent)",
        animated: false,
      };
    case "skipped":
      return {
        label: "Skipped",
        color: "var(--color-muted-foreground)",
        tint: "color-mix(in oklch, var(--color-muted-foreground) 12%, transparent)",
        animated: false,
      };
    case "pending":
    default:
      return {
        label: "Pending",
        color: "var(--color-muted-foreground)",
        tint: "transparent",
        animated: false,
      };
  }
}
