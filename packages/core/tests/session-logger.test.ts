/**
 * Execution Logger Tests — single-target model
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ExecutionLogger } from "../src/journal/execution-logger.ts";
import type { ProgressSnapshot } from "../src/journal/execution-types.ts";

describe("ExecutionLogger", () => {
  let testDir: string;
  let executionLogger: ExecutionLogger;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "converge-target-test-"));
    // Set CONVERGE_TARGET_DIR so the logger writes into our temp dir
    process.env.CONVERGE_TARGET_DIR = testDir;
    executionLogger = new ExecutionLogger(testDir, "Test Project", {
      maxIterations: 10,
      maxAttemptsPerTask: 2,
    });
  });

  afterEach(async () => {
    delete process.env.CONVERGE_TARGET_DIR;
    await rm(testDir, { recursive: true, force: true });
  });

  describe("getTargetDir", () => {
    it("returns the target directory", () => {
      expect(executionLogger.getTargetDir()).toBe(testDir);
    });

    it("legacy getExecutionDir returns same as getTargetDir", () => {
      expect(executionLogger.getExecutionDir()).toBe(testDir);
    });
  });

  describe("writeExecutionStart", () => {
    it("creates target directory structure", async () => {
      await executionLogger.writeExecutionStart();

      const metadataPath = join(
        executionLogger.getTargetDir(),
        "metadata.json",
      );
      const metadataRaw = await readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(metadataRaw);

      expect(metadata.projectName).toBe("Test Project");
      expect(metadata.status).toBe("running");
      expect(metadata.executionId).toBe("latest");
    });

    it("writes execution start event", async () => {
      await executionLogger.writeExecutionStart();

      const eventsPath = join(executionLogger.getTargetDir(), "events.jsonl");
      const events = await readFile(eventsPath, "utf-8");
      expect(events).toContain("EXECUTION_START");
    });

    it("writes to execution log", async () => {
      await executionLogger.writeExecutionStart();

      const logPath = join(executionLogger.getTargetDir(), "execution.log");
      const content = await readFile(logPath, "utf-8");
      expect(content).toContain("Test Project");
    });
  });

  describe("writeIterationSnapshot", () => {
    it("writes progress to events.jsonl", async () => {
      await executionLogger.writeExecutionStart();

      const snapshot: ProgressSnapshot = {
        iteration: 1,
        timestamp: new Date().toISOString(),
        tasksComplete: 5,
        tasksTotal: 10,
        currentTask: { id: "task-1", epic: "epic-1", attempt: 1 },
        gaps: [],
      };
      await executionLogger.writeIterationSnapshot(snapshot);

      const eventsPath = join(executionLogger.getTargetDir(), "events.jsonl");
      const events = await readFile(eventsPath, "utf-8");
      expect(events).toContain("PROGRESS");
    });
  });

  describe("writeExecutionEnd", () => {
    it("finalizes metadata with outcomes", async () => {
      await executionLogger.writeExecutionStart();
      await executionLogger.writeExecutionEnd(
        {
          totalIterations: 3,
          tasksCompleted: 10,
          tasksFailed: 0,
          gapsResolved: 5,
          convergenceAchieved: true,
        },
        "complete",
      );

      const metadataPath = join(
        executionLogger.getTargetDir(),
        "metadata.json",
      );
      const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));
      expect(metadata.status).toBe("complete");
      expect(metadata.outcomes.tasksCompleted).toBe(10);
    });

    it("writes end event", async () => {
      await executionLogger.writeExecutionStart();
      await executionLogger.writeExecutionEnd(
        {
          totalIterations: 1,
          tasksCompleted: 1,
          tasksFailed: 0,
          gapsResolved: 0,
          convergenceAchieved: true,
        },
        "complete",
      );

      const eventsPath = join(executionLogger.getTargetDir(), "events.jsonl");
      const events = await readFile(eventsPath, "utf-8");
      expect(events).toContain("EXECUTION_END");
    });
  });

  describe("Task-level logging", () => {
    it("logs task selection", async () => {
      await executionLogger.logTaskSelected("task-1", "epic-1", 1);
      const events = await readFile(
        join(executionLogger.getTargetDir(), "events.jsonl"),
        "utf-8",
      );
      expect(events).toContain("NODE_START");
    });

    it("logs task attempt completion", async () => {
      await executionLogger.logTaskAttemptComplete("task-1", 1, true, 5000);
      const events = await readFile(
        join(executionLogger.getTargetDir(), "events.jsonl"),
        "utf-8",
      );
      expect(events).toContain("ATTEMPT_COMPLETE");
    });

    it("logs convergence", async () => {
      await executionLogger.logConvergence("task-1", true);
      const events = await readFile(
        join(executionLogger.getTargetDir(), "events.jsonl"),
        "utf-8",
      );
      expect(events).toContain("NODE_COMPLETE");
    });

    it("logs stalled convergence", async () => {
      await executionLogger.logConvergence("task-1", false);
      const events = await readFile(
        join(executionLogger.getTargetDir(), "events.jsonl"),
        "utf-8",
      );
      expect(events).toContain("NODE_FAIL");
    });
  });
});
