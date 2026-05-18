/**
 * CLI Commands for Playbook Management
 *
 * Subcommands:
 *   converge playbook list                  — List available playbooks
 *   converge playbook info <name>           — Show playbook details
 *   converge playbook history <name>        — Show execution history
 *
 * Running playbooks is done via `converge run --playbook=<name>`.
 */

import { resolve } from "node:path";
import {
  discoverPlaybooks,
  loadPlaybook,
  validatePlaybook,
} from "@openplaybooks/converge-core/task/playbook";
import { listExecutions, readTrends } from "@openplaybooks/converge-core/task/playbook";

/* ────────────────────────────────────────────────────────────────── */
/*  Command Options                                                    */
/* ────────────────────────────────────────────────────────────────── */

export interface PlaybookListOptions {
  dir?: string;
  verbose?: boolean;
}

export interface PlaybookInfoOptions {
  dir?: string;
}

export interface PlaybookHistoryOptions {
  dir?: string;
  last?: number;
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: playbook list                                             */
/* ────────────────────────────────────────────────────────────────── */

export async function playbookListCommand(
  options: PlaybookListOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const playbooks = await discoverPlaybooks(projectDir);

  console.log("\n   Available Playbooks:\n");

  if (playbooks.length === 0) {
    console.log("   No playbooks found.");
    console.log("   Add playbook directories to .converge/playbooks/\n");
    return;
  }

  for (const pb of playbooks) {
    const source = pb.builtin ? "(built-in)" : "(project)";
    const mode = "";
    console.log(`   ${pb.def.name}  ${source} ${mode}`);
    if (pb.def.description) {
      console.log(`      ${pb.def.description}`);
    }
    if (options.verbose) {
      const localTasks = pb.def.tasks.filter((t) => t.id);
      const playbookRefs = pb.def.tasks.filter((t) => t.playbook);
      if (localTasks.length > 0) {
        console.log(`      Tasks: ${localTasks.map((t) => t.id).join(" -> ")}`);
      }
      if (playbookRefs.length > 0) {
        console.log(
          `      Refs: ${playbookRefs.map((t) => t.playbook).join(", ")}`,
        );
      }
      if (pb.def.inputs) {
        const inputKeys = Object.keys(pb.def.inputs);
        if (inputKeys.length > 0) {
          console.log(`      Inputs: ${inputKeys.join(", ")}`);
        }
      }
    }
    console.log();
  }

  console.log(`   Total: ${playbooks.length} playbook(s)\n`);
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: playbook info                                             */
/* ────────────────────────────────────────────────────────────────── */

export async function playbookInfoCommand(
  name: string,
  options: PlaybookInfoOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const pb = await loadPlaybook(name, projectDir);

  if (!pb) {
    console.error(`\n   Playbook "${name}" not found.`);
    console.error(
      '   Run "converge playbook list" to see available playbooks.\n',
    );
    process.exit(1);
  }

  const source = pb.builtin ? "built-in" : "project";

  console.log(`\n   Playbook: ${pb.def.name}`);
  console.log(`   Source: ${source} (${pb.templateDir})`);
  if (pb.def.description) {
    console.log(`   ${pb.def.description}`);
  }

  // Inputs
  if (pb.def.inputs && Object.keys(pb.def.inputs).length > 0) {
    console.log("\n   Inputs:");
    for (const [key, input] of Object.entries(pb.def.inputs)) {
      const req = input.required ? " (required)" : "";
      const def = input.default ? ` [default: ${input.default}]` : "";
      const desc = input.description ? ` -- ${input.description}` : "";
      console.log(`      --${key}${req}${def}${desc}`);
    }
  }

  // Tasks DAG
  console.log("\n   Tasks:");
  for (const task of pb.def.tasks) {
    const deps = task.depends_on?.length
      ? ` (after: ${task.depends_on.join(", ")})`
      : "";
    if (task.id) {
      console.log(`      ${task.id}${deps}`);
    } else if (task.playbook) {
      const withStr = task.with
        ? ` (${Object.entries(task.with)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")})`
        : "";
      console.log(`      [playbook: ${task.playbook}]${withStr}${deps}`);
    }
  }

  // Run config
  if (pb.def.run) {
    console.log("\n   Run Config:");
    const r = pb.def.run;
    if (r.mode) console.log(`      mode: ${r.mode}`);
    if (r.maxTaskAttempts)
      console.log(`      maxTaskAttempts: ${r.maxTaskAttempts}`);
    if (r.workers !== undefined) console.log(`      workers: ${r.workers}`);
    if (r.maxDuration !== undefined) {
      const dur =
        r.maxDuration === Infinity ? "infinite" : `${r.maxDuration}ms`;
      console.log(`      maxDuration: ${dur}`);
    }
    if (r.resume !== undefined) console.log(`      resume: ${r.resume}`);
  }

  // Checks
  if (pb.def.checks && pb.def.checks.length > 0) {
    console.log("\n   Checks:");
    for (const check of pb.def.checks) {
      const summary =
        check.type === "test"
          ? `→ test:${check.name}` +
            (check.args && Object.keys(check.args).length > 0
              ? `(${Object.entries(check.args).map(([k, v]) => `${k}=${v}`).join(",")})`
              : "")
          : check.type === "ai"
            ? `[ai] ${check.check}`
            : (check.cmd ?? "");
      const desc = check.description ? ` — ${check.description}` : "";
      console.log(`      ${check.id}: ${summary}${desc}`);
    }
  }

  // Validation
  const errors = validatePlaybook(pb.def, pb.templateDir);
  if (errors.length > 0) {
    console.log("\n   Errors:");
    for (const err of errors) {
      console.log(`      - ${err}`);
    }
  }

  console.log();
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: playbook history                                          */
/* ────────────────────────────────────────────────────────────────── */

export async function playbookHistoryCommand(
  name: string,
  options: PlaybookHistoryOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  let executions = await listExecutions(projectDir, name);

  if (executions.length === 0) {
    console.log(`\n   No executions found for playbook "${name}".\n`);
    return;
  }

  if (options.last) {
    executions = executions.slice(0, options.last);
  }

  console.log(`\n   Execution History: ${name}\n`);
  console.log(
    `   ${"Execution".padEnd(30)}  ${"Status".padEnd(10)}  ${"Duration".padStart(8)}  ${"Done".padStart(6)}  ${"Fail".padStart(6)}`,
  );
  console.log("   " + "-".repeat(72));

  for (const exec of executions) {
    const dur = exec.durationMs
      ? exec.durationMs >= 60000
        ? `${Math.round(exec.durationMs / 60000)}m`
        : `${Math.round(exec.durationMs / 1000)}s`
      : "...";
    const status = exec.status;
    const done = `${exec.tasksCompleted}/${exec.tasksTotal}`;
    const fail = exec.tasksFailed > 0 ? String(exec.tasksFailed) : "-";

    console.log(
      `   ${exec.executionId.padEnd(30)}  ${status.padEnd(10)}  ${dur.padStart(8)}  ${done.padStart(6)}  ${fail.padStart(6)}`,
    );
  }

  console.log(`\n   Total: ${executions.length} execution(s)\n`);

  // Show trends if available
  const trends = await readTrends(projectDir, name);
  if (trends.length >= 2) {
    const first = trends[0];
    const last = trends[trends.length - 1];
    const completionDelta = last.tasksComplete - first.tasksComplete;
    const failDelta = last.tasksFailed - first.tasksFailed;
    console.log("   Trend:");
    console.log(
      `      Tasks completed: ${first.tasksComplete} → ${last.tasksComplete} (${completionDelta >= 0 ? "+" : ""}${completionDelta})`,
    );
    console.log(
      `      Tasks failed: ${first.tasksFailed} → ${last.tasksFailed} (${failDelta >= 0 ? "+" : ""}${failDelta})`,
    );
    console.log();
  }
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: playbook validate                                          */
/* ────────────────────────────────────────────────────────────────── */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { parsePlaybookGoals } from "@openplaybooks/converge-core/task/goal";
import { listPlaybookSkills } from "./commands-skills.ts";

export interface PlaybookValidateOptions {
  dir?: string;
  json?: boolean;
}

/**
 * Categories of validation findings emitted by `converge playbook validate`.
 *
 * Each category is a structural defect that would prevent the playbook
 * from running correctly. Unlike `converge doctor` (runtime state) and
 * `converge inspect` (execution traces), this command answers
 * "is this playbook *definition* valid?" before any tasks run.
 *
 * `warnings` are non-fatal but actionable — deprecated fields, soft
 * lints, etc. They don't count toward totalFindings or affect the exit
 * code; they're just visible.
 */
export interface PlaybookValidationReport {
  /** Playbook name + template directory; null when the name doesn't resolve. */
  playbook: string;
  templateDir: string | null;
  /** Whether playbook.yml itself loaded. */
  loaded: boolean;
  /** Structural folder/file-type errors from validatePlaybook(). */
  structural: string[];
  /** Goals whose definition is malformed. */
  goalErrors: Array<{ goalId?: string; reason: string }>;
  /** Skills whose SKILL.md is malformed (reuses iter-22 listPlaybookSkills.errors). */
  skillErrors: Array<{ dir: string; path: string; reason: string }>;
  /** Tasks declared in playbook.yml whose tasks/<id>/TASK.md is missing. */
  missingTaskFiles: Array<{ taskId: string; expectedPath: string }>;
  /**
   * Non-fatal warnings — deprecated fields, soft lints. Reported but
   * don't count as findings or trigger non-zero exit.
   */
  warnings: Array<{ field: string; reason: string }>;
}

/**
 * Build the structural validation report. Pure function — does no I/O
 * beyond what the underlying loaders / list functions perform.
 */
export async function buildPlaybookValidationReport(
  name: string,
  projectDir: string,
): Promise<PlaybookValidationReport> {
  const report: PlaybookValidationReport = {
    playbook: name,
    templateDir: null,
    loaded: false,
    structural: [],
    goalErrors: [],
    skillErrors: [],
    missingTaskFiles: [],
    warnings: [],
  };

  const pb = await loadPlaybook(name, projectDir);
  if (!pb) {
    report.structural.push(`Playbook '${name}' not found`);
    return report;
  }

  report.templateDir = pb.templateDir;
  report.loaded = true;

  // 1. Structural folder/file-type checks (existing validatePlaybook).
  report.structural = validatePlaybook(pb.def, pb.templateDir);

  // 1.5 Deprecated fields → non-fatal warnings. The runtime parser
  // already emits a console.warn for these; surfacing them here makes
  // validate the canonical place to find them.
  if (pb.def.run?.mode) {
    report.warnings.push({
      field: "run.mode",
      reason: `run.mode='${pb.def.run.mode}' is deprecated and ignored; tasks/seeds decide when to continue.`,
    });
  }

  // 2. Goals — re-parse the YAML and audit each goal's check shape.
  // parsePlaybookGoals does its own coercion; check what it drops.
  const playbookYml = join(pb.templateDir, "playbook.yml");
  if (existsSync(playbookYml)) {
    try {
      const goals = parsePlaybookGoals(playbookYml);
      for (const g of goals) {
        if (!g.id) {
          report.goalErrors.push({ reason: "goal missing id" });
          continue;
        }
        if (!g.description) {
          report.goalErrors.push({
            goalId: g.id,
            reason: "goal missing description",
          });
        }
        if (!g.checks || g.checks.length === 0) {
          report.goalErrors.push({
            goalId: g.id,
            reason: "goal has no checks",
          });
        } else {
          for (const c of g.checks) {
            if (!c.id) {
              report.goalErrors.push({
                goalId: g.id,
                reason: `check missing id (cmd: ${c.cmd?.slice(0, 60) ?? ""})`,
              });
            }
            if (!c.cmd) {
              report.goalErrors.push({
                goalId: g.id,
                reason: `check '${c.id}' missing cmd`,
              });
            }
          }
        }
      }
    } catch (err) {
      report.goalErrors.push({
        reason: `playbook.yml goals: parse failed (${err instanceof Error ? err.message : String(err)})`,
      });
    }
  }

  // 3. Skills — reuse iter-22 listPlaybookSkills.errors.
  try {
    const skills = listPlaybookSkills(projectDir, name);
    for (const e of skills.errors) {
      report.skillErrors.push({ dir: e.dir, path: e.path, reason: e.reason });
    }
  } catch {
    // Skill scanning failure shouldn't block other checks.
  }

  // 4. Task path resolution — for each `tasks:` entry in playbook.yml,
  // confirm tasks/<id>/TASK.md exists (or for path: entries, the path).
  for (const task of pb.def.tasks) {
    if (task.playbook) continue; // nested playbook refs aren't validated here
    const taskId = (task as { id?: string; path?: string }).id;
    const taskPath = (task as { path?: string }).path;
    if (!taskId && !taskPath) continue;
    const candidate = taskPath ?? taskId!;
    const expectedTaskMd = join(pb.templateDir, "tasks", candidate, "TASK.md");
    if (!existsSync(expectedTaskMd)) {
      // Also try without the trailing /TASK.md (path: could already include it).
      const altPath = join(pb.templateDir, "tasks", candidate);
      if (!existsSync(altPath)) {
        report.missingTaskFiles.push({
          taskId: candidate,
          expectedPath: expectedTaskMd,
        });
      }
    }
  }

  return report;
}

/**
 * `converge playbook validate <name>` — pre-flight structural check.
 *
 * Reports any defect that would prevent the playbook from running:
 * folder layout violations, missing goal fields, malformed SKILL.md,
 * tasks: entries pointing at non-existent TASK.md files, etc. Exits
 * non-zero on any finding so the command works as a CI/precommit gate.
 *
 * For runtime-state issues (stale sentinels, tripped circuits, phantom
 * work-items, contradictory findings) use `converge doctor` instead.
 */
export async function playbookValidateCommand(
  name: string,
  options: PlaybookValidateOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const report = await buildPlaybookValidationReport(name, projectDir);

  const totalFindings =
    report.structural.length +
    report.goalErrors.length +
    report.skillErrors.length +
    report.missingTaskFiles.length;

  if (options.json) {
    console.log(JSON.stringify({ totalFindings, ...report }, null, 2));
  } else {
    if (!report.loaded) {
      console.error(`\n   Playbook '${name}' not found.\n`);
      process.exit(1);
    }
    if (totalFindings === 0) {
      console.log(
        `\n   converge playbook validate: ✓ '${name}' is structurally valid.`,
      );
      // Warnings are non-fatal — print after the success line.
      if (report.warnings.length > 0) {
        console.log(`\n   ⚠  ${report.warnings.length} warning(s):`);
        for (const w of report.warnings) {
          console.log(`       ${w.field}: ${w.reason}`);
        }
      }
      console.log();
      return;
    }
    console.log(
      `\n   converge playbook validate: '${name}' — ${totalFindings} finding(s)\n`,
    );

    if (report.structural.length > 0) {
      console.log(
        `   ● ${report.structural.length} structural error(s):`,
      );
      for (const err of report.structural) {
        console.log(`       ${err}`);
      }
      console.log();
    }

    if (report.goalErrors.length > 0) {
      console.log(`   ● ${report.goalErrors.length} goal error(s):`);
      for (const g of report.goalErrors) {
        const prefix = g.goalId ? `${g.goalId}: ` : "";
        console.log(`       ${prefix}${g.reason}`);
      }
      console.log();
    }

    if (report.skillErrors.length > 0) {
      console.log(
        `   ● ${report.skillErrors.length} malformed SKILL.md file(s):`,
      );
      for (const s of report.skillErrors) {
        const reason = s.reason.replace(/\s+/g, " ").trim().slice(0, 140);
        console.log(`       ${s.dir} — ${reason}`);
      }
      console.log();
    }

    if (report.missingTaskFiles.length > 0) {
      console.log(
        `   ● ${report.missingTaskFiles.length} missing task file(s):`,
      );
      for (const t of report.missingTaskFiles) {
        console.log(`       ${t.taskId}`);
        console.log(`         expected: ${t.expectedPath}`);
      }
      console.log();
    }

    if (report.warnings.length > 0) {
      console.log(
        `   ⚠  ${report.warnings.length} warning(s) (non-fatal):`,
      );
      for (const w of report.warnings) {
        console.log(`       ${w.field}: ${w.reason}`);
      }
      console.log();
    }
  }

  process.exit(totalFindings > 0 ? 1 : 0);
}
