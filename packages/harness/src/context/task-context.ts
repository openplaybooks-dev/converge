/**
 * Task Context Implementation
 *
 * Task-level context that inherits from EpicContext.
 */

import type {
  TaskContext,
  EpicContext,
  ProjectContext,
  CheckAPI,
} from './types.ts';
import type { TaskConfig, TaskStatus } from '../storage/types.ts';
import type { CheckResult } from '../gap/types.ts';
import type { JournalAPI } from '../journal/types.ts';
import { FileSystemAPIImpl, ShellAPIImpl, GitAPIImpl, LoggerAPIImpl } from './base.ts';
import { ArtifactStore } from '../artifacts/index.ts';
import { FilesystemStorage } from '../storage/filesystem.ts';
import { globalRegistry } from '../functions/registry.ts';
import { createTaskJournalAPI } from '../journal/api.ts';

/* ------------------------------------------------------------------ */
/*  Check API Implementation (Task Level)                             */
/* ------------------------------------------------------------------ */

class TaskCheckAPI implements CheckAPI {
  constructor(
    private ctx: TaskContextImpl,
    private storage: FilesystemStorage
  ) {}

  async run(checkName: string): Promise<CheckResult> {
    const checkMeta = globalRegistry.getCheck(checkName);
    if (!checkMeta) {
      throw new Error(`Check "${checkName}" not found`);
    }

    try {
      const result = await checkMeta.fn(this.ctx);
      return result;
    } catch (error: any) {
      this.ctx.log.error(`Check "${checkName}" failed: ${error.message}`);
      return {
        check: checkName,
        passed: false,
        gaps: [],
        message: error.message,
      };
    }
  }

  async runAll(): Promise<CheckResult[]> {
    const checks = this.ctx.config.checks || [];
    const results: CheckResult[] = [];

    for (const checkName of checks) {
      const result = await this.run(checkName);
      results.push(result);
    }

    return results;
  }

  async validateOutputs(): Promise<CheckResult> {
    const outputs = this.ctx.config.outputs || [];
    const missingOutputs: string[] = [];

    for (const output of outputs) {
      const exists = await this.ctx.fs.exists(output);
      if (!exists) {
        missingOutputs.push(output);
      }
    }

    if (missingOutputs.length > 0) {
      return {
        check: 'validate-outputs',
        passed: false,
        gaps: [
          {
            id: `missing-outputs-${this.ctx.taskId}`,
            type: 'structural',
            level: 'task',
            scope: this.ctx.taskId,
            description: `Missing expected outputs: ${missingOutputs.join(', ')}`,
            detected: new Date().toISOString(),
            resolved: false,
            checks: ['validate-outputs'],
          },
        ],
        message: `Missing expected outputs: ${missingOutputs.join(', ')}`,
      };
    }

    return {
      check: 'validate-outputs',
      passed: true,
      gaps: [],
      message: 'All expected outputs present',
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Task Context Implementation                                       */
/* ------------------------------------------------------------------ */

export class TaskContextImpl implements TaskContext {
  readonly level = 'task' as const;
  readonly projectDir: string;
  readonly harnessDir: string;
  readonly taskId: string;
  readonly vars: Readonly<Record<string, unknown>>;
  readonly config: Readonly<TaskConfig>;
  readonly status: Readonly<TaskStatus>;
  readonly epic: Readonly<EpicContext>;
  readonly project: Readonly<ProjectContext>;

  readonly fs: FileSystemAPIImpl;
  readonly shell: ShellAPIImpl;
  readonly git: GitAPIImpl;
  readonly log: LoggerAPIImpl;
  readonly artifact: ArtifactStore;
  readonly check: CheckAPI;
  readonly journal: JournalAPI;

  constructor(
    taskId: string,
    config: TaskConfig,
    status: TaskStatus,
    epicContext: EpicContext,
    storage: FilesystemStorage
  ) {
    this.taskId = taskId;
    this.projectDir = epicContext.projectDir;
    this.harnessDir = epicContext.harnessDir;
    this.config = Object.freeze(config);
    this.status = Object.freeze(status);
    this.epic = Object.freeze(epicContext);
    this.project = Object.freeze(epicContext.project);

    // Merge epic vars with task-specific vars
    this.vars = Object.freeze({
      ...epicContext.vars,
      ...config.vars,
      taskId,
    });

    // Initialize APIs (inherit from epic)
    this.fs = new FileSystemAPIImpl(this.projectDir);
    this.shell = new ShellAPIImpl(this.projectDir);
    this.git = new GitAPIImpl(this.projectDir);
    this.log = new LoggerAPIImpl(`task:${taskId}`);
    this.artifact = new ArtifactStore(this.projectDir);
    this.check = new TaskCheckAPI(this, storage);
    this.journal = createTaskJournalAPI(this.projectDir, epicContext.epicId, taskId);
  }
}

/* ------------------------------------------------------------------ */
/*  Factory Function                                                  */
/* ------------------------------------------------------------------ */

/**
 * Create a new task context
 */
export function createTaskContext(
  taskId: string,
  config: TaskConfig,
  status: TaskStatus,
  epicContext: EpicContext,
  storage: FilesystemStorage
): TaskContext {
  return new TaskContextImpl(taskId, config, status, epicContext, storage);
}
