/**
 * Skills integration — TASK.md `skills:` frontmatter ↔ skill resolver.
 *
 * Locks in the end-to-end path that iter-17 → iter-18 → iter-19 depend on:
 *
 *   1. A SKILL.md exists under `.converge/playbooks/<pb>/skills/<name>/`.
 *   2. A TASK.md declares `skills: [<name>]` in its frontmatter.
 *   3. `parseTaskMdString` extracts the skills array.
 *   4. `resolveSkillPath(<name>, workspace)` returns the SKILL.md's
 *      directory — proving the resolver's playbook source is wired
 *      against the same name space the parser produces.
 *
 * Without this test, a future regression in either the parser's
 * `skills:` extraction or the resolver's playbook-scope discovery would
 * silently disconnect the two and produce skill-loading failures only
 * at runtime.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseTaskMdString } from "../../src/config/task-md-definition.ts";
import {
  findSkillSources,
  resolveSkillPath,
} from "../../src/config/skill-path-resolver.ts";

function plantSkill(
  workspace: string,
  playbook: string,
  name: string,
  description = "test skill",
): string {
  const dir = join(
    workspace,
    ".converge",
    "playbooks",
    playbook,
    "skills",
    name,
  );
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\n---\nbody\n`,
    "utf-8",
  );
  return dir;
}

describe("skills integration — TASK.md ↔ resolver", () => {
  let workspace: string;
  let savedPlaybook: string | undefined;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-skillint-"));
    savedPlaybook = process.env.CONVERGE_PLAYBOOK;
    process.env.CONVERGE_PLAYBOOK = "default";
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
    if (savedPlaybook === undefined) delete process.env.CONVERGE_PLAYBOOK;
    else process.env.CONVERGE_PLAYBOOK = savedPlaybook;
  });

  it("TASK.md skills field parses; each declared skill resolves to its planted directory", () => {
    const aDir = plantSkill(workspace, "default", "schema-skill");
    const bDir = plantSkill(workspace, "default", "api-skill");

    const taskMd = [
      "---",
      "id: test-task",
      "title: test",
      "description: integration test",
      "skills:",
      "  - schema-skill",
      "  - api-skill",
      "---",
      "body",
    ].join("\n");

    const parsed = parseTaskMdString(taskMd);
    expect(parsed).not.toBeNull();
    expect(parsed!.skills).toEqual(["schema-skill", "api-skill"]);

    expect(resolveSkillPath("schema-skill", workspace)).toBe(aDir);
    expect(resolveSkillPath("api-skill", workspace)).toBe(bDir);
  });

  it("unknown skill name in TASK.md → resolver returns null (caller can surface as gap)", () => {
    plantSkill(workspace, "default", "real-skill");

    const taskMd = [
      "---",
      "id: test-task",
      "title: test",
      "description: integration test",
      "skills:",
      "  - real-skill",
      "  - bogus-skill",
      "---",
      "body",
    ].join("\n");

    const parsed = parseTaskMdString(taskMd);
    expect(parsed!.skills).toEqual(["real-skill", "bogus-skill"]);

    expect(resolveSkillPath("real-skill", workspace)).not.toBeNull();
    expect(resolveSkillPath("bogus-skill", workspace)).toBeNull();
  });

  it("playbook source is discoverable even when the resolver's project-local .skill/ does not exist", () => {
    // This is the iter-18 regression case in disguise — no .skill/, no
    // global ~/.claude/skills, just the playbook-scoped dir.
    plantSkill(workspace, "default", "only-playbook-skill");

    const sources = findSkillSources(workspace);
    const playbookSrc = sources.find((s) => s.type === "playbook");
    expect(playbookSrc).toBeDefined();

    // And the resolver picks it up via the integration.
    const taskMd = [
      "---",
      "id: t",
      "title: t",
      "description: t",
      "skills: [only-playbook-skill]",
      "---",
      "",
    ].join("\n");

    const parsed = parseTaskMdString(taskMd);
    expect(parsed!.skills).toEqual(["only-playbook-skill"]);
    expect(resolveSkillPath("only-playbook-skill", workspace)).not.toBeNull();
  });

  it("custom-named playbook (non-default) also resolves correctly", () => {
    process.env.CONVERGE_PLAYBOOK = "alpha-stack";
    plantSkill(workspace, "alpha-stack", "custom-skill");

    const taskMd = [
      "---",
      "id: t",
      "title: t",
      "description: t",
      "skills: [custom-skill]",
      "---",
      "",
    ].join("\n");
    const parsed = parseTaskMdString(taskMd);
    expect(parsed!.skills).toEqual(["custom-skill"]);
    expect(resolveSkillPath("custom-skill", workspace)).not.toBeNull();
  });

  it("missing skills field in TASK.md is benign (parses to empty/undefined; resolver not consulted)", () => {
    plantSkill(workspace, "default", "available-skill");
    const taskMd = [
      "---",
      "id: no-skills-task",
      "title: t",
      "description: t",
      "---",
      "body",
    ].join("\n");

    const parsed = parseTaskMdString(taskMd);
    expect(parsed).not.toBeNull();
    // skills is undefined or empty when not declared — both are valid.
    expect(parsed!.skills === undefined || parsed!.skills.length === 0).toBe(
      true,
    );
  });
});
