/**
 * Result Snapshot — Post-execution (RFC 0048)
 *
 * Updates `attempt.json` after the AI finishes (or is blocked). Reads the
 * prior attempt context, re-runs each declared check, probes each expected
 * output, and writes the outcome + duration back into the compact record.
 *
 * This is the clean-break RFC 0048 path: no CHECK.result.md, no
 * TASK.result.md, no data/check-results.json, no data/output-results.json.
 * The journal under .converge/journal/ is for forensic logs only — the
 * agent prompt is built from the AIContextPacket, not from these files.
 */

import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

import {
  readAttemptContext,
  updateAttemptContext,
  type TaskAttemptContext,
} from "./attempt-context.ts";

const execAsync = promisify(exec);

type Outcome = "success" | "failed" | "blocked";

/**
 * Update `attempt.json` with check results, output existence, and outcome.
 * Skips silently if no attempt.json is present (e.g. pre-flight block).
 */
export async function writeResultSnapshot(
  wipDir: string,
  projectDir: string,
  outcome: Outcome,
  durationMs: number,
  attemptNumber: number,
): Promise<void> {
  const ctx = await readAttemptContext(wipDir);
  if (!ctx) return; // no snapshot context — nothing to update

  // Re-check each declared check command. Skipped when outcome is "blocked"
  // because the agent never ran and there is nothing to verify.
  const checks: TaskAttemptContext["checks"] = ctx.checks.map((c) => ({
    id: c.id,
    description: c.description,
    cmd: c.cmd,
  }));

  if (outcome !== "blocked") {
    for (let i = 0; i < checks.length; i++) {
      const check = checks[i];
      if (!check.cmd) continue;
      try {
        const { stdout, stderr } = await execAsync(check.cmd, {
          cwd: projectDir,
          timeout: 120_000,
        });
        checks[i] = {
          ...check,
          passed: true,
          exitCode: 0,
          output: (stdout + stderr).trim(),
        };
      } catch (err: unknown) {
        const e = err as { code?: number; stdout?: string; stderr?: string };
        checks[i] = {
          ...check,
          passed: false,
          exitCode: typeof e.code === "number" ? e.code : 1,
          output: ((e.stdout ?? "") + (e.stderr ?? "")).trim(),
        };
      }
    }
  }

  // Probe each declared output for existence and size.
  const outputs: TaskAttemptContext["outputs"] = [];
  for (const declared of ctx.outputs) {
    const absPath = join(projectDir, declared.path);
    const exists = existsSync(absPath);
    let sizeBytes: number | undefined;
    if (exists) {
      try {
        const s = await stat(absPath);
        sizeBytes = s.size;
      } catch {
        /* ignore — exists already true */
      }
    }
    outputs.push({ path: declared.path, exists, sizeBytes });
  }

  await updateAttemptContext(wipDir, {
    attempt: attemptNumber,
    status: outcome,
    completedAt: new Date().toISOString(),
    durationMs,
    checks,
    outputs,
  });
}
