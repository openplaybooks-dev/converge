/**
 * Context Snapshot — Pre-execution (RFC 0048).
 *
 * Writes `attempt.json` to attempts/<NN>/ before the AI runs. The
 * compact `TaskAttemptContext` record is the primary machine surface
 * and the **source of truth** for the agent prompt (the prompt is
 * built from the `AIContextPacket`, not from any generated file).
 *
 * When `writeMarkdown` is true (the default), the function ALSO writes
 * a set of derived human-readable views alongside `attempt.json`:
 *
 *   NEEDS.md         — pure needs spec (description, inputs, outputs, checks)
 *   NEEDS.result.md  — input evaluation (files found, blocked/ready status)
 *   TASK.md          — verbatim SKILL.md body (for human review)
 *   CHECK.md         — check spec (ids, descriptions, shell commands)
 *   <task-root>/README.md — directory index for humans
 *
 * These files exist for three reasons the agent prompt does not:
 *
 *   1. **Save context window.** The packet is curated; the MD files
 *      are only consulted by humans (or by the agent on explicit opt-in).
 *   2. **Reduce distraction.** Generated MD files look authoritative
 *      and pull the agent into reading them. The packet is the
 *      agent's actual read path; the MD files are for review.
 *   3. **Recover from crash / interrupted runs.** If `attempt.json` is
 *      partially written or corrupt, the MD files are still readable
 *      and let a human reconstruct the attempt's intent.
 *
 * The MD files are derived views — they are not edited by the agent and
 * are not consulted by the prompt builder. LEARN.md, FEEDBACK.md, and
 * INTERRUPTED.md are NOT written: their state is captured in
 * `attempt.json` (`status` + `retryHints`).
 *
 * Returns `blocked: true` when a required input has no file matches so
 * the caller can fail fast without running the AI.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { glob } from "glob";
import { loadRelaxationsFromPreviousAttempt } from "./buggy-check-relaxer.ts";
import {
  writeAttemptContext,
  type TaskAttemptContext,
} from "./attempt-context.ts";

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
  /**
   * RFC 0047: handoff block. When present, the agent is instructed
   * (via the packet) to also generate `artifact` as a review report
   * for a human. The body covers the task's main work; `handoff.generate`
   * covers the report's format and content.
   */
  handoff?: {
    artifact: string;
    format?: "md" | "html";
    generate?: string;
    skill?: string;
  };
  /**
   * RFC 0048: playbook name. Used to populate `TaskAttemptContext.playbook`.
   * Defaults to the `CONVERGE_PLAYBOOK` env var or "default".
   */
  playbook?: string;
  /**
   * RFC 0048: source path of the authored TASK.md (relative to projectDir).
   * Recorded in `TaskAttemptContext.taskSourcePath` so the prompt layer
   * always knows where to edit when a definition change is needed.
   */
  taskSourcePath?: string;
  /**
   * RFC 0048: declared skills for the task. Forwarded into
   * `TaskAttemptContext.skills` and surfaced by the situation classifier
   * / packet builder.
   */
  skills?: string[];
  /**
   * RFC 0048: write the derived human-readable MD files
   * (NEEDS.md / NEEDS.result.md / TASK.md / CHECK.md / task README.md)
   * alongside `attempt.json`. Defaults to `true` for human inspection
   * and crash recovery. Set `false` in tests or to minimize disk writes.
   *
   * The agent prompt is NEVER built from these files — the packet is.
   */
  writeMarkdown?: boolean;
}

export interface ResolvedInput {
  pattern: string;
  count: number;
  samples: string[]; // up to 10 relative paths
}

export interface ContextSnapshotPaths {
  /**
   * RFC 0048: path to the primary per-attempt record. Always written.
   */
  attemptJson: string;
  /** Derived view. Undefined when `writeMarkdown` is false. */
  needsMd?: string;
  /** Derived view. Undefined when `writeMarkdown` is false. */
  needsResultMd?: string;
  /** Derived view. Undefined when `writeMarkdown` is false. */
  taskMd?: string;
  /** Derived view. Undefined when `writeMarkdown` is false. */
  checkMd?: string;
  /** Directory-level index. Undefined when `writeMarkdown` is false. */
  taskReadme?: string;
  relDir: string;
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
    handoff,
    playbook,
    taskSourcePath,
    skills,
    writeMarkdown,
  } = params;

  const writeMd = writeMarkdown !== false; // default true

  await mkdir(attemptDir, { recursive: true });
  await mkdir(join(attemptDir, "data"), { recursive: true });
  await mkdir(join(attemptDir, "logs"), { recursive: true });

  const attemptJson = join(attemptDir, "attempt.json");
  const needsMd = join(attemptDir, "NEEDS.md");
  const needsResultMd = join(attemptDir, "NEEDS.result.md");
  const taskMd = join(attemptDir, "TASK.md");
  const checkMd = join(attemptDir, "CHECK.md");
  const relDir = relative(projectDir, attemptDir).replace(/\\/g, "/");

  // ── Load check relaxations from previous attempt ─────────────────
  // Must run before CHECK.md is written so the human-readable markdown
  // uses the relaxed commands. The compact attempt.json also captures
  // the relaxed command in each check's `cmd` field.
  const relaxations: Array<{ checkId: string; newCmd: string }> = [];
  if (attemptNumber > 1) {
    const prevPadded = String(attemptNumber - 1).padStart(2, "0");
    const prevAttemptDir = join(dirname(attemptDir), prevPadded);
    try {
      const prevRelaxations =
        await loadRelaxationsFromPreviousAttempt(prevAttemptDir);
      relaxations.push(...prevRelaxations);
    } catch {
      /* relaxations are best-effort */
    }
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

  // ── RFC 0048: write attempt.json as the source of truth ──────────
  const attemptCtx: TaskAttemptContext = {
    taskId,
    playbook: playbook ?? process.env.CONVERGE_PLAYBOOK ?? "default",
    attempt: attemptNumber,
    status: blocked ? "blocked" : "ready",
    taskSourcePath: taskSourcePath ?? "",
    inputs: resolvedInputs.map((i) => ({
      pattern: i.pattern,
      count: i.count,
      samples: i.samples,
    })),
    outputs: (outputs ?? []).map((p) => ({
      path: p,
      exists: existsSync(join(projectDir, p)),
    })),
    checks: (checks ?? []).map((c) => ({
      id: c.id,
      description: c.description ?? c.id,
      cmd: relaxedMap.get(c.id) ?? c.cmd ?? "",
    })),
    skills: skills ?? [],
    retryHints: [],
    logs: {
      events: "events.jsonl",
      provider: [], // populated by the agent runner
    },
  };
  await writeAttemptContext(attemptDir, attemptCtx);

  let taskReadme: string | undefined;

  if (writeMd) {
    // ── Derived view: NEEDS.md (pure spec) ─────────────────────────
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

    // ── Derived view: NEEDS.result.md (input evaluation) ───────────
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

    // ── Derived view: TASK.md (verbatim skill body) ───────────────
    const taskMdLines = [
      `# Task: ${taskId}`,
      "",
      skillBody?.trim() ?? "_(no task body found)_",
    ];
    if (handoff?.artifact) {
      const fmt = handoff.format ?? "md";
      taskMdLines.push(
        "",
        "## Review artifact (generate for human review)",
        "",
        `Produce \`${handoff.artifact}\` as a ${fmt} document for human review.`,
      );
      if (handoff.generate?.trim()) {
        taskMdLines.push("", handoff.generate.trim());
      }
      if (handoff.skill?.trim()) {
        taskMdLines.push(
          "",
          `Use the \`${handoff.skill.trim()}\` skill to produce this artifact.`,
        );
      }
    }
    await writeFile(taskMd, taskMdLines.join("\n"));

    // ── Derived view: CHECK.md (pure check spec) ───────────────────
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

    // ── Derived view: task-level README.md (directory index) ──────
    const taskRoot = dirname(dirname(attemptDir));
    const checkSnippet =
      (checks ?? []).length > 0
        ? (checks ?? []).map((c) => `  ${c.cmd ?? `# ${c.id}`}`).join("\n")
        : "  # (no checks defined)";
    taskReadme = join(taskRoot, "README.md");
    await writeFile(
      taskReadme,
      [
        `# Task Journal: ${taskId}`,
        "",
        "## Source of truth",
        "",
        "`attempt.json` is the compact per-attempt record. It is the only",
        "machine surface consulted by the agent prompt (via `AIContextPacket`).",
        "",
        "## Current attempt — `attempts/wip/`",
        "",
        "| File | Purpose |",
        "|------|---------|",
        "| `attempt.json` | Source of truth (compact `TaskAttemptContext`) |",
        "| `NEEDS.md` | Derived view — pure needs spec |",
        "| `NEEDS.result.md` | Derived view — input evaluation runtime data |",
        "| `TASK.md` | Derived view — verbatim task body for human review |",
        "| `CHECK.md` | Derived view — check spec |",
        "| `events.jsonl` | Forensic execution log |",
        "| `logs/provider/` | Provider session logs |",
        "",
        "The MD files are auxiliary. The agent never reads them — its input",
        "is the packet rendered from `attempt.json`.",
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

  return {
    attemptJson,
    needsMd: writeMd ? needsMd : undefined,
    needsResultMd: writeMd ? needsResultMd : undefined,
    taskMd: writeMd ? taskMd : undefined,
    checkMd: writeMd ? checkMd : undefined,
    taskReadme: writeMd ? taskReadme : undefined,
    relDir,
    blocked,
    blockedReason,
    blockedInputs: blockedInputs.map((i) => i.pattern),
  };
}
