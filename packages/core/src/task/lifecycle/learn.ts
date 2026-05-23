/**
 * Self-Correction: LEARN.md Generator
 *
 * After an attempt fails, this module generates LEARN.md in attempts/wip/
 * by running each check from CHECK.md and recording which passed/failed
 * with their output. The next attempt reads this file in the "Learning phase"
 * before executing, so it knows exactly what to fix.
 *
 * If the AI already wrote a LEARN.md (via the prompt's fail-fast instruction),
 * this is a no-op — the AI's analysis takes priority.
 */

import { writeFile, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import YAML from "yaml";
import { ExecutionTraceLogger } from "../../journal/execution-trace.ts";

const execAsync = promisify(exec);

/**
 * Re-read check definitions from the materialized journal TASK.md.
 * Lets mid-run TASK.md edits take effect immediately rather than being
 * masked by the per-attempt CHECK.md snapshot.
 */
function reReadChecksFromTaskMd(wipDir: string): CheckEntry[] | null {
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
  const out: CheckEntry[] = [];
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

interface CheckEntry {
  id: string;
  description: string;
  cmd: string;
}

interface CheckResult extends CheckEntry {
  passed: boolean;
  exitCode: number;
  output: string;
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export interface RepairMetadata {
  wasRepaired: boolean;
  repairType?: "programmatic" | "ai-driven";
  repairedChecks?: string[];
  reason?: string;
}

/**
 * Generate LEARN.md in wipDir by running each check from CHECK.md.
 * No-op if LEARN.md already exists (AI wrote it) or CHECK.md is missing.
 *
 * If task definition was repaired programmatically, generates a minimal LEARN.md
 * that focuses on task execution without distracting technical repair details.
 */
export interface LearnOptions {
  /** When true, write an empty LEARN.md instead of failure analysis (control group for ablation benchmarks) */
  disableLearnMd?: boolean;
}

export async function generateLearnMd(
  wipDir: string,
  projectDir: string,
  attemptNumber: number,
  repairMetadata?: RepairMetadata,
  traceLogger?: ExecutionTraceLogger,
  options?: LearnOptions,
): Promise<void> {
  const learnPath = join(wipDir, "LEARN.md");

  // Ablation control group: write empty LEARN.md so the next attempt gets no guidance
  if (options?.disableLearnMd) {
    await writeFile(learnPath, "");
    return;
  }

  // AI already wrote LEARN.md during its fail-fast protocol — respect it
  // OR repair strategy already wrote it for next attempt — respect it
  if (existsSync(learnPath)) {
    console.log(`   📘 LEARN.md already exists — using it for next attempt`);
    return;
  }

  const checkMdPath = join(wipDir, "CHECK.md");
  if (!existsSync(checkMdPath)) return;

  // Prefer freshly-parsed TASK.md frontmatter over the per-attempt CHECK.md
  // snapshot so mid-run edits take effect immediately.
  let checks = reReadChecksFromTaskMd(wipDir);
  if (!checks) {
    const checkMd = await readFile(checkMdPath, "utf-8");
    checks = parseCheckMd(checkMd);
  }
  if (checks.length === 0) return;

  // Run every check and record result + execution trace
  const results: CheckResult[] = [];
  for (const check of checks) {
    const checkStart = Date.now();
    try {
      const { stdout, stderr } = await execAsync(check.cmd, {
        cwd: projectDir,
        timeout: 120_000,
      });
      const output = (stdout + stderr).trim();
      results.push({
        ...check,
        passed: true,
        exitCode: 0,
        output,
      });
      // Log to execution trace (Meta-Converge: capture full diagnostic context)
      if (traceLogger) {
        await traceLogger.logCheck(
          check.id,
          check.cmd,
          true,
          output,
          Date.now() - checkStart,
        );
      }
    } catch (err: any) {
      const output = ((err.stdout ?? "") + (err.stderr ?? "")).trim();
      const exitCode = typeof err.code === "number" ? err.code : 1;
      results.push({
        ...check,
        passed: false,
        exitCode,
        output,
      });
      // Log failure to execution trace
      if (traceLogger) {
        await traceLogger.logCheck(
          check.id,
          check.cmd,
          false,
          output,
          Date.now() - checkStart,
        );
      }
    }
  }

  const failed = results.filter((r) => !r.passed);
  const passed = results.filter((r) => r.passed);

  // Format LEARN.md based on repair context
  const lines = formatLearnMd({
    attemptNumber,
    failed,
    passed,
    repairMetadata,
  });

  await writeFile(learnPath, lines.join("\n"));
  console.log(
    `   📘 LEARN.md generated (${failed.length} failed check(s) documented)`,
  );
}

/* ------------------------------------------------------------------ */
/*  Formatting                                                         */
/* ------------------------------------------------------------------ */

interface FormatOptions {
  attemptNumber: number;
  failed: CheckResult[];
  passed: CheckResult[];
  repairMetadata?: RepairMetadata;
}

function formatLearnMd(opts: FormatOptions): string[] {
  const { attemptNumber, failed, passed, repairMetadata } = opts;

  // When task definition was fixed programmatically — keep LEARN.md minimal
  if (
    repairMetadata?.wasRepaired &&
    repairMetadata.repairType === "programmatic"
  ) {
    return [
      `> **Task definition was updated after attempt ${attemptNumber - 1}.**`,
      `>`,
      `> Your job: Read TASK.md and execute it. The definition is now correct.`,
    ];
  }

  // Task execution failed — provide focused guidance
  const lines = [
    `# Attempt ${attemptNumber} Failed`,
    "",
    `**${failed.length}** of **${failed.length + passed.length}** checks did not pass.`,
    "",
  ];

  // Show what failed (focused, minimal)
  if (failed.length > 0) {
    lines.push("## What Failed", "");
    for (const r of failed) {
      lines.push(
        `### ${r.id}`,
        `Command: \`${r.cmd}\``,
        `Exit code: ${r.exitCode}`,
      );
      if (r.output && r.output.trim()) {
        lines.push("```", r.output.trim(), "```");
      }
      lines.push("");
    }
  }

  // Show what passed (brief)
  if (passed.length > 0) {
    lines.push("## Passed", "");
    for (const r of passed) {
      lines.push(`- ✓ ${r.id}`);
    }
    lines.push("");
  }

  return lines;
}

/* ------------------------------------------------------------------ */
/*  INTERRUPTED.md — resume interrupted tasks in-place                 */
/* ------------------------------------------------------------------ */

/**
 * Write INTERRUPTED.md into wip/ so the task runner knows to continue
 * in-place (no archive, no attempt increment) on the next execution.
 *
 * No-op if INTERRUPTED.md already exists.
 */
async function generateInterruptedMd(
  wipDir: string,
  projectDir: string,
  attemptNumber: number,
  existingOutputs: string[],
  missingOutputs: string[],
): Promise<void> {
  const interruptedPath = join(wipDir, "INTERRUPTED.md");
  if (existsSync(interruptedPath)) return;

  const lines: string[] = [
    `# Interrupted — Attempt ${attemptNumber}`,
    "",
    "This task was interrupted mid-execution. Partial progress exists in this directory.",
    "",
  ];

  if (existingOutputs.length > 0) {
    lines.push("## Existing Outputs", "");
    for (const o of existingOutputs) lines.push(`- ✓ ${o}`);
    lines.push("");
  }

  if (missingOutputs.length > 0) {
    lines.push("## Missing Outputs", "");
    for (const o of missingOutputs) lines.push(`- ✗ ${o}`);
    lines.push("");
  }

  // Run checks: prefer freshly-parsed TASK.md frontmatter over CHECK.md
  // snapshot so mid-run edits take effect immediately.
  const checkMdPath = join(wipDir, "CHECK.md");
  let checks = reReadChecksFromTaskMd(wipDir);
  if (!checks && existsSync(checkMdPath)) {
    const checkMd = await readFile(checkMdPath, "utf-8");
    checks = parseCheckMd(checkMd);
  }
  if (checks && checks.length > 0) {
    lines.push("## Check Results", "");
    for (const check of checks) {
      try {
        await execAsync(check.cmd, { cwd: projectDir, timeout: 120_000 });
        lines.push(`### ${check.id}`, "**PASSED** ✓", "");
      } catch (err: any) {
        const output = ((err.stdout ?? "") + (err.stderr ?? "")).trim();
        const exitCode = typeof err.code === "number" ? err.code : 1;
        lines.push(
          `### ${check.id}`,
          "**FAILED**",
          `Command: \`${check.cmd}\``,
          `Exit code: ${exitCode}`,
        );
        if (output) lines.push("```", output, "```");
        lines.push("");
      }
    }
  }

  lines.push(
    "## Instructions",
    "",
    "**Continue from where the previous attempt left off.**",
    "- Do NOT recreate files that already exist and are listed above",
    "- Focus on producing the missing outputs",
    "- Run all checks in CHECK.md when done",
    "",
  );

  await writeFile(interruptedPath, lines.join("\n"));
  console.log(
    `   📘 INTERRUPTED.md generated (resume context for attempt ${attemptNumber})`,
  );
}

/* ------------------------------------------------------------------ */
/*  CHECK.md parser                                                    */
/* ------------------------------------------------------------------ */

function parseCheckMd(content: string): CheckEntry[] {
  const checks: CheckEntry[] = [];
  // Split on `## ` headings (each check is a level-2 section)
  const sections = content.split(/^## /m).slice(1);

  for (const section of sections) {
    const lines = section.split("\n");
    const id = lines[0]?.trim() ?? "";
    if (!id) continue;

    let description = id;
    let cmd = "";

    for (const line of lines.slice(1)) {
      const descMatch = line.match(/^\*\*Description\*\*:\s*(.+)/);
      const cmdMatch = line.match(/^\*\*Command\*\*:\s*`([^`]+)`/);
      if (descMatch) description = descMatch[1].trim();
      if (cmdMatch) cmd = cmdMatch[1].trim();
    }

    if (cmd) checks.push({ id, description, cmd });
  }

  return checks;
}
