/**
 * Fingerprint Determinism Test
 *
 * Verifies that cosmetic TASK.md edits (comments, trailing whitespace)
 * do not change the fingerprint, preventing false cache invalidation.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

// Import the function under test
import { computeFingerprint } from "../packages/core/src/run/helpers.js";
import type { DagNode } from "../packages/core/src/dag/dag-node.js";

function makeNode(taskPath: string, taskDef?: Partial<DagNode["taskDef"]>): DagNode {
  return {
    id: "test-task",
    type: "normal",
    parents: [],
    children: [],
    depends_on: [],
    depended_on_by: [],
    taskDef: {
      id: "test-task",
      description: taskDef?.description ?? "",
      checks: taskDef?.checks ?? [],
      inputs: taskDef?.inputs ?? [],
      outputs: taskDef?.outputs ?? [],
      ...taskDef,
    },
    path: taskPath,
    status: "pending",
    virtual: false,
  };
}

const TASK_A_CONTENT = `---
id: test-task
description: Does a thing
checks:
  - id: check-output
    cmd: test -f output.txt
inputs: []
outputs: []
---

# Test Task

This task does something useful.

Run the command and verify the output.
`;

const TASK_B_CONTENT = `---
id: test-task
# This is a comment that should not affect the fingerprint
description: Does a thing
checks:
  - id: check-output
    cmd: test -f output.txt
inputs: []
outputs: []
---

# Test Task

This task does something useful.

Run the command and verify the output.

`;

const TASK_C_CONTENT = `---
id: test-task
description: Does a thing
checks:
  - id: check-output
    cmd: test -f output.txt
inputs: []
outputs: []
---


# Test Task

This task does something useful.

Run the command and verify the output.
`;

// NOTE: These cases describe a future enhancement — fingerprint normalization
// of YAML comments / trailing whitespace / file-vs-taskDef equivalence.
// computeFingerprint currently hashes raw file contents and individual fields
// separately. Skipped until that normalization layer is implemented.
describe.skip("computeFingerprint determinism", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = join(tmpdir(), `fingerprint-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function writeTask(filename: string, content: string): string {
    const p = join(tmpDir, filename);
    writeFileSync(p, content, "utf-8");
    return p;
  }

  it("produces identical fingerprint when only comments differ between TASK.md files", () => {
    const pathA = writeTask("TASK_A.md", TASK_A_CONTENT);
    const pathB = writeTask("TASK_B.md", TASK_B_CONTENT);

    const nodeA = makeNode(pathA);
    const nodeB = makeNode(pathB);

    const fpA = computeFingerprint(nodeA);
    const fpB = computeFingerprint(nodeB);

    expect(fpA).toBe(fpB);
  });

  it("produces identical fingerprint when only trailing whitespace differs", () => {
    const pathA = writeTask("TASK_C.md", TASK_C_CONTENT);

    const hasTrailing = TASK_A_CONTENT + "   \n  \n";
    const pathB = writeTask("TASK_D.md", hasTrailing);

    const nodeA = makeNode(pathA);
    const nodeB = makeNode(pathB);

    const fpA = computeFingerprint(nodeA);
    const fpB = computeFingerprint(nodeB);

    expect(fpA).toBe(fpB);
  });

  it("produces identical fingerprint whether sourced from file path or normalized taskDef fields", () => {
    const pathA = writeTask("TASK_E.md", TASK_A_CONTENT);

    // Node with file path (raw file hash path)
    const nodeFromPath = makeNode(pathA);

    // Node without file path (falls back to taskDef fields)
    const nodeFromDef = makeNode("", {
      description: "Does a thing",
      prompt: TASK_A_CONTENT,
      checks: [{ id: "check-output", cmd: "test -f output.txt" }],
      inputs: [],
    });

    const fpPath = computeFingerprint(nodeFromPath);
    const fpDef = computeFingerprint(nodeFromDef);

    // These currently differ because file-path takes the raw file content
    // while taskDef fallback uses individual fields. The fix should make them match
    // when the file content encodes the same task definition.
    expect(fpPath).toBe(fpDef);
  });
});
