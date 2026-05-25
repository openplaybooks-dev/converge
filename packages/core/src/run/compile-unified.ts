/**
 * RFC 0031: Unified compilation helpers
 *
 * Reads tasks.jsonl (unified format) to build a TaskDag and compute a
 * deterministic hash of the playbook's source.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { TaskDag } from "../dag/task-dag.js";
import type { Check } from "../config/task-definition.js";
import type { InterceptorRegistry } from "../hooks/interceptor-registry.ts";
import {
  buildDagFromUnifiedInventory,
  type LoaderError,
  type UnifiedDagResult,
} from "../config/declarative-loader-unified.ts";

export interface CompileUnifiedResult {
  dag: TaskDag;
  errors: LoaderError[];
  globalChecks: Check[];
  playbookHash: string;
}

/**
 * Compile a playbook from the unified tasks.jsonl format.
 * Replaces the legacy compilePlaybook that dispatched on playbook.yml.
 */
export function compileUnified(
  playbookDir: string,
  inventoryDir: string,
): CompileUnifiedResult {
  const { dag, errors, globalChecks, playbookHeader } = buildDagFromUnifiedInventory(
    playbookDir,
    inventoryDir,
  );

  const playbookHash = hashUnifiedPlaybook(playbookDir, inventoryDir);

  return { dag, errors, globalChecks, playbookHash };
}

/**
 * Compile with optional interceptor support (RFC 0014).
 * Interceptors can transform the compilation result (e.g., inject nodes,
 * validate structure, add synthetic dependencies).
 */
export async function compileUnifiedWithInterceptors(
  playbookDir: string,
  inventoryDir: string,
  interceptorRegistry?: InterceptorRegistry,
): Promise<CompileUnifiedResult> {
  const baseResult = compileUnified(playbookDir, inventoryDir);

  if (interceptorRegistry?.has("intercept:dag-compile")) {
    return interceptorRegistry.intercept(
      "intercept:dag-compile",
      baseResult,
      async (r) => r,
    );
  }

  return baseResult;
}

/**
 * Compute a deterministic hash of all source that contributes to the DAG.
 *
 * Hash inputs:
 * 1. playbook.yml, when present
 * 2. Row-1 header from tasks.jsonl (playbook-level metadata)
 * 3. Static TASK.md files referenced by task rows
 * 4. Template TASK.md + PARAMS.yml files referenced by spawned task rows
 *
 * Only unified surfaces (tasks.jsonl, playbook.yml, TASK.md) are hashed.
 */
export function hashUnifiedPlaybook(playbookDir: string, inventoryDir: string): string {
  const hash = createHash("sha256");

  // 1. Hash playbook.yml so run metadata and task lists are part of the digest.
  const playbookYamlPath = join(playbookDir, "playbook.yml");
  if (existsSync(playbookYamlPath)) {
    hash.update(readFileSync(playbookYamlPath, "utf-8"));
  }

  // 2. Hash the tasks.jsonl header row
  const tasksFile = join(inventoryDir, "tasks.jsonl");
  if (existsSync(tasksFile)) {
    const content = readFileSync(tasksFile, "utf-8");
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length > 0) {
      hash.update(lines[0]);
    }
  }

  // 3. Hash all TASK.md files referenced by task rows
  if (existsSync(tasksFile)) {
    const content = readFileSync(tasksFile, "utf-8");
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = JSON.parse(lines[i]);
        if (row?.taskRef?.kind === "static" && row.taskRef.dir) {
          const taskMdPath = join(row.taskRef.dir, "TASK.md");
          if (existsSync(taskMdPath)) {
            hash.update(readFileSync(taskMdPath, "utf-8"));
          }
        }
        if (row?.taskRef?.kind === "template" && row.taskRef.name) {
          const templateMdPath = join(playbookDir, "templates", row.taskRef.name, "TASK.md");
          if (existsSync(templateMdPath)) {
            hash.update(readFileSync(templateMdPath, "utf-8"));
          }
          const paramsPath = join(playbookDir, "templates", row.taskRef.name, "PARAMS.yml");
          if (existsSync(paramsPath)) {
            hash.update(readFileSync(paramsPath, "utf-8"));
          }
        }
      } catch {
        // Skip malformed rows
      }
    }
  }

  return `sha256:${hash.digest("hex")}`;
}
