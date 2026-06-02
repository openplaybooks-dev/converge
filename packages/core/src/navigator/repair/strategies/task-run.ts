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
import { join, basename, relative } from "node:path";
import type { Gap } from "../../../task/gap/types.ts";
import type {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
} from "../types.ts";
import { PromptBuilder } from "../system-prompts.ts";
import { runAgent, getAgentLogDir } from "../agent-runner.ts";
import { parseTaskMd } from "../../../config/task-md-definition.ts";
import { writeContextSnapshot } from "../../../task/lifecycle/context-snapshot.ts";
import { writeResultSnapshot } from "../../../task/lifecycle/result-snapshot.ts";
import {
  resolveSkillsRoot,
  resolveSkillPath,
} from "../../../config/skill-path-resolver.ts";
import {
  readAttemptContext,
  type TaskAttemptContext,
} from "../../../task/lifecycle/attempt-context.ts";
import {
  classifySituation,
  type Situation,
  type SituationFacts,
} from "../situation-classifier.ts";
import {
  buildPacket,
  type PacketInputs,
} from "../packet-builder.ts";

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

    const taskTitle =
      (gap.metadata?.taskTitle as string | undefined) ?? gap.description;
    const taskAgent =
      (gap.metadata?.taskAgent as string | undefined) ?? "Converge";
    const taskAI = gap.metadata?.taskAI as
      | import("../../../config/task-definition.ts").TaskAIConfig
      | undefined;

    // Merge task-level ai: config with framework defaults.
    // taskAI.provider takes precedence over the shorthand `agent:` field.
    // Declared early so it is in scope for supportsSkillDirs and runAgent.
    const resolvedProvider = taskAI?.provider ?? (taskAgent !== "Converge" ? taskAgent : undefined);

    const supportsSkillDirs =
      !["kimi", "qwen", "gemini"].includes(String(resolvedProvider ?? ""));

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

      // Prompt-driven tasks can still reference skills explicitly in the body
      // without declaring a first-class `skill:`. For providers that support
      // filesystem-discovered skills, mount the available skill root so the
      // agent can load them when the prompt names one.
      if (!skillDirs && supportsSkillDirs && existsSync(skillsRoot)) {
        const discovered: Record<string, string> = {};
        for (const d of readdirSync(skillsRoot, { withFileTypes: true })) {
          if (!d.isDirectory()) continue;
          const skillMd = join(skillsRoot, d.name, "SKILL.md");
          if (existsSync(skillMd)) {
            discovered[d.name] = relative(projectDir, join(skillsRoot, d.name));
          }
        }
        if (Object.keys(discovered).length > 0) {
          skillDirs = discovered;
        }
      }
    }

    // ── Context snapshot (RFC 0048 attempt.json) ───────────────────────
    // The attempt directory is normally set up by the runner before
    // execution. We read `attempt.json` (the only per-attempt record);
    // if it is missing (e.g. after --restart wipes the wip dir) we
    // recreate it via writeContextSnapshot, which is now a thin
    // attempt.json writer.
    const attemptDir = process.env.CONVERGE_TASK_ATTEMPT_DIR;
    let attemptCtx: TaskAttemptContext | null = null;

    if (attemptDir) {
      const attemptJsonPath = join(attemptDir, "attempt.json");
      if (!existsSync(attemptJsonPath)) {
        console.log(
          `   ⚠️  attempt.json missing — recreating it (fallback mode)`,
        );
        const parsed =
          unitPath && existsSync(unitPath) ? await parseTaskMd(unitPath) : null;
        const checks = gap.metadata?.checks as
          | Array<{ id: string; description?: string; cmd?: string }>
          | undefined;
        const attemptNumber = Number(
          process.env.CONVERGE_TASK_ATTEMPT ?? "1",
        );
        const skillNames = parsed?.def.skills as string[] | undefined;
        const taskSourcePath = unitPath
          ? relative(projectDir, unitPath).replace(/\\/g, "/")
          : undefined;
        const snapshot = await writeContextSnapshot({
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
          handoff: parsed?.def.handoff,
          playbook:
            (gap.metadata?.playbook as string | undefined) ??
            process.env.CONVERGE_PLAYBOOK,
          taskSourcePath,
          skills: skillNames,
        });
        if (snapshot.blocked) {
          const attemptNumber = Number(
            process.env.CONVERGE_TASK_ATTEMPT ?? "1",
          );
          console.log(`   ⛔ Needs not met: ${snapshot.blockedReason}`);
          await writeResultSnapshot(
            attemptDir,
            projectDir,
            "blocked",
            0,
            attemptNumber,
          );
          return {
            success: false,
            reason: snapshot.blockedReason ?? "blocked by missing inputs",
          };
        }
      }
      attemptCtx = await readAttemptContext(attemptDir);
      if (attemptCtx?.status === "blocked") {
        const attemptNumber = Number(
          process.env.CONVERGE_TASK_ATTEMPT ?? "1",
        );
        await writeResultSnapshot(
          attemptDir,
          projectDir,
          "blocked",
          0,
          attemptNumber,
        );
        return {
          success: false,
          reason:
            attemptCtx.retryHints.find((h) => h.kind === "blocked-input")
              ?.message ?? "blocked by missing inputs",
        };
      }
    }

    // ── Prompt building (RFC 0048 packet) ─────────────────────────────────
    let prompt: string;
    if (attemptCtx) {
      const attemptNumber = attemptCtx.attempt;
      // Situation classifier picks the right packet shape.
      const hasPriorAttempt = attemptNumber > 1;
      const priorStatus = hasPriorAttempt ? "failed" : undefined;
      const facts: SituationFacts = {
        attempt: attemptCtx,
        hasPriorAttempt,
        priorStatus,
        hasHumanReview: false,
        producerChanged: false,
        isDefinitionIssue: false,
      };
      const situation: Situation = classifySituation(facts);
      const packetInputs: PacketInputs = {
        attempt: attemptCtx,
        situation,
        sourceSummary: gap.metadata?.taskPrompt as string | undefined,
      };
      const packet = buildPacket(packetInputs);
      const relDir = relative(projectDir, attemptDir ?? projectDir).replace(
        /\\/g,
        "/",
      );
      console.log(
        `   📋 attempt.json → ${relDir}/  [situation=${situation}]`,
      );
      prompt = PromptBuilder.buildPacketBasedTaskRunPrompt(
        packet,
        attemptNumber,
      );
    } else {
      prompt = PromptBuilder.buildTaskRunPrompt(gap, projectDir, skillName);
    }
    prompt = PromptBuilder.injectPlan(prompt, projectDir, journalCtx);

    // Read passthrough/converge from source TASK.md frontmatter directly.
    // More reliable than gap metadata (which depends on the full parse chain).
    let isPassthrough = false;
    let convergePrompt: string | undefined = (gap.metadata?.taskConvergePrompt as string | undefined);
    let convergeCmd: string | undefined;
    if (unitPath && existsSync(unitPath)) {
      try {
        const srcParsed = await parseTaskMd(unitPath);
        if (srcParsed?.def) {
          isPassthrough = srcParsed.def.passthrough === true;
          const cv = srcParsed.def.converge;
          if (cv && typeof cv === "object") {
            const cvPrompt = typeof cv.prompt === "string" ? cv.prompt : undefined;
            const cvCmd = typeof cv.cmd === "string" ? cv.cmd : undefined;
            convergePrompt = convergePrompt ?? cvPrompt;
            convergeCmd = cvCmd;
          }
        }
      } catch { /* use metadata fallback */ }
    }

    try {
      // ── Passthrough mode: skip AI, execute shell commands directly ──
      // Passthrough bodies that ALSO declare `converge:` still get the
      // do-while loop — after the body succeeds, we fall through to the
      // converge: prompt block below so the loop condition can decide
      // continue vs done.
      let passthroughDone = false;
      if (isPassthrough && unitPath && existsSync(unitPath)) {
        const parsed = await parseTaskMd(unitPath);
        const body = parsed?.body ?? "";
        const commands = extractShellCommands(body);
        if (commands.length > 0) {
          console.log(`   ⚡ Passthrough: running ${commands.length} shell command(s) as single script`);
          const { execSync } = await import("node:child_process");
          // Auto-add CLI to PATH so `converge` is callable from passthrough
          // bodies, AND define a `converge` shell function that delegates to
          // the framework's own binary (CONVERGE_BIN, set by execute-task.ts).
          // The function lets bodies type `converge spawn <id> <template>`
          // naturally without needing to know whether a local node_modules
          // install exists. The PATH export remains as a fallback for tools
          // that expect `converge` on PATH (e.g. shell-completion lookups).
          const envSetup =
            'export PATH="$(pwd)/node_modules/.bin:$PATH"\n' +
            'if [ -n "${CONVERGE_BIN:-}" ] && [ -f "$CONVERGE_BIN" ]; then\n' +
            '  converge() { node "$CONVERGE_BIN" "$@"; }\n' +
            '  export -f converge 2>/dev/null || true\n' +
            'fi\n';
          const bashShell = process.platform === "win32" ? "bash" : "/bin/bash";
          const script = envSetup + commands.join("\n");
          try {
            execSync(script, { cwd: projectDir, stdio: "inherit", timeout: 120_000, shell: bashShell });
          } catch (err: any) {
            return { success: false, reason: `Passthrough script failed: ${err.message}` };
          }
          passthroughDone = true;
        } else {
          return { success: false, reason: "Passthrough task has no shell commands in body" };
        }
      }
      // If passthrough succeeded AND there's no converge: prompt, exit now.
      // Otherwise (no passthrough OR has converge:), fall through to the
      // agent + converge: blocks below.
      if (passthroughDone && !convergePrompt && !convergeCmd) {
        return { success: true, reason: "Passthrough ran successfully" };
      }
      // If passthrough ran AND we have a converge: prompt, skip the agent
      // call (passthrough already did the work) and jump straight to the
      // converge: block. We accomplish this by flagging here and gating
      // the runAgent call below.
      const skipAgentForPassthrough = passthroughDone;

      if (!skipAgentForPassthrough) {
        await runAgent({
          phase: "run_task",
          prompt,
          agentOptions: {
            // Native skill loading is enabled for Claude/OpenCode-compatible providers.
            // Kimi/Qwen/Gemini do not use filesystem-discovered SKILL.md files here.
            ...(skillDirs && supportsSkillDirs ? { skillDirs } : {}),
            timeoutMs: taskAI?.timeoutMs ?? 300_000,
            maxRetries: taskAI?.maxRetries ?? 2,
            allowedTools: taskAI?.allowedTools ?? allowedTools,
            ...(taskAI?.model ? { model: taskAI.model } : {}),
            ...(resolvedProvider ? { provider: resolvedProvider as import("@openplaybooks/agentfn").Provider } : {}),
            ...((taskAI?.options as Record<string, unknown>) ?? {}),
          },
          projectDir,
          journalCtx,
          label: taskTitle,
          skillName,
          agentName: resolvedProvider ?? (taskAgent !== "Converge" ? taskAgent : undefined),
        });
      }

      // Buggy-check relaxer: run after every attempt so the relaxation
      // is in place before the next attempt's context snapshot. Must
      // happen here (inside unit.run()) rather than just in executeTask
      // because the navigator advances attempts internally.
      const attemptDir = process.env.CONVERGE_TASK_ATTEMPT_DIR;
      if (attemptDir) {
        try {
          const { tryRelaxBuggyCheck } = await import(
            "../../../task/lifecycle/buggy-check-relaxer.ts"
          );
          const relax = await tryRelaxBuggyCheck(attemptDir);
          if (relax.applied) {
            console.log(
              `   🛠  Buggy-check relaxer applied to "${relax.checkId}":`,
            );
            console.log(`      old: ${relax.oldCmd}`);
            console.log(`      new: ${relax.newCmd}`);
          } else if (relax.reason !== "no BUGGY_CHECK.md present") {
            console.log(`   ⚠️  Buggy-check proposal rejected: ${relax.reason}`);
          }
        } catch (err) {
          console.warn(`   ⚠️  Buggy-check relaxer skipped: ${(err as Error).message}`);
        }
      }

      // ── Converge prompt (do-while loop): ask AI whether to continue ──
      // `convergePrompt` was parsed earlier (at task-start, alongside
      // `isPassthrough`) so passthrough + converge: tasks can fall
      // through here cleanly. Re-fetch `declaredOutputs` from the same
      // parse since we need them for the cleanup step below.
      let declaredOutputs: string[] = [];
      if (unitPath && existsSync(unitPath)) {
        try {
          const srcParsed = await parseTaskMd(unitPath);
          if (srcParsed?.def) {
            declaredOutputs = srcParsed.def.outputs ?? [];
          }
        } catch { /* fall through to metadata */ }
      }
      if (convergePrompt || convergeCmd) {
        const convergeResult = convergeCmd
          ? await runConvergeCmd({
              convergeCmd,
              projectDir,
              journalCtx,
              taskTitle,
              taskId,
            })
          : await runConvergeCheck({
              convergePrompt: convergePrompt!,
              projectDir,
              journalCtx,
              taskTitle,
              resolvedProvider,
              taskAI,
              taskId,
            });
        if (convergeResult === "continue") {
          // Clear declared outputs read from source TASK.md.
          // The AI may have prematurely written them despite instructions
          // (so the next iteration sees a clean slate). Skip this for
          // PASSTHROUGH bodies — those are deterministic shell scripts that
          // intentionally accumulate state (e.g. appending wave entries to
          // a log file). Deleting their outputs between iterations would
          // wreck the accumulation pattern.
          if (declaredOutputs.length > 0 && !isPassthrough) {
            const { rmSync } = await import("node:fs");
            for (const o of declaredOutputs) {
              try { rmSync(join(projectDir, o), { force: true }); } catch {}
            }
          }

          // Bump the per-task wave counter in tasks.jsonl metadata. Each
          // converge: prompt that returns "continue" advances the task's
          // wave by 1. The task body and converge prompt can read it as
          // $CONVERGE_TASK_WAVE (set in execute-task.ts) or as the
          // injected {wave} template var. Initial body execution is
          // wave 0; first re-pend bumps to wave 1; etc.
          if (taskId) {
            try {
              const playbookName = process.env.CONVERGE_PLAYBOOK;
              if (playbookName) {
                const { readRuntimeLedgerState, appendTaskStatus } =
                  await import("../../../task/goal/runtime-ledger.ts");
                const ledger = readRuntimeLedgerState(projectDir, playbookName);
                const row = ledger.tasks.find((t) => t.id === taskId);
                const currentWave = Number(
                  (row?.metadata?.wave as number | string | undefined) ?? 0,
                );
                const nextWave = (Number.isFinite(currentWave) ? currentWave : 0) + 1;
                appendTaskStatus(projectDir, playbookName, taskId, "todo", {
                  ...(row?.metadata ?? {}),
                  wave: nextWave,
                });
                console.log(`   🔄 Converge: loop continues — wave ${nextWave}`);
              } else {
                console.log("   🔄 Converge: loop continues — re-running main body");
              }
            } catch (err) {
              // Wave-bump failure must NOT block the loop. Log and continue
              // with the existing behavior (re-run without counter bump).
              const m = err instanceof Error ? err.message : String(err);
              console.warn(`   ⚠️  Wave-counter bump failed (non-fatal): ${m}`);
              console.log("   🔄 Converge: loop continues — re-running main body");
            }
          } else {
            console.log("   🔄 Converge: loop continues — re-running main body");
          }

          // Return success with retryMode="rerun" so the navigator
          // re-executes the task on the next cycle. Returning success:false
          // makes the gap detector ignore us; success:true + retryMode
          // is the framework's explicit "do this task again" signal.
          return {
            success: true,
            reason: "Converge loop continues — re-running task body",
            retryMode: "rerun",
          };
        }
        console.log("   ✅ Converge: loop done");
      }

      // ── Sync spawned children into DAG so they run in this pass ──
      // The run loop captures dag + resultsMgr in `ctx.syncSpawnedToDag`
      // (see run/index.ts:runTask). If present, call it now so children
      // emitted by this strategy enter the DAG immediately. When the
      // callback is absent (strategy invoked outside a full run loop —
      // e.g. tests, ad-hoc repair), children still enter the DAG on the
      // next outer pass via the startup sweep; correctness preserved,
      // only one cycle of latency.
      if (ctx.syncSpawnedToDag) {
        try {
          await ctx.syncSpawnedToDag();
        } catch (syncErr: unknown) {
          // Sync failure must not flip the strategy's outcome — it's an
          // optimization, not a correctness gate.
          const m = syncErr instanceof Error ? syncErr.message : String(syncErr);
          console.warn(`   ⚠️  Mid-strategy sync failed (non-fatal): ${m}`);
        }
      }

      // Re-check if the gap was actually resolved
      const recheckPath = gap.metadata?.unitPath as string | undefined;
      if (recheckPath) {
        try {
          const { fromPath } = await import("../../../task/unit/factories.ts");
          const { findGaps } = await import("../../../task/unit/find-gaps.ts");
          const unit = await fromPath(recheckPath);
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

/** Extract shell commands from markdown code fences. Handles backslash continuations. */
function extractShellCommands(body: string): string[] {
  const commands: string[] = [];
  const fenceRegex = /```(?:bash|sh|shell)?\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = fenceRegex.exec(body)) !== null) {
    const block = match[1].trim();
    const lines = block.split("\n");
    let current = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (trimmed.endsWith("\\")) {
        current += trimmed.slice(0, -1).trimEnd() + " ";
      } else {
        current += trimmed;
        commands.push(current);
        current = "";
      }
    }
    if (current.trim()) commands.push(current.trim());
  }
  return commands;
}

/** Options for the converge check AI call. */
interface ConvergeCheckOptions {
  convergePrompt: string;
  projectDir: string;
  journalCtx: any;
  taskTitle: string;
  resolvedProvider: string | undefined;
  taskAI: any;
  taskId: string | undefined;
}

interface ConvergeCmdOptions {
  convergeCmd: string;
  projectDir: string;
  journalCtx: any;
  taskTitle: string;
  taskId: string | undefined;
}

/**
 * Run the converge check — a small AI call that decides whether the
 * do-while loop should continue.
 *
 * The AI signals its decision via the CLI:
 *   converge tasks mark <taskId> --status done       # → returns "done"
 *   converge tasks mark <taskId> --status doing      # → returns "continue"
 *   (any non-"done" terminal status also → "continue")
 *
 * The framework reads the task's status from the runtime ledger
 * (tasks.jsonl) AFTER the AI session completes. This replaces the
 * previous JSON-return contract with the framework's native ledger
 * primitive — auditable via `converge tasks status <id>` and queryable
 * across sprints via `converge tasks list`.
 *
 * Returns "continue" to re-run the main body, or "done" to converge.
 */
async function runConvergeCheck(
  opts: ConvergeCheckOptions,
): Promise<"continue" | "done"> {
  const { agentfn } = await import("@openplaybooks/agentfn");
  const { readRuntimeLedgerState } = await import("../../../task/goal/runtime-ledger.ts");

  const playbookName = process.env.CONVERGE_PLAYBOOK;
  if (!playbookName) {
    console.warn(`   ⚠️  Converge check: CONVERGE_PLAYBOOK env not set — assuming done`);
    return "done";
  }
  if (!opts.taskId) {
    console.warn(`   ⚠️  Converge check: taskId missing from gap metadata — assuming done`);
    return "done";
  }

  // Snapshot the task's status BEFORE the AI runs.
  const before = readRuntimeLedgerState(opts.projectDir, playbookName);
  const beforeRow = before.tasks.find((t) => t.id === opts.taskId);
  const beforeStatus = beforeRow?.status;

  // Early-halt path: if the body (or a sibling task) already marked
  // this task as "done" before the converge prompt fires, honor it
  // immediately without spending an AI call. This lets passthrough
  // bodies decide programmatically — read state, call `converge tasks
  // mark <id> --status done` — and have the framework halt the loop
  // without needing an AI verdict at all.
  if (beforeStatus === "done") {
    const reasoning =
      (beforeRow?.metadata?.reasoning as string | undefined) ?? "";
    console.log(
      `   🔍 Converge: done (pre-marked by body)${reasoning ? ` — ${reasoning}` : ""}`,
    );
    return "done";
  }

  const prompt = [
    opts.convergePrompt,
    "",
    "## Signal your decision via the converge CLI",
    "",
    "Use Bash to call ONE of:",
    "",
    `  converge tasks mark ${opts.taskId} --status done --reasoning "<one-line summary>"  # loop halts`,
    `  converge tasks mark ${opts.taskId} --status doing --reasoning "<one-line summary>" # loop continues another iteration`,
    "",
    "The framework reads the resulting status row from the runtime",
    "ledger (.converge/inventory/<playbook>/tasks.jsonl) to decide.",
    "Status=done halts the loop; any other status continues. The",
    `--reasoning text lands in the row's metadata for audit. Default to`,
    `"doing" when unsure — humans halt loops, judges don't.`,
  ].join("\n");

  const provider = (opts.resolvedProvider as string | undefined) ?? "claude";

  try {
    const logDir = getAgentLogDir(opts.projectDir, opts.journalCtx);
    const executor = agentfn<unknown>({
      prompt,
      // No schema — the AI signals via CLI, not return value.
      allowedTools: ["Bash"],
      timeoutMs: 60_000,
      cwd: opts.projectDir,
      logDir,
      provider: provider as any,
      maxRetries: 0,
    });

    const result = await executor();

    // Stub provider short-circuit: the stub doesn't actually run Bash,
    // so it can't call `converge tasks mark`. Instead, parse the stub's
    // returned data as the verdict directly. Accepts either a string
    // ("continue" | "done") or a JSON object ({"action":"continue"|"done"}).
    // This makes deterministic wave-loop testing possible without an
    // LLM AND without a side-channel ledger mutation.
    if (provider === "stub") {
      let stubAction: string | undefined;
      const data = (result as { data?: unknown }).data;
      if (typeof data === "string") {
        const trimmed = data.trim();
        if (trimmed === "done" || trimmed === "continue") {
          stubAction = trimmed;
        } else {
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === "object" && "action" in parsed) {
              const a = (parsed as { action?: unknown }).action;
              if (a === "done" || a === "continue") stubAction = a;
            }
          } catch {
            // Fall through — empty / unparsable stub response defaults to continue
          }
        }
      } else if (data && typeof data === "object" && "action" in data) {
        const a = (data as { action?: unknown }).action;
        if (a === "done" || a === "continue") stubAction = a;
      }
      const verdict = stubAction ?? "continue";
      console.log(`   🔍 Converge (stub): ${verdict}`);
      return verdict as "continue" | "done";
    }
  } catch (err: any) {
    console.warn(`   ⚠️  Converge check AI session failed: ${err.message} — assuming continue`);
    return "continue";
  }

  // Read the task's status AFTER the AI session. The AI's CLI call
  // updated the ledger row; we pick up the new status here.
  const after = readRuntimeLedgerState(opts.projectDir, playbookName);
  const afterRow = after.tasks.find((t) => t.id === opts.taskId);
  const afterStatus = afterRow?.status;
  const reasoning = (afterRow?.metadata?.reasoning as string | undefined) ?? "";

  if (afterStatus === "done") {
    console.log(`   🔍 Converge: done — ${reasoning}`);
    return "done";
  }
  console.log(
    `   🔍 Converge: continue (status=${afterStatus ?? "unknown"})${reasoning ? ` — ${reasoning}` : ""}`,
  );
  return "continue";
}

async function runConvergeCmd(
  opts: ConvergeCmdOptions,
): Promise<"continue" | "done"> {
  const { readRuntimeLedgerState } = await import("../../../task/goal/runtime-ledger.ts");
  const { execSync } = await import("node:child_process");

  const playbookName = process.env.CONVERGE_PLAYBOOK;
  if (!playbookName) {
    console.warn(`   ⚠️  Converge cmd: CONVERGE_PLAYBOOK env not set — assuming done`);
    return "done";
  }
  if (!opts.taskId) {
    console.warn(`   ⚠️  Converge cmd: taskId missing from gap metadata — assuming done`);
    return "done";
  }

  const before = readRuntimeLedgerState(opts.projectDir, playbookName);
  const beforeRow = before.tasks.find((t) => t.id === opts.taskId);
  if (beforeRow?.status === "done") {
    const reasoning =
      (beforeRow.metadata?.reasoning as string | undefined) ?? "";
    console.log(
      `   🔍 Converge: done (pre-marked by body)${reasoning ? ` — ${reasoning}` : ""}`,
    );
    return "done";
  }

  const envSetup =
    'export PATH="$(pwd)/node_modules/.bin:$PATH"\n' +
    'if [ -n "${CONVERGE_BIN:-}" ] && [ -f "$CONVERGE_BIN" ]; then\n' +
    '  converge() { node "$CONVERGE_BIN" "$@"; }\n' +
    '  export -f converge 2>/dev/null || true\n' +
    'fi\n';

  try {
    const bashShell = process.platform === "win32" ? "bash" : "/bin/bash";
    const raw = execSync(envSetup + opts.convergeCmd, {
      cwd: opts.projectDir,
      encoding: "utf-8",
      shell: bashShell,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
    }).trim();
    const verdict = raw
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean)
      .at(-1);
    if (verdict === "continue") {
      console.log("   🔍 Converge (cmd): continue");
      return "continue";
    }
    if (verdict === "done" || verdict === "halt" || verdict === "exit") {
      console.log(`   🔍 Converge (cmd): ${verdict}`);
      return "done";
    }
  } catch (err: any) {
    console.warn(`   ⚠️  Converge cmd failed: ${err.message} — assuming continue`);
    return "continue";
  }

  const after = readRuntimeLedgerState(opts.projectDir, playbookName);
  const afterRow = after.tasks.find((t) => t.id === opts.taskId);
  const afterStatus = afterRow?.status;
  const reasoning = (afterRow?.metadata?.reasoning as string | undefined) ?? "";
  if (afterStatus === "done") {
    console.log(`   🔍 Converge: done — ${reasoning}`);
    return "done";
  }
  console.log(
    `   🔍 Converge (cmd): continue${reasoning ? ` — ${reasoning}` : ""}`,
  );
  return "continue";
}
