/**
 * Hook Definition Types
 *
 * A hook is a standalone definition that matches tasks by tags and creates
 * companion DAG nodes at the right topological position. Modeled after the
 * seed system: hooks are defined once, match many tasks, and each match
 * becomes a blocking companion node in the DAG.
 */

/* ------------------------------------------------------------------ */
/*  Hook Event                                                         */
/* ------------------------------------------------------------------ */

/** Lifecycle events a hook can bind to. */
export type HookEvent = "task:start" | "task:complete" | "task:fail";

/* ------------------------------------------------------------------ */
/*  Hook Context                                                        */
/* ------------------------------------------------------------------ */

/** Context passed to a hook executor when its companion node runs. */
export interface HookContext {
  /** The matched task's ID. */
  taskId: string;
  /** The matched task's title. */
  taskTitle: string;
  /** The hook definition's ID. */
  hookId: string;
  /** Project directory. */
  projectDir: string;
  /** Run a shell command. */
  shell(
    cmd: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  /** Logger. */
  log: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  };
  /** Playbook/input variables. */
  vars: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Hook Executor                                                       */
/* ------------------------------------------------------------------ */

/** The function that runs when a hook's companion node executes. */
export type HookExecutorFn = (ctx: HookContext) => void | Promise<void>;

/* ------------------------------------------------------------------ */
/*  Hook Filter                                                         */
/* ------------------------------------------------------------------ */

/** Filter that determines which tasks a hook matches. */
export interface HookFilter {
  /** Match tasks that have any of these tags. */
  tags?: string[];
  /** Match specific task IDs directly. */
  taskIds?: string[];
}

/* ------------------------------------------------------------------ */
/*  Hook Definition                                                     */
/* ------------------------------------------------------------------ */

/** A hook definition — standalone, matches tasks by filter, creates companion nodes. */
export interface HookDefinition {
  /** Unique identifier for this hook. */
  id: string;
  /** Human-readable title. */
  title?: string;
  /** Which lifecycle event triggers this hook. */
  on: HookEvent;
  /** Filter determining which tasks this hook matches. */
  filter: HookFilter;
  /** The function to execute as a companion node. */
  fn: HookExecutorFn;
  /**
   * Whether companion nodes block downstream tasks.
   * Default: true for "task:complete" and "task:start", false for "task:fail".
   */
  blocking?: boolean;
  /** Arbitrary config passed through to built-in factories. */
  config?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Hook Definition Builder                                             */
/* ------------------------------------------------------------------ */

/**
 * Fluent builder for HookDefinition. Follows the same pattern as taskDef().
 *
 * @example
 * ```ts
 * const gitHook = hookDef()
 *   .id('git-automation')
 *   .on('task:complete')
 *   .filterTags(['code', 'build'])
 *   .fn(async (ctx) => {
 *     await ctx.shell('git add -A && git commit -m "auto-commit"');
 *   })
 *   .build();
 * ```
 */
export class HookDefinitionBuilder {
  private def: Partial<HookDefinition> = {};

  id(id: string): this {
    this.def.id = id;
    return this;
  }

  title(title: string): this {
    this.def.title = title;
    return this;
  }

  /** Set the lifecycle event that triggers this hook. */
  on(event: HookEvent): this {
    this.def.on = event;
    return this;
  }

  /** Match tasks by tags (matches if task has ANY of these tags). */
  filterTags(tags: string[]): this {
    if (!this.def.filter) this.def.filter = {};
    this.def.filter.tags = tags;
    return this;
  }

  /** Match specific tasks by ID. */
  filterTaskIds(ids: string[]): this {
    if (!this.def.filter) this.def.filter = {};
    this.def.filter.taskIds = ids;
    return this;
  }

  /** Set the executor function that runs as a companion node. */
  fn(fn: HookExecutorFn): this {
    this.def.fn = fn;
    return this;
  }

  /** Override default blocking behavior. */
  blocking(b: boolean): this {
    this.def.blocking = b;
    return this;
  }

  /** Store arbitrary config (used by built-in factories). */
  config(c: Record<string, unknown>): this {
    this.def.config = c;
    return this;
  }

  build(): HookDefinition {
    if (!this.def.id) {
      throw new Error(
        "HookDefinition requires an id. Call .id('my-hook') before .build().",
      );
    }
    if (!this.def.on) {
      throw new Error(
        `HookDefinition '${this.def.id}' requires an event. Call .on('task:complete') before .build().`,
      );
    }
    if (!this.def.fn) {
      throw new Error(
        `HookDefinition '${this.def.id}' requires a function. Call .fn(async (ctx) => { ... }) before .build().`,
      );
    }
    if (
      !this.def.filter ||
      (!this.def.filter.tags?.length && !this.def.filter.taskIds?.length)
    ) {
      throw new Error(
        `HookDefinition '${this.def.id}' requires a filter. Call .filterTags([...]) or .filterTaskIds([...]) before .build().`,
      );
    }
    return this.def as HookDefinition;
  }
}

/**
 * Create a new hook definition builder.
 *
 * @example
 * ```ts
 * const gitHook = hookDef()
 *   .id('git-automation')
 *   .on('task:complete')
 *   .filterTags(['code'])
 *   .fn(async (ctx) => {
 *     await ctx.shell('git add -A && git commit -m "auto-commit"');
 *   })
 *   .build();
 * ```
 */
export function hookDef(): HookDefinitionBuilder {
  return new HookDefinitionBuilder();
}
