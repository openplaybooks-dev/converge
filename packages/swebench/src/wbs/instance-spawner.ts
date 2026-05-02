/**
 * WBS instance spawner — generates one Converge task per SWE-bench instance.
 *
 * Implements the SeedFn interface: called once during WBS seeding,
 * spawns a child task for each instance in the filtered dataset.
 * No need for 300 static TASK.md files on disk.
 */

import type { SeedFn, SeedContext } from "@converge/core";
import { loadDataset } from "../dataset/loader.ts";
import { filterInstances, type FilterOptions } from "../dataset/filter.ts";
import { swebenchExecutor } from "../executor/swebench-executor.ts";

/**
 * Create a WBS function that spawns one task per SWE-bench instance.
 *
 * @param filterOpts - Optional filters (repos, instanceIds, limit)
 * @returns SeedFn suitable for use with taskDef().wbs(instanceSpawner(...))
 *
 * @example
 * ```ts
 * export default taskDef()
 *   .id('swebench-run')
 *   .title('SWE-bench Lite Evaluation')
 *   .wbs(instanceSpawner({ limit: 10 }))
 *   .build()
 * ```
 */
export function instanceSpawner(filterOpts?: FilterOptions): SeedFn {
  return async (ctx: SeedContext): Promise<void> => {
    ctx.log.info("Loading SWE-bench Lite dataset...");
    const allInstances = await loadDataset();
    const instances = filterOpts
      ? filterInstances(allInstances, filterOpts)
      : allInstances;

    ctx.log.info(
      `Spawning ${instances.length} SWE-bench tasks (of ${allInstances.length} total)`,
    );

    for (const instance of instances) {
      const taskId = instance.instance_id.replace(/[^a-zA-Z0-9_-]/g, "-");

      await ctx.spawn(
        {
          id: taskId,
          title: `${instance.instance_id}`,
          description: instance.problem_statement.slice(0, 200),
          checks: [
            {
              id: "patch-exists",
              cmd: `test -n "$(docker exec swebench-${taskId} git diff --name-only 2>/dev/null)"`,
              description: "Agent produced a non-empty patch",
            },
          ],
          vars: {
            instanceId: instance.instance_id,
            repo: instance.repo,
            baseCommit: instance.base_commit,
          },
          body: buildInstanceBody(instance),
        },
        {
          label: instance.instance_id,
        },
      );
    }

    ctx.log.info(`Spawned ${instances.length} SWE-bench instance tasks`);
  };
}

/**
 * Build the TASK.md body for a single instance.
 * Contains the problem statement and metadata for the agent.
 */
function buildInstanceBody(
  instance: { instance_id: string; repo: string; base_commit: string; problem_statement: string },
): string {
  return `# ${instance.instance_id}

**Repo:** ${instance.repo}
**Base commit:** ${instance.base_commit}

## Problem Statement

${instance.problem_statement}

## Instructions

Fix the issue described above. The repository is checked out at the base commit inside a Docker container at /workspace. Make your changes to the source code (not test files).
`;
}
