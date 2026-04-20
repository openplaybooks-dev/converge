/**
 * Evaluate Command
 *
 * Discovers GOAL.md files, runs metric commands, renders a terminal dashboard,
 * and optionally generates remediation TASK.md files via AI.
 */

import { resolve, join, dirname, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { ArtifactStore } from "../artifacts/index.ts";
import { glob } from "glob";
import { parseGoalMd } from "../config/parse-goal.ts";
import type { GoalDefinition } from "../config/parse-goal.ts";
import { resolveConvergeConfig } from "../config/loader.ts";
import { evaluateGoals, planFromGoals } from "../converge/goal-planner.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EvaluateOptions {
  dir?: string;
  verbose?: boolean;
  plan?: boolean;
  dry?: boolean;
  goal?: string;
}

interface GoalResult {
  goal: GoalDefinition;
  value: number;
  satisfied: boolean;
  blocked?: boolean;
  blockedBy?: string[];
  detailOutput?: string;
  reportData?: unknown;
  error?: string;
  dodResult?: import("../converge/dod-runner.ts").DodResult;
}

/* ------------------------------------------------------------------ */
/*  ANSI Colors                                                        */
/* ------------------------------------------------------------------ */

const C = {
  RESET: "\x1b[0m",
  GREEN: "\x1b[32m",
  RED: "\x1b[31m",
  YELLOW: "\x1b[33m",
  GRAY: "\x1b[90m",
  BOLD: "\x1b[1m",
  DIM: "\x1b[2m",
};

/* ------------------------------------------------------------------ */
/*  Main Command                                                       */
/* ------------------------------------------------------------------ */

export async function evaluateCommand(options: EvaluateOptions): Promise<void> {
  const searchDir = resolve(options.dir || process.cwd());

  // Find project directory via converge config
  const resolved = await resolveConvergeConfig(searchDir);
  const projectDir = resolved?.config.dir || searchDir;

  // Phase 1: Discover GOAL.md files
  const goalPatterns = [
    "**/.converge/goals/*/GOAL.md",
    "**/.converge/playbooks/*/goals/*/GOAL.md",
  ];
  const goalFiles: string[] = [];
  for (const pattern of goalPatterns) {
    const matches = await glob(pattern, {
      cwd: projectDir,
      absolute: true,
    });
    goalFiles.push(...matches);
  }

  if (goalFiles.length === 0) {
    console.log(
      "\nNo goals found. Create GOAL.md files in .converge/goals/ or .converge/playbooks/*/goals/ to define project goals.\n",
    );
    return;
  }

  // Sort by folder prefix for consistent ordering
  goalFiles.sort((a, b) => {
    const nameA = basename(dirname(a));
    const nameB = basename(dirname(b));
    return nameA.localeCompare(nameB);
  });

  // Phase 2: Parse goals
  const allGoals: GoalDefinition[] = [];
  for (const file of goalFiles) {
    const goal = await parseGoalMd(file);
    if (goal) {
      allGoals.push(goal);
    } else {
      console.warn(`  Warning: Failed to parse ${file}`);
    }
  }

  if (allGoals.length === 0) {
    console.log("\nNo valid goals found. Check GOAL.md format.\n");
    return;
  }

  // Filter to a single goal if requested
  if (options.goal) {
    const match = allGoals.find((g) => g.id === options.goal);
    if (!match) {
      const ids = allGoals.map((g) => g.id).join(", ");
      console.log(`\nGoal "${options.goal}" not found. Available: ${ids}\n`);
      return;
    }
    allGoals.length = 0;
    allGoals.push(match);
  }

  const goals = allGoals;

  // Phase 3: Run metrics (skip blocked goals)
  const results: GoalResult[] = [];
  const satisfiedIds = new Set<string>();

  for (const goal of goals) {
    // Check dependencies — skip evaluation if deps not satisfied
    const deps = goal.depends ?? [];
    const unmetDeps = deps.filter((d) => !satisfiedIds.has(d));
    if (unmetDeps.length > 0) {
      results.push({
        goal,
        value: -1,
        satisfied: false,
        blocked: true,
        blockedBy: unmetDeps,
      });
      continue;
    }

    const result = await runMetric(goal, projectDir);
    results.push(result);
    if (result.satisfied) satisfiedIds.add(goal.id);
  }

  // Phase 4: Render dashboard
  renderDashboard(results, options.verbose ?? false);

  // Phase 5: Collect detail for unsatisfied goals
  const unsatisfied = results.filter((r) => !r.satisfied && !r.error);

  if (unsatisfied.length === 0) {
    console.log(`\n${C.GREEN}${C.BOLD}All goals satisfied.${C.RESET}\n`);
    return;
  }

  // Run detail commands for unsatisfied goals
  const showDetail = options.verbose || !!options.goal;

  if (showDetail) {
    console.log(`\n${C.BOLD}Detail output for unsatisfied goals:${C.RESET}\n`);
  }

  const isPlanning = !!options.plan || !!options.dry;
  const isDry = !!options.dry;
  const store = isPlanning ? new ArtifactStore(projectDir) : undefined;

  for (const result of unsatisfied) {
    // DoD goals already have detailOutput and reportData from runMetricDod
    if (result.dodResult) {
      if (showDetail && result.detailOutput) {
        console.log(`  ${C.BOLD}${result.goal.title}:${C.RESET}`);
        for (const line of result.detailOutput.split("\n")) {
          console.log(`    ${C.GRAY}${line}${C.RESET}`);
        }
        console.log();
      }
      continue;
    }

    const detail = result.goal.detail;
    if (!detail) continue;

    const goalId = result.goal.id;

    const logLines: string[] = [];

    if (detail.script) {
      // Script mode — script does everything, optionally saves artifacts
      const resolvedScript = join(dirname(result.goal.filePath), detail.script);
      if (existsSync(resolvedScript)) {
        try {
          const mod = await import(pathToFileURL(resolvedScript).href);
          const scriptResult = await mod.run({
            projectDir,
            goalId,
            isPlanning: isPlanning && !isDry,
            exec: (cmd: string) =>
              execSync(cmd, {
                cwd: projectDir,
                encoding: "utf8",
                timeout: 30_000,
                stdio: ["pipe", "pipe", "pipe"],
                shell: process.platform === "win32" ? "bash" : "/bin/sh",
              }).trim(),
            artifact: store,
            log: {
              info: (msg: string) => logLines.push(msg),
              warn: (msg: string) => logLines.push(`WARN: ${msg}`),
              error: (msg: string) => logLines.push(`ERROR: ${msg}`),
            },
          });
          result.detailOutput = scriptResult.detail ?? "";
          result.reportData = scriptResult.data;
        } catch {
          // detail.script failed — non-fatal
        }
      }
    } else if (detail.cmd) {
      // Cmd mode — behaves like a built-in report.js:
      // run the shell command, save the output as an artifact only when planning
      try {
        const output = execSync(detail.cmd, {
          cwd: projectDir,
          encoding: "utf8",
          timeout: 30_000,
          stdio: ["pipe", "pipe", "pipe"],
          shell: process.platform === "win32" ? "bash" : "/bin/sh",
        }).trim();
        result.detailOutput = output;
        if (store && !isDry) store.set(`goals/${goalId}/report`, output);
      } catch {
        // Detail command failed — non-fatal
      }
    }

    if (showDetail) {
      if (logLines.length > 0) {
        console.log(`  ${C.BOLD}${result.goal.title}:${C.RESET}`);
        for (const line of logLines) {
          console.log(`    ${C.GRAY}${line}${C.RESET}`);
        }
        console.log();
      } else if (result.detailOutput) {
        console.log(`  ${C.BOLD}${result.goal.title}:${C.RESET}`);
        for (const line of result.detailOutput.split("\n")) {
          console.log(`    ${C.GRAY}${line}${C.RESET}`);
        }
        console.log();
      }
    }
  }

  // Phase 6: AI Remediation planning (only when --plan or --dry is passed)
  if (!isPlanning) {
    return;
  }

  // Use the new red/yellow phase pipeline
  console.log(`\n${C.BOLD}Generating remediation plan...${C.RESET}\n`);

  const evalResult = await evaluateGoals(projectDir);

  if (evalResult.needsPlanning.length === 0) {
    console.log(
      `  ${C.YELLOW}No goals need planning (tasks may already exist).${C.RESET}\n`,
    );
    return;
  }

  if (isDry) {
    // Dry run — show what would be planned without invoking the agent
    console.log(
      `  ${C.BOLD}Goals that would be planned:${C.RESET} ${C.YELLOW}(dry run)${C.RESET}\n`,
    );
    for (const r of evalResult.needsPlanning) {
      const implSkills = (r.goal.skills ?? []).filter(
        (s) => s !== "converge-planning",
      );
      console.log(
        `    ${C.BOLD}${r.goal.id}${C.RESET}  ${r.goal.title}  (${r.value} → ${r.goal.metric.target})`,
      );
      if (implSkills.length > 0) {
        console.log(
          `      ${C.GRAY}skills: [${implSkills.join(", ")}]${C.RESET}`,
        );
      }
    }
    console.log(
      `\nRe-run without ${C.BOLD}--dry${C.RESET} to invoke the planning agent.\n`,
    );
    return;
  }

  const planResult = await planFromGoals(projectDir, evalResult);

  if (planResult.tasksGenerated > 0) {
    console.log(
      `  ${C.GREEN}✓${C.RESET} Generated ${planResult.tasksGenerated} task(s) in epic ${C.BOLD}${planResult.epicId}${C.RESET}`,
    );
    console.log(`\nRun \`converge run\` to execute.\n`);
  } else {
    console.log(`  ${C.YELLOW}No tasks generated.${C.RESET}\n`);
  }
}

/* ------------------------------------------------------------------ */
/*  Metric Runner                                                      */
/* ------------------------------------------------------------------ */

async function runMetric(
  goal: GoalDefinition,
  projectDir: string,
): Promise<GoalResult> {
  let result: GoalResult;
  if (goal.dod?.script) {
    result = await runMetricDod(goal, projectDir);
  } else if (goal.metric.script) {
    result = await runMetricScript(goal, projectDir);
  } else {
    result = runMetricCmd(goal, projectDir);
  }
  result.blocked = result.blocked ?? false;
  return result;
}

async function runMetricDod(
  goal: GoalDefinition,
  projectDir: string,
): Promise<GoalResult> {
  const dodPath = join(dirname(goal.filePath), goal.dod!.script);
  if (!existsSync(dodPath)) {
    return {
      goal,
      value: 0,
      satisfied: false,
      error: `DoD script not found: ${goal.dod!.script}`,
    };
  }
  try {
    const { runDod } = await import("../converge/dod-runner.ts");
    const dodResult = await runDod(dodPath, projectDir);
    const target = goal.metric.target ?? 0;
    const satisfied =
      goal.metric.direction === "max"
        ? dodResult.value >= target
        : dodResult.value <= target;
    return {
      goal,
      value: dodResult.value,
      satisfied,
      detailOutput: dodResult.detail,
      reportData: dodResult.reportData,
      dodResult,
    };
  } catch (err: any) {
    return {
      goal,
      value: 0,
      satisfied: false,
      error: `DoD script failed: ${err.message}`,
    };
  }
}

async function runMetricScript(
  goal: GoalDefinition,
  projectDir: string,
): Promise<GoalResult> {
  const scriptPath = join(dirname(goal.filePath), goal.metric.script!);
  if (!existsSync(scriptPath)) {
    return {
      goal,
      value: 0,
      satisfied: false,
      error: `Metric script not found: ${goal.metric.script}`,
    };
  }

  try {
    const mod = await import(pathToFileURL(scriptPath).href);
    const result = await mod.run({
      projectDir,
      exec: (cmd: string) =>
        execSync(cmd, {
          cwd: projectDir,
          encoding: "utf8",
          timeout: 30_000,
          stdio: ["pipe", "pipe", "pipe"],
          shell: process.platform === "win32" ? "bash" : "/bin/sh",
        }).trim(),
    });

    const value =
      typeof result === "number" ? result : parseInt(String(result), 10);
    if (isNaN(value)) {
      return {
        goal,
        value: 0,
        satisfied: false,
        error: `Metric script returned non-numeric: ${result}`,
      };
    }

    const satisfied =
      goal.metric.direction === "min"
        ? value <= goal.metric.target
        : value >= goal.metric.target;

    return { goal, value, satisfied };
  } catch (err: any) {
    return {
      goal,
      value: 0,
      satisfied: false,
      error: `Metric script failed: ${err.message}`,
    };
  }
}

function runMetricCmd(goal: GoalDefinition, projectDir: string): GoalResult {
  try {
    const rawOutput = execSync(goal.metric.cmd!, {
      cwd: projectDir,
      encoding: "utf8",
      timeout: 60_000,
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32" ? "bash" : "/bin/sh",
    }).trim();

    const value = parseInt(rawOutput, 10);
    if (isNaN(value)) {
      return {
        goal,
        value: 0,
        satisfied: false,
        error: `Non-numeric output: "${rawOutput}"`,
      };
    }

    const satisfied =
      goal.metric.direction === "min"
        ? value <= goal.metric.target
        : value >= goal.metric.target;

    return { goal, value, satisfied };
  } catch (err: any) {
    // Many metric commands output to stderr on error — try parsing stdout from error
    const stdout = err.stdout?.toString?.()?.trim?.() ?? "";
    const parsed = parseInt(stdout, 10);
    if (!isNaN(parsed)) {
      const satisfied =
        goal.metric.direction === "min"
          ? parsed <= goal.metric.target
          : parsed >= goal.metric.target;
      return { goal, value: parsed, satisfied };
    }
    return {
      goal,
      value: 0,
      satisfied: false,
      error: `Command failed: ${err.message}`,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Dashboard Renderer                                                 */
/* ------------------------------------------------------------------ */

function renderDashboard(results: GoalResult[], verbose: boolean): void {
  console.log(`\n${C.BOLD}Project Completeness Assessment${C.RESET}`);
  console.log("═".repeat(60));
  console.log();

  // Find longest title for alignment
  const maxTitleLen = Math.max(...results.map((r) => r.goal.title.length));

  for (const result of results) {
    const icon = result.blocked
      ? "⏸️ "
      : result.error
        ? "⚠️ "
        : result.satisfied
          ? "✅ "
          : "❌ ";
    const title = result.goal.title.padEnd(maxTitleLen);
    const dots = ".".repeat(Math.max(1, 40 - result.goal.title.length));

    let valueStr: string;
    if (result.blocked) {
      const waiting = result.blockedBy?.join(", ") ?? "dependencies";
      valueStr = `${C.DIM}waiting on: ${waiting}${C.RESET}`;
    } else if (result.error) {
      valueStr = `${C.YELLOW}error${C.RESET}`;
    } else if (result.goal.metric.total !== undefined) {
      valueStr = `${result.value} / ${result.goal.metric.total}`;
    } else {
      valueStr = `${result.value}`;
    }

    const targetStr = result.blocked
      ? "not active"
      : result.goal.metric.direction === "min"
        ? `target: ${result.goal.metric.target}`
        : result.goal.metric.target > 1
          ? `target: ${result.goal.metric.target}`
          : `target: ≥${result.goal.metric.target}`;

    const color = result.blocked
      ? C.DIM
      : result.error
        ? C.YELLOW
        : result.satisfied
          ? C.GREEN
          : C.RED;

    const idLabel = `${C.DIM}[${result.goal.id}]${C.RESET}`;
    console.log(
      `  ${icon} ${idLabel} ${color}${title}${C.RESET} ${C.DIM}${dots}${C.RESET} ${valueStr}  ${C.GRAY}(${targetStr})${C.RESET}`,
    );

    if (verbose && result.error) {
      console.log(`       ${C.YELLOW}${result.error}${C.RESET}`);
    }
  }

  const satisfiedCount = results.filter((r) => r.satisfied).length;
  const blockedCount = results.filter((r) => r.blocked).length;
  const activeCount = results.length - blockedCount;
  console.log();
  console.log("─".repeat(60));
  console.log(
    `  Metrics at target: ${satisfiedCount} / ${activeCount} active    ${blockedCount > 0 ? `(${blockedCount} not active)` : ""}`,
  );
  console.log("─".repeat(60));
}
