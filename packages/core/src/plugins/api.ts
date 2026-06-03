/**
 * Enhanced Plugin API Implementation (V2)
 *
 * Bridges plugin calls to the new function registry.
 * Supports both legacy and new function-driven APIs.
 */

import type {
  PluginAPIV2,
  HookEvent,
  HookFn,
  ToolFactory,
  PluginStateV2,
  PluginManifestV2,
  PluginCapability,
  CheckTypeEvaluator,
  SkillSource,
  JournalConsumer,
  PluginCommand,
} from "./types.ts";
import type {
  InterceptorFn,
  InterceptEvent,
} from "../hooks/interceptor-registry.ts";
import type {
  CheckFnMeta,
  EvalFnMeta,
  PlanFnMeta,
  TaskFnMeta,
} from "../task/checks/types.ts";

export class PluginAPIImplV2 implements PluginAPIV2 {
  readonly options: Record<string, unknown>;
  readonly projectDir: string;

  private _state: PluginStateV2;
  private _pluginName: string;
  private _capabilities?: PluginCapability[];

  // Track contributions for manifest
  private _checkFns: string[] = [];
  private _evalFns: string[] = [];
  private _planFns: string[] = [];
  private _taskFns: string[] = [];
  private _legacyChecks: string[] = [];
  private _taskTypes: string[] = [];
  private _extendedTypes: string[] = [];
  private _hooks: HookEvent[] = [];
  private _vars: string[] = [];
  private _tools: string[] = [];
  private _providers: string[] = [];
  private _interceptors: InterceptEvent[] = [];
  private _checkTypes: string[] = [];
  private _skillSources: string[] = [];
  private _journalConsumers: string[] = [];
  private _commands: string[] = [];

  constructor(
    pluginName: string,
    projectDir: string,
    options: Record<string, unknown>,
    state: PluginStateV2,
    capabilities?: PluginCapability[],
  ) {
    this._pluginName = pluginName;
    this.projectDir = projectDir;
    this.options = options;
    this._state = state;
    this._capabilities = capabilities;
  }

  private _checkCapability(required: PluginCapability): void {
    if (this._capabilities && !this._capabilities.includes(required)) {
      console.warn(
        `[${this._pluginName}] Using API that requires "${required}" capability, ` +
          `but plugin declares capabilities: [${this._capabilities.join(", ")}]. ` +
          `Add "${required}" to your plugin's capabilities array.`,
      );
    }
  }

  /* ──────────────────────────────────────────────────────────── */
  /*  Function Registration                                        */
  /* ──────────────────────────────────────────────────────────── */

  registerCheck(check: CheckFnMeta): void {
    if (this._state.checks.has(check.name)) {
      throw new Error(
        `Check "${check.name}" already registered by another plugin. ` +
          `Choose a different name or namespace it (e.g., "${this._pluginName}:${check.name}").`,
      );
    }
    this._state.checks.set(check.name, check);
    this._checkFns.push(check.name);
  }

  registerChecks(checks: CheckFnMeta[]): void {
    for (const check of checks) {
      this.registerCheck(check);
    }
  }

  registerEval(evalFn: EvalFnMeta): void {
    if (this._state.evals.has(evalFn.name)) {
      throw new Error(
        `Eval "${evalFn.name}" already registered by another plugin. ` +
          `Choose a different name or namespace it (e.g., "${this._pluginName}:${evalFn.name}").`,
      );
    }
    this._state.evals.set(evalFn.name, evalFn);
    this._evalFns.push(evalFn.name);
  }

  registerEvals(evals: EvalFnMeta[]): void {
    for (const evalFn of evals) {
      this.registerEval(evalFn);
    }
  }

  registerPlan(plan: PlanFnMeta): void {
    if (this._state.plans.has(plan.name)) {
      throw new Error(
        `Plan "${plan.name}" already registered by another plugin. ` +
          `Choose a different name or namespace it (e.g., "${this._pluginName}:${plan.name}").`,
      );
    }
    this._state.plans.set(plan.name, plan);
    this._planFns.push(plan.name);
  }

  registerPlans(plans: PlanFnMeta[]): void {
    for (const plan of plans) {
      this.registerPlan(plan);
    }
  }

  registerTask(task: TaskFnMeta): void {
    if (this._state.tasks.has(task.type)) {
      throw new Error(
        `Task type "${task.type}" already registered by another plugin. ` +
          `Choose a different type or namespace it (e.g., "${this._pluginName}:${task.type}").`,
      );
    }
    this._state.tasks.set(task.type, task);
    this._taskFns.push(task.type);
  }

  registerTasks(tasks: TaskFnMeta[]): void {
    for (const task of tasks) {
      this.registerTask(task);
    }
  }

  /* ──────────────────────────────────────────────────────────── */
  /*  Legacy Support                                               */
  /* ──────────────────────────────────────────────────────────── */

  addCheck(name: string, plugin: unknown): void {
    // Legacy support - store but don't use in new execution
    this._legacyChecks.push(name);
    console.warn(
      `[${this._pluginName}] addCheck() is deprecated. Use registerCheck() with CheckFnMeta instead.`,
    );
  }

  addChecks(checks: Record<string, unknown>): void {
    for (const name of Object.keys(checks)) {
      this.addCheck(name, checks[name]);
    }
  }

  addTaskType(type: unknown): void {
    // Legacy support
    const typeName = (type as any)?.name || "unknown";
    this._taskTypes.push(typeName);
    console.warn(
      `[${this._pluginName}] addTaskType() is deprecated. Use registerTask() with TaskFnMeta instead.`,
    );
  }

  extendTaskType(name: string, extension: unknown): void {
    if (!this._extendedTypes.includes(name)) {
      this._extendedTypes.push(name);
    }
    console.warn(
      `[${this._pluginName}] extendTaskType() is deprecated. Use registerTask() to define task functions.`,
    );
  }

  /* ──────────────────────────────────────────────────────────── */
  /*  Hooks & Tools                                                */
  /* ──────────────────────────────────────────────────────────── */

  addHook(event: HookEvent, fn: HookFn): void {
    const hooks = this._state.hooks.get(event) || [];
    hooks.push(fn);
    this._state.hooks.set(event, hooks);
    if (!this._hooks.includes(event)) {
      this._hooks.push(event);
    }
  }

  addVars(vars: Record<string, unknown>): void {
    Object.assign(this._state.vars, vars);
    this._vars.push(...Object.keys(vars));
  }

  addTool(name: string, factory: ToolFactory): void {
    if (this._state.tools.has(name)) {
      throw new Error(
        `Tool "${name}" already registered by another plugin. ` +
          `Choose a different name or namespace it (e.g., "${this._pluginName}:${name}").`,
      );
    }
    this._state.tools.set(name, factory);
    this._tools.push(name);
  }

  /* ──────────────────────────────────────────────────────────── */
  /*  Interceptors                                                 */
  /* ──────────────────────────────────────────────────────────── */

  addInterceptor(
    event: InterceptEvent,
    fn: InterceptorFn<unknown>,
    priority: number = 100,
  ): void {
    this._checkCapability("interceptors");
    const list = this._state.interceptors.get(event) || [];
    list.push({ fn, priority });
    this._state.interceptors.set(event, list);
    if (!this._interceptors.includes(event)) {
      this._interceptors.push(event);
    }
  }

  /* ──────────────────────────────────────────────────────────── */
  /*  Per-System Registries                                        */
  /* ──────────────────────────────────────────────────────────── */

  registerCheckType(type: string, evaluator: CheckTypeEvaluator): void {
    this._checkCapability("check-types");
    if (this._state.checkTypes.has(type)) {
      throw new Error(
        `Check type "${type}" already registered. ` +
          `Choose a different type or namespace it (e.g., "${this._pluginName}:${type}").`,
      );
    }
    this._state.checkTypes.set(type, evaluator);
    this._checkTypes.push(type);
  }

  registerSkillSource(source: SkillSource): void {
    this._checkCapability("skills");
    this._state.skillSources.push(source);
    this._skillSources.push(source.name);
  }

  registerJournalConsumer(consumer: JournalConsumer): void {
    this._checkCapability("journal-consumers");
    this._state.journalConsumers.push(consumer);
    this._journalConsumers.push(consumer.name);
  }

  registerCommand(cmd: PluginCommand): void {
    this._checkCapability("commands");
    if (this._state.commands.has(cmd.name)) {
      throw new Error(
        `Command "${cmd.name}" already registered by another plugin. ` +
          `Choose a different name or namespace it (e.g., "${this._pluginName}:${cmd.name}").`,
      );
    }
    this._state.commands.set(cmd.name, cmd);
    this._commands.push(cmd.name);
  }

  /* ──────────────────────────────────────────────────────────── */
  /*  Provider Registration                                       */
  /* ──────────────────────────────────────────────────────────── */

  /**
   * @deprecated This method is deprecated. Use the `registerProviders(registry)` hook
   * on `ConvergePluginV2` instead. This is kept for backward compatibility only.
   */
  registerProvider(
    _name: string,
    _factory: (opts: Record<string, unknown>) => Promise<unknown>,
  ): void {
    // Deprecated — providers should use registerProviders(registry) on the plugin instead.
    // The loader wires up the registry from plugin hooks to the agentfn registry.
  }

  /* ──────────────────────────────────────────────────────────── */
  /*  Queries                                                      */
  /* ──────────────────────────────────────────────────────────── */

  getVar(key: string): unknown {
    return this._state.vars[key];
  }

  hasPlugin(name: string): boolean {
    return this._state.loaded.includes(name);
  }

  getCheck(name: string): CheckFnMeta | undefined {
    return this._state.checks.get(name);
  }

  getEval(name: string): EvalFnMeta | undefined {
    return this._state.evals.get(name);
  }

  getPlan(name: string): PlanFnMeta | undefined {
    return this._state.plans.get(name);
  }

  getTask(type: string): TaskFnMeta | undefined {
    return this._state.tasks.get(type);
  }

  /* ──────────────────────────────────────────────────────────── */
  /*  Manifest Generation                                          */
  /* ──────────────────────────────────────────────────────────── */

  buildManifest(plugin: {
    name: string;
    version: string;
    description?: string;
    requires?: string[];
  }): PluginManifestV2 {
    return {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      requires: plugin.requires,

      // Function contributions
      checkFns: this._checkFns,
      evalFns: this._evalFns,
      planFns: this._planFns,
      taskFns: this._taskFns,

      // Legacy contributions
      checks: this._legacyChecks,
      taskTypes: this._taskTypes,
      extendedTypes: this._extendedTypes,

      // Infrastructure
      hooks: this._hooks,
      vars: this._vars,
      tools: this._tools,

      // Providers
      providers: this._providers,

      // New extension contributions
      interceptors: this._interceptors,
      checkTypes: this._checkTypes,
      skillSources: this._skillSources,
      journalConsumers: this._journalConsumers,
      commands: this._commands,
    };
  }
}
