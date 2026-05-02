/**
 * WBS task spawner — generates one Converge task per terminal-bench task.
 *
 * Implements the SeedFn interface: called once during WBS seeding,
 * spawns a child task for each task in the filtered dataset.
 */

import type { SeedFn, SeedContext } from "@converge/core";
import { loadTasks } from "../dataset/loader.ts";
import { filterTasks, type FilterOptions } from "../dataset/filter.ts";

/**
 * Create a WBS function that spawns one task per terminal-bench task.
 *
 * @param tasksDir - Directory containing terminal-bench tasks
 * @param filterOpts - Optional filters (categories, taskIds, tags, difficulty, limit)
 * @returns SeedFn suitable for use with taskDef().wbs(taskSpawner(...))
 */
export function taskSpawner(tasksDir: string, filterOpts?: FilterOptions): SeedFn {
  return async (ctx: SeedContext): Promise<void> => {
    ctx.log.info("Loading terminal-bench tasks...");
    const allTasks = await loadTasks({ tasksDir });
    const tasks = filterOpts
      ? filterTasks(allTasks, filterOpts)
      : allTasks;

    ctx.log.info(
      `Spawning ${tasks.length} terminal-bench tasks (of ${allTasks.length} total)`,
    );

    for (const task of tasks) {
      const taskId = task.taskId.replace(/[^a-zA-Z0-9_-]/g, "-");

      await ctx.spawn(
        {
          id: taskId,
          title: task.taskId,
          description: task.instruction.slice(0, 200),
          checks: [
            {
              id: "tests-pass",
              cmd: `docker exec tbench-${taskId} /workspace/run-tests.sh`,
              description: "Task tests pass",
            },
          ],
          vars: {
            taskId: task.taskId,
            category: task.category,
            difficulty: task.difficulty,
          },
          body: buildTaskBody(task),
        },
        {
          label: task.taskId,
        },
      );
    }

    ctx.log.info(`Spawned ${tasks.length} terminal-bench tasks`);
  };
}

/**
 * Build the TASK.md body for a single terminal-bench task.
 */
function buildTaskBody(
  task: { taskId: string; category: string; difficulty: string; instruction: string },
): string {
  return `# ${task.taskId}

**Category:** ${task.category}
**Difficulty:** ${task.difficulty}

## Task

${task.instruction}

## Instructions

Complete the task described above. You are working inside a Docker container at /workspace. Use shell commands to explore, modify, and complete the task. The result will be validated automatically.
`;
}
