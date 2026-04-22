/**
 * Project Context Implementation
 *
 * Top-level context for project-wide operations.
 */

import type {
  ProjectContext,
  EvalAPI,
  PlanAPI,
  PluginAPI,
  CheckAPI,
} from "./types.ts";
import type { JournalAPI } from "../journal/types.ts";
import type { ProjectConfig } from "../storage/types.ts";
import type { Gap, CheckResult, EvalResult } from "../gap/types.ts";
import type { TaskConfig } from "../storage/types.ts";
import {
  FileSystemAPIImpl,
  ShellAPIImpl,
  GitAPIImpl,
  LoggerAPIImpl,
} from "./base.ts";
import { ArtifactStore } from "../artifacts/index.ts";
import { FilesystemStorage } from "../storage/filesystem.ts";
import { globalRegistry } from "../functions/registry.ts";
import { resolve } from "node:path";

/* ------------------------------------------------------------------ */
/*  Eval API Implementation (Project Level)                           */
/* ------------------------------------------------------------------ */

class ProjectEvalAPI implements EvalAPI {
  constructor(
    private ctx: ProjectContextImpl,
    private storage: FilesystemStorage,
  ) {}

  async detectGaps(): Promise<EvalResult> {
    const checksToRun = this.ctx.config.plugins.flatMap((p) => {
      // Extract check names from plugin config
      // This is simplified - real implementation would query loaded plugins
      return [];
    });

    const checkResults = await this.runChecks(checksToRun);
    const allGaps = checkResults.flatMap((r) => r.gaps);

    const byType: Record<string, number> = {};
    const byLevel: Record<string, number> = {};

    for (const gap of allGaps) {
      byType[gap.type] = (byType[gap.type] || 0) + 1;
      byLevel[gap.level] = (byLevel[gap.level] || 0) + 1;
    }

    return {
      gaps: allGaps,
      summary: {
        total: allGaps.length,
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
    const snapshot = this.storage.readLatestGapSnapshot();
    return snapshot?.gaps || [];
  }

  async compareInvariants(invariants: string[]): Promise<Gap[]> {
    // This would implement invariant checking logic
    // For now, return empty array
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Plan API Implementation (Project Level)                           */
/* ------------------------------------------------------------------ */

class ProjectPlanAPI implements PlanAPI {
  constructor(
    private ctx: ProjectContextImpl,
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
        // Note: PlanFn takes ProjectContext
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
    // This would query the storage for pending tasks
    return [];
  }

  async isComplete(): Promise<boolean> {
    const gaps = await this.ctx.eval.getCurrentGaps();
    return gaps.length === 0;
  }

  getPlanPath(relativePath: string): string {
    return resolve(this.ctx.projectDir, relativePath);
  }
}

/* ------------------------------------------------------------------ */
/*  Plugin API Implementation (Project Level)                         */
/* ------------------------------------------------------------------ */

class ProjectPluginAPI implements PluginAPI {
  constructor(private loadedPlugins: string[]) {}

  getLoaded(): string[] {
    return this.loadedPlugins;
  }

  has(pluginName: string): boolean {
    return this.loadedPlugins.includes(pluginName);
  }

  getConfig(pluginName: string): Record<string, unknown> | undefined {
    // Would return plugin config from project.yaml
    return undefined;
  }

  getChecks(): Record<string, unknown> {
    const checks: Record<string, unknown> = {};
    for (const [name, meta] of globalRegistry.getRegistry().checks) {
      checks[name] = meta;
    }
    return checks;
  }

  getTaskTypes(): string[] {
    return Array.from(globalRegistry.getRegistry().tasks.keys());
  }
}

/* ------------------------------------------------------------------ */
/*  Project Context Implementation                                    */
/* ------------------------------------------------------------------ */

export class ProjectContextImpl implements ProjectContext {
  readonly level = "project" as const;
  readonly projectDir: string;
  readonly convergeDir: string;
  readonly vars: Readonly<Record<string, unknown>>;
  readonly config: Readonly<ProjectConfig>;
  readonly epicId: string;

  readonly fs: FileSystemAPIImpl;
  readonly shell: ShellAPIImpl;
  readonly git: GitAPIImpl;
  readonly log: LoggerAPIImpl;
  readonly artifact: ArtifactStore;
  readonly eval: EvalAPI;
  readonly plan: PlanAPI;
  readonly plugins: PluginAPI;
  readonly check: CheckAPI;
  readonly journal: JournalAPI;

  constructor(
    projectDir: string,
    config: ProjectConfig,
    storage: FilesystemStorage,
    loadedPlugins: string[] = [],
    epicId: string = "default",
  ) {
    this.projectDir = projectDir;
    this.convergeDir = `${projectDir}/.converge`;
    this.vars = Object.freeze({ ...config.variables });
    this.config = Object.freeze(config);
    this.epicId = epicId;

    // Initialize APIs
    this.fs = new FileSystemAPIImpl(projectDir);
    this.shell = new ShellAPIImpl(projectDir);
    this.git = new GitAPIImpl(projectDir);
    this.artifact = new ArtifactStore(projectDir);
    this.log = new LoggerAPIImpl("project");
    this.eval = new ProjectEvalAPI(this, storage);
    this.plan = new ProjectPlanAPI(this, storage);
    this.plugins = new ProjectPluginAPI(loadedPlugins);
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
 * Create a new project context
 */
export function createProjectContext(
  projectDir: string,
  config: ProjectConfig,
  storage: FilesystemStorage,
  loadedPlugins?: string[],
  epicId?: string,
): ProjectContext {
  return new ProjectContextImpl(projectDir, config, storage, loadedPlugins, epicId);
}
