/**
 * Epic Context Implementation
 *
 * Epic-level context that inherits from ProjectContext.
 */

import type {
  EpicContext,
  ProjectContext,
  EvalAPI,
  PlanAPI,
  CheckAPI,
} from "./types.ts";
import type { JournalAPI } from "../journal/types.ts";
import type { EpicConfig, EpicStatus, TaskConfig } from "../storage/types.ts";
import type { Gap, CheckResult, EvalResult } from "../gap/types.ts";
import {
  FileSystemAPIImpl,
  ShellAPIImpl,
  GitAPIImpl,
  LoggerAPIImpl,
} from "./base.ts";
import { ArtifactStore } from "../artifacts/index.ts";
import { FilesystemStorage } from "../storage/filesystem.ts";
import { StatusManager } from "../storage/status.ts";
import { globalRegistry } from "../functions/registry.ts";
import { join } from "node:path";
import { getJournalStructure } from "../journal/structure.ts";

/* ------------------------------------------------------------------ */
/*  Eval API Implementation (Epic Level)                              */
/* ------------------------------------------------------------------ */

class EpicEvalAPI implements EvalAPI {
  constructor(
    private ctx: EpicContextImpl,
    private storage: FilesystemStorage,
  ) {}

  async detectGaps(): Promise<EvalResult> {
    // Get checks configured for this epic
    const checksToRun = this.ctx.config.goals.flatMap((goal) => {
      // Extract check names from goals
      // This is simplified - real implementation would parse goal syntax
      return [];
    });

    const checkResults = await this.runChecks(checksToRun);
    const allGaps = checkResults.flatMap((r) => r.gaps);

    // Filter gaps to only those in this epic's scope
    const epicGaps = allGaps.filter(
      (g) => g.scope === this.ctx.epicId || g.level === "epic",
    );

    const byType: Record<string, number> = {};
    const byLevel: Record<string, number> = {};

    for (const gap of epicGaps) {
      byType[gap.type] = (byType[gap.type] || 0) + 1;
      byLevel[gap.level] = (byLevel[gap.level] || 0) + 1;
    }

    return {
      gaps: epicGaps,
      summary: {
        total: epicGaps.length,
        byType,
        byLevel,
      },
      timestamp: new Date().toISOString(),
      checksRun: checksToRun,
    };
  }

  async runChecks(checks: string[]): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    for (const checkName of checks) {
      const checkMeta = globalRegistry.getCheck(checkName);
      if (!checkMeta) {
        this.ctx.log.warn(`Check "${checkName}" not found, skipping`);
        continue;
      }

      try {
        const result = await checkMeta.fn(this.ctx);
        results.push(result);
      } catch (error: any) {
        this.ctx.log.error(`Check "${checkName}" failed: ${error.message}`);
        results.push({
          check: checkName,
          passed: false,
          gaps: [],
          message: error.message,
        });
      }
    }

    return results;
  }

  async getCurrentGaps(): Promise<Gap[]> {
    // Get gaps for this epic from status
    return this.ctx.status.currentGaps.map((gapId) => ({
      id: gapId,
      type: "structural" as const,
      level: "epic" as const,
      scope: this.ctx.epicId,
      description: gapId,
      detected: new Date().toISOString(),
      resolved: false,
      checks: [],
    }));
  }

  async compareInvariants(invariants: string[]): Promise<Gap[]> {
    // This would implement invariant checking logic
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Plan API Implementation (Epic Level)                              */
/* ------------------------------------------------------------------ */

class EpicPlanAPI implements PlanAPI {
  constructor(
    private ctx: EpicContextImpl,
    private storage: FilesystemStorage,
  ) {}

  async generateTasks(gaps: Gap[]): Promise<TaskConfig[]> {
    // Get all plan functions and run them
    const planFns = Array.from(globalRegistry.getRegistry().plans.values());
    const allTasks: TaskConfig[] = [];

    for (const planMeta of planFns) {
      // Filter gaps this planner can handle
      const relevantGaps = planMeta.gapTypes
        ? gaps.filter((g) => planMeta.gapTypes!.includes(g.type))
        : gaps;

      if (relevantGaps.length === 0) continue;

      try {
        const tasks = await planMeta.fn(this.ctx, relevantGaps);
        allTasks.push(...tasks);
      } catch (error: any) {
        this.ctx.log.error(
          `Plan function "${planMeta.name}" failed: ${error.message}`,
        );
      }
    }

    return allTasks;
  }

  async getNextTasks(): Promise<TaskConfig[]> {
    // Get pending tasks from this epic
    const taskIds = this.storage.listTasks(this.ctx.epicId);
    const tasks: TaskConfig[] = [];

    for (const taskId of taskIds) {
      const config = this.storage.readTaskConfig(this.ctx.epicId, taskId);
      tasks.push(config);
    }

    return tasks;
  }

  async isComplete(): Promise<boolean> {
    const gaps = await this.ctx.eval.getCurrentGaps();
    return gaps.length === 0;
  }

  getPlanPath(relativePath: string): string {
    throw new Error(
      "getPlanPath() is only available in WBS task context. Use ctx.plan.getPlanPath() within .wbs() functions.",
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Epic Context Implementation                                       */
/* ------------------------------------------------------------------ */

export class EpicContextImpl implements EpicContext {
  readonly level = "epic" as const;
  readonly projectDir: string;
  readonly convergeDir: string;
  readonly epicId: string;
  readonly vars: Readonly<Record<string, unknown>>;
  readonly config: Readonly<EpicConfig>;
  readonly status: Readonly<EpicStatus>;
  readonly project: Readonly<ProjectContext>;

  readonly fs: FileSystemAPIImpl;
  readonly shell: ShellAPIImpl;
  readonly git: GitAPIImpl;
  readonly log: LoggerAPIImpl;
  readonly artifact: ArtifactStore;
  readonly eval: EvalAPI;
  readonly plan: PlanAPI;
  readonly check: CheckAPI;
  readonly journal: JournalAPI;

  constructor(
    epicId: string,
    config: EpicConfig,
    status: EpicStatus,
    projectContext: ProjectContext,
    storage: FilesystemStorage,
  ) {
    this.epicId = epicId;
    this.projectDir = projectContext.projectDir;
    this.convergeDir = projectContext.convergeDir;
    this.config = Object.freeze(config);
    this.status = Object.freeze(status);
    this.project = Object.freeze(projectContext);

    // Merge project vars with epic-specific vars
    this.vars = Object.freeze({
      ...projectContext.vars,
      epicId,
    });

    // Initialize APIs (inherit from project)
    this.fs = new FileSystemAPIImpl(this.projectDir);
    this.shell = new ShellAPIImpl(this.projectDir);
    this.git = new GitAPIImpl(this.projectDir);
    this.log = new LoggerAPIImpl(`epic:${epicId}`);
    this.artifact = new ArtifactStore(this.projectDir);
    this.eval = new EpicEvalAPI(this, storage);
    this.plan = new EpicPlanAPI(this, storage);
    this.check = {
      run: async () => ({ check: "", passed: true, gaps: [] }),
      runAll: async () => [],
      validateOutputs: async () => ({
        check: "outputs",
        passed: true,
        gaps: [],
      }),
    };
    this.journal = {
      getGaps: async () => [],
      getSummary: async () => ({
        total: 0,
        byType: {},
        bySeverity: {},
        updated: new Date().toISOString(),
        gaps: [],
      }),
      getRecentEvents: async () => [],
      findErrors: async () => [],
      searchLog: async () => [],
      readLog: async () => [],
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Factory Function                                                  */
/* ------------------------------------------------------------------ */

/**
 * Create a new epic context
 */
export function createEpicContext(
  epicId: string,
  config: EpicConfig,
  status: EpicStatus,
  projectContext: ProjectContext,
  storage: FilesystemStorage,
): EpicContext {
  return new EpicContextImpl(epicId, config, status, projectContext, storage);
}
