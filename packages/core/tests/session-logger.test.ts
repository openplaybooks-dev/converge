/**
 * Session Logger Tests
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

describe("ExecutionLogger", () => {
  let testDir: string;
  let executionLogger: ExecutionLogger;
  let executionId: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await mkdtemp(join(tmpdir(), "converge-execution-test-"));
    executionId = generateExecutionId();
    executionLogger = new ExecutionLogger(testDir, executionId, "Test Project", {
      maxIterations: 10,
      maxAttemptsPerTask: 2,
    });
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe("generateExecutionId", () => {
    it("should generate unique session IDs", () => {
      const id1 = generateExecutionId();
      const id2 = generateExecutionId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it("should generate session IDs in expected format", () => {
      const id = generateExecutionId();
      // Format: YYYY-MM-DDTHH-mm-ss-hash
      expect(id).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-[a-z0-9]{6}$/);
    });
  });

  describe("writeExecutionStart", () => {
    it("should create session directory structure", async () => {
      await executionLogger.writeExecutionStart();

      const executionDir = executionLogger.getExecutionDir();
      const files = await readdir(executionDir);

      expect(files).toContain("execution.log");
      expect(files).toContain("events.jsonl");
      expect(files).toContain("metadata.json");
      expect(files).toContain("errors");
    });

    it("should write metadata.json with correct structure", async () => {
      await executionLogger.writeExecutionStart();

      const metadataPath = join(executionLogger.getExecutionDir(), "metadata.json");
      const content = await readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(content);

      expect(metadata.executionId).toBe(executionId);
      expect(metadata.projectName).toBe("Test Project");
      expect(metadata.status).toBe("running");
      expect(metadata.config.maxIterations).toBe(10);
      expect(metadata.config.maxAttemptsPerTask).toBe(2);
      expect(metadata.environment.nodeVersion).toBeTruthy();
      expect(metadata.environment.platform).toBeTruthy();
    });

    it("should write session start event", async () => {
      await executionLogger.writeExecutionStart();

      const eventsPath = join(executionLogger.getExecutionDir(), "events.jsonl");
      const content = await readFile(eventsPath, "utf-8");
      const lines = content.trim().split("\n");

      expect(lines.length).toBeGreaterThanOrEqual(1);

      const firstEvent = JSON.parse(lines[0]);
      expect(firstEvent.eventType).toBe("EXECUTION_START");
      expect(firstEvent.timestamp).toBeTruthy();
    });

    it("should write to session log", async () => {
      await executionLogger.writeExecutionStart();

      const logPath = join(executionLogger.getExecutionDir(), "execution.log");
      const content = await readFile(logPath, "utf-8");

      expect(content).toContain("Autonomous AI Orchestrator Starting");
      expect(content).toContain("Execution ID:");
      expect(content).toContain(executionId);
    });
  });

  describe("writeIterationSnapshot", () => {
    beforeEach(async () => {
      await executionLogger.writeExecutionStart();
    });

    it("should write iteration snapshot to progress.jsonl", async () => {
      const snapshot: ProgressSnapshot = {
        iteration: 1,
        timestamp: new Date().toISOString(),
        tasksComplete: 0,
        tasksTotal: 5,
        currentTask: {
          id: "test-task",
          epic: "test-epic",
          attempt: 1,
          status: "running",
        },
        gaps: [],
      };

      await executionLogger.writeIterationSnapshot(snapshot);

      const progressPath = join(
        executionLogger.getExecutionDir(),
        "progress.jsonl",
      );
      const content = await readFile(progressPath, "utf-8");
      const lines = content.trim().split("\n");

      expect(lines.length).toBe(1);

      const progressEntry = JSON.parse(lines[0]);
      expect(progressEntry.iteration).toBe(1);
      expect(progressEntry.tasksComplete).toBe(0);
      expect(progressEntry.tasksTotal).toBe(5);
      expect(progressEntry.currentTask.id).toBe("test-task");
    });

    it("should write iteration event", async () => {
      const snapshot: ProgressSnapshot = {
        iteration: 1,
        timestamp: new Date().toISOString(),
        tasksComplete: 0,
        tasksTotal: 5,
        gaps: [],
      };

      await executionLogger.writeIterationSnapshot(snapshot);

      const eventsPath = join(executionLogger.getExecutionDir(), "events.jsonl");
      const content = await readFile(eventsPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      const iterationEvent = lines.find((line) => {
        const event = JSON.parse(line);
        return event.eventType === "ITERATION_START";
      });

      expect(iterationEvent).toBeTruthy();
    });

    it("should write human-readable iteration to session log", async () => {
      const snapshot: ProgressSnapshot = {
        iteration: 1,
        timestamp: new Date().toISOString(),
        tasksComplete: 0,
        tasksTotal: 5,
        currentTask: {
          id: "test-task",
          epic: "test-epic",
          attempt: 1,
          status: "running",
        },
        gaps: [],
      };

      await executionLogger.writeIterationSnapshot(snapshot);

      const logPath = join(executionLogger.getExecutionDir(), "execution.log");
      const content = await readFile(logPath, "utf-8");

      expect(content).toContain("Iteration 1");
      expect(content).toContain("Progress: 0/5 tasks complete");
      expect(content).toContain("Next task: test-task");
    });
  });

  describe("writeExecutionEnd", () => {
    beforeEach(async () => {
      await executionLogger.writeExecutionStart();
    });

    it("should finalize metadata with outcomes", async () => {
      await executionLogger.writeExecutionEnd(
        {
          totalIterations: 5,
          tasksCompleted: 3,
          tasksFailed: 1,
          gapsResolved: 10,
          convergenceAchieved: true,
        },
        "complete",
      );

      const metadataPath = join(executionLogger.getExecutionDir(), "metadata.json");
      const content = await readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(content);

      expect(metadata.status).toBe("complete");
      expect(metadata.endTime).toBeTruthy();
      expect(metadata.duration).toBeGreaterThan(0);
      expect(metadata.outcomes.totalIterations).toBe(5);
      expect(metadata.outcomes.tasksCompleted).toBe(3);
      expect(metadata.outcomes.tasksFailed).toBe(1);
      expect(metadata.outcomes.gapsResolved).toBe(10);
      expect(metadata.outcomes.convergenceAchieved).toBe(true);
    });

    it("should write session end event", async () => {
      await executionLogger.writeExecutionEnd(
        {
          totalIterations: 5,
          tasksCompleted: 3,
          tasksFailed: 1,
          gapsResolved: 10,
          convergenceAchieved: true,
        },
        "complete",
      );

      const eventsPath = join(executionLogger.getExecutionDir(), "events.jsonl");
      const content = await readFile(eventsPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      const executionEndEvent = lines.find((line) => {
        const event = JSON.parse(line);
        return event.eventType === "EXECUTION_END";
      });

      expect(executionEndEvent).toBeTruthy();
      const event = JSON.parse(executionEndEvent!);
      expect(event.metadata?.status).toBe("complete");
    });

    it("should write summary to session log", async () => {
      await executionLogger.writeExecutionEnd(
        {
          totalIterations: 5,
          tasksCompleted: 3,
          tasksFailed: 1,
          gapsResolved: 10,
          convergenceAchieved: true,
        },
        "complete",
      );

      const logPath = join(executionLogger.getExecutionDir(), "execution.log");
      const content = await readFile(logPath, "utf-8");

      expect(content).toContain("EXECUTION COMPLETE");
      expect(content).toContain("Iterations: 5");
      expect(content).toContain("Tasks Completed: 3");
      expect(content).toContain("Tasks Failed: 1");
      expect(content).toContain("Gaps Resolved: 10");
      expect(content).toContain("Convergence: Yes");
    });
  });

  describe("Task-level logging", () => {
    beforeEach(async () => {
      await executionLogger.writeExecutionStart();
    });

    it("should log task selection", async () => {
      await executionLogger.logTaskSelected("test-task", "test-epic", 1);

      const eventsPath = join(executionLogger.getExecutionDir(), "events.jsonl");
      const content = await readFile(eventsPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      const taskSelectedEvent = lines.find((line) => {
        const event = JSON.parse(line);
        return event.eventType === "TASK_SELECTED";
      });

      expect(taskSelectedEvent).toBeTruthy();
      const event = JSON.parse(taskSelectedEvent!);
      expect(event.metadata?.taskId).toBe("test-task");
      expect(event.metadata?.epicId).toBe("test-epic");
      expect(event.metadata?.attempt).toBe(1);
    });

    it("should log task attempt completion", async () => {
      await executionLogger.logTaskAttemptComplete("test-task", 1, true, 5000);

      const eventsPath = join(executionLogger.getExecutionDir(), "events.jsonl");
      const content = await readFile(eventsPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      const taskCompleteEvent = lines.find((line) => {
        const event = JSON.parse(line);
        return event.eventType === "TASK_ATTEMPT_COMPLETE";
      });

      expect(taskCompleteEvent).toBeTruthy();
      const event = JSON.parse(taskCompleteEvent!);
      expect(event.metadata?.taskId).toBe("test-task");
      expect(event.metadata?.attempt).toBe(1);
      expect(event.metadata?.success).toBe(true);
      expect(event.metadata?.duration).toBe(5000);
    });

    it("should log convergence", async () => {
      await executionLogger.logConvergence("test-task", true);

      const eventsPath = join(executionLogger.getExecutionDir(), "events.jsonl");
      const content = await readFile(eventsPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      const convergenceEvent = lines.find((line) => {
        const event = JSON.parse(line);
        return event.eventType === "CONVERGENCE_ACHIEVED";
      });

      expect(convergenceEvent).toBeTruthy();
    });

    it("should log stalled convergence", async () => {
      await executionLogger.logConvergence("test-task", false);

      const eventsPath = join(executionLogger.getExecutionDir(), "events.jsonl");
      const content = await readFile(eventsPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      const stallEvent = lines.find((line) => {
        const event = JSON.parse(line);
        return event.eventType === "CONVERGENCE_STALLED";
      });

      expect(stallEvent).toBeTruthy();
    });
  });
});
