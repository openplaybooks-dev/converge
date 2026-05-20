/**
 * RFC 0021 — `applyManifest` integration tests.
 *
 * Each test sets up a temp workspace with a fake playbook + templates,
 * runs applyManifest, and asserts on tasks.jsonl + spawn.plan.result.jsonl.
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
import {
  applyManifest,
  type SpawnResult,
} from "../../src/task/spawn/apply.ts";

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
): string {
  const dir = join(
    workspace,
    ".converge",
    "playbooks",
    playbook,
    "templates",
    templateName,
  );
  mkdirSync(dir, { recursive: true });
  const taskMd = join(dir, "TASK.md");
  writeFileSync(taskMd, body, "utf-8");
  return taskMd;
}

function writeManifest(
  workspace: string,
  rows: Array<Record<string, unknown>>,
): string {
  const dir = join(workspace, "manifests");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `m-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
  writeFileSync(
    path,
    rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
    "utf-8",
  );
  return path;
}

describe("applyManifest", () => {
  let workspace: string;
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-apply-"));
    process.env.CONVERGE_PLAYBOOK = "pb1";
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

  it("applies a 3-row manifest cleanly (happy path)", async () => {
    writeTemplate(workspace, "pb1", "alpha", "---\nid: alpha\n---\n# alpha\n");
    writeTemplate(workspace, "pb1", "beta", "---\nid: beta\n---\n# beta\n");
    writeTemplate(workspace, "pb1", "gamma", "---\nid: gamma\n---\n# gamma\n");

    const manifestPath = writeManifest(workspace, [
      { id: "row-a", template: "alpha" },
      { id: "row-b", template: "beta" },
      { id: "row-c", template: "gamma" },
    ]);

    const report = await applyManifest({ manifestPath, workspace });

    expect(report.ok).toBe(3);
    expect(report.failed).toBe(0);
    expect(report.rows.every((r) => r.ok)).toBe(true);

    const tasksJsonl = join(
      workspace,
      ".converge",
      "inventory",
      "pb1",
      "tasks.jsonl",
    );
    const tasks = readJsonl<{ id: string }>(tasksJsonl);
    expect(tasks.map((t) => t.id).sort()).toEqual(["row-a", "row-b", "row-c"]);

    const results = readJsonl<SpawnResult>(report.resultPath);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it("per-row fail: row 2 missing template, rows 1+3 succeed (errorCode template-not-found, exit-equivalent failure flag)", async () => {
    writeTemplate(workspace, "pb1", "alpha", "---\nid: alpha\n---\n# alpha\n");
    writeTemplate(workspace, "pb1", "gamma", "---\nid: gamma\n---\n# gamma\n");
    // 'beta' is intentionally missing

    const manifestPath = writeManifest(workspace, [
      { id: "row-a", template: "alpha" },
      { id: "row-b", template: "beta" },
      { id: "row-c", template: "gamma" },
    ]);

    const report = await applyManifest({ manifestPath, workspace });

    expect(report.ok).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.rows[0].ok).toBe(true);
    expect(report.rows[1].ok).toBe(false);
    if (!report.rows[1].ok) {
      expect(report.rows[1].errorCode).toBe("template-not-found");
      expect(report.rows[1].id).toBe("row-b");
    }
    expect(report.rows[2].ok).toBe(true);
  });

  it("strict-mode missing var → errorCode missing-vars + missing key list", async () => {
    writeTemplate(
      workspace,
      "pb1",
      "needs-vars",
      "---\nid: needs-vars\nvars:\n  sprint_id:\n  region:\n---\n# body\n",
    );
    const manifestPath = writeManifest(workspace, [
      { id: "row-1", template: "needs-vars", vars: { sprint_id: "001" } },
    ]);

    const report = await applyManifest({ manifestPath, workspace });

    expect(report.failed).toBe(1);
    const r = report.rows[0];
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errorCode).toBe("missing-vars");
      expect(r.missing).toEqual(["region"]);
    }
  });

  it("idempotent re-apply: byte-identical second run is ok+idempotent, no duplicate rows", async () => {
    writeTemplate(workspace, "pb1", "tpl", "---\nid: tpl\n---\n# t\n");
    const manifestPath = writeManifest(workspace, [
      { id: "iid-a", template: "tpl" },
      { id: "iid-b", template: "tpl" },
    ]);

    const first = await applyManifest({ manifestPath, workspace });
    expect(first.ok).toBe(2);

    const second = await applyManifest({ manifestPath, workspace });
    expect(second.ok).toBe(2);
    expect(second.failed).toBe(0);
    for (const r of second.rows) {
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.idempotent).toBe(true);
    }

    // No duplicate rows in tasks.jsonl
    const tasks = readJsonl<{ id: string }>(
      join(workspace, ".converge", "inventory", "pb1", "tasks.jsonl"),
    );
    const ids = tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(["iid-a", "iid-b"]);
  });

  it("idempotent re-apply with diff: changed row → duplicate-id, unchanged rows → idempotent", async () => {
    writeTemplate(
      workspace,
      "pb1",
      "tpl",
      "---\nid: tpl\nvars:\n  k:\n---\n# t\n",
    );
    const firstPath = writeManifest(workspace, [
      { id: "fix-a", template: "tpl", vars: { k: "v1" } },
      { id: "fix-b", template: "tpl", vars: { k: "vx" } },
    ]);
    const first = await applyManifest({ manifestPath: firstPath, workspace });
    expect(first.ok).toBe(2);

    // Change fix-b's vars; fix-a unchanged.
    const secondPath = writeManifest(workspace, [
      { id: "fix-a", template: "tpl", vars: { k: "v1" } },
      { id: "fix-b", template: "tpl", vars: { k: "DIFFERENT" } },
    ]);
    const second = await applyManifest({ manifestPath: secondPath, workspace });
    expect(second.rows[0].ok).toBe(true);
    if (second.rows[0].ok) expect(second.rows[0].idempotent).toBe(true);

    expect(second.rows[1].ok).toBe(false);
    if (!second.rows[1].ok) {
      expect(second.rows[1].errorCode).toBe("duplicate-id");
    }
  });

  it("unknown field in manifest row → errorCode unknown-field", async () => {
    writeTemplate(workspace, "pb1", "tpl", "---\nid: tpl\n---\n# t\n");
    const manifestPath = writeManifest(workspace, [
      { id: "row-1", template: "tpl", tags: ["x"] },
    ]);
    const report = await applyManifest({ manifestPath, workspace });

    expect(report.failed).toBe(1);
    const r = report.rows[0];
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errorCode).toBe("unknown-field");
      expect(r.error).toMatch(/tags/);
    }
  });

  it("unicode + quoting round-trip (RFC 0002 regression class)", async () => {
    writeTemplate(
      workspace,
      "pb1",
      "tpl",
      "---\nid: tpl\nvars:\n  title:\n---\n# t\n",
    );
    const manifestPath = writeManifest(workspace, [
      { id: "u-1", template: "tpl", vars: { title: "Cycle Tracking" } },
      { id: "u-2", template: "tpl", vars: { title: "週次" } },
      { id: "u-3", template: "tpl", vars: { title: 'it\'s a "test"' } },
    ]);
    const report = await applyManifest({ manifestPath, workspace });

    expect(report.failed).toBe(0);

    const reads = (id: string) =>
      readFileSync(
        join(
          workspace,
          ".converge",
          "inventory",
          "pb1",
          "spawned",
          id,
          "TASK.md",
        ),
        "utf-8",
      );
    expect(reads("u-1")).toContain("Cycle Tracking");
    expect(reads("u-2")).toContain("週次");
    expect(reads("u-3")).toContain('it\'s a "test"');
  });

  it("--dry: no mutation; result file lists planned outcomes", async () => {
    writeTemplate(workspace, "pb1", "tpl", "---\nid: tpl\n---\n# t\n");
    const manifestPath = writeManifest(workspace, [
      { id: "dry-1", template: "tpl" },
    ]);
    const report = await applyManifest({ manifestPath, workspace, dry: true });
    expect(report.ok).toBe(1);

    const inventory = join(
      workspace,
      ".converge",
      "inventory",
      "pb1",
      "spawned",
      "dry-1",
      "TASK.md",
    );
    expect(existsSync(inventory)).toBe(false);
    const tasksJsonl = join(
      workspace,
      ".converge",
      "inventory",
      "pb1",
      "tasks.jsonl",
    );
    expect(existsSync(tasksJsonl)).toBe(false);
  });

  it("after: depends_on flows from manifest into rendered TASK.md", async () => {
    writeTemplate(workspace, "pb1", "tpl", "---\nid: tpl\n---\n# t\n");
    const manifestPath = writeManifest(workspace, [
      { id: "p", template: "tpl" },
      { id: "c", template: "tpl", after: ["p"] },
    ]);
    const report = await applyManifest({ manifestPath, workspace });
    expect(report.failed).toBe(0);

    const md = readFileSync(
      join(
        workspace,
        ".converge",
        "inventory",
        "pb1",
        "spawned",
        "c",
        "TASK.md",
      ),
      "utf-8",
    );
    expect(md).toMatch(/depends_on:\s*\n\s+- p/);
  });

  it("vars.exec_dir auto-injected when template declares it", async () => {
    writeTemplate(
      workspace,
      "pb1",
      "needs-exec",
      "---\nid: needs-exec\nvars:\n  exec_dir:\n---\n# body\n",
    );
    const manifestPath = writeManifest(workspace, [
      { id: "ex-1", template: "needs-exec" },
    ]);
    const report = await applyManifest({ manifestPath, workspace });
    expect(report.failed).toBe(0);

    const md = readFileSync(
      join(
        workspace,
        ".converge",
        "inventory",
        "pb1",
        "spawned",
        "ex-1",
        "TASK.md",
      ),
      "utf-8",
    );
    // Auto-injected workspace-relative path under .converge/journal/<pb>/tasks/<id>/exec
    expect(md).toContain(".converge/journal/pb1/tasks/ex-1/exec");
  });

  it("refuses without CONVERGE_PLAYBOOK", async () => {
    delete process.env.CONVERGE_PLAYBOOK;
    writeTemplate(workspace, "pb1", "tpl", "---\nid: tpl\n---\n# t\n");
    const manifestPath = writeManifest(workspace, [
      { id: "r1", template: "tpl" },
    ]);
    await expect(applyManifest({ manifestPath, workspace })).rejects.toThrow(
      /CONVERGE_PLAYBOOK/,
    );
  });

  it("renders {{varName}} placeholders in title, body, and check commands", async () => {
    writeTemplate(
      workspace,
      "pb1",
      "tpl",
      [
        "---",
        'id: "{{taskId}}"',
        'title: "Run for {{questionDir}}"',
        "vars:",
        "  questionDir:",
        "checks:",
        "  - id: out-exists",
        '    cmd: "test -f {{questionDir}}/out.md"',
        "---",
        "",
        "# Process {{questionDir}}",
        "",
        "Read input at {{questionDir}}/in.md.",
        "",
      ].join("\n"),
    );

    const manifestPath = writeManifest(workspace, [
      {
        id: "r-render",
        template: "tpl",
        vars: { questionDir: "questions/icl-limits" },
      },
    ]);
    const report = await applyManifest({ manifestPath, workspace });
    expect(report.failed).toBe(0);

    const md = readFileSync(
      join(
        workspace,
        ".converge",
        "inventory",
        "pb1",
        "spawned",
        "r-render",
        "TASK.md",
      ),
      "utf-8",
    );
    expect(md).toContain("Run for questions/icl-limits");
    expect(md).toContain("test -f questions/icl-limits/out.md");
    expect(md).toContain("Process questions/icl-limits");
    expect(md).not.toMatch(/\{\{questionDir\}\}/);
    expect(md).toMatch(/^id: r-render/m);
  });

  it("renders {{var}} placeholders in inputs, outputs, and tags", async () => {
    // Regression: renderChildTaskMd previously only substituted title,
    // body, and checks — leaving {{var}} placeholders intact in inputs,
    // outputs, and tags. The cache predicate calls existsSync on each
    // declared output, so a literal "{{screenId}}" in outputs would make
    // the cache check fail forever and the task would re-run on every
    // pass.
    writeTemplate(
      workspace,
      "pb1",
      "screen-spec",
      `---
id: "{{taskId}}"
title: "[{{title}}] spec"
tags:
  - screen
  - screen-{{screenId}}
inputs:
  - .stitch/inventory/screens/{{screenId}}.jsonl
  - DESIGN.md
outputs:
  - .stitch/designs/{{screenId}}/SPEC.md
checks:
  - id: spec-exists
    cmd: test -f .stitch/designs/{{screenId}}/SPEC.md
---

Body for {{title}} screen {{screenId}}.
`,
    );

    const manifestPath = writeManifest(workspace, [
      {
        id: "screen-landing-spec",
        template: "screen-spec",
        vars: { screenId: "landing", title: "Landing" },
      },
    ]);

    const report = await applyManifest({ manifestPath, workspace });
    expect(report.failed).toBe(0);

    const md = readFileSync(
      join(
        workspace,
        ".converge",
        "inventory",
        "pb1",
        "spawned",
        "screen-landing-spec",
        "TASK.md",
      ),
      "utf-8",
    );

    // Every {{var}} placeholder must be substituted everywhere it
    // appeared in the source template — not just body/title/checks.
    expect(md).not.toMatch(/\{\{screenId\}\}/);
    expect(md).not.toMatch(/\{\{title\}\}/);

    // Specifically inputs and outputs are the cache-predicate-critical
    // fields. Assert they carry the resolved paths.
    expect(md).toContain(".stitch/inventory/screens/landing.jsonl");
    expect(md).toContain(".stitch/designs/landing/SPEC.md");

    // Tags rendered too.
    expect(md).toContain("screen-landing");
  });

  it("RFC 0030 — without spawnRoot, writes the legacy inventory copy (back-compat)", async () => {
    // Legacy callers (manual `converge apply`, RFC 0021 path) don't
    // provide spawnRoot. They still get the inventory/<pb>/spawned/<id>/
    // TASK.md write so existing tooling that reads from that path
    // continues to work.
    writeTemplate(
      workspace,
      "pb1",
      "legacy-tpl",
      `---
id: "{{taskId}}"
title: "L"
outputs:
  - dist/legacy.out
---

Body.
`,
    );
    const manifestPath = writeManifest(workspace, [
      { id: "legacy-1", template: "legacy-tpl" },
    ]);
    const report = await applyManifest({ manifestPath, workspace });
    expect(report.failed).toBe(0);
    expect(
      existsSync(
        join(
          workspace,
          ".converge/inventory/pb1/spawned/legacy-1/TASK.md",
        ),
      ),
    ).toBe(true);
  });

  it("RFC 0030 — with spawnRoot, skips the legacy inventory write (single source of truth)", async () => {
    // The RFC 0024 ingest path (ingestSpawnDir) writes EXPANDED.md
    // under <spawnRoot>/<id>/ and passes spawnRoot to applyManifest.
    // Apply must NOT write a second copy under inventory/<pb>/spawned/.
    writeTemplate(
      workspace,
      "pb1",
      "rfc30-tpl",
      `---
id: "{{taskId}}"
title: "R"
outputs:
  - dist/r.out
---

Body.
`,
    );
    const spawnRoot = join(workspace, "exec-spawn-root");
    // Simulate ingestSpawnDir having already written EXPANDED.md.
    mkdirSync(join(spawnRoot, "rfc30-1"), { recursive: true });
    writeFileSync(
      join(spawnRoot, "rfc30-1", "EXPANDED.md"),
      "---\nid: rfc30-1\ntitle: R\n---\n\nBody.\n",
      "utf-8",
    );
    const manifestPath = writeManifest(workspace, [
      { id: "rfc30-1", template: "rfc30-tpl" },
    ]);
    const report = await applyManifest({
      manifestPath,
      workspace,
      spawnRoot,
    });
    expect(report.failed).toBe(0);
    // Legacy copy must NOT exist.
    expect(
      existsSync(
        join(
          workspace,
          ".converge/inventory/pb1/spawned/rfc30-1/TASK.md",
        ),
      ),
    ).toBe(false);
    // EXPANDED.md is still on disk (we wrote it; apply didn't touch it).
    expect(existsSync(join(spawnRoot, "rfc30-1", "EXPANDED.md"))).toBe(
      true,
    );
  });

  it("RFC 0030 — env override CONVERGE_LEGACY_SPAWNED_INVENTORY=1 forces legacy write back on", async () => {
    // The deprecation escape hatch: operators with tooling that hasn't
    // migrated yet can force the legacy write back on without rolling
    // the framework version back.
    writeTemplate(
      workspace,
      "pb1",
      "force-tpl",
      `---
id: "{{taskId}}"
title: "F"
outputs:
  - dist/f.out
---

Body.
`,
    );
    const spawnRoot = join(workspace, "exec-force-root");
    mkdirSync(join(spawnRoot, "force-1"), { recursive: true });
    writeFileSync(
      join(spawnRoot, "force-1", "EXPANDED.md"),
      "---\nid: force-1\ntitle: F\n---\n\nBody.\n",
      "utf-8",
    );
    const manifestPath = writeManifest(workspace, [
      { id: "force-1", template: "force-tpl" },
    ]);
    process.env.CONVERGE_LEGACY_SPAWNED_INVENTORY = "1";
    try {
      const report = await applyManifest({
        manifestPath,
        workspace,
        spawnRoot,
      });
      expect(report.failed).toBe(0);
      expect(
        existsSync(
          join(
            workspace,
            ".converge/inventory/pb1/spawned/force-1/TASK.md",
          ),
        ),
      ).toBe(true);
    } finally {
      delete process.env.CONVERGE_LEGACY_SPAWNED_INVENTORY;
    }
  });

  it("RFC 0030 — renderedHash idempotency: same params → idempotent, different params → duplicate-id", async () => {
    // The new idempotency check stores the rendered content hash on the
    // tasks.jsonl row's metadata. Re-applying with byte-identical
    // params returns idempotent ok; re-applying with different params
    // (after deleting/changing EXPANDED.md) returns duplicate-id.
    writeTemplate(
      workspace,
      "pb1",
      "idem-tpl",
      `---
id: "{{taskId}}"
title: "T {{name}}"
outputs:
  - dist/{{name}}.out
---

Body for {{name}}.
`,
    );

    const spawnRoot = join(workspace, "exec-idem-root");
    mkdirSync(join(spawnRoot, "idem-1"), { recursive: true });

    // First apply.
    const m1 = writeManifest(workspace, [
      {
        id: "idem-1",
        template: "idem-tpl",
        vars: { name: "first" },
      },
    ]);
    // Pre-write EXPANDED.md to match the renderer's view (the real
    // ingestSpawnDir would do this between expand and apply).
    writeFileSync(
      join(spawnRoot, "idem-1", "EXPANDED.md"),
      "placeholder",
      "utf-8",
    );
    const r1 = await applyManifest({
      manifestPath: m1,
      workspace,
      spawnRoot,
    });
    expect(r1.failed).toBe(0);

    // Second apply with same params → idempotent.
    const m2 = writeManifest(workspace, [
      {
        id: "idem-1",
        template: "idem-tpl",
        vars: { name: "first" },
      },
    ]);
    const r2 = await applyManifest({
      manifestPath: m2,
      workspace,
      spawnRoot,
    });
    expect(r2.failed).toBe(0);
    expect(r2.rows[0]).toMatchObject({ ok: true, idempotent: true });

    // Third apply with different params → duplicate-id error.
    const m3 = writeManifest(workspace, [
      {
        id: "idem-1",
        template: "idem-tpl",
        vars: { name: "second" },
      },
    ]);
    const r3 = await applyManifest({
      manifestPath: m3,
      workspace,
      spawnRoot,
    });
    expect(r3.failed).toBe(1);
    expect(r3.rows[0]).toMatchObject({
      ok: false,
      errorCode: "duplicate-id",
    });
  });
});
