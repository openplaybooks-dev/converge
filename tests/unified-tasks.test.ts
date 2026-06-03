import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  readUnifiedTasksFile,
  writeUnifiedTasksFile,
  type RuntimePlaybookHeader,
  type UnifiedRuntimeTask,
} from "../packages/core/src/task/goal/unified-tasks.ts";

describe("unified tasks.jsonl", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "converge-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("readUnifiedTasksFile", () => {
    it("returns empty state when file does not exist", () => {
      const result = readUnifiedTasksFile(join(tmpDir, "nonexistent.jsonl"));
      expect(result.header).toBeNull();
      expect(result.tasks).toEqual([]);
    });

    it("parses playbook header from row 1", () => {
      const tasksFile = join(tmpDir, "tasks.jsonl");
      const header: RuntimePlaybookHeader = {
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        description: "Test playbook",
        inputs: { foo: { default: "bar" } },
        variables: { baz: "qux" },
        run: {
          maxIterations: 100,
          maxTaskAttempts: 3,
          resume: true,
          workers: 1,
        },
        skills: {},
        checks: [],
        goals: [],
        hooks: [],
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      };
      writeFileSync(tasksFile, JSON.stringify(header) + "\n", "utf8");

      const result = readUnifiedTasksFile(tasksFile);
      expect(result.header).toEqual(header);
      expect(result.tasks).toEqual([]);
    });

    it("parses static task rows", () => {
      const tasksFile = join(tmpDir, "tasks.jsonl");
      const header: RuntimePlaybookHeader = {
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      };
      const task: UnifiedRuntimeTask = {
        kind: "task",
        id: "task-01",
        taskRef: { kind: "static", dir: "/path/to/tasks/task-01" },
        depends_on: [],
        status: "todo",
        source: "static",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      };
      writeFileSync(
        tasksFile,
        JSON.stringify(header) + "\n" + JSON.stringify(task) + "\n",
        "utf8",
      );

      const result = readUnifiedTasksFile(tasksFile);
      expect(result.header).toEqual(header);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toEqual(task);
    });

    it("parses spawned task rows with template + params", () => {
      const tasksFile = join(tmpDir, "tasks.jsonl");
      const header: RuntimePlaybookHeader = {
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      };
      const task: UnifiedRuntimeTask = {
        kind: "task",
        id: "screen-landing-03-react",
        taskRef: { kind: "template", name: "screen-03-react" },
        params: { screenId: "landing", route: "/", title: "Landing" },
        depends_on: ["screen-landing-02-design"],
        parent: "07-screens",
        status: "todo",
        source: "spawned",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      };
      writeFileSync(
        tasksFile,
        JSON.stringify(header) + "\n" + JSON.stringify(task) + "\n",
        "utf8",
      );

      const result = readUnifiedTasksFile(tasksFile);
      expect(result.header).toEqual(header);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toEqual(task);
      expect(result.tasks[0].taskRef.kind).toBe("template");
      if (result.tasks[0].taskRef.kind === "template") {
        expect(result.tasks[0].taskRef.name).toBe("screen-03-react");
      }
      expect(result.tasks[0].params).toEqual({
        screenId: "landing",
        route: "/",
        title: "Landing",
      });
    });

    it("skips malformed rows", () => {
      const tasksFile = join(tmpDir, "tasks.jsonl");
      const header: RuntimePlaybookHeader = {
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      };
      const task: UnifiedRuntimeTask = {
        kind: "task",
        id: "task-01",
        taskRef: { kind: "static", dir: "/path/to/tasks/task-01" },
        depends_on: [],
        status: "todo",
        source: "static",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      };
      writeFileSync(
        tasksFile,
        JSON.stringify(header) +
          "\n" +
          "{ invalid json\n" +
          JSON.stringify(task) +
          "\n",
        "utf8",
      );

      const result = readUnifiedTasksFile(tasksFile);
      expect(result.header).toEqual(header);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toEqual(task);
    });
  });

  describe("writeUnifiedTasksFile", () => {
    it("writes header + tasks atomically", () => {
      const tasksFile = join(tmpDir, "tasks.jsonl");
      const header: RuntimePlaybookHeader = {
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      };
      const tasks: UnifiedRuntimeTask[] = [
        {
          kind: "task",
          id: "task-01",
          taskRef: { kind: "static", dir: "/path/to/tasks/task-01" },
          depends_on: [],
          status: "todo",
          source: "static",
          createdAt: "2026-05-21T00:00:00.000Z",
          updatedAt: "2026-05-21T00:00:00.000Z",
        },
        {
          kind: "task",
          id: "task-02",
          taskRef: { kind: "template", name: "template-a" },
          params: { key: "value" },
          depends_on: ["task-01"],
          status: "todo",
          source: "spawned",
          createdAt: "2026-05-21T00:00:00.000Z",
          updatedAt: "2026-05-21T00:00:00.000Z",
        },
      ];

      writeUnifiedTasksFile(tasksFile, header, tasks);

      const content = readFileSync(tasksFile, "utf8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(3);
      expect(JSON.parse(lines[0])).toEqual(header);
      expect(JSON.parse(lines[1])).toEqual(tasks[0]);
      expect(JSON.parse(lines[2])).toEqual(tasks[1]);
    });

    it("round-trips correctly", () => {
      const tasksFile = join(tmpDir, "tasks.jsonl");
      const header: RuntimePlaybookHeader = {
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        description: "Round-trip test",
        inputs: { foo: { default: "bar" } },
        variables: { baz: "qux" },
        run: {
          maxIterations: 100,
          maxTaskAttempts: 3,
          resume: true,
          workers: 1,
        },
        skills: { "skill-a": "/path/to/skill-a/SKILL.md" },
        checks: [{ id: "check-1", cmd: "echo ok" }],
        goals: [],
        hooks: [],
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      };
      const tasks: UnifiedRuntimeTask[] = [
        {
          kind: "task",
          id: "static-task",
          taskRef: { kind: "static", dir: "/path/to/tasks/static-task" },
          depends_on: [],
          status: "done",
          source: "static",
          fingerprint: "sha256:abc123",
          completedAt: "2026-05-21T01:00:00.000Z",
          createdAt: "2026-05-21T00:00:00.000Z",
          updatedAt: "2026-05-21T01:00:00.000Z",
        },
        {
          kind: "task",
          id: "spawned-task",
          taskRef: { kind: "template", name: "template-x" },
          params: { screenId: "home", route: "/" },
          depends_on: ["static-task"],
          parent: "parent-task",
          status: "todo",
          source: "spawned",
          createdAt: "2026-05-21T00:00:00.000Z",
          updatedAt: "2026-05-21T00:00:00.000Z",
          metadata: { template: "template-x", renderedHash: "sha256:def456" },
        },
      ];

      writeUnifiedTasksFile(tasksFile, header, tasks);
      const result = readUnifiedTasksFile(tasksFile);

      expect(result.header).toEqual(header);
      expect(result.tasks).toEqual(tasks);
    });
  });
});
