/**
 * Session Logger Smoke Test
 *
 * Quick integration test to verify session logger works end-to-end
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ExecutionLogger,
  generateExecutionId,
} from "../src/journal/execution-logger.ts";
import type { ProgressSnapshot } from "../src/journal/execution-types.ts";

describe("Session Logger Smoke Test", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "converge-smoke-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should create a complete session from start to end", async () => {
    // Initialize session
    const executionId = generateExecutionId();
    const logger = new ExecutionLogger(
      testDir,
      executionId,
      "Smoke Test Project",
      {
        maxIterations: 10,
        maxAttemptsPerTask: 2,
      },
    );

    // Start session
    await logger.writeExecutionStart();

    // Simulate iteration 1
    const snapshot1: ProgressSnapshot = {
      iteration: 1,
      timestamp: new Date().toISOString(),
      tasksComplete: 0,
      tasksTotal: 3,
      currentTask: {
        id: "task-001",
        epic: "epic-01",
        attempt: 1,
        status: "running",
      },
      gaps: [{ type: "output", task: "task-001", count: 1 }],
    };
    await logger.writeIterationSnapshot(snapshot1);
    await logger.logTaskSelected("task-001", "epic-01", 1);
    await logger.logTaskAttemptStart("task-001", 1);
    await logger.logGapDetected("task-001", "output", "Missing output file");
    await logger.logStrategyAttempted("task-001", "task-run");
    await logger.logTaskAttemptComplete("task-001", 1, true, 5000);
    await logger.logConvergence("task-001", true);

    // Simulate iteration 2
    const snapshot2: ProgressSnapshot = {
      iteration: 2,
      timestamp: new Date().toISOString(),
      tasksComplete: 1,
      tasksTotal: 3,
      currentTask: {
        id: "task-002",
        epic: "epic-01",
        attempt: 1,
        status: "running",
      },
      gaps: [],
    };
    await logger.writeIterationSnapshot(snapshot2);
    await logger.logTaskSelected("task-002", "epic-01", 1);
    await logger.logTaskAttemptStart("task-002", 1);
    await logger.logTaskAttemptComplete("task-002", 1, false, 3000);
    await logger.logConvergence("task-002", false);

    // End session
    await logger.writeExecutionEnd(
      {
        totalIterations: 2,
        tasksCompleted: 1,
        tasksFailed: 1,
        gapsResolved: 1,
        convergenceAchieved: false,
      },
      "stalled",
    );

    // Verify all files exist
    const executionDir = logger.getExecutionDir();
    const files = await readdir(executionDir);

    expect(files).toContain("execution.log");
    expect(files).toContain("events.jsonl");
    expect(files).toContain("metadata.json");
    expect(files).toContain("progress.jsonl");
    expect(files).toContain("errors");

    // Verify metadata has final state
    const metadata = JSON.parse(
      await readFile(join(executionDir, "metadata.json"), "utf-8"),
    );
    expect(metadata.status).toBe("stalled");
    expect(metadata.outcomes.totalIterations).toBe(2);
    expect(metadata.outcomes.tasksCompleted).toBe(1);
    expect(metadata.outcomes.tasksFailed).toBe(1);

    // Verify events were logged
    const events = (await readFile(join(executionDir, "events.jsonl"), "utf-8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(events.length).toBeGreaterThan(5);
    expect(events.some((e) => e.eventType === "EXECUTION_START")).toBe(true);
    expect(events.some((e) => e.eventType === "EXECUTION_END")).toBe(true);
    expect(events.some((e) => e.eventType === "ITERATION_START")).toBe(true);
    expect(events.some((e) => e.eventType === "TASK_SELECTED")).toBe(true);
    expect(events.some((e) => e.eventType === "CONVERGENCE_ACHIEVED")).toBe(
      true,
    );
    expect(events.some((e) => e.eventType === "CONVERGENCE_STALLED")).toBe(
      true,
    );

    // Verify progress snapshots
    const progress = (
      await readFile(join(executionDir, "progress.jsonl"), "utf-8")
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(progress).toHaveLength(2);
    expect(progress[0].iteration).toBe(1);
    expect(progress[1].iteration).toBe(2);
    expect(progress[0].tasksComplete).toBe(0);
    expect(progress[1].tasksComplete).toBe(1);

    // Verify session log has human-readable content
    const executionLog = await readFile(
      join(executionDir, "execution.log"),
      "utf-8",
    );
    expect(executionLog).toContain("Autonomous AI Orchestrator Starting");
    expect(executionLog).toContain("Iteration 1");
    expect(executionLog).toContain("Iteration 2");
    expect(executionLog).toContain("EXECUTION STALLED");
    expect(executionLog).toContain("Iterations: 2");
    expect(executionLog).toContain("Tasks Completed: 1");
    expect(executionLog).toContain("Tasks Failed: 1");
  });
});
