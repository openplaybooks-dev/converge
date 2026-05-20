/**
 * RFC 0008 — Skill discovery tests.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildSkillIndex, parseSkillFile } from "../../src/skills/discovery.ts";

let ROOT: string;
beforeEach(() => {
  ROOT = join(tmpdir(), `converge-skills-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(ROOT, { recursive: true });
});
afterEach(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

function plantSkill(rootName: string, skillName: string, frontmatter: string, body = "# body") {
  const dir = join(ROOT, rootName, skillName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\n${frontmatter}\n---\n${body}\n`);
  return join(dir, "SKILL.md");
}

describe("parseSkillFile", () => {
  it("reads description and when_to_use from frontmatter", () => {
    const p = plantSkill("r", "demo", 'description: "Do the thing"\nwhen_to_use: "When the thing is needed"');
    expect(parseSkillFile(p)).toEqual({
      description: "Do the thing",
      path: p,
      whenToUse: "When the thing is needed",
    });
  });

  it("falls back to summary when description is missing", () => {
    const p = plantSkill("r", "demo", 'summary: "fallback summary"');
    expect(parseSkillFile(p)?.description).toBe("fallback summary");
  });

  it("accepts camelCase whenToUse alias", () => {
    const p = plantSkill("r", "demo", 'description: "x"\nwhenToUse: "in camelCase"');
    expect(parseSkillFile(p)?.whenToUse).toBe("in camelCase");
  });

  it("returns null fields when frontmatter is empty", () => {
    const p = plantSkill("r", "demo", "");
    expect(parseSkillFile(p)).toEqual({ description: null, path: p, whenToUse: null });
  });

  it("returns null for a missing file", () => {
    expect(parseSkillFile(`${ROOT}/ghost/SKILL.md`)).toBeNull();
  });
});

describe("buildSkillIndex", () => {
  it("returns sorted skills across multiple roots", () => {
    plantSkill("a", "zebra", 'description: "z"');
    plantSkill("a", "alpha", 'description: "a"');
    plantSkill("b", "mango", 'description: "m"');
    const idx = buildSkillIndex({
      task: "001-test",
      playbook: "default",
      roots: [join(ROOT, "a"), join(ROOT, "b")],
    });
    expect(idx.task).toBe("001-test");
    expect(idx.playbook).toBe("default");
    expect(idx.skills.map((s) => s.name)).toEqual(["alpha", "mango", "zebra"]);
  });

  it("dedupes by name — first-root wins", () => {
    plantSkill("a", "stitch", 'description: "from a"');
    plantSkill("b", "stitch", 'description: "from b"');
    const idx = buildSkillIndex({
      task: "t",
      playbook: "p",
      roots: [join(ROOT, "a"), join(ROOT, "b")],
    });
    expect(idx.skills).toHaveLength(1);
    expect(idx.skills[0].description).toBe("from a");
  });

  it("skips entries that don't have a SKILL.md", () => {
    mkdirSync(join(ROOT, "a", "no-skill-md"), { recursive: true });
    plantSkill("a", "real", 'description: "ok"');
    const idx = buildSkillIndex({ task: "t", playbook: "p", roots: [join(ROOT, "a")] });
    expect(idx.skills.map((s) => s.name)).toEqual(["real"]);
  });

  it("ignores non-existent roots without throwing", () => {
    const idx = buildSkillIndex({
      task: "t",
      playbook: "p",
      roots: [join(ROOT, "ghost"), join(ROOT, "phantom")],
    });
    expect(idx.skills).toEqual([]);
  });
});
