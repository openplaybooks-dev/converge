/**
 * Terminal-bench executor — implements Converge's ExecutorFn interface.
 *
 * For each terminal-bench task:
 * 1. Build Docker image from the task's Dockerfile
 * 2. Start a fresh container
 * 3. Run the agent with the task instruction
 * 4. Run run-tests.sh to validate
 * 5. Record pass/fail result
 * 6. Cleanup container
 */

import type { ExecutorFn, ExecutorContext } from "@openplaybooks/converge-core";
import { buildTaskImage, startTaskContainer, runTaskTests } from "../docker/task-container.ts";
import { buildAgentPrompt } from "./agent-harness.ts";
import type { TBenchTask } from "../dataset/types.ts";

/**
 * Create an ExecutorFn for a specific terminal-bench task.
 * The returned function manages the full container lifecycle.
 */
export function tbenchExecutor(task: TBenchTask): ExecutorFn {
  return async (ctx: ExecutorContext): Promise<void> => {
    // 1. Build Docker image
    const imageTag = await buildTaskImage(task);

    // 2. Start container
    const container = await startTaskContainer(task, imageTag);

    try {
      // 3. Run the agent — spawn a subtask with the task prompt
      const agentPrompt = buildAgentPrompt(task);

      await ctx.spawn(
        {
          definition: {
            id: `solve-${task.taskId}`,
            title: `Solve: ${task.taskId}`,
            prompt: agentPrompt,
          },
        },
        {
          label: `agent:${task.taskId}`,
          timeoutMs: task.maxAgentTimeoutSec * 1000,
        },
      );

      // 4. Run tests to validate
      const { passed, output } = await runTaskTests(container, task);

      // 5. Log results
      const status = passed ? "PASS" : "FAIL";
      console.log(
        `[tbench] ${task.taskId}: ${status} (${task.category}/${task.difficulty})`,
      );
      if (!passed) {
        console.log(`[tbench] Test output:\n${output.slice(0, 500)}`);
      }
    } finally {
      // Always clean up the container
      await container.cleanup();
    }
  };
}
