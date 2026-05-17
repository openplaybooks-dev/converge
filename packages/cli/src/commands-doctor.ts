/**
 * `converge doctor` — one-shot health check for an autonomous run.
 *
 * Scans the workspace for known failure-mode fingerprints and reports
 * findings. Designed to be the first command an operator runs to know
 * whether last night's autonomous run actually shipped real work.
 *
 * Findings (any one returns non-zero exit):
 *   1. Definition gaps   — TASK.md.rejected + EVIDENCE.json under inventory
 *                          or journal. The spawn-time gate caught corrupted
 *                          frontmatter that never reached the journal.
 *   2. Phantom work-items — ids in any sprint's work-items.json that have
 *                          no journal entry. Verify task lied or wait-many
 *                          missed it.
 *   3. Contradictory     — sprints where result.json claims passed=true but
 *                          reflection.md admits failure (negation phrases).
 *   4. Stale sentinels   — `<goal>.done` exists but the goal's checks fail
 *                          if re-run now. The goal drifted or was force-set.
 *
 * Flags:
 *   --playbook X         override CONVERGE_PLAYBOOK
 *   --json               machine-readable output (default human)
 *   --fix                attempt safe auto-fixes:
 *                          - remove stale sentinels (revalidatable)
 *                          - touch rejected files to force repair retry
 */

import { existsSync, readFileSync, unlinkSync, utimesSync } from "node:fs";
import { join } from "node:path";
import {
  findDefinitionGaps,
  findPhantomWorkItems,
  reconcileAllSprints,
} from "@converge/core/task/gap";
import {
  listTrippedCircuits,
  resetCircuit,
} from "@converge/core/navigator";
import {
  parsePlaybookGoals,
  readDoneGoalIds,
  removeGoalDoneSentinel,
  runGoalChecks,
} from "@converge/core/task/goal";
import { listPlaybookSkills } from "./commands-skills.ts";

export interface DoctorCommandOptions {
  positional: string[];
  options: Record<string, unknown>;
}

function asString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  return String(v);
}
function asBool(v: unknown): boolean {
  return v === true || v === "true" || v === "1";
}
function fail(msg: string, code = 2): never {
  console.error(`converge doctor: ${msg}`);
  process.exit(code);
}

interface DoctorReport {
  definitionGaps: Array<{
    taskMdPath: string;
    parseError: string;
    rejectedPath: string;
  }>;
  phantomWorkItems: Array<{ sprintDir: string; phantomIds: string[] }>;
  contradictoryFindings: Array<{
    sprintDir: string;
    goalId?: string;
    matchedLines: string[];
  }>;
  staleSentinels: Array<{ goalId: string; failedChecks: string[] }>;
  trippedCircuits: Array<{
    taskId: string;
    gapKind: string;
    attempts: number;
    lastError?: string;
  }>;
  /**
   * Iter-23: malformed SKILL.md files under the playbook's skills dir.
   * Each entry was silently skipped by the catalog loader pre-iter-22
   * and is now surfaced via listPlaybookSkills().errors so doctor can
   * report them alongside definition-gaps and tripped circuits.
   */
  malformedSkills: Array<{ dir: string; path: string; reason: string }>;
}

export async function doctorCommand({
  positional: _positional,
  options,
}: DoctorCommandOptions): Promise<void> {
  const workspace = process.env.CONVERGE_WORKSPACE ?? process.cwd();
  const playbook =
    asString(options.playbook) ?? process.env.CONVERGE_PLAYBOOK;
  if (!playbook) {
    fail("--playbook is required (or set CONVERGE_PLAYBOOK env)");
  }
  const jsonOut = asBool(options.json);
  const fix = asBool(options.fix);

  const playbookYml = join(
    workspace,
    ".converge",
    "playbooks",
    playbook!,
    "playbook.yml",
  );

  const report: DoctorReport = {
    definitionGaps: [],
    phantomWorkItems: [],
    contradictoryFindings: [],
    staleSentinels: [],
    trippedCircuits: [],
    malformedSkills: [],
  };

  // 1. Definition gaps
  const defGaps = await findDefinitionGaps(workspace, playbook!);
  for (const d of defGaps) {
    report.definitionGaps.push({
      taskMdPath: d.evidence.taskMdPath,
      parseError: d.evidence.parseError,
      rejectedPath: d.evidence.rejectedPath,
    });
  }

  // 2. Phantom work items
  const phantoms = findPhantomWorkItems(workspace, playbook!);
  for (const p of phantoms) {
    report.phantomWorkItems.push({
      sprintDir: p.sprintDir,
      phantomIds: p.phantomIds,
    });
  }

  // 3. Contradictory findings (reflection vs result)
  const reconciliations = reconcileAllSprints(workspace, playbook!);
  for (const r of reconciliations) {
    if (r.contradictory) {
      report.contradictoryFindings.push({
        sprintDir: r.sprintDir,
        goalId: r.goalId,
        matchedLines: r.evidence.map((e) => e.matchedLine),
      });
    }
  }

  // 4. Stale sentinels — `<goal>.done` exists but checks would fail now.
  let goals: ReturnType<typeof parsePlaybookGoals> = [];
  if (existsSync(playbookYml)) {
    try {
      goals = parsePlaybookGoals(playbookYml);
    } catch {
      // Playbook parse error is itself a finding worth surfacing, but the
      // doctor isn't the right place for it — `converge inspect` covers
      // playbook validation.
    }
  }
  const done = readDoneGoalIds(workspace, playbook!);
  for (const goal of goals) {
    if (!done.has(goal.id)) continue;
    try {
      const r = runGoalChecks(goal, workspace);
      if (!r.passed) {
        const failedChecks = r.results
          .filter((c) => !c.passed)
          .map((c) => `${c.id} (exit ${c.exitCode})`);
        report.staleSentinels.push({ goalId: goal.id, failedChecks });
      }
    } catch (err: any) {
      report.staleSentinels.push({
        goalId: goal.id,
        failedChecks: [`(re-validation crashed: ${err?.message ?? err})`],
      });
    }
  }

  // 5. Tripped repair circuits — the AI gave up after N failed
  // repair attempts on the same gap (circuit breaker).
  const tripped = listTrippedCircuits(workspace, playbook!);
  for (const t of tripped) {
    report.trippedCircuits.push({
      taskId: t.taskId,
      gapKind: t.gapKind,
      attempts: t.attempts,
      lastError: t.lastError,
    });
  }

  // 6. Malformed SKILL.md files (iter-23) — surface any skill directory
  // whose frontmatter doesn't parse. Pre-iter-22 these were silently
  // dropped from the catalog; doctor now reports them alongside the
  // other operator-actionable findings.
  try {
    const { errors: skillErrors } = listPlaybookSkills(workspace, playbook!);
    for (const e of skillErrors) {
      report.malformedSkills.push({
        dir: e.dir,
        path: e.path,
        reason: e.reason,
      });
    }
  } catch {
    // Skill scanning must never block doctor's other checks.
  }

  // Auto-fix (opt-in)
  if (fix) {
    for (const stale of report.staleSentinels) {
      removeGoalDoneSentinel(workspace, playbook!, stale.goalId);
    }
    // Reset tripped circuits so the next run can attempt repair again.
    // The operator is expected to have fixed the underlying problem
    // (the AI's repeated failed repair is a signal to inspect manually);
    // --fix re-arms the framework for another round.
    for (const t of tripped) {
      resetCircuit(workspace, playbook!, t.taskId, t.gapKind);
    }
    // touch rejected files so the next navigator tick retries repair.
    // The definition-gap surface layer (run/index.ts:surfaceDefinitionGaps)
    // dedups by `<rejectedPath>@<mtimeMs>`; touching advances the mtime so
    // the same file re-emits a gap event next loop, giving the AI another
    // shot. We don't auto-delete .rejected or EVIDENCE.json — they're
    // forensic.
    const now = new Date();
    for (const d of report.definitionGaps) {
      try {
        if (existsSync(d.rejectedPath)) utimesSync(d.rejectedPath, now, now);
      } catch {
        // Touch must not abort the fix pass — operator can re-run.
      }
    }
  }

  const totalFindings =
    report.definitionGaps.length +
    report.phantomWorkItems.length +
    report.contradictoryFindings.length +
    report.staleSentinels.length +
    report.trippedCircuits.length +
    report.malformedSkills.length;

  if (jsonOut) {
    console.log(
      JSON.stringify({ totalFindings, ...report, fixed: fix }, null, 2),
    );
  } else {
    printHumanReport(report, totalFindings, fix);
  }

  process.exit(totalFindings > 0 ? 1 : 0);
}

function printHumanReport(
  report: DoctorReport,
  total: number,
  fixed: boolean,
): void {
  if (total === 0) {
    console.log("converge doctor: ✓ no findings — workspace is healthy.");
    return;
  }

  console.log(`converge doctor: ${total} finding(s)\n`);

  if (report.definitionGaps.length > 0) {
    console.log(`● ${report.definitionGaps.length} definition gap(s) — TASK.md frontmatter rejected:`);
    for (const d of report.definitionGaps) {
      console.log(`    ${d.taskMdPath}`);
      console.log(`      error: ${d.parseError.split("\n")[0]}`);
      console.log(`      rejected: ${d.rejectedPath}`);
    }
    if (fixed) console.log(`    (touched by --fix to trigger repair retry)`);
    console.log();
  }

  if (report.phantomWorkItems.length > 0) {
    console.log(`● ${report.phantomWorkItems.length} sprint(s) with phantom work items:`);
    for (const p of report.phantomWorkItems) {
      console.log(`    ${p.sprintDir}`);
      for (const id of p.phantomIds) console.log(`      - ${id}`);
    }
    console.log();
  }

  if (report.contradictoryFindings.length > 0) {
    console.log(`● ${report.contradictoryFindings.length} sprint(s) with contradictory findings (result claims pass; reflection admits failure):`);
    for (const c of report.contradictoryFindings) {
      console.log(`    ${c.sprintDir}${c.goalId ? ` (goal: ${c.goalId})` : ""}`);
      for (const line of c.matchedLines.slice(0, 3)) {
        console.log(`      reflection: ${line}`);
      }
      if (c.matchedLines.length > 3) {
        console.log(`      … and ${c.matchedLines.length - 3} more line(s)`);
      }
    }
    console.log();
  }

  if (report.staleSentinels.length > 0) {
    console.log(`● ${report.staleSentinels.length} stale goal sentinel(s) — <goal>.done exists but checks fail now:`);
    for (const s of report.staleSentinels) {
      console.log(`    ${s.goalId}`);
      for (const c of s.failedChecks) console.log(`      ✗ ${c}`);
    }
    if (fixed) console.log(`    (removed by --fix)`);
    console.log();
  }

  if (report.trippedCircuits.length > 0) {
    console.log(
      `● ${report.trippedCircuits.length} tripped repair circuit(s) — the framework gave up after repeated failures on the same gap:`,
    );
    for (const c of report.trippedCircuits) {
      console.log(`    task ${c.taskId} (gap kind: ${c.gapKind})`);
      console.log(`      attempts: ${c.attempts}`);
      if (c.lastError) {
        console.log(`      last error: ${c.lastError.split("\n")[0]}`);
      }
    }
    if (fixed) console.log(`    (re-armed by --fix)`);
    console.log();
  }

  if (report.malformedSkills.length > 0) {
    console.log(
      `● ${report.malformedSkills.length} malformed SKILL.md file(s) — skill directories silently skipped by the catalog loader:`,
    );
    for (const m of report.malformedSkills) {
      console.log(`    ${m.dir}`);
      // Collapse multi-line reasons (YAML parse errors carry newlines)
      // so the operator sees one tight line per finding.
      const reason = m.reason.replace(/\s+/g, " ").trim();
      console.log(`      reason: ${reason.slice(0, 140)}`);
      console.log(`      path: ${m.path}`);
    }
    console.log(`    (--fix does NOT touch SKILL.md — edit the file yourself)`);
    console.log();
  }

  // Footer — be specific about what --fix does and which findings need
  // a human. Operators were running --fix on workspaces with only
  // malformed skills and seeing nothing change with no explanation.
  if (!fixed) {
    const fixableCategories: string[] = [];
    const manualCategories: string[] = [];
    if (report.staleSentinels.length > 0) {
      fixableCategories.push("remove stale goal sentinels");
    }
    if (report.trippedCircuits.length > 0) {
      fixableCategories.push("re-arm tripped repair circuits");
    }
    if (report.definitionGaps.length > 0) {
      fixableCategories.push(
        "touch rejected TASK.md files to re-emit repair gaps",
      );
    }
    if (report.malformedSkills.length > 0) {
      manualCategories.push("malformed SKILL.md (edit the frontmatter)");
    }
    if (report.phantomWorkItems.length > 0) {
      manualCategories.push(
        "phantom work-items (check seeds / re-render the sprint)",
      );
    }
    if (report.contradictoryFindings.length > 0) {
      manualCategories.push(
        "contradictory findings (update reflection or fix the goal)",
      );
    }

    if (fixableCategories.length > 0) {
      console.log(`Run with --fix to: ${fixableCategories.join(", ")}.`);
    }
    if (manualCategories.length > 0) {
      console.log(`Requires manual action: ${manualCategories.join("; ")}.`);
    }
    if (fixableCategories.length === 0 && manualCategories.length === 0) {
      // Shouldn't reach here (totalFindings > 0 ⇒ at least one category
      // is populated), but if it does, fall back to the prior message
      // so the operator still has a hint.
      console.log("Run with --fix to attempt auto-remediation.");
    }
  } else {
    // --fix was passed. Tell the operator what it actually did (vs. what
    // was left). The per-section "(removed by --fix)" / "(re-armed by --fix)"
    // tags already say what changed, but a summary at the bottom helps
    // operators who scan footer-first.
    const noFixableCategories =
      report.malformedSkills.length === 0 &&
      report.phantomWorkItems.length === 0 &&
      report.contradictoryFindings.length === 0 &&
      report.staleSentinels.length === 0 &&
      report.trippedCircuits.length === 0 &&
      report.definitionGaps.length === 0;
    if (!noFixableCategories) {
      const remaining: string[] = [];
      if (report.malformedSkills.length > 0) remaining.push("malformed SKILL.md");
      if (report.phantomWorkItems.length > 0) remaining.push("phantom work-items");
      if (report.contradictoryFindings.length > 0)
        remaining.push("contradictory findings");
      if (remaining.length > 0) {
        console.log(
          `--fix complete. Manual review still required for: ${remaining.join(", ")}.`,
        );
      }
    }
  }
}
