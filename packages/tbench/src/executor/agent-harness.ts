/**
 * Agent harness — builds the prompt for the AI agent and proxies
 * shell commands through `docker exec`.
 */

import type { TBenchTask } from "../dataset/types.ts";
import type { DockerContainer, ExecResult } from "../docker/container.ts";

/**
 * Build the agent prompt from the task instruction.
 * Gives the agent the task description and working context.
 */
export function buildAgentPrompt(task: TBenchTask): string {
  return `You are working inside a Linux container at /workspace.
Your task is to complete the following:

## Task

${task.instruction}

## Instructions

1. Use shell commands to explore the environment and understand what's available.
2. Complete the task described above.
3. All commands run inside the container at /workspace.
4. When done, ensure the task is fully completed — the result will be validated automatically.`;
}

/**
 * Execute a command inside the container, proxying from the host.
 */
export async function proxyExec(
  container: DockerContainer,
  command: string,
  opts?: { timeoutMs?: number },
): Promise<ExecResult> {
  return container.exec(command, {
    workDir: "/workspace",
    timeoutMs: opts?.timeoutMs,
  });
}
