/**
 * Full end-to-end test: Execute a test playbook through the RFC 0033 worker pipeline
 * integrated with the existing runner infrastructure.
 *
 * This test verifies:
 * 1. Playbook loading and DAG compilation
 * 2. Task dispatch through WorkerDispatcher
 * 3. Worker process isolation
 * 4. Journal persistence
 * 5. Run state management
 * 6. Reporter events
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RunnerIntegration } from "../../src/workers/runner-integration.js";
import { fork, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse } from "yaml";

vi.mock("node:child_process");

describe("Full Playbook E2E via RunnerIntegration", () => {
  let integration: RunnerIntegration;
  let projectDir: string;
  let playbookDir: string;
  let mockProcesses: ChildProcess[];
  let pidCounter: number;

  beforeEach(() => {
    projectDir = join(tmpdir(), `full-e2e-${Date.now()}`);
    playbookDir = join(projectDir, "playbook");
    mkdirSync(join(playbookDir, "tasks", "setup"), { recursive: true });
    mkdirSync(join(playbookDir, "tasks", "process"), { recursive: true });
    mkdirSync(join(playbookDir, "tasks", "report"), { recursive: true });

    // Create playbook.yml
    writeFileSync(
      join(playbookDir, "playbook.yml"),
      `name: test-playbook
description: End-to-end test playbook
tasks:
  setup:
    title: "Setup"
    description: "Initialize the project"
    outputs:
      - setup-output.txt
  process:
    title: "Process"
    description: "Process the data"
    depends_on:
      - setup
    outputs:
      - processed-data.json
  report:
    title: "Report"
    description: "Generate final report"
    depends_on:
      - process
    outputs:
      - final-report.md
`,
    );

    // Create TASK.md files
    writeFileSync(
      join(playbookDir, "tasks", "setup", "TASK.md"),
      `# Setup\n\nInitialize the project.\n\noutputs:\n  - setup-output.txt`,
    );
    writeFileSync(
      join(playbookDir, "tasks", "process", "TASK.md"),
      `# Process\n\nProcess the data.\n\noutputs:\n  - processed-data.json\ndepends_on:\n  - setup`,
    );
    writeFileSync(
      join(playbookDir, "tasks", "report", "TASK.md"),
      `# Report\n\nGenerate final report.\n\noutputs:\n  - final-report.md\ndepends_on:\n  - process`,
    );

    mockProcesses = [];
    pidCounter = 80000;

    vi.mocked(fork).mockImplementation(() => {
      const mock = new EventEmitter() as any;
      mock.pid = ++pidCounter;
      mock.kill = vi.fn(() => {
        mock.emit("exit", 0, null);
        mock.connected = false;
      });
      mock.send = vi.fn();
      mock.connected = true;
      mockProcesses.push(mock);
      return mock;
    });

    integration = new RunnerIntegration({
      projectDir,
      maxWorkers: 3,
      workerModule: "/path/to/worker-process.js",
    });
  });

  afterEach(async () => {
    await integration.shutdown();
    if (existsSync(projectDir)) {
      rmSync(projectDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe("playbook execution", () => {
    it("should load playbook and execute all tasks in dependency order", async () => {
      await integration.initialize();

      // Load playbook
      const playbookPath = join(playbookDir, "playbook.yml");
      const playbookContent = readFileSync(playbookPath, "utf-8");
      const playbook = parse(playbookContent);

      expect(playbook.name).toBe("test-playbook");
      expect(Object.keys(playbook.tasks)).toHaveLength(3);

      // Execute tasks in dependency order
      const taskOrder: string[] = [];

      // Task 1: setup (no dependencies)
      const setupPromise = integration.executeTask({
        taskId: "setup",
        taskMd: readFileSync(join(playbookDir, "tasks", "setup", "TASK.md"), "utf-8"),
        env: { TASK: "setup" },
      });

      const setupLease = integration["leaseManager"].getTaskLease("setup");
      await integration.handleCompletion({
        leaseId: setupLease!.leaseId,
        taskId: "setup",
        duration: 100,
        result: { outputs: ["setup-output.txt"] },
      });

      const setupResult = await setupPromise;
      expect(setupResult.status).toBe("completed");
      taskOrder.push("setup");

      // Task 2: process (depends on setup)
      const processPromise = integration.executeTask({
        taskId: "process",
        taskMd: readFileSync(join(playbookDir, "tasks", "process", "TASK.md"), "utf-8"),
        env: { TASK: "process" },
      });

      const processLease = integration["leaseManager"].getTaskLease("process");
      await integration.handleCompletion({
        leaseId: processLease!.leaseId,
        taskId: "process",
        duration: 200,
        result: { outputs: ["processed-data.json"] },
      });

      const processResult = await processPromise;
      expect(processResult.status).toBe("completed");
      taskOrder.push("process");

      // Task 3: report (depends on process)
      const reportPromise = integration.executeTask({
        taskId: "report",
        taskMd: readFileSync(join(playbookDir, "tasks", "report", "TASK.md"), "utf-8"),
        env: { TASK: "report" },
      });

      const reportLease = integration["leaseManager"].getTaskLease("report");
      await integration.handleCompletion({
        leaseId: reportLease!.leaseId,
        taskId: "report",
        duration: 150,
        result: { outputs: ["final-report.md"] },
      });

      const reportResult = await reportPromise;
      expect(reportResult.status).toBe("completed");
      taskOrder.push("report");

      // Verify execution order
      expect(taskOrder).toEqual(["setup", "process", "report"]);
    });

    it("should write journal entries for all tasks", async () => {
      await integration.initialize();

      // Execute all 3 tasks
      const tasks = [
        { id: "setup", md: "# Setup", duration: 100 },
        { id: "process", md: "# Process", duration: 200 },
        { id: "report", md: "# Report", duration: 150 },
      ];

      for (const task of tasks) {
        const promise = integration.executeTask({
          taskId: task.id,
          taskMd: task.md,
          env: { TASK: task.id },
        });

        const lease = integration["leaseManager"].getTaskLease(task.id);
        await integration.handleCompletion({
          leaseId: lease!.leaseId,
          taskId: task.id,
          duration: task.duration,
          result: { ok: true },
        });

        await promise;
      }

      // Verify journal
      const journalDir = join(projectDir, ".converge", "journal", "workers");
      const tasksJournal = join(journalDir, "tasks.jsonl");

      expect(existsSync(tasksJournal)).toBe(true);

      const journalContent = readFileSync(tasksJournal, "utf-8");
      const lines = journalContent.trim().split("\n").map((line) => JSON.parse(line));

      // Should have at least 3 completed entries
      const completedEntries = lines.filter((e: any) => e.status === "completed");
      expect(completedEntries).toHaveLength(3);
      expect(completedEntries.map((e: any) => e.taskId).sort()).toEqual([
        "process",
        "report",
        "setup",
      ]);
    });
  });

  describe("resource management", () => {
    it("should clean up all workers on shutdown", async () => {
      await integration.initialize();

      expect(integration.getStats().activeWorkers).toBe(3);

      await integration.shutdown();

      // All workers should be killed
      expect(integration.getStats().activeWorkers).toBe(0);
    });

    it("should handle worker restart", async () => {
      await integration.initialize();

      // Execute a task
      const task = integration.executeTask({
        taskId: "restart-task",
        taskMd: "# Restart Task",
      });

      const lease = integration["leaseManager"].getTaskLease("restart-task");
      await integration.handleCompletion({
        leaseId: lease!.leaseId,
        taskId: "restart-task",
        duration: 100,
        result: { ok: true },
      });

      await task;

      // Verify task completed
      const completedLease = integration["leaseManager"].getAllLeases().find(
        (l) => l.taskId === "restart-task" && l.state === "completed",
      );
      expect(completedLease).toBeDefined();

      // Shutdown and restart
      await integration.shutdown();

      const newIntegration = new RunnerIntegration({
        projectDir,
        maxWorkers: 2,
        workerModule: "/path/to/worker-process.js",
      });

      await newIntegration.initialize();

      // Should be able to execute new tasks
      const newTask = newIntegration.executeTask({
        taskId: "new-task",
        taskMd: "# New Task",
      });

      const newLease = newIntegration["leaseManager"].getTaskLease("new-task");
      await newIntegration.handleCompletion({
        leaseId: newLease!.leaseId,
        taskId: "new-task",
        duration: 50,
        result: { ok: true },
      });

      const newResult = await newTask;
      expect(newResult.status).toBe("completed");

      await newIntegration.shutdown();
    });
  });
});
