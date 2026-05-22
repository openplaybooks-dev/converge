/**
 * Reconcile Command — Inventory-Centric State Recovery
 *
 * Architecture:
 *   Inventory (tasks.jsonl)  = source of truth
 *   Runstate (runstate.json) = read-only log that mirrors inventory
 *   Journal = execution artifacts, not source
 *
 * Flow:
 *   1. Audit inventory — compare each entry's status vs reality on disk
 *   2. Human reviews discrepancies, marks tasks progressively:
 *        converge tasks mark <id> --playbook=<name> --status done|todo|dropped
 *   3. reconcile --fix  — updates inventory to match reality
 *   4. Runstate rebuilt to mirror inventory (log only, no journal touch)
 *
 *   converge reconcile --playbook=<name>        # audit only (default)
 *   converge reconcile --playbook=<name> --fix  # auto-correct inventory + runstate
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import type { CommonOptions } from "./commands.ts";

export interface ReconcileOptions extends CommonOptions {
  playbook?: string;
  fix?: boolean;
}

export interface ReconcileResult {
  fixed: boolean;
  inventoryUpdated: number;
  cachedTasks: string[];
  pendingTasks: string[];
  discrepancies: Discrepancy[];
}

export interface Discrepancy {
  task: string;
  severity: "error" | "warning" | "info";
  message: string;
  suggestedFix: string;
}

function runstatePath(projectDir: string, playbookName: string): string {
  return join(projectDir, ".converge", "journal", playbookName, "runstate.json");
}

function inventoryPath(projectDir: string, playbookName: string): string {
  return join(projectDir, ".converge", "inventory", playbookName, "tasks.jsonl");
}

interface InventoryEntry {
  id: string;
  status: string;
  outputs?: string[];
  source?: string;
  [key: string]: unknown;
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Phase 1: Audit inventory vs disk outputs                            */
/* ──────────────────────────────────────────────────────────────────── */

function auditInventory(
  projectDir: string,
  playbookName: string,
): { entries: InventoryEntry[]; discrepancies: Discrepancy[]; cachedTasks: string[]; pendingTasks: string[] } {
  const invPath = inventoryPath(projectDir, playbookName);
  const discrepancies: Discrepancy[] = [];
  const cachedTasks: string[] = [];
  const pendingTasks: string[] = [];
  const entries: InventoryEntry[] = [];

  if (!existsSync(invPath)) {
    discrepancies.push({
      task: "(inventory)",
      severity: "error",
      message: "No tasks.jsonl found — inventory is empty",
      suggestedFix: `converge run --playbook=${playbookName}  # first run creates inventory`,
    });
    return { entries, discrepancies, cachedTasks, pendingTasks };
  }

  const lines = readFileSync(invPath, "utf-8").trim().split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as InventoryEntry;
      entries.push(entry);

      const outputs = entry.outputs ?? [];
      const status = entry.status;
      const taskId = entry.id;

      // Check if outputs exist on disk
      if (outputs.length > 0) {
        const allExist = outputs.every((o) => existsSync(join(projectDir, o)));

        if (allExist) {
          if (status === "todo" || status === "dropped" || status === "doing") {
            discrepancies.push({
              task: taskId,
              severity: "warning",
              message: `Outputs exist on disk but inventory says "${status}"`,
              suggestedFix: `converge tasks mark ${taskId} --playbook=${playbookName} --status done`,
            });
          }
          cachedTasks.push(taskId);
        } else {
          pendingTasks.push(taskId);
        }
      } else {
        // No declared outputs
        if (status === "done") {
          cachedTasks.push(taskId);
        } else if (status !== "dropped") {
          pendingTasks.push(taskId);
        }
      }

      // Check for stuck "doing"
      if (status === "doing") {
        discrepancies.push({
          task: taskId,
          severity: "warning",
          message: `Task is "doing" but no run is active`,
          suggestedFix: `converge tasks mark ${taskId} --playbook=${playbookName} --status todo`,
        });
      }
    } catch (e) {
      discrepancies.push({
        task: "(malformed line)",
        severity: "error",
        message: `Malformed inventory entry: ${(e as Error).message}`,
        suggestedFix: "Remove or fix the malformed line in tasks.jsonl",
      });
    }
  }

  return { entries, discrepancies, cachedTasks, pendingTasks };
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Phase 2: Fix inventory to match reality                             */
/* ──────────────────────────────────────────────────────────────────── */

function fixInventory(
  projectDir: string,
  playbookName: string,
): { entries: InventoryEntry[]; updated: number; discrepancies: Discrepancy[] } {
  const invPath = inventoryPath(projectDir, playbookName);
  const discrepancies: Discrepancy[] = [];
  let updated = 0;
  const entries: InventoryEntry[] = [];

  if (!existsSync(invPath)) {
    return { entries, updated: 0, discrepancies };
  }

  const lines = readFileSync(invPath, "utf-8").trim().split("\n");
  const newLines: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as InventoryEntry;
      const outputs = entry.outputs ?? [];
      const oldStatus = entry.status;
      const taskId = entry.id;
      let changed = false;

      // If outputs exist on disk but status isn't done/dropped → mark done
      if (outputs.length > 0 && oldStatus !== "done" && oldStatus !== "dropped") {
        const allExist = outputs.every((o) => existsSync(join(projectDir, o)));
        if (allExist) {
          entry.status = "done";
          changed = true;
          discrepancies.push({
            task: taskId,
            severity: "info",
            message: `${oldStatus} → done (outputs verified on disk)`,
            suggestedFix: "",
          });
        }
      }

      // If status is "doing" but no run → mark todo
      if (oldStatus === "doing") {
        entry.status = "todo";
        changed = true;
        discrepancies.push({
          task: taskId,
          severity: "info",
          message: `doing → todo (no active run)`,
          suggestedFix: "",
        });
      }

      if (changed) updated++;
      entries.push(entry);
      newLines.push(JSON.stringify(entry));
    } catch {
      // Drop malformed entries
      updated++;
      discrepancies.push({
        task: "(malformed)",
        severity: "info",
        message: "Dropped malformed inventory entry",
        suggestedFix: "",
      });
    }
  }

  if (updated > 0) {
    writeFileSync(invPath, newLines.join("\n") + "\n");
  }

  return { entries, updated, discrepancies };
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Phase 3: Rebuild runstate to mirror inventory (log only)            */
/* ──────────────────────────────────────────────────────────────────── */

function rebuildRunstateFromInventory(
  projectDir: string,
  playbookName: string,
  entries: InventoryEntry[],
): void {
  if (entries.length === 0) return;

  const now = new Date().toISOString();
  const nodes: Record<string, unknown> = {};

  for (const entry of entries) {
    const taskId = entry.id;
    const outputs = entry.outputs ?? [];
    const rsStatus = entry.status === "done" ? "pass" : entry.status === "dropped" ? "dropped" : "pending";

    nodes[taskId] = {
      status: rsStatus,
      attempts: entry.status === "done" ? 1 : 0,
      duration_ms: 0,
      depends_on: [],
      depended_on_by: [],
      title: entry.title || taskId,
      description: "",
      inputs: [],
      outputs: outputs,
      checks: [],
      tags: [],
      vars: {},
      journal_path: `.converge/journal/${playbookName}/tasks/${taskId}/`,
      source_path: "",
      spawned_children: [],
      seed: null,
      ...(entry.status === "done" ? { completed_at: now } : {}),
    };
  }

  const pendingCount = entries.filter((e) => e.status !== "done" && e.status !== "dropped").length;

  const runState = {
    metadata: {
      execution_id: playbookName,
      selector: "",
      playbook: playbookName,
      status: pendingCount > 0 ? "running" : "complete",
      playbook_hash: "",
      generated_at: now,
      converge_version: "0.4.0",
      total_nodes: Object.keys(nodes).length,
    },
    dag: { nodes },
  };

  const rsPath = runstatePath(projectDir, playbookName);
  const rsDir = dirname(rsPath);
  if (!existsSync(rsDir)) mkdirSync(rsDir, { recursive: true });
  writeFileSync(rsPath, JSON.stringify(runState, null, 2) + "\n");
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Main command                                                        */
/* ──────────────────────────────────────────────────────────────────── */

export async function reconcileCommand(
  options: ReconcileOptions = {},
): Promise<ReconcileResult> {
  const projectDir = resolve(options.dir || process.cwd());
  const playbookName = options.playbook || process.env.CONVERGE_PLAYBOOK || "default";
  const doFix = options.fix === true;

  console.log(`\n🔄 Reconciling playbook: ${playbookName}`);
  console.log(`   Project: ${projectDir}`);
  console.log(`   Mode:    ${doFix ? "fix (update inventory + runstate)" : "audit (report only)"}\n`);

  // Phase 1: Audit inventory
  console.log("   [1/3] Auditing inventory...");
  const audit = auditInventory(projectDir, playbookName);

  if (audit.discrepancies.length === 0) {
    console.log("   ✓ Inventory is clean");
  } else {
    const warnings = audit.discrepancies.filter((d) => d.severity === "warning");
    const errors = audit.discrepancies.filter((d) => d.severity === "error");
    if (errors.length > 0) {
      for (const d of errors) console.log(`   ✗ ${d.task}: ${d.message}`);
    }
    if (warnings.length > 0) {
      for (const d of warnings) console.log(`   ⚠ ${d.task}: ${d.message}`);
    }
  }

  let entries = audit.entries;

  // Phase 2: Fix or report
  if (doFix) {
    console.log("\n   [2/3] Fixing inventory...");
    const fix = fixInventory(projectDir, playbookName);
    entries = fix.entries;

    for (const d of fix.discrepancies) {
      console.log(`   ${d.task}: ${d.message}`);
    }
    console.log(`   ✓ Updated ${fix.updated} inventory entries`);

    // Phase 3: Rebuild runstate from inventory
    console.log("\n   [3/3] Rebuilding runstate (log) from inventory...");
    rebuildRunstateFromInventory(projectDir, playbookName, entries);
    console.log("   ✓ Runstate updated to mirror inventory");
  } else {
    console.log("\n   [2/3] No changes made (audit mode)");
    console.log("   Use --fix to apply automatic corrections");
  }

  // Summary
  console.log("\n📊 Reconciled state:");
  console.log(`   Cached (done):     ${audit.cachedTasks.length} tasks`);
  console.log(`   Pending:           ${audit.pendingTasks.length} tasks`);
  console.log(`   Discrepancies:     ${audit.discrepancies.length}`);

  if (audit.discrepancies.length > 0 && !doFix) {
    console.log("\n   Progressive fix commands:");
    for (const d of audit.discrepancies.filter((d) => d.severity !== "info")) {
      console.log(`     → ${d.suggestedFix}`);
    }
    console.log("\n   Or: converge reconcile --playbook=<name> --fix  # auto-correct");
  }

  if (audit.pendingTasks.length > 0) {
    const nextFew = audit.pendingTasks.slice(0, 5);
    console.log(`\n   Next to run:  ${nextFew.join(" → ")}${audit.pendingTasks.length > 5 ? " → ..." : ""}`);
  }

  console.log(`\nAfter fixing, run: converge run --resume --playbook=${playbookName}`);

  return {
    fixed: doFix,
    inventoryUpdated: doFix ? audit.discrepancies.filter((d) => d.severity === "info").length : 0,
    cachedTasks: audit.cachedTasks,
    pendingTasks: audit.pendingTasks,
    discrepancies: audit.discrepancies,
  };
}
