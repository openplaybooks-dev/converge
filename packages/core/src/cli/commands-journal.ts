/**
 * Journal Command
 *
 * Display execution history from journal (logs).
 * Shows tasks with their attempts, outcomes, and execution times.
 */

import { resolve } from 'node:path';
import { JournalTree } from '../tree/journal-tree.ts';
import type { JournalNode } from '../tree/journal-tree.ts';

export interface JournalCommandOptions {
  /** Override project directory (defaults to cwd) */
  root?: string;
  /** Filter to specific epic ID */
  epic?: string;
  /** Show only tasks with retries (multiple attempts) */
  onlyRetries?: boolean;
}

export async function journalCommand(options: JournalCommandOptions = {}): Promise<void> {
  try {
    const projectDir = resolve(options.root || process.cwd());

    // Load journal tree
    const journalTree = await JournalTree.load(projectDir);
    const stats = journalTree.getStats();

    console.log(`\n📊 Execution History\n`);
    console.log(`Total Tasks: ${stats.total}`);
    console.log(`✓ Completed: ${stats.completed}`);
    console.log(`✗ Failed: ${stats.failed}`);
    console.log(`⟳ Running: ${stats.running}`);
    console.log(`○ Pending: ${stats.pending}`);
    console.log(`🔁 Total Attempts: ${stats.totalAttempts}`);

    const totalTimeMs = journalTree.getTotalExecutionTime();
    const totalTimeSec = (totalTimeMs / 1000).toFixed(1);
    console.log(`⏱  Total Execution Time: ${totalTimeSec}s\n`);

    // Filter nodes (task nodes only for display)
    let nodes = journalTree.getAllNodes().filter(n => n.type === 'task');
    if (options.epic) {
      nodes = nodes.filter(n => n.epicId === options.epic);
    }
    if (options.onlyRetries) {
      nodes = nodes.filter(n => (n.task?.totalAttempts || 0) > 1);
    }

    if (nodes.length === 0) {
      console.log('No execution history found.\n');
      return;
    }

    // Group by epic
    const epicMap = new Map<string, JournalNode[]>();
    for (const node of nodes) {
      if (!epicMap.has(node.epicId)) {
        epicMap.set(node.epicId, []);
      }
      epicMap.get(node.epicId)!.push(node);
    }

    // Print tree
    console.log('📁 Execution Log:\n');

    for (const [epicId, epicNodes] of epicMap) {
      console.log(`├── 📂 ${epicId}`);

      // Get top-level tasks (filter out WBS children - they'll be rendered via node.children)
      const topLevel = epicNodes.filter(n => !n.parentId);

      topLevel.forEach((node, idx) => {
        const isLast = idx === topLevel.length - 1;
        printNode(node, '│   ', isLast ? '└── ' : '├── ');
      });
    }

    console.log();
  } catch (error: any) {
    console.error(`\n❌ Journal command failed: ${error.message}`);
    if (process.env.CONVERGE_DEBUG) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

function printNode(
  node: JournalNode,
  prefix: string,
  branch: string
): void {
  if (node.type === 'task') {
    // Task node
    let icon: string;
    switch (node.status) {
      case 'complete':
        icon = '✓';
        break;
      case 'failed':
        icon = '✗';
        break;
      case 'running':
        icon = '⟳';
        break;
      case 'seeded':
        icon = '◑';
        break;
      default:
        icon = '○';
    }

    // Attempt info
    const attemptInfo = (node.task?.totalAttempts || 0) > 1 ? ` (${node.task?.totalAttempts} attempts)` : '';

    // Duration info (total across all attempt children)
    const totalDuration = node.children
      .filter(c => c.type === 'attempt')
      .reduce((sum, c) => sum + (c.attempt?.durationMs || 0), 0);
    const durationInfo = totalDuration > 0 ? ` [${(totalDuration / 1000).toFixed(1)}s]` : '';

    // Progress info (for WBS parent tasks)
    const progressInfo = node.task?.progress
      ? ` [${node.task.progress.completedChildren}/${node.task.progress.totalChildren} done]`
      : '';

    console.log(`${prefix}${branch}${icon}  ${node.id}${attemptInfo}${durationInfo}${progressInfo}`);

    // Print children (attempts first, then WBS subtasks)
    const childPrefix = prefix + (branch === '└── ' ? '    ' : '│   ');
    node.children.forEach((child, idx) => {
      const isLast = idx === node.children.length - 1;
      printNode(child, childPrefix, isLast ? '└── ' : '├── ');
    });
  } else {
    // Attempt node
    const icon = node.attempt?.outcome === 'success' ? '✓' : '✗';
    const duration = node.attempt?.durationMs ? `${(node.attempt.durationMs / 1000).toFixed(1)}s` : 'N/A';
    const outcome = node.attempt?.outcome || 'unknown';

    console.log(`${prefix}${branch}${icon}  Attempt ${node.attempt?.attemptNumber}: ${outcome} (${duration})`);
  }
}
