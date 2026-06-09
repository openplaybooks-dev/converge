/**
 * RFC 0050 Phase 1 — run a flow step through the real DAG executor.
 *
 * Replaces the stopgap `defaultRunStep` (which spun up a fresh `run()` per
 * step) with `executeSingleNode` — the same per-node machinery the DAG engine
 * uses (Unit construction, env/exec-dir, `executeTask`, attempts, checks,
 * hooks). One long-lived `RunStateManager` is shared across the flow so every
 * step is PROJECTED into `runstate.json`, making `inspect` / `status` / Studio
 * render the flow for free.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { TaskDag } from "../../dag/task-dag.js";
import type { DagNode } from "../../dag/dag-node.js";
import { RunStateManager } from "../../manifest/run-state-manager.js";
import { TaskStateManager } from "../../checkpoint/state.js";
import { ExecutionLogger } from "../../journal/execution-logger.js";
import { executeSingleNode } from "../index.js";
import type { Reporter } from "../types.js";
import type { ResolvedFlowTask } from "./runtime.js";

export interface FlowExecContext {
  projectDir: string;
  playbookDir: string;
  flowName: string;
  resultsMgr: RunStateManager;
  checkpointMgr: TaskStateManager;
  executionLogger: ExecutionLogger;
  reporter?: Reporter;
  stubMode?: boolean;
  maxTaskAttempts: number;
}

export async function createFlowExecutionContext(opts: {
  projectDir: string;
  flowName: string;
  playbookDir?: string;
  reporter?: Reporter;
  stubMode?: boolean;
  maxTaskAttempts?: number;
}): Promise<FlowExecContext> {
  const {
    projectDir,
    flowName,
    playbookDir = projectDir,
    reporter,
    stubMode,
    maxTaskAttempts = 3,
  } = opts;
  const executionDir = join(projectDir, ".converge", "journal", flowName);
  mkdirSync(executionDir, { recursive: true });

  const resultsMgr = new RunStateManager(
    executionDir,
    new TaskDag(),
    undefined,
    projectDir,
  );
  const checkpointMgr = new TaskStateManager(projectDir);
  const executionLogger = new ExecutionLogger(
    projectDir,
    flowName,
    { maxIterations: 0, maxAttemptsPerTask: maxTaskAttempts },
    flowName,
  );
  await executionLogger.writeExecutionStart();
  // runTask reads CONVERGE_PLAYBOOK for journal/exec-dir paths.
  process.env.CONVERGE_PLAYBOOK = flowName;

  return {
    projectDir,
    playbookDir,
    flowName,
    resultsMgr,
    checkpointMgr,
    executionLogger,
    reporter,
    stubMode,
    maxTaskAttempts,
  };
}

/** Read a task's declared outputs back as the step's return value. */
function readOutputs(projectDir: string, outputs?: string[]): any {
  if (!outputs || outputs.length === 0) return {};
  const results: Record<string, any> = {};
  for (const out of outputs) {
    const p = isAbsolute(out) ? out : join(projectDir, out);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf-8");
    try {
      results[out] = JSON.parse(raw);
    } catch {
      results[out] = raw;
    }
  }
  const vals = Object.values(results);
  return vals.length === 1 ? vals[0] : results;
}

/**
 * Execute one TASK.md-backed step via the real executor, projecting it into
 * the shared runstate. `stepKey` is the deterministic flow key — used as the
 * runstate node id so fan-out items (same task id, different params) stay
 * distinct.
 */
export async function executeStepViaNode(
  ctx: FlowExecContext,
  resolved: ResolvedFlowTask,
  params: any,
  stepKey: string,
): Promise<any> {
  if (!resolved.taskMdPath) {
    throw new Error(`flow: TASK.md path missing for step "${resolved.id}"`);
  }

  // The executor derives the Unit context from the on-disk layout, and only
  // accepts inventory / journal-spawned / epics paths. So MATERIALIZE the
  // resolved TASK.md (with `{{var}}` rendered + params injected as vars) under
  // `.converge/journal/<flow>/spawned/<id>/TASK.md` — a layout the context
  // derivation accepts — and point the node there.
  let content = readFileSync(resolved.taskMdPath, "utf-8");
  const vars: Record<string, string> = {};
  if (params && typeof params === "object") {
    for (const [k, v] of Object.entries(params)) {
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      content = content.split(`{{${k}}}`).join(s);
      vars[k] = s;
    }
  }
  // Unique, numbered dir id (extractLeafTaskId needs an NN- prefix). For a
  // `.../<name>/TASK.md` ref, use the containing dir name, not "TASK.md".
  const idRaw = resolved.id.replace(/\/?TASK\.md$/i, "");
  const baseId = (idRaw.split("/").pop() || resolved.id).replace(
    /[^A-Za-z0-9_-]/g,
    "-",
  );
  const numbered = /^\d+-/.test(baseId) ? baseId : `01-${baseId}`;
  const hash = createHash("sha256").update(stepKey).digest("hex").slice(0, 8);
  const dirId = `${numbered}-${hash}`;
  content = content.replace(/^id:\s*.+$/m, `id: ${dirId}`);
  if (Object.keys(vars).length > 0) {
    const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fm) {
      let fmBody = fm[1];
      const hasVarsBlock = /^vars:\s*$/m.test(fmBody);
      if (hasVarsBlock) {
        // Fill values into the existing `vars:` block (don't add a second one,
        // which would make YAML reject duplicate keys).
        for (const [k, v] of Object.entries(vars)) {
          // Match a declared key line regardless of whether it already has a
          // value (`wave: 0`) or is empty (`sprint_id:`), replacing the whole
          // value — never inserting a duplicate key (YAML rejects those).
          const declared = new RegExp(`(^|\\n)(\\s+)${k}:[^\\n]*`);
          if (declared.test(fmBody)) {
            fmBody = fmBody.replace(declared, `$1$2${k}: ${JSON.stringify(v)}`);
          } else {
            fmBody = fmBody.replace(
              /^(vars:\s*\n)/m,
              `$1  ${k}: ${JSON.stringify(v)}\n`,
            );
          }
        }
      } else {
        const varLines = Object.entries(vars)
          .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
          .join("\n");
        fmBody = `${fmBody}\nvars:\n${varLines}`;
      }
      content = content.replace(fm[1], fmBody);
    }
  }
  const spawnDir = join(
    ctx.projectDir,
    ".converge",
    "journal",
    ctx.flowName,
    "spawned",
    dirId,
  );
  mkdirSync(spawnDir, { recursive: true });
  const matPath = join(spawnDir, "TASK.md");
  writeFileSync(matPath, content);

  const node: DagNode = {
    id: stepKey,
    type: "normal",
    parent: undefined,
    parents: [],
    children: [],
    depends_on: [],
    depended_on_by: [],
    taskDef: {
      id: stepKey,
      title: resolved.id,
      outputs: resolved.outputs ?? [],
      vars,
    } as any,
    path: matPath,
    status: "pending",
    virtual: false,
  };

  ctx.resultsMgr.upsertNode(node);
  const dag = new TaskDag();
  dag.addNode(node);

  const result = await executeSingleNode({
    node,
    projectDir: ctx.projectDir,
    playbookDir: ctx.playbookDir,
    maxTaskAttempts: ctx.maxTaskAttempts,
    resultsMgr: ctx.resultsMgr,
    checkpointMgr: ctx.checkpointMgr,
    executionLogger: ctx.executionLogger,
    dag,
    reporter: ctx.reporter,
    stubMode: ctx.stubMode,
  });

  if (!result.success) {
    throw new Error(
      `flow: task "${resolved.id}" (${stepKey}) failed${
        result.blocked ? " (blocked)" : ""
      }`,
    );
  }
  return readOutputs(ctx.projectDir, resolved.outputs);
}
