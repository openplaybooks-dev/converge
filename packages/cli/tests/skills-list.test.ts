/**
 * `converge skills list` — playbook-scoped skill catalog with malformed-
 * SKILL.md error surfacing (iter-22).
 *
 * Before iter-22, malformed SKILL.md files were silently dropped from
 * the catalog — operators had no signal that a skill they expected to
 * be available was missing. iter-22 keeps the skip-and-recover behavior
 * (so one bad skill doesn't break the playbook) but surfaces each
 * dropped directory as a structured error in both JSON and --human
 * output. Mirror the corruption-visibility pattern from iter-12 → 15.
 *
 * What's under test:
 *   - JSON output is `{ skills: [...], errors: [...] }`
 *   - errors[] populated for: missing name, missing description,
 *     invalid YAML, missing frontmatter, non-mapping frontmatter
 *   - The valid skills still come through alongside the errors
 *   - Each error names the directory + a specific reason
 *   - skills + errors are stable-sorted
 *   - listPlaybookSkills (the function, not the CLI) returns the same
 *     shape that the CLI emits
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { listPlaybookSkills } from "../src/commands-skills.ts";

function plantSkill(
  workspace: string,
  pb: string,
  dir: string,
  body: string,
): void {
  const full = join(
    workspace,
    ".converge",
    "playbooks",
    pb,
    "skills",
    dir,
  );
  mkdirSync(full, { recursive: true });
  writeFileSync(join(full, "SKILL.md"), body, "utf-8");
}

describe("listPlaybookSkills — error surfacing (iter-22)", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-skills-list-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("empty playbook → no skills, no errors", () => {
    const result = listPlaybookSkills(workspace, "default");
    expect(result.skills).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("valid skill is captured; no error", () => {
    plantSkill(
      workspace,
      "default",
      "good-skill",
      "---\nname: good-skill\ndescription: a working skill\n---\nbody\n",
    );
    const { skills, errors } = listPlaybookSkills(workspace, "default");
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("good-skill");
    expect(skills[0].description).toBe("a working skill");
    expect(errors).toEqual([]);
  });

  it("missing `name` in frontmatter → error names the directory + reason", () => {
    plantSkill(
      workspace,
      "default",
      "no-name-skill",
      "---\ndescription: only desc, no name\n---\nbody\n",
    );
    const { skills, errors } = listPlaybookSkills(workspace, "default");
    expect(skills).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].dir).toBe("no-name-skill");
    expect(errors[0].reason).toMatch(/missing.*name/i);
  });

  it("missing `description` in frontmatter → error", () => {
    plantSkill(
      workspace,
      "default",
      "no-desc",
      "---\nname: no-desc\n---\nbody\n",
    );
    const { skills, errors } = listPlaybookSkills(workspace, "default");
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toMatch(/missing.*description/i);
  });

  it("malformed YAML → error with parse reason", () => {
    plantSkill(
      workspace,
      "default",
      "bad-yaml",
      `---\nname: bad-yaml\ndescription: "unterminated\n---\nbody\n`,
    );
    const { errors } = listPlaybookSkills(workspace, "default");
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toMatch(/yaml/i);
  });

  it("missing frontmatter block → error", () => {
    plantSkill(workspace, "default", "no-fm", "body only, no frontmatter\n");
    const { errors } = listPlaybookSkills(workspace, "default");
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toMatch(/frontmatter/i);
  });

  it("missing SKILL.md → error", () => {
    // Plant directory without SKILL.md.
    mkdirSync(
      join(
        workspace,
        ".converge",
        "playbooks",
        "default",
        "skills",
        "empty-dir",
      ),
      { recursive: true },
    );
    const { errors } = listPlaybookSkills(workspace, "default");
    expect(errors).toHaveLength(1);
    expect(errors[0].dir).toBe("empty-dir");
    expect(errors[0].reason).toMatch(/missing/i);
  });

  it("mixed: 2 valid + 2 broken → both lists populated, sorted by name/dir", () => {
    plantSkill(
      workspace,
      "default",
      "zebra-skill",
      "---\nname: zebra-skill\ndescription: last alphabetically\n---\nx\n",
    );
    plantSkill(
      workspace,
      "default",
      "alpha-skill",
      "---\nname: alpha-skill\ndescription: first alphabetically\n---\nx\n",
    );
    plantSkill(
      workspace,
      "default",
      "broken-yankee",
      "---\nname: broken-yankee\n---\nx\n",
    );
    plantSkill(
      workspace,
      "default",
      "broken-bravo",
      "---\ndescription: no name\n---\nx\n",
    );

    const { skills, errors } = listPlaybookSkills(workspace, "default");
    expect(skills.map((s) => s.name)).toEqual(["alpha-skill", "zebra-skill"]);
    expect(errors.map((e) => e.dir)).toEqual([
      "broken-bravo",
      "broken-yankee",
    ]);
  });

  it("non-default playbook name also works (mirrors iter-18 resolver fix)", () => {
    plantSkill(
      workspace,
      "custom-pb",
      "skill-x",
      "---\nname: skill-x\ndescription: in custom playbook\n---\nx\n",
    );
    const { skills, errors } = listPlaybookSkills(workspace, "custom-pb");
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("skill-x");
    expect(errors).toEqual([]);
  });
});
