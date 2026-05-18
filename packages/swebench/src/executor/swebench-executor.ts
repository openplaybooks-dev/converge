/**
 * SWE-bench executor — implements Converge's ExecutorFn interface.
 *
 * For each SWE-bench instance:
 * 1. Ensure Docker image is built (via ImageCache)
 * 2. Start a fresh container
 * 3. Run the agent with the problem statement
 * 4. Extract the agent's patch (git diff)
 * 5. Validate the patch (apply test patch, run pytest)
 * 6. Record results and clean up
 */

import type { ExecutorFn, ExecutorContext } from "@openplaybooks/converge-core";
import { DockerContainer } from "../docker/container.ts";
import { ImageCache } from "../docker/image-cache.ts";
import { imageTag } from "../docker/dockerfile.ts";
import { buildAgentPrompt, proxyExec } from "./agent-harness.ts";
import { extractAgentPatch, validatePatch } from "./patch-validator.ts";
import type { SWEBenchInstance } from "../dataset/types.ts";

/** Shared image cache across all executor invocations */
const imageCache = new ImageCache();

/**
 * Create an ExecutorFn for a specific SWE-bench instance.
 * The returned function manages the full container lifecycle.
 */
export function swebenchExecutor(instance: SWEBenchInstance): ExecutorFn {
  return async (ctx: ExecutorContext): Promise<void> => {
    // 1. Ensure image is built
    const tag = await imageCache.ensure(instance);

    // 2. Start container
    const container = new DockerContainer({
      image: tag,
      name: `swebench-${instance.instance_id.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
      workDir: "/workspace",
    });

    try {
      await container.start();

      // 3. Run the agent — spawn a subtask with the problem prompt
      //    The agent uses shell commands that are proxied into the container
      const agentPrompt = buildAgentPrompt(instance);

      await ctx.spawn(
        {
          definition: {
            id: `solve-${instance.instance_id}`,
            title: `Solve: ${instance.instance_id}`,
            prompt: agentPrompt,
          },
        },
        {
          label: `agent:${instance.instance_id}`,
          timeoutMs: 600_000,
        },
      );

      // 4. Extract the agent's patch
      const patch = await extractAgentPatch(container);

      // Store patch as a var for metrics collection
      if (patch) {
        // Write patch to a known location for later collection
        await container.exec(
          `printf '%s' '${patch.replace(/'/g, "'\\''")}' > /tmp/agent-patch.diff`,
        );
      }

      // 5. Validate the patch
      const validation = await validatePatch(container, instance);

      // 6. Log results
      const status = validation.resolved ? "RESOLVED" : "UNRESOLVED";
      const f2pCount = validation.failToPass.filter((t) => t.passed).length;
      const f2pTotal = validation.failToPass.length;
      const p2pCount = validation.passToPass.filter((t) => t.passed).length;
      const p2pTotal = validation.passToPass.length;

      console.log(
        `[swebench] ${instance.instance_id}: ${status} ` +
          `(FAIL_TO_PASS: ${f2pCount}/${f2pTotal}, PASS_TO_PASS: ${p2pCount}/${p2pTotal})`,
      );
    } finally {
      // Always clean up the container
      await container.cleanup();
    }
  };
}
