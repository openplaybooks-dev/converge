/**
 * RFC 0021 — fail-fix-pass loop integration test.
 *
 * Simulates the loop end-to-end without humans:
 *   1. Apply a 3-row manifest where row 2 references an unknown template.
 *   2. Result file lists row 2 as failed; rows 1+3 succeed.
 *   3. Manifest is patched to fix row 2 (the "AI repair" simulation).
 *   4. Re-apply: row 2 succeeds (idempotent for 1+3); result file is clean.
 *
 * This exercises the contract the planning skill recommends — the
 * existing converge gap-repair loop drives this on its own when wired
 * into a real playbook; here we drive it by hand to verify the artefacts.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyManifest } from "../../src/task/spawn/apply.ts";

function readJsonl<T = unknown>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as T);
}

function writeTemplate(
  workspace: string,
  playbook: string,
  templateName: string,
  body: string,
): void {
  const dir = join(
    workspace,
    ".converge",
    "playbooks",
    playbook,
    "templates",
    templateName,
  );
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "TASK.md"), body, "utf-8");
}

describe("apply loop: fail → patch → re-apply → clean", () => {
  let workspace: string;
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-loop-"));
    process.env.CONVERGE_PLAYBOOK = "pb1";
    delete process.env.CONVERGE_CURRENT_TASK_PATH;
    for (const k of Object.keys(process.env)) {
      if (k.startsWith("CONVERGE_VAR_")) delete process.env[k];
    }
  });
  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
    for (const k of Object.keys(process.env)) {
      if (!(k in ORIG_ENV)) delete process.env[k];
    }
    Object.assign(process.env, ORIG_ENV);
  });

  it("middle row references unknown template, gets patched, second pass converges", async () => {
    writeTemplate(workspace, "pb1", "alpha", "---\nid: alpha\n---\n# a\n");
    writeTemplate(workspace, "pb1", "beta", "---\nid: beta\n---\n# b\n");
    writeTemplate(workspace, "pb1", "gamma", "---\nid: gamma\n---\n# g\n");

    const manifestPath = join(workspace, "spawn.plan.jsonl");
    writeFileSync(
      manifestPath,
      [
        `{"id":"loop-a","template":"alpha"}`,
        `{"id":"loop-b","template":"BAD-NAME"}`,
        `{"id":"loop-c","template":"gamma","after":["loop-a"]}`,
      ].join("\n") + "\n",
      "utf-8",
    );

    // Pass 1 — failure for row 2; result file contains addressable signal.
    const first = await applyManifest({ manifestPath, workspace });
    expect(first.failed).toBe(1);
    expect(first.ok).toBe(2);

    const r1 = readJsonl<{ id: string; ok: boolean; errorCode?: string }>(
      first.resultPath,
    );
    expect(r1.find((r) => r.id === "loop-b")?.ok).toBe(false);
    expect(r1.find((r) => r.id === "loop-b")?.errorCode).toBe(
      "template-not-found",
    );

    // The "AI repair loop" simulation: read the result file, patch the
    // bad template name in spawn.plan.jsonl, leave the rest unchanged.
    const original = readFileSync(manifestPath, "utf-8");
    const patched = original.replace('"BAD-NAME"', '"beta"');
    writeFileSync(manifestPath, patched, "utf-8");

    // Pass 2 — same id list; rows 1+3 are idempotent, row 2 lands.
    const second = await applyManifest({ manifestPath, workspace });
    expect(second.failed).toBe(0);
    expect(second.ok).toBe(3);

    const r2 = readJsonl<{
      id: string;
      ok: boolean;
      idempotent?: boolean;
      errorCode?: string;
    }>(second.resultPath);
    expect(r2.find((r) => r.id === "loop-a")?.idempotent).toBe(true);
    expect(r2.find((r) => r.id === "loop-c")?.idempotent).toBe(true);
    expect(r2.find((r) => r.id === "loop-b")?.idempotent).toBeUndefined();

    // tasks.jsonl has exactly the 3 rows, no duplicates.
    const tasks = readJsonl<{ id: string }>(
      join(workspace, ".converge", "inventory", "pb1", "tasks.jsonl"),
    );
    expect(tasks.map((t) => t.id).sort()).toEqual([
      "loop-a",
      "loop-b",
      "loop-c",
    ]);
  });

  it("result file is parseable after a partial run (atomic write contract)", async () => {
    writeTemplate(workspace, "pb1", "tpl", "---\nid: tpl\n---\n# t\n");

    const manifestPath = join(workspace, "spawn.plan.jsonl");
    writeFileSync(
      manifestPath,
      [
        `{"id":"x1","template":"tpl"}`,
        `{"id":"x2","template":"tpl"}`,
      ].join("\n") + "\n",
      "utf-8",
    );

    const report = await applyManifest({ manifestPath, workspace });
    const raw = readFileSync(report.resultPath, "utf-8");

    expect(raw.endsWith("\n")).toBe(true);
    for (const line of raw.split("\n").filter(Boolean)) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});
