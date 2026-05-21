import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { hashUnifiedPlaybook } from "../packages/core/src/run/compile-unified.ts";

describe("compile-unified (RFC 0031)", () => {
  let tmpDir: string;
  let playbookDir: string;
  let inventoryDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "converge-compile-test-"));
    playbookDir = join(tmpDir, "playbooks", "test-playbook");
    inventoryDir = join(tmpDir, "inventory", "test-playbook");
    mkdirSync(playbookDir, { recursive: true });
    mkdirSync(inventoryDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeTaskMd(dir: string, content: string) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "TASK.md"), content, "utf8");
  }

  it("produces deterministic hash for same content", () => {
    writeTaskMd(join(playbookDir, "tasks", "task-a"), `---
id: task-a
depends_on: []
---
# Task A
Do thing A.`);

    writeFileSync(
      join(inventoryDir, "tasks.jsonl"),
      JSON.stringify({
        kind: "playbook", schemaVersion: 1, name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z", updatedAt: "2026-05-21T00:00:00.000Z",
      }) + "\n" +
      JSON.stringify({
        kind: "task", id: "task-a",
        taskRef: { kind: "static", dir: join(playbookDir, "tasks/task-a") },
        depends_on: [], status: "todo", source: "static",
        createdAt: "2026-05-21T00:00:00.000Z", updatedAt: "2026-05-21T00:00:00.000Z",
      }) + "\n",
      "utf8"
    );

    const hash1 = hashUnifiedPlaybook(playbookDir, inventoryDir);
    const hash2 = hashUnifiedPlaybook(playbookDir, inventoryDir);
    expect(hash1).toBe(hash2);
  });

  it("produces different hash when TASK.md changes", () => {
    writeTaskMd(join(playbookDir, "tasks", "task-a"), `---
id: task-a
depends_on: []
---
# Task A v1`);

    writeFileSync(
      join(inventoryDir, "tasks.jsonl"),
      JSON.stringify({
        kind: "playbook", schemaVersion: 1, name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z", updatedAt: "2026-05-21T00:00:00.000Z",
      }) + "\n" +
      JSON.stringify({
        kind: "task", id: "task-a",
        taskRef: { kind: "static", dir: join(playbookDir, "tasks/task-a") },
        depends_on: [], status: "todo", source: "static",
        createdAt: "2026-05-21T00:00:00.000Z", updatedAt: "2026-05-21T00:00:00.000Z",
      }) + "\n",
      "utf8"
    );

    const hash1 = hashUnifiedPlaybook(playbookDir, inventoryDir);

    // Modify the TASK.md
    writeTaskMd(join(playbookDir, "tasks", "task-a"), `---
id: task-a
depends_on: []
---
# Task A v2`);

    const hash2 = hashUnifiedPlaybook(playbookDir, inventoryDir);
    expect(hash1).not.toBe(hash2);
  });

  it("hashes template TASK.md + PARAMS.yml for spawned tasks", () => {
    writeTaskMd(join(playbookDir, "templates", "screen-tpl"), `---
id: screen-tpl
vars:
  - screenId
  - route
depends_on: []
---
# Screen template
Build screen {{screenId}}.`);

    writeFileSync(
      join(playbookDir, "templates", "screen-tpl", "PARAMS.yml"),
      "screenId: landing\nroute: /\n",
      "utf8"
    );

    writeFileSync(
      join(inventoryDir, "tasks.jsonl"),
      JSON.stringify({
        kind: "playbook", schemaVersion: 1, name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z", updatedAt: "2026-05-21T00:00:00.000Z",
      }) + "\n" +
      JSON.stringify({
        kind: "task", id: "screen-1",
        taskRef: { kind: "template", name: "screen-tpl" },
        params: { screenId: "landing", route: "/" },
        depends_on: [], status: "todo", source: "spawned",
        createdAt: "2026-05-21T00:00:00.000Z", updatedAt: "2026-05-21T00:00:00.000Z",
      }) + "\n",
      "utf8"
    );

    const hash = hashUnifiedPlaybook(playbookDir, inventoryDir);
    expect(hash).toMatch(/^sha256:/);
  });

  it("returns stable hash when no tasks.jsonl exists", () => {
    const hash = hashUnifiedPlaybook(playbookDir, inventoryDir);
    expect(hash).toMatch(/^sha256:/);
  });
});
