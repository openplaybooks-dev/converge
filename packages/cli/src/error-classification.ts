/**
 * Error classification — split a task failure into "transient" or
 * "structural" so the autonomous runner can budget retries differently.
 *
 * Transient failures shouldn't count against `maxStructuralAttempts` —
 * they're things another attempt will likely fix on its own (env vars,
 * API rate limits, network blips). Structural failures do count, and
 * trigger AI repair.
 *
 * The classifier reads the latest attempt's FEEDBACK.md + log tail and
 * matches against pattern groups. It's intentionally conservative:
 * unmatched failures default to "structural" so the retry budget still
 * applies — we'd rather over-count than have a real bug retry forever.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

export type ErrorKind = "transient" | "structural";

export interface ClassificationResult {
  kind: ErrorKind;
  reason: string;
  /** Source file the classifier matched against (for debugging). */
  source?: string;
}

const TRANSIENT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b529\b|Overloaded|overloaded_error/i, reason: "anthropic 529 overloaded" },
  { pattern: /\b502\b|Bad Gateway/i, reason: "upstream 502" },
  { pattern: /\b503\b|Service Unavailable/i, reason: "upstream 503 service unavailable" },
  { pattern: /\b504\b|Gateway Timeout/i, reason: "upstream 504 gateway timeout" },
  { pattern: /\bRESOURCE_EXHAUSTED\b|rate.?limit/i, reason: "rate limit / resource exhausted" },
  { pattern: /ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EAI_AGAIN/i, reason: "network error" },
  { pattern: /(getaddrinfo|connect) (?:ENOTFOUND|EAGAIN)/i, reason: "DNS / temporary network" },
  { pattern: /Read timeout|Request timed out/i, reason: "request timeout" },
  { pattern: /GEMINI_API_KEY not set|API key not set|GOOGLE_API_KEY/i, reason: "env var not loaded — next attempt will load .env" },
  { pattern: /\.env not found/i, reason: ".env not present yet" },
  { pattern: /SocketError: other side closed/i, reason: "socket closed mid-call" },
];

const STRUCTURAL_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /SyntaxError\b/i, reason: "script syntax error" },
  { pattern: /ImportError|ModuleNotFoundError|Cannot find module/i, reason: "import / module not found" },
  { pattern: /AttributeError\b/i, reason: "attribute error in script" },
  { pattern: /assertion failed/i, reason: "assertion failure (check predicate)" },
  { pattern: /CHECK FAILED|Check failed/i, reason: "declared check failed" },
  { pattern: /Output file .* not (created|found)/i, reason: "declared output not produced" },
  { pattern: /no such file or directory/i, reason: "missing required input file" },
  { pattern: /Permission denied/i, reason: "filesystem permission" },
];

function classify(text: string, source: string): ClassificationResult | null {
  if (!text) return null;
  for (const t of TRANSIENT_PATTERNS) {
    if (t.pattern.test(text)) {
      return { kind: "transient", reason: t.reason, source };
    }
  }
  for (const s of STRUCTURAL_PATTERNS) {
    if (s.pattern.test(text)) {
      return { kind: "structural", reason: s.reason, source };
    }
  }
  return null;
}

async function readNewest(dir: string, suffix: string): Promise<string | null> {
  if (!existsSync(dir)) return null;
  let newestPath: string | null = null;
  let newestMs = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!e.name.endsWith(suffix)) continue;
      const p = join(dir, e.name);
      try {
        const st = await stat(p);
        if (st.mtimeMs > newestMs) {
          newestMs = st.mtimeMs;
          newestPath = p;
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    return null;
  }
  if (!newestPath) return null;
  try {
    return await readFile(newestPath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Classify the most recent failure of a task by reading its journal
 * artifacts. Looks at:
 *   1. FEEDBACK.md from the latest attempt (declared check / output errors).
 *   2. The newest log under attempts/wip/logs/ (raw stdout/stderr from the
 *      failing tool calls — where 529, ENOENT, etc. show up).
 *
 * Returns null when nothing is conclusive — the caller treats null as
 * "structural" by default for safety.
 */
export async function classifyTaskFailure(
  taskJournalDir: string,
): Promise<ClassificationResult | null> {
  const attemptsDir = join(taskJournalDir, "attempts");
  if (!existsSync(attemptsDir)) return null;

  // Newest numeric attempt subdir (attempts/01, 02, ...) wins.
  let newestAttempt: string | null = null;
  try {
    const subs = await readdir(attemptsDir, { withFileTypes: true });
    const numeric = subs
      .filter((s) => s.isDirectory() && /^\d+$/.test(s.name))
      .sort((a, b) => b.name.localeCompare(a.name));
    if (numeric.length > 0) {
      newestAttempt = join(attemptsDir, numeric[0].name);
    } else if (subs.some((s) => s.isDirectory() && s.name === "wip")) {
      newestAttempt = join(attemptsDir, "wip");
    }
  } catch {
    return null;
  }
  if (!newestAttempt) return null;

  // FEEDBACK.md first (concise, structured).
  const feedbackPath = join(newestAttempt, "FEEDBACK.md");
  if (existsSync(feedbackPath)) {
    try {
      const fb = await readFile(feedbackPath, "utf-8");
      const c = classify(fb, "FEEDBACK.md");
      if (c) return c;
    } catch {
      /* ignore */
    }
  }

  // Then the newest tool log.
  const logsDir = join(newestAttempt, "logs");
  const logText = await readNewest(logsDir, ".log");
  if (logText) {
    // Take the last 8KB — failures are at the tail.
    const tail = logText.length > 8192 ? logText.slice(-8192) : logText;
    const c = classify(tail, "logs/*.log");
    if (c) return c;
  }
  return null;
}
