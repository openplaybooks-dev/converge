/**
 * RFC 0047 regression: the DAG node's taskDef must carry the `handoff:` block,
 * and it must survive a wiped/empty inventory.
 *
 * Originally the legacy folder loader dropped `handoff` while the unified
 * loader kept it; the run path used the legacy one whenever `tasks.jsonl` was
 * absent (e.g. after a clean), so the review artifact was never enforced — the
 * hello-world-review "no preview" symptom. The legacy loader is now deleted;
 * `buildDagFromInventory` bootstraps `tasks.jsonl` from the `tasks/` folder and
 * builds the DAG through the single unified path. This guards that handoff
 * survives that path, including from a cold start with no inventory.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildDagFromInventory } from "../packages/core/src/run/playbook-compile.ts";

const TASK_MD = `---
id: 01-greet
title: Greeting card for human review
outputs:
  - output/greeting.json
handoff:
  artifact: output/greeting.preview.html
  format: html
  generate: |
    Generate output/greeting.preview.html for a human reviewer.
---

Write \`output/greeting.json\`.
`;

describe("handoff survives the unified folder loader from a cold inventory (RFC 0047)", () => {
  let tmp: string;
  let playbookDir: string;
  let inventoryDir: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "loader-handoff-"));
    playbookDir = join(tmp, "playbooks", "default");
    inventoryDir = join(tmp, "inventory", "default");
    const taskDir = join(playbookDir, "tasks", "01-greet");
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(join(playbookDir, "playbook.yml"), "name: default\n", "utf8");
    writeFileSync(join(taskDir, "TASK.md"), TASK_MD, "utf8");
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("bootstraps tasks.jsonl and the node carries handoff.artifact", () => {
    // No inventory yet — the cold-start case that used to fall to the legacy loader.
    expect(existsSync(join(inventoryDir, "tasks.jsonl"))).toBe(false);

    const { dag, errors } = buildDagFromInventory(playbookDir, inventoryDir, "default");

    expect(errors).toHaveLength(0);
    expect(existsSync(join(inventoryDir, "tasks.jsonl"))).toBe(true);

    const node = dag.nodes.get("01-greet");
    expect(node).toBeDefined();
    expect(node!.taskDef.handoff?.artifact).toBe("output/greeting.preview.html");
  });
});
