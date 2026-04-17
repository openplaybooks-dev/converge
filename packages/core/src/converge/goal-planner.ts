/**
 * Goal Planner — Evaluate goals (including sub-goals) and generate tasks.
 *
 * The bridge that makes goals-only workflows possible:
 *   1. Discover all GOAL.md files (including nested sub-goals)
 *   2. Evaluate metrics (which are satisfied?)
 *   3. Check dependencies (is this goal unblocked?)
 *   4. For goals with sub-goals: evaluate each sub-goal, generate per-sub-goal tasks
 *   5. Re-generate tasks when previous ones failed (goals repeat until met)
 *
 * Key principle: a goal can repeatedly generate tasks until its metric passes.
 * If Run 1 generates a task that fails, Run 2 re-evaluates the goal,
 * sees it's still unsatisfied, and generates a new task (with failure context).
 */

import { resolve, join, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { glob } from 'glob';
import { getEpicsDir } from '../journal/structure.ts';
import { z } from 'zod';
import { agentfn } from '@converge/agentfn';
import { READONLY_TOOLS } from '../ai/context.ts';
import { parseGoalMd } from '../config/parse-goal.ts';
import type { GoalDefinition } from '../config/parse-goal.ts';
import type { TaskMdShape } from '../config/task-md-definition.ts';
import type { WbsContext, WbsSpawnTarget, WbsSpawnOptions } from '../config/task-definition.ts';
import { resolveWbsTarget } from '../executor/wbs-executor.ts';
import { ArtifactStore } from '../artifacts/index.ts';
import { stringify as stringifyYaml, parse as parseYaml } from 'yaml';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GoalEvalResult {
  goal: GoalDefinition;
  value: number;
  satisfied: boolean;
  blocked: boolean;
  blockedBy?: string[];
  error?: string;
  /** Sub-goal results (if goal has nested sub-goals) */
  subResults?: GoalEvalResult[];
  /** DoD result when goal uses dod.js */
  dodResult?: import('./dod-runner.ts').DodResult;
}

export interface PlanResult {
  evaluated: number;
  satisfied: number;
  blocked: number;
  tasksGenerated: number;
  epicId?: string;
  /** Total number of goals discovered (including nested sub-goals) */
  totalGoals?: number;
}

export interface EvalResult {
  results: GoalEvalResult[];
  totalGoals: number;
  needsPlanning: GoalEvalResult[];
  satisfied: number;
  blocked: number;
}

/* ------------------------------------------------------------------ */
/*  Red Phase: Evaluate Goals                                          */
/* ------------------------------------------------------------------ */

export async function evaluateGoals(projectDir: string): Promise<EvalResult> {
  // 1. Discover top-level goals (sub-goals are nested inside via parser)
  const goalFiles = await glob('**/.converge/goals/*/GOAL.md', {
    cwd: projectDir,
    absolute: true,
    ignore: ['**/.converge/goals/*/goals/**'],  // Skip sub-goals (parsed by parent)
  });

  if (goalFiles.length === 0) {
    return { results: [], totalGoals: 0, needsPlanning: [], satisfied: 0, blocked: 0 };
  }

  goalFiles.sort((a, b) => basename(dirname(a)).localeCompare(basename(dirname(b))));

  // 2. Parse goals (parser auto-discovers sub-goals from goals/ subdirs)
  const goals: GoalDefinition[] = [];
  for (const file of goalFiles) {
    const goal = await parseGoalMd(file);
    if (goal) goals.push(goal);
  }

  // Count total goals including nested sub-goals
  const totalGoals = goals.reduce((sum, g) => sum + countGoals(g), 0);

  // 3. Evaluate goals — skip blocked ones (dependencies not yet satisfied)
  const results: GoalEvalResult[] = [];
  const satisfiedIds = new Set<string>();

  for (const goal of goals) {
    // Check dependencies before evaluation — don't run dod.js if deps unmet
    const deps = goal.depends ?? [];
    const unmetDeps = deps.filter(d => !satisfiedIds.has(d));
    if (unmetDeps.length > 0) {
      results.push({ goal, value: -1, satisfied: false, blocked: true, blockedBy: unmetDeps });
      continue;
    }

    const result = await evaluateGoalTree(goal, projectDir);
    results.push(result);
    if (result.satisfied) satisfiedIds.add(goal.id);
  }

  // 4. Filter actionable goals (unsatisfied + unblocked + no error)
  const actionable = results.filter(r => !r.satisfied && !r.blocked && !r.error);

  // 5. Filter needsPlanning: no existing tasks, or all-failed
  const needsPlanning = actionable.filter(r => {
    const status = goalTaskStatus(r.goal, projectDir);
    if (status === 'none') return true;       // No existing tasks → plan
    if (status === 'all-failed') return true;  // All failed → re-plan
    return false;                              // Pending/running → wait
  });

  const satisfied = results.filter(r => r.satisfied).length;
  const blocked = results.filter(r => r.blocked).length;

  return { results, totalGoals, needsPlanning, satisfied, blocked };
}

/* ------------------------------------------------------------------ */
/*  Yellow Phase: Plan from Goals (agent-based)                        */
/* ------------------------------------------------------------------ */

/** Skills consumed by the planning phase (not passed to generated tasks) */
const PLANNING_SKILLS = new Set(['converge-planning']);

export async function planFromGoals(
  projectDir: string,
  evalResult: EvalResult,
): Promise<PlanResult> {
  const { results, totalGoals, needsPlanning, satisfied, blocked } = evalResult;

  if (needsPlanning.length === 0) {
    return { evaluated: results.length, satisfied, blocked, tasksGenerated: 0, totalGoals };
  }

  // Create epic directory
  const epicId = nextEpicId(projectDir);
  const epicDir = join(projectDir, '.converge', 'epics', epicId);
  mkdirSync(epicDir, { recursive: true });

  // Build planning prompt
  const prompt = buildPlanningPrompt(needsPlanning, epicDir, projectDir);

  // Resolve skills: planning skills go to the agent, implementation skills to generated tasks
  const allSkills = new Set<string>();
  for (const r of needsPlanning) {
    for (const s of r.goal.skills ?? []) allSkills.add(s);
  }
  const planningSkills = [...allSkills].filter(s => PLANNING_SKILLS.has(s));
  const implSkills = [...allSkills].filter(s => !PLANNING_SKILLS.has(s));

  // Invoke planning agent
  const logDir = join(projectDir, '.converge', 'journal', 'converge-planning', epicId);
  mkdirSync(logDir, { recursive: true });

  const skillsRoot = join(projectDir, '.converge', 'skills');
  const executor = agentfn({
    prompt,
    allowedTools: ['Read', 'Glob', 'Write', 'Bash', 'Grep'],
    timeoutMs: 300_000,
    cwd: projectDir,
    logDir,
    ...(planningSkills.length > 0 && existsSync(skillsRoot)
      ? { skillsRoot, skills: planningSkills }
      : {}),
  });

  try {
    await executor();
  } catch (err: any) {
    console.warn(`⚠️  Planning agent failed: ${err.message?.split('\n')[0]}`);
    return { evaluated: results.length, satisfied, blocked, tasksGenerated: 0, totalGoals };
  }

  // Scan for generated TASK.md files
  const generatedTasks = await glob('tasks/*/TASK.md', { cwd: epicDir, absolute: true, ignore: ['**/subtask/**'] });
  // Also check nested tasks
  const nestedTasks = await glob('tasks/*/tasks/*/TASK.md', { cwd: epicDir, absolute: true, ignore: ['**/subtask/**'] });
  const allTasks = [...generatedTasks, ...nestedTasks];

  // Post-process: strip planning skills from generated tasks
  stripPlanningSkillFromTasks(allTasks, implSkills);

  // Write TASK.md for the epic
  const epicFm: Record<string, unknown> = {
    id: epicId,
    title: 'Goal Remediation',
    description: `Auto-generated: fix ${needsPlanning.length} unsatisfied goal(s)`,
    goals: needsPlanning.map(r => r.goal.id),
  };
  writeTaskMd(
    join(epicDir, 'TASK.md'),
    epicFm,
    `# Goal Remediation\n\n${needsPlanning.map(r => `- ${r.goal.title} (${r.value} → ${r.goal.metric.target})`).join('\n')}`,
  );

  if (allTasks.length > 0) {
    console.log(`📋 Generated ${allTasks.length} task(s) from ${needsPlanning.length} unsatisfied goal(s) → epics/${epicId}/\n`);
  }

  return { evaluated: results.length, satisfied, blocked, tasksGenerated: allTasks.length, epicId, totalGoals };
}

/**
 * Build the planning prompt sent to the converge-planning agent.
 * Contains goal details, dod results, and instructions for task file output.
 */
function buildPlanningPrompt(
  needsPlanning: GoalEvalResult[],
  epicDir: string,
  projectDir: string,
): string {
  const sections: string[] = [];

  sections.push(`You are a planning agent. Your job is to analyze unsatisfied goals and generate implementation TASK.md files.`);
  sections.push(`\nPROJECT DIRECTORY: ${projectDir}`);
  sections.push(`EPIC DIRECTORY: ${epicDir}`);

  sections.push(`\n## Unsatisfied Goals\n`);

  for (let i = 0; i < needsPlanning.length; i++) {
    const r = needsPlanning[i];
    const goalPrefix = String(i + 1).padStart(3, '0');
    const goalTaskId = `${goalPrefix}-${r.goal.id}`;
    const taskDir = join(epicDir, 'tasks', goalTaskId);

    sections.push(`### Goal: ${r.goal.title} (id: ${r.goal.id})`);
    sections.push(`- Metric: current=${r.value}, target=${r.goal.metric.target}, direction=${r.goal.metric.direction}`);

    if (r.goal.requirements) {
      sections.push(`- Requirements:\n${r.goal.requirements}`);
    }
    if (r.goal.body) {
      sections.push(`- Context:\n${r.goal.body}`);
    }

    // Include dod diagnostic data
    if (r.dodResult) {
      if (r.dodResult.detail) {
        sections.push(`- DoD Report:\n${r.dodResult.detail}`);
      }
      if (r.dodResult.reportData) {
        try {
          const json = JSON.stringify(r.dodResult.reportData, null, 2);
          if (json.length < 5000) {
            sections.push(`- DoD Data:\n\`\`\`json\n${json}\n\`\`\``);
          }
        } catch { /* skip */ }
      }
    }

    // Collect implementation skills from this goal
    const implSkills = (r.goal.skills ?? []).filter(s => !PLANNING_SKILLS.has(s));

    sections.push(`- Output: Write TASK.md file(s) to \`${taskDir}/TASK.md\``);
    if (implSkills.length > 0) {
      sections.push(`- Include in generated TASK.md frontmatter: \`skills: [${implSkills.join(', ')}]\``);
    }
    sections.push('');
  }

  sections.push(`## Instructions\n`);
  sections.push(`1. Read the project files to understand current state.`);
  sections.push(`2. For each unsatisfied goal, create a TASK.md file at the specified output path.`);
  sections.push(`3. Each TASK.md must have YAML frontmatter with: id, title, goals, skills (implementation skills only).`);
  sections.push(`4. The markdown body should contain clear, actionable implementation instructions.`);
  sections.push(`5. IMPORTANT: Do NOT include 'converge-planning' in any generated task's skills field.`);
  sections.push(`6. Create the task directories with mkdir -p before writing files.`);

  return sections.join('\n');
}

/**
 * Post-process generated TASK.md files:
 * - Strip planning skills (converge-planning) from skills fields
 * - Ensure implementation skills are present
 */
function stripPlanningSkillFromTasks(taskPaths: string[], implSkills: string[]): void {
  for (const taskPath of taskPaths) {
    try {
      const content = readFileSync(taskPath, 'utf-8');
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!match) continue;

      const yaml = match[1];
      // Check if any planning skills appear in the skills field
      let needsRewrite = false;
      for (const ps of PLANNING_SKILLS) {
        if (yaml.includes(ps)) {
          needsRewrite = true;
          break;
        }
      }
      if (!needsRewrite) continue;

      // Parse, filter, rewrite
      const parsed = parseYaml(yaml) as Record<string, unknown>;
      if (parsed && Array.isArray(parsed.skills)) {
        parsed.skills = (parsed.skills as string[]).filter(s => !PLANNING_SKILLS.has(s));
        // Add implementation skills if missing
        for (const is of implSkills) {
          if (!parsed.skills.includes(is)) parsed.skills.push(is);
        }
        if (parsed.skills.length === 0) delete parsed.skills;
      }

      const body = content.slice(match[0].length);
      const newYaml = stringifyYaml(parsed, { lineWidth: 0 }).trim();
      writeFileSync(taskPath, `---\n${newYaml}\n---${body}`, 'utf-8');
    } catch { /* skip corrupt files */ }
  }
}

/* ------------------------------------------------------------------ */
/*  Legacy: Evaluate + Plan (backward compat)                          */
/* ------------------------------------------------------------------ */

export async function evaluateAndPlan(projectDir: string): Promise<PlanResult> {
  const evalResult = await evaluateGoals(projectDir);
  return planFromGoalsLegacy(projectDir, evalResult);
}

/**
 * Legacy task generation path (wbs.js / split / single).
 * Used by evaluateAndPlan() for backward compatibility.
 */
async function planFromGoalsLegacy(projectDir: string, evalResult: EvalResult): Promise<PlanResult> {
  const { results, totalGoals, needsPlanning, satisfied, blocked } = evalResult;

  if (needsPlanning.length === 0) {
    return { evaluated: results.length, satisfied, blocked, tasksGenerated: 0, totalGoals };
  }

  // Generate remediation epic
  const epicId = nextEpicId(projectDir);
  const epicDir = join(projectDir, '.converge', 'epics', epicId);
  mkdirSync(epicDir, { recursive: true });

  let tasksGenerated = 0;

  for (let i = 0; i < needsPlanning.length; i++) {
    const result = needsPlanning[i];
    const goalPrefix = String(i + 1).padStart(3, '0');
    const goalTaskId = `${goalPrefix}-${result.goal.id}`;
    tasksGenerated += await processGoalForPlanning(result, epicDir, goalTaskId, projectDir);
  }

  // Write TASK.md for the epic
  const epicFm: Record<string, unknown> = {
    id: epicId,
    title: 'Goal Remediation',
    description: `Auto-generated: fix ${needsPlanning.length} unsatisfied goal(s)`,
    goals: needsPlanning.map(r => r.goal.id),
  };
  writeTaskMd(
    join(epicDir, 'TASK.md'),
    epicFm,
    `# Goal Remediation\n\n${needsPlanning.map(r => `- ${r.goal.title} (${r.value} → ${r.goal.metric.target})`).join('\n')}`,
  );

  if (tasksGenerated > 0) {
    console.log(`📋 Generated ${tasksGenerated} task(s) from ${needsPlanning.length} unsatisfied goal(s) → epics/${epicId}/\n`);
  }

  return { evaluated: results.length, satisfied, blocked, tasksGenerated, epicId, totalGoals };
}

/* ------------------------------------------------------------------ */
/*  Goal Tree Evaluation                                               */
/* ------------------------------------------------------------------ */

/**
 * Evaluate a goal and all its sub-goals recursively.
 * Parent is satisfied only if its own metric passes AND all sub-goals pass.
 */
async function evaluateGoalTree(goal: GoalDefinition, projectDir: string): Promise<GoalEvalResult> {
  const ownResult = await evaluateGoal(goal, projectDir);

  if (!goal.goals || goal.goals.length === 0) {
    return ownResult;
  }

  // Evaluate sub-goals
  const subResults: GoalEvalResult[] = [];
  for (const sub of goal.goals) {
    subResults.push(await evaluateGoalTree(sub, projectDir));
  }

  // Parent satisfied = own metric + all sub-goals
  const allSubsSatisfied = subResults.every(sr => sr.satisfied);
  const satisfied = ownResult.satisfied && allSubsSatisfied;

  return {
    ...ownResult,
    satisfied,
    subResults,
  };
}

async function evaluateGoal(goal: GoalDefinition, projectDir: string): Promise<GoalEvalResult> {
  try {
    // DoD branch — single script replaces metric + detail
    if (goal.dod?.script) {
      const dodPath = join(dirname(goal.filePath), goal.dod.script);
      const { runDod } = await import('./dod-runner.ts');
      const dodResult = await runDod(dodPath, projectDir);
      const target = goal.metric.target ?? 0;
      const satisfied = goal.metric.direction === 'max'
        ? dodResult.value >= target
        : dodResult.value <= target;
      return { goal, value: dodResult.value, satisfied, blocked: false, dodResult };
    }

    let value: number;

    if (goal.metric.script) {
      const scriptPath = join(dirname(goal.filePath), goal.metric.script);
      const mod = await import(pathToFileURL(scriptPath).href);
      value = await mod.run({
        projectDir,
        exec: (cmd: string) => execSync(cmd, {
          cwd: projectDir, encoding: 'utf8', timeout: 30_000,
          stdio: ['pipe', 'pipe', 'pipe'],
        }).trim(),
      });
    } else if (goal.metric.cmd) {
      const output = execSync(goal.metric.cmd, {
        cwd: projectDir, encoding: 'utf8', timeout: 30_000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      value = parseInt(output, 10) || 0;
    } else {
      return { goal, value: 0, satisfied: false, blocked: false, error: 'No metric cmd or script' };
    }

    const satisfied = goal.metric.direction === 'min'
      ? value <= goal.metric.target
      : value >= goal.metric.target;

    return { goal, value, satisfied, blocked: false };
  } catch (err: any) {
    if (err.status === 1 && !err.stderr?.toString().trim()) {
      const satisfied = goal.metric.direction === 'min' ? 0 <= goal.metric.target : 0 >= goal.metric.target;
      return { goal, value: 0, satisfied, blocked: false };
    }
    return { goal, value: -1, satisfied: false, blocked: false, error: err.message?.split('\n')[0] };
  }
}

/* ------------------------------------------------------------------ */
/*  Task Generation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Recursively process a goal for task planning.
 * - Goals with unsatisfied sub-goals: recurse into each sub-goal
 * - Leaf goals: full WBS/split/single treatment
 * - Safety valve at depth 10: treat as leaf
 */
async function processGoalForPlanning(
  result: GoalEvalResult,
  epicDir: string,
  goalTaskId: string,
  projectDir: string,
  depth: number = 0,
): Promise<number> {
  // Safety valve — treat as leaf at excessive depth
  if (depth > 10) {
    return writeLeafGoalTask(epicDir, goalTaskId, result);
  }

  // If goal has unsatisfied sub-goals, process each recursively.
  // Dependencies are soft hints: prefer unblocked goals, but fall through
  // to blocked ones if no unblocked exist (avoids deadlocks).
  if (result.subResults?.length) {
    const siblingIds = new Set<string>();
    for (const sr of result.subResults) {
      if (sr.satisfied) siblingIds.add(sr.goal.id);
    }

    const unblocked: GoalEvalResult[] = [];
    const softBlocked: GoalEvalResult[] = [];
    for (const sr of result.subResults) {
      if (sr.satisfied || sr.error) continue;
      const deps = sr.goal.depends ?? [];
      if (deps.length === 0 || deps.every(d => siblingIds.has(d))) {
        unblocked.push(sr);
      } else {
        softBlocked.push(sr);
      }
    }

    const unsatisfied = unblocked.length > 0 ? unblocked : softBlocked;
    if (unsatisfied.length > 0) {
      let count = 0;
      for (let j = 0; j < unsatisfied.length; j++) {
        const sub = unsatisfied[j];
        const subId = `${goalTaskId}-${String(j + 1).padStart(3, '0')}-${sub.goal.id}`;
        count += await processGoalForPlanning(sub, epicDir, subId, projectDir, depth + 1);
      }
      return count;
    }
  }

  // Leaf goal: full WBS/split/single treatment
  const genResult = await generateTasksForGoal(result, projectDir);

  // When WBS only spawned goals (no tasks), skip parent task generation.
  // The new sub-goals will be discovered on the next evaluateAndPlan() iteration.
  if (genResult.tasks.length === 0 && genResult.goalsSpawned > 0) {
    return 0;
  }

  return writeGoalTasks(epicDir, goalTaskId, result, genResult.tasks);
}

/**
 * Write a single task for a leaf goal (fallback for deep recursion).
 */
function writeLeafGoalTask(
  epicDir: string,
  goalTaskId: string,
  result: GoalEvalResult,
): number {
  const goalTaskDir = join(epicDir, 'tasks', goalTaskId);
  mkdirSync(goalTaskDir, { recursive: true });

  const body = buildGoalTaskBody(result);
  const fm: Record<string, unknown> = {
    id: goalTaskId,
    title: result.goal.title,
    goals: [result.goal.id],
  };
  if (result.goal.skills?.length) fm.skills = result.goal.skills;

  writeTaskMd(join(goalTaskDir, 'TASK.md'), fm, body);

  return 1;
}

/**
 * Write tasks for a goal that has sub-goals.
 * Each unsatisfied sub-goal becomes its own task, using its requirements as the prompt.
 */
function writeSubGoalTasks(
  epicDir: string,
  goalTaskId: string,
  parentGoal: GoalDefinition,
  unsatisfiedSubs: GoalEvalResult[],
  projectDir: string,
): number {
  const goalTaskDir = join(epicDir, 'tasks', goalTaskId);
  mkdirSync(goalTaskDir, { recursive: true });

  // Parent task
  const parentFm: Record<string, unknown> = {
    id: goalTaskId,
    title: parentGoal.title,
    goals: [parentGoal.id],
  };
  if (parentGoal.skills?.length) parentFm.skills = parentGoal.skills;
  writeTaskMd(join(goalTaskDir, 'TASK.md'), parentFm, parentGoal.body);

  // Sub-goal tasks
  let count = 1;
  const subDir = join(goalTaskDir, 'tasks');
  for (let i = 0; i < unsatisfiedSubs.length; i++) {
    const sub = unsatisfiedSubs[i];
    const subId = String(i + 1).padStart(3, '0') + '-' + sub.goal.id;
    const taskDir = join(subDir, subId);
    mkdirSync(taskDir, { recursive: true });

    const body = buildGoalTaskBody(sub);
    const subFm: Record<string, unknown> = {
      id: subId,
      title: sub.goal.title,
      goals: [parentGoal.id, sub.goal.id],
    };
    // Inherit skills from sub-goal or parent
    if (sub.goal.skills?.length) subFm.skills = sub.goal.skills;
    else if (parentGoal.skills?.length) subFm.skills = parentGoal.skills;

    writeTaskMd(join(taskDir, 'TASK.md'), subFm, body);
    count++;
  }

  return count;
}

/**
 * Write tasks for a leaf goal (no sub-goals).
 */
function writeGoalTasks(
  epicDir: string,
  goalTaskId: string,
  result: GoalEvalResult,
  subTasks: TaskMdShape[],
): number {
  const goalTaskDir = join(epicDir, 'tasks', goalTaskId);
  mkdirSync(goalTaskDir, { recursive: true });

  const body = buildGoalTaskBody(result);
  const fm: Record<string, unknown> = {
    id: goalTaskId,
    title: `Fix: ${result.goal.title}`,
    goals: [result.goal.id],
    outputs: subTasks.length === 0 ? ['src/**/*'] : undefined,
  };
  if (result.goal.skills?.length) fm.skills = result.goal.skills;

  writeTaskMd(join(goalTaskDir, 'TASK.md'), fm, body);

  let count = 1;
  if (subTasks.length > 0) {
    const subDir = join(goalTaskDir, 'tasks');
    for (const sub of subTasks) {
      const taskDir = join(subDir, sub.id);
      mkdirSync(taskDir, { recursive: true });
      const subFm: Record<string, unknown> = {
        id: sub.id,
        title: sub.title,
        goals: [result.goal.id],
        outputs: sub.outputs,
      };
      if (sub.skills?.length) subFm.skills = sub.skills;
      else if (result.goal.skills?.length) subFm.skills = result.goal.skills;
      writeTaskMd(join(taskDir, 'TASK.md'), subFm, sub.body ?? '');
      count++;
    }
  }

  return count;
}

async function generateTasksForGoal(result: GoalEvalResult, projectDir: string): Promise<{ tasks: TaskMdShape[], goalsSpawned: number }> {
  const goal = result.goal;

  // Try wbs.js first
  const wbsPath = join(dirname(goal.filePath), 'wbs.js');
  if (existsSync(wbsPath)) {
    return await runWbs(wbsPath, result, projectDir);
  }

  // Split: parse detail output
  if ((goal.plan?.strategy ?? 'single') === 'split' && goal.detail) {
    return { tasks: await splitFromDetail(result, projectDir), goalsSpawned: 0 };
  }

  return { tasks: [], goalsSpawned: 0 };  // Parent task handles it
}

async function runWbs(wbsPath: string, result: GoalEvalResult, projectDir: string): Promise<{ tasks: TaskMdShape[], goalsSpawned: number }> {
  const tasks: TaskMdShape[] = [];
  const spawnedGoals: GoalDef[] = [];
  let reportData: unknown;

  if (result.dodResult) {
    reportData = result.dodResult.reportData;
  } else if (result.goal.detail?.script) {
    const detailScript = join(dirname(result.goal.filePath), result.goal.detail.script);
    if (existsSync(detailScript)) {
      try {
        const mod = await import(pathToFileURL(detailScript).href);
        const out = await mod.run({
          projectDir,
          exec: (cmd: string) => execSync(cmd, {
            cwd: projectDir, encoding: 'utf8', timeout: 30_000,
            stdio: ['pipe', 'pipe', 'pipe'],
          }).trim(),
        });
        reportData = out.data ?? out;
      } catch { /* best effort */ }
    }
  }

  const goalId = result.goal.id;
  const logDir = join(projectDir, '.converge', 'journal', 'wbs-logs', goalId);
  mkdirSync(logDir, { recursive: true });

  const spawnedTasks: Array<{ id: string; writeToPath?: string }> = [];

  // Build a proper WbsContext matching the task WBS interface
  const ctx: WbsContext = {
    projectDir,
    vars: {
      goalId,
      value: result.value,
      target: result.goal.metric.target,
      reportData,
      reportPath: '',
    },
    log: {
      info: (msg: string) => console.log(`[wbs:${goalId}] ${msg}`),
      warn: (msg: string) => console.warn(`[wbs:${goalId}] WARN: ${msg}`),
      error: (msg: string) => console.error(`[wbs:${goalId}] ERROR: ${msg}`),
    },
    get spawnedTasks() {
      return spawnedTasks as ReadonlyArray<{ id: string; writeToPath?: string }>;
    },
    ai: {
      ask: (question: string) => buildGoalAiAsk(question, projectDir, goalId, logDir),
    },
    plan: {
      getPlanPath: (_relativePath: string) => {
        // Goal WBS has no journal-based plan paths — return a project-relative path
        return join(projectDir, '.converge', 'journal', 'wbs-logs', goalId, 'plan.md');
      },
    },
    artifact: new ArtifactStore(projectDir),
    spawn: async (target: WbsSpawnTarget, opts?: WbsSpawnOptions) => {
      const shape = await resolveWbsTarget(target, opts, ctx);
      spawnedTasks.push({ id: shape.id, writeToPath: opts?.writeToPath });
      tasks.push(shape);
      console.log(`[wbs:${goalId}] Spawned task: ${shape.id}`);
    },
    spawnGoal: async (goalDef: GoalDef) => {
      spawnedGoals.push(goalDef);
      console.log(`[wbs:${goalId}] Spawned goal: ${goalDef.id}`);
    },
  };

  try {
    const mod = await import(pathToFileURL(wbsPath).href);
    await mod.run(ctx);
  } catch { /* fall through */ }

  // Write spawned goals as nested GOAL.md files under the parent goal
  if (spawnedGoals.length > 0) {
    const parentGoalDir = dirname(result.goal.filePath);
    writeNestedGoalDefs(parentGoalDir, spawnedGoals);
    console.log(`[wbs:${goalId}] Wrote ${spawnedGoals.length} nested goal(s)`);
  }

  return { tasks, goalsSpawned: spawnedGoals.length };
}

/**
 * Build an AskResult for goal-planner WBS context.
 * Matches the pattern from wbs-executor.ts — lazy boolean, .asJson(schema).
 */
function buildGoalAiAsk(question: string, projectDir: string, goalId: string, logDir: string) {
  const basePrompt = `You are analyzing a project to help break down work into subtasks.

PROJECT DIRECTORY: ${projectDir}
GOAL: ${goalId}

QUESTION: ${question}

Use the available tools (Read, Glob) to inspect the project files and answer the question.`;

  const AskSchema = z.object({
    answer: z.boolean(),
    reasoning: z.string(),
  });

  let booleanPromise: Promise<boolean> | null = null;
  const getBooleanPromise = (): Promise<boolean> => {
    if (!booleanPromise) {
      booleanPromise = (async (): Promise<boolean> => {
        const executor = agentfn<{ answer: boolean; reasoning: string }>({
          prompt: basePrompt + `\n\nReturn a JSON object:\n- answer: true if the condition is fully met, false otherwise\n- reasoning: brief explanation (1-2 sentences)`,
          schema: AskSchema,
          allowedTools: [...READONLY_TOOLS],
          timeoutMs: 60_000,
          cwd: projectDir,
          logDir,
        });
        try {
          const result = await executor();
          return result.data.answer;
        } catch {
          return false;
        }
      })();
    }
    return booleanPromise;
  };

  return {
    then: <TResult1 = boolean, TResult2 = never>(
      onfulfilled?: ((value: boolean) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
    ) => getBooleanPromise().then(onfulfilled, onrejected),

    asJson: <T>(schema: import('zod').ZodType<T>): Promise<T> => {
      const executor = agentfn<T>({
        prompt: basePrompt + `\n\nReturn a JSON object matching the requested schema.`,
        schema,
        allowedTools: [...READONLY_TOOLS],
        timeoutMs: 120_000,
        cwd: projectDir,
        logDir,
      });
      return executor().then(r => r.data);
    },
  };
}

async function splitFromDetail(result: GoalEvalResult, projectDir: string): Promise<TaskMdShape[]> {
  let detailOutput: string;
  try {
    if (result.dodResult) {
      detailOutput = result.dodResult.detail;
    } else if (result.goal.detail?.script) {
      const scriptPath = join(dirname(result.goal.filePath), result.goal.detail.script);
      const mod = await import(pathToFileURL(scriptPath).href);
      const out = await mod.run({
        projectDir,
        exec: (cmd: string) => execSync(cmd, {
          cwd: projectDir, encoding: 'utf8', timeout: 30_000,
          stdio: ['pipe', 'pipe', 'pipe'],
        }).trim(),
      });
      detailOutput = typeof out === 'string' ? out : out.detail ?? '';
    } else if (result.goal.detail?.cmd) {
      detailOutput = execSync(result.goal.detail.cmd, {
        cwd: projectDir, encoding: 'utf8', timeout: 30_000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
    } else {
      return [];
    }
  } catch { return []; }

  const fileGroups = new Map<string, string[]>();
  for (const line of detailOutput.split('\n').filter(l => l.trim())) {
    const match = line.match(/^([^:]+):/);
    const file = match?.[1] ?? 'unknown';
    const group = fileGroups.get(file) ?? [];
    group.push(line);
    fileGroups.set(file, group);
  }

  const tasks: TaskMdShape[] = [];
  let idx = 0;
  for (const [file, lines] of fileGroups) {
    idx++;
    const slug = file.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
    tasks.push({
      id: `${String(idx).padStart(3, '0')}-${slug}`,
      title: `Fix ${result.goal.title} in ${basename(file)}`,
      outputs: [file],
      body: `Fix the following issues in \`${file}\`:\n\n${lines.map(l => `- ${l}`).join('\n')}\n\n${result.goal.body}`,
    });
  }

  return tasks;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build the task body for a goal, including dod reportData when available.
 * The planning skill reads this context to generate appropriate remediation.
 */
function buildGoalTaskBody(result: GoalEvalResult): string {
  const parts: string[] = [];

  if (result.goal.requirements) {
    parts.push(`## Requirements\n\n${result.goal.requirements}`);
  }
  if (result.goal.body) {
    parts.push(result.goal.body);
  }
  parts.push(`\nGoal metric: current=${result.value}, target=${result.goal.metric.target}`);

  // Include dod report data so the planning skill has diagnostic context
  if (result.dodResult) {
    if (result.dodResult.detail) {
      parts.push(`## DoD Report\n\n${result.dodResult.detail}`);
    }
    if (result.dodResult.reportData) {
      try {
        const json = JSON.stringify(result.dodResult.reportData, null, 2);
        if (json.length < 5000) {
          parts.push(`## DoD Data\n\n\`\`\`json\n${json}\n\`\`\``);
        }
      } catch { /* skip if not serializable */ }
    }
  }

  return parts.filter(Boolean).join('\n\n');
}

/** Count a goal and all its nested sub-goals recursively. */
function countGoals(goal: GoalDefinition): number {
  let count = 1;
  if (goal.goals) {
    for (const sub of goal.goals) count += countGoals(sub);
  }
  return count;
}

/**
 * Check the status of existing tasks for a goal.
 * Returns:
 *   'none'       — no tasks exist yet → should plan
 *   'all-failed' — all tasks failed → should re-plan (repeat until met)
 *   'active'     — some tasks pending/running → wait
 */
function goalTaskStatus(goal: GoalDefinition, projectDir: string): 'none' | 'all-failed' | 'active' {
  const epicsDir = join(projectDir, '.converge', 'epics');
  if (!existsSync(epicsDir)) return 'none';

  let foundTasks = false;
  let allFailed = true;

  try {
    const epics = readdirSync(epicsDir);
    for (const epic of epics) {
      const epicMdPath = join(epicsDir, epic, 'TASK.md');
      if (!existsSync(epicMdPath)) continue;

      const content = readFileSync(epicMdPath, 'utf-8');
      if (!content.includes(goal.id)) continue;

      // This epic has tasks for this goal. Check checkpoint status.
      const journalEpicDir = join(getEpicsDir(projectDir), epic);
      if (!existsSync(journalEpicDir)) {
        // Epic exists but no journal → tasks haven't run yet
        foundTasks = true;
        allFailed = false;
        break;
      }

      // Scan checkpoints
      const checkpoints = findCheckpoints(journalEpicDir);
      if (checkpoints.length === 0) {
        foundTasks = true;
        allFailed = false;
        break;
      }

      foundTasks = true;
      for (const ckpt of checkpoints) {
        try {
          const data = JSON.parse(readFileSync(ckpt, 'utf-8'));
          if (data.status !== 'failed') {
            allFailed = false;
            break;
          }
        } catch { /* ignore corrupt */ }
      }
      if (!allFailed) break;
    }
  } catch { return 'none'; }

  if (!foundTasks) return 'none';
  if (allFailed) return 'all-failed';
  return 'active';
}

function findCheckpoints(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findCheckpoints(full));
      } else if (entry.name === 'checkpoint.json') {
        results.push(full);
      }
    }
  } catch { /* ignore */ }
  return results;
}

function nextEpicId(projectDir: string): string {
  const epicsDir = join(projectDir, '.converge', 'epics');
  if (!existsSync(epicsDir)) return '01-remediation';

  const existing = readdirSync(epicsDir)
    .filter(d => /^\d+-/.test(d))
    .map(d => parseInt(d.split('-')[0], 10))
    .filter(n => !isNaN(n));

  const next = (Math.max(0, ...existing) + 1).toString().padStart(2, '0');
  return `${next}-remediation`;
}

function writeTaskMd(path: string, frontmatter: Record<string, unknown>, body: string): void {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(frontmatter)) {
    if (v !== undefined) clean[k] = v;
  }
  const yaml = stringifyYaml(clean, { lineWidth: 0 }).trim();
  writeFileSync(path, `---\n${yaml}\n---\n\n${body}\n`, 'utf-8');
}

/* ------------------------------------------------------------------ */
/*  goalDefs: write GOAL.md files from task's goalDefs property        */
/* ------------------------------------------------------------------ */

import type { GoalDef } from '../config/task-md-definition.ts';

/**
 * Write GOAL.md files as nested sub-goals under a parent goal directory.
 * Creates {parentGoalDir}/goals/{id}/GOAL.md for each definition.
 */
function writeNestedGoalDefs(parentGoalDir: string, goalDefs: GoalDef[]): number {
  if (!goalDefs || goalDefs.length === 0) return 0;

  const subGoalsDir = join(parentGoalDir, 'goals');
  let written = 0;

  for (const def of goalDefs) {
    const goalDir = join(subGoalsDir, def.id);

    // Skip if already exists
    if (existsSync(join(goalDir, 'GOAL.md'))) continue;

    mkdirSync(goalDir, { recursive: true });

    const frontmatter: Record<string, unknown> = {
      title: def.title,
      metric: def.metric,
    };
    if (def.depends?.length) frontmatter.depends = def.depends;
    if (def.requirements) frontmatter.requirements = def.requirements;
    if (def.dod) frontmatter.dod = { script: 'dod.js' };
    if (def.wbs) frontmatter.plan = { strategy: 'wbs' };
    else if (def.plan) frontmatter.plan = def.plan;
    if (def.tags?.length) frontmatter.tags = def.tags;

    const body = def.body ?? '';
    writeTaskMd(join(goalDir, 'GOAL.md'), frontmatter, body);

    // Write dod.js and wbs.js scripts alongside GOAL.md when provided
    if (def.dod) {
      writeFileSync(join(goalDir, 'dod.js'), def.dod, 'utf-8');
    }
    if (def.wbs) {
      writeFileSync(join(goalDir, 'wbs.js'), def.wbs, 'utf-8');
    }

    written++;
  }

  return written;
}

/**
 * Write GOAL.md files from a task's goalDefs property.
 *
 * Called by the converge runner after a task completes successfully.
 * Each GoalDef becomes a .converge/goals/{NNN}-{id}/GOAL.md file.
 * The converge runner discovers them on the next re-evaluation.
 *
 * When parentGoalDir is provided, goals are written as nested sub-goals
 * under that directory instead of at the top level.
 *
 * Returns number of goals written.
 */
export function writeGoalDefs(projectDir: string, goalDefs: GoalDef[], parentGoalDir?: string): number {
  if (parentGoalDir) return writeNestedGoalDefs(parentGoalDir, goalDefs);
  if (!goalDefs || goalDefs.length === 0) return 0;

  const goalsDir = join(projectDir, '.converge', 'goals');
  let written = 0;

  // Find the next available number prefix
  let nextNum = 100;
  if (existsSync(goalsDir)) {
    const existing = readdirSync(goalsDir)
      .filter(d => /^\d+-/.test(d))
      .map(d => parseInt(d.split('-')[0], 10))
      .filter(n => !isNaN(n));
    if (existing.length > 0) {
      nextNum = Math.max(...existing) + 10;
      // Round up to next 10
      nextNum = Math.ceil(nextNum / 10) * 10;
    }
  }

  for (const def of goalDefs) {
    // Skip if a goal with this id already exists
    const existingGoal = existsSync(goalsDir) &&
      readdirSync(goalsDir).some(d => d.endsWith(`-${def.id}`));
    if (existingGoal) continue;

    const dirName = `${String(nextNum).padStart(3, '0')}-${def.id}`;
    const goalDir = join(goalsDir, dirName);
    mkdirSync(goalDir, { recursive: true });

    const frontmatter: Record<string, unknown> = {
      title: def.title,
      metric: def.metric,
    };
    if (def.depends?.length) frontmatter.depends = def.depends;
    if (def.requirements) frontmatter.requirements = def.requirements;
    if (def.dod) frontmatter.dod = { script: 'dod.js' };
    if (def.wbs) frontmatter.plan = { strategy: 'wbs' };
    else if (def.plan) frontmatter.plan = def.plan;
    if (def.tags?.length) frontmatter.tags = def.tags;

    const body = def.body ?? '';
    writeTaskMd(join(goalDir, 'GOAL.md'), frontmatter, body);

    // Write dod.js and wbs.js scripts alongside GOAL.md when provided
    if (def.dod) {
      writeFileSync(join(goalDir, 'dod.js'), def.dod, 'utf-8');
    }
    if (def.wbs) {
      writeFileSync(join(goalDir, 'wbs.js'), def.wbs, 'utf-8');
    }

    nextNum += 10;
    written++;
  }

  return written;
}
