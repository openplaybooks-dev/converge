/**
 * Filter terminal-bench tasks by category, difficulty, tags, IDs, or limit.
 */

import type { TBenchTask } from "./types.ts";

export interface FilterOptions {
  /** Filter to specific category(ies), e.g. ["sysadmin", "code-compilation"] */
  categories?: string[];
  /** Filter to specific task IDs */
  taskIds?: string[];
  /** Filter to tasks matching any of these tags */
  tags?: string[];
  /** Filter by difficulty level */
  difficulty?: string;
  /** Maximum number of tasks to return */
  limit?: number;
}

/**
 * Filter tasks based on provided criteria.
 * Filters are applied in order: categories → taskIds → tags → difficulty → limit.
 */
export function filterTasks(
  tasks: TBenchTask[],
  opts: FilterOptions,
): TBenchTask[] {
  let result = tasks;

  if (opts.categories?.length) {
    const catSet = new Set(opts.categories);
    result = result.filter((t) => catSet.has(t.category));
  }

  if (opts.taskIds?.length) {
    const idSet = new Set(opts.taskIds);
    result = result.filter((t) => idSet.has(t.taskId));
  }

  if (opts.tags?.length) {
    const tagSet = new Set(opts.tags);
    result = result.filter((t) => t.tags.some((tag) => tagSet.has(tag)));
  }

  if (opts.difficulty) {
    result = result.filter((t) => t.difficulty === opts.difficulty);
  }

  if (opts.limit !== undefined && opts.limit > 0) {
    result = result.slice(0, opts.limit);
  }

  return result;
}
