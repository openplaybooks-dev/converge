/**
 * RFC 0024 — Ingest orchestrator tests.
 *
 * `ingestSpawnDir({ spawnRoot, workspace, playbookDir, playbook })` is the
 * preview→apply pipeline:
 *
 *   1. Load templates from playbookDir/templates/.
 *   2. Discover invocations from spawnRoot.
 *   3. Expand each invocation. Per-file errors accumulate.
 *   4. Detect stray manifests / stray TASK.md (anti-goals).
 *   5. Write EXPANDED.md beside each ok child's spawn.yml.
 *   6. Write STATUS.md at the spawn root.
 *   7. Write per-child EVIDENCE.json beside failing children.
 *   8. If preview clean, hand a synthetic manifest to applyManifest. If
 *      preview dirty, return without touching the journal.
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
import { ingestSpawnDir } from "../../src/task/spawn/ingest.ts";

function writePlaybookTemplate(
  workspace: string,
  playbook: string,
  name: string,
  files: Record<string, string>,
): void {
  const dir = join(
    workspace,
    ".converge",
    "playbooks",
    playbook,
    "templates",
    name,
  );
  mkdirSync(dir, { recursive: true });
  for (const [filename, content] of Object.entries(files)) {
    writeFileSync(join(dir, filename), content, "utf-8");
  }
}

function writeSpawn(spawnRoot: string, id: string, content: string): void {
  const dir = join(spawnRoot, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "spawn.yml"), content, "utf-8");
}

describe("ingestSpawnDir", () => {
  let workspace: string;
  let spawnRoot: string;
  const playbook = "pb1";
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-ingest-"));
    spawnRoot = join(
      workspace,
      ".converge",
      "journal",
      playbook,
      "tasks",
      "parent-task",
      "spawn",
    );
    mkdirSync(spawnRoot, { recursive: true });
    process.env.CONVERGE_PLAYBOOK = playbook;
    process.env.CONVERGE_WORKSPACE = workspace;
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

  function playbookDir(): string {
    return join(workspace, ".converge", "playbooks", playbook);
  }

  it("applies a clean preview into the ledger", async () => {
    writePlaybookTemplate(workspace, playbook, "asset-spec", {
      "TASK.md": "---\nid: x\n---\n# {{assetName}}\n",
      "PARAMS.yml": "params:\n  assetName: { type: string, required: true }\n",
    });
    writeSpawn(spawnRoot, "hero-spec", "template: asset-spec\nparams:\n  assetName: Hero\n");

    const report = await ingestSpawnDir({
      spawnRoot,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });

    expect(report.previewed).toBe(1);
    expect(report.rejected).toBe(0);
    expect(report.applied).toBe(1);

    const status = readFileSync(join(spawnRoot, "STATUS.md"), "utf-8");
    expect(status).toContain("- [x] hero-spec");
    expect(status).toContain("apply ok");

    // EXPANDED.md sibling
    const expanded = readFileSync(
      join(spawnRoot, "hero-spec", "EXPANDED.md"),
      "utf-8",
    );
    expect(expanded).toContain("# Hero");

    // Ledger row written by applyManifest.
    const tasksJsonl = join(
      workspace,
      ".converge",
      "inventory",
      playbook,
      "tasks.jsonl",
    );
    expect(existsSync(tasksJsonl)).toBe(true);
    expect(readFileSync(tasksJsonl, "utf-8")).toContain("hero-spec");
  });

  it("rejects on bad preview: no journal mutation, STATUS.md shows fix", async () => {
    writePlaybookTemplate(workspace, playbook, "asset-spec", {
      "TASK.md": "---\nid: x\n---\n# {{assetName}}\n",
      "PARAMS.yml": "params:\n  assetName: { type: string, required: true }\n",
    });
    // good
    writeSpawn(spawnRoot, "hero-spec", "template: asset-spec\nparams:\n  assetName: Hero\n");
    // typo'd template name
    writeSpawn(spawnRoot, "villain-spec", "template: asset-spc\nparams:\n  assetName: V\n");

    const report = await ingestSpawnDir({
      spawnRoot,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });

    expect(report.previewed).toBe(1);
    expect(report.rejected).toBe(1);
    expect(report.applied).toBe(0);

    const tasksJsonl = join(
      workspace,
      ".converge",
      "inventory",
      playbook,
      "tasks.jsonl",
    );
    // Preview-then-apply atomicity: no rows applied when any fails.
    if (existsSync(tasksJsonl)) {
      const body = readFileSync(tasksJsonl, "utf-8");
      expect(body).not.toContain("hero-spec");
    }

    const status = readFileSync(join(spawnRoot, "STATUS.md"), "utf-8");
    expect(status).toContain("- [x] hero-spec");
    expect(status).toContain("- [ ] villain-spec");
    expect(status).toContain("did you mean");
  });

  it("emits SPAWN_TASKMD_AUTHORED_BY_BODY when a body writes TASK.md", async () => {
    writePlaybookTemplate(workspace, playbook, "t", {
      "TASK.md": "---\nid: x\n---\n",
    });
    // child has both spawn.yml AND a hand-authored TASK.md — anti-goal.
    writeSpawn(spawnRoot, "hero", "template: t\n");
    writeFileSync(
      join(spawnRoot, "hero", "TASK.md"),
      "---\nid: hero\n---\n# bespoke\n",
      "utf-8",
    );

    const report = await ingestSpawnDir({
      spawnRoot,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });

    expect(report.applied).toBe(0);
    expect(report.rejected).toBeGreaterThan(0);
    const status = readFileSync(join(spawnRoot, "STATUS.md"), "utf-8");
    expect(status).toContain("SPAWN_TASKMD_AUTHORED_BY_BODY");
  });

  it("emits SPAWN_MANIFEST_AUTHORED_BY_BODY when a body writes spawn.plan.jsonl", async () => {
    writePlaybookTemplate(workspace, playbook, "t", {
      "TASK.md": "---\nid: x\n---\n",
    });
    writeSpawn(spawnRoot, "hero", "template: t\n");
    writeFileSync(
      join(spawnRoot, "spawn.plan.jsonl"),
      JSON.stringify({ id: "hero", template: "t" }) + "\n",
      "utf-8",
    );

    const report = await ingestSpawnDir({
      spawnRoot,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });

    expect(report.applied).toBe(0);
    expect(report.rejected).toBeGreaterThan(0);
    const status = readFileSync(join(spawnRoot, "STATUS.md"), "utf-8");
    expect(status).toContain("SPAWN_MANIFEST_AUTHORED_BY_BODY");
  });

  it("writes EVIDENCE.json beside each failing child", async () => {
    writePlaybookTemplate(workspace, playbook, "t", {
      "TASK.md": "---\nid: x\n---\n",
    });
    writeSpawn(spawnRoot, "missing", "template: nope\n");

    await ingestSpawnDir({
      spawnRoot,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });

    const evidencePath = join(spawnRoot, "missing", "EVIDENCE.json");
    expect(existsSync(evidencePath)).toBe(true);
    const ev = JSON.parse(readFileSync(evidencePath, "utf-8"));
    expect(ev.errorCode).toBe("template-not-found");
  });

  it("is idempotent: re-running with identical spawn.yml is a no-op", async () => {
    writePlaybookTemplate(workspace, playbook, "t", {
      "TASK.md": "---\nid: x\n---\n# {{title}}\n",
      "PARAMS.yml": "params:\n  title: { type: string, required: true }\n",
    });
    writeSpawn(spawnRoot, "a", "template: t\nparams:\n  title: A\n");

    const r1 = await ingestSpawnDir({
      spawnRoot,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });
    expect(r1.applied).toBe(1);

    const r2 = await ingestSpawnDir({
      spawnRoot,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });
    // Second run still previews and applies, but no new ledger rows.
    expect(r2.applied).toBe(1);
    expect(r2.idempotent).toBe(1);
  });
});
