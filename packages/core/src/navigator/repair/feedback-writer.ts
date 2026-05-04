/**
 * prepareFeedback
 *
 * Writes FEEDBACK.md into the attempt dir before task-run retries,
 * so the AI gets exact check results (pass/fail, command, exit code, output)
 * and targeted instructions for broken commands.
 *
 * FEEDBACK.md is distinct from CHECK.result.md:
 *   - CHECK.result.md — authoritative post-execution artifact written by
 *     result-snapshot.ts after the AI finishes. Fundamental, computed.
 *   - FEEDBACK.md — optional pre-retry context written here before the
 *     next attempt, so the AI knows what failed and how to fix it.
 *
 * Handles two gap kinds:
 *   - check-failed: runs checks fresh, reports pass/fail with commands
 *   - output: reports missing declared outputs + sibling-file hints so
 *     the AI can detect renames (e.g. next.config.js vs next.config.ts)
 */

import { writeFile, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, basename, join, relative } from "node:path";
import type { Gap } from "../../task/gap/types.ts";
import { loadRelaxationsFromPreviousAttempt } from "../../task/lifecycle/buggy-check-relaxer.ts";

function isBrokenCheck(r: {
  cmd: string;
  exitCode: number;
  output: string;
}): boolean {
  if (r.exitCode === 127) return true;
  const out = r.output.toLowerCase();
  if (out.includes("command not found") || out.includes("not found"))
    return true;
  if (/^!\s+\S+.*\|/.test(r.cmd)) return true;
  return false;
}

/**
 * Tracks which `(attemptDir, gapKind)` pairs we've already written FEEDBACK.md
 * for in the current repair cycle. `repair-loop` calls `prepareFeedback` once
 * per gap; for task-scoped feedback (check-failed, output) all gaps collapse
 * into the same aggregate report, so we only need to write once per attempt
 * dir. The cache is cleared at the start of each repair cycle.
 */
const writtenKeys = new Set<string>();

export function resetFeedbackDedupe(): void {
  writtenKeys.clear();
}

export async function prepareFeedback(
  gap: Gap,
  projectDir: string,
): Promise<void> {
  const gapKind = (gap.metadata?.gapKind as string) ?? "";
  const attemptDir = process.env.CONVERGE_TASK_ATTEMPT_DIR;
  if (!attemptDir) return;

  const key = `${attemptDir}::${gapKind}`;
  if (writtenKeys.has(key)) return;
  writtenKeys.add(key);

  if (gapKind === "output") {
    await writeOutputFeedback(gap, projectDir, attemptDir);
    return;
  }

  if (gapKind !== "check-failed") return;

  // Read check.json to get ALL check definitions for this task
  const checkJsonPath = join(attemptDir, "data", "check.json");
  let allChecks: Array<{ id: string; description: string; cmd: string }> = [];
  if (existsSync(checkJsonPath)) {
    try {
      const manifest = JSON.parse(await readFile(checkJsonPath, "utf-8"));
      allChecks = manifest.checks ?? [];
    } catch {
      /* fall through to gap metadata */
    }
  }

  // Load relaxations from the previous attempt so buggy-check proposals
  // are applied even when check.json hasn't been regenerated yet.
  let relaxedMap = new Map<string, string>();
  try {
    const prevAttemptDir = join(dirname(attemptDir), String(Number(process.env.CONVERGE_TASK_ATTEMPT ?? "2") - 1).padStart(2, "0"));
    const prevRelaxations = await loadRelaxationsFromPreviousAttempt(prevAttemptDir);
    for (const r of prevRelaxations) {
      relaxedMap.set(r.checkId, r.newCmd);
    }
  } catch { /* relaxations are best-effort */ }

  // Fallback: use the single failing check from gap metadata
  if (allChecks.length === 0) {
    const checkId = (gap.metadata?.checkId as string) ?? "unknown";
    const checkCmd = (gap.metadata?.checkCmd as string) ?? "";
    const checkDescription =
      (gap.metadata?.checkDescription as string) ?? checkId;
    if (checkCmd) {
      const relaxedCmd = relaxedMap.get(checkId) ?? checkCmd;
      allChecks = [
        { id: checkId, description: checkDescription, cmd: relaxedCmd },
      ];
    }
  } else {
    // Apply relaxations to checks loaded from check.json
    allChecks = allChecks.map((c) => ({
      ...c,
      cmd: relaxedMap.get(c.id) ?? c.cmd,
    }));
  }

  if (allChecks.length === 0) return;

  // Run ALL checks fresh and collect results
  const { check } = await import("../../task/facts/api.ts");
  const results: Array<{
    id: string;
    description: string;
    cmd: string;
    passed: boolean;
    exitCode: number;
    output: string;
    broken: boolean;
  }> = [];

  for (const c of allChecks) {
    if (!c.cmd) continue;
    try {
      const r = await check(c.cmd, projectDir, 120_000);
      results.push({
        ...c,
        passed: r.ok,
        exitCode: r.exitCode,
        output: r.output,
        broken:
          !r.ok &&
          isBrokenCheck({ cmd: c.cmd, exitCode: r.exitCode, output: r.output }),
      });
    } catch (err: any) {
      results.push({
        ...c,
        passed: false,
        exitCode: 1,
        output: err.message,
        broken: false,
      });
    }
  }

  const failed = results.filter((r) => !r.passed);
  if (failed.length === 0) return; // all passed — nothing to report

  // Build FEEDBACK.md
  const lines: string[] = [
    "# FEEDBACK.md — Check Results",
    "",
    `**Status**: ❌ ${failed.length}/${results.length} check(s) failed`,
    "",
  ];

  // Summary
  for (const r of results) {
    lines.push(`- ${r.passed ? "✅" : "❌"} **${r.id}**`);
  }
  lines.push("");

  // Failed check details
  for (const r of failed) {
    lines.push(`## ❌ ${r.id}`, "");
    lines.push(`**Command**: \`${r.cmd}\``);
    lines.push(`**Exit code**: ${r.exitCode}`);
    if (r.output) {
      lines.push("**Output**:", "```", r.output.trim(), "```");
    }
    lines.push("");

    if (r.broken) {
      lines.push(
        "> **BROKEN COMMAND** — The check command itself cannot run.",
        "> This is NOT a code problem. Fix the `cmd` in the source TASK.md",
        `> (in \`.converge/epics/\`). Look for the check with id \`${r.id}\`.`,
        "> Replace absolute/platform-specific paths with portable commands.",
        `> Example: \`grep -q "pattern" "file.tsx"\``,
        "",
      );
    }
  }

  await writeFile(join(attemptDir, "FEEDBACK.md"), lines.join("\n"));
  console.log(`   📋 FEEDBACK.md written (${failed.length} check(s) failed)`);
}

/**
 * Write FEEDBACK.md for missing-output gaps.
 *
 * Derives the full outputs list from TASK.md (authoritative), checks each on
 * disk, and reports all missing outputs with sibling-file hints so the AI can
 * spot renames (e.g. declared `next.config.js` but scaffolder wrote
 * `next.config.ts`). Emits clear repair guidance: create the file, rename,
 * or update TASK.md's outputs list.
 *
 * Idempotent: each call re-derives state from disk, so repeated invocations
 * (one per gap in the loop) produce the same content.
 */
async function writeOutputFeedback(
  gap: Gap,
  projectDir: string,
  attemptDir: string,
): Promise<void> {
  const unitPath = gap.metadata?.unitPath as string | undefined;
  if (!unitPath || !existsSync(unitPath)) return;

  let outputs: string[] = [];
  let deletedOutputs: Set<string> = new Set();
  let taskTitle = (gap.metadata?.taskTitle as string | undefined) ?? "";
  try {
    const { parseTaskMd } = await import("../../config/task-md-definition.ts");
    const parsed = await parseTaskMd(unitPath);
    outputs = parsed?.def?.outputs ?? [];
    taskTitle = parsed?.def?.title ?? taskTitle;
    // Detect (deleted) annotations from the raw TASK.md so we don't flag
    // intentionally-deleted files as missing.
    const raw = await readFile(unitPath, "utf-8");
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    if (m) {
      const { parse: parseYaml } = await import("yaml");
      const frontmatter = parseYaml(m[1]);
      if (Array.isArray(frontmatter?.outputs)) {
        for (const o of frontmatter.outputs) {
          if (typeof o === "string" && /\s+\(deleted\b[^)]*\)$/.test(o)) {
            deletedOutputs.add(o.replace(/\s+\(deleted\b[^)]*\)$/, ""));
          }
        }
      }
    }
  } catch {
    return;
  }
  if (outputs.length === 0) return;

  const presence = outputs.map((out) => ({
    path: out,
    exists: existsSync(join(projectDir, out)),
    isDeleted: deletedOutputs.has(out),
  }));
  // (deleted) outputs should NOT exist — skip them from the missing check.
  const missing = presence.filter((p) => !p.exists && !p.isDeleted);
  if (missing.length === 0) return;

  const relUnitPath = relative(projectDir, unitPath).replace(/\\/g, "/");
  const lines: string[] = [
    "# FEEDBACK.md — Missing Outputs",
    "",
    `**Task**: ${taskTitle || gap.scope}`,
    `**Status**: ❌ ${missing.length}/${outputs.length} declared output(s) not found on disk`,
    "",
    "## Outputs",
    "",
  ];
  for (const p of presence) {
    lines.push(`- ${p.exists ? "✅" : "❌"} \`${p.path}\``);
  }
  lines.push("");

  for (const m of missing) {
    lines.push(`## ❌ Missing: \`${m.path}\``, "");
    const parentDir = join(projectDir, dirname(m.path));
    const missingBase = basename(m.path);
    const missingStem = missingBase.replace(/\.[^.]+$/, "");
    if (existsSync(parentDir)) {
      let siblings: string[] = [];
      try {
        siblings = await readdir(parentDir);
      } catch {
        // dir unreadable
      }
      // Surface likely renames first: same stem, different extension
      const likelyRenames = siblings.filter(
        (s) => s.startsWith(missingStem + ".") && s !== missingBase,
      );
      if (likelyRenames.length > 0) {
        lines.push(
          `**Likely rename detected** — same basename, different extension:`,
        );
        for (const r of likelyRenames) {
          lines.push(`- \`${dirname(m.path)}/${r}\``);
        }
        lines.push("");
      }
      if (siblings.length > 0) {
        lines.push(
          `Files present in \`${dirname(m.path)}/\` (up to 20):`,
          "",
          "```",
          siblings.slice(0, 20).join("\n"),
          "```",
          "",
        );
      } else {
        lines.push(
          `Directory \`${dirname(m.path)}/\` exists but is empty.`,
          "",
        );
      }
    } else {
      lines.push(
        `Parent directory \`${dirname(m.path)}/\` does not exist.`,
        "",
      );
    }
  }

  lines.push(
    "## How to fix",
    "",
    "Pick ONE of these, based on what you find above:",
    "",
    "1. **If the file truly is missing** — create it per TASK.md instructions.",
    `2. **If a sibling file satisfies the same purpose** (e.g. \`.ts\` variant of a declared \`.js\` output) — update the outputs list in the source TASK.md to match what actually exists:`,
    `   - Edit \`${relUnitPath}\``,
    `   - Replace the missing output path with the actual filename on disk.`,
    `   - Do NOT change the task body — only the frontmatter \`outputs:\` list.`,
    "3. **If the file should exist under a different name** — rename the on-disk file to match the declared output.",
    "",
    "After fixing, the verifier will re-check. Every declared output must exist on disk.",
  );

  await writeFile(join(attemptDir, "FEEDBACK.md"), lines.join("\n"));
  console.log(
    `   📋 FEEDBACK.md written (${missing.length} missing output(s))`,
  );
}
