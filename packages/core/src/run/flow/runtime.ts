/**
 * RFC 0050 — the durable code-first runtime (Increment A).
 *
 * `runFlow` executes a visible imperative flow (`solve-waves.js`-style) and
 * makes it resumable at any point in the middle via deterministic replay over
 * a memoized step journal. The flow runs top-to-bottom; each side-effecting
 * step (`Task`, journaled `now`/`uuid`) is a checkpoint keyed by a
 * deterministic id. On resume the script re-executes from the top, but every
 * already-journaled step returns its cached result instantly without
 * re-running — so execution fast-forwards through the completed prefix and
 * continues at the first un-journaled (or edited) step.
 *
 * Increment A resolves tasks from an in-memory registry (hermetic). Increment
 * B swaps in TASK.md / template resolution + the real `executeTask` via the
 * `resolveTask` / `executeStep` seams.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { StepJournal } from "./step-journal.js";
import { FlowStateStore } from "./state-store.js";
import { KeyCounter, deriveKey } from "./keys.js";
import { Semaphore } from "./semaphore.js";
import { buildChildVars } from "../../task/spawn/render.js";

/** A hermetic, in-memory task (Increment A / tests). */
export interface FlowRegistryTask {
  /** Bumping this simulates editing the task contract (fingerprint changes). */
  version?: string;
  /** Declared output paths (relative to projectDir); replay requires them to exist. */
  outputs?: string[];
  run: (params: any) => any;
}

export type FlowTaskRegistry = Map<string, FlowRegistryTask>;

/** An inline task defined directly in the flow (self-contained `flow.mjs`). */
export interface InlineFlowTask extends FlowRegistryTask {
  id: string;
}

/** A task reference: a registry/TASK.md id, a path, or an inline spec. */
export type TaskRef = string | InlineFlowTask;

/** A task resolved to everything the runtime needs to run/replay it. */
export interface ResolvedFlowTask {
  id: string;
  fingerprint: string;
  outputs?: string[];
  /** `stepKey` is the deterministic flow key (used as the runstate node id). */
  exec: (params: any, stepKey: string) => Promise<any>;
  /** Set when resolved from a TASK.md (static or template). */
  taskMdPath?: string;
  kind?: "static" | "template" | "inline";
  /** Full TaskDefinition parsed from the TASK.md (with body), for the executor. */
  taskDef?: any;
}

/**
 * Durable, resume-correct key-value state for a flow (RFC 0051). Writes are
 * event-sourced into the step journal and projected to `state.json`, so state
 * survives a crash + `--resume`; a `get` taken during the replayed prefix
 * returns the value it had *at that point*, so state may safely drive control
 * flow. Use it for metadata, per-task durations, running notes, counters, a
 * manifest the flow accumulates as it fans out.
 */
export interface FlowState {
  get<T = unknown>(key: string, fallback?: T): T;
  set(key: string, value: unknown): void;
  update<T = unknown>(key: string, fn: (prev: T) => T, fallback?: T): void;
  /** A snapshot object of all current keys. */
  all(): Record<string, unknown>;
}

export interface FlowContext {
  meta: Record<string, unknown>;
  args: any;
  phase(title: string): void;
  log(msg: string): void;
  /** Durable, resume-safe key-value state shared across steps (RFC 0051). */
  state: FlowState;
  /**
   * React-style sugar over `state` for a single key: returns
   * `[state.get(key, initial), value => state.set(key, value)]`.
   */
  useState<T = unknown>(key: string, initial?: T): [T, (value: T) => void];
  /** Journaled clock — deterministic across replays. */
  now(): number;
  /** Journaled uuid — deterministic across replays. */
  uuid(): string;
  /**
   * Run a task; returns its outputs JSON. Replays if already journaled. The
   * unified API for plain tasks AND templates: call it once, or N times with a
   * distinct `key` to fan out. If the task declares a `vars:` block, `params`
   * are filtered through that STRICT contract (drop undeclared keys, fill
   * defaults, throw on a missing required var — like `converge spawn`); tasks
   * with no `vars:` block get `params` verbatim. `inherit: false` opts out of
   * ambient `CONVERGE_VAR_*` inheritance.
   */
  Task(
    ref: TaskRef,
    params?: any,
    opts?: { key?: string; inherit?: boolean },
  ): Promise<any>;
  /** Lowercase alias for `Task` (solve-waves.js style). */
  task(
    ref: TaskRef,
    params?: any,
    opts?: { key?: string; inherit?: boolean },
  ): Promise<any>;
  /**
   * `solve-waves.js`-compatible agent call. Sugar for a journaled, ephemeral
   * step backed by `agentBackend`. Returns the structured output (per
   * `opts.schema`); replays from the journal on resume.
   */
  agent(
    prompt: string,
    opts?: {
      schema?: any;
      phase?: string;
      agentType?: string;
      label?: string;
      key?: string;
    },
  ): Promise<any>;
  parallel<T>(thunks: Array<() => Promise<T>>): Promise<T[]>;
  pipeline(
    items: any[],
    ...stages: Array<(prev: any, item: any, index: number) => any>
  ): Promise<any[]>;
}

export interface FlowDefinition {
  name: string;
  meta?: Record<string, unknown>;
  flow: (ctx: FlowContext) => Promise<any>;
}

export interface RunFlowOptions {
  projectDir: string;
  resume?: boolean;
  args?: any;
  /** Hermetic task registry (Increment A). */
  tasks?: FlowTaskRegistry;
  /**
   * Directory holding static tasks as `<id>/TASK.md` — e.g. a playbook's
   * `tasks/` folder. `task("01-foo")` resolves `<tasksDir>/01-foo/TASK.md`.
   */
  tasksDir?: string;
  /**
   * Directory holding template tasks as `<name>/TASK.md`. `task("tpl", params)`
   * resolves `<templatesDir>/tpl/TASK.md` and renders `params` into its vars.
   */
  templatesDir?: string;
  /**
   * The flow module's own directory (`.converge/playbooks/<name>/`). Relative
   * `task("tasks/x/TASK.md")` paths resolve against this first.
   */
  flowDir?: string;
  /**
   * Max concurrent real task/agent executions across the whole flow (one
   * global cap shared by all nested `parallel`/`pipeline`). Default 4. Replays
   * are free and never count against it.
   */
  workers?: number;
  /** Dry run — don't execute steps; log what each Task/agent would run. */
  dry?: boolean;
  /** RFC 0021 stub mode — run a task's stub.cmd instead of the AI body. */
  stubMode?: boolean;
  /** Per-task attempt cap for TASK.md-backed steps (default 3). */
  maxTaskAttempts?: number;
  /** Deterministic clock source (tests/replay). Defaults to Date.now. */
  clock?: () => number;
  uuidFn?: () => string;
  onLog?: (msg: string) => void;
  /** Production seam: resolve an id/path (+params) to a runnable task. */
  resolveTask?: (idOrPath: string, params: any) => Promise<ResolvedFlowTask>;
  /** Production seam: execute a resolved task (e.g. via `executeTask`). */
  executeStep?: (
    task: ResolvedFlowTask,
    params: any,
    projectDir: string,
  ) => Promise<any>;
  /** Backend for `agent(prompt, opts)` — returns the structured output. */
  agentBackend?: (
    prompt: string,
    opts?: { schema?: any; agentType?: string; phase?: string },
  ) => Promise<any>;
}

function sha256(input: string): string {
  return "sha256:" + createHash("sha256").update(input).digest("hex");
}

/** Deterministic JSON: object keys sorted, undefined preserved. */
function stableStringify(value: any): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") +
    "}"
  );
}

function outputsExist(projectDir: string, outputs?: string[]): boolean {
  if (!outputs || outputs.length === 0) return true;
  return outputs.every((o) => existsSync(join(projectDir, o)));
}

function inlineResolve(ref: InlineFlowTask, params: any): ResolvedFlowTask {
  const fingerprint = sha256(
    `${ref.id}|${ref.version ?? ""}|${stableStringify(params)}`,
  );
  return {
    id: ref.id,
    fingerprint,
    outputs: ref.outputs,
    exec: async (p) => ref.run(p),
  };
}

function registryResolve(
  tasks: FlowTaskRegistry,
  idOrPath: string,
  params: any,
): ResolvedFlowTask | undefined {
  const task = tasks.get(idOrPath);
  if (!task) return undefined;
  const fingerprint = sha256(
    `${idOrPath}|${task.version ?? ""}|${stableStringify(params)}`,
  );
  return {
    id: idOrPath,
    fingerprint,
    outputs: task.outputs,
    kind: "inline",
    exec: async (p) => task.run(p),
  };
}

/**
 * Locate a TASK.md for `idOrPath`:
 *  - a `.md` / containing-dir path (absolute or projectDir-relative),
 *  - `<tasksDir>/<id>/TASK.md` (static), or
 *  - `<templatesDir>/<name>/TASK.md` (template + params).
 */
function locateTaskMd(
  idOrPath: string,
  o: {
    projectDir: string;
    flowDir?: string;
    tasksDir?: string;
    templatesDir?: string;
  },
): { taskMdPath: string; kind: "static" | "template" } | undefined {
  if (/\.md$/i.test(idOrPath) || idOrPath.includes("/")) {
    if (isAbsolute(idOrPath)) {
      const cand = /\.md$/i.test(idOrPath)
        ? idOrPath
        : join(idOrPath, "TASK.md");
      if (existsSync(cand)) return { taskMdPath: cand, kind: "static" };
    } else {
      // Relative refs resolve against the flow's own dir first (so a flow can
      // reference its co-located `tasks/`), then the project root.
      for (const root of [o.flowDir, o.projectDir]) {
        if (!root) continue;
        const base = join(root, idOrPath);
        const cand = /\.md$/i.test(base) ? base : join(base, "TASK.md");
        if (existsSync(cand)) return { taskMdPath: cand, kind: "static" };
      }
    }
  }
  if (o.tasksDir) {
    const p = join(o.tasksDir, idOrPath, "TASK.md");
    if (existsSync(p)) return { taskMdPath: p, kind: "static" };
  }
  if (o.templatesDir) {
    const p = join(o.templatesDir, idOrPath, "TASK.md");
    if (existsSync(p)) return { taskMdPath: p, kind: "template" };
  }
  return undefined;
}

/**
 * Resolve a string ref to a TASK.md-backed task. The fingerprint folds the
 * file content + params, so editing the TASK.md or the params re-runs the step
 * on resume; outputs come from the TASK.md `outputs:` frontmatter.
 */
async function taskMdResolve(
  idOrPath: string,
  params: any,
  o: {
    projectDir: string;
    flowDir?: string;
    tasksDir?: string;
    templatesDir?: string;
    runStep: (
      task: ResolvedFlowTask,
      params: any,
      projectDir: string,
      stepKey: string,
    ) => Promise<any>;
  },
): Promise<ResolvedFlowTask | undefined> {
  const found = locateTaskMd(idOrPath, o);
  if (!found) return undefined;
  const { loadTaskFile } = await import(
    "../../config/declarative-loader-unified.js"
  );
  const content = readFileSync(found.taskMdPath, "utf-8");
  // Full TaskDefinition (with body/prompt/outputs/checks) — the same parse the
  // DAG loader uses, so the executor builds the Unit from the definition.
  const taskDef: any = loadTaskFile(found.taskMdPath);
  const outputs = (taskDef.outputs as string[] | undefined) ?? [];
  const fingerprint = sha256(
    `${found.kind}|${content}|${stableStringify(params)}`,
  );
  const resolved: ResolvedFlowTask = {
    id: idOrPath,
    fingerprint,
    outputs,
    taskMdPath: found.taskMdPath,
    kind: found.kind,
    taskDef,
    exec: async (p, stepKey) => o.runStep(resolved, p, o.projectDir, stepKey),
  };
  return resolved;
}

export async function runFlow(
  def: FlowDefinition,
  opts: RunFlowOptions,
): Promise<any> {
  const journal = StepJournal.open(opts.projectDir, def.name, {
    resume: !!opts.resume,
  });
  const counter = new KeyCounter();
  const clock = opts.clock ?? (() => Date.now());

  // One global concurrency cap shared by every nested parallel/pipeline.
  const metaWorkers = (def.meta as any)?.run?.workers;
  const sem = new Semaphore(opts.workers ?? metaWorkers ?? 4);

  let valueSeq = 0;
  let valueCounter = 0;
  let currentPhase = "";

  const uuidFn =
    opts.uuidFn ??
    (() =>
      createHash("sha256")
        .update(`${def.name}:${valueSeq++}`)
        .digest("hex")
        .slice(0, 32));

  // How a resolved TASK.md task actually runs: the injected `executeStep`
  // seam (tests), else the real DAG executor via `executeSingleNode`
  // (skills/agents/outputs/checks/attempts), projected into runstate. The flow
  // exec context is created lazily so pure-inline flows write no runstate.
  let flowExec: import("./node-executor.js").FlowExecContext | undefined;
  const runStep = async (
    task: ResolvedFlowTask,
    params: any,
    _projectDir: string,
    stepKey: string,
  ) => {
    if (opts.executeStep) return opts.executeStep(task, params, opts.projectDir);
    const { createFlowExecutionContext, executeStepViaNode } = await import(
      "./node-executor.js"
    );
    if (!flowExec) {
      flowExec = await createFlowExecutionContext({
        projectDir: opts.projectDir,
        flowName: def.name,
        stubMode: opts.stubMode,
        maxTaskAttempts: opts.maxTaskAttempts,
      });
    }
    return executeStepViaNode(flowExec, task, params, stepKey);
  };

  /** Resolve a string ref: registry first, then TASK.md / template. */
  async function resolveRef(
    idOrPath: string,
    params: any,
  ): Promise<ResolvedFlowTask> {
    if (opts.resolveTask) return opts.resolveTask(idOrPath, params);
    if (opts.tasks) {
      const fromReg = registryResolve(opts.tasks, idOrPath, params);
      if (fromReg) return fromReg;
    }
    const fromMd = await taskMdResolve(idOrPath, params, {
      projectDir: opts.projectDir,
      flowDir: opts.flowDir,
      tasksDir: opts.tasksDir,
      templatesDir: opts.templatesDir,
      runStep,
    });
    if (fromMd) return fromMd;
    throw new Error(
      `flow: cannot resolve task "${idOrPath}" — not in the registry, and no ` +
        `TASK.md found via path / tasksDir / templatesDir.`,
    );
  }

  /** Journal a deterministic value (now/uuid) so replays reproduce it. */
  function journaledValue(kind: string, produce: () => any): any {
    const key = `__${kind}#${valueCounter++}`;
    const rec = journal.get(key);
    if (rec && rec.status === "done") return rec.value;
    const value = produce();
    journal.append({ key, kind: "value", status: "done", value });
    return value;
  }

  // RFC 0051 — durable flow state, stored in the INVENTORY layer (committed,
  // authoritative — RFC 0033) rather than the ephemeral journal. Writes are
  // event-sourced into `inventory/<flow>/state.jsonl` (per-key counter → stable
  // idempotent keys across replays) and projected to `state.json`. The live map
  // is rebuilt by re-applying writes IN ORDER as the flow replays, so a `get`
  // in the replayed prefix sees the correct as-of value.
  const stateStore = FlowStateStore.open(opts.projectDir, def.name, {
    resume: !!opts.resume,
    dry: opts.dry,
  });
  const stateWriteSeq = new Map<string, number>();

  function stateSet(key: string, value: unknown): void {
    const n = stateWriteSeq.get(key) ?? 0;
    stateWriteSeq.set(key, n + 1);
    const jkey = `${key}#${n}`;
    const recorded = stateStore.recordFor(jkey);
    if (recorded) {
      stateStore.apply(key, recorded.value); // replay — re-apply recorded value
    } else {
      stateStore.append(jkey, key, value);
    }
  }

  const state: FlowState = {
    get(key, fallback) {
      return (stateStore.has(key) ? stateStore.read(key) : fallback) as any;
    },
    set: stateSet,
    update(key, fn, fallback) {
      const prev = (
        stateStore.has(key) ? stateStore.read(key) : fallback
      ) as any;
      stateSet(key, fn(prev));
    },
    all() {
      return stateStore.all();
    },
  };

  async function runTask(
    ref: TaskRef,
    params: any,
    o?: { key?: string; inherit?: boolean },
  ) {
    const label = typeof ref === "string" ? ref : ref.id;
    const key = deriveKey(currentPhase, label, o?.key, counter);
    journal.markReferenced(key);
    if (opts.dry) {
      opts.onLog?.(`[dry] would run ${label}${o?.key ? `#${o.key}` : ""}`);
      return {};
    }
    let resolved =
      typeof ref === "string"
        ? await resolveRef(ref, params)
        : inlineResolve(ref, params);

    // Strict vars contract: if the task declares a `vars:` block, filter the
    // params through it (drop undeclared keys, fill defaults, require keys with
    // no default) — the same rule `converge spawn` enforces. Tasks with no
    // `vars:` block get params verbatim. This unifies "template" and plain
    // tasks under one `task()` API.
    const contract = (resolved.taskDef as any)?.vars;
    if (contract && typeof contract === "object" && Object.keys(contract).length > 0) {
      const explicitVars: Record<string, string> = {};
      for (const [k, v] of Object.entries(params ?? {})) {
        explicitVars[k] =
          v !== null && typeof v === "object" ? JSON.stringify(v) : String(v);
      }
      const { vars: filtered, missing } = buildChildVars({
        templateVars: contract,
        noInherit: o?.inherit === false,
        explicitVars,
      });
      if (missing.length > 0) {
        throw new Error(
          `flow: task("${label}") missing required var(s): ${missing.join(", ")}`,
        );
      }
      if (stableStringify(filtered) !== stableStringify(params)) {
        params = filtered;
        // Re-resolve so the fingerprint reflects the contract-filtered params.
        resolved =
          typeof ref === "string"
            ? await resolveRef(ref, params)
            : inlineResolve(ref, params);
      }
    }

    const rec = journal.get(key);
    if (
      rec &&
      rec.status === "done" &&
      rec.fingerprint === resolved.fingerprint &&
      outputsExist(opts.projectDir, resolved.outputs)
    ) {
      return rec.output; // REPLAY — no re-execution
    }
    const output = await sem.run(() => resolved.exec(params, key));
    journal.append({
      key,
      kind: "step",
      taskId: resolved.id,
      phase: currentPhase,
      fingerprint: resolved.fingerprint,
      status: "done",
      output,
    });
    return output;
  }

  async function runAgent(
    prompt: string,
    o?: {
      schema?: any;
      phase?: string;
      agentType?: string;
      label?: string;
      key?: string;
    },
  ) {
    const phase = o?.phase ?? currentPhase;
    const label = o?.label ?? o?.agentType ?? "agent";
    const key = deriveKey(phase, label, o?.key, counter);
    journal.markReferenced(key);
    if (opts.dry) {
      opts.onLog?.(`[dry] would run agent ${label}`);
      return {};
    }
    const fingerprint = sha256(`agent|${prompt}|${stableStringify(o ?? null)}`);
    const rec = journal.get(key);
    if (rec && rec.status === "done" && rec.fingerprint === fingerprint) {
      return rec.output; // REPLAY
    }
    if (!opts.agentBackend) {
      throw new Error(
        `flow: agent("${label}") requires an agentBackend (none configured).`,
      );
    }
    const output = await sem.run(() => opts.agentBackend!(prompt, o));
    journal.append({
      key,
      kind: "step",
      taskId: label,
      phase,
      fingerprint,
      status: "done",
      output,
    });
    return output;
  }

  const ctx: FlowContext = {
    meta: def.meta ?? {},
    args: opts.args,
    phase(title) {
      currentPhase = title;
    },
    log(msg) {
      opts.onLog?.(msg);
    },
    now() {
      return journaledValue("now", () => clock());
    },
    uuid() {
      return journaledValue("uuid", () => uuidFn());
    },
    state,
    useState(key, initial) {
      const value = (
        stateStore.has(key) ? stateStore.read(key) : initial
      ) as any;
      return [value, (v: any) => stateSet(key, v)];
    },
    Task: runTask,
    task: runTask,
    agent: runAgent,
    async parallel(thunks) {
      return Promise.all(thunks.map((t) => t()));
    },
    async pipeline(items, ...stages) {
      return Promise.all(
        items.map(async (item, i) => {
          let v: any = item;
          for (const stage of stages) v = await stage(v, item, i);
          return v;
        }),
      );
    },
  };

  const result = await def.flow(ctx);

  // Determinism check: on resume, warn if prior-run steps are no longer
  // requested (control flow diverged). Warning-only — never blocks a run.
  if (opts.resume) {
    const orphans = journal.orphanedKeys();
    if (orphans.length > 0) {
      opts.onLog?.(
        `determinism: ${orphans.length} journaled step(s) were not re-requested ` +
          `on resume (flow changed?): ${orphans.slice(0, 5).join(", ")}` +
          (orphans.length > 5 ? " …" : ""),
      );
    }
  }
  return result;
}
