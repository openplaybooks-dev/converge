import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildDagFromUnifiedInventory } from "../packages/core/src/config/declarative-loader-unified.ts";

describe("declarative-loader-unified (RFC 0031)", () => {
  let tmpDir: string;
  let inventoryDir: string;
  let playbookDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "converge-unified-test-"));
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

  function writeTemplateTaskMd(name: string, content: string) {
    const dir = join(playbookDir, "templates", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "TASK.md"), content, "utf8");
  }

  function writeStaticTaskMd(id: string, content: string) {
    const dir = join(playbookDir, "tasks", id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "TASK.md"), content, "utf8");
  }

  function writeTasksJsonl(lines: string[]) {
    writeFileSync(join(inventoryDir, "tasks.jsonl"), lines.join("\n") + "\n", "utf8");
  }

  it("builds DAG from unified tasks.jsonl with static tasks", () => {
    writeStaticTaskMd("00-requirements", `---
id: 00-requirements
depends_on: []
---
# Requirements Task
Gather requirements.`);

    writeStaticTaskMd("01-design", `---
id: 01-design
depends_on: ["00-requirements"]
---
# Design Task
Create design.`);

    writeTasksJsonl([
      JSON.stringify({
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
      JSON.stringify({
        kind: "task",
        id: "00-requirements",
        taskRef: { kind: "static", dir: join(playbookDir, "tasks/00-requirements") },
        depends_on: [],
        status: "todo",
        source: "static",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
      JSON.stringify({
        kind: "task",
        id: "01-design",
        taskRef: { kind: "static", dir: join(playbookDir, "tasks/01-design") },
        depends_on: ["00-requirements"],
        status: "todo",
        source: "static",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
    ]);

    const result = buildDagFromUnifiedInventory(playbookDir, inventoryDir);
    expect(result.errors).toHaveLength(0);
    expect(result.dag.nodes.size).toBe(2);
    expect(result.dag.nodes.has("00-requirements")).toBe(true);
    expect(result.dag.nodes.has("01-design")).toBe(true);
    expect(result.dag.nodes.get("01-design")!.depends_on).toContain("00-requirements");
  });

  it("builds DAG from unified tasks.jsonl with spawned/template tasks", () => {
    writeStaticTaskMd("07-screens", `---
id: 07-screens
depends_on: []
---
# Screens Task
Spawn screen tasks.`);

    writeTemplateTaskMd("screen-03-react", `---
id: screen-03-react
vars:
  - screenId
  - route
  - title
depends_on: []
---
# Screen React Task
Build screen {{screenId}} with route {{route}}.`);

    writeTasksJsonl([
      JSON.stringify({
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
      JSON.stringify({
        kind: "task",
        id: "07-screens",
        taskRef: { kind: "static", dir: join(playbookDir, "tasks/07-screens") },
        depends_on: [],
        status: "todo",
        source: "static",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
      JSON.stringify({
        kind: "task",
        id: "screen-landing-03-react",
        taskRef: { kind: "template", name: "screen-03-react" },
        params: { screenId: "landing", route: "/", title: "Landing" },
        depends_on: ["07-screens"],
        parent: "07-screens",
        status: "todo",
        source: "spawned",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
    ]);

    const result = buildDagFromUnifiedInventory(playbookDir, inventoryDir);
    expect(result.errors).toHaveLength(0);
    expect(result.dag.nodes.size).toBe(2);
    expect(result.dag.nodes.has("07-screens")).toBe(true);
    expect(result.dag.nodes.has("screen-landing-03-react")).toBe(true);

    const screenNode = result.dag.nodes.get("screen-landing-03-react")!;
    expect(screenNode.depends_on).toContain("07-screens");
    expect(screenNode.taskDef.vars).toBeDefined();
    expect(screenNode.taskDef.id).toBe("screen-landing-03-react");
  });

  it("parses review frontmatter on unified tasks", () => {
    writeStaticTaskMd("00-review-handoff", `---
id: 00-review-handoff
handoff:
  artifact: docs/review.html
  format: html
  generate: Review the handoff page before publishing.
  skill: html-review-artifact
---
# Review Handoff Task
Prepare the handoff artifact.`);

    writeTasksJsonl([
      JSON.stringify({
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
      JSON.stringify({
        kind: "task",
        id: "00-review-handoff",
        taskRef: { kind: "static", dir: join(playbookDir, "tasks/00-review-handoff") },
        depends_on: [],
        status: "todo",
        source: "static",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
    ]);

    const result = buildDagFromUnifiedInventory(playbookDir, inventoryDir);
    expect(result.errors).toHaveLength(0);

    const node = result.dag.nodes.get("00-review-handoff");
    expect(node).toBeDefined();
    expect(node!.taskDef.handoff).toEqual({
      artifact: "docs/review.html",
      format: "html",
      generate: "Review the handoff page before publishing.",
      skill: "html-review-artifact",
    });
  });

  it("returns empty DAG when tasks.jsonl has only header", () => {
    writeTasksJsonl([
      JSON.stringify({
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
    ]);

    const result = buildDagFromUnifiedInventory(playbookDir, inventoryDir);
    expect(result.errors).toHaveLength(0);
    expect(result.dag.nodes.size).toBe(0);
  });

  it("detects cycles in unified tasks.jsonl", () => {
    writeStaticTaskMd("task-a", `---
id: task-a
depends_on: ["task-b"]
---
# Task A`);

    writeStaticTaskMd("task-b", `---
id: task-b
depends_on: ["task-a"]
---
# Task B`);

    writeTasksJsonl([
      JSON.stringify({
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
      JSON.stringify({
        kind: "task",
        id: "task-a",
        taskRef: { kind: "static", dir: join(playbookDir, "tasks/task-a") },
        depends_on: ["task-b"],
        status: "todo",
        source: "static",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
      JSON.stringify({
        kind: "task",
        id: "task-b",
        taskRef: { kind: "static", dir: join(playbookDir, "tasks/task-b") },
        depends_on: ["task-a"],
        status: "todo",
        source: "static",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
    ]);

    const result = buildDagFromUnifiedInventory(playbookDir, inventoryDir);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.type === "cycle")).toBe(true);
  });

  it("accepts unified inventory even when playbook.yml still exists", () => {
    // Write playbook.yml alongside unified tasks.jsonl
    writeFileSync(join(playbookDir, "playbook.yml"), `name: test-playbook\ntasks:\n  - id: task-a\n`, "utf8");

    writeTasksJsonl([
      JSON.stringify({
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
    ]);

    const result = buildDagFromUnifiedInventory(playbookDir, inventoryDir);
    expect(result.errors.some(e => e.type === "dual_format")).toBe(false);
  });

  it("parses stub: block from TASK.md frontmatter", () => {
    writeStaticTaskMd("stub-task", `---
id: stub-task
depends_on: []
stub:
  cmd: echo "# Fake Report" > report.md
  cleanup: rm -f report.md
---
# Stub Task
Generate a fake report.`);

    writeTasksJsonl([
      JSON.stringify({
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
      JSON.stringify({
        kind: "task",
        id: "stub-task",
        taskRef: { kind: "static", dir: join(playbookDir, "tasks/stub-task") },
        depends_on: [],
        status: "todo",
        source: "static",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
    ]);

    const result = buildDagFromUnifiedInventory(playbookDir, inventoryDir);
    expect(result.errors).toHaveLength(0);

    const node = result.dag.nodes.get("stub-task");
    expect(node).toBeDefined();
    expect(node!.taskDef.stub).toEqual({
      cmd: 'echo "# Fake Report" > report.md',
      cleanup: "rm -f report.md",
    });
  });

  it("parses stub: block with only cmd (no cleanup)", () => {
    writeStaticTaskMd("stub-simple", `---
id: stub-simple
depends_on: []
stub:
  cmd: echo "hello" > output.txt
---
# Stub Simple Task`);

    writeTasksJsonl([
      JSON.stringify({
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
      JSON.stringify({
        kind: "task",
        id: "stub-simple",
        taskRef: { kind: "static", dir: join(playbookDir, "tasks/stub-simple") },
        depends_on: [],
        status: "todo",
        source: "static",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
    ]);

    const result = buildDagFromUnifiedInventory(playbookDir, inventoryDir);
    expect(result.errors).toHaveLength(0);

    const node = result.dag.nodes.get("stub-simple");
    expect(node).toBeDefined();
    expect(node!.taskDef.stub).toEqual({
      cmd: 'echo "hello" > output.txt',
    });
    expect(node!.taskDef.stub?.cleanup).toBeUndefined();
  });

  it("task without stub: block has undefined stub", () => {
    writeStaticTaskMd("normal-task", `---
id: normal-task
depends_on: []
---
# Normal Task
Just a regular task.`);

    writeTasksJsonl([
      JSON.stringify({
        kind: "playbook",
        schemaVersion: 1,
        name: "test-playbook",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
      JSON.stringify({
        kind: "task",
        id: "normal-task",
        taskRef: { kind: "static", dir: join(playbookDir, "tasks/normal-task") },
        depends_on: [],
        status: "todo",
        source: "static",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
    ]);

    const result = buildDagFromUnifiedInventory(playbookDir, inventoryDir);
    expect(result.errors).toHaveLength(0);

    const node = result.dag.nodes.get("normal-task");
    expect(node).toBeDefined();
    expect(node!.taskDef.dry).toBeUndefined();
  });
});
