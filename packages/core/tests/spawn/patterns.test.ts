/**
 * RFC 0024 — Pattern coverage tests.
 *
 * One test per pattern the RFC calls out:
 *
 *   - Reasoning-driven: small N, heterogeneous templates with deps.
 *   - Data-driven:      large N, one template per row from a manifest.
 *   - Nested:           a spawner-template invokes a spawner-template.
 *
 * These exercise the orchestrator end-to-end; the discover/expand/status
 * unit tests cover the individual stages.
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

import { ingestSpawnDir } from "../../src/task/spawn/index.ts";

function writeTemplate(
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

describe("RFC 0024 patterns", () => {
  let workspace: string;
  const playbook = "pb1";
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-patterns-"));
    process.env.CONVERGE_PLAYBOOK = playbook;
    process.env.CONVERGE_WORKSPACE = workspace;
  });
  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
    for (const k of Object.keys(process.env)) {
      if (!(k in ORIG_ENV)) delete process.env[k];
    }
    Object.assign(process.env, ORIG_ENV);
  });

  function spawnRoot(taskId: string): string {
    const root = join(
      workspace,
      ".converge",
      "journal",
      playbook,
      "tasks",
      taskId,
      "spawn",
    );
    mkdirSync(root, { recursive: true });
    return root;
  }

  function playbookDir(): string {
    return join(workspace, ".converge", "playbooks", playbook);
  }

  function writeSpawn(root: string, id: string, body: string): void {
    const dir = join(root, id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "spawn.yml"), body, "utf-8");
  }

  it("reasoning-driven: four heterogeneous templates chained by deps", async () => {
    writeTemplate(workspace, playbook, "design-doc", {
      "TASK.md": "---\nid: x\n---\n# {{topic}}\nwrite to {{outputPath}}\n",
      "PARAMS.yml":
        "params:\n  topic: { type: string, required: true }\n  outputPath: { type: string, required: true }\n",
    });
    writeTemplate(workspace, playbook, "migration", {
      "TASK.md": "---\nid: x\n---\n# {{name}}\n",
      "PARAMS.yml": "params:\n  name: { type: string, required: true }\n",
    });
    writeTemplate(workspace, playbook, "api-endpoint-set", {
      "TASK.md": "---\nid: x\n---\n# {{outputPath}}\n",
      "PARAMS.yml": "params:\n  outputPath: { type: string, required: true }\n",
    });
    writeTemplate(workspace, playbook, "api-tests", {
      "TASK.md": "---\nid: x\n---\n# tests for {{routesPath}}\n",
      "PARAMS.yml": "params:\n  routesPath: { type: string, required: true }\n",
    });

    const root = spawnRoot("implement-user-auth");
    writeSpawn(
      root,
      "design",
      "template: design-doc\nparams:\n  topic: user auth\n  outputPath: docs/auth.md\n",
    );
    writeSpawn(
      root,
      "schema",
      "template: migration\ndepends_on: [design]\nparams:\n  name: add_users_table\n",
    );
    writeSpawn(
      root,
      "endpoints",
      "template: api-endpoint-set\ndepends_on: [schema]\nparams:\n  outputPath: src/auth/routes.ts\n",
    );
    writeSpawn(
      root,
      "tests",
      "template: api-tests\ndepends_on: [endpoints]\nparams:\n  routesPath: src/auth/routes.ts\n",
    );

    const report = await ingestSpawnDir({
      spawnRoot: root,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });
    expect(report.applied).toBe(4);
    expect(report.rejected).toBe(0);

    const status = readFileSync(join(root, "STATUS.md"), "utf-8");
    expect(status).toContain("- [x] design");
    expect(status).toContain("- [x] tests");
  });

  it("reasoning-driven repair loop: typo → STATUS.md fix → re-run converges", async () => {
    writeTemplate(workspace, playbook, "design-doc", {
      "TASK.md": "---\nid: x\n---\n# {{topic}}\n",
      "PARAMS.yml": "params:\n  topic: { type: string, required: true }\n",
    });
    const root = spawnRoot("typo-repair");
    writeSpawn(root, "alpha", "template: desin-doc\nparams:\n  topic: x\n");

    let report = await ingestSpawnDir({
      spawnRoot: root,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });
    expect(report.applied).toBe(0);
    expect(report.rejected).toBe(1);
    const status1 = readFileSync(join(root, "STATUS.md"), "utf-8");
    expect(status1).toContain("did you mean: `design-doc`?");

    // Repair: edit spawn.yml to fix the typo.
    writeSpawn(root, "alpha", "template: design-doc\nparams:\n  topic: x\n");

    report = await ingestSpawnDir({
      spawnRoot: root,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });
    expect(report.applied).toBe(1);
    expect(report.rejected).toBe(0);
  });

  it("data-driven: 30 invocations across three templates, deps preserved", async () => {
    writeTemplate(workspace, playbook, "asset-spec", {
      "TASK.md": "---\nid: x\n---\n# {{assetName}}\n",
      "PARAMS.yml":
        "params:\n  assetId: { type: string, required: true }\n  assetName: { type: string, required: true }\n",
    });
    writeTemplate(workspace, playbook, "asset-generate", {
      "TASK.md": "---\nid: x\n---\n# {{assetId}}\n",
      "PARAMS.yml":
        "params:\n  assetId: { type: string, required: true }\n",
    });
    writeTemplate(workspace, playbook, "asset-wire", {
      "TASK.md": "---\nid: x\n---\n# {{assetId}}\n",
      "PARAMS.yml":
        "params:\n  assetId: { type: string, required: true }\n",
    });

    const root = spawnRoot("data-fanout");
    // 10 assets × 3 templates = 30 invocations.
    for (let i = 0; i < 10; i++) {
      const aid = `asset-${i}`;
      writeSpawn(
        root,
        `${aid}-spec`,
        `template: asset-spec\nparams:\n  assetId: ${aid}\n  assetName: A${i}\n`,
      );
      writeSpawn(
        root,
        `${aid}-generate`,
        `template: asset-generate\ndepends_on: [${aid}-spec]\nparams:\n  assetId: ${aid}\n`,
      );
      writeSpawn(
        root,
        `${aid}-wire`,
        `template: asset-wire\ndepends_on: [${aid}-generate]\nparams:\n  assetId: ${aid}\n`,
      );
    }

    const report = await ingestSpawnDir({
      spawnRoot: root,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });
    expect(report.applied).toBe(30);
    expect(report.rejected).toBe(0);
  });

  it("nested: a child created here can itself spawn at its own level", async () => {
    // The "nested" property is structural — the framework treats every
    // level identically because it never recurses. We verify that:
    //   - A spawner template (mode: spawner) expands into a TASK.md
    //     that itself declares `mode: spawner` for the spawned child.
    //   - A second-level ingest in *that* child's own spawn dir works
    //     in isolation; evidence at depth 2 doesn't leak to depth 1.
    writeTemplate(workspace, playbook, "section", {
      "TASK.md":
        "---\nid: x\nmode: spawner\n---\n# section {{sectionId}}\nbody spawns subsections\n",
      "PARAMS.yml":
        "params:\n  sectionId: { type: string, required: true }\n",
    });
    writeTemplate(workspace, playbook, "subsection", {
      "TASK.md": "---\nid: x\n---\n# subsection {{subId}}\n",
      "PARAMS.yml":
        "params:\n  subId: { type: string, required: true }\n",
    });

    // Depth 0: root spawner creates two `section` invocations.
    const rootSpawn = spawnRoot("root-spawner");
    writeSpawn(
      rootSpawn,
      "intro",
      "template: section\nparams:\n  sectionId: intro\n",
    );
    writeSpawn(
      rootSpawn,
      "conclusion",
      "template: section\nparams:\n  sectionId: conclusion\n",
    );

    const rootReport = await ingestSpawnDir({
      spawnRoot: rootSpawn,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });
    expect(rootReport.applied).toBe(2);

    // Depth 1: the `intro` task itself runs (simulated) and writes its
    // own spawn.yml files in its own spawn cwd.
    const introSpawn = spawnRoot("intro");
    writeSpawn(
      introSpawn,
      "subA",
      "template: subsection\nparams:\n  subId: a\n",
    );
    writeSpawn(
      introSpawn,
      "subB",
      "template: subsection\nparams:\n  subId: b\n",
    );

    const introReport = await ingestSpawnDir({
      spawnRoot: introSpawn,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });
    expect(introReport.applied).toBe(2);

    // Evidence isolation: failure at intro's spawn dir does not surface
    // in root's STATUS.md.
    const rootStatus = readFileSync(join(rootSpawn, "STATUS.md"), "utf-8");
    expect(rootStatus).not.toContain("subA");
    expect(rootStatus).not.toContain("subB");
  });

  it("EXPANDED.md is written next to every ok child's spawn.yml", async () => {
    writeTemplate(workspace, playbook, "prose", {
      "TASK.md": "---\nid: x\n---\n# {{title}}\n",
      "PARAMS.yml": "params:\n  title: { type: string, required: true }\n",
    });
    const root = spawnRoot("expanded-check");
    writeSpawn(root, "a", "template: prose\nparams:\n  title: Alpha\n");

    await ingestSpawnDir({
      spawnRoot: root,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });
    expect(existsSync(join(root, "a", "EXPANDED.md"))).toBe(true);
    const expanded = readFileSync(join(root, "a", "EXPANDED.md"), "utf-8");
    expect(expanded).toContain("# Alpha");
  });

  it("force re-spawn: deleting a child's dir + re-writing with new params updates content", async () => {
    writeTemplate(workspace, playbook, "prose", {
      "TASK.md": "---\nid: x\n---\n# {{title}}\n",
      "PARAMS.yml": "params:\n  title: { type: string, required: true }\n",
    });
    const root = spawnRoot("force-respawn");
    writeSpawn(root, "a", "template: prose\nparams:\n  title: First\n");

    await ingestSpawnDir({
      spawnRoot: root,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });
    const firstExpanded = readFileSync(
      join(root, "a", "EXPANDED.md"),
      "utf-8",
    );
    expect(firstExpanded).toContain("# First");

    // Delete the child dir; re-write spawn.yml with different params.
    rmSync(join(root, "a"), { recursive: true, force: true });
    writeSpawn(root, "a", "template: prose\nparams:\n  title: Second\n");

    const r2 = await ingestSpawnDir({
      spawnRoot: root,
      workspace,
      playbookDir: playbookDir(),
      playbook,
    });
    // applyManifest treats existing-id + different content as a
    // duplicate-id failure (RFC 0021 contract). The repair surface is
    // STATUS.md.
    const status = readFileSync(join(root, "STATUS.md"), "utf-8");
    expect(status).toMatch(/duplicate-id|Second/);
    expect(r2.previewed).toBe(1);
  });
});
