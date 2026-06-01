/**
 * RFC 0022 — post-body mode validator tests.
 *
 * The validator runs immediately after the task body returns and before
 * the task's declared `checks:` run. A violation short-circuits the check
 * phase and writes a structured error the repair loop can address.
 *
 * The validator is **pure I/O against the exec dir**. It does not run
 * the body, it does not run apply, it does not consult tasks.jsonl
 * (caller passes a `childCount` accessor for the task-has-children
 * check). This keeps the validator unit-testable and the executor
 * integration thin.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validatePostBody } from "../../src/task/mode/validator.ts";

function makeExecDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "converge-mode-"));
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("validatePostBody — task", () => {
  let execDir: string;
  beforeEach(() => {
    execDir = makeExecDir();
  });
  afterEach(() => {
    rmSync(execDir, { recursive: true, force: true });
  });

  it("ok when no manifest, no children", () => {
    const r = validatePostBody(
      {
        taskId: "t",
        mode: "task",
        outputs: ["x.txt"],
      },
      { execDir, childCount: 0 },
    );
    expect(r.ok).toBe(true);
  });

  it("task-spawned when manifest exists", () => {
    writeFileSync(
      join(execDir, "spawn.plan.jsonl"),
      `{"id":"c","template":"t"}\n`,
    );
    const r = validatePostBody(
      { taskId: "t", mode: "task", outputs: ["x.txt"] },
      { execDir, childCount: 0 },
    );
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("task-spawned");
    expect(r.fixHint).toMatch(/spawner/);
  });

  it("task-has-children when childCount > 0", () => {
    const r = validatePostBody(
      { taskId: "t", mode: "task", outputs: ["x.txt"] },
      { execDir, childCount: 3 },
    );
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("task-has-children");
  });
});

describe("validatePostBody — spawner", () => {
  let execDir: string;
  beforeEach(() => {
    execDir = makeExecDir();
  });
  afterEach(() => {
    rmSync(execDir, { recursive: true, force: true });
  });

  it("spawner-missing-manifest when body wrote nothing", () => {
    const r = validatePostBody(
      {
        taskId: "t",
        mode: "spawner",
        spawn: { min_children: 1, max_children: 50, apply: "auto" },
      },
      { execDir, childCount: 0 },
    );
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("spawner-missing-manifest");
    // Hint references `converge spawn` and tasks.jsonl.
    expect(r.fixHint).toMatch(/converge spawn/);
    expect(r.fixHint).toMatch(/tasks\.jsonl/);
  });

  it("passes when the body produced spawn dir children (no legacy manifest)", () => {
    mkdirSync(join(execDir, "spawn", "child-a"), { recursive: true });
    const r = validatePostBody(
      {
        taskId: "t",
        mode: "spawner",
        spawn: { min_children: 1, max_children: 50, apply: "auto" },
      },
      { execDir, childCount: 0 },
    );
    expect(r.ok).toBe(true);
  });

  it("passes when the body imperatively spawned via the ledger (childCount > 0)", () => {
    // No manifest, no spawn dir children — but children were registered.
    const r = validatePostBody(
      {
        taskId: "t",
        mode: "spawner",
        spawn: { min_children: 1, max_children: 50, apply: "auto" },
      },
      { execDir, childCount: 1 },
    );
    expect(r.ok).toBe(true);
  });

  it("spawner-empty-manifest when manifest has 0 rows and min_children >= 1", () => {
    writeFileSync(join(execDir, "spawn.plan.jsonl"), "");
    const r = validatePostBody(
      {
        taskId: "t",
        mode: "spawner",
        spawn: { min_children: 1, max_children: 50, apply: "auto" },
      },
      { execDir, childCount: 0 },
    );
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("spawner-empty-manifest");
  });

  it("spawner-empty-manifest tolerates comments and blank lines", () => {
    writeFileSync(
      join(execDir, "spawn.plan.jsonl"),
      "// only comments\n\n  \n",
    );
    const r = validatePostBody(
      {
        taskId: "t",
        mode: "spawner",
        spawn: { min_children: 1, max_children: 50, apply: "auto" },
      },
      { execDir, childCount: 0 },
    );
    expect(r.errorCode).toBe("spawner-empty-manifest");
  });

  it("spawner-row-count when row count < min_children", () => {
    writeFileSync(
      join(execDir, "spawn.plan.jsonl"),
      [
        `{"id":"a","template":"t"}`,
        `{"id":"b","template":"t"}`,
      ].join("\n"),
    );
    const r = validatePostBody(
      {
        taskId: "t",
        mode: "spawner",
        spawn: { min_children: 5, max_children: 50, apply: "auto" },
      },
      { execDir, childCount: 0 },
    );
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("spawner-row-count");
    expect(r.fixHint).toMatch(/min_children/);
  });

  it("spawner-row-count when row count > max_children", () => {
    const rows = Array.from({ length: 4 }, (_, i) =>
      JSON.stringify({ id: `r${i}`, template: "t" }),
    );
    writeFileSync(join(execDir, "spawn.plan.jsonl"), rows.join("\n"));
    const r = validatePostBody(
      {
        taskId: "t",
        mode: "spawner",
        spawn: { min_children: 0, max_children: 3, apply: "auto" },
      },
      { execDir, childCount: 0 },
    );
    expect(r.errorCode).toBe("spawner-row-count");
    expect(r.fixHint).toMatch(/max_children/);
  });

  it("spawner-apply-failed when any result row has ok:false", () => {
    writeFileSync(
      join(execDir, "spawn.plan.jsonl"),
      `{"id":"a","template":"t"}\n{"id":"b","template":"t"}\n`,
    );
    writeFileSync(
      join(execDir, "spawn.plan.result.jsonl"),
      [
        `{"id":"a","ok":true,"template":"t","taskMdPath":"x","appliedAt":"now"}`,
        `{"id":"b","ok":false,"template":"t","error":"missing var","errorCode":"missing-vars"}`,
      ].join("\n"),
    );
    const r = validatePostBody(
      {
        taskId: "t",
        mode: "spawner",
        spawn: { min_children: 0, max_children: 50, apply: "auto" },
      },
      { execDir, childCount: 2 },
    );
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("spawner-apply-failed");
  });

  it("ok when manifest in range and all results ok", () => {
    writeFileSync(
      join(execDir, "spawn.plan.jsonl"),
      `{"id":"a","template":"t"}\n{"id":"b","template":"t"}\n`,
    );
    writeFileSync(
      join(execDir, "spawn.plan.result.jsonl"),
      [
        `{"id":"a","ok":true,"template":"t","taskMdPath":"x","appliedAt":"now"}`,
        `{"id":"b","ok":true,"template":"t","taskMdPath":"y","appliedAt":"now"}`,
      ].join("\n"),
    );
    const r = validatePostBody(
      {
        taskId: "t",
        mode: "spawner",
        spawn: { min_children: 1, max_children: 5, apply: "auto" },
      },
      { execDir, childCount: 2 },
    );
    expect(r.ok).toBe(true);
  });

  it("apply:manual skips result-file check (body owns apply)", () => {
    writeFileSync(
      join(execDir, "spawn.plan.jsonl"),
      `{"id":"a","template":"t"}\n`,
    );
    // No result file. Under apply:auto this would race; under manual
    // the validator trusts the body and only validates the manifest shape.
    const r = validatePostBody(
      {
        taskId: "t",
        mode: "spawner",
        spawn: { min_children: 0, max_children: 5, apply: "manual" },
      },
      { execDir, childCount: 1 },
    );
    expect(r.ok).toBe(true);
  });
});

describe("validatePostBody — gateway", () => {
  let execDir: string;
  beforeEach(() => {
    execDir = makeExecDir();
  });
  afterEach(() => {
    rmSync(execDir, { recursive: true, force: true });
  });

  it("ok when nothing written", () => {
    const r = validatePostBody(
      { taskId: "t", mode: "gateway" },
      { execDir, childCount: 0 },
    );
    expect(r.ok).toBe(true);
  });

  it("gateway-spawned when manifest exists", () => {
    writeFileSync(
      join(execDir, "spawn.plan.jsonl"),
      `{"id":"c","template":"t"}\n`,
    );
    const r = validatePostBody(
      { taskId: "t", mode: "gateway" },
      { execDir, childCount: 0 },
    );
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("gateway-spawned");
  });
});

describe("validatePostBody — converger", () => {
  let execDir: string;
  beforeEach(() => {
    execDir = makeExecDir();
  });
  afterEach(() => {
    rmSync(execDir, { recursive: true, force: true });
  });

  it("ok per-wave when manifest is well-formed (apply-result delegation)", () => {
    writeFileSync(
      join(execDir, "spawn.plan.jsonl"),
      `{"id":"a","template":"t"}\n`,
    );
    writeFileSync(
      join(execDir, "spawn.plan.result.jsonl"),
      `{"id":"a","ok":true,"template":"t","taskMdPath":"x","appliedAt":"now"}\n`,
    );
    const r = validatePostBody(
      {
        taskId: "t",
        mode: "converger",
        converge: {
          max_waves: 10,
          halt_when: [{ id: "h", cmd: "true" }],
        },
      },
      { execDir, childCount: 1 },
    );
    expect(r.ok).toBe(true);
  });

  it("converger with no manifest is fine (waves can be no-op)", () => {
    const r = validatePostBody(
      {
        taskId: "t",
        mode: "converger",
        converge: {
          max_waves: 10,
          wave_check: { id: "w", cmd: "scripts/decide.sh" },
        },
      },
      { execDir, childCount: 0 },
    );
    expect(r.ok).toBe(true);
  });

  it("converger surfaces apply failure when result has ok:false", () => {
    writeFileSync(
      join(execDir, "spawn.plan.jsonl"),
      `{"id":"a","template":"t"}\n`,
    );
    writeFileSync(
      join(execDir, "spawn.plan.result.jsonl"),
      `{"id":"a","ok":false,"template":"t","error":"x","errorCode":"missing-vars"}\n`,
    );
    const r = validatePostBody(
      {
        taskId: "t",
        mode: "converger",
        converge: { max_waves: 5, halt_when: [{ id: "h", cmd: "true" }] },
      },
      { execDir, childCount: 1 },
    );
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("spawner-apply-failed");
  });
});
