/**
 * RFC 0024 — STATUS.md writer.
 *
 * The single AI-facing transparency surface. One row per invocation,
 * `- [x]` ok or `- [ ]` failed, with a structured `fix:` block on every
 * failure (file path + suggested patch). This is the *only* file the AI
 * consults to know what to repair.
 *
 * Per-child `EVIDENCE.json` files still exist as machine-readable detail
 * for `converge inspect` — they're not on the AI's path.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { SpawnFileEvidence } from "./discover.ts";

export interface StatusOkRow {
  id: string;
  template: string;
}

export interface StatusSummary {
  /** `preview` runs before any apply; `apply` runs after a successful preview. */
  phase: "preview" | "apply";
  /** Whether the phase succeeded. */
  ok: boolean;
  okRows: StatusOkRow[];
  evidence: SpawnFileEvidence[];
  /** ISO timestamp for the header; defaults to `new Date().toISOString()`. */
  timestamp?: string;
}

function indent(text: string, prefix: string): string {
  return text
    .split(/\r?\n/)
    .map((l) => (l.length > 0 ? prefix + l : l))
    .join("\n");
}

function renderOkRow(row: StatusOkRow): string {
  return `- [x] ${row.id}        → ok (${row.template})`;
}

function renderErrorRow(ev: SpawnFileEvidence): string {
  const lines: string[] = [];
  lines.push(`- [ ] ${ev.id}        → ✗ ${ev.errorCode}`);
  lines.push(`      ${ev.message}`);
  lines.push(`      file: ${ev.file}`);
  if (ev.hint) {
    lines.push(`      ${ev.hint}`);
  }
  if (ev.fix) {
    lines.push(`      fix:`);
    lines.push(indent(ev.fix, "        "));
  }
  return lines.join("\n");
}

export function writeStatusMarkdown(
  spawnRoot: string,
  summary: StatusSummary,
): string {
  const ts = summary.timestamp ?? new Date().toISOString();
  const total = summary.okRows.length + summary.evidence.length;
  const failed = summary.evidence.length;

  let header: string;
  if (summary.phase === "preview") {
    if (failed === 0) {
      header = `# spawn — ${ts} — preview ok (${total} of ${total})`;
    } else {
      header = `# spawn — ${ts} — preview FAILED (${failed} of ${total})`;
    }
  } else {
    if (summary.ok) {
      header = `# spawn — ${ts} — apply ok (${total} of ${total})`;
    } else {
      header = `# spawn — ${ts} — apply FAILED (${failed} of ${total})`;
    }
  }

  const body: string[] = [header, ""];

  // ok rows first, then errors — the AI scans top-to-bottom and the
  // `[ ]` rows are the actionable ones; keeping them at the bottom puts
  // them in line of sight.
  for (const row of summary.okRows) {
    body.push(renderOkRow(row));
  }
  for (const ev of summary.evidence) {
    body.push(renderErrorRow(ev));
  }

  const text = body.join("\n") + "\n";
  const path = join(spawnRoot, "STATUS.md");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf-8");
  return path;
}
