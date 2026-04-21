/**
 * TaskRunStrategy
 *
 * Handles gaps where the task simply needs to be executed:
 *   - `output`      — task hasn't run yet / outputs not produced
 *   - `check-failed`— task ran but a verification check didn't pass
 *   - `corrupted`   — output exists but failed integrity validation
 *
 * Extracted from GapFixer.executeTaskRun() and GapFixer.fixGap() in gap-fixer.ts.
 */

import { existsSync, readdirSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import type { Gap } from "../../gap/types.ts";
import type {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
} from "../types.ts";
import { PromptBuilder } from "../system-prompts.ts";
import { runAgent, getAgentLogDir } from "../agent-runner.ts";
import { parseTaskMd } from "../../config/task-md-definition.ts";
import { writeContextSnapshot } from "../../lifecycle/context-snapshot.ts";
import { writeResultSnapshot } from "../../lifecycle/result-snapshot.ts";
import {
  resolveSkillsRoot,
  resolveSkillPath,
} from "../../config/skill-path-resolver.ts";

export class TaskRunStrategy implements FixStrategy {
  readonly name = "task-run";

  canHandle(gap: Gap): boolean {
    const kind = gap.metadata?.gapKind as string | undefined;
    return kind === "output" || kind === "check-failed" || kind === "corrupted";
  }

  async tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    const taskId = gap.metadata?.taskId as string | undefined;
    const unitPath = gap.metadata?.unitPath as string | undefined;
    let skillDirs: Record<string, string> | undefined;
    let skillName: string | undefined;
    let allowedTools: string[] = ["Read", "Write", "Edit", "Bash", "Glob"]; // default

    // Resolve skills using the skill path resolver (supports .skill/, .claude/skills/, .converge/skills/)
    const skillsRoot = resolveSkillsRoot(projectDir);

    if (unitPath && basename(unitPath) === "SKILL.md") {
      // SKILL.md task: mount shared skills so the AI can invoke them.
      // The task's own SKILL.md is NOT mounted — its content is already in attempts/wip/TASK.md.
      skillDirs = {};

      // Shared skills from resolved skills root
      if (existsSync(skillsRoot)) {
        for (const d of readdirSync(skillsRoot, { withFileTypes: true })) {
          if (!d.isDirectory()) continue;
          const skillMd = join(skillsRoot, d.name, "SKILL.md");
          // Use relative path from projectDir for agentfn compatibility
          if (existsSync(skillMd))
            skillDirs[d.name] = relative(projectDir, join(skillsRoot, d.name));
        }
      }

      // Parse allowed-tools from task's SKILL.md
      if (unitPath && existsSync(unitPath)) {
        try {
          const parsed = await parseTaskMd(unitPath);
          if (
            parsed?.def["allowed-tools"] &&
            parsed.def["allowed-tools"].length > 0
          ) {
            allowedTools = parsed.def["allowed-tools"];
          }
        } catch {
          // If parsing fails, use defaults
        }
      }
    } else {
      // task.ts: look up declared skill by name using skill resolver
      const taskSkill = gap.metadata?.taskSkill as
        | string
        | string[]
        | undefined;
      const primarySkill = Array.isArray(taskSkill) ? taskSkill[0] : taskSkill;
      if (primarySkill) {
        const skillDir = resolveSkillPath(primarySkill, projectDir);
        if (skillDir) {
          skillName = primarySkill;
          // Use relative path from projectDir for agentfn compatibility
          skillDirs = { [primarySkill]: relative(projectDir, skillDir) };

          // Parse allowed-tools from the skill's SKILL.md
          const taskMdPath = join(skillDir, "TASK.md");
          const legacySkillPath = join(skillDir, "SKILL.md");
          const defPath = existsSync(taskMdPath) ? taskMdPath : legacySkillPath;
          if (existsSync(defPath)) {
            try {
              const parsed = await parseTaskMd(defPath);
              if (
                parsed?.def["allowed-tools"] &&
                parsed.def["allowed-tools"].length > 0
              ) {
                allowedTools = parsed.def["allowed-tools"];
              }
            } catch {
              // If parsing fails, use defaults
            }
          }
        } else {
          console.log(
            `   ⚠️  Skill not found: ${primarySkill} (searched in .skill/, .claude/skills/, .converge/skills/)`,
          );
        }
      }
    }

    // ── Context snapshot (ALL task types) ──────────────────────────────────
    // Files are normally created by task-runner.ts before execution.
    // Recreate them here as a fallback if missing (e.g. after --restart wipes wip/).
    const attemptDir = process.env.CONVERGE_TASK_ATTEMPT_DIR;
    let snapshotPaths: any;

    if (attemptDir) {
      const needsMdPath = join(attemptDir, "NEEDS.md");
      const taskMdPath = join(attemptDir, "TASK.md");
      const checkMdPath = join(attemptDir, "CHECK.md");
      const needsResultMdPath = join(attemptDir, "NEEDS.result.md");
      const filesExist =
        existsSync(needsMdPath) &&
        existsSync(taskMdPath) &&
        existsSync(checkMdPath);

      if (!filesExist) {
        console.log(
          `   ⚠️  Context snapshot files missing — creating them now (fallback mode)`,
        );
        const parsed =
          unitPath && existsSync(unitPath) ? await parseTaskMd(unitPath) : null;
        const checks = gap.metadata?.checks as
          | Array<{ id: string; description?: string; cmd?: string }>
          | undefined;
        const attemptNumber = Number(process.env.CONVERGE_TASK_ATTEMPT ?? "1");
        snapshotPaths = await writeContextSnapshot({
          projectDir,
          epicId: journalCtx?.epicId ?? "",
          taskId: taskId ?? "",
          attemptDir,
          description: parsed?.def.description,
          inputs: parsed?.def.inputs,
          outputs: parsed?.def.outputs,
          checks: checks ?? parsed?.def.checks,
          skillBody: parsed?.body,
          attemptNumber,
        });
      } else {
        const { readFile } = await import("node:fs/promises");
        const needsResultContent = existsSync(needsResultMdPath)
          ? await readFile(needsResultMdPath, "utf-8")
          : "";
        const blocked = needsResultContent.includes("⛔ **BLOCKED");
        const blockedReason = blocked
          ? "Needs not met (see NEEDS.result.md)"
          : undefined;
        const hasLearn = existsSync(join(attemptDir, "LEARN.md"));
        const errorContextMd = existsSync(join(attemptDir, "CHECK.result.md"))
          ? join(attemptDir, "CHECK.result.md")
          : existsSync(join(attemptDir, "FEEDBACK.md"))
            ? join(attemptDir, "FEEDBACK.md")
            : null;
        const hasErrorContext = errorContextMd !== null;
        const hasInterrupted = existsSync(join(attemptDir, "INTERRUPTED.md"));
        const { relative } = await import("node:path");
        const relDir = relative(projectDir, attemptDir).replace(/\\/g, "/");
        snapshotPaths = {
          needsMd: needsMdPath,
          needsResultMd: needsResultMdPath,
          taskMd: taskMdPath,
          checkMd: checkMdPath,
          needsJson: join(attemptDir, "data", "needs.json"),
          checkJson: join(attemptDir, "data", "check.json"),
          learnMd: hasLearn ? join(attemptDir, "LEARN.md") : undefined,
          errorContextMd: errorContextMd ?? undefined,
          relDir,
          hasLearn,
          hasErrorContext,
          hasInterrupted,
          blocked,
          blockedReason,
          blockedInputs: [],
        };
      }

      if (snapshotPaths.blocked) {
        const attemptNumber = Number(process.env.CONVERGE_TASK_ATTEMPT ?? "1");
        console.log(`   ⛔ Needs not met: ${snapshotPaths.blockedReason}`);
        console.log(
          `      Check ${snapshotPaths.relDir}/NEEDS.result.md for details`,
        );
        await writeResultSnapshot(
          attemptDir,
          projectDir,
          "blocked",
          0,
          attemptNumber,
        );
        return { success: false, reason: snapshotPaths.blockedReason };
      }
    }

    // ── Prompt building ─────────────────────────────────────────────────────
    let prompt: string;
    if (attemptDir && snapshotPaths) {
      const attemptNumber = Number(process.env.CONVERGE_TASK_ATTEMPT ?? "1");
      const phaseLabel = snapshotPaths.hasLearn
        ? "learn → req → execute → check"
        : "req → execute → check";
      console.log(
        `   📋 Context snapshot → ${snapshotPaths.relDir}/  [${phaseLabel}]`,
      );
      prompt = PromptBuilder.buildFileBasedTaskRunPrompt(
        gap,
        projectDir,
        snapshotPaths,
        attemptNumber,
      );
    } else {
      prompt = PromptBuilder.buildTaskRunPrompt(gap, projectDir, skillName);
    }
    prompt = PromptBuilder.injectPlan(prompt, projectDir, journalCtx);

    const taskTitle =
      (gap.metadata?.taskTitle as string | undefined) ?? gap.description;
    const taskAgent =
      (gap.metadata?.taskAgent as string | undefined) ?? "Converge";

    try {
      await runAgent({
        phase: "run_task",
        prompt,
        agentOptions: {
          // skillDirs DISABLED - causes hang with kimi provider
          // ...(skillDirs ? { skillDirs } : {}),
          timeoutMs: 300_000, // 5 minutes
          maxRetries: 2, // retry on crash (STATUS_DLL_INIT_FAILED, etc.)
          allowedTools, // Use parsed allowed-tools from skill
        },
        projectDir,
        journalCtx,
        label: taskTitle,
        skillName,
        agentName: taskAgent !== "Converge" ? taskAgent : undefined,
      });

      // Re-check if the gap was actually resolved
      const unitPath = gap.metadata?.unitPath as string | undefined;
      if (unitPath) {
        try {
          const { fromPath } = await import("../../unit/factories.ts");
          const { findGaps } = await import("../../unit/find-gaps.ts");
          const unit = await fromPath(unitPath);
          const postGaps = await findGaps(unit);
          const stillHasGap = postGaps.some(
            (g) => g.id === gap.id || g.description === gap.description
          );
          if (stillHasGap) {
            return {
              success: false,
              reason: `Task executed but gap still exists: ${gap.description}`,
            };
          }
        } catch {
          // If we can't verify, proceed with success (fallback to old behavior)
        }
      }

      return { success: true, reason: "Task execution completed successfully" };
    } catch (err: any) {
      // Check if this is a retryable error (crash/timeout) or a logical error (should not retry)
      const { classifyAgentError } = await import("../agent-runner.js");
      const diagnosis = classifyAgentError(err);
      const isRetryable =
        diagnosis.type === "crash" || diagnosis.type === "timeout";

      console.log(`   ❌ task-run failed: ${err.message}`);

      // Don't show log path for config/MCP errors (they fail before/during execution setup)
      if (diagnosis.type !== "config-error" && diagnosis.type !== "mcp-error") {
        console.log(`   See logs: ${getAgentLogDir(projectDir, journalCtx)}`);
      } else if (diagnosis.type === "mcp-error") {
        // For MCP errors, show hint immediately
        console.log(`   💡 ${diagnosis.hint}`);
      }

      // Crashes and timeouts should be retried by the outer gap resolution loop
      // Config errors, MCP errors, logical failures, and API errors should not retry
      return {
        success: false,
        reason: err.message,
        shouldRetry: isRetryable, // Retry only crashes and timeouts
      };
    }
  }

  async preTask(
    _gap: Gap,
    _ctx: StrategyContext,
    _prevAttemptDirs: string[],
  ): Promise<void> {
    const attemptDir = process.env.CONVERGE_TASK_ATTEMPT_DIR;
    if (!attemptDir) return;

    const { mkdir, rm } = await import("node:fs/promises");

    const isResume =
      process.env.CONVERGE_RESUME === "1" || process.argv.includes("--resume");
    const isRestart =
      process.env.CONVERGE_RESTART === "1" ||
      process.argv.includes("--restart");

    if (isResume) {
      console.log(`   ⏩ --resume: using existing attempt dir as-is`);
      return;
    }

    if (isRestart && existsSync(attemptDir)) {
      await rm(attemptDir, { recursive: true, force: true });
      console.log(`   🔄 --restart: wiped current attempt dir`);
    }

    await mkdir(attemptDir, { recursive: true });
  }
}
