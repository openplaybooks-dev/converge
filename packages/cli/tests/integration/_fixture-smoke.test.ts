import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

const FIXTURE_ROOT = resolve(__dirname, "../fixtures/minimal-playbook");
const PLAYBOOK_DIR = resolve(FIXTURE_ROOT, ".converge/playbooks/default");

describe("minimal-playbook fixture", () => {
  it("has a .converge/project.yaml file", () => {
    const p = resolve(FIXTURE_ROOT, ".converge/project.yaml");
    expect(existsSync(p)).toBe(true);
  });

  it("has a canonical playbook.yml that parses", () => {
    const p = resolve(PLAYBOOK_DIR, "playbook.yml");
    const raw = readFileSync(p, "utf-8");
    const doc = parseYaml(raw) as { name?: string };

    expect(doc).toBeTruthy();
    expect(doc.name).toBe("default");
  });

  it("declares its tasks as tasks/<id>/TASK.md directories", () => {
    for (const id of [
      "trivial-task",
      "dependent-task",
      "incremental-task",
      "unseeded-seed",
    ]) {
      const p = resolve(PLAYBOOK_DIR, "tasks", id, "TASK.md");
      expect(existsSync(p), `missing ${p}`).toBe(true);
    }
  });

  it("auto-chains sibling tasks alphabetically in the inventory (RFC 0034)", () => {
    // `depends_on` is banned from TASK.md frontmatter; compile wires the
    // chain alphabetically and records it on the inventory rows.
    const p = resolve(FIXTURE_ROOT, ".converge/inventory/default/tasks.jsonl");
    const rows = readFileSync(p, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l))
      .filter((r) => r.kind === "task");
    const dep = Object.fromEntries(rows.map((r) => [r.id, r.depends_on]));

    expect(dep["dependent-task"]).toEqual([]);
    expect(dep["incremental-task"]).toEqual(["dependent-task"]);
    expect(dep["trivial-task"]).toEqual(["incremental-task"]);
    expect(dep["unseeded-seed"]).toEqual(["trivial-task"]);
  });

  it("unseeded-seed/TASK.md declares mode: spawner in frontmatter", () => {
    const p = resolve(PLAYBOOK_DIR, "tasks/unseeded-seed/TASK.md");
    const raw = readFileSync(p, "utf-8");
    expect(raw).toMatch(/^mode:\s*spawner\b/m);
  });
});
