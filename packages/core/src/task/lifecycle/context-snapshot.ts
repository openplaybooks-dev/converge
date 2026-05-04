/**
 * Context Snapshot — Pre-execution
 *
 * Writes to attempts/wip/ before the AI runs:
 *
 *   NEEDS.md        — needs spec (description, input patterns, expected outputs)
 *   NEEDS.result.md — input evaluation (actual files found, blocked/ready status)
 *   TASK.md         — verbatim SKILL.md body (AI instructions)
 *   CHECK.md        — check spec (ids, descriptions, shell commands)
 *   data/needs.json — machine-readable needs (inputs, outputs, blocked state)
 *   data/check.json — machine-readable check definitions (read by result-snapshot.ts)
 *   LEARN.md        — carried forward from previous failed attempt (attempt 2+)
 *
 * Returns `blocked: true` when a required input has no file matches so the
 * caller can fail fast without running the AI.
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { glob } from "glob";
import { loadRelaxationsFromPreviousAttempt } from "./buggy-check-relaxer.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ContextSnapshotParams {
  projectDir: string;
  epicId: string;
  taskId: string;
  attemptDir: string;
  description?: string;
  inputs?: string[];
  outputs?: string[];
  checks?: Array<{ id: string; description?: string; cmd?: string }>;
  skillBody?: string;
  attemptNumber: number;
}

export interface ResolvedInput {
  pattern: string;
  count: number;
  samples: string[]; // up to 10 relative paths
}

export interface ContextSnapshotPaths {
  needsMd: string;
  needsResultMd: string;
  taskMd: string;
  checkMd: string;
  needsJson: string;
  checkJson: string;
  learnMd?: string;
  errorContextMd?: string;
  interruptedMd?: string;
  relDir: string;
  hasLearn: boolean;
  hasErrorContext: boolean;
  hasInterrupted: boolean;
  blocked: boolean;
  blockedReason?: string;
  /** Raw input patterns that matched 0 files — used by repair strategies */
  blockedInputs: string[];
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export async function writeContextSnapshot(
  params: ContextSnapshotParams,
): Promise<ContextSnapshotPaths> {
  const {
    projectDir,
    taskId,
    attemptDir,
    description,
    inputs,
    outputs,
    checks,
    skillBody,
    attemptNumber,
  } = params;

  await mkdir(attemptDir, { recursive: true });
  await mkdir(join(attemptDir, "data"), { recursive: true });
  await mkdir(join(attemptDir, "logs"), { recursive: true });

  const needsMd = join(attemptDir, "NEEDS.md");
  const needsResultMd = join(attemptDir, "NEEDS.result.md");
  const taskMd = join(attemptDir, "TASK.md");
  const checkMd = join(attemptDir, "CHECK.md");
  const dataDir = join(attemptDir, "data");
  const needsJson = join(dataDir, "needs.json");
  const checkJson = join(dataDir, "check.json");
  const learnMd = join(attemptDir, "LEARN.md");
  const relDir = relative(projectDir, attemptDir).replace(/\\/g, "/");

  // ── Carry LEARN.md forward from previous archived attempt ─────────
  let hasLearn = false;
  if (attemptNumber > 1) {
    const prevPadded = String(attemptNumber - 1).padStart(2, "0");
    const prevLearnPath = join(dirname(attemptDir), prevPadded, "LEARN.md");
    if (existsSync(prevLearnPath)) {
      await writeFile(learnMd, await readFile(prevLearnPath, "utf-8"));
      hasLearn = true;
    }
  }

  // ── Load check relaxations from previous attempt ─────────────────
  // Must run before check.json and CHECK.md are written so both the
  // structured JSON and the human-readable markdown use relaxed checks.
  const relaxations: Array<{ checkId: string; newCmd: string }> = [];
  if (attemptNumber > 1) {
    const prevPadded = String(attemptNumber - 1).padStart(2, "0");
    const prevAttemptDir = join(dirname(attemptDir), prevPadded);
    try {
      const prevRelaxations = await loadRelaxationsFromPreviousAttempt(prevAttemptDir);
      relaxations.push(...prevRelaxations);
    } catch { /* relaxations are best-effort */ }
  }
  const relaxedMap = new Map(relaxations.map((r) => [r.checkId, r.newCmd]));

  // ── Resolve inputs ────────────────────────────────────────────────
  // Paths with Next.js-style brackets (e.g. [id], [chapterId]) must NOT be passed
  // to glob() — glob treats [...] as character classes and returns zero matches
  // even when the file exists. Use existsSync for literal paths instead.
  function hasGlobWildcards(p: string): boolean {
    return /[*?{}]/.test(p);
  }

  const resolvedInputs: ResolvedInput[] = [];
  for (const pattern of inputs ?? []) {
    try {
      let matches: string[];
      if (!hasGlobWildcards(pattern)) {
        matches = existsSync(join(projectDir, pattern)) ? [pattern] : [];
      } else {
        matches = await glob(pattern, { cwd: projectDir });
      }
      resolvedInputs.push({
        pattern,
        count: matches.length,
        samples: matches.slice(0, 10).sort(),
      });
    } catch {
      resolvedInputs.push({ pattern, count: 0, samples: [] });
    }
  }

  const blockedInputs = resolvedInputs.filter((i) => i.count === 0);
  const blocked = blockedInputs.length > 0;
  const blockedReason = blocked
    ? `Missing required inputs: ${blockedInputs.map((i) => i.pattern).join(", ")}`
    : undefined;

  // ── Write needs.json — needs (inputs, outputs, blocked state) ─
  await writeFile(
    needsJson,
    JSON.stringify(
      {
        taskId,
        attemptNumber,
        inputs: resolvedInputs,
        outputs: outputs ?? [],
        blocked,
        blockedReason,
      },
      null,
      2,
    ),
  );

  // ── Write check.json — check definitions ─────────────────────────
  // Apply relaxations so the structured check JSON stays in sync with
  // the human-readable CHECK.md (which already had relaxations applied).
  const relaxedChecks = (checks ?? []).map((c) => ({
    id: c.id,
    description: c.description ?? c.id,
    cmd: relaxedMap.get(c.id) ?? c.cmd ?? "",
  }));
  await writeFile(
    checkJson,
    JSON.stringify(
      {
        taskId,
        checks: relaxedChecks,
      },
      null,
      2,
    ),
  );

  // ── NEEDS.md — pure needs spec (no runtime data) ────────────
  const reqLines: string[] = [`# Needs: ${taskId}`, ""];
  if (description) reqLines.push("## Description", "", description, "");

  if ((inputs ?? []).length > 0) {
    reqLines.push("## Inputs", "");
    for (const pattern of inputs ?? []) {
      reqLines.push(`- \`${pattern}\``);
    }
    reqLines.push("");
  }

  if ((outputs ?? []).length > 0) {
    reqLines.push("## Expected Outputs", "");
    for (const o of outputs ?? []) reqLines.push(`- \`${o}\``);
    reqLines.push("");
  }

  if ((checks ?? []).length > 0) {
    reqLines.push("## Checks", "");
    for (const c of checks ?? []) {
      reqLines.push(`- **${c.id}**: ${c.description ?? c.id}`);
    }
    reqLines.push("");
  }

  await writeFile(needsMd, reqLines.join("\n"));

  // ── NEEDS.result.md — input evaluation (runtime data) ──────────────
  const reqResultLines: string[] = [
    `# NEEDS.result.md — Attempt ${attemptNumber}`,
    "",
  ];

  if (resolvedInputs.length > 0) {
    reqResultLines.push("## Input State", "");
    for (const inp of resolvedInputs) {
      if (inp.count === 0) {
        reqResultLines.push(
          `### \`${inp.pattern}\``,
          "⛔ **NO FILES FOUND**",
          "",
        );
      } else {
        reqResultLines.push(
          `### \`${inp.pattern}\``,
          `✓ **${inp.count} file(s)**`,
          "",
          ...inp.samples.map((f) => `- \`${f}\``),
          ...(inp.count > inp.samples.length
            ? [`- … and ${inp.count - inp.samples.length} more`]
            : []),
          "",
        );
      }
    }
  }

  reqResultLines.push("## Status", "");
  if (blocked) {
    reqResultLines.push(
      "⛔ **BLOCKED — needs not met**",
      "",
      ...blockedInputs.map((i) => `- \`${i.pattern}\` — no files found`),
    );
  } else {
    reqResultLines.push(
      `✅ **READY** — ${resolvedInputs.length} input pattern(s) satisfied`,
      "",
      `Attempt ${attemptNumber} — ${(outputs ?? []).length} output(s) expected`,
    );
  }

  await writeFile(needsResultMd, reqResultLines.join("\n"));

  // ── TASK.md — verbatim AI instructions ───────────────────────────
  await writeFile(
    taskMd,
    [
      `# Task: ${taskId}`,
      "",
      skillBody?.trim() ?? "_(no task body found)_",
    ].join("\n"),
  );

  // ── CHECK.md — pure check spec ────────────────────────────────────
  const checkLines: string[] = [
    `# Checks: ${taskId}`,
    "",
    "All checks must pass for this task to be considered complete.",
    "Run each command from the project root. Fix failures and re-run.",
  ];
  for (const c of checks ?? []) {
    const cmd = relaxedMap.get(c.id) ?? c.cmd;
    checkLines.push(
      "",
      `## ${c.id}`,
      `**Description**: ${c.description ?? c.id}`,
    );
    if (cmd) checkLines.push(`**Command**: \`${cmd}\``);
  }
  if ((checks ?? []).length === 0) {
    checkLines.push("", "_(no checks defined)_");
  }
  await writeFile(checkMd, checkLines.join("\n"));

  // ── Task-level README.md ──────────────────────────────────────────
  await writeTaskReadme(
    dirname(dirname(attemptDir)),
    taskId,
    relDir,
    checks ?? [],
  );

  const errorContextMd = existsSync(join(attemptDir, "CHECK.result.md"))
    ? join(attemptDir, "CHECK.result.md")
    : existsSync(join(attemptDir, "FEEDBACK.md"))
      ? join(attemptDir, "FEEDBACK.md")
      : null;
  const hasErrorContext = errorContextMd !== null;

  const interruptedMdPath = join(attemptDir, "INTERRUPTED.md");
  const hasInterrupted = existsSync(interruptedMdPath);

  return {
    needsMd,
    needsResultMd,
    taskMd,
    checkMd,
    needsJson,
    checkJson,
    learnMd: hasLearn ? learnMd : undefined,
    errorContextMd: errorContextMd ?? undefined,
    interruptedMd: hasInterrupted ? interruptedMdPath : undefined,
    relDir,
    hasLearn,
    hasErrorContext,
    hasInterrupted,
    blocked,
    blockedReason,
    blockedInputs: blockedInputs.map((i) => i.pattern),
  };
}

/* ------------------------------------------------------------------ */
/*  README writer                                                      */
/* ------------------------------------------------------------------ */

async function writeTaskReadme(
  taskJournalDir: string,
  taskId: string,
  wipRelDir: string,
  checks: Array<{ id: string; description?: string; cmd?: string }>,
): Promise<void> {
  const checkSnippet =
    checks.length > 0
      ? checks.map((c) => `  ${c.cmd ?? `# ${c.id}`}`).join("\n")
      : "  # (no checks defined)";

  await writeFile(
    join(taskJournalDir, "README.md"),
    [
      `# Task Journal: ${taskId}`,
      "",
      "## Current attempt — `attempts/wip/`",
      "",
      "| File | Purpose |",
      "|------|---------|",
      "| `NEEDS.md` | Needs spec (inputs, outputs, checks defined) |",
      "| `NEEDS.result.md` | Input evaluation (files found, blocked/ready) |",
      "| `TASK.md` | Task instructions for the AI |",
      "| `CHECK.md` | Check spec (ids, commands) |",
      "| `CHECK.result.md` | Check outcomes after execution (pass/fail, output state) |",
      "| `LEARN.md` | Failure analysis from previous attempt (attempt 2+) |",
      "| `data/needs.json` | Machine-readable needs (inputs, outputs, blocked state) |",
      "| `data/check.json` | Machine-readable check definitions |",
      "| `data/facts.json` | Facts collected during execution |",
      "",
      "## How to run / resume",
      "",
      "```bash",
      "pnpm converge run --step   # run next pending task",
      "pnpm converge run          # run all remaining tasks",
      "```",
      "",
      "## Verify checks manually",
      "",
      "```bash",
      checkSnippet,
      "```",
    ].join("\n"),
  );
}
