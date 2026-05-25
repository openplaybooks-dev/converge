import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { TaskDag } from "../dag/task-dag.js";
import { buildDagFromPlaybookObject, injectRootNodes, splitContainerNodes } from "../manifest/build-dag.js";
import { buildDagFromPlaybook } from "../config/declarative-loader.js";
import { discoverStaticChildren } from "../task/discovery/static-children.js";
import { hashUnifiedPlaybook } from "./compile-unified.js";
import type { Playbook } from "../playbook.js";
import type { LoaderError } from "../config/declarative-loader.js";

export async function compilePlaybook(
  playbook: Playbook,
  playbookDir: string,
  playbookName: string,
  targetDir: string,
  projectDir: string,
): Promise<{ dag: TaskDag; errors: LoaderError[]; playbookHash: string }> {
  const hasInMemoryTasks = playbook.tasks.size > 0;
  const inventoryDir = join(projectDir, ".converge", "inventory", playbookName);

  let manifestPath = join(targetDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    const journalPath = join(projectDir, ".converge", "journal", playbookName, "manifest.json");
    if (existsSync(journalPath)) {
      manifestPath = journalPath;
    }
  }

  if (existsSync(manifestPath)) {
    try {
      const manifestRaw = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestRaw);
      const currentHash = hashUnifiedPlaybook(playbookDir, inventoryDir);
      const manifestHash = manifest.metadata?.playbook_hash;
      if (manifestHash && manifestHash === currentHash) {
        const { buildDagFromManifest } = await import("../manifest/build-dag.js");
        const result = buildDagFromManifest(manifest);
        await expandHooksFromPlaybook(playbook, result.dag);
        return {
          dag: result.dag,
          errors: result.errors,
          playbookHash: manifestHash,
        };
      }
    } catch {
      // Stale or corrupt manifest: fall through to recompile
    }
  }

  const tasksFile = join(inventoryDir, "tasks.jsonl");
  if (existsSync(tasksFile)) {
    const { compileUnified } = await import("./compile-unified.js");
    const { dag, errors, playbookHash } = compileUnified(playbookDir, inventoryDir);

    const idToPath = new Map<string, string>();
    discoverStaticChildren(dag, idToPath);
    splitContainerNodes(dag);
    injectRootNodes(dag, playbookName, playbookDir);
    await expandHooksFromPlaybook(playbook, dag);
    return { dag, errors, playbookHash };
  }

  if (hasInMemoryTasks) {
    const result = buildDagFromPlaybookObject(playbook);
    await expandHooksFromPlaybook(playbook, result.dag);
    return {
      dag: result.dag,
      errors: result.errors,
      playbookHash: hashUnifiedPlaybook(playbookDir, inventoryDir),
    };
  }

  if (existsSync(join(playbookDir, "tasks"))) {
    const { dag, errors } = buildDagFromPlaybook(playbookDir);
    await expandHooksFromPlaybook(playbook, dag);
    return {
      dag,
      errors,
      playbookHash: hashUnifiedPlaybook(playbookDir, inventoryDir),
    };
  }

  return {
    dag: new TaskDag(),
    errors: [],
    playbookHash: hashUnifiedPlaybook(playbookDir, inventoryDir),
  };
}

export async function expandHooksFromPlaybook(
  playbook: Playbook,
  dag: TaskDag,
): Promise<void> {
  const hooks = playbook.def.hooks;
  if (!hooks || hooks.length === 0) return;

  await ensureBuiltinsLoaded();

  for (const hook of hooks) {
    const builtinName = (hook.config as any)?.__builtin as string | undefined;
    if (builtinName) {
      const resolved = resolveBuiltinHook(builtinName, hook.config);
      if (resolved) {
        (hook as any).fn = resolved;
      }
    }
  }

  const { expandHooks } = await import("../dag/hook-nodes.js");
  expandHooks(hooks, dag);
}

const _builtinHookFactories: Record<
  string,
  (config?: Record<string, unknown>) => any
> = {};

let _builtinsLoaded = false;

async function ensureBuiltinsLoaded(): Promise<void> {
  if (_builtinsLoaded) return;
  _builtinsLoaded = true;
  try {
    const { gitCommitHook, prCreateHook } = await import(
      "../hooks/builtins/git.js"
    );
    _builtinHookFactories["git-commit"] = (cfg) => gitCommitHook(cfg as any);
    _builtinHookFactories["pr-create"] = (cfg) => prCreateHook(cfg as any);
  } catch {
    // builtins are optional
  }
}

function resolveBuiltinHook(
  name: string,
  config?: Record<string, unknown>,
): any | null {
  const factory = _builtinHookFactories[name];
  if (!factory) {
    console.warn(`[hooks] Unknown builtin hook: "${name}". Skipping.`);
    return null;
  }
  return factory(config);
}

export function hashPlaybook(playbookDir: string): string {
  const hash = createHash("sha256");
  const ymlPath = join(playbookDir, "playbook.yml");
  if (existsSync(ymlPath)) {
    hash.update(readFileSync(ymlPath, "utf-8"));
  }
  const tasksDir = join(playbookDir, "tasks");
  if (existsSync(tasksDir)) {
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === "TASK.md") hash.update(readFileSync(full, "utf-8"));
      }
    };
    walk(tasksDir);
  }
  return `sha256:${hash.digest("hex")}`;
}
