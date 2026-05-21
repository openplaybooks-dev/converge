/**
 * RFC 0033 Phase 3 — Worker Process Isolation
 *
 * Worker process entry point. Receives tasks via IPC from the coordinator,
 * executes them with environment isolation (no process.env mutation),
 * and reports results back via IPC.
 *
 * This module is designed to be forked by ProcessSupervisor.
 */

import { parentPort, isMainThread } from "node:worker_threads";
import { type LeaseResponse, type CompleteRequest, type FailRequest } from "./protocol.js";

if (!isMainThread) {
  console.error("Worker should be forked via child_process.fork(), not worker_threads");
  process.exit(1);
}

// The worker receives messages from the parent (coordinator)
process.on("message", async (message: unknown) => {
  const msg = message as { type: string; payload?: unknown };

  switch (msg.type) {
    case "task:start": {
      const task = msg.payload as LeaseResponse;
      await handleTaskStart(task);
      break;
    }
    case "heartbeat:ping": {
      // Respond to coordinator heartbeat check
      process.send?.({ type: "heartbeat:pong", timestamp: Date.now() });
      break;
    }
    default:
      console.warn(`⚠️ Unknown message type: ${msg.type}`);
  }
});

async function handleTaskStart(task: LeaseResponse): Promise<void> {
  const taskId = task.taskId;
  const startTime = Date.now();

  try {
    // Execute task with environment isolation
    const env = { ...process.env, ...task.env };
    const result = await executeTask(taskId, env, task);

    // Report completion
    process.send?.({
      type: "task:complete",
      payload: {
        leaseId: task.leaseId,
        taskId,
        duration: Date.now() - startTime,
        result,
      } as CompleteRequest,
    });
  } catch (error: any) {
    process.send?.({
      type: "task:fail",
      payload: {
        leaseId: task.leaseId,
        taskId,
        errorClass: "permanent",
        reason: error.message,
      } as FailRequest,
    });
  }
}

/**
 * Execute a task with the provided environment. The env is passed explicitly
 * rather than mutating process.env, ensuring isolation between tasks.
 */
async function executeTask(
  taskId: string,
  env: Record<string, string>,
  task: LeaseResponse,
): Promise<unknown> {
  // Worker process implements its own task execution logic.
  // For now, this is a placeholder — the real implementation would:
  // 1. Parse the TASK.md content
  // 2. Execute the task's script/command with the isolated env
  // 3. Return the result
  return { taskId, status: "completed", env };
}
