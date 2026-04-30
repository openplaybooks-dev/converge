import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

const FIXTURE_ROOT = resolve(__dirname, "../fixtures/minimal-playbook");

describe("minimal-playbook fixture", () => {
  it("has a .converge/project.yaml file", () => {
    const p = resolve(FIXTURE_ROOT, ".converge/project.yaml");
    expect(existsSync(p)).toBe(true);
  });

  it("has a playbook.yml that parses and lists three tasks", () => {
    const p = resolve(FIXTURE_ROOT, "playbook.yml");
    const raw = readFileSync(p, "utf-8");
    const doc = parseYaml(raw) as { tasks?: { name: string }[] };

    expect(doc).toBeTruthy();
    const names = (doc.tasks ?? []).map((t) => t.name).sort();
    expect(names).toEqual(
      ["dependent-task", "trivial-task", "unseeded-wbs"].sort(),
    );
  });

  it('has dependent-task depending on trivial-task', () => {
    const p = resolve(FIXTURE_ROOT, "playbook.yml");
    const raw = readFileSync(p, "utf-8");
    const doc = parseYaml(raw) as {
      tasks?: { name: string; depends_on?: string[] }[];
    };

    const dep = (doc.tasks ?? []).find((t) => t.name === "dependent-task");
    expect(dep).toBeTruthy();
    expect(dep!.depends_on).toContain("trivial-task");
  });

  it("unseeded-wbs/TASK.md declares wbs: in frontmatter", () => {
    const p = resolve(FIXTURE_ROOT, "unseeded-wbs/TASK.md");
    const raw = readFileSync(p, "utf-8");
    expect(raw).toMatch(/^wbs:/m);
  });

  it("unseeded-wbs/wbs/index.js exists", () => {
    const p = resolve(FIXTURE_ROOT, "unseeded-wbs/wbs/index.js");
    expect(existsSync(p)).toBe(true);
  });
});
