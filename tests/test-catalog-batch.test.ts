/**
 * CLI batch-seed contract tests for the test-catalog-batch fixture.
 *
 * Verifies that both inline-catalog and external-catalog playbooks:
 * - Use passthrough: true for parent tasks
 * - Call `converge spawn --batch` in the body
 * - Templates declare the vars contract (item_id, item_name, item_category)
 * - catalog.json has exactly 100 entries
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const FIXTURE_DIR = resolve(__dirname, "test-catalog-batch");

describe("test-catalog-batch: inline-catalog", () => {
  const PB_DIR = join(FIXTURE_DIR, ".converge/playbooks/inline-catalog");

  it("parent TASK.md declares passthrough: true", () => {
    const taskMd = readFileSync(
      join(PB_DIR, "tasks/seed-all/TASK.md"),
      "utf-8",
    );
    expect(taskMd).toContain("passthrough: true");
  });

  it("parent TASK.md body calls converge spawn --batch", () => {
    const taskMd = readFileSync(
      join(PB_DIR, "tasks/seed-all/TASK.md"),
      "utf-8",
    );
    expect(taskMd).toMatch(/converge spawn --batch/);
  });

  it("template declares vars contract", () => {
    const taskMd = readFileSync(
      join(PB_DIR, "templates/catalog-item/TASK.md"),
      "utf-8",
    );
    expect(taskMd).toContain("passthrough: true");
    expect(taskMd).toContain("item_id:");
    expect(taskMd).toContain("item_name:");
    expect(taskMd).toContain("item_category:");
  });

  it("template body writes artifact using CONVERGE_VAR_", () => {
    const taskMd = readFileSync(
      join(PB_DIR, "templates/catalog-item/TASK.md"),
      "utf-8",
    );
    expect(taskMd).toContain("CONVERGE_VAR_ITEM_ID");
    expect(taskMd).toContain("CONVERGE_VAR_ITEM_NAME");
    expect(taskMd).toContain("CONVERGE_VAR_ITEM_CATEGORY");
  });

  it("catalog.json has exactly 100 entries", () => {
    const catalog = JSON.parse(
      readFileSync(join(PB_DIR, "catalog.json"), "utf-8"),
    );
    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog).toHaveLength(100);
  });

  it("catalog items have required fields", () => {
    const catalog = JSON.parse(
      readFileSync(join(PB_DIR, "catalog.json"), "utf-8"),
    );
    for (const item of catalog.slice(0, 5)) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("category");
    }
  });

  it("playbook sets workers > 1 for parallelism", () => {
    const playbook = readFileSync(join(PB_DIR, "playbook.yml"), "utf-8");
    expect(playbook).toContain("workers:");
    const workers = parseInt(
      playbook.match(/workers:\s*(\d+)/)?.[1] ?? "0",
      10,
    );
    expect(workers).toBeGreaterThan(1);
  });
});

describe("test-catalog-batch: external-catalog", () => {
  const PB_DIR = join(FIXTURE_DIR, ".converge/playbooks/external-catalog");

  it("parent TASK.md declares passthrough: true", () => {
    const taskMd = readFileSync(
      join(PB_DIR, "tasks/seed-all/TASK.md"),
      "utf-8",
    );
    expect(taskMd).toContain("passthrough: true");
  });

  it("parent TASK.md body delegates to external script", () => {
    const taskMd = readFileSync(
      join(PB_DIR, "tasks/seed-all/TASK.md"),
      "utf-8",
    );
    expect(taskMd).toMatch(/scripts\/spawn-batch\.sh/);
    // Note: external-catalog delegates --batch to the script, not inline
  });

  it("external script contains the batch spawn call", () => {
    const script = readFileSync(
      join(PB_DIR, "scripts/spawn-batch.sh"),
      "utf-8",
    );
    expect(script).toMatch(/converge spawn --batch/);
  });

  it("external spawn script exists and is executable", () => {
    const script = join(PB_DIR, "scripts/spawn-batch.sh");
    expect(existsSync(script)).toBe(true);
    const stats = statSync(script);
    expect(stats.mode & 0o111).toBeGreaterThan(0);
  });

  it("external script generates JSONL and calls --batch", () => {
    const script = readFileSync(
      join(PB_DIR, "scripts/spawn-batch.sh"),
      "utf-8",
    );
    expect(script).toMatch(/converge spawn --batch/);
    expect(script).toMatch(/catalog\.json/);
  });

  it("template declares vars contract", () => {
    const taskMd = readFileSync(
      join(PB_DIR, "templates/catalog-item/TASK.md"),
      "utf-8",
    );
    expect(taskMd).toContain("passthrough: true");
    expect(taskMd).toContain("item_id:");
    expect(taskMd).toContain("item_name:");
    expect(taskMd).toContain("item_category:");
  });

  it("catalog.json has exactly 100 entries", () => {
    const catalog = JSON.parse(
      readFileSync(join(PB_DIR, "catalog.json"), "utf-8"),
    );
    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog).toHaveLength(100);
  });

  it("both catalogs are identical", () => {
    const inline = readFileSync(
      join(FIXTURE_DIR, ".converge/playbooks/inline-catalog/catalog.json"),
      "utf-8",
    );
    const external = readFileSync(
      join(FIXTURE_DIR, ".converge/playbooks/external-catalog/catalog.json"),
      "utf-8",
    );
    expect(inline).toBe(external);
  });
});

describe("test-catalog-batch: project-level", () => {
  it("has project.yaml", () => {
    const project = readFileSync(
      join(FIXTURE_DIR, ".converge/project.yaml"),
      "utf-8",
    );
    expect(project).toContain("test-catalog-batch");
  });

  it("has run-test.sh", () => {
    expect(existsSync(join(FIXTURE_DIR, "run-test.sh"))).toBe(true);
  });

  it("run-test.sh generates catalogs before running", () => {
    const script = readFileSync(join(FIXTURE_DIR, "run-test.sh"), "utf-8");
    expect(script).toMatch(/generate-catalog\.sh/);
    expect(script).toMatch(/inline-catalog/);
    expect(script).toMatch(/external-catalog/);
  });

  it("run-test.sh asserts on JSONL generation", () => {
    const script = readFileSync(join(FIXTURE_DIR, "run-test.sh"), "utf-8");
    expect(script).toMatch(/100 JSONL lines/);
    expect(script).toContain("item-001");
    expect(script).toContain("item-100");
  });

  it("run-test.sh validates both playbooks", () => {
    const script = readFileSync(join(FIXTURE_DIR, "run-test.sh"), "utf-8");
    expect(script).toMatch(/playbook validate/);
    expect(script).toContain("inline-catalog");
    expect(script).toContain("external-catalog");
  });
});
