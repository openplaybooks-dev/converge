/**
 * Agent harness — builds the prompt for the AI agent and proxies
 * shell commands through `docker exec`.
 *
 * The agent runs on the host (reusing Converge's agent infrastructure,
 * API keys stay on host). File edits and shell commands are proxied
 * into the Docker container.
 */

import type { SWEBenchInstance } from "../dataset/types.ts";
import type { DockerContainer, ExecResult } from "../docker/container.ts";

/**
 * Build the agent prompt from the problem statement.
 * Gives the agent the bug report and instructions for producing a patch.
 */
export function buildAgentPrompt(instance: SWEBenchInstance): string {
  return `You are a software engineer working on the repository "${instance.repo}".

The repository has been checked out at commit ${instance.base_commit} in /workspace.
Your task is to fix the following issue.

## Issue

${instance.problem_statement}

${instance.hints_text ? `## Hints\n\n${instance.hints_text}\n` : ""}

## Instructions

1. Explore the repository to understand the codebase structure relevant to this issue.
2. Identify the root cause of the bug.
3. Implement a fix by editing the necessary source files.
4. Do NOT modify any test files.
5. When done, your changes will be captured as a git diff.

Use the shell to navigate files, read code, and make edits. All commands run inside the repository at /workspace.`;
}

/**
 * Execute a command inside the container, proxying from the host.
 * This is the bridge between the host-side agent and the container.
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
