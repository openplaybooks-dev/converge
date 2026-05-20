/**
 * Strategy Helper Functions
 *
 * Utilities for building and executing repair strategies.
 */

import type { Snapshot, WalkResult } from "../../types.ts";
import type { StrategyContext, StrategyOutcome } from "../../../repair/types.ts";
import type { Gap } from "../../../../task/gap/types.ts";
import { groupGaps, pickRepresentative } from "./gap-helpers.ts";
import { getTaskAttemptDir } from "../../../../journal/structure.ts";

// Re-export gap helpers for convenience
export { groupGaps, pickRepresentative };

/**
 * Build strategy context from snapshot
 */
export function buildStrategyContext(snap: Snapshot): StrategyContext {
  return {
    projectDir: snap.projectDir,
    journalCtx: { epicId: snap.epicId, taskId: snap.unit.id },
    timeline: null as any,
    attempt: snap.iteration,
  };
}

/**
 * Run a strategy against gaps in the snapshot
 */
export async function runStrategy(
  strategyName: string,
  createStrategy: () => import("../../../repair/types.ts").FixStrategy,
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

/**
 * Build TypeScript strategies (same set as buildDefaultPipeline)
 */
export async function buildTsStrategies(): Promise<
  import("../../../repair/types.ts").FixStrategy[]
> {
  const { TaskRunStrategy } = await import("../../../repair/strategies/task-run.ts");
  const { DependencyBackoffStrategy } =
    await import("../../../repair/strategies/dependency-backoff.ts");
  const { MissingInputPatternRepairStrategy } =
    await import("../../../repair/strategies/missing-input-pattern.ts");
  const { UserQuestionResumeStrategy } =
    await import("../../../repair/strategies/user-question-resume.ts");
  const { ToolEnvironmentRepairStrategy } =
    await import("../../../repair/strategies/tool-environment-repair.ts");
  return [
    new UserQuestionResumeStrategy(),
    new DependencyBackoffStrategy(),
    new MissingInputPatternRepairStrategy(),
    new ToolEnvironmentRepairStrategy(),
    new TaskRunStrategy(),
  ];
}

/**
 * Execute a skill-based strategy (absorbed from pipeline.runSkillStrategy)
 */
export async function executeSkillStrategy(
  descriptor: import("../../../repair/strategy-catalog.ts").StrategyDescriptor,
  gap: Gap,
  gathered: { sections: Record<string, string>; asPromptSection: () => string },
  snap: Snapshot,
): Promise<void> {
  if (!descriptor.skillPath) return;

  const { toCompactGap } = await import("../../../../task/gap/types.ts");
  const { HistoryIndexBuilder } = await import("../../../repair/history-index.ts");
  const { runAgent } = await import("../../../repair/agent-runner.ts");
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
