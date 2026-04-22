/**
 * IncompleteProducerOutputStrategy
 *
 * Handles the case where a producer task ran successfully but missed producing
 * a file that a downstream task needs — because the producer's SKILL.md didn't
 * declare it as an output.
 *
 * Detection:
 *   For each missing input file (e.g., `.stitch/designs/lesson-quiz/design.png`),
 *   scan all SKILL.md files for tasks that produce OTHER files in the same directory
 *   (e.g., `.stitch/designs/lesson-quiz/design.html`). If such a task is found and
 *   it has already run (has a checkpoint), it is the "incomplete producer".
 *
 * Fix:
 *   1. Add the missing file to the producer's SKILL.md `outputs` array
 *   2. Add a shell check for the missing file to `checks`
 *   3. Update the task body to mention the missing output
 *   4. Inject LEARN.md into the producer's last attempt dir so the next run
 *      knows what was missed
 *   5. Return retryMode.backoff pointing at the producer so the caller re-runs it
 *
 * Runs AFTER DependencyBackoffStrategy (which handles declared producers).
 * Priority: 8 — lower than dependency-backoff (9), since this is a deeper fix.
 *
 * Example scenario:
 *   - Task 004-002 declared output: design.html (only)
 *   - Downstream 002-002 needs: design.html + design.png
 *   - DependencyBackoffStrategy: "no producer for design.png" → fails
 *   - This strategy: "004-002 produces design.html in same dir → add design.png → re-run"
 */

import { join, dirname, basename, relative } from "node:path";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { getEpicsDir } from "../../../journal/structure.ts";
import { getSourceTaskDirs } from "../../../task/playbook/paths.ts";
import type { Gap } from "../../../task/gap/types.ts";
import type {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
} from "../types.ts";
import type { ProducerInfo } from "./dependency-backoff.ts";
import { logTaskEvent } from "../../../journal/writer.ts";

/* ------------------------------------------------------------------ */
/*  IncompleteProducerOutputStrategy                                   */
/* ------------------------------------------------------------------ */

export class IncompleteProducerOutputStrategy implements FixStrategy {
  readonly name = "incomplete-producer-output";
  readonly priority = 8;

  canHandle(gap: Gap): boolean {
    return (
      gap.metadata?.gapKind === "blocker" ||
      gap.metadata?.gapKind === "input" ||
      gap.type === "missing-intermediate"
    );
  }

  async tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    const missingInputs = this.extractMissingInputs(gap);
    if (missingInputs.length === 0) {
      return { success: false, reason: "No missing inputs in gap metadata" };
    }

    console.log(
      `   🔍 Searching for incomplete producers for: ${missingInputs.join(", ")}`,
    );

    const fixes: Array<{ producer: ProducerInfo; missingFile: string }> = [];

    for (const missingFile of missingInputs) {
      // Skip if the file already exists
      if (existsSync(join(projectDir, missingFile))) continue;

      const producer = await this.findSiblingProducer(missingFile, projectDir);
      if (!producer) continue;

      console.log(
        `   💡 Found incomplete producer: ${producer.epicId}/${producer.journalTaskId}`,
      );
      console.log(
        `      Produces sibling files in ${dirname(missingFile)} but not ${basename(missingFile)}`,
      );

      fixes.push({ producer, missingFile });
    }

    if (fixes.length === 0) {
      return {
        success: false,
        reason:
          "No sibling-producing tasks found that could be the incomplete producer",
      };
    }

    // Apply fixes: patch each producer's SKILL.md and inject LEARN.md
    const patchedProducers: ProducerInfo[] = [];

    for (const { producer, missingFile } of fixes) {
      try {
        await this.patchSkillMd(producer.filePath, missingFile);
        console.log(`   ✏️  Patched SKILL.md: added ${missingFile} to outputs`);

        await this.writeLearnMd(
          producer,
          missingFile,
          journalCtx.taskId,
          projectDir,
        );
        console.log(`   📝 Injected LEARN.md into producer's last attempt`);

        patchedProducers.push(producer);
      } catch (err: any) {
        console.warn(
          `   ⚠️  Could not patch ${producer.taskId}: ${err.message}`,
        );
      }
    }

    if (patchedProducers.length === 0) {
      return {
        success: false,
        reason: "SKILL.md patching failed for all candidates",
      };
    }

    const missingFiles = fixes.map((f) => f.missingFile);
    const reason = `Patched ${patchedProducers.length} producer(s) to declare missing outputs: ${missingFiles.join(", ")}`;

    await logTaskEvent(
      projectDir,
      journalCtx.epicId,
      journalCtx.taskId,
      "INCOMPLETE_PRODUCER_FIXED",
      reason,
      {
        strategyName: this.name,
        missingFiles,
        patchedProducers: patchedProducers.map((p) => ({
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
        runFirst: patchedProducers.map((p) => p.taskId),
        reason: `Re-running patched producer(s): ${patchedProducers.map((p) => p.taskId).join(", ")}`,
      },
      metadata: {
        producers: patchedProducers.map((p) => ({
          taskId: p.taskId,
          epicId: p.epicId,
          journalTaskId: p.journalTaskId,
          filePath: p.filePath,
        })),
        fix: "skill-md-patched",
        missingFiles,
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Sibling Producer Detection                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Find a task that produces files in the same directory as `missingFile`
   * but doesn't declare `missingFile` itself, AND has already run.
   *
   * Example: missing `.stitch/designs/lesson-quiz/design.png`
   *   → finds task that produces `.stitch/designs/lesson-quiz/design.html`
   */
  private async findSiblingProducer(
    missingFile: string,
    projectDir: string,
  ): Promise<ProducerInfo | null> {
    const missingDir = dirname(missingFile);
    const { glob } = await import("glob");
    const { readdirSync, statSync } =
      (await import("node:fs")) as typeof import("node:fs");

    const sourceDirs = getSourceTaskDirs(projectDir);
    if (sourceDirs.length === 0) return null;

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
        const taskFiles = await glob("**/{SKILL,TASK}.md", {
          cwd: epicPath,
          absolute: true,
        });

        for (const skillPath of taskFiles) {
          const outputs = await this.getOutputs(skillPath);

          // Check if this task produces files in the same directory as the missing file
          // but does NOT already declare the missing file
          const producesSiblingFile = outputs.some((out) => {
            const outDir = dirname(out);
            return outDir === missingDir && out !== missingFile;
          });
          const alreadyDeclared = outputs.includes(missingFile);

          if (!producesSiblingFile || alreadyDeclared) continue;

          // Task must have already run (has a journal entry)
          const taskId = this.extractTaskId(skillPath, epicPath);
          const journalTaskId = this.extractJournalTaskId(
            skillPath,
            epicPath,
          );

          const hasRun = await this.hasTaskRun(
            epicId,
            journalTaskId,
            projectDir,
          );
          if (!hasRun) continue;

          return {
            taskId,
            epicId,
            journalTaskId,
            filePath: skillPath,
            outputs,
          };
        }
      }
    }

    return null;
  }

  private async hasTaskRun(
    epicId: string,
    journalTaskId: string,
    projectDir: string,
  ): Promise<boolean> {
    // When journalTaskId starts with epicId, the epic IS the task — no double-nesting.
    const segments = journalTaskId.split("/");
    let basePath: string;
    if (segments[0] === epicId) {
      if (segments.length === 1) {
        basePath = join(getEpicsDir(projectDir), epicId);
      } else {
        const childParts: string[] = ["tasks", segments[1]];
        for (let i = 2; i < segments.length; i++)
          childParts.push("tasks", segments[i]);
        basePath = join(getEpicsDir(projectDir), epicId, ...childParts);
      }
    } else {
      const pathParts: string[] = [segments[0]];
      for (let i = 1; i < segments.length; i++)
        pathParts.push("tasks", segments[i]);
      basePath = join(getEpicsDir(projectDir), epicId, ...pathParts);
    }

    // Has a checkpoint → ran at least once
    if (existsSync(join(basePath, "checkpoint.json"))) return true;

    // Has attempts.jsonl → ran at least once
    return existsSync(join(basePath, "attempts.jsonl"));
  }

  /* ------------------------------------------------------------------ */
  /*  SKILL.md Patching                                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Add `missingFile` to the producer's SKILL.md:
   *   - Append to `outputs` array in frontmatter
   *   - Add a shell check (`test -f <file>`)
   *   - Append a note to the task body
   */
  private async patchSkillMd(
    skillPath: string,
    missingFile: string,
  ): Promise<void> {
    const content = await readFile(skillPath, "utf-8");
    const match = content.match(/^---\s*\n([\s\S]*?)\n---\n?/);
    if (!match) throw new Error(`No YAML frontmatter found in ${skillPath}`);

    const yaml = await import("yaml");
    const fm = yaml.parse(match[1]) as Record<string, unknown>;

    // Add to outputs
    if (!Array.isArray(fm.outputs)) fm.outputs = [];
    const outputs = fm.outputs as string[];
    if (!outputs.includes(missingFile)) {
      outputs.push(missingFile);
    }

    // Add a check for the missing file
    if (!Array.isArray(fm.checks)) fm.checks = [];
    const checks = fm.checks as Array<{
      id: string;
      description: string;
      cmd: string;
    }>;
    const checkId = `${basename(missingFile, "." + basename(missingFile).split(".").pop())}-exists`;
    const alreadyHasCheck = checks.some(
      (c) => c.id === checkId || c.cmd.includes(missingFile),
    );
    if (!alreadyHasCheck) {
      checks.push({
        id: checkId,
        description: `${basename(missingFile)} file exists`,
        cmd: `test -f ${missingFile}`,
      });
    }

    // Reconstruct the file: updated frontmatter + original body
    const newFrontmatter = yaml.stringify(fm).trimEnd();
    const body = content.slice(match[0].length);

    // Append a note to the body so the AI knows it needs to produce the additional file
    const note = `\n\n> **Note (auto-patched by repair):** Also ensure \`${missingFile}\` is produced.\n`;
    const bodyHasNote = body.includes(missingFile);

    await writeFile(
      skillPath,
      `---\n${newFrontmatter}\n---\n${body}${bodyHasNote ? "" : note}`,
      "utf-8",
    );
  }

  /* ------------------------------------------------------------------ */
  /*  LEARN.md Injection                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Write LEARN.md to the producer's most recent attempt directory.
   * writeContextSnapshot() carries LEARN.md forward to the next wip/ attempt.
   */
  private async writeLearnMd(
    producer: ProducerInfo,
    missingFile: string,
    dependentTaskId: string,
    projectDir: string,
  ): Promise<void> {
    const segments = producer.journalTaskId.split("/");
    const pathParts: string[] = [segments[0]];
    for (let i = 1; i < segments.length; i++)
      pathParts.push("tasks", segments[i]);

    const attemptsBaseDir = join(
      getEpicsDir(projectDir),
      producer.epicId,
      ...pathParts,
      "attempts",
    );

    let targetDir: string;
    if (existsSync(attemptsBaseDir)) {
      const { readdirSync } =
        (await import("node:fs")) as typeof import("node:fs");
      const numbered = readdirSync(attemptsBaseDir)
        .filter((e) => /^\d+$/.test(e))
        .sort()
        .reverse();
      targetDir =
        numbered.length > 0
          ? join(attemptsBaseDir, numbered[0])
          : join(attemptsBaseDir, "wip");
    } else {
      targetDir = join(attemptsBaseDir, "wip");
    }

    await mkdir(targetDir, { recursive: true });

    const learnContent = [
      `# LEARN.md — Incomplete Output Detected`,
      ``,
      `## What Went Wrong`,
      ``,
      `On the previous attempt, this task produced only some of its declared outputs.`,
      `The downstream task \`${dependentTaskId}\` is blocked because the following file is missing:`,
      ``,
      `- \`${missingFile}\``,
      ``,
      `## What You Must Do`,
      ``,
      `Ensure that **\`${missingFile}\` is explicitly created** during this run.`,
      ``,
      `Check the stitch/design tool output — it may generate a screenshot/PNG as a side effect.`,
      `If not, explicitly capture or export \`${basename(missingFile)}\` after generation.`,
      ``,
      `## Verification`,
      ``,
      `Before marking complete, confirm:`,
      `\`\`\`sh`,
      `test -f ${missingFile} && echo "OK" || echo "MISSING"`,
      `\`\`\``,
    ].join("\n");

    await writeFile(join(targetDir, "LEARN.md"), learnContent, "utf-8");
    console.log(
      `   📝 LEARN.md → ${join(targetDir, "LEARN.md").replace(projectDir, "")}`,
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  private extractMissingInputs(gap: Gap): string[] {
    const inputs: string[] = [];
    for (const key of [
      "missingInputs",
      "blockedInputs",
      "allMissingItems",
    ] as const) {
      if (Array.isArray(gap.metadata?.[key])) {
        inputs.push(...(gap.metadata[key] as string[]));
      }
    }
    if (
      gap.metadata?.missingPath &&
      typeof gap.metadata.missingPath === "string"
    ) {
      inputs.push(gap.metadata.missingPath);
    }
    return [...new Set(inputs)];
  }

  private async getOutputs(skillPath: string): Promise<string[]> {
    try {
      const content = await readFile(skillPath, "utf-8");
      const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (!match) return [];
      const yaml = await import("yaml");
      const fm = yaml.parse(match[1]) as Record<string, unknown>;
      return Array.isArray(fm.outputs) ? (fm.outputs as string[]) : [];
    } catch {
      return [];
    }
  }

  private extractTaskId(taskFilePath: string, epicPath: string): string {
    const rel = relative(epicPath, taskFilePath).replace(/\\/g, "/");
    const parts = rel
      .split("/")
      .filter(
        (p) => p !== "SKILL.md" && p !== "TASK.md" && p !== "tasks",
      );
    return parts[parts.length - 1];
  }

  private extractJournalTaskId(
    taskFilePath: string,
    epicPath: string,
  ): string {
    const rel = relative(epicPath, taskFilePath).replace(/\\/g, "/");
    const parts = rel
      .split("/")
      .filter(
        (p) => p !== "SKILL.md" && p !== "TASK.md" && p !== "tasks",
      );
    return parts.join("/");
  }
}
