/**
 * DependencyBackoffStrategy
 *
 * Detects when a task is missing INPUTS that upstream tasks should produce.
 * Instead of retrying the current task, tells the executor to run dependencies first.
 *
 * Enhanced with:
 * - Cross-epic producer search (not just same-epic tasks)
 * - DEPS.md generation for AI decision-making
 * - LEARN.md injection into producer's previous attempt dir
 * - AI-powered strategy selection (rerun-producer / spawn-new-task / fix-pattern)
 * - "Producer ran but output missing" → schedule re-run with LEARN.md
 *
 * Use cases:
 *   - Task B needs data/model.json but Task A hasn't run yet
 *   - Task requires multiple inputs from different upstream tasks
 *   - Task depends on failed upstream task that needs re-running
 *   - Producer ran but forgot to create one of its declared outputs
 */

import { join, relative } from "node:path";
import { existsSync } from "node:fs";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { z } from "zod";
import type { Gap } from "../../../task/gap/types.ts";
import type {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
} from "../types.ts";
import { logTaskEvent } from "../../../journal/writer.ts";
import { generateDepsMap } from "../../../journal/deps-map.ts";
import { PromptBuilder } from "../system-prompts.ts";
import { READONLY_TOOLS } from "../../../ai/context.ts";
import { getSourceTaskDirs } from "../../../task/playbook/paths.ts";
import { getEpicsDir } from "../../../journal/structure.ts";

/* ------------------------------------------------------------------ */
/*  Producer info (extended for cross-epic support)                    */
/* ------------------------------------------------------------------ */

export interface ProducerInfo {
  taskId: string;
  epicId: string;
  journalTaskId: string;
  filePath: string;
  outputs: string[];
}

/* ------------------------------------------------------------------ */
/*  Module-level producer discovery (shared with task-runner)          */
/* ------------------------------------------------------------------ */

/**
 * Find producer tasks across all epics that declare any of the given paths
 * as outputs. Returns one entry per producer (de-duplication is the caller's
 * responsibility).
 *
 * Exported so task-runner can do an upstream-failed pre-flight check
 * without duplicating the SKILL.md / TASK.md scanning logic.
 */
export async function findProducersForInputs(
  inputPaths: string[],
  projectDir: string,
): Promise<ProducerInfo[]> {
  // Delegate to a fresh strategy instance — keeps the (private) glob and
  // path-extraction logic in one place.
  const strategy = new DependencyBackoffStrategy();
  // @ts-expect-error: deliberate access to private; this module owns it.
  return await strategy.findProducerTasksCrossEpic(inputPaths, projectDir);
}

/**
 * True if a producer task has a checkpoint and its terminal status is
 * "failed". Mirrors DependencyBackoffStrategy.producerCheckpointFailed
 * but is exported so task-runner can call it during pre-execution
 * upstream-failure detection.
 */
export async function producerCheckpointStatusIsFailed(
  producer: ProducerInfo,
  projectDir: string,
): Promise<boolean> {
  const segments = producer.journalTaskId.split("/");
  const pathParts: string[] = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
    pathParts.push("tasks", segments[i]);
  }
  const journalEpicsDir = getEpicsDir(projectDir);
  const checkpointPath = join(
    journalEpicsDir,
    producer.epicId,
    ...pathParts,
    "checkpoint.json",
  );
  if (!existsSync(checkpointPath)) return false;
  try {
    const raw = await readFile(checkpointPath, "utf-8");
    const cp = JSON.parse(raw) as { status?: string };
    return cp.status === "failed";
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  DependencyBackoffStrategy                                          */
/* ------------------------------------------------------------------ */

export class DependencyBackoffStrategy implements FixStrategy {
  readonly name = "dependency-backoff";
  readonly description =
    "Detects missing inputs and defers to run upstream dependencies first";
  readonly priority = 9; // Higher than most (run early)

  canHandle(gap: Gap): boolean {
    // Handle input/blocker gaps - missing files that should be produced by other tasks
    return (
      gap.metadata?.gapKind === "input" ||
      gap.metadata?.gapKind === "blocker" ||
      gap.type === "missing-intermediate"
    );
  }

  async tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    console.log(`   🔍 Checking for pending dependencies...`);

    try {
      // Extract missing input paths from gap
      const missingInputs = this.extractMissingInputs(gap);
      if (missingInputs.length === 0) {
        return {
          success: false,
          reason: "No missing inputs detected in gap metadata",
        };
      }

      console.log(`   📋 Missing inputs: ${missingInputs.join(", ")}`);

      // ── Generate DEPS.md for AI context ─────────────────────────────
      let depsMapRelPath: string | null = null;
      try {
        const depsMapPath = await generateDepsMap(
          projectDir,
          journalCtx.epicId,
        );
        depsMapRelPath = relative(projectDir, depsMapPath).replace(/\\/g, "/");
        console.log(`   📄 Generated DEPS.md for repair analysis`);
      } catch (err: any) {
        console.warn(`   ⚠️  Could not generate DEPS.md: ${err.message}`);
      }

      // ── Ask AI for strategy decision ─────────────────────────────────
      const AiDecisionSchema = z.object({
        strategy: z.enum([
          "rerun-producer",
          "spawn-new-task",
          "fix-pattern",
          "remove-input",
        ]),
        producerTaskId: z.string().nullable(),
        producerEpicId: z.string().nullable(),
        producerJournalTaskId: z.string().nullable(),
        reason: z.string(),
        learnHints: z.array(z.string()),
        suggestedPatterns: z.record(z.string(), z.string()).optional(),
      });
      type AiDecision = z.infer<typeof AiDecisionSchema>;

      let aiDecision: AiDecision | null = null;

      if (ctx.ai && depsMapRelPath) {
        try {
          const aiCtx = ctx.ai();
          const prompt = PromptBuilder.buildDepsRepairPrompt(
            depsMapRelPath,
            missingInputs,
            journalCtx.taskId,
          );
          aiDecision = await aiCtx.askJson(prompt, AiDecisionSchema, {
            allowedTools: [...READONLY_TOOLS],
          });
          console.log(
            `   🤖 AI decision: ${aiDecision.strategy} — ${aiDecision.reason}`,
          );
        } catch (err: any) {
          console.warn(
            `   ⚠️  AI strategy decision failed: ${err.message} — using heuristics`,
          );
        }
      }

      // If AI says to spawn a new task, persist learnHints so subsequent
      // attempts have context about what was discovered
      if (aiDecision?.strategy === "spawn-new-task") {
        if (aiDecision.learnHints.length > 0) {
          await this.writeLearnMdForBlockedTask(
            projectDir,
            journalCtx.epicId,
            journalCtx.taskId,
            aiDecision.learnHints,
            aiDecision.reason,
          );
        }
        return {
          success: false,
          reason: `AI recommends spawning a new task (no producer exists): ${aiDecision.reason}`,
          shouldRetry: false,
          metadata: {
            learnHintsPersisted: aiDecision.learnHints.length > 0,
            aiReason: aiDecision.reason,
          },
        };
      }
      if (
        aiDecision?.strategy === "fix-pattern" ||
        aiDecision?.strategy === "remove-input"
      ) {
        const patterns = aiDecision.suggestedPatterns;
        if (patterns && Object.keys(patterns).length > 0) {
          // Prefer the absolute TASK.md path that task-runner stashed in
          // gap metadata — this avoids all the epicId/taskId reconstruction
          // logic that has been a recurring source of bugs (doubled
          // playbook names, stray "tasks/" segments, flat-vs-Seed layout).
          const sourceTaskFile =
            typeof gap.metadata?.sourceTaskFile === "string"
              ? (gap.metadata.sourceTaskFile as string)
              : undefined;

          const taskMdPath =
            sourceTaskFile && existsSync(sourceTaskFile)
              ? sourceTaskFile
              : this.resolveTaskMdPathForBlockedTask(
                  projectDir,
                  journalCtx.epicId,
                  journalCtx.taskId,
                );

          if (taskMdPath && existsSync(taskMdPath)) {
            let content = await readFile(taskMdPath, "utf-8");
            let replacements = 0;

            if (aiDecision.strategy === "remove-input") {
              // Remove stale inputs from YAML frontmatter
              for (const [staleInput] of Object.entries(patterns)) {
                // Remove the YAML list entry line (e.g. "  - path/to/file\n")
                const escapedInput = staleInput.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  "\\$&",
                );
                const inputLineRegex = new RegExp(
                  `^\\s*-\\s*${escapedInput}\\s*$\\n?`,
                  "gm",
                );
                const before = content;
                content = content.replace(inputLineRegex, "");
                if (content !== before) {
                  replacements++;
                  console.log(`   🗑️  Removed stale input: "${staleInput}"`);
                }
              }
            } else {
              for (const [original, corrected] of Object.entries(patterns)) {
                if (content.includes(original)) {
                  content = content.replaceAll(original, corrected);
                  replacements++;
                  console.log(
                    `   ✏️  Pattern fix: "${original}" → "${corrected}"`,
                  );
                }
              }
            }

            if (replacements > 0) {
              await writeFile(taskMdPath, content, "utf-8");
              const action =
                aiDecision.strategy === "remove-input" ? "Removed" : "Fixed";
              console.log(
                `   ✅ Updated TASK.md: ${action} ${replacements} input(s)`,
              );
              return {
                success: true,
                reason: `${action} ${replacements} input(s) in TASK.md: ${aiDecision.reason}`,
                retryMode: "full" as const,
              };
            }
          }
        }

        // Guard: no patterns provided or no replacements matched
        const actionDesc =
          aiDecision.strategy === "remove-input"
            ? "removing stale input"
            : "fixing glob pattern";
        return {
          success: false,
          reason: `AI recommends ${actionDesc} but no actionable replacements found: ${aiDecision.reason}`,
          shouldRetry: false,
        };
      }

      // ── Find producer tasks ──────────────────────────────────────────
      // Use AI hint first, fall back to heuristic search
      let producers: ProducerInfo[] = [];

      if (aiDecision?.producerTaskId && aiDecision?.producerEpicId) {
        // AI provided specific producer — locate its SKILL.md
        const producer = await this.locateProducerByIds(
          aiDecision.producerEpicId,
          aiDecision.producerJournalTaskId ?? aiDecision.producerTaskId,
          projectDir,
        );
        if (producer) producers = [producer];
      }

      if (producers.length === 0) {
        // Fall back to heuristic: scan all epics for producers
        producers = await this.findProducerTasksCrossEpic(
          missingInputs,
          projectDir,
        );
      }

      if (producers.length === 0) {
        return {
          success: false,
          reason: `No producer tasks found for: ${missingInputs.join(", ")}`,
          shouldRetry: false,
        };
      }

      // ── Check which producers have already run ───────────────────────
      const pendingProducers = await this.filterPendingProducers(
        producers,
        projectDir,
      );
      const learnHints = aiDecision?.learnHints ?? [];

      if (pendingProducers.length === 0) {
        // All producers have run — but outputs are still missing
        // Schedule re-run with LEARN.md to guide them
        console.log(
          `   ↩  All producers ran but outputs missing — injecting LEARN.md for re-run`,
        );

        for (const producer of producers) {
          await this.writeProducerLearnMd(
            producer,
            missingInputs,
            journalCtx.taskId,
            projectDir,
            learnHints,
          );
        }

        const reason = `Producers ran but outputs missing — re-running with LEARN.md: ${producers.map((p) => p.taskId).join(", ")}`;

        await logTaskEvent(
          projectDir,
          journalCtx.epicId,
          journalCtx.taskId,
          "DEPENDENCY_MISSING",
          reason,
          {
            strategyName: this.name,
            missingInputs,
            producers: producers.map((p) => ({
              taskId: p.taskId,
              epicId: p.epicId,
            })),
          },
        );

        return {
          success: true,
          reason,
          retryMode: {
            type: "backoff",
            runFirst: producers.map((p) => p.taskId),
            reason,
          },
          metadata: {
            producers: producers.map((p) => ({
              taskId: p.taskId,
              epicId: p.epicId,
              journalTaskId: p.journalTaskId,
              filePath: p.filePath,
            })),
          },
        };
      }

      // Some producers are still pending — run them first
      console.log(
        `   ⏸️  Found ${pendingProducers.length} pending dependencies:`,
      );
      pendingProducers.forEach((p) =>
        console.log(`      → ${p.epicId}/${p.journalTaskId}`),
      );

      const reason = `Dependencies must run first: ${pendingProducers.map((p) => p.taskId).join(", ")}`;

      await logTaskEvent(
        projectDir,
        journalCtx.epicId,
        journalCtx.taskId,
        "DEPENDENCY_MISSING",
        reason,
        {
          strategyName: this.name,
          missingInputs,
          pendingProducers: pendingProducers.map((p) => p.taskId),
        },
      );

      return {
        success: true,
        reason,
        retryMode: {
          type: "backoff",
          runFirst: pendingProducers.map((p) => p.taskId),
          reason: `Task ${journalCtx.taskId} requires outputs from: ${pendingProducers.map((p) => p.taskId).join(", ")}`,
        },
        metadata: {
          producers: pendingProducers.map((p) => ({
            taskId: p.taskId,
            epicId: p.epicId,
            journalTaskId: p.journalTaskId,
            filePath: p.filePath,
          })),
        },
      };
    } catch (err: any) {
      console.error(`   ❌ Strategy failed:`, err.message);
      return {
        success: false,
        reason: `Dependency backoff failed: ${err.message}`,
        shouldRetry: false,
      };
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Input Detection                                                    */
  /* ------------------------------------------------------------------ */

  private extractMissingInputs(gap: Gap): string[] {
    const inputs: string[] = [];

    if (
      gap.metadata?.missingInputs &&
      Array.isArray(gap.metadata.missingInputs)
    ) {
      inputs.push(...(gap.metadata.missingInputs as string[]));
    }

    if (
      gap.metadata?.missingPath &&
      typeof gap.metadata.missingPath === "string"
    ) {
      inputs.push(gap.metadata.missingPath as string);
    }

    if (
      gap.metadata?.expectedInput &&
      typeof gap.metadata.expectedInput === "string"
    ) {
      inputs.push(gap.metadata.expectedInput as string);
    }

    // From gap description (parse "Missing input: path/to/file")
    const descMatch = gap.description.match(
      /Missing (?:input|file|output):\s*(.+)/i,
    );
    if (descMatch) {
      inputs.push(descMatch[1].trim());
    }

    if (gap.type === "missing-intermediate" && gap.metadata?.missingOutputs) {
      inputs.push(...(gap.metadata.missingOutputs as string[]));
    }

    return [...new Set(inputs)]; // Deduplicate
  }

  /* ------------------------------------------------------------------ */
  /*  Cross-Epic Producer Discovery                                     */
  /* ------------------------------------------------------------------ */

  private async findProducerTasksCrossEpic(
    missingPaths: string[],
    projectDir: string,
  ): Promise<ProducerInfo[]> {
    const producers: ProducerInfo[] = [];
    const { glob } = await import("glob");

    const sourceDirs = getSourceTaskDirs(projectDir);
    if (sourceDirs.length === 0) return producers;

    const { readdirSync, statSync } = await import("node:fs");

    for (const sourceDir of sourceDirs) {
      const epicDirs = readdirSync(sourceDir).filter((e) => {
        try {
          return statSync(join(sourceDir, e)).isDirectory();
        } catch {
          return false;
        }
      });

      for (const epicId of epicDirs) {
        const epicPath = join(sourceDir, epicId);
        // Find all SKILL.md and TASK.md files (including nested Seed tasks)
        const taskFiles = await glob("**/{SKILL,TASK}.md", {
          cwd: epicPath,
          absolute: true,
        });

        for (const taskFilePath of taskFiles) {
          const taskOutputs = await this.getTaskOutputs(taskFilePath);
          const taskId = this.extractTaskId(taskFilePath, epicPath);
          const journalTaskId = this.extractJournalTaskId(
            taskFilePath,
            epicPath,
          );

          const matches = missingPaths.filter((missing) =>
            taskOutputs.some((output) => this.pathMatches(output, missing)),
          );

          if (matches.length > 0) {
            producers.push({
              taskId,
              epicId,
              journalTaskId,
              filePath: taskFilePath,
              outputs: taskOutputs,
            });
          }
        }
      }
    }

    return producers;
  }

  private async locateProducerByIds(
    epicId: string,
    journalTaskId: string,
    projectDir: string,
  ): Promise<ProducerInfo | null> {
    const { glob } = await import("glob");
    const sourceDirs = getSourceTaskDirs(projectDir);

    const parts = journalTaskId.split("/");

    for (const sourceDir of sourceDirs) {
      const epicPath = join(sourceDir, epicId);
      if (!existsSync(epicPath)) continue;

      // Try to find the SKILL.md or TASK.md for this epic/journalTaskId
      let taskFilePath: string | null = null;

      if (parts.length === 1) {
        // Simple task — try both SKILL.md and TASK.md
        for (const filename of ["SKILL.md", "TASK.md"]) {
          const candidate = join(epicPath, parts[0], filename);
          if (existsSync(candidate)) {
            taskFilePath = candidate;
            break;
          }
        }
      } else {
        // Seed subtask: parent/tasks/child/{SKILL,TASK}.md
        const subtaskDir = join(
          epicPath,
          parts[0],
          "tasks",
          parts.slice(1).join("/tasks/"),
        );
        for (const filename of ["SKILL.md", "TASK.md"]) {
          const candidate = join(subtaskDir, filename);
          if (existsSync(candidate)) {
            taskFilePath = candidate;
            break;
          }
        }
      }

      if (!taskFilePath) {
        // Try a glob search as fallback
        const matches = await glob(
          `**/${parts[parts.length - 1]}/{SKILL,TASK}.md`,
          { cwd: epicPath, absolute: true },
        );
        if (matches.length > 0) taskFilePath = matches[0];
      }

      if (taskFilePath) {
        const outputs = await this.getTaskOutputs(taskFilePath);
        const computedJournalTaskId = this.extractJournalTaskId(
          taskFilePath,
          epicPath,
        );
        return {
          taskId: parts[parts.length - 1],
          epicId,
          journalTaskId: computedJournalTaskId,
          filePath: taskFilePath,
          outputs,
        };
      }
    }

    return null;
  }

  /**
   * Resolve the path to a task's TASK.md source definition file.
   * Searches both .converge/epics/ and .converge/playbooks/{name}/tasks/.
   */
  private resolveTaskMdPath(
    projectDir: string,
    epicId: string,
    pathParts: string[],
  ): string | null {
    const sourceDirs = getSourceTaskDirs(projectDir);
    for (const sourceDir of sourceDirs) {
      const candidate = join(sourceDir, epicId, ...pathParts, "TASK.md");
      if (existsSync(candidate)) return candidate;
      // Also try SKILL.md for legacy tasks
      const skillCandidate = join(sourceDir, epicId, ...pathParts, "SKILL.md");
      if (existsSync(skillCandidate)) return skillCandidate;
    }
    return null;
  }

  /**
   * Locate the blocked task's TASK.md by trying every known on-disk layout.
   * Source dirs may already include the epic/playbook name (playbook API) or
   * not (legacy epics), and task trees may be flat or use the Seed
   * `parent/tasks/child/` convention — so we probe every candidate instead
   * of assuming one convention.
   */
  private resolveTaskMdPathForBlockedTask(
    projectDir: string,
    epicId: string,
    taskId: string,
  ): string | null {
    const sourceDirs = getSourceTaskDirs(projectDir);

    // Strip optional leading "<epicId>/" — journal task ids sometimes carry it.
    const rawTaskId = taskId.startsWith(epicId + "/")
      ? taskId.slice(epicId.length + 1)
      : taskId;
    const segments = rawTaskId.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    // Two layout conventions to try per segment chain:
    //   flat:  parent/child/grandchild
    //   Seed:   parent/tasks/child/tasks/grandchild
    const flat = [...segments];
    const seedData = [segments[0]];
    for (let i = 1; i < segments.length; i++)
      seedData.push("tasks", segments[i]);

    // Two source-dir shapes: .converge/epics/ (needs epicId) vs
    // .converge/playbooks/<name>/tasks/ (epicId already baked in).
    const epicPrefixes: string[][] = [[], [epicId]];
    const filenames = ["TASK.md", "SKILL.md"];
    const layouts = [flat, seedData];

    for (const sourceDir of sourceDirs) {
      const sourceDirNorm = sourceDir.replace(/\\/g, "/");
      // If the source dir already ends with "/<epicId>/tasks", skip the
      // prefix-with-epicId variant to avoid doubling.
      const endsWithEpic = sourceDirNorm.endsWith(`/${epicId}/tasks`);
      const prefixesToTry = endsWithEpic ? [[]] : epicPrefixes;

      for (const prefix of prefixesToTry) {
        for (const layout of layouts) {
          for (const filename of filenames) {
            const candidate = join(sourceDir, ...prefix, ...layout, filename);
            if (existsSync(candidate)) return candidate;
          }
        }
      }
    }
    return null;
  }

  private extractTaskId(taskFilePath: string, epicPath: string): string {
    const rel = relative(epicPath, taskFilePath).replace(/\\/g, "/");
    const parts = rel
      .split("/")
      .filter(
        (p: string) => p !== "SKILL.md" && p !== "TASK.md" && p !== "tasks",
      );
    return parts[parts.length - 1];
  }

  private extractJournalTaskId(taskFilePath: string, epicPath: string): string {
    const rel = relative(epicPath, taskFilePath).replace(/\\/g, "/");
    const parts = rel
      .split("/")
      .filter(
        (p: string) => p !== "SKILL.md" && p !== "TASK.md" && p !== "tasks",
      );
    return parts.join("/");
  }

  private async getTaskOutputs(taskFilePath: string): Promise<string[]> {
    try {
      const { readFile } = await import("node:fs/promises");
      const content = await readFile(taskFilePath, "utf-8");
      const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (!match) return [];
      const yaml = await import("yaml");
      const frontmatter = yaml.parse(match[1]) as Record<string, unknown>;
      return Array.isArray(frontmatter.outputs)
        ? (frontmatter.outputs as string[])
        : [];
    } catch {
      return [];
    }
  }

  private pathMatches(pattern: string, actualPath: string): boolean {
    if (pattern === actualPath) return true;
    if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" +
          pattern
            .replace(/\./g, "\\.")
            .replace(/\*\*/g, ".*")
            .replace(/\*/g, "[^/]*") +
          "$",
      );
      return regex.test(actualPath);
    }
    return false;
  }

  /* ------------------------------------------------------------------ */
  /*  Execution Status Check                                             */
  /* ------------------------------------------------------------------ */

  private async filterPendingProducers(
    producers: ProducerInfo[],
    projectDir: string,
  ): Promise<ProducerInfo[]> {
    const pending: ProducerInfo[] = [];

    for (const producer of producers) {
      const hasRun = await this.hasProducerRun(producer, projectDir);

      if (!hasRun) {
        pending.push(producer);
        continue;
      }

      // Producer ran. Three reasons to re-run it:
      //   (a) its checkpoint says `failed` — agent gave up; outputs (if any)
      //       can't be trusted as a foundation for downstream work
      //   (b) declared outputs don't exist on disk
      //   (c) neither — it ran cleanly, skip
      const isFailed = await this.producerCheckpointFailed(
        producer,
        projectDir,
      );
      if (isFailed) {
        pending.push(producer);
        continue;
      }
      const hasOutputs = await this.verifyOutputsExist(
        producer.outputs,
        projectDir,
      );
      if (!hasOutputs) {
        pending.push(producer);
      }
    }

    return pending;
  }

  /**
   * True if the producer has a checkpoint and its status is "failed".
   * Used by filterPendingProducers to schedule re-run of a producer whose
   * agent gave up — even if some outputs happen to exist on disk.
   */
  private async producerCheckpointFailed(
    producer: ProducerInfo,
    projectDir: string,
  ): Promise<boolean> {
    const segments = producer.journalTaskId.split("/");
    const pathParts: string[] = [segments[0]];
    for (let i = 1; i < segments.length; i++) {
      pathParts.push("tasks", segments[i]);
    }
    const journalEpicsDir = getEpicsDir(projectDir);
    const checkpointPath = join(
      journalEpicsDir,
      producer.epicId,
      ...pathParts,
      "checkpoint.json",
    );
    if (!existsSync(checkpointPath)) return false;
    try {
      const raw = await readFile(checkpointPath, "utf-8");
      const cp = JSON.parse(raw) as { status?: string };
      return cp.status === "failed";
    } catch {
      return false;
    }
  }

  private async hasProducerRun(
    producer: ProducerInfo,
    projectDir: string,
  ): Promise<boolean> {
    // Check if task has any attempt records in journal
    const segments = producer.journalTaskId.split("/");
    const pathParts: string[] = [segments[0]];
    for (let i = 1; i < segments.length; i++) {
      pathParts.push("tasks", segments[i]);
    }
    const journalEpicsDir = getEpicsDir(projectDir);
    const basePath = join(journalEpicsDir, producer.epicId, ...pathParts);
    // Has a checkpoint → ran at least once
    if (existsSync(join(basePath, "checkpoint.json"))) return true;
    // Has attempts.jsonl → ran at least once
    return existsSync(join(basePath, "attempts.jsonl"));
  }

  private async verifyOutputsExist(
    outputs: string[],
    projectDir: string,
  ): Promise<boolean> {
    for (const output of outputs) {
      if (output.includes("*")) continue; // Skip glob patterns for now
      if (!existsSync(join(projectDir, output))) return false;
    }
    return true;
  }

  /* ------------------------------------------------------------------ */
  /*  LEARN.md Injection into Producer                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Write LEARN.md to the producer's most recent archived attempt directory.
   * When the producer runs next (attempt N+1), writeContextSnapshot() will
   * find LEARN.md in attempts/{N}/ and carry it forward to the new wip/.
   */
  private async writeProducerLearnMd(
    producer: ProducerInfo,
    missingOutputs: string[],
    dependentTaskId: string,
    projectDir: string,
    learnHints: string[],
  ): Promise<void> {
    // Build the producer's journal attempts directory
    const segments = producer.journalTaskId.split("/");
    const pathParts: string[] = [segments[0]];
    for (let i = 1; i < segments.length; i++) {
      pathParts.push("tasks", segments[i]);
    }
    const journalEpicsDir = getEpicsDir(projectDir);
    const attemptsBaseDir = join(
      journalEpicsDir,
      producer.epicId,
      ...pathParts,
      "attempts",
    );

    // Find the most recent numbered attempt (e.g., 01, 02, ...)
    // We write LEARN.md there so writeContextSnapshot picks it up for the next attempt
    let targetDir: string;

    if (existsSync(attemptsBaseDir)) {
      const { readdirSync, statSync } =
        (await import("node:fs")) as typeof import("node:fs");
      const entries = readdirSync(attemptsBaseDir)
        .filter((e) => /^\d+$/.test(e))
        .sort()
        .reverse();

      if (entries.length > 0) {
        // Write to the most recent archived attempt
        targetDir = join(attemptsBaseDir, entries[0]);
      } else {
        // No archived attempts — write to wip/ (will be archived on next run)
        targetDir = join(attemptsBaseDir, "wip");
      }
    } else {
      // No attempts directory yet — create wip/
      targetDir = join(attemptsBaseDir, "wip");
    }

    await mkdir(targetDir, { recursive: true });

    const learnContent = PromptBuilder.buildDependencyBackoffLearnPrompt(
      missingOutputs,
      dependentTaskId,
      learnHints,
    );

    await writeFile(join(targetDir, "LEARN.md"), learnContent, "utf-8");
    console.log(
      `   📝 LEARN.md written → ${join(targetDir, "LEARN.md").replace(projectDir, "")}`,
    );
  }

  /**
   * Write LEARN.md to the blocked task's own attempt directory.
   * Called when AI returns spawn-new-task — persists the AI's analysis
   * so subsequent attempts have context instead of repeating identical work.
   */
  private async writeLearnMdForBlockedTask(
    projectDir: string,
    epicId: string,
    taskId: string,
    learnHints: string[],
    aiReason: string,
  ): Promise<void> {
    const segments = taskId.split("/").filter(Boolean);
    const pathParts: string[] = [segments[0]];
    for (let i = 1; i < segments.length; i++) {
      pathParts.push("tasks", segments[i]);
    }
    const journalEpicsDir = getEpicsDir(projectDir);
    const attemptsBaseDir = join(
      journalEpicsDir,
      epicId,
      ...pathParts,
      "attempts",
    );

    let targetDir: string;
    if (existsSync(attemptsBaseDir)) {
      const { readdirSync } =
        (await import("node:fs")) as typeof import("node:fs");
      const entries = readdirSync(attemptsBaseDir)
        .filter((e) => /^\d+$/.test(e))
        .sort()
        .reverse();
      targetDir =
        entries.length > 0
          ? join(attemptsBaseDir, entries[0])
          : join(attemptsBaseDir, "wip");
    } else {
      targetDir = join(attemptsBaseDir, "wip");
    }

    await mkdir(targetDir, { recursive: true });

    const content = [
      `# LEARN.md — No Producer Found`,
      ``,
      `## AI Analysis`,
      ``,
      aiReason,
      ``,
      `## Hints for Next Attempt`,
      ``,
      ...learnHints.map((h) => `- ${h}`),
      ``,
      `## Recommended Action`,
      ``,
      `The missing inputs have no upstream producer task. Consider:`,
      `- Removing the missing inputs from this task's declaration`,
      `- Creating a new upstream task to produce the missing files`,
      `- Using an alternative input that already exists`,
    ].join("\n");

    await writeFile(join(targetDir, "LEARN.md"), content, "utf-8");
    console.log(
      `   📝 LEARN.md persisted for blocked task → ${join(targetDir, "LEARN.md").replace(projectDir, "")}`,
    );
  }
}
