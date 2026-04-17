/**
 * Graph Command - Dependency & Data Flow Visualization
 *
 * Shows tasks grouped by epic with inline dependency arrows.
 * --detail mode annotates inputs/outputs with producing task.
 */

import { resolve, basename } from 'node:path';
import path from 'node:path';
import { TaskTree } from '../tree/index.ts';
import type { TaskNode, TaskStates } from './next-task.ts';
import { treeNodesToTaskNodes, getTaskStates } from './next-task.ts';
import { resolveHarnessConfig } from '../config/loader.ts';
import { validateHarnessConfig } from '../config/validator.ts';
import type { HarnessConfig } from '../config/types.ts';

export interface GraphOptions {
  dir?: string;
  detail?: boolean;
  filter?: string;
}

interface DependencyEdge {
  /** journalTaskId of the task that depends */
  from: string;
  /** journalTaskId or "tag:<name>" label of the dependency */
  toLabel: string;
}

interface DataFlowEdge {
  /** The input file pattern */
  input: string;
  /** journalTaskId of the task that consumes the input */
  consumer: string;
  /** journalTaskId of the task that produces the output matching this input */
  producer: string;
}

export async function graphCommand(options: GraphOptions = {}): Promise<void> {
  try {
    const projectDir = resolve(options.dir || process.cwd());

    const resolved = await resolveHarnessConfig(projectDir);
    const harnessConfig = resolved
      ? validateHarnessConfig(resolved.config, resolved.configPath)
      : { name: basename(projectDir) } as HarnessConfig;

    const taskTree = await TaskTree.load(projectDir, harnessConfig);
    const tree = treeNodesToTaskNodes(taskTree, projectDir);
    const states = await getTaskStates(projectDir, tree, { skipAutoComplete: true });

    if (tree.length === 0) {
      console.log('No tasks found. Run `harness init` to create a project.');
      return;
    }

    // Apply filter
    let filteredTree = tree;
    if (options.filter) {
      filteredTree = filterForGraph(tree, options.filter);
      if (filteredTree.length === 0) {
        console.log(`\n⚠️  No tasks found matching filter: "${options.filter}"\n`);
        return;
      }
    }

    const depEdges = resolveDependencyEdges(filteredTree, tree);
    const dataFlowEdges = options.detail ? resolveDataFlowEdges(filteredTree, tree) : [];

    renderGraph(filteredTree, states, depEdges, dataFlowEdges, options.detail);
  } catch (error: any) {
    console.error(`\n❌ Graph command failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Build dependency edges from task.dependencies[].
 * Handles direct task IDs and tag:* references.
 */
function resolveDependencyEdges(filteredTree: TaskNode[], fullTree: TaskNode[]): DependencyEdge[] {
  const edges: DependencyEdge[] = [];

  for (const node of filteredTree) {
    if (!node.dependencies) continue;

    for (const dep of node.dependencies) {
      if (dep.startsWith('tag:')) {
        edges.push({ from: node.journalTaskId, toLabel: dep });
      } else {
        // Find matching task by taskId or journalTaskId
        const depNode = fullTree.find(t => t.journalTaskId === dep || t.taskId === dep);
        if (depNode) {
          edges.push({ from: node.journalTaskId, toLabel: depNode.taskId });
        } else {
          edges.push({ from: node.journalTaskId, toLabel: dep });
        }
      }
    }
  }

  return edges;
}

/**
 * Build data flow edges by matching task inputs to other tasks' outputs.
 */
function resolveDataFlowEdges(filteredTree: TaskNode[], fullTree: TaskNode[]): DataFlowEdge[] {
  const edges: DataFlowEdge[] = [];

  for (const consumer of filteredTree) {
    if (!consumer.inputs) continue;

    for (const input of consumer.inputs) {
      for (const producer of fullTree) {
        if (producer.journalTaskId === consumer.journalTaskId) continue;
        if (!producer.outputs) continue;

        for (const output of producer.outputs) {
          if (patternsOverlap(input, output)) {
            edges.push({
              input,
              consumer: consumer.journalTaskId,
              producer: producer.taskId,
            });
            break; // One producer per input is enough
          }
        }
      }
    }
  }

  return edges;
}

/**
 * Simple glob-aware file pattern matching.
 * Returns true if the input pattern would be satisfied by the output pattern.
 */
function patternsOverlap(input: string, output: string): boolean {
  // Exact match
  if (input === output) return true;

  // Output is a glob covering the input: strip glob suffix, compare prefix
  if (output.includes('*')) {
    const prefix = output.replace(/\*.*$/, '');
    if (input.startsWith(prefix)) return true;
  }

  // Input is a glob covering the output
  if (input.includes('*')) {
    const prefix = input.replace(/\*.*$/, '');
    if (output.startsWith(prefix)) return true;
  }

  return false;
}

function getStatusIcon(node: TaskNode, states: TaskStates): string {
  if (states.completed.has(node.journalTaskId)) return '✓';
  if (states.failed.has(node.journalTaskId)) return '✗';
  if (states.failureBlocked.has(node.journalTaskId)) return '🚫';
  return '○';
}

/**
 * Filter tree by epicId or taskId, including WBS subtasks.
 */
function filterForGraph(tree: TaskNode[], filter: string): TaskNode[] {
  const matchedTaskIds = new Set<string>();
  const matchedFilePaths = new Set<string>();

  for (const node of tree) {
    if (node.taskId === filter || node.epicId === filter) {
      matchedTaskIds.add(node.taskId);
      matchedFilePaths.add(node.filePath);
    }
  }

  // Include WBS subtasks
  for (const node of tree) {
    for (const matchedPath of matchedFilePaths) {
      const matchedDir = path.dirname(matchedPath);
      if (node.filePath.startsWith(matchedDir + path.sep) && node.filePath !== matchedPath) {
        matchedTaskIds.add(node.taskId);
        break;
      }
    }
    if (node.parentTaskId && matchedTaskIds.has(node.parentTaskId)) {
      matchedTaskIds.add(node.taskId);
    }
  }

  return tree.filter(n => matchedTaskIds.has(n.taskId));
}

/**
 * Render the dependency graph to stdout.
 */
function renderGraph(
  tree: TaskNode[],
  states: TaskStates,
  depEdges: DependencyEdge[],
  dataFlowEdges: DataFlowEdge[],
  detail?: boolean,
): void {
  const header = detail ? 'Dependency Graph (with data flow)' : 'Dependency Graph';
  console.log(`\n${header}\n`);

  // Group by epic, sorted by numeric prefix
  const epicMap = new Map<string, TaskNode[]>();
  for (const node of tree) {
    if (!epicMap.has(node.epicId)) epicMap.set(node.epicId, []);
    epicMap.get(node.epicId)!.push(node);
  }

  const epicIds = [...epicMap.keys()].sort((a, b) => {
    const aNum = parseInt(a.match(/^(\d+)/)?.[1] ?? '999', 10);
    const bNum = parseInt(b.match(/^(\d+)/)?.[1] ?? '999', 10);
    return aNum - bNum;
  });

  // Build children map
  const childrenOf = new Map<string, TaskNode[]>();
  for (const node of tree) {
    if (node.parentTaskId) {
      if (!childrenOf.has(node.parentTaskId)) childrenOf.set(node.parentTaskId, []);
      childrenOf.get(node.parentTaskId)!.push(node);
    }
  }

  // Index dep edges by consumer journalTaskId
  const depsByTask = new Map<string, string[]>();
  for (const edge of depEdges) {
    if (!depsByTask.has(edge.from)) depsByTask.set(edge.from, []);
    depsByTask.get(edge.from)!.push(edge.toLabel);
  }

  // Index data flow edges by consumer journalTaskId
  const flowByTask = new Map<string, DataFlowEdge[]>();
  for (const edge of dataFlowEdges) {
    if (!flowByTask.has(edge.consumer)) flowByTask.set(edge.consumer, []);
    flowByTask.get(edge.consumer)!.push(edge);
  }

  for (const epicId of epicIds) {
    console.log(epicId);

    const allEpicTasks = epicMap.get(epicId)!;

    // Detect epic-root task (taskId matches epicId)
    const epicRootNode = allEpicTasks.find(n => !n.parentTaskId && n.taskId === epicId);

    // Top-level tasks: no parentTaskId, exclude epic-root
    const topLevel = allEpicTasks
      .filter(n => !n.parentTaskId && n !== epicRootNode)
      .sort((a, b) => a.taskId.localeCompare(b.taskId));

    // If epic-root exists, promote its children
    if (epicRootNode) {
      const epicRootChildren = (childrenOf.get(epicRootNode.journalTaskId) ?? [])
        .sort((a, b) => a.taskId.localeCompare(b.taskId));
      topLevel.push(...epicRootChildren);

      // If epicRoot has no children, render the epic root itself as a task line
      if (topLevel.length === 0) {
        renderTaskLine(epicRootNode, states, depsByTask, flowByTask, detail, '  ');
      }
    }

    for (const node of topLevel) {
      renderSubtree(node, states, childrenOf, depsByTask, flowByTask, detail, '  ');
    }

    console.log('');
  }
}

function renderTaskLine(
  node: TaskNode,
  states: TaskStates,
  depsByTask: Map<string, string[]>,
  flowByTask: Map<string, DataFlowEdge[]>,
  detail?: boolean,
  indent: string = '  ',
): void {
  const icon = getStatusIcon(node, states);
  const deps = depsByTask.get(node.journalTaskId);
  const arrow = deps && deps.length > 0 ? `  ◄── ${deps.join(', ')}` : '';

  console.log(`${indent}${icon} ${node.taskId}${arrow}`);

  if (detail) {
    // Show inputs with producing task annotation
    if (node.inputs && node.inputs.length > 0) {
      const flows = flowByTask.get(node.journalTaskId) ?? [];
      const annotated = node.inputs.map(input => {
        const flow = flows.find(f => f.input === input);
        return flow ? `${input} ◄ (${flow.producer})` : input;
      });
      console.log(`${indent}    inputs:  ${annotated.join(', ')}`);
    }

    // Show outputs
    if (node.outputs && node.outputs.length > 0) {
      console.log(`${indent}    outputs: ${node.outputs.join(', ')}`);
    }
  }
}

function renderSubtree(
  node: TaskNode,
  states: TaskStates,
  childrenOf: Map<string, TaskNode[]>,
  depsByTask: Map<string, string[]>,
  flowByTask: Map<string, DataFlowEdge[]>,
  detail?: boolean,
  indent: string = '  ',
): void {
  renderTaskLine(node, states, depsByTask, flowByTask, detail, indent);

  const children = (childrenOf.get(node.journalTaskId) ?? [])
    .sort((a, b) => a.taskId.localeCompare(b.taskId));

  for (const child of children) {
    renderSubtree(child, states, childrenOf, depsByTask, flowByTask, detail, indent + '  ');
  }
}
