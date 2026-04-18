/**
 * Function Builders
 *
 * Provides ergonomic builder APIs for creating check, eval, plan, and task functions.
 */

import type {
  CheckFn,
  CheckFnMeta,
  EvalFn,
  EvalFnMeta,
  PlanFn,
  PlanFnMeta,
  TaskFn,
  TaskFnMeta,
  CheckBuilder as ICheckBuilder,
  EvalBuilder as IEvalBuilder,
  PlanBuilder as IPlanBuilder,
  TaskBuilder as ITaskBuilder,
} from "./types.ts";

/* ------------------------------------------------------------------ */
/*  Check Function Builder                                            */
/* ------------------------------------------------------------------ */

class CheckBuilderImpl implements ICheckBuilder {
  private _name?: string;
  private _description?: string;
  private _category?: CheckFnMeta["category"];
  private _timeout?: number;
  private _parallel: boolean = false;

  name(name: string): this {
    this._name = name;
    return this;
  }

  description(description: string): this {
    this._description = description;
    return this;
  }

  category(category: CheckFnMeta["category"]): this {
    this._category = category;
    return this;
  }

  timeout(ms: number): this {
    this._timeout = ms;
    return this;
  }

  parallel(enabled: boolean = true): this {
    this._parallel = enabled;
    return this;
  }

  run(fn: CheckFn): CheckFnMeta {
    if (!this._name) {
      throw new Error("Check name is required. Call .name() before .run()");
    }
    if (!this._description) {
      throw new Error(
        "Check description is required. Call .description() before .run()",
      );
    }

    return {
      name: this._name,
      description: this._description,
      fn,
      category: this._category,
      timeout: this._timeout,
      parallel: this._parallel,
    };
  }
}

/**
 * Create a new check function builder
 *
 * @example
 * const tscCheck = check()
 *   .name('typescript')
 *   .description('Run TypeScript compiler')
 *   .category('build')
 *   .timeout(30000)
 *   .parallel(true)
 *   .run(async (ctx) => {
 *     const result = await ctx.shell.exec('tsc --noEmit');
 *     return {
 *       check: 'typescript',
 *       passed: result.success,
 *       gaps: result.success ? [] : [{
 *         id: 'tsc-error',
 *         type: 'semantic',
 *         level: 'project',
 *         scope: ctx.projectDir,
 *         description: 'TypeScript compilation errors',
 *         detected: new Date().toISOString(),
 *         resolved: false,
 *         checks: ['typescript'],
 *       }],
 *       message: result.stderr,
 *     };
 *   });
 */
export function check(): ICheckBuilder {
  return new CheckBuilderImpl();
}

/* ------------------------------------------------------------------ */
/*  Eval Function Builder                                             */
/* ------------------------------------------------------------------ */

class EvalBuilderImpl implements IEvalBuilder {
  private _name?: string;
  private _description?: string;
  private _checks: string[] = [];
  private _invariants: string[] = [];

  name(name: string): this {
    this._name = name;
    return this;
  }

  description(description: string): this {
    this._description = description;
    return this;
  }

  checks(checks: string[]): this {
    this._checks = checks;
    return this;
  }

  invariants(invariants: string[]): this {
    this._invariants = invariants;
    return this;
  }

  run(fn: EvalFn): EvalFnMeta {
    if (!this._name) {
      throw new Error("Eval name is required. Call .name() before .run()");
    }
    if (!this._description) {
      throw new Error(
        "Eval description is required. Call .description() before .run()",
      );
    }

    return {
      name: this._name,
      description: this._description,
      fn,
      checks: this._checks,
      invariants: this._invariants,
    };
  }
}

/**
 * Create a new eval function builder
 *
 * @example
 * const projectEval = evalFn()
 *   .name('project-structure')
 *   .description('Validate project structure')
 *   .checks(['typescript', 'eslint'])
 *   .invariants(['src/ exists', 'package.json exists'])
 *   .run(async (ctx) => {
 *     const checkResults = await ctx.eval.runChecks(['typescript', 'eslint']);
 *     const gaps = checkResults.flatMap(r => r.gaps);
 *     return {
 *       gaps,
 *       summary: {
 *         total: gaps.length,
 *         byType: { structural: 1, semantic: 2 },
 *         byLevel: { project: 3 },
 *       },
 *       timestamp: new Date().toISOString(),
 *       checksRun: ['typescript', 'eslint'],
 *     };
 *   });
 */
export function evalFn(): IEvalBuilder {
  return new EvalBuilderImpl();
}

// Alias for backward compatibility (avoiding 'eval' keyword in strict mode)
export { evalFn as eval };

/* ------------------------------------------------------------------ */
/*  Plan Function Builder                                             */
/* ------------------------------------------------------------------ */

class PlanBuilderImpl implements IPlanBuilder {
  private _name?: string;
  private _description?: string;
  private _gapTypes: string[] = [];
  private _priority?: number;

  name(name: string): this {
    this._name = name;
    return this;
  }

  description(description: string): this {
    this._description = description;
    return this;
  }

  handles(gapTypes: string[]): this {
    this._gapTypes = gapTypes;
    return this;
  }

  priority(priority: number): this {
    this._priority = priority;
    return this;
  }

  run(fn: PlanFn): PlanFnMeta {
    if (!this._name) {
      throw new Error("Plan name is required. Call .name() before .run()");
    }
    if (!this._description) {
      throw new Error(
        "Plan description is required. Call .description() before .run()",
      );
    }

    return {
      name: this._name,
      description: this._description,
      fn,
      gapTypes: this._gapTypes,
      priority: this._priority,
    };
  }
}

/**
 * Create a new plan function builder
 *
 * @example
 * const structuralPlan = plan()
 *   .name('structural-planner')
 *   .description('Generate tasks for structural gaps')
 *   .handles(['structural'])
 *   .priority(10)
 *   .run(async (ctx, gaps) => {
 *     return gaps.map(gap => ({
 *       id: `fix-${gap.id}`,
 *       title: `Fix ${gap.description}`,
 *       type: 'coding',
 *       deps: [],
 *       metadata: { created: new Date().toISOString() },
 *     }));
 *   });
 */
export function plan(): IPlanBuilder {
  return new PlanBuilderImpl();
}

/* ------------------------------------------------------------------ */
/*  Task Function Builder                                             */
/* ------------------------------------------------------------------ */

class TaskBuilderImpl implements ITaskBuilder {
  private _type?: string;
  private _description?: string;
  private _inputs?: string[];
  private _outputs?: string[];
  private _checks: string[] = [];
  private _maxAttempts?: number;
  private _timeout?: number;
  private _parallel: boolean = false;

  type(type: string): this {
    this._type = type;
    return this;
  }

  description(description: string): this {
    this._description = description;
    return this;
  }

  inputs(inputs: string[]): this {
    this._inputs = inputs;
    return this;
  }

  outputs(outputs: string[]): this {
    this._outputs = outputs;
    return this;
  }

  checks(checks: string[]): this {
    this._checks = checks;
    return this;
  }

  maxAttempts(attempts: number): this {
    this._maxAttempts = attempts;
    return this;
  }

  timeout(ms: number): this {
    this._timeout = ms;
    return this;
  }

  parallel(enabled: boolean = true): this {
    this._parallel = enabled;
    return this;
  }

  run(fn: TaskFn): TaskFnMeta {
    if (!this._type) {
      throw new Error("Task type is required. Call .type() before .run()");
    }
    if (!this._description) {
      throw new Error(
        "Task description is required. Call .description() before .run()",
      );
    }

    return {
      type: this._type,
      description: this._description,
      fn,
      inputs: this._inputs,
      outputs: this._outputs,
      checks: this._checks,
      maxAttempts: this._maxAttempts,
      timeout: this._timeout,
      parallel: this._parallel,
    };
  }

  execute(fn: TaskFn): TaskFnMeta {
    return this.run(fn);
  }
}

/**
 * Create a new task function builder
 *
 * @example
 * const installTask = task()
 *   .type('install')
 *   .description('Install project dependencies')
 *   .outputs(['node_modules/', 'package-lock.json'])
 *   .checks(['dependencies-installed'])
 *   .maxAttempts(3)
 *   .timeout(60000)
 *   .run(async (ctx) => {
 *     const result = await ctx.shell.exec('npm install');
 *     return {
 *       success: result.success,
 *       message: result.success ? 'Dependencies installed' : 'Installation failed',
 *       gapsResolved: result.success ? ['missing-dependencies'] : [],
 *       error: result.success ? undefined : {
 *         message: result.stderr,
 *         recoverable: true,
 *       },
 *     };
 *   });
 */
export function task(): ITaskBuilder {
  return new TaskBuilderImpl();
}

/* ------------------------------------------------------------------ */
/*  Task Definition Builder (for reusable task configs)              */
/* ------------------------------------------------------------------ */

import type {
  TaskDefBuilder as ITaskDefBuilder,
  EpicBuilder as IEpicBuilder,
  ProjectBuilder as IProjectBuilder,
  EpicDefinition,
  ProjectDefinition,
} from "./types.ts";
import type { TaskConfig, ProjectConfig } from "../storage/types.ts";

class TaskDefBuilderImpl implements ITaskDefBuilder {
  private _id?: string;
  private _title?: string;
  private _description?: string;
  private _type?: string;
  private _deps: string[] = [];
  private _inputs?: string[];
  private _outputs?: string[];
  private _checks?: string[];
  private _fn?: string;
  private _vars: Record<string, unknown> = {};
  private _constraints?: {
    sequential?: boolean;
    parallel?: boolean;
    maxAttempts?: number;
    timeout?: number;
    condition?: string;
  };
  private _metadata?: Record<string, unknown>;
  private _milestone?: string;

  id(id: string): this {
    this._id = id;
    return this;
  }

  title(title: string): this {
    this._title = title;
    return this;
  }

  description(description: string): this {
    this._description = description;
    return this;
  }

  type(type: string): this {
    this._type = type;
    return this;
  }

  deps(deps: string[]): this {
    this._deps = deps;
    return this;
  }

  inputs(inputs: string[]): this {
    this._inputs = inputs;
    return this;
  }

  outputs(outputs: string[]): this {
    this._outputs = outputs;
    return this;
  }

  checks(checks: string[]): this {
    this._checks = checks;
    return this;
  }

  check(inlineCheck: {
    id: string;
    cmd?: string;
    prompt?: string;
    description?: string;
    files?: string[];
  }): this {
    const existing =
      (this._vars.inlineChecks as (typeof inlineCheck)[] | undefined) ?? [];
    this._vars.inlineChecks = [...existing, inlineCheck];
    return this;
  }

  fn(fn: string): this {
    this._fn = fn;
    return this;
  }

  vars(vars: Record<string, unknown>): this {
    this._vars = { ...this._vars, ...vars };
    return this;
  }

  constraints(constraints: {
    sequential?: boolean;
    parallel?: boolean;
    maxAttempts?: number;
    timeout?: number;
    condition?: string;
  }): this {
    this._constraints = constraints;
    return this;
  }

  metadata(metadata: Record<string, unknown>): this {
    this._metadata = metadata;
    return this;
  }

  /* ------------------------------------------------------------------ */
  /*  V1-Style Fluent API Methods                                       */
  /* ------------------------------------------------------------------ */

  prompt(prompt: string): this {
    this._vars.prompt = prompt;
    return this;
  }

  skill(skill: string): this {
    this._vars.skill = skill;
    return this;
  }

  agent(agent: string): this {
    this._vars.agent = agent;
    return this;
  }

  loop(config: { maxIterations: number; continueWhile?: string }): this {
    this._vars.loop = config;
    return this;
  }

  yields(config: import("./types.ts").YieldsConfig): this {
    this._vars.yields = config;
    return this;
  }

  subtasks(config: import("../subtasks/types.ts").SubtasksConfig): this {
    this._vars.subtasks = config;
    return this;
  }

  autoConverge(config: import("./types.ts").AutoConvergeConfig): this {
    this._vars.autoConverge = config;
    return this;
  }

  milestone(id: string): this {
    this._milestone = id;
    return this;
  }

  run(fn: TaskFn): this {
    // Store function reference
    // In real implementation, this would register the function and store a reference
    this._fn = `task-${this._id || "anonymous"}`;
    this._vars.runFn = true; // Mark that run() was called
    return this;
  }

  execute(fn: TaskFn): this {
    return this.run(fn);
  }

  build(): TaskConfig {
    if (!this._id) {
      throw new Error("Task ID is required. Call .id() before .build()");
    }
    if (!this._title) {
      throw new Error("Task title is required. Call .title() before .build()");
    }

    const now = new Date().toISOString();

    // Ensure maxAttempts has a default value if constraints are specified
    const constraints = this._constraints
      ? {
          ...this._constraints,
          maxAttempts: this._constraints.maxAttempts ?? 3,
        }
      : undefined;

    // AUTO-ENABLE AutoConverge if not explicitly configured
    if (!this._vars.autoConverge) {
      this._vars.autoConverge = {
        enabled: true,
        from: "task-prompt",
        refinable: true,
        maxRefinements: 3,
        cache: true,
        strictness: 0.9,
      };
    }

    // AUTO-ENABLE Yields if not explicitly configured
    if (!this._vars.yields) {
      this._vars.yields = {
        enabled: true,
        plan: "Auto-detect gaps and spawn tasks as needed",
        maxTasks: 10,
        when: undefined, // Always enabled
      };
    }

    return {
      id: this._id,
      title: this._title,
      description: this._description,
      type: this._type,
      fn: this._fn,
      deps: this._deps,
      inputs: this._inputs,
      outputs: this._outputs,
      checks: this._checks,
      vars: Object.keys(this._vars).length > 0 ? this._vars : undefined,
      constraints,
      metadata: {
        created: now,
        updated: now,
        ...(this._milestone ? { milestone: this._milestone } : {}),
        ...this._metadata,
      },
    };
  }
}

/**
 * Create a new task definition builder
 *
 * @example
 * // V2-style (explicit builder):
 * const analyzeSheets = taskDef()
 *   .id('analyze-sheets-data')
 *   .title('Analyze Google Sheets Data')
 *   .type('agent-task')
 *   .outputs(['data-modeling/modeling.md', 'data-modeling/schema.sql'])
 *   .checks(['data-modeling-files'])
 *   .build();
 *
 * @example
 * // V1-style (fluent API):
 * const generateScreens = taskDef()
 *   .id('generate-screens')
 *   .title('Generate All Screens')
 *   .prompt('Generate next unchecked screen from SITE.md')
 *   .skill('stitch-loop')
 *   .agent('ux-designer')
 *   .deps(['design-system'])
 *   .inputs(['.stitch/SITE.md', '.stitch/DESIGN.md'])
 *   .outputs(['.stitch/designs/*.html'])
 *   .loop({ maxIterations: 20, continueWhile: 'sitemap-has-unchecked' })
 *   .yields('validate-screen-fn')
 *   .checks(['screens-complete'])
 *   .run(async (ctx) => {
 *     await ctx.skill.invoke('stitch-loop');
 *     return { success: true };
 *   });
 */
export function taskDef(): ITaskDefBuilder {
  return new TaskDefBuilderImpl();
}

/* ------------------------------------------------------------------ */
/*  Epic Builder                                                      */
/* ------------------------------------------------------------------ */

import type { Goal } from "../goal/types.ts";

class EpicBuilderImpl implements IEpicBuilder {
  private _id?: string;
  private _name?: string;
  private _description?: string;
  private _goals: Goal[] = [];
  private _deps: string[] = [];
  private _checks: CheckFnMeta[] = [];
  private _evals: EvalFnMeta[] = [];
  private _planners: PlanFnMeta[] = [];
  private _tasks: TaskConfig[] = [];

  id(id: string): this {
    this._id = id;
    return this;
  }

  name(name: string): this {
    this._name = name;
    return this;
  }

  description(description: string): this {
    this._description = description;
    return this;
  }

  goals(goals: Goal[]): this {
    this._goals = goals;
    return this;
  }

  goal(goal: Goal): this {
    this._goals.push(goal);
    return this;
  }

  deps(deps: string[]): this {
    this._deps = deps;
    return this;
  }

  check(check: CheckFnMeta): this {
    this._checks.push(check);
    return this;
  }

  eval(evalMeta: EvalFnMeta): this {
    this._evals.push(evalMeta);
    return this;
  }

  planner(planner: PlanFnMeta): this {
    this._planners.push(planner);
    return this;
  }

  task(task: TaskConfig): this {
    this._tasks.push(task);
    return this;
  }

  build(): EpicDefinition {
    if (!this._id) {
      throw new Error("Epic ID is required. Call .id() before .build()");
    }
    if (!this._name) {
      throw new Error("Epic name is required. Call .name() before .build()");
    }

    return {
      id: this._id,
      name: this._name,
      description: this._description,
      goals: this._goals,
      deps: this._deps,
      checks: this._checks,
      evals: this._evals,
      planners: this._planners,
      tasks: this._tasks,
    };
  }
}

/**
 * Create a new epic builder
 *
 * @example
 * const dataAnalysisEpic = epic()
 *   .id('data-analysis')
 *   .name('Data Analysis & Schema Design')
 *   .goals([dataModelingGoal]) // Goals are Goal objects
 *   .check(dataModelingCheck)
 *   .eval(dataAnalysisEval)
 *   .planner(dataAnalysisPlanner)
 *   .task(analyzeSheets)
 *   .build();
 */
export function epic(): IEpicBuilder {
  return new EpicBuilderImpl();
}

/**
 * Define an epic (shorthand for builder pattern)
 *
 * @example
 * const dataAnalysisEpic = defineEpic({
 *   id: 'data-analysis',
 *   name: 'Data Analysis & Schema Design',
 *   goals: [dataModelingGoal],
 *   checks: [dataModelingCheck],
 *   evals: [dataAnalysisEval],
 *   planners: [dataAnalysisPlanner],
 *   tasks: [analyzeSheets],
 * });
 */
export function defineEpic(config: {
  id: string;
  name: string;
  description?: string;
  goals?: Goal[];
  deps?: string[];
  checks?: CheckFnMeta[];
  evals?: EvalFnMeta[];
  planners?: PlanFnMeta[];
  tasks?: TaskConfig[];
}): EpicDefinition {
  const builder = epic().id(config.id).name(config.name);

  if (config.description) {
    builder.description(config.description);
  }

  if (config.goals) {
    builder.goals(config.goals);
  }

  if (config.deps) {
    builder.deps(config.deps);
  }

  if (config.checks) {
    for (const check of config.checks) {
      builder.check(check);
    }
  }

  if (config.evals) {
    for (const evalFn of config.evals) {
      builder.eval(evalFn);
    }
  }

  if (config.planners) {
    for (const planner of config.planners) {
      builder.planner(planner);
    }
  }

  if (config.tasks) {
    for (const task of config.tasks) {
      builder.task(task);
    }
  }

  return builder.build();
}

/* ------------------------------------------------------------------ */
/*  Project Builder                                                   */
/* ------------------------------------------------------------------ */

import { createFilesystemStorage } from "../storage/filesystem.ts";
import { createProjectContext } from "../context/index.ts";
import { createProjectOrchestratorV2 } from "../orchestrator/project-orchestrator.ts";
import { createStatusManager } from "../storage/status.ts";
import { registerCheck, registerEval, registerPlan } from "./registry.ts";
import { createRuntime } from "../runtime/runtime.ts";
import type { Runtime } from "../runtime/types.ts";
import type {
  ConvergenceConfig,
  ConvergenceResult,
} from "../orchestrator/convergence.ts";
import type { ProjectOrchestrationResult } from "../orchestrator/project-orchestrator.ts";
import type { EvalResult } from "../gap/types.ts";

class ProjectDefinitionImpl implements ProjectDefinition {
  config: ProjectConfig;
  epics: EpicDefinition[];
  private _workspaceDir: string;

  constructor(
    config: ProjectConfig,
    epics: EpicDefinition[],
    workspaceDir: string,
  ) {
    this.config = config;
    this.epics = epics;
    this._workspaceDir = workspaceDir;
  }

  async init(): Promise<Runtime> {
    // Initialize storage
    const storage = createFilesystemStorage(`${this._workspaceDir}/.converge`);
    storage.init();

    // Write project config
    storage.writeProject(this.config);

    // Write epic configs and register functions
    for (const epic of this.epics) {
      storage.writeEpicConfig({
        id: epic.id,
        title: epic.name,
        description: epic.description,
        goals: epic.goals.map((g) => g.description),
        tasks: epic.tasks.map((t) => t.id),
      });

      // Register functions
      for (const check of epic.checks) {
        registerCheck(check);
      }
      for (const evalFn of epic.evals) {
        registerEval(evalFn);
      }
      for (const planner of epic.planners) {
        registerPlan(planner);
      }
    }

    // Create and return runtime
    return createRuntime(this.config, this.epics, this._workspaceDir);
  }

  async run(
    config?: Partial<ConvergenceConfig>,
  ): Promise<ProjectOrchestrationResult> {
    // Initialize storage
    const storage = createFilesystemStorage(`${this._workspaceDir}/.converge`);
    storage.init();

    // Write project config
    storage.writeProject(this.config);

    // Write epic configs and register functions
    for (const epic of this.epics) {
      storage.writeEpicConfig({
        id: epic.id,
        title: epic.name,
        description: epic.description,
        // Serialize Goal[] to string[] for storage
        goals: epic.goals.map((g) => g.description),
        tasks: epic.tasks.map((t) => t.id),
      });

      // Register functions
      for (const check of epic.checks) {
        registerCheck(check);
      }
      for (const evalFn of epic.evals) {
        registerEval(evalFn);
      }
      for (const planner of epic.planners) {
        registerPlan(planner);
      }
    }

    // Create status manager and context
    const statusManager = createStatusManager(storage);
    const ctx = createProjectContext(this._workspaceDir, this.config, storage);

    // Create orchestrator
    const orchestrator = createProjectOrchestratorV2(storage, statusManager);

    // Merge with default config
    const fullConfig: ConvergenceConfig = {
      maxIterations: config?.maxIterations ?? 50,
      maxStallCount: config?.maxStallCount ?? 3,
      enableCheckpoints: config?.enableCheckpoints ?? true,
      parallelExecution: config?.parallelExecution ?? false,
      maxParallelTasks: config?.maxParallelTasks ?? 1,
      ...config,
    };

    // Run convergence
    return orchestrator.run(ctx, fullConfig);
  }

  async resume(): Promise<ProjectOrchestrationResult> {
    const storage = createFilesystemStorage(`${this._workspaceDir}/.converge`);
    const projectConfig = storage.readProject();
    const statusManager = createStatusManager(storage);
    const ctx = createProjectContext(
      this._workspaceDir,
      projectConfig,
      storage,
    );
    const orchestrator = createProjectOrchestratorV2(storage, statusManager);

    // Re-register functions
    for (const epic of this.epics) {
      for (const check of epic.checks) {
        registerCheck(check);
      }
      for (const evalFn of epic.evals) {
        registerEval(evalFn);
      }
      for (const planner of epic.planners) {
        registerPlan(planner);
      }
    }

    const defaultConfig: ConvergenceConfig = {
      maxIterations: 50,
      maxStallCount: 3,
      enableCheckpoints: true,
      parallelExecution: false,
      maxParallelTasks: 1,
    };

    return orchestrator.run(ctx, defaultConfig);
  }

  async verify(): Promise<EvalResult> {
    // TODO: Implement verification
    throw new Error("verify() not yet implemented");
  }

  addGoal(goal: string): void {
    if (!this.config.goals.includes(goal)) {
      this.config.goals.push(goal);

      // Update storage if initialized
      const storage = createFilesystemStorage(
        `${this._workspaceDir}/.converge`,
      );
      if (storage) {
        storage.writeProject(this.config);
      }
    }
  }

  removeGoal(goal: string): void {
    const index = this.config.goals.indexOf(goal);
    if (index !== -1) {
      this.config.goals.splice(index, 1);

      // Update storage if initialized
      const storage = createFilesystemStorage(
        `${this._workspaceDir}/.converge`,
      );
      if (storage) {
        storage.writeProject(this.config);
      }
    }
  }

  getGoals(): string[] {
    return [...this.config.goals];
  }
}

class ProjectBuilderImpl implements IProjectBuilder {
  private _name?: string;
  private _dir?: string;
  private _description?: string;
  private _goals: string[] = [];
  private _variables: Record<string, unknown> = {};
  private _plugins: string[] = [];
  private _epics: EpicDefinition[] = [];

  name(name: string): this {
    this._name = name;
    return this;
  }

  dir(dir: string): this {
    this._dir = dir;
    return this;
  }

  description(description: string): this {
    this._description = description;
    return this;
  }

  goals(goals: string[]): this {
    this._goals = goals;
    return this;
  }

  variables(vars: Record<string, unknown>): this {
    this._variables = vars;
    return this;
  }

  plugins(plugins: string[]): this {
    this._plugins = plugins;
    return this;
  }

  epic(epic: EpicDefinition): this {
    this._epics.push(epic);
    return this;
  }

  build(): ProjectDefinition {
    if (!this._name) {
      throw new Error("Project name is required. Call .name() before .build()");
    }
    if (!this._dir) {
      throw new Error(
        "Project directory is required. Call .dir() before .build()",
      );
    }

    const now = new Date().toISOString();

    const config: ProjectConfig = {
      version: 2,
      name: this._name,
      description: this._description,
      goals: this._goals,
      variables: this._variables,
      plugins: this._plugins,
      epics: this._epics.map((e) => e.id),
      metadata: {
        created: now,
        updated: now,
      },
    };

    return new ProjectDefinitionImpl(config, this._epics, this._dir);
  }
}

/**
 * Create a new project builder
 *
 * @example
 * const convergeProject = project()
 *   .name('Converge Workspace')
 *   .dir('/workspace/dir')
 *   .goals(['Generate complete data model', 'Build all screens'])
 *   .plugins(['sheets-modeling', 'ux-design'])
 *   .epic(dataAnalysisEpic)
 *   .epic(designEpic)
 *   .build();
 *
 * const result = await convergeProject.run({ maxIterations: 50 });
 */
export function project(): IProjectBuilder {
  return new ProjectBuilderImpl();
}

/**
 * Define a project (shorthand for builder pattern)
 *
 * @example
 * const convergeProject = defineProject({
 *   name: 'Converge Workspace',
 *   dir: '/workspace/dir',
 *   goals: ['Generate complete data model'],
 *   epics: [dataAnalysisEpic, designEpic],
 *   plugins: ['sheets-modeling', 'ux-design'],
 * });
 */
export function defineProject(config: {
  name: string;
  dir: string;
  description?: string;
  goals?: string[];
  variables?: Record<string, unknown>;
  plugins?: string[];
  epics?: EpicDefinition[];
}): ProjectDefinition {
  const builder = project().name(config.name).dir(config.dir);

  if (config.description) {
    builder.description(config.description);
  }

  if (config.goals) {
    builder.goals(config.goals);
  }

  if (config.variables) {
    builder.variables(config.variables);
  }

  if (config.plugins) {
    builder.plugins(config.plugins);
  }

  if (config.epics) {
    for (const epic of config.epics) {
      builder.epic(epic);
    }
  }

  return builder.build();
}
