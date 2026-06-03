import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  migrate0031,
  discoverPlaybooks,
} from "../packages/cli/src/migrate-0031.ts";

describe("migrate-0031 (RFC 0031 migration)", () => {
  let tmpDir: string;
  let workspace: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "converge-migrate-test-"));
    workspace = tmpDir;

    // Set up standard converge directory structure
    mkdirSync(join(workspace, ".converge", "playbooks", "test-pb"), {
      recursive: true,
    });
    mkdirSync(join(workspace, ".converge", "inventory", "test-pb"), {
      recursive: true,
    });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writePlaybookYml(name: string, content: string) {
    writeFileSync(
      join(workspace, ".converge", "playbooks", name, "playbook.yml"),
      content,
      "utf8",
    );
  }

  function writeSpawnYml(childId: string, content: string) {
    const dir = join(workspace, ".converge", "spawn", childId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "spawn.yml"), content, "utf8");
  }

  function writeTaskMd(playbookName: string, taskId: string, content: string) {
    const dir = join(
      workspace,
      ".converge",
      "playbooks",
      playbookName,
      "tasks",
      taskId,
    );
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "TASK.md"), content, "utf8");
  }

  function writeLegacyTasksJsonl(playbookName: string, rows: any[]) {
    writeFileSync(
      join(workspace, ".converge", "inventory", playbookName, "tasks.jsonl"),
      rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
      "utf8",
    );
  }

  it("migrates playbook.yml to unified header row", () => {
    writePlaybookYml(
      "test-pb",
      `
name: test-pb
description: A test playbook
inputs:
  portalDir:
    default: "apps/portal"
variables:
  designDoc: DESIGN.md
run:
  maxIterations: 200
  maxTaskAttempts: 3
  resume: true
  workers: 1
tasks:
  - id: 00-requirements
  - id: 01-design
    depends_on:
      - 00-requirements
`,
    );

    writeTaskMd(
      "test-pb",
      "00-requirements",
      `---
id: 00-requirements
depends_on: []
---
# Requirements`,
    );

    writeTaskMd(
      "test-pb",
      "01-design",
      `---
id: 01-design
depends_on: ["00-requirements"]
---
# Design`,
    );

    const report = migrate0031(workspace, "test-pb", false);

    expect(report.alreadyMigrated).toBe(false);
    expect(report.errors).toHaveLength(0);
    expect(report.staticTasks).toBe(2);
    expect(report.spawnedTasks).toBe(0);
    expect(report.header).not.toBeNull();
    expect(report.header!.name).toBe("test-pb");

    // Verify unified tasks.jsonl was written
    const tasksFile = join(
      workspace,
      ".converge",
      "inventory",
      "test-pb",
      "tasks.jsonl",
    );
    expect(existsSync(tasksFile)).toBe(true);

    const content = readFileSync(tasksFile, "utf8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(3); // header + 2 tasks

    // Row 1 is playbook header
    const header = JSON.parse(lines[0]);
    expect(header.kind).toBe("playbook");
    expect(header.name).toBe("test-pb");
    expect(header.description).toBe("A test playbook");

    // Row 2 is static task
    const task0 = JSON.parse(lines[1]);
    expect(task0.id).toBe("00-requirements");
    expect(task0.taskRef.kind).toBe("static");

    // Row 3 is static task with dependency
    const task1 = JSON.parse(lines[2]);
    expect(task1.id).toBe("01-design");
    expect(task1.taskRef.kind).toBe("static");
  });

  it("migrates legacy spawn.yml files to unified task rows", () => {
    writePlaybookYml(
      "test-pb",
      `
name: test-pb
tasks:
  - id: 07-screens
`,
    );

    writeTaskMd(
      "test-pb",
      "07-screens",
      `---
id: 07-screens
depends_on: []
---
# Screens`,
    );

    writeSpawnYml(
      "screen-landing-03-react",
      `
template: screen-03-react
depends_on:
  - 07-screens
params:
  screenId: "landing"
  route: "/"
  title: "Landing"
  density: "workspace"
`,
    );

    writeSpawnYml(
      "screen-bots-list-03-react",
      `
template: screen-03-react
depends_on:
  - 07-screens
params:
  screenId: "bots-list"
  route: "/bots"
  title: "Bots List"
`,
    );

    const report = migrate0031(workspace, "test-pb", false);

    expect(report.spawnedTasks).toBe(2);
    expect(report.staticTasks).toBe(1);

    const tasksFile = join(
      workspace,
      ".converge",
      "inventory",
      "test-pb",
      "tasks.jsonl",
    );
    const content = readFileSync(tasksFile, "utf8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(4); // header + 1 static + 2 spawned

    // Spawned rows have template refs
    const spawnedRows = lines.slice(2).map((l) => JSON.parse(l));
    expect(spawnedRows[0].taskRef.kind).toBe("template");
    expect(spawnedRows[0].taskRef.name).toBe("screen-03-react");
    expect(spawnedRows[0].params.screenId).toBe("bots-list"); // sorted alphabetically by id
    expect(spawnedRows[0].depends_on).toContain("07-screens");
  });

  it("preserves runtime state from existing tasks.jsonl", () => {
    writePlaybookYml(
      "test-pb",
      `name: test-pb\ntasks:\n  - id: task-done\n  - id: task-todo\n`,
    );

    writeTaskMd(
      "test-pb",
      "task-done",
      `---
id: task-done
depends_on: []
---
# Done Task`,
    );

    writeTaskMd(
      "test-pb",
      "task-todo",
      `---
id: task-todo
depends_on: []
---
# Todo Task`,
    );

    writeLegacyTasksJsonl("test-pb", [
      {
        id: "task-done",
        taskPath: "/some/path",
        status: "done",
        fingerprint: "sha256:abc123",
        completedAt: "2026-05-20T12:00:00.000Z",
        createdAt: "2026-05-19T00:00:00.000Z",
        updatedAt: "2026-05-20T12:00:00.000Z",
      },
    ]);

    const report = migrate0031(workspace, "test-pb", false);

    expect(report.migratedFromExisting).toBe(1);

    const tasksFile = join(
      workspace,
      ".converge",
      "inventory",
      "test-pb",
      "tasks.jsonl",
    );
    const content = readFileSync(tasksFile, "utf8");
    const lines = content.trim().split("\n");

    // Find the task-done row (skip header)
    const doneRow = lines
      .slice(1)
      .map((l) => JSON.parse(l))
      .find((r: any) => r.id === "task-done");
    expect(doneRow).toBeDefined();
    expect(doneRow.status).toBe("done");
    expect(doneRow.fingerprint).toBe("sha256:abc123");
    expect(doneRow.completedAt).toBe("2026-05-20T12:00:00.000Z");
  });

  it("is idempotent on already-migrated playbooks", () => {
    const tasksFile = join(
      workspace,
      ".converge",
      "inventory",
      "test-pb",
      "tasks.jsonl",
    );
    writeFileSync(
      tasksFile,
      JSON.stringify({
        kind: "playbook",
        schemaVersion: 1,
        name: "test-pb",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }) + "\n",
      "utf8",
    );

    const report = migrate0031(workspace, "test-pb", false);

    expect(report.alreadyMigrated).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it("dry-run does not write files or archive", () => {
    writePlaybookYml("test-pb", `name: test-pb\ntasks:\n  - id: task-a\n`);
    writeTaskMd(
      "test-pb",
      "task-a",
      `---
id: task-a
depends_on: []
---
# Task A`,
    );

    // No tasks.jsonl should exist before dry-run
    const tasksFile = join(
      workspace,
      ".converge",
      "inventory",
      "test-pb",
      "tasks.jsonl",
    );
    expect(existsSync(tasksFile)).toBe(false);

    const report = migrate0031(workspace, "test-pb", true);

    // Dry-run should NOT create the file
    expect(existsSync(tasksFile)).toBe(false);
    expect(report.alreadyMigrated).toBe(false);
  });

  it("archives legacy files", () => {
    writePlaybookYml("test-pb", `name: test-pb\ntasks:\n  - id: task-a\n`);
    writeTaskMd(
      "test-pb",
      "task-a",
      `---
id: task-a
depends_on: []
---
# Task A`,
    );

    // Write a legacy spawn.yml for migration
    writeSpawnYml(
      "screen-1",
      `
template: screen-tpl
params:
  screenId: "home"
`,
    );

    const report = migrate0031(workspace, "test-pb", false);

    // playbook.yml should be archived
    const playbookYmlPath = join(
      workspace,
      ".converge",
      "playbooks",
      "test-pb",
      "playbook.yml",
    );
    expect(existsSync(playbookYmlPath)).toBe(false);

    // spawn/ should be archived
    const spawnDir = join(workspace, ".converge", "spawn");
    expect(existsSync(spawnDir)).toBe(false);

    expect(report.legacyFilesArchived.length).toBeGreaterThan(0);
  });

  it("discovers all playbooks", () => {
    mkdirSync(join(workspace, ".converge", "playbooks", "pb-two"), {
      recursive: true,
    });

    const playbooks = discoverPlaybooks(workspace);
    expect(playbooks).toContain("test-pb");
    expect(playbooks).toContain("pb-two");
  });

  it("handles missing playbook gracefully", () => {
    const report = migrate0031(workspace, "nonexistent", false);
    expect(report.alreadyMigrated).toBe(false);
    // Should not throw, just produce minimal output
    expect(report.staticTasks).toBe(0);
    expect(report.spawnedTasks).toBe(0);
  });
});
