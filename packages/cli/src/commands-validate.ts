/**
 * Verify Command - Full Project Verification
 *
 * Verifies everything: config, structure, format, dependencies, and detects potential issues.
 * 1. Checkpoint state matches filesystem reality
 * 2. TASK.md definitions follow format, structure, and syntax rules
 *
 * Usage:
 *   pnpm converge verify               # Full verification
 *   pnpm converge verify --rules       # Rule-based validation only
 *   pnpm converge verify --fix         # Auto-fix checkpoint inconsistencies
 *   pnpm converge verify --task 003-build  # Verify single task
 */

import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import path from "node:path";
import type { CommonOptions } from "./commands.ts";
import { buildTaskTree, getTaskStates, type TaskNode } from "./next-task.ts";
import { createDiscoveryScanner } from "@converge/core/task/discovery";
import { resolveConvergeConfig } from "@converge/core/config";
import { validateConvergeConfig } from "@converge/core/config";
import { RunStateManager } from "@converge/core/manifest";
import type { Manifest } from "@converge/core/manifest";
import { buildManifestFromTree } from "./reconcile.ts";
import { Unit } from "@converge/core/task/unit";
import { validateProject, validateTaskMdFile } from "@converge/core/validation";
import type { ValidationIssue as RuleIssue } from "@converge/core/validation";

export interface VerifyOptions extends CommonOptions {
  /** Auto-fix inconsistencies */
  fix?: boolean;
  /** Run rule-based validation only (skip checkpoint checks) */
  rules?: boolean;
  /** Validate a single task by ID */
  task?: string;
}

interface CheckpointIssue {
  taskId: string;
  epicId?: string;
  type:
    | "completed-missing-outputs"
    | "failed-has-outputs"
    | "checkpoint-mismatch";
  severity: "error" | "warning";
  message: string;
  outputs?: {
    expected: string[];
    missing: string[];
    existing: string[];
  };
}

/**
 * Verify project: config, structure, format, dependencies, checkpoint consistency.
 */
export async function verifyCommand(
  options: VerifyOptions = {},
): Promise<void> {
  try {
    const projectDir = resolve(options.dir || process.cwd());

    // Single-task mode
    if (options.task) {
      await runSingleTaskValidation(projectDir, options.task);
      return;
    }

    // Rules-only mode
    if (options.rules) {
      await runRuleValidation(projectDir);
      return;
    }

    // Default: run both checkpoint and rules validation
    // Checkpoint validation requires PROJECT.md config — skip gracefully if absent
    const resolved = await resolveConvergeConfig(projectDir);
    if (resolved) {
      await runCheckpointValidation(projectDir, options, resolved);
      console.log(""); // separator
    }
    await runRuleValidation(projectDir);
  } catch (error: any) {
    console.error(`\n❌ Validation failed: ${error.message}`);
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ */
/*  Rule-based validation                                               */
/* ------------------------------------------------------------------ */

async function runRuleValidation(projectDir: string): Promise<void> {
  console.log("🔍 Validating project rules...\n");

  const result = await validateProject(projectDir);

  // Print PROJECT.md results
  if (result.projectMd) {
    if (result.projectMd.issues.length === 0) {
      console.log("   ✅ PROJECT.md");
    } else {
      console.log("   ❌ PROJECT.md");
      for (const issue of result.projectMd.issues) {
        console.log(
          `      [${issue.layer}/${issue.severity}] ${issue.ruleId}: ${issue.message}`,
        );
      }
    }
    console.log("");
  }

  if (result.tasks.length === 0) {
    console.log("   No TASK.md files found.\n");
    if (!result.projectMd) return;
  } else {
    console.log(`   Scanning ${result.tasks.length} tasks...\n`);

    // Print per-task results
    for (const task of result.tasks) {
      if (task.issues.length === 0) {
        console.log(`   ✅ ${task.taskId} (TASK.md)`);
      } else {
        console.log(`   ❌ ${task.taskId} (TASK.md)`);
        for (const issue of task.issues) {
          console.log(
            `      [${issue.layer}/${issue.severity}] ${issue.ruleId}: ${issue.message}`,
          );
        }
      }
    }
  }

  // Print project-level issues (excluding PROJECT.md issues already printed above)
  const nonProjectMdIssues = result.projectMd
    ? result.projectIssues.filter((i) => !result.projectMd!.issues.includes(i))
    : result.projectIssues;
  if (nonProjectMdIssues.length > 0) {
    console.log("\n   Project:");
    for (const issue of nonProjectMdIssues) {
      console.log(
        `      [${issue.layer}/${issue.severity}] ${issue.ruleId}: ${issue.message}`,
      );
    }
  }

  // Summary
  const scopeParts: string[] = [];
  if (result.projectMd) scopeParts.push("PROJECT.md");
  if (result.tasks.length > 0)
    scopeParts.push(
      `${result.tasks.length} task${result.tasks.length !== 1 ? "s" : ""}`,
    );
  console.log(
    `\n   Summary: ${result.totalErrors} error${result.totalErrors !== 1 ? "s" : ""}, ${result.totalWarnings} warning${result.totalWarnings !== 1 ? "s" : ""} across ${scopeParts.join(" + ")}`,
  );

  if (!result.valid) {
    process.exit(1);
  }
}

async function runSingleTaskValidation(
  projectDir: string,
  taskId: string,
): Promise<void> {
  console.log(`\n🔍 Validating task "${taskId}"...\n`);

  // Find the TASK.md file by scanning for matching task folder
  const { glob } = await import("glob");
  const patterns = [
    `.converge/epics/**/${taskId}/TASK.md`,
    `.converge/epics/**/tasks/${taskId}/TASK.md`,
    `.converge/playbooks/*/tasks/${taskId}/TASK.md`,
    `.converge/playbooks/*/tasks/**/tasks/${taskId}/TASK.md`,
  ];

  let filePath: string | undefined;
  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: projectDir, absolute: true });
    if (matches.length > 0) {
      filePath = matches[0];
      break;
    }
  }

  if (!filePath) {
    console.error(`   ❌ No TASK.md found for task "${taskId}"`);
    process.exit(1);
  }

  const result = await validateTaskMdFile(filePath, projectDir);
  if (!result) {
    console.error(`   ❌ Failed to parse TASK.md at ${filePath}`);
    process.exit(1);
  }

  if (result.issues.length === 0) {
    console.log(`   ✅ ${result.taskId} (TASK.md) — no issues found`);
  } else {
    console.log(`   ❌ ${result.taskId} (TASK.md)`);
    for (const issue of result.issues) {
      console.log(
        `      [${issue.layer}/${issue.severity}] ${issue.ruleId}: ${issue.message}`,
      );
    }
    console.log(
      `\n   Summary: ${result.issues.filter((i) => i.severity === "error").length} errors, ${result.issues.filter((i) => i.severity === "warning").length} warnings`,
    );

    if (!result.valid) {
      process.exit(1);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Checkpoint validation (existing logic)                              */
/* ------------------------------------------------------------------ */

async function runCheckpointValidation(
  projectDir: string,
  options: VerifyOptions,
  resolved?: Awaited<ReturnType<typeof resolveConvergeConfig>>,
): Promise<void> {
  // Resolve converge config
  if (!resolved) {
    resolved = await resolveConvergeConfig(projectDir);
  }
  if (!resolved) {
    throw new Error(
      "No .converge/PROJECT.md or .converge/project.yaml found. Run from within a converge project.",
    );
  }
  const convergeConfig = validateConvergeConfig(
    resolved.config,
    resolved.configPath,
  );

  // Scan filesystem for epics and tasks
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

  if (tasks.length === 0) {
    console.log("No tasks found. Run `converge init` to create a project.");
    return;
  }

  // Build task tree and get states
  const tree = await buildTaskTree(epics, tasks, projectDir);
  const states = await getTaskStates(projectDir, tree);
  const manifest = buildManifestFromTree(tree, "default");
  const runResults = RunStateManager.fromManifest(
    join(projectDir, ".converge", "journal"),
    manifest,
  );

  console.log("\n🔍 Validating Checkpoint Consistency\n");
  console.log(`   Scanning ${tree.length} tasks...`);

  const issues: CheckpointIssue[] = [];

  // Validate each task
  for (const node of tree) {
    const taskIssues = await validateCheckpointTask(node, states, projectDir);
    issues.push(...taskIssues);
  }

  // Print results
  console.log("");
  if (issues.length === 0) {
    console.log(
      "✅ No inconsistencies found. Checkpoint is consistent with filesystem state.",
    );
    return;
  }

  console.log(
    `❌ Found ${issues.length} inconsistenc${issues.length === 1 ? "y" : "ies"}:\n`,
  );

  // Group by type
  const errorIssues = issues.filter((i) => i.severity === "error");
  const warningIssues = issues.filter((i) => i.severity === "warning");

  if (errorIssues.length > 0) {
    console.log("🔴 Errors:");
    for (const issue of errorIssues) {
      console.log(`   ${issue.taskId}: ${issue.message}`);
      if (issue.outputs) {
        console.log(`      Expected: ${issue.outputs.expected.join(", ")}`);
        console.log(`      Missing: ${issue.outputs.missing.join(", ")}`);
      }
    }
    console.log("");
  }

  if (warningIssues.length > 0) {
    console.log("⚠️  Warnings:");
    for (const issue of warningIssues) {
      console.log(`   ${issue.taskId}: ${issue.message}`);
      if (issue.outputs) {
        console.log(`      Expected: ${issue.outputs.expected.join(", ")}`);
        console.log(`      Existing: ${issue.outputs.existing.join(", ")}`);
      }
    }
    console.log("");
  }

  // Auto-fix if requested
  if (options.fix) {
    console.log("🔧 Auto-fixing inconsistencies...\n");

    let fixedCount = 0;
    for (const issue of issues) {
      if (issue.type === "failed-has-outputs") {
        console.log(`   Reconciling ${issue.taskId}...`);
        await runResults.markComplete(issue.taskId, 0);
        fixedCount++;
      }
    }

    console.log(
      `\n✅ Fixed ${fixedCount} inconsistenc${fixedCount === 1 ? "y" : "ies"}`,
    );

    if (errorIssues.length > 0) {
      console.log(
        `\n⚠️  ${errorIssues.length} error${errorIssues.length === 1 ? "" : "s"} cannot be auto-fixed (requires manual intervention)`,
      );
    }
  } else {
    console.log(
      "💡 Run `pnpm converge verify --fix` to auto-fix reconcilable issues.",
    );
  }

  // Exit with error code if unfixable errors remain
  if (errorIssues.length > 0 && options.fix) {
    process.exit(1);
  }
}

/**
 * Validate a single task for checkpoint consistency.
 */
async function validateCheckpointTask(
  node: TaskNode,
  states: Awaited<ReturnType<typeof getTaskStates>>,
  projectDir: string,
): Promise<CheckpointIssue[]> {
  const issues: CheckpointIssue[] = [];

  // Load task definition to check outputs
  let outputs: string[] | undefined;
  try {
    const unit = await Unit.fromPath(node.filePath);
    outputs = unit.config.outputs;
  } catch {
    // Can't load task def - skip validation
    return issues;
  }

  // Skip if no outputs declared
  if (!outputs || outputs.length === 0) return issues;

  // Check which outputs exist
  const missingOutputs: string[] = [];
  const existingOutputs: string[] = [];

  for (const output of outputs) {
    const fullPath = path.join(projectDir, output);
    if (existsSync(fullPath)) {
      existingOutputs.push(output);
    } else {
      missingOutputs.push(output);
    }
  }

  // Case 1: Task marked completed but outputs missing
  if (states.completed.has(node.journalTaskId) && missingOutputs.length > 0) {
    issues.push({
      taskId: node.journalTaskId,
      epicId: node.epicId,
      type: "completed-missing-outputs",
      severity: "error",
      message: "Marked completed but missing required outputs",
      outputs: {
        expected: outputs,
        missing: missingOutputs,
        existing: existingOutputs,
      },
    });
  }

  // Case 2: Task marked failed but all outputs exist
  if (states.failed.has(node.journalTaskId) && missingOutputs.length === 0) {
    issues.push({
      taskId: node.journalTaskId,
      epicId: node.epicId,
      type: "failed-has-outputs",
      severity: "warning",
      message: "Marked failed but all required outputs exist",
      outputs: {
        expected: outputs,
        missing: [],
        existing: existingOutputs,
      },
    });
  }

  return issues;
}
