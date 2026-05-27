// =============================================================
// Converge UI Kit — primitives.jsx
// Shared atoms used across the three panes. Exports to window so
// other Babel script files can see them.
// =============================================================

const { useState } = React;

// Status glyph — the four data-viz marks set as type. Pulse on live.
const StatusGlyph = ({ status, size = 14 }) => {
  const map = {
    ok:     { glyph: '✓', color: 'var(--cv-status-ok)' },
    delta:  { glyph: 'Δ', color: 'var(--cv-status-delta)' },
    fail:   { glyph: '✕', color: 'var(--cv-status-fail)' },
    live:   { glyph: '●', color: 'var(--cv-status-live)' },
    pending:{ glyph: '○', color: 'var(--cv-text-dim)' },
    'awaiting-review': { glyph: '◆', color: 'var(--cv-status-delta)' },
  };
  const m = map[status] || map.pending;
  return (
    <span
      style={{
        fontFamily: 'var(--cv-mono)',
        fontWeight: 600,
        color: m.color,
        fontSize: size,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1.4em',
        animation: status === 'live' ? 'cv-pulse 1.4s ease-in-out infinite' : 'none',
      }}
      aria-label={status}
    >{m.glyph}</span>
  );
};

// Review-state pill — four colorways
const ReviewPill = ({ state, children }) => {
  const styles = {
    pending:  { bg: 'var(--cv-review-pending-bg)',  fg: '#4B5563', border: '#C7BFA3' },
    approved: { bg: 'var(--cv-review-approved-bg)', fg: '#047857', border: '#A7E9CB' },
    changes:  { bg: 'var(--cv-review-changes-bg)',  fg: '#92400E', border: '#F3D89A' },
    rejected: { bg: 'var(--cv-review-rejected-bg)', fg: '#9F1239', border: '#F6BCC2' },
  }[state] || { bg: 'var(--cv-bg-elev)', fg: 'var(--cv-text-muted)', border: 'var(--cv-border-strong)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 8px', borderRadius: 2,
      border: `1px solid ${styles.border}`, background: styles.bg, color: styles.fg,
      fontFamily: 'var(--cv-mono)', fontSize: 11, fontWeight: 500,
      letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>{children}</span>
  );
};

// Generic mono pill — task mode tags etc.
const Pill = ({ children, color }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '3px 8px', borderRadius: 2,
    border: '1px solid var(--cv-border-strong)',
    background: 'var(--cv-bg-elev)',
    color: color || 'var(--cv-text-muted)',
    fontFamily: 'var(--cv-mono)', fontSize: 11, fontWeight: 500,
    letterSpacing: '0.08em', textTransform: 'uppercase',
  }}>{children}</span>
);

// Caption — uppercase mono eyebrow string
const Caption = ({ children, color }) => (
  <span style={{
    fontFamily: 'var(--cv-mono)', fontSize: 12, fontWeight: 500,
    letterSpacing: '0.16em', textTransform: 'uppercase',
    color: color || 'var(--cv-text-dim)',
  }}>{children}</span>
);

// Inline code chip
const CodeChip = ({ children }) => (
  <code style={{
    fontFamily: 'var(--cv-mono)', fontSize: '0.85em',
    background: 'var(--cv-bg-elev)', border: '1px solid var(--cv-border)',
    padding: '1px 6px', borderRadius: 2, color: 'var(--cv-text)',
  }}>{children}</code>
);

// Icon button — used in toolbar nooks
const IconBtn = ({ glyph, label, onClick, primary }) => (
  <button onClick={onClick} className={`cv-btn ${primary ? 'cv-btn--primary' : ''}`} style={{ gap: 6 }}>
    {glyph && <span style={{ fontFamily: 'var(--cv-mono)', fontWeight: 600 }}>{glyph}</span>}
    {label}
  </button>
);

// Compact key→value row used in task detail
const KvRow = ({ label, children }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16,
    padding: '8px 0', borderBottom: '1px solid var(--cv-border)',
    alignItems: 'baseline',
  }}>
    <div style={{
      fontFamily: 'var(--cv-mono)', fontSize: 11, fontWeight: 500,
      letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv-text-dim)',
    }}>{label}</div>
    <div style={{ fontSize: 14, color: 'var(--cv-text)', lineHeight: 1.55 }}>{children}</div>
  </div>
);

// Pretty status label used in pills / headers
const statusLabel = (s) => ({
  ok: 'pass', live: 'running', delta: 'partial', fail: 'fail',
  pending: 'pending', 'awaiting-review': 'awaiting review',
}[s] || s);

Object.assign(window, {
  StatusGlyph, ReviewPill, Pill, Caption, CodeChip, IconBtn, KvRow, statusLabel,
});
