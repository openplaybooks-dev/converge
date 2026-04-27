/**
 * Result Snapshot — Post-execution
 *
 * Written to attempts/wip/CHECK.result.md after the AI finishes (or is blocked).
 * Reads needs.json (outputs, blocked state) and check.json (check commands), then:
 *
 *   - Re-checks each expected output (exists? file size?)
 *   - Runs each check command and captures pass/fail + output
 *   - Records outcome, duration, timestamp
 *
 * Pair with CHECK.md (the static spec). Together they give full picture:
 *   CHECK.md        — what checks are defined
 *   CHECK.result.md — how they ran
 */

import { writeFile, readFile, stat, mkdir } from "node:fs/promises";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import YAML from "yaml";

const execAsync = promisify(exec);

/**
 * Re-read check definitions directly from the materialized journal TASK.md.
 * The runner caches checks in `data/check.json` at attempt-start, but a
 * mid-run edit to TASK.md (source or journal) wouldn't take effect for the
 * current attempt. By re-reading from the materialized TASK.md at check time,
 * we always run the freshest check commands.
 *
 * Returns null if TASK.md cannot be located or has no `checks:` frontmatter,
 * in which case the caller should fall back to the cached `data/check.json`.
 */
function reReadChecksFromTaskMd(
  wipDir: string,
): Array<{ id: string; description: string; cmd: string }> | null {
  // wipDir is `<task-root>/attempts/wip` (or `attempts/<NN>` for archived).
  // Materialized journal TASK.md lives at `<task-root>/TASK.md`.
  const taskRoot = dirname(dirname(wipDir));
  const taskMdPath = join(taskRoot, "TASK.md");
  if (!existsSync(taskMdPath)) return null;
  let raw: string;
  try {
    raw = readFileSync(taskMdPath, "utf-8");
  } catch {
    return null;
  }
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  let parsed: any;
  try {
    parsed = YAML.parse(m[1]);
  } catch {
    return null;
  }
  if (!parsed || !Array.isArray(parsed.checks)) return null;
  const out: Array<{ id: string; description: string; cmd: string }> = [];
  for (const c of parsed.checks) {
    if (!c || typeof c !== "object") continue;
    const id = typeof c.id === "string" ? c.id : "";
    const cmd = typeof c.cmd === "string" ? c.cmd : "";
    if (!id || !cmd) continue;
    out.push({
      id,
      description:
        typeof c.description === "string" && c.description ? c.description : id,
      cmd,
    });
  }
  return out.length > 0 ? out : null;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Outcome = "success" | "failed" | "blocked";

interface NeedsManifest {
  taskId: string;
  attemptNumber: number;
  outputs: string[];
  blocked: boolean;
  blockedReason?: string;
}

interface CheckManifest {
  taskId: string;
  checks: Array<{ id: string; description: string; cmd: string }>;
}

interface OutputResult {
  path: string;
  exists: boolean;
  sizeBytes?: number;
  sizeHuman?: string;
}

interface CheckResult {
  id: string;
  description: string;
  cmd: string;
  passed: boolean;
  exitCode: number;
  output: string;
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

/**
 * Write CHECK.result.md and TASK.result.md to wipDir after the attempt completes.
 * Reads needs.json (outputs, blocked state) and check.json (check commands).
 */
export async function writeResultSnapshot(
  wipDir: string,
  projectDir: string,
  outcome: Outcome,
  durationMs: number,
  attemptNumber: number,
): Promise<void> {
  const needsJsonPath = join(wipDir, "data", "needs.json");
  if (!existsSync(needsJsonPath)) return; // no snapshot context — skip

  let manifest: NeedsManifest;
  try {
    manifest = JSON.parse(
      await readFile(needsJsonPath, "utf-8"),
    ) as NeedsManifest;
  } catch {
    return;
  }

  const checkJsonPath = join(wipDir, "data", "check.json");
  let checkManifest: CheckManifest = { taskId: manifest.taskId, checks: [] };
  if (existsSync(checkJsonPath)) {
    try {
      checkManifest = JSON.parse(
        await readFile(checkJsonPath, "utf-8"),
      ) as CheckManifest;
    } catch {
      /* use empty checks */
    }
  }

  // Prefer freshly-parsed checks from the materialized journal TASK.md so
  // mid-run edits take effect immediately. Falls back to cached check.json
  // when TASK.md has no `checks:` block (e.g. WBS parents).
  const fresh = reReadChecksFromTaskMd(wipDir);
  if (fresh) {
    checkManifest = { taskId: manifest.taskId, checks: fresh };
  }

  // ── Re-check each expected output ────────────────────────────────
  const outputResults: OutputResult[] = [];
  for (const outputPath of manifest.outputs) {
    const absPath = join(projectDir, outputPath);
    const exists = existsSync(absPath);
    let sizeBytes: number | undefined;
    let sizeHuman: string | undefined;
    if (exists) {
      try {
        const s = await stat(absPath);
        sizeBytes = s.size;
        sizeHuman = formatBytes(s.size);
      } catch {
        /* ignore */
      }
    }
    outputResults.push({ path: outputPath, exists, sizeBytes, sizeHuman });
  }

  // ── Run each check command ────────────────────────────────────────
  const checkResults: CheckResult[] = [];
  if (outcome !== "blocked") {
    for (const check of checkManifest.checks) {
      if (!check.cmd) continue;
      try {
        const { stdout, stderr } = await execAsync(check.cmd, {
          cwd: projectDir,
          timeout: 120_000,
        });
        checkResults.push({
          ...check,
          passed: true,
          exitCode: 0,
          output: (stdout + stderr).trim(),
        });
      } catch (err: any) {
        checkResults.push({
          ...check,
          passed: false,
          exitCode: typeof err.code === "number" ? err.code : 1,
          output: ((err.stdout ?? "") + (err.stderr ?? "")).trim(),
        });
      }
    }
  }

  // ── Build RESULT.md ───────────────────────────────────────────────
  const lines: string[] = [`# RESULT.md — Attempt ${attemptNumber}`, ""];

  // Header
  const outcomeLabel =
    outcome === "success"
      ? "✅ SUCCESS"
      : outcome === "blocked"
        ? "⛔ BLOCKED"
        : "❌ FAILED";
  lines.push(
    `**Outcome**: ${outcomeLabel}`,
    `**Duration**: ${formatDuration(durationMs)}`,
    `**Completed**: ${new Date().toISOString()}`,
    "",
  );

  // Blocked reason
  if (outcome === "blocked" && manifest.blockedReason) {
    lines.push("## Blocked Reason", "", manifest.blockedReason, "");
  }

  // Output state
  if (outputResults.length > 0) {
    lines.push("## Outputs", "");
    for (const r of outputResults) {
      const status = r.exists
        ? `✓ produced${r.sizeHuman ? ` (${r.sizeHuman})` : ""}`
        : "✗ missing";
      lines.push(`- \`${r.path}\` — ${status}`);
    }
    lines.push("");
  }

  // Check results
  if (checkResults.length > 0) {
    const allPassed = checkResults.every((r) => r.passed);
    lines.push(
      `## Check Results — ${allPassed ? "✅ all passed" : "❌ some failed"}`,
      "",
    );

    // Summary table
    for (const r of checkResults) {
      lines.push(`- ${r.passed ? "✓" : "✗"} **${r.id}**: ${r.description}`);
    }
    lines.push("");

    // Details for failures
    const failed = checkResults.filter((r) => !r.passed);
    if (failed.length > 0) {
      lines.push("## Failed Check Details", "");
      for (const r of failed) {
        lines.push(
          `### ${r.id} — ❌ FAILED`,
          `**Command**: \`${r.cmd}\``,
          `**Exit code**: ${r.exitCode}`,
        );
        if (r.output) {
          lines.push("**Output**:", "```", r.output, "```");
        } else {
          lines.push("**Output**: *(none)*");
        }
        lines.push("");
      }
    }
  }

  // Pre-flight / blocked-state paths may call us before the attempt dir has
  // been set up (no wip junction created yet). Ensure the directory exists
  // so the writeFile call doesn't ENOENT.
  await mkdir(wipDir, { recursive: true });

  await writeFile(join(wipDir, "CHECK.result.md"), lines.join("\n"));

  await writeTaskResultMd(wipDir, attemptNumber);
}

/* ------------------------------------------------------------------ */
/*  TASK.result.md — agent output summary                             */
/* ------------------------------------------------------------------ */

async function writeTaskResultMd(
  wipDir: string,
  attemptNumber: number,
): Promise<void> {
  const logsDir = join(wipDir, "logs");
  const outPath = join(wipDir, "TASK.result.md");

  const header = `# TASK.result.md — Attempt ${attemptNumber}\n\n`;

  if (!existsSync(logsDir)) {
    await writeFile(
      outPath,
      header + "_(no agent logs — task was blocked or skipped)_\n",
    );
    return;
  }

  const jsonlFiles = readdirSync(logsDir)
    .filter((f) => f.endsWith(".index.jsonl"))
    .sort();

  if (jsonlFiles.length === 0) {
    await writeFile(outPath, header + "_(no agent log files found)_\n");
    return;
  }

  // Latest session = last by name (ISO timestamp prefix sorts lexicographically)
  const latestFile = join(logsDir, jsonlFiles.at(-1)!);
  const lines = readFileSync(latestFile, "utf-8").split("\n").filter(Boolean);

  const textBlocks: string[] = [];
  let sessionCompleted:
    | {
        ts: string;
        duration_ms: number;
        tool_calls: number;
        thinking_blocks: number;
        text_blocks: number;
      }
    | undefined;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (
        entry.type === "output" &&
        entry.event === "text" &&
        entry.data?.text
      ) {
        textBlocks.push(entry.data.text);
      } else if (entry.type === "session" && entry.event === "completed") {
        sessionCompleted = {
          ts: entry.ts,
          duration_ms: entry.duration_ms ?? 0,
          tool_calls: entry.data?.tool_calls ?? 0,
          thinking_blocks: entry.data?.thinking_blocks ?? 0,
          text_blocks: entry.data?.text_blocks ?? 0,
        };
      }
    } catch {
      // skip unparseable lines
    }
  }

  const mdLines: string[] = [header.trimEnd()];

  if (sessionCompleted) {
    mdLines.push(
      "",
      `**Completed**: ${sessionCompleted.ts}`,
      `**Duration**: ${formatDuration(sessionCompleted.duration_ms)}  |  **Tool calls**: ${sessionCompleted.tool_calls}  |  **Thinking blocks**: ${sessionCompleted.thinking_blocks}  |  **Text blocks**: ${sessionCompleted.text_blocks}`,
    );
  }

  if (textBlocks.length === 0) {
    mdLines.push("", "_(no text output recorded)_");
  } else {
    mdLines.push("", "## Agent Output", "");
    for (let i = 0; i < textBlocks.length; i++) {
      const label =
        i === textBlocks.length - 1
          ? `### Block ${i + 1} (final)`
          : `### Block ${i + 1}`;
      mdLines.push(label, "", textBlocks[i].trimEnd(), "");
    }
  }

  await writeFile(outPath, mdLines.join("\n"));
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}
