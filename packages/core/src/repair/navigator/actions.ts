/**
 * Navigator Graph — Action Handlers
 *
 * Each handler: (Snapshot, Graph) → WalkResult.
 * Actions read the graph to inspect history and add buffered nodes
 * for dynamic dispatch. No inject/splice — write directly to the graph.
 */

import type {
  Snapshot,
  WalkResult,
  ActionHandler,
  Graph,
  GraphNode,
} from "./types.ts";
import type { Gap } from "../../gap/types.ts";
import type { StrategyContext, StrategyOutcome } from "../types.ts";
import type { TaskEventWriter } from "../../journal/event-writer.ts";
import { getTaskAttemptDir } from "../../journal/structure.ts";

function getEventWriter(): TaskEventWriter | null {
  return (global as any).__CONVERGE_EVENT_WRITER__ || null;
}

function getSessionLogger(): any | null {
  return (global as any).__CONVERGE_SESSION_LOGGER__ || null;
}

/**
 * Auto-install a skill from the converge package into the project's .converge/skills/.
 * Returns true if the skill was found and installed.
 */
async function autoInstallPackageSkill(
  skillName: string,
  projectDir: string,
): Promise<boolean> {
  const { existsSync } = await import("node:fs");
  const { join, dirname, resolve } = await import("node:path");
  const {
    mkdir,
    readdir,
    copyFile: fsCopyFile,
  } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");

  // Resolve the converge package's skills directory
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);
  const packageRoot = currentDir.includes("/dist")
    ? resolve(currentDir, "..")
    : resolve(currentDir, "../../..");
  const packageSkillsDir = join(packageRoot, "skills");

  const srcDir = join(packageSkillsDir, skillName);
  if (!existsSync(srcDir) || !existsSync(join(srcDir, "SKILL.md"))) {
    return false;
  }

  const destDir = join(projectDir, ".converge", "skills", skillName);

  // Recursive copy
  async function copyDir(src: string, dest: string): Promise<void> {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        await fsCopyFile(srcPath, destPath);
      }
    }
  }

  await copyDir(srcDir, destDir);
  console.log(`   ✅ Auto-installed skill: ${skillName}`);
  return true;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildStrategyContext(snap: Snapshot): StrategyContext {
  return {
    projectDir: snap.projectDir,
    journalCtx: { epicId: snap.epicId, taskId: snap.unit.id },
    timeline: null as any,
    attempt: snap.iteration,
  };
}

function groupGaps(gaps: readonly Gap[]): Map<string, Gap[]> {
  const groups = new Map<string, Gap[]>();
  for (const gap of gaps) {
    const key = (gap.metadata?.taskId as string) ?? gap.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(gap);
  }
  return groups;
}

function pickRepresentative(group: Gap[]): Gap {
  const primary =
    group.find((g) => g.metadata?.gapKind === "output") ?? group[0];
  return {
    ...primary,
    metadata: {
      ...primary.metadata,
      allMissingItems: group.map((g) => g.description),
    },
  };
}

async function runStrategy(
  strategyName: string,
  createStrategy: () => import("../types.ts").FixStrategy,
  snap: Snapshot,
): Promise<WalkResult> {
  const groups = groupGaps(snap.gaps);
  const sCtx = buildStrategyContext(snap);
  let anyFixed = false;

  for (const [, group] of groups) {
    const gap = pickRepresentative(group);
    const strategy = createStrategy();

    if (!strategy.canHandle(gap)) continue;

    const start = Date.now();
    let outcome: StrategyOutcome;
    try {
      outcome = await strategy.tryFix(gap, sCtx);
    } catch (err: any) {
      outcome = { success: false, reason: `Uncaught: ${err.message}` };
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (outcome.success) {
      console.log(`   ✅ ${strategyName} (${elapsed}s)`);
      anyFixed = true;
    } else {
      console.log(`   ↩  ${strategyName}: ${outcome.reason} (${elapsed}s)`);
    }
  }

  return { action: "continue" };
}

/* ------------------------------------------------------------------ */
/*  check-wbs-seeded — skip WBS parent if already seeded               */
/* ------------------------------------------------------------------ */

const checkWbsSeeded: ActionHandler = async (snap) => {
  if (!snap.unit.wbsFn) return { action: "continue" };

  const { existsSync, readFileSync, unlinkSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { getJournalStructure } = await import("../../journal/structure.ts");

  const structure = getJournalStructure(
    snap.projectDir,
    snap.epicId,
    snap.unit.id,
  );
  const wbsJsonPath = join(structure.task!, "wbs.json");

  if (!existsSync(wbsJsonPath)) return { action: "continue" };

  try {
    const wbsData = JSON.parse(readFileSync(wbsJsonPath, "utf-8"));
    if (wbsData.spawnCount > 0) {
      const subtasks: Array<{ id: string }> = wbsData.subtasks ?? [];
      const anyChildExists =
        subtasks.length > 0 &&
        subtasks.some((t) =>
          existsSync(join(snap.unit.path, "tasks", t.id, "TASK.md")),
        );

      if (anyChildExists) {
        console.log(
          `\n✅ Pre-flight: WBS already seeded (${wbsData.spawnCount} tasks) — skipping re-execution`,
        );
        return { action: "done", success: true, reason: "WBS already seeded" };
      }

      // Stale — children don't exist on disk
      unlinkSync(wbsJsonPath);
      console.log(
        `\n⚠️  Pre-flight: wbs.json claims ${wbsData.spawnCount} tasks but none exist on disk — re-seeding`,
      );
    } else {
      unlinkSync(wbsJsonPath);
      console.log(
        "\n⚠️  Pre-flight: wbs.json exists but spawnCount=0 — deleting stale marker and re-executing",
      );
    }
  } catch {
    try {
      unlinkSync(wbsJsonPath);
    } catch {
      /* ignore */
    }
    console.log(
      "\n⚠️  Pre-flight: wbs.json corrupted — deleting and re-executing",
    );
  }

  return { action: "continue" };
};

/* ------------------------------------------------------------------ */
/*  check-outputs-exist — skip if outputs already present              */
/* ------------------------------------------------------------------ */

const checkOutputsExist: ActionHandler = async (snap) => {
  const unit = snap.unit;
  if (unit.wbsFn) return { action: "continue" };
  if ((unit.outputs?.length ?? 0) === 0) return { action: "continue" };

  const { existsSync } = await import("node:fs");
  const { join } = await import("node:path");

  const attemptDir = process.env.CONVERGE_TASK_ATTEMPT_DIR;
  const hasLearnMd = attemptDir
    ? existsSync(join(attemptDir, "LEARN.md"))
    : false;
  const attemptNumber = parseInt(process.env.CONVERGE_TASK_ATTEMPT || "1", 10);

  if (hasLearnMd || attemptNumber <= 1) return { action: "continue" };

  const { findGaps } = await import("../../unit/find-gaps.ts");
  const preflightGaps = await findGaps(unit);
  const actionableGaps = preflightGaps.filter(
    (g) =>
      g.metadata?.gapKind === "output" ||
      g.metadata?.gapKind === "corrupted" ||
      g.metadata?.gapKind === "check",
  );

  if (actionableGaps.length === 0) {
    console.log(
      "\n✅ Pre-flight: all outputs already present — skipping execution (task was already complete)",
    );
    const eventWriter = getEventWriter();
    if (eventWriter) {
      eventWriter.aiReasoning(
        "Pre-flight check: outputs already exist, skipping execution",
        {
          taskId: unit.id,
          outputCount: unit.outputs?.length ?? 0,
        },
      );
    }
    return { action: "done", success: true, reason: "Outputs already present" };
  }

  return { action: "continue" };
};

/* ------------------------------------------------------------------ */
/*  detect-gaps                                                        */
/* ------------------------------------------------------------------ */

const detectGaps: ActionHandler = async (snap) => {
  const { findGaps } = await import("../../unit/find-gaps.ts");
  const gaps = await findGaps(snap.unit);

  const eventWriter = getEventWriter();
  if (eventWriter) {
    for (const gap of gaps) {
      eventWriter.gapDetected(
        gap.id,
        gap.description,
        (gap.metadata?.gapKind as string) || gap.type,
      );
    }
  }

  snap.taskContext?.logGaps(snap.iteration, gaps, snap.gaps);
  return { action: "continue", gaps, previousGaps: [...snap.gaps] };
};

/* ------------------------------------------------------------------ */
/*  signal-done                                                        */
/* ------------------------------------------------------------------ */

const signalDone: ActionHandler = async () => {
  console.log("\n✅ Converged — all gaps resolved");
  return { action: "done", success: true, reason: "Converged" };
};

/* ------------------------------------------------------------------ */
/*  resolve-plan                                                       */
/* ------------------------------------------------------------------ */

const resolvePlan: ActionHandler = async (snap) => {
  const { PlanExecutor } = await import("../../executor/plan-executor.ts");
  const { resolvePrompt, createTaskContext } =
    await import("../../unit/resolve.ts");

  const planGap = snap.gaps.find((g) => g.metadata?.gapKind === "plan");
  if (!planGap) return { action: "continue" };

  const unit = snap.unit;
  if (!unit.planConfig) return { action: "continue" };

  const eventWriter = getEventWriter();
  if (eventWriter) {
    eventWriter.gapDetected(planGap.id, planGap.description, "plan");
  }
  const sessionLogger = getSessionLogger();
  if (sessionLogger && unit.id) {
    await sessionLogger.logGapDetected(unit.id, "plan", planGap.description);
  }

  const jCtx = { epicId: snap.epicId, taskId: unit.id };
  const executor = new PlanExecutor(snap.projectDir, jCtx, {
    id: unit.id,
    title: unit.title,
    vars: unit.vars,
  });

  const fixStart = Date.now();

  if (!executor.alreadyPlanned()) {
    const ctx = createTaskContext(unit);
    const planPromptOverride =
      typeof unit.planConfig.prompt === "function"
        ? await unit.planConfig.prompt(ctx)
        : unit.planConfig.prompt;

    const outputPrompt =
      typeof unit.planConfig.outputPrompt === "function"
        ? await unit.planConfig.outputPrompt(ctx)
        : unit.planConfig.outputPrompt;

    const taskPrompt = await resolvePrompt(unit);
    const finalPrompt = executor.buildPlanningPrompt(
      taskPrompt,
      planPromptOverride,
      unit.planConfig.output,
      outputPrompt,
    );

    try {
      await executor.run(finalPrompt, unit.planConfig.output);
    } catch (err: any) {
      console.error(`[resolve-plan] Plan generation failed: ${err.message}`);
      return { action: "continue" };
    }
  }

  if (eventWriter) {
    eventWriter.write({
      type: "strategy_applied" as any,
      level: "info",
      gapId: planGap.id,
      strategy: "plan",
      duration: Date.now() - fixStart,
    });
  }

  return { action: "continue" };
};

/* ------------------------------------------------------------------ */
/*  resolve-wbs                                                        */
/* ------------------------------------------------------------------ */

const resolveWbs: ActionHandler = async (snap) => {
  const { WbsExecutor } = await import("../../executor/wbs-executor.ts");
  const { findGaps } = await import("../../unit/find-gaps.ts");

  const unit = snap.unit;
  if (!unit.wbsFn) return { action: "continue" };

  // Re-detect after plan may have been resolved
  const postPlanGaps = await findGaps(unit);
  const wbsGap = postPlanGaps.find((g) => g.metadata?.gapKind === "wbs");
  if (!wbsGap) return { action: "continue", gaps: postPlanGaps };

  const jCtx = { epicId: snap.epicId, taskId: unit.id };
  const executor = new WbsExecutor(snap.projectDir, jCtx, unit.path, {
    id: unit.id,
    title: unit.title,
    vars: unit.vars,
  });

  const fixStart = Date.now();
  const result = await executor.run(unit.wbsFn, 1);

  const eventWriter = getEventWriter();
  if (eventWriter) {
    eventWriter.write({
      type: "strategy_applied" as any,
      level: "info",
      gapId: wbsGap.id,
      strategy: "wbs",
      duration: Date.now() - fixStart,
    });
  }

  if (result.error || result.spawnCount === 0) {
    console.log("\n❌ WBS failed to seed tasks");
    return {
      action: "bail",
      success: false,
      reason: "WBS failed to seed tasks",
    };
  }

  console.log("\n✅ WBS seeded — child tasks will be picked up by the engine");
  return { action: "done", success: true, reason: "WBS seeded" };
};

/* ------------------------------------------------------------------ */
/*  resolve-blockers                                                   */
/* ------------------------------------------------------------------ */

const resolveBlockers: ActionHandler = async (snap) => {
  const { findGaps } = await import("../../unit/find-gaps.ts");
  const blockers = snap.gaps.filter((g) => g.metadata?.gapKind === "blocker");
  if (blockers.length === 0) return { action: "continue" };

  const eventWriter = getEventWriter();
  const sessionLogger = getSessionLogger();
  for (const b of blockers) {
    if (eventWriter) {
      eventWriter.gapDetected(
        b.id,
        b.description,
        (b.metadata?.gapKind as string) || "blocker",
      );
    }
    if (sessionLogger && snap.unit.id) {
      await sessionLogger.logGapDetected(
        snap.unit.id,
        (b.metadata?.gapKind as string) || "blocker",
        b.description,
      );
    }
  }

  // Re-check — blockers may have been resolved by upstream work (e.g. parent tasks)
  const stillBlocked = (await findGaps(snap.unit)).filter(
    (g) => g.metadata?.gapKind === "blocker",
  );

  if (stillBlocked.length > 0) {
    const label = snap.unit.wbsFn
      ? "WBS task cannot seed"
      : "Task cannot execute";
    console.log(
      `\n❌ ${label}: ${stillBlocked.length} blocker(s) still unresolved`,
    );
    for (const b of stillBlocked) {
      console.log(`  - ${b.description}`);
    }
    return {
      action: "bail",
      success: false,
      reason: `${stillBlocked.length} unresolvable blockers`,
    };
  }

  return { action: "continue" };
};

/* ------------------------------------------------------------------ */
/*  bail-blockers                                                      */
/* ------------------------------------------------------------------ */

const bailBlockers: ActionHandler = async (snap) => {
  const blockers = snap.gaps.filter((g) => g.metadata?.gapKind === "blocker");
  if (blockers.length === 0) return { action: "continue" };

  console.log(
    `\n❌ Task cannot proceed: ${blockers.length} unresolvable blocker(s)`,
  );
  for (const b of blockers) {
    console.log(`  - ${b.description}`);
  }
  return {
    action: "bail",
    success: false,
    reason: `${blockers.length} unresolvable blockers`,
  };
};

/* ------------------------------------------------------------------ */
/*  run-executor — inject the right dispatch node for this unit       */
/* ------------------------------------------------------------------ */

/**
 * Inspects the unit and adds the appropriate execution node to the graph
 * as a buffered node. Each node is individually resumable.
 *
 * Dispatch priority (first match wins):
 *   executorFn → add 'run-executor-fn'
 *   loopFn     → add 'run-loop-fn'
 *   wbsFn      → done (resolve-wbs already handled it)
 *   children   → add 'run-children'  (discovers + delegates)
 *   skill      → add 'run-skill'
 *   leaf       → no-op (repair-loop handles gaps)
 */
const runExecutor: ActionHandler = async (snap, graph) => {
  const unit = snap.unit;
  const suffix = snap.iteration > 1 ? `#${snap.iteration}` : "";

  if (unit.executorFn) {
    graph.addNode({
      id: `run-executor-fn${suffix}`,
      handler: "run-executor-fn",
      status: "buffered",
      origin: "reactive",
      data: { priority: 64 },
    });
    return { action: "continue" };
  }
  if (unit.loopFn) {
    graph.addNode({
      id: `run-loop-fn${suffix}`,
      handler: "run-loop-fn",
      status: "buffered",
      origin: "reactive",
      data: { priority: 64 },
    });
    return { action: "continue" };
  }
  if (unit.wbsFn) {
    return { action: "done", success: true, reason: "WBS already seeded" };
  }

  // Discover children lazily
  if (!unit.children) {
    const { discoverChildren } = await import("../../unit/children.ts");
    unit.children = await discoverChildren(unit, []);
  }
  if (unit.children.length > 0) {
    graph.addNode({
      id: `run-children${suffix}`,
      handler: "run-children",
      status: "buffered",
      origin: "reactive",
      data: { priority: 64 },
    });
    return { action: "continue" };
  }

  const { resolveSkill } = await import("../../unit/resolve.ts");
  if (resolveSkill(unit)) {
    graph.addNode({
      id: `run-skill${suffix}`,
      handler: "run-skill",
      status: "buffered",
      origin: "reactive",
      data: { priority: 64 },
    });
    return { action: "continue" };
  }

  // Leaf without skill — repair-loop handles gap fixing
  return { action: "continue" };
};

/* ------------------------------------------------------------------ */
/*  run-executor-fn — TaskExecutor.run() single shot                   */
/* ------------------------------------------------------------------ */

const runExecutorFn: ActionHandler = async (snap) => {
  const { TaskExecutor } = await import("../../executor/task-executor.ts");
  const { resolveChecks } = await import("../../unit/resolve.ts");
  const unit = snap.unit;
  const jCtx = { epicId: snap.epicId, taskId: unit.id };
  const meta = {
    id: unit.id,
    title: unit.title,
    outputs: unit.outputs,
    checks: await resolveChecks(unit),
  };
  const executor = new TaskExecutor(snap.projectDir, jCtx, meta, unit);
  await executor.run(unit.executorFn!, snap.iteration);
  return { action: "continue" };
};

/* ------------------------------------------------------------------ */
/*  run-loop-fn — LoopFunctionExecutor.run()                           */
/* ------------------------------------------------------------------ */

const runLoopFn: ActionHandler = async (snap) => {
  const { LoopFunctionExecutor } =
    await import("../../executor/loop-executor.ts");
  const unit = snap.unit;
  const jCtx = { epicId: snap.epicId, taskId: unit.id };
  const executor = new LoopFunctionExecutor(snap.projectDir, jCtx);
  const maxIterations =
    (unit.vars?.maxLoopIterations as number | undefined) ??
    unit.config.maxIterations;
  await executor.run(unit.loopFn!, maxIterations);
  return { action: "continue" };
};

/* ------------------------------------------------------------------ */
/*  run-children — discover + delegate to child.run()                  */
/* ------------------------------------------------------------------ */

const runChildren: ActionHandler = async (snap) => {
  const unit = snap.unit;
  if (!unit.children) {
    const { discoverChildren } = await import("../../unit/children.ts");
    unit.children = await discoverChildren(unit, []);
  }
  if (unit.children.length === 0) return { action: "continue" };

  return {
    action: "delegate",
    delegateChildren: unit.children,
  };
};

/* ------------------------------------------------------------------ */
/*  run-skill — invoke declared skill(s) via SpawnRunner               */
/* ------------------------------------------------------------------ */

const runSkill: ActionHandler = async (snap) => {
  const { existsSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { SpawnRunner } = await import("../../executor/spawn-runner.ts");
  const { writeTaskStatus } = await import("../../journal/writer.ts");
  const { getJournalStructure } = await import("../../journal/structure.ts");
  const { resolveSkill } = await import("../../unit/resolve.ts");
  const { resolveSkillPath, resolveSkillsRoot } =
    await import("../../config/skill-path-resolver.ts");

  const unit = snap.unit;
  const projectDir = snap.projectDir;
  const jCtx = { epicId: snap.epicId, taskId: unit.id };
  const resolved = resolveSkill(unit);
  if (!resolved) return { action: "continue" };

  const skillNames = Array.isArray(resolved) ? resolved : [resolved];
  console.log(`\n🎯 Auto-invoking declared skill(s): ${skillNames.join(", ")}`);

  const structure = getJournalStructure(projectDir, jCtx.epicId, jCtx.taskId);
  const attemptNumber = process.env.CONVERGE_TASK_ATTEMPT || "wip";
  const logDir = structure.attempt
    ? join(structure.attempt, "logs")
    : join(structure.task!, "attempts", attemptNumber, "logs");

  const spawnRunner = new SpawnRunner(
    projectDir,
    jCtx,
    () => logDir,
    async (opts) => {
      await writeTaskStatus(projectDir, jCtx.epicId, jCtx.taskId, {
        taskId: jCtx.taskId,
        epicId: jCtx.epicId,
        focusPath: `${jCtx.epicId}/${jCtx.taskId}`,
        status: opts.status,
        startedAt: opts.startedAt,
        completedAt: opts.completedAt,
        attempt: 1,
        gapsResolved: 0,
        gapsFailed: 0,
        checklist: opts.checklist,
        error: opts.error,
      });
    },
    unit,
  );

  const state = {
    counter: 0,
    checklist: [] as any[],
    startedAt: new Date().toISOString(),
  };

  for (const name of skillNames) {
    // Resolve skill path using the new resolver (supports .skill/, .claude/skills/, .converge/skills/)
    const skillDir = resolveSkillPath(name, projectDir);

    if (!skillDir) {
      // Try to auto-install from package skills directory
      const installed = await autoInstallPackageSkill(name, projectDir);
      if (!installed) {
        console.warn(
          `   ⚠️  Skill not found: ${name} (searched in .skill/, .claude/skills/, .converge/skills/)`,
        );
        continue;
      }
      // Retry after auto-install
      continue;
    }

    const skillMdPath = join(skillDir, "SKILL.md");
    if (!existsSync(skillMdPath)) {
      console.warn(`   ⚠️  Skill file not found: ${skillMdPath}`);
      continue;
    }

    // Create relative path from projectDir for executeSpawnPath
    // spawn-runner expects path relative to projectDir
    const { relative } = await import("node:path");
    const relativeSkillPath = relative(projectDir, skillMdPath).replace(
      /\\/g,
      "/",
    );

    try {
      state.counter++;
      await spawnRunner.executeSpawnPath(relativeSkillPath, state);
    } catch (error: any) {
      console.error(`   ❌ Error executing skill ${name}: ${error.message}`);
    }
  }

  return { action: "continue" };
};

/* ------------------------------------------------------------------ */
/*  Strategy handlers (call tryFix directly)                           */
/* ------------------------------------------------------------------ */

/**
 * repair-loop — unified repair action.
 *
 * Uses GapRepairPredicate.decide() to determine the next strategy,
 * then writes planned nodes directly into the graph as buffered actions.
 */
const repairLoop: ActionHandler = async (snap, graph) => {
  const { prepareFeedback } = await import("../feedback-writer.ts");
  const { GapRepairPredicate } = await import("../predicate.ts");
  const { UnifiedStrategyRegistry, getBuiltinDescriptors } =
    await import("../strategy-catalog.ts");
  const { join, dirname } = await import("node:path");

  const jCtx = { epicId: snap.epicId, taskId: snap.unit.id };

  // Write FEEDBACK.md for check-failed gaps before repair
  for (const gap of snap.gaps) {
    await prepareFeedback(gap, snap.projectDir);
  }

  // Build unified strategy registry
  const reg = new UnifiedStrategyRegistry();
  const strategies = await buildTsStrategies();

  for (const { descriptor, strategyClass } of getBuiltinDescriptors()) {
    const strategy = strategies.find(
      (s) => s.constructor.name === strategyClass || s.name === descriptor.name,
    );
    if (strategy) reg.registerBuiltin(strategy, descriptor);
  }

  const repairDir = join(snap.projectDir, ".converge", "skills", "repair");
  const count = await reg.scanAndRegisterSkills(repairDir);
  if (count > 0) console.log(`   📦 ${count} repair skill(s) loaded`);

  const { fileURLToPath } = await import("node:url");
  const builtinDir = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "skill-templates",
  );
  await reg.scanAndRegisterSkills(builtinDir);

  // Group gaps and process each group
  const groups = groupGaps(snap.gaps);

  for (const [, group] of groups) {
    const gap = pickRepresentative(group);
    const gapKind = (gap.metadata?.gapKind as string) ?? gap.type;
    const allDescriptors = reg.getEligible(gapKind);
    const tsEligible = strategies.filter((s) => s.canHandle(gap));

    if (allDescriptors.length === 0 && tsEligible.length === 0) continue;

    const registryNames = new Set(allDescriptors.map((d) => d.name));
    const extraTs = tsEligible.filter((s) => !registryNames.has(s.name));

    const predicate = new GapRepairPredicate(snap.projectDir, jCtx);

    const result = await predicate.decide({
      gap,
      tried: [],
      descriptors: allDescriptors,
      tsEligible,
      extraTs,
      attempts: [],
    });

    if (result) {
      // Write planned strategy nodes directly into the graph
      for (const node of result.nodes) {
        graph.addNode(node);
      }
    }
  }

  return { action: "continue" };
};

/**
 * run-strategy — generic handler that executes a named strategy.
 * Reads the strategy name from the current executing node's data.
 */
const runStrategyHandler: ActionHandler = async (snap, graph) => {
  // Find the strategy name from the executing node's data
  const currentNode = graph.nodes.find((n) => n.status === "executing");
  const strategyName = currentNode?.data?.strategy as string;
  if (!strategyName)
    return { action: "bail", reason: "run-strategy: no strategy name" };

  const strategies = await buildTsStrategies();
  const tsStrategy = strategies.find((s) => s.name === strategyName);

  if (tsStrategy) {
    return runStrategy(strategyName, () => tsStrategy, snap);
  }

  // Try unified registry (skill-based strategies)
  const { UnifiedStrategyRegistry, getBuiltinDescriptors, gatherContext } =
    await import("../strategy-catalog.ts");
  const { join, dirname } = await import("node:path");

  const reg = new UnifiedStrategyRegistry();
  for (const { descriptor, strategyClass } of getBuiltinDescriptors()) {
    const strategy = strategies.find(
      (s) => s.constructor.name === strategyClass || s.name === descriptor.name,
    );
    if (strategy) reg.registerBuiltin(strategy, descriptor);
  }

  const repairDir = join(snap.projectDir, ".converge", "skills", "repair");
  await reg.scanAndRegisterSkills(repairDir);
  const { fileURLToPath } = await import("node:url");
  const builtinDir = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "skill-templates",
  );
  await reg.scanAndRegisterSkills(builtinDir);

  const gapKind = (snap.gaps[0]?.metadata?.gapKind as string) ?? "output";
  const allDescriptors = reg.getEligible(gapKind);
  const descriptor = allDescriptors.find((d) => d.name === strategyName);

  if (!descriptor) {
    console.log(`   ⚠️  Strategy '${strategyName}' not found`);
    return { action: "continue" };
  }

  const groups = groupGaps(snap.gaps);
  const sCtx = buildStrategyContext(snap);

  for (const [, group] of groups) {
    const gap = pickRepresentative(group);
    if (descriptor.type === "builtin" && descriptor.strategy) {
      if (!descriptor.strategy.canHandle(gap)) continue;
      const start = Date.now();
      try {
        const outcome = await descriptor.strategy.tryFix(gap, sCtx);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        if (outcome.success) {
          console.log(`   ✅ ${strategyName} (${elapsed}s)`);
        } else {
          console.log(`   ↩  ${strategyName}: ${outcome.reason} (${elapsed}s)`);
        }
      } catch (err: any) {
        console.log(`   ↩  ${strategyName}: Uncaught: ${err.message}`);
      }
    } else if (descriptor.skillPath) {
      // Skill-based strategy execution
      const gathered = await gatherContext(
        descriptor.contextSteps,
        gap,
        snap.projectDir,
      );
      await executeSkillStrategy(descriptor, gap, gathered, snap);
    }
  }

  return { action: "continue" };
};

/** Lazily build TS strategies (same set as buildDefaultPipeline) */
async function buildTsStrategies(): Promise<
  import("../types.ts").FixStrategy[]
> {
  const { TaskRunStrategy } = await import("../strategies/task-run.ts");
  const { WBSGeneratorRepairStrategy } =
    await import("../strategies/wbs-generator-repair.ts");
  const { WbsScriptRepairStrategy } =
    await import("../strategies/wbs-script-repair.ts");
  const { MissingWbsScriptStrategy } =
    await import("../strategies/missing-wbs-script.ts");
  const { DependencyBackoffStrategy } =
    await import("../strategies/dependency-backoff.ts");
  const { MissingInputPatternRepairStrategy } =
    await import("../strategies/missing-input-pattern.ts");
  const { UserQuestionResumeStrategy } =
    await import("../strategies/user-question-resume.ts");
  const { ToolEnvironmentRepairStrategy } =
    await import("../strategies/tool-environment-repair.ts");
  return [
    new UserQuestionResumeStrategy(),
    new MissingWbsScriptStrategy(), // Run before WbsScriptRepairStrategy to catch missing scripts
    new WBSGeneratorRepairStrategy(),
    new WbsScriptRepairStrategy(),
    new DependencyBackoffStrategy(),
    new MissingInputPatternRepairStrategy(),
    new ToolEnvironmentRepairStrategy(),
    new TaskRunStrategy(),
  ];
}

/** Execute a skill-based strategy (absorbed from pipeline.runSkillStrategy) */
async function executeSkillStrategy(
  descriptor: import("../strategy-catalog.ts").StrategyDescriptor,
  gap: import("../../gap/types.ts").Gap,
  gathered: { sections: Record<string, string>; asPromptSection: () => string },
  snap: Snapshot,
): Promise<void> {
  if (!descriptor.skillPath) return;

  const { toCompactGap } = await import("../../gap/types.ts");
  const { HistoryIndexBuilder } = await import("../history-index.ts");
  const { runAgent } = await import("../agent-runner.ts");
  const { join, dirname, relative } = await import("node:path");
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { existsSync: fsExists, readdirSync: fsReaddir } =
    await import("node:fs");

  const jCtx = { epicId: snap.epicId, taskId: snap.unit.id };
  const attemptDir =
    process.env.CONVERGE_TASK_ATTEMPT_DIR ??
    getTaskAttemptDir(snap.projectDir, jCtx.epicId, jCtx.taskId, "wip");
  const contextDir = join(attemptDir, "repair-context");
  await mkdir(contextDir, { recursive: true });

  const contextFiles: string[] = [];
  for (const [label, content] of Object.entries(gathered.sections)) {
    const fn = `${label}.md`;
    await writeFile(join(contextDir, fn), content);
    contextFiles.push(fn);
  }

  const compact = toCompactGap(gap);
  await writeFile(
    join(contextDir, "gap.md"),
    [
      `# Gap: ${compact.kind}`,
      `**Target**: ${compact.target}`,
      `**Status**: ${compact.status}`,
      `**Description**: ${gap.description}`,
      gap.metadata?.checkCmd ? `**Check**: \`${gap.metadata.checkCmd}\`` : "",
      gap.metadata?.checkOutput
        ? `**Error**:\n\`\`\`\n${(gap.metadata.checkOutput as string).slice(0, 800)}\n\`\`\``
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  try {
    const h = new HistoryIndexBuilder(snap.projectDir, jCtx);
    const s = await h.formatForPrompt();
    if (s) await writeFile(join(contextDir, "history.md"), s);
  } catch {
    /* non-fatal */
  }

  const skillDirs: Record<string, string> = {};
  const skillDir = dirname(descriptor.skillPath);
  skillDirs[descriptor.name] = skillDir;

  const parentDir = dirname(skillDir);
  if (fsExists(parentDir)) {
    for (const d of fsReaddir(parentDir, { withFileTypes: true })) {
      if (d.isDirectory() && fsExists(join(parentDir, d.name, "SKILL.md"))) {
        skillDirs[d.name] = join(parentDir, d.name);
      }
    }
  }

  const relCtx = relative(snap.projectDir, contextDir).replace(/\\/g, "/");
  const fileList = [
    ...contextFiles.map((f) => `  - \`${relCtx}/${f}\``),
    `  - \`${relCtx}/gap.md\``,
    `  - \`${relCtx}/history.md\``,
  ].join("\n");

  const prompt = `You are a repair agent. Fix the gap.

## Strategy
Read \`.claude/skills/${descriptor.name}/SKILL.md\` and follow its instructions.

## Context
${fileList}

**Read history.md first. Do NOT repeat failed approaches.**`;

  await runAgent({
    phase: "skill_repair",
    prompt,
    agentOptions: {
      skillDirs,
      timeoutMs: 300_000,
      maxRetries: 1,
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    },
    projectDir: snap.projectDir,
    journalCtx: jCtx,
    label: descriptor.name,
    skillName: descriptor.name,
    agentName: "repair",
  });
}

const strategyWbsGeneratorRepair: ActionHandler = async (snap) => {
  const { WBSGeneratorRepairStrategy } =
    await import("../strategies/wbs-generator-repair.ts");
  return runStrategy(
    "wbs-generator-repair",
    () => new WBSGeneratorRepairStrategy(),
    snap,
  );
};

const strategyWbsScriptRepair: ActionHandler = async (snap) => {
  const { WbsScriptRepairStrategy } =
    await import("../strategies/wbs-script-repair.ts");
  return runStrategy(
    "wbs-script-repair",
    () => new WbsScriptRepairStrategy(),
    snap,
  );
};

const strategyUserQuestionResume: ActionHandler = async (snap) => {
  const { UserQuestionResumeStrategy } =
    await import("../strategies/user-question-resume.ts");
  return runStrategy(
    "user-question-resume",
    () => new UserQuestionResumeStrategy(),
    snap,
  );
};

/* ------------------------------------------------------------------ */
/*  verify                                                             */
/* ------------------------------------------------------------------ */

const verify: ActionHandler = async (snap) => {
  const { findGaps } = await import("../../unit/find-gaps.ts");

  console.log("Verifying outputs...");
  const postGaps = await findGaps(snap.unit);

  const eventWriter = getEventWriter();
  if (eventWriter) {
    eventWriter.write({
      type: "validation_start" as any,
      level: "info",
      outputs: snap.unit.outputs || [],
    });

    if (postGaps.length === 0) {
      eventWriter.write({
        type: "validation_result" as any,
        level: "info",
        output: snap.unit.outputs?.join(", ") || "",
        exists: true,
        checks: (snap.unit.outputs || []).map((o) => ({ id: o, passed: true })),
      });
    } else {
      eventWriter.write({
        type: "validation_result" as any,
        level: "warning",
        output: snap.unit.outputs?.join(", ") || "",
        exists: false,
        checks: postGaps.map((g) => ({
          id: g.id,
          passed: false,
          error: g.description,
        })),
      });
    }
  }

  if (postGaps.length === 0) {
    console.log("✅ All gaps resolved");
    return {
      action: "done",
      success: true,
      reason: "All gaps resolved",
      gaps: postGaps,
    };
  }

  const before = snap.gaps.length;
  const resolved = before - postGaps.length;
  if (resolved >= 0) {
    console.log(`Verified: ${resolved}/${before} gap(s) resolved`);
  } else {
    console.log(
      `Verified: 0/${before} gap(s) resolved (${postGaps.length - before} new gap(s) found)`,
    );
  }

  return { action: "continue", gaps: postGaps };
};

/* ------------------------------------------------------------------ */
/*  check-stall                                                        */
/* ------------------------------------------------------------------ */

const checkStall: ActionHandler = async (snap) => {
  const { hasStalled } = await import("../../unit/helpers.ts");

  const before = snap.previousGaps.length;
  const after = snap.gaps.length;
  const actualResolved = before - after;

  if (
    actualResolved === 0 &&
    hasStalled([...snap.gaps], [...snap.previousGaps])
  ) {
    const newStallCount = snap.stallCount + 1;
    snap.taskContext?.logStall(snap.iteration, newStallCount);
    console.log(
      `\n⚠️  Stalled — no progress after fix attempt (${newStallCount}/3).`,
    );

    if (newStallCount >= 3) {
      console.log(`\n⚠️  Max stalls (3) reached. Giving up.`);
      return {
        action: "bail",
        success: false,
        reason: "Max stalls reached",
        stallCount: newStallCount,
      };
    }

    console.log(`   Retrying... (attempt ${newStallCount + 1})`);
    return {
      action: "continue",
      stallCount: newStallCount,
      previousGaps: [...snap.gaps],
    };
  }

  const newStallCount = actualResolved > 0 ? 0 : snap.stallCount;
  return {
    action: "continue",
    stallCount: newStallCount,
    previousGaps: [...snap.gaps],
  };
};

/* ------------------------------------------------------------------ */
/*  advance-attempt                                                    */
/* ------------------------------------------------------------------ */

const advanceAttempt: ActionHandler = async (snap) => {
  const { existsSync, readdirSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");

  const currentDir = process.env.CONVERGE_TASK_ATTEMPT_DIR;
  if (!currentDir || !existsSync(currentDir)) return { action: "continue" };

  const logsDir = join(currentDir, "logs");
  if (
    !existsSync(logsDir) ||
    !readdirSync(logsDir).some((f) => f.endsWith(".log"))
  ) {
    return { action: "continue" };
  }

  const attemptsDir = dirname(currentDir);
  const existingNums = readdirSync(attemptsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
    .map((d) => parseInt(d.name, 10));
  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
  const nextPadded = String(nextNum).padStart(2, "0");
  const nextDir = join(attemptsDir, nextPadded);

  const { mkdir } = await import("node:fs/promises");
  await mkdir(nextDir, { recursive: true });

  process.env.CONVERGE_TASK_ATTEMPT_DIR = nextDir;
  snap.taskContext?.logAttemptAdvanced(snap.iteration, nextPadded);
  console.log(`   📁 Next attempt → attempts/${nextPadded}/`);

  return { action: "continue" };
};

/* ------------------------------------------------------------------ */
/*  Registry builder                                                   */
/* ------------------------------------------------------------------ */

export function buildActionRegistry(): Map<string, ActionHandler> {
  const registry = new Map<string, ActionHandler>();

  registry.set("check-wbs-seeded", checkWbsSeeded);
  registry.set("check-outputs-exist", checkOutputsExist);
  registry.set("detect-gaps", detectGaps);
  registry.set("signal-done", signalDone);
  registry.set("resolve-plan", resolvePlan);
  registry.set("resolve-wbs", resolveWbs);
  registry.set("resolve-blockers", resolveBlockers);
  registry.set("bail-blockers", bailBlockers);
  registry.set("run-executor", runExecutor);
  registry.set("run-executor-fn", runExecutorFn);
  registry.set("run-loop-fn", runLoopFn);
  registry.set("run-children", runChildren);
  registry.set("run-skill", runSkill);
  registry.set("repair-loop", repairLoop);
  registry.set("run-strategy", runStrategyHandler);
  registry.set("strategy-wbs-generator-repair", strategyWbsGeneratorRepair);
  registry.set("strategy-wbs-script-repair", strategyWbsScriptRepair);
  registry.set("strategy-user-question-resume", strategyUserQuestionResume);
  registry.set("verify", verify);
  registry.set("check-stall", checkStall);
  registry.set("advance-attempt", advanceAttempt);

  return registry;
}
