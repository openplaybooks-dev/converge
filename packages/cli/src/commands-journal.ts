/**
 * Journal Command
 *
 * Display execution history from target/{playbook}/runstate.json.
 * Shows tasks with their status, attempts, and execution times.
 */

import { resolve, join } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";

export interface JournalCommandOptions {
  root?: string;
  epic?: string;
  onlyRetries?: boolean;
}

interface NodeStatus {
  id: string;
  status: string;
  attempts: number;
  duration_ms: number;
  title?: string;
  error_message?: string;
}

export async function journalCommand(options: JournalCommandOptions = {}): Promise<void> {
  const projectDir = resolve(options.root || process.cwd());

  // Find the playbook target directories
  const targetRoot = join(projectDir, ".converge", "target");
  if (!existsSync(targetRoot)) {
    console.log("No target directory found. Run `converge compile` first.\n");
    return;
  }

  const playbooks = readdirSync(targetRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory());

  if (playbooks.length === 0) {
    console.log("No playbook executions found.\n");
    return;
  }

  for (const pb of playbooks) {
    const runstatePath = join(targetRoot, pb.name, "runstate.json");
    if (!existsSync(runstatePath)) continue;

    const runstate = JSON.parse(readFileSync(runstatePath, "utf-8"));
    const nodes: Record<string, NodeStatus> = runstate.dag?.nodes ?? {};
    const nodeList = Object.values(nodes);

    const completed = nodeList.filter((n) => n.status === "pass").length;
    const failed = nodeList.filter((n) => n.status === "error").length;
    const running = nodeList.filter((n) => n.status === "running").length;
    const pending = nodeList.filter((n) => n.status === "pending").length;
    const totalMs = nodeList.reduce((s, n) => s + (n.duration_ms || 0), 0);

    console.log(`\nPlaybook: ${pb.name}`);
    console.log(`  Total nodes: ${nodeList.length}`);
    console.log(`  ✓ Completed: ${completed}`);
    console.log(`  ✗ Failed:   ${failed}`);
    console.log(`  ⟳ Running:  ${running}`);
    console.log(`  ○ Pending:  ${pending}`);
    console.log(`  Total time:  ${(totalMs / 1000).toFixed(1)}s`);

    if (options.onlyRetries) {
      const retryNodes = nodeList.filter((n) => n.attempts > 1);
      if (retryNodes.length > 0) {
        console.log(`\n  Tasks with retries:`);
        for (const n of retryNodes) {
          console.log(`    ${n.id}: ${n.attempts} attempts, ${n.status}`);
        }
      }
    }

    if (failed > 0) {
      console.log(`\n  Failed tasks:`);
      for (const n of nodeList.filter((n) => n.status === "error")) {
        console.log(`    ✗ ${n.id}: ${n.error_message || "no error message"}`);
      }
    }
  }

  console.log();
}
