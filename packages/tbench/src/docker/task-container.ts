/**
 * Terminal-bench-specific container setup.
 *
 * Builds Docker image from a task's Dockerfile, copies test artifacts,
 * and runs validation via run-tests.sh.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { DockerContainer } from "./container.ts";
import type { TBenchTask } from "../dataset/types.ts";

/**
 * Build the Docker image tag for a terminal-bench task.
 */
export function taskImageTag(task: TBenchTask): string {
  const slug = task.taskId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `converge-tbench/${slug}:latest`;
}

/**
 * Build a Docker image from a task's directory.
 * The task directory must contain a Dockerfile.
 */
export async function buildTaskImage(task: TBenchTask): Promise<string> {
  const tag = taskImageTag(task);

  // Skip if already built
  if (await DockerContainer.imageExists(tag)) {
    return tag;
  }

  const container = new DockerContainer({ image: "scratch" });
  await container.buildFromDir(task.taskDir, tag);
  return tag;
}

/**
 * Create and start a container for a terminal-bench task.
 */
export async function startTaskContainer(
  task: TBenchTask,
  imageTag: string,
): Promise<DockerContainer> {
  const containerName = `tbench-${task.taskId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const container = new DockerContainer({
    image: imageTag,
    name: containerName,
    workDir: "/workspace",
    timeoutMs: task.maxAgentTimeoutSec * 1000,
  });

  await container.start();

  // Copy test artifacts into the container if they exist on the host
  const testsDir = join(task.taskDir, "tests");
  if (existsSync(testsDir)) {
    await container.copyIn(testsDir, "/workspace/tests");
  }

  const runTestsPath = join(task.taskDir, "run-tests.sh");
  if (existsSync(runTestsPath)) {
    await container.copyIn(runTestsPath, "/workspace/run-tests.sh");
    await container.exec("chmod +x /workspace/run-tests.sh");
  }

  return container;
}

/**
 * Run the task's test suite inside the container.
 * Returns { passed, output } based on the exit code of run-tests.sh.
 */
export async function runTaskTests(
  container: DockerContainer,
  task: TBenchTask,
): Promise<{ passed: boolean; output: string }> {
  const result = await container.exec("/workspace/run-tests.sh", {
    workDir: "/workspace",
    timeoutMs: task.maxTestTimeoutSec * 1000,
  });

  const output = result.stdout + result.stderr;
  return {
    passed: result.exitCode === 0,
    output,
  };
}
