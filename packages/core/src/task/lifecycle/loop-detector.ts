/**
 * Loop Detector — Post-attempt analysis for agent thrashing.
 *
 * After an attempt fails, scan its session log for repeated tool-call
 * signatures. When the same call signature appears N or more times in one
 * attempt, the agent is most likely stuck on a check predicate it cannot
 * satisfy — a sign that the check itself may be broken, not the artifact.
 *
 * The detection result is appended to LEARN.md as a "Loop hint" section
 * so the next attempt's prompt explicitly tells the model: "you appeared
 * to thrash on the same operation; consider whether the check predicate
 * is wrong, not your output."
 *
 * Read by `task-runner.ts` immediately after `generateLearnMd`.
 */

import { readdir, readFile, appendFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LoopDetectionResult {
  /** True when at least one signature exceeded the repeat threshold. */
  detected: boolean;
  /** Signatures that crossed the threshold, sorted by count desc. */
  hotSignatures: Array<{
    /** Tool name (e.g. "Bash", "Edit") */
    tool: string;
    /** Truncated args summary used for display */
    summary: string;
    /** How many times the signature appeared */
    count: number;
  }>;
  /** Total tool calls observed across the attempt. */
  totalCalls: number;
}

interface LoopDetectorOptions {
  /** Minimum repeat count to flag as a loop. Default 5. */
  threshold?: number;
  /** Max distinct hot signatures to surface. Default 5. */
  maxReported?: number;
}

/* ------------------------------------------------------------------ */
/*  Signature normalization                                            */
/* ------------------------------------------------------------------ */

/** Shell built-ins / utilities we treat as the "verb" of a Bash command. */
const SHELL_VERBS = new Set([
  "grep",
  "awk",
  "sed",
  "wc",
  "test",
  "cat",
  "head",
  "tail",
  "find",
  "ls",
  "echo",
  "printf",
  "jq",
  "node",
  "python",
  "python3",
  "pnpm",
  "npm",
  "yarn",
  "git",
  "make",
  "tsc",
  "eslint",
  "vitest",
  "jest",
  "tsup",
  "sort",
  "uniq",
]);

/**
 * Pull a coarse signature out of a Bash command: which shell verb(s) it
 * invokes and which file paths it touches. Two commands with the same set
 * of verbs and paths are treated as semantically equivalent — even if the
 * regex pattern, flags, or quoting differ.
 *
 * This catches the common thrashing pattern: agent tries 30 variants of
 * `grep <regex> <file>` looking for the magic combination.
 */
function bashSignature(cmd: string): string {
  const collapsed = cmd.replace(/\s+/g, " ").trim();

  // Pull out shell verbs (first word of each pipe segment).
  const verbs: string[] = [];
  for (const seg of collapsed.split(/\|+|&&|;|\|\|/)) {
    const first = seg.trim().split(/\s+/)[0];
    if (first && SHELL_VERBS.has(first)) verbs.push(first);
  }

  // Pull out path-like tokens (anything containing `/` that doesn't look
  // like a regex). De-duplicate and sort for stability.
  const paths = new Set<string>();
  for (const tok of collapsed.split(/\s+/)) {
    // Strip surrounding quotes / parens / backticks
    const stripped = tok.replace(/^['"`(]+|['"`)]+$/g, "");
    if (
      stripped.includes("/") &&
      !stripped.startsWith("'") &&
      !stripped.startsWith('"') &&
      // Skip flag-like values
      !stripped.startsWith("-")
    ) {
      paths.add(stripped);
    }
  }

  // If we couldn't extract anything semantic, fall back to a length-bucketed
  // form of the cmd so cosmetically different commands don't hash the same.
  if (verbs.length === 0 && paths.size === 0) {
    return `Bash:raw:${collapsed.slice(0, 60)}`;
  }

  return `Bash:${verbs.sort().join(",")}|${[...paths].sort().join(",")}`;
}

/**
 * Reduce a tool call's input to a stable signature.
 *
 * The goal: two calls that look "the same" to a human (same tool, same
 * intent) should hash to the same signature even if minor noise differs
 * (timestamps, hex IDs, trailing whitespace, regex variations).
 */
function signatureFor(tool: string, input: Record<string, unknown>): string {
  if (tool === "Bash") {
    const cmd =
      typeof input.cmd === "string"
        ? input.cmd
        : typeof input.command === "string"
          ? input.command
          : "";
    if (cmd) return bashSignature(cmd);
  }

  // For file-touching tools, the path is the discriminator. The agent
  // re-reading the same file 30 times is a loop; reading 30 different files
  // is exploration.
  if ((tool === "Read" || tool === "Write") && typeof input.file === "string") {
    return `${tool}:${input.file}`;
  }
  if (tool === "Edit" && typeof input.file === "string") {
    // Edit also has old/new strings; if old_len + new_len repeat, treat as
    // same edit. Cheap proxy for "rewriting the same chunk."
    const olen = (input as any).old_len ?? "";
    const nlen = (input as any).new_len ?? "";
    return `Edit:${input.file}#${olen}>${nlen}`;
  }

  // Fallback: serialize sorted keys → values, truncated.
  const keys = Object.keys(input).sort();
  const flat = keys
    .map((k) => `${k}=${String((input as any)[k]).slice(0, 80)}`)
    .join(";");
  return `${tool}:${flat}`;
}

/** Short human-readable summary for a signature, for the LEARN.md table. */
function summaryFor(
  tool: string,
  input: Record<string, unknown>,
  signature: string,
): string {
  if (tool === "Bash") {
    // Show the verb+path summary derived from the signature, plus a short
    // cmd preview so the human can recognize what the agent was doing.
    const cmd = (input.cmd as string) ?? (input.command as string) ?? "";
    const sigInfo = signature.replace(/^Bash:/, "");
    const preview = cmd.replace(/\s+/g, " ").trim().slice(0, 60);
    return `${sigInfo} — e.g. \`${preview}${cmd.length > 60 ? "…" : ""}\``;
  }
  if (typeof input.file === "string") return input.file;
  return JSON.stringify(input).slice(0, 80);
}

/* ------------------------------------------------------------------ */
/*  Index log discovery                                                */
/* ------------------------------------------------------------------ */

/**
 * Find the latest `*.index.jsonl` for the attempt. The index file is the
 * structured per-tool-call log written by claudefn/kimifn while streaming.
 */
async function findLatestIndexLog(logsDir: string): Promise<string | null> {
  if (!existsSync(logsDir)) return null;
  let entries: string[];
  try {
    entries = await readdir(logsDir);
  } catch {
    return null;
  }

  const indexLogs = entries
    .filter((f) => f.endsWith(".index.jsonl"))
    .sort()
    .reverse();
  return indexLogs[0] ? join(logsDir, indexLogs[0]) : null;
}

/* ------------------------------------------------------------------ */
/*  Main detector                                                      */
/* ------------------------------------------------------------------ */

/**
 * Scan an attempt's session log for repeated tool-call signatures.
 */
export async function detectAttemptLoop(
  wipDir: string,
  options: LoopDetectorOptions = {},
): Promise<LoopDetectionResult> {
  const threshold = options.threshold ?? 5;
  const maxReported = options.maxReported ?? 5;

  const empty: LoopDetectionResult = {
    detected: false,
    hotSignatures: [],
    totalCalls: 0,
  };

  const logsDir = join(wipDir, "logs");
  const indexLog = await findLatestIndexLog(logsDir);
  if (!indexLog) return empty;

  let raw: string;
  try {
    raw = await readFile(indexLog, "utf-8");
  } catch {
    return empty;
  }

  const counts = new Map<string, { count: number; tool: string; summary: string }>();
  let totalCalls = 0;

  for (const line of raw.split("\n")) {
    if (!line) continue;
    let entry: any;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry?.type !== "tool" || entry?.event !== "call") continue;
    const tool = String(entry.data?.tool ?? "");
    const input = (entry.data?.input ?? {}) as Record<string, unknown>;
    if (!tool) continue;

    totalCalls++;
    const sig = signatureFor(tool, input);
    const existing = counts.get(sig);
    if (existing) {
      existing.count++;
    } else {
      counts.set(sig, {
        count: 1,
        tool,
        summary: summaryFor(tool, input, sig),
      });
    }
  }

  const hot = Array.from(counts.values())
    .filter((c) => c.count >= threshold)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxReported)
    .map((c) => ({ tool: c.tool, summary: c.summary, count: c.count }));

  return { detected: hot.length > 0, hotSignatures: hot, totalCalls };
}

/* ------------------------------------------------------------------ */
/*  LEARN.md augmentation                                              */
/* ------------------------------------------------------------------ */

/**
 * Append a "Loop hint" section to LEARN.md if a loop was detected.
 *
 * The hint is phrased as advice the *next* attempt's agent will read in its
 * prompt — explicitly nudging it to question the check predicate when the
 * artifact looks correct.
 */
export async function augmentLearnMdWithLoopHint(
  wipDir: string,
  result: LoopDetectionResult,
): Promise<void> {
  if (!result.detected) return;

  const learnPath = join(wipDir, "LEARN.md");
  const lines: string[] = [];
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## ⚠️  Loop hint — previous attempt appears to have thrashed");
  lines.push("");
  lines.push(
    `Out of ${result.totalCalls} tool calls in the previous attempt, the following operations were repeated many times without making forward progress:`,
  );
  lines.push("");
  lines.push("| Count | Tool | Operation |");
  lines.push("|-------|------|-----------|");
  for (const h of result.hotSignatures) {
    const safeSummary = h.summary.replace(/\|/g, "\\|");
    lines.push(`| ${h.count} | ${h.tool} | \`${safeSummary}\` |`);
  }
  lines.push("");
  lines.push("**What this usually means**: the failing check's predicate may");
  lines.push("not be matching what your artifact actually contains. Before");
  lines.push("rewriting your output again, examine the check command itself:");
  lines.push("");
  lines.push("- Run the check by hand and inspect what it returns.");
  lines.push("- Compare the regex/condition against a few sample lines.");
  lines.push("- If the check is wrong (e.g. expects `*` bullets but you wrote");
  lines.push("  `-` bullets, or `wc` against a file that doesn't exist), the");
  lines.push("  artifact is fine — the predicate is the bug.");
  lines.push("");
  lines.push(
    "If you decide the check is wrong, write a `BUGGY_CHECK.md` in the wip directory with: the check id, why it's wrong, and a corrected `cmd`. The runner will pick it up.",
  );
  lines.push("");

  const block = lines.join("\n");

  if (existsSync(learnPath)) {
    await appendFile(learnPath, block);
  } else {
    await writeFile(learnPath, "# LEARN.md — Loop hint\n" + block);
  }
}
