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
  SessionLogger,
  generateSessionId,
} from "../src/journal/session-logger.ts";
import type { ProgressSnapshot } from "../src/journal/session-types.ts";

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
    const sessionId = generateSessionId();
    const logger = new SessionLogger(testDir, sessionId, "Smoke Test Project", {
      maxIterations: 10,
      maxAttemptsPerTask: 2,
    });

    // Start session
    await logger.writeSessionStart();

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
    await logger.writeSessionEnd(
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
    const sessionDir = logger.getSessionDir();
    const files = await readdir(sessionDir);

    expect(files).toContain("session.log");
    expect(files).toContain("events.jsonl");
    expect(files).toContain("metadata.json");
    expect(files).toContain("progress.jsonl");
    expect(files).toContain("errors");

    // Verify metadata has final state
    const metadata = JSON.parse(
      await readFile(join(sessionDir, "metadata.json"), "utf-8"),
    );
    expect(metadata.status).toBe("stalled");
    expect(metadata.outcomes.totalIterations).toBe(2);
    expect(metadata.outcomes.tasksCompleted).toBe(1);
    expect(metadata.outcomes.tasksFailed).toBe(1);

    // Verify events were logged
    const events = (await readFile(join(sessionDir, "events.jsonl"), "utf-8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(events.length).toBeGreaterThan(5);
    expect(events.some((e) => e.eventType === "SESSION_START")).toBe(true);
    expect(events.some((e) => e.eventType === "SESSION_END")).toBe(true);
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
      await readFile(join(sessionDir, "progress.jsonl"), "utf-8")
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
    const sessionLog = await readFile(join(sessionDir, "session.log"), "utf-8");
    expect(sessionLog).toContain("Autonomous AI Orchestrator Starting");
    expect(sessionLog).toContain("Iteration 1");
    expect(sessionLog).toContain("Iteration 2");
    expect(sessionLog).toContain("SESSION STALLED");
    expect(sessionLog).toContain("Iterations: 2");
    expect(sessionLog).toContain("Tasks Completed: 1");
    expect(sessionLog).toContain("Tasks Failed: 1");
  });
});
