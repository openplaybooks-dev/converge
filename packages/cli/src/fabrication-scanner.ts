/**
 * Fabrication scanner — block tasks that satisfy file-existence checks
 * by hand-rolling fallback output instead of running the declared script.
 *
 * Pattern observed: when a paid-API script fails (env, network, budget),
 * the agent sometimes writes its own Python heredoc that produces a fake
 * version of the expected output (band-slicing concept.png to fake
 * extracted layers, copying visual-target.png to fake a concept,
 * hand-typing JSON manifests). The output passes file-exists checks but
 * contaminates every downstream task that uses it.
 *
 * The agent's own bash command literally announces the corner-cutting
 * with words like "fallback" / "stub" / "band-extraction". This scanner
 * looks for those markers in the attempt's tool-use history and rejects
 * the task before it can mark itself complete.
 *
 * Triggered as a post-execution gate in the autonomous-run state machine.
 */

import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

/** Phrases that indicate the agent fabricated output instead of running the script. */
const FABRICATION_MARKERS: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /\bband[- ]extraction\b/i, tag: "band-extraction" },
  { pattern: /\blocal[- ]fallback\b/i, tag: "local-fallback" },
  { pattern: /\bsensible defaults?\b/i, tag: "sensible-defaults" },
  { pattern: /\bplaceholder (manifest|output|image|json)\b/i, tag: "placeholder-output" },
  { pattern: /\bstub (manifest|output|image|json)\b/i, tag: "stub-output" },
  { pattern: /\bhand[- ]rolled\b/i, tag: "hand-rolled" },
  { pattern: /\bhand[- ]typed\b/i, tag: "hand-typed" },
  { pattern: /\bfake (manifest|output|image|json)\b/i, tag: "fake-output" },
  { pattern: /# *fallback (so|because|when)/i, tag: "fallback-comment" },
  { pattern: /\bskip(ping)? the api\b/i, tag: "skip-api" },
];

export interface FabricationFinding {
  marker: string;
  /** Excerpt around the match. */
  excerpt: string;
  /** Source file (log path) the marker was found in. */
  source: string;
}

export interface FabricationScanResult {
  fabricated: boolean;
  findings: FabricationFinding[];
}

async function findNewestLogs(dir: string, max: number): Promise<string[]> {
  if (!existsSync(dir)) return [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const logs: Array<{ path: string; mtimeMs: number }> = [];
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!e.name.endsWith(".log") && !e.name.endsWith(".jsonl")) continue;
      const p = join(dir, e.name);
      try {
        const st = await stat(p);
        logs.push({ path: p, mtimeMs: st.mtimeMs });
      } catch {
        /* ignore */
      }
    }
    logs.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return logs.slice(0, max).map((l) => l.path);
  } catch {
    return [];
  }
}

function scanText(text: string, source: string): FabricationFinding[] {
  if (!text) return [];
  const findings: FabricationFinding[] = [];
  for (const m of FABRICATION_MARKERS) {
    const match = m.pattern.exec(text);
    if (!match) continue;
    const i = match.index;
    const lo = Math.max(0, i - 80);
    const hi = Math.min(text.length, i + 120);
    findings.push({
      marker: m.tag,
      excerpt: text.slice(lo, hi).replace(/\s+/g, " ").trim(),
      source,
    });
  }
  return findings;
}

/**
 * Scan the latest attempt's logs under {taskJournalDir}/attempts/wip/logs/
 * (or attempts/<n>/logs if wip is gone) for fabrication markers. Returns
 * a result the caller can inspect.
 *
 * The caller decides whether to override the task's success — a fabrication
 * finding inside a quoted string in a *successful* tool result is fine if
 * the agent's own narration says "I am NOT going to fall back". The default
 * conservative policy: any finding flips success to failure.
 */
export async function scanForFabrication(
  taskJournalDir: string,
): Promise<FabricationScanResult> {
  const attemptsDir = join(taskJournalDir, "attempts");
  if (!existsSync(attemptsDir)) {
    return { fabricated: false, findings: [] };
  }

  let candidate: string | null = null;
  const wip = join(attemptsDir, "wip");
  if (existsSync(wip)) {
    candidate = wip;
  } else {
    try {
      const subs = await readdir(attemptsDir, { withFileTypes: true });
      const numeric = subs
        .filter((s) => s.isDirectory() && /^\d+$/.test(s.name))
        .sort((a, b) => b.name.localeCompare(a.name));
      if (numeric.length > 0) candidate = join(attemptsDir, numeric[0].name);
    } catch {
      /* ignore */
    }
  }
  if (!candidate) return { fabricated: false, findings: [] };

  const logs = await findNewestLogs(join(candidate, "logs"), 4);
  const findings: FabricationFinding[] = [];
  for (const log of logs) {
    try {
      const text = await readFile(log, "utf-8");
      // Only scan the BASH tool inputs — the agent's own commands.
      // The streamed JSONL has lines like:
      //   [TOOL_USE] Tool: Bash
      //   Input: {...command: "...heredoc..."}
      // Plain-text logs include those Input lines verbatim. Match against
      // the whole text — if a fabrication marker shows up anywhere in
      // the agent's own tool calls, that's enough signal.
      findings.push(...scanText(text, log));
    } catch {
      /* ignore individual logs */
    }
  }

  // De-dupe by marker tag to avoid spamming repeated hits.
  const seen = new Set<string>();
  const unique = findings.filter((f) => {
    if (seen.has(f.marker)) return false;
    seen.add(f.marker);
    return true;
  });

  return { fabricated: unique.length > 0, findings: unique };
}

export function formatFabricationReport(scan: FabricationScanResult): string {
  if (!scan.fabricated) return "";
  const lines = [
    "❌ Fabrication detected in this attempt's tool-use log:",
    ...scan.findings.map(
      (f) => `   • ${f.marker}: "${f.excerpt}" (in ${f.source})`,
    ),
    "   The agent appears to have hand-rolled a fallback instead of running the declared script.",
    "   This attempt is being marked failed even though file-existence checks passed —",
    "   a fabricated output passes those checks but contaminates downstream tasks.",
  ];
  return lines.join("\n");
}
