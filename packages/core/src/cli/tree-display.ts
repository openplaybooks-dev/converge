/**
 * Shared task-tree renderer used by both `converge run --step` and `converge tree`.
 */

import type { TaskNode, TaskStates, ExecutionSpan } from './next-task.ts';

/**
 * Derive the display label for the tree root from the first task's filePath.
 * Supports both the playbook layout (`.converge/playbooks/<name>/tasks/`) and
 * the legacy layout (`.converge/epics/`). Falls back to `.converge/epics/` when
 * nothing matches (e.g. empty tree).
 */
function deriveTreeRoot(tree: TaskNode[]): string {
  if (tree.length === 0) return '.converge/epics/';
  const sample = tree[0].filePath.replace(/\\/g, '/');
  const playbookMatch = sample.match(/(\.converge\/playbooks\/[^/]+\/tasks\/)/);
  if (playbookMatch) return playbookMatch[1];
  const legacyMatch = sample.match(/(\.converge\/epics\/)/);
  if (legacyMatch) return legacyMatch[1];
  return '.converge/epics/';
}

/**
 * Print a hierarchical tree of epics → tasks with nested WBS subtasks.
 *
 * Icons:
 *   ✓  completed
 *   ✗  failed
 *   ⟳  currently executing (status: running in checkpoint)
 *   🚫 blocked (blocked by failed dependency)
 *   ▶  next to execute (pending, not yet started)
 *   ○  pending
 *
 * Pass `nextTaskId = ''` to omit the ▶ suffix marker (e.g. when all done).
 * Pass `runningTaskId` to highlight the currently executing task.
 */
export function printTaskTree(
  tree: TaskNode[],
  states: TaskStates,
  nextTaskId: string,
  runningTaskId?: string,
  plan?: Map<string, ExecutionSpan>,
  detail?: boolean,
): void {
  const { completed, failed, locked, failureBlocked } = states;

  // Group by epicId preserving discovery order
  const epicMap = new Map<string, TaskNode[]>();
  for (const node of tree) {
    if (!epicMap.has(node.epicId)) epicMap.set(node.epicId, []);
    epicMap.get(node.epicId)!.push(node);
  }

  // Sort epics by numeric prefix for execution order
  const epicIds = [...epicMap.keys()].sort((a, b) => {
    const aMatch = a.match(/^(\d+)-/);
    const bMatch = b.match(/^(\d+)-/);
    const aNum = aMatch ? parseInt(aMatch[1], 10) : 999;
    const bNum = bMatch ? parseInt(bMatch[1], 10) : 999;
    return aNum - bNum;
  });

  // Build ancestor sets for the next task (parent task + epic)
  const nextAncestors = new Set<string>();  // journalTaskIds
  const nextEpics = new Set<string>();      // epicIds
  if (nextTaskId) {
    const nextNode = tree.find(n => n.journalTaskId === nextTaskId);
    if (nextNode) {
      nextEpics.add(nextNode.epicId);
      if (nextNode.parentTaskId) {
        nextAncestors.add(nextNode.parentTaskId);
        // Also mark the parent's epic
        const parentNode = tree.find(n => n.journalTaskId === nextNode.parentTaskId);
        if (parentNode) nextEpics.add(parentNode.epicId);
      }
    }
  }

  // Also mark the running task's epic with ▶ indicator
  if (runningTaskId) {
    const runningNode = tree.find(n => n.journalTaskId === runningTaskId);
    if (runningNode) {
      nextEpics.add(runningNode.epicId);
      // If running task has a parent, mark it as ancestor
      if (runningNode.parentTaskId) {
        nextAncestors.add(runningNode.parentTaskId);
        const parentNode = tree.find(n => n.journalTaskId === runningNode.parentTaskId);
        if (parentNode) nextEpics.add(parentNode.epicId);
      }
    }
  }

  const { wbsProgress, seeded } = states;

  const renderTask = (node: TaskNode, prefix: string, branch: string, children: TaskNode[], continuationPrefix: string) => {
    const isNext     = nextTaskId !== '' && node.journalTaskId === nextTaskId;
    const isRunning  = runningTaskId !== undefined && node.journalTaskId === runningTaskId;
    const isAncestor = nextAncestors.has(node.journalTaskId);
    const isDone     = completed.has(node.journalTaskId);
    const isFailed   = failed.has(node.journalTaskId);
    const isSeeded   = seeded.has(node.journalTaskId); // WBS seeded, waiting for subtasks
    const isLocked   = locked.has(node.journalTaskId) && !isDone && !isFailed && !isSeeded && !isRunning;
    const isBlocked  = failureBlocked.has(node.journalTaskId);

    let icon: string;
    let suffix: string;
    // Priority order: blocked-by-failure > running/next/ancestor > done > failed > seeded > locked > blocked > pending
    // failureBlocked overrides running to prevent stale running checkpoints from hiding blocked state
    if (isBlocked)      { icon = '🚫';  suffix = '  (blocked)'; }
    else if (isRunning) { icon = '○ ';  suffix = '  ▶ ◑'; }
    else if (isNext)    { icon = '○ ';  suffix = '  ▶'; }
    else if (isAncestor){ icon = '○ ';  suffix = '  ▶'; }
    else if (isDone)    { icon = '✓ ';  suffix = ''; }
    else if (isFailed)  { icon = '✗ ';  suffix = '  (failed)'; }
    else if (isSeeded)  { icon = '◑ ';  suffix = '  (seeded)'; }
    else if (isLocked)  { icon = '⊙ ';  suffix = '  (locked)'; }
    else                { icon = '○ ';  suffix = ''; }

    // No blocking marker needed - blocking is default behavior
    const blockingMarker = '';

    // Progress annotation for parent tasks (with children)
    // Show progress for ALL parents, regardless of how they were created (seeded or manual)
    let wbsSuffix = '';
    const wbs = wbsProgress.get(node.journalTaskId);
    if (children.length > 0 || wbs) {
      if (wbs && wbs.spawnCount > 0) {
        const pending = wbs.spawnCount - wbs.completedSubtasks - wbs.failedSubtasks;
        const parts: string[] = [`${wbs.completedSubtasks}/${wbs.spawnCount} done`];
        if (wbs.failedSubtasks > 0) parts.push(`${wbs.failedSubtasks} failed`);
        if (pending > 0) parts.push(`${pending} pending`);
        wbsSuffix = `  [${parts.join(', ')}]`;
      }
    }

    // Attempt annotation (from journal)
    let attemptSuffix = '';
    if (node.attempts && node.attempts > 1) {
      attemptSuffix = `  (${node.attempts} attempts)`;
    }

    const span = plan?.get(node.journalTaskId);
    const indexLabel = span
      ? (span.startIndex === span.endIndex
          ? `${String(span.startIndex).padStart(2)}.`
          : `${span.startIndex}-${span.endIndex}.`)
      : '';
    console.log(`${prefix}${branch}${icon}${indexLabel} ${node.taskId}${blockingMarker}${suffix}${attemptSuffix}${wbsSuffix}`);

    // Detail lines: show metadata beneath the task when --detail is active
    if (detail) {
      const detailLines: string[] = [];
      if (node.title) detailLines.push(`title: ${node.title}`);
      if (node.skills && node.skills.length > 0) detailLines.push(`skills: ${node.skills.join(', ')}`);
      if (node.dependencies && node.dependencies.length > 0) detailLines.push(`deps: ${node.dependencies.join(', ')}`);
      if (node.inputs && node.inputs.length > 0) detailLines.push(`inputs: ${node.inputs.join(', ')}`);
      if (node.outputs && node.outputs.length > 0) detailLines.push(`outputs: ${node.outputs.join(', ')}`);
      if (node.tags && node.tags.length > 0) detailLines.push(`tags: ${node.tags.join(', ')}`);
      for (const line of detailLines) {
        console.log(`${continuationPrefix}    ${line}`);
      }
    }
  };

  console.log(`📁 ${deriveTreeRoot(tree)}`);

  epicIds.forEach((epicId, epicIdx) => {
    const isLastEpic      = epicIdx === epicIds.length - 1;
    const epicPrefix      = isLastEpic ? '└── ' : '├── ';
    const epicChildPrefix = isLastEpic ? '    ' : '│   ';

    const allEpicTasks = epicMap.get(epicId)!;

    // Detect epic-root task: a top-level task whose taskId matches the epicId
    const epicRootNode = allEpicTasks.find(n => !n.parentTaskId && n.taskId === epicId);

    // Build epic folder suffix from the epic-root node's status/progress
    let epicSuffix = '';
    if (epicRootNode) {
      const rootDone    = completed.has(epicRootNode.journalTaskId);
      const rootFailed  = failed.has(epicRootNode.journalTaskId);
      const rootSeeded  = seeded.has(epicRootNode.journalTaskId);
      const rootLocked  = locked.has(epicRootNode.journalTaskId) && !rootDone && !rootFailed && !rootSeeded;
      const rootBlocked = failureBlocked.has(epicRootNode.journalTaskId);

      if (rootBlocked)     epicSuffix += '  🚫 (blocked)';
      else if (rootFailed) epicSuffix += '  ✗ (failed)';
      else if (rootSeeded) epicSuffix += '  ◑ (seeded)';
      else if (rootLocked) epicSuffix += '  ⊙ (locked)';
      else if (rootDone)   epicSuffix += '  ✓';

      if (epicRootNode.attempts && epicRootNode.attempts > 1) {
        epicSuffix += `  (${epicRootNode.attempts} attempts)`;
      }

      const wbs = wbsProgress.get(epicRootNode.journalTaskId);
      if (wbs && wbs.spawnCount > 0) {
        const pending = wbs.spawnCount - wbs.completedSubtasks - wbs.failedSubtasks;
        const parts: string[] = [`${wbs.completedSubtasks}/${wbs.spawnCount} done`];
        if (wbs.failedSubtasks > 0) parts.push(`${wbs.failedSubtasks} failed`);
        if (pending > 0) parts.push(`${pending} pending`);
        epicSuffix += `  [${parts.join(', ')}]`;
      }
    }

    const epicActive = nextEpics.has(epicId);
    const epicIndicator = epicActive ? '  ▶' : '';
    console.log(`${epicPrefix}📂 ${epicId}${epicSuffix}${epicIndicator}`);

    // Build parent-child relationships using journalTaskId (supports multi-level nesting)
    const childrenOf = new Map<string, TaskNode[]>();

    for (const node of allEpicTasks) {
      if (node.parentTaskId) {
        if (!childrenOf.has(node.parentTaskId)) childrenOf.set(node.parentTaskId, []);
        childrenOf.get(node.parentTaskId)!.push(node);
      }
    }

    // Top-level tasks are those without a parentTaskId
    // Exclude the epic-root node (already shown on the epic folder line)
    const topLevel = allEpicTasks.filter(n => !n.parentTaskId && n !== epicRootNode);

    // If the epic-root was excluded, promote its children to top level
    if (epicRootNode) {
      const epicRootChildren = childrenOf.get(epicRootNode.journalTaskId) ?? [];
      topLevel.push(...epicRootChildren);
    } else {
      // No epic-root task node.
      // Tasks whose parentTaskId equals the epicId are direct children of the epic folder —
      // promote them to top level.
      const epicChildren = childrenOf.get(epicId) ?? [];
      topLevel.push(...epicChildren);
    }

    // Recursive renderer for arbitrary depth
    const renderSubtree = (nodes: TaskNode[], prefix: string, depth: number = 0) => {
      nodes.forEach((node, idx) => {
        const children = childrenOf.get(node.journalTaskId) ?? [];
        const isLast = idx === nodes.length - 1;
        const branch = isLast ? '└── ' : '├── ';
        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        renderTask(node, prefix, branch, children, childPrefix);
        // Extra indent for nested children to make hierarchy more visually distinct
        if (children.length > 0) {
          const nestedPrefix = childPrefix + '    ';
          renderSubtree(children, nestedPrefix, depth + 1);
        }
      });
    };
    renderSubtree(topLevel, epicChildPrefix);
  });
}
