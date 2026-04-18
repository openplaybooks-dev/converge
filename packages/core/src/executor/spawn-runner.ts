/**
 * SpawnRunner
 *
 * Shared spawn execution logic used by both TaskExecutor and LoopFunctionExecutor.
 * Handles three spawn forms:
 *   - string path       → SKILL.md via agentfn (native skill symlink flow)
 *   - InlineTaskTarget  → virtual child Unit via Unit.fromDefinition()
 *   - PathRefTarget     → physical child Unit via Unit.fromPath()
 *   - TaskDefFactory    → factory wrapper over executeSpawnInline
 */

// Force UTF-8 encoding for Python subprocesses (fixes Windows codec errors with kimi)
process.env.PYTHONIOENCODING = "utf-8";
process.env.PYTHONUTF8 = "1";

import { agentfn } from "@converge/agentfn";
import type { AgentFnResult } from "@converge/agentfn";
import { existsSync, readFileSync, readdirSync, appendFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname, basename } from "node:path";
import type {
  SpawnOptions,
  SpawnResult,
  InlineTaskTarget,
  PathRefTarget,
  TaskDefFactory,
  Need,
} from "../config/task-definition.ts";
import { TaskDefinitionBuilder } from "../config/task-definition.ts";
import type { JournalContext } from "../repair/types.ts";
import {
  logTaskEvent,
  writeTaskStatus,
  writeTaskTodo,
} from "../journal/writer.ts";
import type {
  TaskStatus as JournalTaskStatus,
  ChecklistItem,
} from "../journal/types.ts";
import {
  resolveSkillDependencies,
  validateSkillsExist,
  getSkillSummary,
  collectAllowedTools,
} from "./skill-resolver.ts";
import { classifyAgentError } from "../repair/agent-runner.ts";
import { SimpleLogTailer } from "../journal/simple-log-tailer.ts";
import { resolveAIConfig, listAIProviders } from "../ai/factory.ts";
import { FilesystemStorage } from "../storage/filesystem.ts";
import {
  resolveSkillsRoot,
  logSkillSources,
} from "../config/skill-path-resolver.ts";
/** Sleep for the given number of milliseconds (interruptible via AbortSignal). */
function sleepMs(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/* ------------------------------------------------------------------ */
/*  SpawnState — shared across all spawn calls in a run               */
/* ------------------------------------------------------------------ */

export interface SpawnState {
  counter: number;
  checklist: ChecklistItem[];
  startedAt: string;
}

/* ------------------------------------------------------------------ */
/*  WriteStatus opts (matches TaskExecutor's private helper shape)    */
/* ------------------------------------------------------------------ */

export interface WriteStatusOpts {
  status: JournalTaskStatus["status"];
  startedAt: string;
  completedAt?: string;
  checklist: ChecklistItem[];
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  SpawnRunner                                                       */
/* ------------------------------------------------------------------ */

export class SpawnRunner {
  constructor(
    private projectDir: string,
    private journalCtx: JournalContext,
    private getLogDir: () => string,
    private writeStatus: (opts: WriteStatusOpts) => Promise<void>,
    private parentUnit?: any, // Unit — dynamic import avoids circular dep
  ) {}

  /* ---------------------------------------------------------------- */
  /*  String path → SKILL.md via agentfn (native skill symlink flow) */
  /* ---------------------------------------------------------------- */

  async executeSpawnPath(
    skillPath: string,
    state: SpawnState,
    opts?: SpawnOptions,
  ): Promise<SpawnResult> {
    const absSkillPath = join(this.projectDir, skillPath);

    if (!existsSync(absSkillPath)) {
      throw new Error(
        `ctx.spawn: skill file not found: ${absSkillPath}. ` +
          `Ensure the path is relative to the project root.`,
      );
    }

    // Derive skill name from the SKILL.md path:
    //   absSkillPath = /project/.converge/skills/stitch-loop/SKILL.md
    //   skillDir     = /project/.converge/skills/stitch-loop
    //   skillName    = stitch-loop
    const skillDir = dirname(absSkillPath);
    const skillName = basename(skillDir);

    // Resolve skillsRoot with fallback chain:
    //   1. Project .skill/ folder
    //   2. Global .claude/skills/ folder
    //   3. Legacy .converge/skills/ folder
    const skillsRoot = resolveSkillsRoot(this.projectDir);

    const label = opts?.label ?? skillName;
    const spawnNumber = state.counter;
    const checklistId = `subtask:spawn-${spawnNumber}`;

    const item: ChecklistItem = {
      id: checklistId,
      type: "subtask",
      description: label,
      details: skillPath,
      done: false,
    };
    state.checklist.push(item);
    await this.writeStatus({
      status: "running",
      startedAt: state.startedAt,
      checklist: state.checklist,
    });

    const logDir = this.getLogDir();
    const phase = `spawn_${spawnNumber}`;

    console.log(`\n🤖 Running skill: ${skillName}`);

    // Log skill sources for debugging
    logSkillSources(this.projectDir);

    // ── Skill Validation & Dependency Resolution ─────────────────────────
    console.log(`   📦 Resolving dependencies...`);

    let allSkills: string[];
    let mergedAllowedTools: string[];
    try {
      // First, validate that the root skill exists
      validateSkillsExist(skillsRoot, [skillName]);

      // Resolve all transitive dependencies
      const resolution = resolveSkillDependencies(skillsRoot, [skillName], {
        maxDepth: 10,
        throwOnMissing: true,
        verbose: true, // Enable verbose logging to debug issues
      });

      allSkills = resolution.skills;

      // Log warnings if any
      if (resolution.warnings.length > 0) {
        console.log(`   ⚠️  Warnings during skill resolution:`);
        resolution.warnings.forEach((w) => console.log(`      - ${w}`));
      }

      // Validate all resolved skills exist
      validateSkillsExist(skillsRoot, allSkills);

      console.log(`   ✅ Loading ${allSkills.length} skill(s):`);
      console.log(
        getSkillSummary(skillsRoot, allSkills)
          .split("\n")
          .map((line) => `   ${line}`)
          .join("\n"),
      );

      // Collect all allowed tools from all skills
      mergedAllowedTools = collectAllowedTools(skillsRoot, allSkills);
      console.log(
        `   🔧 Allowed tools (${mergedAllowedTools.length}): ${mergedAllowedTools.join(", ")}`,
      );
    } catch (error: any) {
      console.error(`   ❌ Skill validation failed: ${error.message}`);
      await logTaskEvent(
        this.projectDir,
        this.journalCtx.epicId,
        this.journalCtx.taskId,
        "SKILL_VALIDATION_FAILED",
        `Skill validation failed for ${skillName}: ${error.message}`,
        { phase, skillPath, skillName, spawnNumber, error: error.message },
      );
      throw error;
    }

    await logTaskEvent(
      this.projectDir,
      this.journalCtx.epicId,
      this.journalCtx.taskId,
      "CLAUDEFN_START",
      `spawn ${spawnNumber}: ${label}`,
      { phase, skillPath, skillName, spawnNumber, skills: allSkills },
    );

    // Hang detection: kill the spawn when no new log lines have been written for
    // HANG_IDLE_MS. This is purely log-activity-based — the timer resets on every
    // new log line, so a busy agent never triggers it. Only silence triggers it.
    const HANG_IDLE_MS = 5 * 60 * 1000; // 5 min with no new log lines = hung

    const runStart = Date.now();
    let lastLogLineCount = 0;
    let lastActivityAt = Date.now(); // updated by heartbeat on every new log line
    let logFilePrinted = false;

    const getLatestLogFile = (): string | null => {
      try {
        const files = readdirSync(logDir)
          .filter((f: string) => f.endsWith(".log"))
          .sort();
        return files.length > 0 ? `${logDir}/${files.at(-1)}` : null;
      } catch {
        return null;
      }
    };

    /** Read all log files in logDir and aggregate line counts + content. */
    const getAllLogContent = (): string => {
      try {
        const files = readdirSync(logDir)
          .filter((f: string) => f.endsWith(".log"))
          .sort();
        return files
          .map((f) => {
            try {
              return readFileSync(`${logDir}/${f}`, "utf-8");
            } catch {
              return "";
            }
          })
          .join("\n");
      } catch {
        return "";
      }
    };

    // Print actual log file path once it appears (agentfn creates it on start)
    const logFilePoller = setInterval(() => {
      if (logFilePrinted) {
        clearInterval(logFilePoller);
        return;
      }
      const logFile = getLatestLogFile();
      if (logFile) {
        console.log(`   Log   : ${logFile}`);
        console.log(`   Tip   : tail -f "${logFile}"`);
        logFilePrinted = true;
        clearInterval(logFilePoller);
      }
    }, 500);

    let stdoutSeen = false;
    let lastStderrLine = "";

    // Hang guard: rejects when lastActivityAt hasn't advanced for HANG_IDLE_MS.
    // lastActivityAt is bumped by the heartbeat on every new log line — so an
    // active agent never triggers this. Only dead silence does.
    let _hangReject: ((err: Error) => void) | null = null;
    const hangGuard = new Promise<never>((_, reject) => {
      _hangReject = reject;
    });
    const hangChecker = setInterval(() => {
      const idleMs = Date.now() - lastActivityAt;
      if (idleMs >= HANG_IDLE_MS) {
        clearInterval(hangChecker);
        const idleMins = Math.floor(idleMs / 60_000);
        _hangReject?.(
          new Error(
            `Hang detected: no new log lines for ${idleMins} minute${idleMins !== 1 ? "s" : ""}. Task killed.\n` +
              `Last activity: ${new Date(lastActivityAt).toISOString()}\n` +
              `Log lines seen: ${lastLogLineCount}`,
          ),
        );
      }
    }, 30_000); // check every 30 seconds

    const heartbeat = setInterval(() => {
      const elapsed = Math.floor((Date.now() - runStart) / 1000);
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      const elapsedStr = m > 0 ? `${m}m ${s}s` : `${s}s`;

      // Aggregate ALL log files for display purposes (show historical context)
      const allContent = getAllLogContent();

      // BUT: Only track activity from the LATEST log file to detect hangs correctly.
      // Reading all historical logs would make old crashes look like "new activity".
      const latestLogFile = getLatestLogFile();
      let currentContent = "";
      if (latestLogFile) {
        try {
          currentContent = readFileSync(latestLogFile, "utf-8");
        } catch {
          /* ignore */
        }
      }

      if (currentContent) {
        const lines = currentContent.split("\n").filter(Boolean);
        if (lines.length > lastLogLineCount) {
          lastLogLineCount = lines.length;
          lastActivityAt = Date.now(); // Only update activity if current log grows
        }
      }

      // Use allContent for display/stderr detection (shows full history)
      if (allContent) {
        if (!stdoutSeen && allContent.includes("[STDOUT]")) stdoutSeen = true;
        // Capture latest STDERR line for display
        const stderrLines = allContent
          .split("\n")
          .filter((l) => l.includes("[STDERR]"));
        if (stderrLines.length > 0) {
          lastStderrLine = stderrLines
            .at(-1)!
            .replace(/.*\[STDERR\]\s*/, "")
            .trim()
            .slice(0, 120);
        }
      }

      const idleSecs = Math.floor((Date.now() - lastActivityAt) / 1000);
      const idleStr =
        idleSecs < 60
          ? `${idleSecs}s ago`
          : `${Math.floor(idleSecs / 60)}m ${idleSecs % 60}s ago`;

      if (lastStderrLine) {
        console.log(
          `   ⏳ Still running... ${elapsedStr} elapsed — ⚠️  stderr: ${lastStderrLine}`,
        );
      } else if (!stdoutSeen && elapsed >= 60) {
        console.log(
          `   ⏳ Still running... ${elapsedStr} elapsed — ⚠️  no output yet (process may be hung)`,
        );
      } else {
        const activityNote =
          idleSecs > 30 ? ` — last activity: ${idleStr}` : "";
        console.log(
          `   ⏳ Still running... ${elapsedStr} elapsed${activityNote}`,
        );
      }
    }, 60_000);

    // Start real-time log streaming using SimpleLogTailer
    const logTailer = new SimpleLogTailer(logDir, {
      showToolCalls: true,
      showReasoning: false, // Set to true for verbose AI thinking
      showResults: true,
      showToolResults: false,
    });
    await logTailer.start();

    // Load AI configuration from project.yaml
    let resolvedAI: import("../ai/factory.ts").ResolvedAIConfig | null = null;
    try {
      const convergeDir = join(this.projectDir, ".converge");
      const projectYamlPath = join(convergeDir, "project.yaml");

      if (existsSync(projectYamlPath)) {
        const storage = new FilesystemStorage(convergeDir);
        const projectConfig = storage.readProject();

        if (projectConfig.ai) {
          resolvedAI = resolveAIConfig(projectConfig.ai);
          if (resolvedAI) {
            console.log(
              `   🤖 AI Provider: ${resolvedAI.name} (${resolvedAI.resolvedProvider})`,
            );
          }
        }
      }
    } catch (err: any) {
      // Ignore config loading errors - use defaults
      if (process.env.DEBUG) {
        console.warn(`   ⚠️  Failed to load AI config: ${err.message}`);
      }
    }

    // Set environment variables from config (for Claude CLI with custom backends like Kimi)
    const envBackup: Record<string, string | undefined> = {};
    if (resolvedAI?.env) {
      console.log(
        `   🔧 Setting env vars: ${Object.keys(resolvedAI.env).join(", ")}`,
      );
      for (const [key, value] of Object.entries(resolvedAI.env)) {
        envBackup[key] = process.env[key];
        process.env[key] = value;
      }
    }

    const agentFnProvider =
      resolvedAI?.resolvedProvider && !opts?.provider
        ? resolvedAI.resolvedProvider
        : opts?.provider;
    console.log(
      `   [spawn-runner] agentfn: provider=${agentFnProvider ?? "default"}, skills=[${allSkills.join(", ")}]`,
    );

    // NOTE: skills and skillsRoot disabled for kimi provider - causes hang
    // For kimi, we rely on the skill content being in the prompt or use skill injection
    const useSkills =
      agentFnProvider !== "kimi" &&
      agentFnProvider !== "qwen" &&
      agentFnProvider !== "gemini";

    const executor = agentfn<string>({
      prompt: opts?.prompt ?? `Execute using the \`/${skillName}\` skill.`,
      ...(useSkills ? { skillsRoot, skills: allSkills } : {}),
      allowedTools: opts?.allowedTools ?? mergedAllowedTools,
      timeoutMs: opts?.timeoutMs ?? 600_000,
      cwd: this.projectDir,
      logDir,
      signal: opts?.signal,
      // Apply AI configuration from project.yaml (if not overridden in opts)
      ...(agentFnProvider ? { provider: agentFnProvider } : {}),
      ...(resolvedAI?.apiKey && !opts?.apiKey
        ? { apiKey: resolvedAI.apiKey }
        : {}),
      ...(resolvedAI?.baseUrl && !opts?.baseUrl
        ? { baseUrl: resolvedAI.baseUrl }
        : {}),
      ...(resolvedAI?.model && !opts?.model ? { model: resolvedAI.model } : {}),
      // Hooks disabled for kimi - may cause hang
      ...(agentFnProvider !== "kimi"
        ? {
            hooks: {
              before: async ({ prompt }) => {
                console.log(`   📝 Prompt: ${prompt.slice(0, 100)}...`);
                await logTaskEvent(
                  this.projectDir,
                  this.journalCtx.epicId,
                  this.journalCtx.taskId,
                  "CLAUDEFN_PROMPT",
                  `Executing with ${allSkills.length} skill(s): ${allSkills.join(", ")}`,
                  { phase, prompt: prompt.slice(0, 500), skills: allSkills },
                );
                return prompt;
              },
              onStream: (chunk: string) => {
                stdoutSeen = true;
                const logFile = getLatestLogFile();
                if (logFile) {
                  try {
                    appendFileSync(logFile, chunk);
                  } catch {
                    /* best-effort */
                  }
                }
              },
              after: async ({ result, durationMs }) => {
                await logTaskEvent(
                  this.projectDir,
                  this.journalCtx.epicId,
                  this.journalCtx.taskId,
                  "CLAUDEFN_COMPLETE",
                  `Completed in ${(durationMs / 1000).toFixed(1)}s`,
                  { phase, durationMs, resultLength: result.length },
                );
              },
            },
          }
        : {}),
    });

    // Crash-resilient execution: retry on process crashes AND timeouts
    // with exponential backoff. Non-crash errors propagate immediately.
    const MAX_RETRIES = 3;
    let retryAttempt = 0;
    let result: AgentFnResult<string>;

    try {
      while (true) {
        try {
          result = await Promise.race([executor(), hangGuard]);
          clearInterval(hangChecker);
          clearInterval(heartbeat);
          clearInterval(logFilePoller);
          logTailer.stop(); // Stop log streaming
          break; // success — exit retry loop
        } catch (error: any) {
          const diagnosis = classifyAgentError(error);
          const isRetryable =
            diagnosis.type === "crash" || diagnosis.type === "timeout";

          // If aborted externally, don't retry at all
          if (opts?.signal?.aborted) {
            clearInterval(hangChecker);
            clearInterval(heartbeat);
            clearInterval(logFilePoller);
            logTailer.stop(); // Stop log streaming
            throw error;
          }

          // On crash or timeout, retry with backoff before giving up
          if (isRetryable && retryAttempt < MAX_RETRIES) {
            retryAttempt++;
            const delayMs = Math.min(
              2000 * Math.pow(2, retryAttempt - 1),
              16000,
            ); // 2s, 4s, 8s, 16s
            const errorType =
              diagnosis.type === "crash" ? "crashed" : "timed out";
            console.warn(
              `\n   ❌ Process ${errorType} (attempt ${retryAttempt}/${MAX_RETRIES}): ${diagnosis.summary}`,
            );
            if (diagnosis.hint) console.warn(`   💡 ${diagnosis.hint}`);
            console.warn(`   ⏳ Retrying in ${delayMs / 1000}s...`);

            await logTaskEvent(
              this.projectDir,
              this.journalCtx.epicId,
              this.journalCtx.taskId,
              diagnosis.type === "crash"
                ? "CLAUDEFN_CRASH_RETRY"
                : "CLAUDEFN_TIMEOUT_RETRY",
              `spawn ${spawnNumber} ${errorType} (attempt ${retryAttempt}/${MAX_RETRIES}): ${error.message}`,
              {
                phase,
                skillName,
                spawnNumber,
                retryAttempt,
                errorType: diagnosis.type,
                diagnosis: diagnosis.summary,
              },
            );

            await sleepMs(delayMs, opts?.signal);

            // Reset activity tracking for the retry
            lastActivityAt = Date.now();
            stdoutSeen = false;
            lastStderrLine = "";
            continue;
          }

          // Non-recoverable — clean up and throw
          clearInterval(hangChecker);
          clearInterval(heartbeat);
          clearInterval(logFilePoller);
          logTailer.stop(); // Stop log streaming

          const errorDetails = {
            phase,
            skillPath,
            skillName,
            spawnNumber,
            allSkills,
            error: error.message,
            errorStack: error.stack,
            stdoutSeen,
            lastStderrLine,
            elapsedSeconds: Math.floor((Date.now() - runStart) / 1000),
            retryAttempts: retryAttempt,
            errorType: diagnosis.type,
          };

          console.error(
            `\n   ❌ Skill execution failed [${diagnosis.type}]: ${diagnosis.summary}`,
          );
          if (diagnosis.hint) console.error(`   💡 ${diagnosis.hint}`);
          console.error(`   Skills loaded: ${allSkills.join(", ")}`);
          console.error(`   Stdout seen: ${stdoutSeen}`);
          if (retryAttempt > 0) {
            console.error(`   ⚠️  All ${MAX_RETRIES} retries exhausted`);
          }
          if (lastStderrLine) {
            console.error(`   Last stderr: ${lastStderrLine}`);
          }
          if (isRetryable && retryAttempt >= MAX_RETRIES) {
            console.error(`\n   💡 Troubleshooting steps:`);
            console.error(
              `      1. Run \`claude --version\` to verify CLI works`,
            );
            console.error(`      2. Check if antivirus is blocking Claude`);
            console.error(`      3. Review logs at: ${logDir}`);
            console.error(
              `      4. Try closing other applications to free resources`,
            );
            if (diagnosis.type === "timeout") {
              console.error(
                `      5. Check Claude API status (api.anthropic.com)`,
              );
              console.error(`      6. Review the prompt/skill complexity`);
            }
          }

          await logTaskEvent(
            this.projectDir,
            this.journalCtx.epicId,
            this.journalCtx.taskId,
            "CLAUDEFN_FAILED",
            `spawn ${spawnNumber} failed: ${error.message}`,
            errorDetails,
          );

          item.details = `${skillPath} [FAILED: ${error.message}]`;
          await this.writeStatus({
            status: "running",
            startedAt: state.startedAt,
            checklist: state.checklist,
          });
          throw error;
        }
      }

      item.done = true;
      item.doneAt = new Date().toISOString();
      await this.writeStatus({
        status: "running",
        startedAt: state.startedAt,
        checklist: state.checklist,
      });

      const elapsedSeconds = Math.floor((Date.now() - runStart) / 1000);
      console.log(`\n   ✅ Skill execution completed successfully`);
      console.log(`   Duration: ${elapsedSeconds}s`);
      console.log(`   Skills used: ${allSkills.join(", ")}`);
      console.log(`   Session ID: ${result.sessionId ?? "N/A"}`);

      await logTaskEvent(
        this.projectDir,
        this.journalCtx.epicId,
        this.journalCtx.taskId,
        "CLAUDEFN_COMPLETE",
        `spawn ${spawnNumber} done in ${result.durationMs}ms`,
        {
          phase,
          skillPath,
          skillName,
          spawnNumber,
          durationMs: result.durationMs,
          sessionId: result.sessionId,
          allSkills,
          resultLength: result.data?.length,
        },
      );

      return {
        success: true,
        durationMs: result.durationMs,
        sessionId: result.sessionId ?? "",
      };
    } finally {
      // Restore environment variables
      for (const [key, value] of Object.entries(envBackup)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  InlineTaskTarget → virtual child Unit                          */
  /* ---------------------------------------------------------------- */

  async executeSpawnInline(
    target: InlineTaskTarget,
    state: SpawnState,
    opts?: SpawnOptions,
  ): Promise<SpawnResult> {
    const label =
      opts?.label ?? target.definition.title ?? target.definition.id;
    const spawnNumber = state.counter;
    const checklistId = `subtask:spawn-${spawnNumber}`;

    const item: ChecklistItem = {
      id: checklistId,
      type: "subtask",
      description: label,
      details: target.definition.id,
      done: false,
    };
    state.checklist.push(item);
    await this.writeStatus({
      status: "running",
      startedAt: state.startedAt,
      checklist: state.checklist,
    });

    await logTaskEvent(
      this.projectDir,
      this.journalCtx.epicId,
      this.journalCtx.taskId,
      "CLAUDEFN_START",
      `spawn ${spawnNumber}: inline task '${target.definition.id}'`,
      {
        phase: `spawn_${spawnNumber}`,
        taskId: target.definition.id,
        spawnNumber,
      },
    );

    let virtualPath: string | undefined;
    if (target.writeToPath) {
      const absPath = join(this.projectDir, target.writeToPath);
      await writeInlineDefinitionToFile(
        this.projectDir,
        target.definition,
        target.writeToPath,
      );
      virtualPath = absPath;
    }

    const { Unit } = await import("../unit/index.ts");
    const childUnit = Unit.fromDefinition(
      target.definition,
      this.parentUnit,
      virtualPath,
    );

    const start = Date.now();
    let success = false;
    try {
      success = await childUnit.run();
    } catch (error: any) {
      await logTaskEvent(
        this.projectDir,
        this.journalCtx.epicId,
        this.journalCtx.taskId,
        "CLAUDEFN_FAILED",
        `spawn ${spawnNumber} inline task '${target.definition.id}' failed: ${error.message}`,
        {
          phase: `spawn_${spawnNumber}`,
          taskId: target.definition.id,
          spawnNumber,
          error: error.message,
        },
      );
      item.details = `${target.definition.id} [FAILED: ${error.message}]`;
      await this.writeStatus({
        status: "running",
        startedAt: state.startedAt,
        checklist: state.checklist,
      });
      throw error;
    }
    const durationMs = Date.now() - start;

    item.done = success;
    item.doneAt = new Date().toISOString();
    await this.writeStatus({
      status: "running",
      startedAt: state.startedAt,
      checklist: state.checklist,
    });

    await logTaskEvent(
      this.projectDir,
      this.journalCtx.epicId,
      this.journalCtx.taskId,
      "CLAUDEFN_COMPLETE",
      `spawn ${spawnNumber} inline task '${target.definition.id}' done in ${durationMs}ms`,
      {
        phase: `spawn_${spawnNumber}`,
        taskId: target.definition.id,
        spawnNumber,
        durationMs,
        success,
      },
    );

    return {
      success,
      durationMs,
      sessionId: `inline-${target.definition.id}`,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  PathRefTarget → load .ts file and run as child Unit            */
  /* ---------------------------------------------------------------- */

  async executeSpawnPathRef(
    target: PathRefTarget,
    state: SpawnState,
    opts?: SpawnOptions,
  ): Promise<SpawnResult> {
    const absPath = join(this.projectDir, target.path);

    if (!existsSync(absPath)) {
      throw new Error(
        `ctx.spawn: task file not found: ${absPath}. ` +
          `Ensure the path is relative to the project root.`,
      );
    }

    const label = opts?.label ?? target.path.split("/").pop() ?? target.path;
    const spawnNumber = state.counter;
    const checklistId = `subtask:spawn-${spawnNumber}`;

    const item: ChecklistItem = {
      id: checklistId,
      type: "subtask",
      description: label,
      details: target.path,
      done: false,
    };
    state.checklist.push(item);
    await this.writeStatus({
      status: "running",
      startedAt: state.startedAt,
      checklist: state.checklist,
    });

    await logTaskEvent(
      this.projectDir,
      this.journalCtx.epicId,
      this.journalCtx.taskId,
      "CLAUDEFN_START",
      `spawn ${spawnNumber}: path-ref '${target.path}'`,
      { phase: `spawn_${spawnNumber}`, taskPath: target.path, spawnNumber },
    );

    const { Unit } = await import("../unit/index.ts");
    const childUnit = await Unit.fromPath(absPath, this.parentUnit);

    const start = Date.now();
    let success = false;
    try {
      success = await childUnit.run();
    } catch (error: any) {
      await logTaskEvent(
        this.projectDir,
        this.journalCtx.epicId,
        this.journalCtx.taskId,
        "CLAUDEFN_FAILED",
        `spawn ${spawnNumber} path-ref '${target.path}' failed: ${error.message}`,
        {
          phase: `spawn_${spawnNumber}`,
          taskPath: target.path,
          spawnNumber,
          error: error.message,
        },
      );
      item.details = `${target.path} [FAILED: ${error.message}]`;
      await this.writeStatus({
        status: "running",
        startedAt: state.startedAt,
        checklist: state.checklist,
      });
      throw error;
    }
    const durationMs = Date.now() - start;

    item.done = success;
    item.doneAt = new Date().toISOString();
    await this.writeStatus({
      status: "running",
      startedAt: state.startedAt,
      checklist: state.checklist,
    });

    await logTaskEvent(
      this.projectDir,
      this.journalCtx.epicId,
      this.journalCtx.taskId,
      "CLAUDEFN_COMPLETE",
      `spawn ${spawnNumber} path-ref '${target.path}' done in ${durationMs}ms`,
      {
        phase: `spawn_${spawnNumber}`,
        taskPath: target.path,
        spawnNumber,
        durationMs,
        success,
      },
    );

    return {
      success,
      durationMs,
      sessionId: `path-ref-${target.path}`,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  TaskDefFactory — call factory at spawn time, run inline        */
  /* ---------------------------------------------------------------- */

  async executeSpawnFactory(
    factory: TaskDefFactory,
    state: SpawnState,
    opts?: SpawnOptions,
  ): Promise<SpawnResult> {
    return this.executeSpawnInline({ definition: factory() }, state, opts);
  }

  /* ---------------------------------------------------------------- */
  /*  TaskDefinitionBuilder — declarative skill+prompt spawn         */
  /*  taskDef().prompt('...').skills(['stitch-loop'])                 */
  /*  Resolves each skill name → .converge/skills/{name}/SKILL.md     */
  /*  and runs them in sequence with the builder's prompt.           */
  /* ---------------------------------------------------------------- */

  async executeSpawnBuilder(
    builder: TaskDefinitionBuilder,
    state: SpawnState,
    opts?: SpawnOptions,
  ): Promise<SpawnResult> {
    // Access internal def without calling build() (which requires id)
    // Use duck-type property access to handle dual-module instances
    const def =
      ((builder as any).def as Partial<
        import("../config/task-definition.ts").TaskDefinition
      >) ?? {};
    const skillField = def.skill;
    const skills = Array.isArray(skillField)
      ? skillField
      : typeof skillField === "string"
        ? [skillField]
        : [];
    const prompt = typeof def.prompt === "string" ? def.prompt : undefined;
    const needs = (def.vars?.needs as Need[] | undefined) ?? [];

    if (skills.length === 0) {
      throw new Error(
        `ctx.loop.spawn: TaskDefinitionBuilder has no skills — add .skills(['skill-name'])`,
      );
    }

    // Pre-flight: check all declared needs before spending time running
    if (needs.length > 0) {
      const failures = checkNeeds(needs, this.projectDir);
      if (failures.length > 0) {
        throw new Error(
          `Task needs not met:\n${failures.map((f) => `  ✗ ${f}`).join("\n")}`,
        );
      }
    }

    let last: SpawnResult = { success: false, durationMs: 0, sessionId: "" };
    for (let i = 0; i < skills.length; i++) {
      // Caller already incremented counter for the first skill.
      // Subsequent skills get their own counter slot.
      if (i > 0) state.counter++;
      const skillPath = `.converge/skills/${skills[i]}/SKILL.md`;
      last = await this.executeSpawnPath(skillPath, state, {
        ...opts,
        prompt: prompt ?? opts?.prompt,
        label: opts?.label ?? `${def.title ?? def.id ?? skills[i]}`,
      });
      if (!last.success) break;
    }
    return last;
  }
}

/* ------------------------------------------------------------------ */
/*  checkNeeds — pre-flight check before running a task               */
/* ------------------------------------------------------------------ */

/**
 * Check all declared needs. Returns a list of human-readable failure
 * messages. Empty array means all needs are satisfied.
 */
function checkNeeds(needs: Need[], projectDir: string): string[] {
  const failures: string[] = [];

  for (const req of needs) {
    if (req.type === "mcp-server") {
      if (!isMcpServerConfigured(req.name, projectDir)) {
        failures.push(
          `MCP server "${req.name}" is not configured. ` +
            `Add it to .claude/settings.json or ~/.claude/settings.json under mcpServers.`,
        );
      }
    }
  }

  return failures;
}

/**
 * Check if an MCP server is configured in Claude Code settings.
 * Looks in project-level .claude/settings.json first, then user-level.
 */
function isMcpServerConfigured(name: string, projectDir: string): boolean {
  const candidates = [
    join(projectDir, ".mcp.json"), // Claude Code project MCP config
    join(projectDir, ".claude", "settings.json"), // Claude Code project settings
    join(homedir(), ".claude", "settings.json"), // Claude Code user settings
  ];

  for (const settingsPath of candidates) {
    if (!existsSync(settingsPath)) continue;
    try {
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      const servers: Record<string, unknown> = settings?.mcpServers ?? {};
      // Match by exact name or name prefix (e.g. "stitch" matches "stitch-server")
      const found = Object.keys(servers).some(
        (key) =>
          key === name ||
          key.startsWith(name + "-") ||
          key.startsWith(name + "_"),
      );
      if (found) return true;
    } catch {
      /* malformed settings — treat as not configured */
    }
  }

  return false;
}

/* ------------------------------------------------------------------ */
/*  writeInlineDefinitionToFile — serialize TaskDefinition to .ts    */
/* ------------------------------------------------------------------ */

/**
 * Writes a TaskDefinition to a .ts source file.
 * Only serializes JSON-safe fields; skips executorFn, loopFn, convergeConfig.
 */
export async function writeInlineDefinitionToFile(
  projectDir: string,
  def: import("../config/task-definition.ts").TaskDefinition,
  relPath: string,
): Promise<void> {
  const absPath = join(projectDir, relPath);
  await mkdir(dirname(absPath), { recursive: true });

  const lines: string[] = [
    "import { taskDef } from '@converge/core';",
    "export default taskDef()",
  ];
  lines.push(`  .id(${JSON.stringify(def.id)})`);
  if (def.title) lines.push(`  .title(${JSON.stringify(def.title)})`);
  if (def.description)
    lines.push(`  .description(${JSON.stringify(def.description)})`);
  if (typeof def.skill === "string")
    lines.push(`  .skill(${JSON.stringify(def.skill)})`);
  else if (Array.isArray(def.skill) && def.skill.length > 0)
    lines.push(`  .skills(${JSON.stringify(def.skill)})`);
  if (def.agent) lines.push(`  .agent(${JSON.stringify(def.agent)})`);
  if (typeof def.prompt === "string")
    lines.push(`  .prompt(${JSON.stringify(def.prompt)})`);
  if (def.inputs?.length)
    lines.push(`  .inputs(${JSON.stringify(def.inputs)})`);
  if (def.outputs?.length)
    lines.push(`  .outputs(${JSON.stringify(def.outputs)})`);
  if (def.tags?.length) lines.push(`  .tags(${JSON.stringify(def.tags)})`);
  if (def.vars && Object.keys(def.vars).length > 0) {
    lines.push(`  .vars(${JSON.stringify(def.vars)})`);
  }
  if (Array.isArray(def.checks) && def.checks.length > 0) {
    lines.push(`  .checks(${JSON.stringify(def.checks)})`);
  }
  lines.push("  .build();");

  await writeFile(absPath, lines.join("\n") + "\n", "utf-8");
}
