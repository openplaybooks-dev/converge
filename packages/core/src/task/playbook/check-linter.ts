/**
 * Check Linter — Pre-flight validation of TASK.md `checks`.
 *
 * Fail-closed at playbook start time, so the agent never thrashes against
 * a check whose `cmd` is logically inverted, references a nonexistent file,
 * or always returns the same exit code regardless of state.
 *
 * The linter runs each check's `cmd` in a temp directory under two conditions:
 *   1. Empty control — no files. Most checks should FAIL here (because their
 *      target outputs do not exist yet). A check that PASSES with no inputs
 *      is a contract bug (it would always pass, no matter what the agent does).
 *   2. Positive control — declared `outputs` are touched as empty files. A
 *      check that FAILS here may be too strict to ever satisfy with reasonable
 *      output, but we treat this as advisory (warn-only) because many checks
 *      reasonably require non-empty content.
 *
 * Static lint also catches common syntax mistakes (unbalanced quotes, etc.).
 *
 * Dangerous commands (`rm`, `kill`, network) are skipped — we report them as
 * "unverified" rather than guess.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import type { CheckDef } from "../lifecycle/after.ts";

const execAsync = promisify(exec);

/** Per-task lint result. */
export interface CheckLintResult {
  taskId: string;
  checkId: string;
  cmd: string;
  /**
   * - `ok` — check fails on empty control (correctly distinguishes absent from valid output).
   * - `tautology` — check passes BOTH on empty control AND positive control.
   *   This is a real contract bug: the check can never fail, so it can never
   *   verify the agent's work.
   * - `weak` — check passes on empty control, but we couldn't verify positive
   *   control (no outputs declared, or positive control wasn't run). Advisory.
   * - `syntax-error` — cmd has a parse error before we even get to run it.
   * - `unverified` — cmd is too dangerous to dry-run; skipped on purpose.
   */
  status: "ok" | "tautology" | "weak" | "syntax-error" | "unverified";
  detail?: string;
}

export interface CheckLintReport {
  results: CheckLintResult[];
  hasErrors: boolean;
}

/** Anything in here triggers "unverified" — we will not dry-run. */
const DANGEROUS_PATTERNS = [
  /\brm\s/, // file deletion
  /\bkill\b/, // process kill
  /\bcurl\b/, // network
  /\bwget\b/, // network
  /\bgit\s+push/, // remote write
  /\bnpm\s+publish/, // package registry
  /\b>\s*\/dev\//, // device write
  /\bsudo\b/, // privilege escalation
  /\bdd\b/, // disk write
  /\bmkfs/, // filesystem format
];

function isDangerous(cmd: string): boolean {
  return DANGEROUS_PATTERNS.some((p) => p.test(cmd));
}

/**
 * Static parse check: look for obviously-broken syntax that bash would reject.
 * We use `bash -n` (parse-only mode) which exits 0 if syntax is valid.
 */
async function checkSyntax(cmd: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const escaped = cmd.replace(/'/g, "'\\''");
    await execAsync(`bash -n -c '${escaped}'`, { timeout: 5_000 });
    return { ok: true };
  } catch (err: unknown) {
    const e = err as { stderr?: string };
    return { ok: false, error: (e.stderr || "syntax error").trim() };
  }
}

/**
 * Run cmd in a temp dir and return its exit code.
 * Returns 0 for pass, non-zero for fail. Throws on internal errors.
 */
async function runInSandbox(cmd: string, sandboxDir: string): Promise<number> {
  try {
    await execAsync(cmd, {
      cwd: sandboxDir,
      timeout: 10_000,
      shell: "/bin/bash",
    });
    return 0;
  } catch (err: unknown) {
    const e = err as { code?: number };
    return typeof e.code === "number" ? e.code : 1;
  }
}

async function lintOneCheck(
  taskId: string,
  check: CheckDef,
  outputs: string[],
): Promise<CheckLintResult> {
  // 1. Skip dangerous commands — we will not run them speculatively.
  if (isDangerous(check.cmd)) {
    return {
      taskId,
      checkId: check.id,
      cmd: check.cmd,
      status: "unverified",
      detail: "command contains potentially destructive operation",
    };
  }

  // 2. Static syntax check.
  const syn = await checkSyntax(check.cmd);
  if (!syn.ok) {
    return {
      taskId,
      checkId: check.id,
      cmd: check.cmd,
      status: "syntax-error",
      detail: syn.error,
    };
  }

  // 3. Empty-control: run in empty sandbox.
  const emptySandbox = await mkdtemp(join(tmpdir(), "converge-checklint-"));
  let emptyPassed = false;
  try {
    emptyPassed = (await runInSandbox(check.cmd, emptySandbox)) === 0;
  } finally {
    await rm(emptySandbox, { recursive: true, force: true }).catch(() => {});
  }

  // If the check FAILED on empty (the common case), it is well-formed —
  // it can distinguish "no work done" from "work done."
  if (!emptyPassed) {
    return { taskId, checkId: check.id, cmd: check.cmd, status: "ok" };
  }

  // The check PASSED on empty. That's suspicious. Now check whether it ALSO
  // passes when outputs exist with placeholder content. If yes, it's a
  // tautology — it always passes regardless of agent behavior. That's a
  // hard error.
  // If we can't run a positive control (no declared outputs), we downgrade
  // to a "weak" warning rather than blocking.
  if (outputs.length === 0) {
    return {
      taskId,
      checkId: check.id,
      cmd: check.cmd,
      status: "weak",
      detail:
        "check passes on empty sandbox; no outputs declared so positive " +
        "control could not be run",
    };
  }

  const positiveSandbox = await mkdtemp(join(tmpdir(), "converge-checklint-"));
  try {
    for (const out of outputs) {
      const target = join(positiveSandbox, out);
      await mkdir(dirname(target), { recursive: true });
      // Use a richer placeholder so word-count, line-count, and basic
      // grep-pattern checks still distinguish "real content" from "empty."
      // 800 words of placeholder text exceeds the most common ranges (300–600).
      const placeholder =
        "placeholder content line.\n".repeat(40) +
        Array.from({ length: 800 }, () => "lorem").join(" ") +
        "\n";
      await writeFile(target, placeholder);
    }
    const positivePassed =
      (await runInSandbox(check.cmd, positiveSandbox)) === 0;

    if (emptyPassed && positivePassed) {
      // Same outcome both ways → tautology.
      return {
        taskId,
        checkId: check.id,
        cmd: check.cmd,
        status: "tautology",
        detail:
          "check passes on BOTH empty and populated sandbox — predicate " +
          "always succeeds regardless of agent output",
      };
    }

    // emptyPassed=true, positivePassed=false → soft check (e.g. wc -w with
    // upper bound that placeholder would exceed). This is intended behavior.
    return { taskId, checkId: check.id, cmd: check.cmd, status: "ok" };
  } finally {
    await rm(positiveSandbox, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Lint all checks across all tasks.
 *
 * @param tasks  list of {taskId, checks, outputs} from Unit objects
 * @returns      report with per-check status; `hasErrors` is true when any
 *               check is `always-passes` or `syntax-error`
 */
export async function lintChecks(
  tasks: Array<{ taskId: string; checks?: CheckDef[]; outputs?: string[] }>,
): Promise<CheckLintReport> {
  const results: CheckLintResult[] = [];

  // Run lints in parallel batches to keep startup fast.
  const flat: Array<{ taskId: string; check: CheckDef; outputs: string[] }> =
    [];
  for (const t of tasks) {
    if (!t.checks?.length) continue;
    for (const check of t.checks) {
      flat.push({ taskId: t.taskId, check, outputs: t.outputs ?? [] });
    }
  }

  // Cap concurrency — don't fork more than 8 bash processes at once.
  const CONCURRENCY = 8;
  for (let i = 0; i < flat.length; i += CONCURRENCY) {
    const batch = flat.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(({ taskId, check, outputs }) =>
        lintOneCheck(taskId, check, outputs),
      ),
    );
    results.push(...batchResults);
  }

  const hasErrors = results.some(
    (r) => r.status === "tautology" || r.status === "syntax-error",
  );

  return { results, hasErrors };
}

/**
 * Format a lint report for terminal display.
 */
export function formatLintReport(report: CheckLintReport): string {
  if (report.results.length === 0) {
    return "✅ No checks to lint.";
  }

  const errors = report.results.filter(
    (r) => r.status === "tautology" || r.status === "syntax-error",
  );
  const weak = report.results.filter((r) => r.status === "weak");
  const unverified = report.results.filter((r) => r.status === "unverified");
  const passed = report.results.filter((r) => r.status === "ok");

  const lines: string[] = [];
  lines.push(
    `🧪 Check lint: ${passed.length} ok, ${weak.length} weak, ${unverified.length} unverified, ${errors.length} error(s)`,
  );

  if (errors.length > 0) {
    lines.push("");
    lines.push("❌ Errors (run will be blocked):");
    for (const r of errors) {
      lines.push(`  • [${r.taskId}] ${r.checkId} — ${r.status}`);
      lines.push(`      cmd: ${r.cmd}`);
      if (r.detail) lines.push(`      ${r.detail}`);
    }
  }

  if (weak.length > 0) {
    lines.push("");
    lines.push("⚠️  Weak (advisory — check may not detect all failure modes):");
    for (const r of weak) {
      lines.push(`  • [${r.taskId}] ${r.checkId}`);
      if (r.detail) lines.push(`      ${r.detail}`);
    }
  }

  if (unverified.length > 0) {
    lines.push("");
    lines.push("ℹ️  Unverified (skipped, contains destructive ops):");
    for (const r of unverified) {
      lines.push(`  • [${r.taskId}] ${r.checkId}`);
    }
  }

  return lines.join("\n");
}
