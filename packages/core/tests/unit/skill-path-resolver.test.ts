/**
 * skill-path-resolver — playbook-scoped skill source discovery.
 *
 * Iter-18 regression: the earlier code excluded the playbook source when
 * CONVERGE_PLAYBOOK was unset OR equal to "default", which silently
 * hid every skill under `.converge/playbooks/default/skills/`. The
 * standard example playbooks (goal-driven-dev, flutter-app, etc.) all
 * use the literal name "default", so the exclusion broke them in
 * practice.
 *
 * What's under test:
 *   - findSkillSources discovers the playbook source when the dir
 *     exists, regardless of the playbook name (including "default")
 *   - resolveSkillPath finds a specific skill in that dir
 *   - When CONVERGE_PLAYBOOK is unset, the resolver falls back to
 *     "default" and still finds the dir
 *   - The playbook source is sorted into the correct priority slot
 *     (after project-local .skill/ but before global ~/.claude/skills/)
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

import {
  findSkillSources,
  resolveSkillPath,
  resolveSkillsRoot,
  skillExists,
} from "../../src/config/skill-path-resolver.ts";

function plantSkill(
  projectDir: string,
  playbookName: string,
  skillName: string,
): string {
  const skillDir = join(
    projectDir,
    ".converge",
    "playbooks",
    playbookName,
    "skills",
    skillName,
  );
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, "SKILL.md"),
    `---\nname: ${skillName}\ndescription: test skill\n---\nbody\n`,
    "utf-8",
  );
  return skillDir;
}

describe("skill-path-resolver — playbook source", () => {
  let workspace: string;
  let savedPlaybook: string | undefined;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-skillres-"));
    savedPlaybook = process.env.CONVERGE_PLAYBOOK;
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
    if (savedPlaybook === undefined) {
      delete process.env.CONVERGE_PLAYBOOK;
    } else {
      process.env.CONVERGE_PLAYBOOK = savedPlaybook;
    }
  });

  it("discovers skills under playbooks/default/skills/ when CONVERGE_PLAYBOOK=default", () => {
    plantSkill(workspace, "default", "my-skill");
    process.env.CONVERGE_PLAYBOOK = "default";

    const sources = findSkillSources(workspace);
    const playbookSrc = sources.find((s) => s.type === "playbook");
    expect(playbookSrc).toBeDefined();
    expect(playbookSrc!.root).toBe(
      join(workspace, ".converge", "playbooks", "default", "skills"),
    );
  });

  it("discovers skills under playbooks/<custom>/skills/ when CONVERGE_PLAYBOOK is a non-default name", () => {
    plantSkill(workspace, "alpha-stack", "another-skill");
    process.env.CONVERGE_PLAYBOOK = "alpha-stack";

    const sources = findSkillSources(workspace);
    const playbookSrc = sources.find((s) => s.type === "playbook");
    expect(playbookSrc).toBeDefined();
    expect(playbookSrc!.root).toBe(
      join(workspace, ".converge", "playbooks", "alpha-stack", "skills"),
    );
  });

  it("falls back to playbook 'default' when CONVERGE_PLAYBOOK is unset", () => {
    plantSkill(workspace, "default", "fallback-skill");
    delete process.env.CONVERGE_PLAYBOOK;

    const sources = findSkillSources(workspace);
    const playbookSrc = sources.find((s) => s.type === "playbook");
    expect(playbookSrc).toBeDefined();
  });

  it("resolveSkillPath returns the skill's directory from the playbook source", () => {
    const plantedDir = plantSkill(workspace, "default", "specific-skill");
    process.env.CONVERGE_PLAYBOOK = "default";

    const found = resolveSkillPath("specific-skill", workspace);
    expect(found).toBe(plantedDir);
  });

  it("skillExists returns true for a skill present only in the playbook source", () => {
    plantSkill(workspace, "default", "exists-skill");
    process.env.CONVERGE_PLAYBOOK = "default";

    expect(skillExists("exists-skill", workspace)).toBe(true);
    expect(skillExists("missing-skill", workspace)).toBe(false);
  });

  it("resolveSkillsRoot picks the playbook source when no project-local .skill/ exists", () => {
    plantSkill(workspace, "default", "root-skill");
    process.env.CONVERGE_PLAYBOOK = "default";

    const root = resolveSkillsRoot(workspace);
    expect(root).toBe(
      join(workspace, ".converge", "playbooks", "default", "skills"),
    );
  });

  it("project-local .skill/ takes priority over the playbook source", () => {
    // Plant both .skill/ at project root and the playbook skills dir.
    mkdirSync(join(workspace, ".skill"), { recursive: true });
    plantSkill(workspace, "default", "shadowed-skill");
    process.env.CONVERGE_PLAYBOOK = "default";

    const sources = findSkillSources(workspace);
    expect(sources[0].type).toBe("project");
    expect(sources[1]?.type).toBe("playbook");
  });

  it("no playbook source is returned when the playbook skills dir doesn't exist", () => {
    // Don't plant the skills dir.
    process.env.CONVERGE_PLAYBOOK = "default";

    const sources = findSkillSources(workspace);
    const playbookSrc = sources.find((s) => s.type === "playbook");
    expect(playbookSrc).toBeUndefined();
  });
});
