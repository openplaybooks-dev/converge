/**
 * Universal reconciliation phase - runs at the start of every command
 * to auto-collect all data and correct status across the state tree.
 *
 * Ensures checkpoint state matches reality by:
 * 1. Scanning filesystem for task definitions
 * 2. Loading checkpoint and journal status
 * 3. Validating outputs for completed/failed tasks
 * 4. Auto-completing parents when all children done
 * 5. Propagating status up the hierarchy
 * 6. Persisting corrections to checkpoint
 */

import { resolve, join } from "node:path";
import {
  buildTaskTree,
  getTaskStates,
  type TaskStates,
  type TaskNode,
} from "./next-task.js";
import { RunStateManager } from "@converge/core/manifest/run-state-manager.js";
import type { Manifest } from "@converge/core/manifest/types.js";
import { createDiscoveryScanner } from "@converge/core/task/discovery/scanner.js";
import { resolveConvergeConfig } from "@converge/core/config/loader.js";
import { validateConvergeConfig } from "@converge/core/config/validator.js";

export interface ReconciliationResult {
  /** All tasks in the tree */
  tree: TaskNode[];
  /** Task states after reconciliation */
  states: TaskStates;
  /** Tasks that were corrected during reconciliation */
  corrected: {
    /** Tasks moved from completed → pending (missing outputs) */
    uncompleted: string[];
    /** Tasks moved from failed → completed (all outputs exist) */
    reconciled: string[];
    /** Parents auto-completed (all children done) */
    autoCompleted: string[];
    /** Parents auto-failed (any child failed) */
    autoFailed: string[];
  };
}

/**
 * Runs the universal reconciliation phase.
 *
 * @param projectDir - Root directory of the converge project
 * @param silent - If true, suppresses reconciliation output (default: false)
 * @returns Reconciliation result with tree and corrections
 */
export async function reconcile(
  projectDir: string,
  silent = false,
): Promise<ReconciliationResult> {
  if (!silent) {
    console.log("🔄 Reconciling task state...");
  }

  // Track corrections
  const corrected = {
    uncompleted: [] as string[],
    reconciled: [] as string[],
    autoCompleted: [] as string[],
    autoFailed: [] as string[],
  };

  // 1. Resolve converge config and scan filesystem for all tasks
  const resolved = await resolveConvergeConfig(projectDir);
  if (!resolved) {
    throw new Error(
      "No .converge/PROJECT.md or .converge/project.yaml found. Run from within a converge project.",
    );
  }
  const convergeConfig = validateConvergeConfig(
    resolved.config,
    resolved.configPath,
  );

  const scanner = createDiscoveryScanner(
    convergeConfig.discovery ?? {},
    projectDir,
  );
  const discoveryResult = await scanner.scan();

  const epics = discoveryResult.files.filter((f) => f.type === "epic");
  const epicPaths = new Set(epics.map((e) => e.filePath));
  const tasks = discoveryResult.files.filter(
    (f) => f.type === "task" && !epicPaths.has(f.filePath),
  );

  const tree = await buildTaskTree(epics, tasks, projectDir);

  if (!silent) {
    console.log(
      `   Found ${tree.length} tasks across ${new Set(tree.map((t) => t.epicId)).size} epics`,
    );
  }

  // 2. Load run results state before reconciliation
  const manifest = buildManifestFromTree(tree, "default");
  const runResults = RunStateManager.fromManifest(
    join(projectDir, ".converge", "journal"),
    manifest,
  );
  const completedBefore = new Set(runResults.getCompletedTaskIds());
  const failedBefore = new Set(runResults.getFailedTaskIds());

  // 3. Run getTaskStates - this performs all reconciliation logic:
  //    - Validates outputs
  //    - Removes completed tasks with missing outputs
  //    - Reconciles failed tasks with all outputs present
  //    - Auto-completes parents when all children done
  //    - Updates checkpoints
  const states = await getTaskStates(projectDir, tree);

  // 4. Compare before/after to track corrections
  const completedAfter = states.completed;
  const failedAfter = states.failed;

  // Tasks that were completed before but not after = uncompleted (missing outputs)
  for (const taskId of completedBefore) {
    if (!completedAfter.has(taskId as string)) {
      corrected.uncompleted.push(taskId as string);
    }
  }

  // Tasks that were failed before but completed after = reconciled (outputs exist)
  for (const taskId of failedBefore) {
    if (
      completedAfter.has(taskId as string) &&
      !completedBefore.has(taskId as string)
    ) {
      corrected.reconciled.push(taskId as string);
    }
  }

  // Log corrections if any occurred
  if (
    !silent &&
    (corrected.uncompleted.length > 0 || corrected.reconciled.length > 0)
  ) {
    console.log("   Corrections applied:");

    if (corrected.uncompleted.length > 0) {
      console.log(
        `     Uncompleted (missing outputs): ${corrected.uncompleted.length}`,
      );
      for (const taskId of corrected.uncompleted) {
        console.log(`       - ${taskId}`);
      }
    }

    if (corrected.reconciled.length > 0) {
      console.log(
        `     Reconciled (outputs exist): ${corrected.reconciled.length}`,
      );
      for (const taskId of corrected.reconciled) {
        console.log(`       - ${taskId}`);
      }
    }
  }

  if (!silent) {
    console.log(`   ✓ Reconciliation complete\n`);
  }

  return {
    tree,
    states,
    corrected,
  };
}

function buildManifestFromTree(tree: TaskNode[], playbookName: string): Manifest {
  const nodes: Record<string, any> = {};
  for (const node of tree) {
    nodes[node.journalTaskId] = {
      id: node.journalTaskId,
      depends_on: [],
      depended_on_by: [],
      tags: [],
      checks: [],
      inputs: [],
      outputs: [],
      frontmatter_hash: "",
      body_hash: "",
      checks_hash: "",
      inputs_hash: "",
      upstream_hash: "",
      state: "concrete",
      path: node.filePath,
      seed: null,
    };
  }
  return {
    metadata: {
      playbook: playbookName,
      generated_at: new Date().toISOString(),
      converge_version: "0.1.0",
      frontier_count: 0,
    },
    nodes,
    child_map: {},
    parent_map: {},
  } as Manifest;
}
