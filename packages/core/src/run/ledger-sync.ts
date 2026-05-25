import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import type { DagNode } from "../dag/dag-node.js";
import { TaskDag } from "../dag/task-dag.js";
import type { RunStateManager } from "../manifest/index.js";
import { readRuntimeLedgerState } from "../task/goal/runtime-ledger.js";
import type { Reporter } from "./types.js";

export async function syncLedgerToDag(args: {
  projectDir: string;
  playbookName: string;
  dag: TaskDag;
  resultsMgr: RunStateManager;
  reporter?: Reporter;
}): Promise<void> {
  const { projectDir, playbookName, dag, resultsMgr, reporter } = args;

  let state;
  try {
    state = readRuntimeLedgerState(projectDir, playbookName);
  } catch (err: any) {
    reporter?.emit({
      kind: "log",
      level: "warn",
      message: `[ledger-sync] failed to read ledger: ${err.message}`,
    });
    return;
  }

  const spawnedCount = state.tasks.filter(t => t.source === "spawned").length;
  const staticCount = state.tasks.filter(t => t.source === "static").length;
  reporter?.emit({
    kind: "log",
    level: "info",
    message: `[ledger-sync] loaded ${state.tasks.length} tasks (${spawnedCount} spawned, ${staticCount} static)`,
  });

  const { parseTaskMdString, mapTaskMdToTaskDefinition } = await import(
    "../config/task-md-definition.js"
  );

  const resolveTaskPath = (rowTaskPath: string, rowTaskRef?: { kind: string; name: string }): string | null => {
    if (rowTaskPath) {
      const absPath = join(projectDir, rowTaskPath);
      if (existsSync(absPath) && statSync(absPath).isDirectory()) {
        const taskMdInDir = join(absPath, "TASK.md");
        if (existsSync(taskMdInDir)) return taskMdInDir;
        const spawnedAbs = absPath.replace(/\/tasks\//, "/spawned/");
        const spawnedTaskMd = join(spawnedAbs, "TASK.md");
        if (existsSync(spawnedTaskMd)) return spawnedTaskMd;
      }
      if (existsSync(absPath)) return absPath;
    }
    if (rowTaskRef?.kind === "template") {
      const templatePath = join(projectDir, ".converge", "playbooks", playbookName, "templates", rowTaskRef.name, "TASK.md");
      if (existsSync(templatePath)) return templatePath;
    }
    if (rowTaskPath) {
      const absPath = join(projectDir, rowTaskPath);
      if (existsSync(absPath) && statSync(absPath).isDirectory()) {
        const taskMdInDir = join(absPath, "TASK.md");
        if (existsSync(taskMdInDir)) return taskMdInDir;
      } else if (existsSync(absPath)) {
        return absPath;
      }
    }
    return null;
  };

  const renderBodyWithParams = (body: string, params: Record<string, unknown> | undefined): string => {
    if (!params || typeof params !== "object") return body;
    return body.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key in params) return String(params[key]);
      return match;
    });
  };

  for (const row of state.tasks) {
    if (row.source !== "spawned") continue;
    await syncLedgerRowToDag(row, {
      projectDir, playbookName, dag, resultsMgr, reporter,
      resolveTaskPath,
      parseTaskMdString,
      mapTaskMdToTaskDefinition,
    });
  }

  for (const row of state.tasks) {
    if (row.source !== "static") continue;
    if (dag.nodes.has(row.id)) continue;

    const taskRef = (row as any).taskRef;
    if (!taskRef?.kind || !taskRef.name) continue;

    const taskMdAbs = resolveTaskPath(row.taskPath, taskRef);
    if (!taskMdAbs) continue;

    await syncLedgerRowToDag(row, {
      projectDir, playbookName, dag, resultsMgr, reporter,
      resolveTaskPath: () => taskMdAbs,
      parseTaskMdString,
      mapTaskMdToTaskDefinition,
    });
  }

  for (const row of state.tasks) {
    if (row.source !== "static") continue;
    if ((row as any).taskRef?.kind) continue;

    const inferredTemplate = inferTemplateFromTaskId(
      row.id,
      join(projectDir, ".converge", "playbooks", playbookName, "templates"),
    );
    if (!inferredTemplate) continue;

    const taskMdPath = join(inferredTemplate, "TASK.md");
    if (!existsSync(taskMdPath)) continue;

    const resolvedPath = resolveTaskPath(row.taskPath, (row as any).taskRef) ?? taskMdPath;

    await syncLedgerRowToDag(row, {
      projectDir, playbookName, dag, resultsMgr, reporter,
      resolveTaskPath: () => resolvedPath,
      parseTaskMdString,
      mapTaskMdToTaskDefinition,
    });
  }
}

export function inferTemplateFromTaskId(taskId: string, templatesDir: string): string | null {
  if (!existsSync(templatesDir)) return null;

  const stepMatch = taskId.match(/-(\d{2})$/);
  if (!stepMatch) return null;

  const step = stepMatch[1];

  let dirs: string[];
  try {
    dirs = readdirSync(templatesDir, { withFileTypes: true })
      .filter((d: any) => d.isDirectory())
      .map((d: any) => d.name);
  } catch {
    return null;
  }

  const candidates = dirs.filter((d: string) => d.includes(`-${step}-`));

  if (candidates.length === 0) {
    const prefix = taskId.substring(0, taskId.lastIndexOf(`-${step}`));
    if (prefix) {
      const prefixMatch = dirs.find((d: string) => d.startsWith(prefix));
      if (prefixMatch) return join(templatesDir, prefixMatch);
    }
    return null;
  }

  if (candidates.length === 1) return join(templatesDir, candidates[0]);

  return join(templatesDir, candidates[0]);
}

async function syncLedgerRowToDag(
  row: { id: string; taskPath: string; parent?: string; playbook?: string; source?: string; params?: Record<string, unknown> },
  ctx: {
    projectDir: string;
    playbookName: string;
    dag: TaskDag;
    resultsMgr: RunStateManager;
    reporter?: Reporter;
    resolveTaskPath: (taskPath: string, taskRef?: { kind: string; name: string }) => string | null;
    parseTaskMdString: (raw: string) => any;
    mapTaskMdToTaskDefinition: (def: any, body: string, id: string, dir?: string) => any;
  },
): Promise<void> {
  const { projectDir, playbookName, dag, resultsMgr, reporter,
    resolveTaskPath, parseTaskMdString, mapTaskMdToTaskDefinition } = ctx;

  const extractVarsFromRaw = (raw: string): Record<string, unknown> | null => {
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) return null;
    const fm = fmMatch[1];
    const lines = fm.split("\n");
    let inVarsBlock = false;
    const vars: Record<string, unknown> = {};
    for (const line of lines) {
      if (/^vars:\s*$/.test(line)) {
        inVarsBlock = true;
        continue;
      }
      if (inVarsBlock) {
        if (/^  (\w+):\s*(.+)$/.test(line)) {
          const kv = line.match(/^  (\w+):\s*(.+)$/) as RegExpMatchArray;
          let val = kv[2].trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          vars[kv[1]] = val;
        } else if (/^\S/.test(line)) {
          break;
        }
      }
    }
    return Object.keys(vars).length > 0 ? vars : null;
  };

  const taskMdAbs = resolveTaskPath(row.taskPath, (row as any).taskRef);
  if (!taskMdAbs) {
    reporter?.emit({
      kind: "task-skipped",
      taskId: row.id,
      taskPath: "",
      reason: "missing-instance-file",
      detail: `Expected TASK.md for task ${row.id} but not found (taskPath=${row.taskPath}, taskRef=${JSON.stringify((row as any).taskRef)})`,
      suggestion: `Run: converge task add ${row.id} --template ${(row as any).taskRef?.name || "unknown"}`,
    } as any);
    return;
  }

  const applyParams = (taskDef: any, params: Record<string, unknown> | undefined) => {
    const effectiveParams = params && typeof params === "object" && Object.keys(params).length > 0
      ? params
      : taskDef.vars;
    if (!effectiveParams || typeof effectiveParams !== "object") return;

    const interp = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (m: string, k: string) => {
      if (k in effectiveParams && effectiveParams[k] != null) {
        return String(effectiveParams[k]);
      }
      return m;
    });
    if (taskDef.title && typeof taskDef.title === "string") {
      taskDef.title = interp(taskDef.title);
    }
    if (taskDef.prompt && typeof taskDef.prompt === "string") {
      taskDef.prompt = interp(taskDef.prompt);
    }
    if (Array.isArray(taskDef.outputs)) {
      taskDef.outputs = taskDef.outputs.map((o: string) => typeof o === "string" ? interp(o) : o);
    }
    if (Array.isArray(taskDef.checks)) {
      taskDef.checks = taskDef.checks.map((c: any) => ({
        ...c,
        cmd: typeof c.cmd === "string" ? interp(c.cmd) : c.cmd,
        description: typeof c.description === "string" ? interp(c.description) : c.description,
      }));
    }
    if (params && typeof params === "object" && Object.keys(params).length > 0) {
      const renderedVars = { ...taskDef.vars };
      if (renderedVars && typeof renderedVars === "object") {
        const declaredKeys = Object.keys(renderedVars);
        for (const key of declaredKeys) {
          if (key in params) {
            renderedVars[key] = params[key];
          }
        }
        taskDef.vars = renderedVars;
      }
    }
  };

  if (dag.nodes.has(row.id)) {
    try {
      const raw = readFileSync(taskMdAbs, "utf-8");
      const parsed = parseTaskMdString(raw);
      const freshTaskDef = await mapTaskMdToTaskDefinition(
        parsed, parsed.body ?? "", row.id, dirname(taskMdAbs),
      );
      const effectiveParams = (row as any).params ?? extractVarsFromRaw(raw) ?? parsed.vars ?? {};
      applyParams(freshTaskDef, effectiveParams);
      const existing = dag.nodes.get(row.id)!;
      existing.path = taskMdAbs;

      let mergedVars = { ...(freshTaskDef.vars ?? existing.taskDef.vars) };
      if (effectiveParams && typeof effectiveParams === "object" && Object.keys(mergedVars).length > 0) {
        const declaredKeys = Object.keys(mergedVars);
        for (const key of declaredKeys) {
          if (key in effectiveParams) {
            (mergedVars as Record<string, unknown>)[key] = effectiveParams[key];
          }
        }
      }

      existing.taskDef = {
        ...existing.taskDef,
        inputs: freshTaskDef.inputs ?? existing.taskDef.inputs,
        outputs: freshTaskDef.outputs ?? existing.taskDef.outputs,
        checks: freshTaskDef.checks ?? existing.taskDef.checks,
        vars: mergedVars,
        prompt: freshTaskDef.prompt ?? existing.taskDef.prompt,
        passthrough: undefined,
      };
    } catch { /* non-critical: node already configured */ }
    return;
  }

  try {
    const raw = readFileSync(taskMdAbs, "utf-8");
    const parsed = parseTaskMdString(raw);
    const taskDef = await mapTaskMdToTaskDefinition(
      parsed, parsed.body ?? "", row.id, dirname(taskMdAbs),
    );

    const rawVars = extractVarsFromRaw(raw);
    const effectiveVars = rawVars ?? parsed.vars ?? {};

    const effectiveParams = (row as any).params ?? effectiveVars ?? {};
    applyParams(taskDef, effectiveParams);

    const parentId = row.parent;
    const dependsOn = taskDef.depends_on && taskDef.depends_on.length > 0
      ? taskDef.depends_on
      : parentId ? [parentId] : [];

    const allOutputsExist =
      taskDef.outputs && taskDef.outputs.length > 0 &&
      taskDef.outputs.every((o: string) => existsSync(join(projectDir, o)));
    const nodeStatus = allOutputsExist ? "pass" as const : "pending" as const;

    const node: DagNode = {
      id: row.id,
      type: "normal",
      parents: parentId ? [parentId] : [],
      children: [],
      spawned_children: [],
      depends_on: dependsOn,
      depended_on_by: [],
      taskDef,
      path: taskMdAbs,
      status: nodeStatus,
      virtual: false,
    };
    dag.addNode(node);
    if (allOutputsExist) return;

    if (parentId && dag.nodes.has(parentId)) {
      await resultsMgr.addSpawnedChildNode(
        row.id, parentId, dependsOn,
        {
          title: taskDef.title ?? row.id,
          description: taskDef.description,
          inputs: taskDef.inputs ?? [],
          outputs: taskDef.outputs ?? [],
          checks: (Array.isArray(taskDef.checks) ? taskDef.checks : []).map(
            (c: any) => ({ id: c.id ?? "", description: c.description ?? "", cmd: c.cmd ?? "" }),
          ),
          tags: taskDef.tags,
          vars: taskDef.vars,
          convergePassthrough: (taskDef as any).passthrough,
          passthrough: (taskDef as any).passthrough,
          sourcePath: taskMdAbs,
        },
      );
      await resultsMgr.addSpawnedChildren(parentId, [row.id]);
    } else if (!parentId) {
      const runNode: any = {
        id: row.id,
        status: "pending" as const,
        type: "normal" as const,
        title: taskDef.title ?? row.id,
        description: taskDef.description ?? "",
        inputs: taskDef.inputs ?? [],
        outputs: taskDef.outputs ?? [],
        checks: (Array.isArray(taskDef.checks) ? taskDef.checks : []).map(
          (c: any) => ({ id: c.id ?? "", description: c.description ?? "", cmd: c.cmd ?? "" }),
        ),
        tags: taskDef.tags ?? [],
        vars: taskDef.vars ?? {},
        depends_on: dependsOn,
        depended_on_by: [],
        spawned_children: [],
        attempts: 0,
        journal_path: `.converge/journal/${row.playbook ?? "default"}/tasks/${row.id}/`,
        source_path: taskMdAbs,
      };
      resultsMgr["state"].dag.nodes[row.id] = runNode;
    }

    reporter?.emit({
      kind: "children-spawned",
      parentId: parentId ?? "",
      children: [{ id: row.id, title: taskDef.title }],
    });
  } catch (err: any) {
    reporter?.emit({
      kind: "log",
      level: "warn",
      message: `[ledger-sync] failed to register ${row.id}: ${err.message}`,
    });
  }
}
