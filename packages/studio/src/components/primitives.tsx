import { type CSSProperties, type ReactNode } from "react";

const STATUS_MAP: Record<string, { glyph: string; color: string }> = {
  ok: { glyph: "✓", color: "var(--cv-status-ok)" },
  delta: { glyph: "Δ", color: "var(--cv-status-delta)" },
  fail: { glyph: "✕", color: "var(--cv-status-fail)" },
  live: { glyph: "●", color: "var(--cv-status-live)" },
  pending: { glyph: "○", color: "var(--cv-text-dim)" },
  "awaiting-review": { glyph: "◆", color: "var(--cv-status-delta)" },
};

export function StatusGlyph({
  status,
  size = 14,
}: {
  status: string;
  size?: number;
}) {
  const m = STATUS_MAP[status] ??
    STATUS_MAP.pending ?? { glyph: "○", color: "var(--cv-text-dim)" };
  return (
    <span
      style={{
        fontFamily: "var(--cv-mono)",
        fontWeight: 600,
        color: m.color,
        fontSize: size,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "1.4em",
        animation:
          status === "live" ? "cv-pulse 1.4s ease-in-out infinite" : "none",
      }}
      aria-label={status}
    >
      {m.glyph}
    </span>
  );
}

const REVIEW_STYLES: Record<
  string,
  { bg: string; fg: string; border: string }
> = {
  pending: {
    bg: "var(--cv-review-pending-bg)",
    fg: "#4B5563",
    border: "#C7BFA3",
  },
  approved: {
    bg: "var(--cv-review-approved-bg)",
    fg: "#047857",
    border: "#A7E9CB",
  },
  changes: {
    bg: "var(--cv-review-changes-bg)",
    fg: "#92400E",
    border: "#F3D89A",
  },
  rejected: {
    bg: "var(--cv-review-rejected-bg)",
    fg: "#9F1239",
    border: "#F6BCC2",
  },
};

export function ReviewPill({
  state,
  children,
}: {
  state: string;
  children: ReactNode;
}) {
  const s = REVIEW_STYLES[state] || {
    bg: "var(--cv-bg-elev)",
    fg: "var(--cv-text-muted)",
    border: "var(--cv-border-strong)",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        borderRadius: 2,
        border: `1px solid ${s.border}`,
        background: s.bg,
        color: s.fg,
        fontFamily: "var(--cv-mono)",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

export function Pill({
  children,
  color,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        borderRadius: 2,
        border: "1px solid var(--cv-border-strong)",
        background: "var(--cv-bg-elev)",
        color: color || "var(--cv-text-muted)",
        fontFamily: "var(--cv-mono)",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

export function Caption({
  children,
  color,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--cv-mono)",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: color || "var(--cv-text-dim)",
      }}
    >
      {children}
    </span>
  );
}

export function CodeChip({ children }: { children: ReactNode }) {
  return (
    <code
      style={{
        fontFamily: "var(--cv-mono)",
        fontSize: "0.85em",
        background: "var(--cv-bg-elev)",
        border: "1px solid var(--cv-border)",
        padding: "1px 6px",
        borderRadius: 2,
        color: "var(--cv-text)",
      }}
    >
      {children}
    </code>
  );
}

export function KvRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: 16,
        padding: "8px 0",
        borderBottom: "1px solid var(--cv-border)",
        alignItems: "baseline",
      }}
    >
      <div
        style={{
          fontFamily: "var(--cv-mono)",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--cv-text-dim)",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, color: "var(--cv-text)", lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  );
}

export function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Caption>{label}</Caption>
      <span
        style={{
          fontFamily: "var(--cv-mono)",
          fontSize: 13,
          color: "var(--cv-text)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export const statusLabel = (s: string) =>
  ({
    ok: "pass",
    live: "running",
    delta: "partial",
    fail: "fail",
    pending: "pending",
    "awaiting-review": "awaiting review",
  })[s] || s;

export function italicize(text: string): string {
  return text.replace(
    /\*([^*]+)\*/g,
    '<em style="font-family:var(--cv-serif); font-style:italic; font-weight:500; color:var(--cv-accent-warm);">$1</em>',
  );
}

export function emphKeywords(text: string): string {
  return text.replace(
    /\b(spec\.json|colors_and_type\.css|brand\.json|reusable, shareable|verifiable|measurable|concrete|400|brand motif|human verdict|Crimson Pro|terracotta|italic emphasis|italic-emphasis|Inter)\b/g,
    '<em style="font-family:var(--cv-serif); font-style:italic; font-weight:500; color:var(--cv-accent-warm);">$1</em>',
  );
}
