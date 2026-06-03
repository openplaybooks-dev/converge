/**
 * RFC 0024 — Template registry tests.
 *
 * `loadTemplates(playbookDir)` scans `<playbookDir>/templates/*` and returns
 * a list of `TemplateDef`s. For each subdirectory it reads PARAMS.yml when
 * present; otherwise it infers params by scanning the template's TASK.md for
 * `{{...}}` references.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTemplates, findTemplate } from "../../src/task/spawn/templates.ts";

function writeTemplateFiles(
  playbookDir: string,
  templateName: string,
  files: Record<string, string>,
): void {
  const dir = join(playbookDir, "templates", templateName);
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content, "utf-8");
  }
}

describe("loadTemplates", () => {
  let playbookDir: string;

  beforeEach(() => {
    playbookDir = mkdtempSync(join(tmpdir(), "converge-templates-"));
  });

  afterEach(() => {
    rmSync(playbookDir, { recursive: true, force: true });
  });

  it("returns empty list when templates/ does not exist", () => {
    const templates = loadTemplates(playbookDir);
    expect(templates).toEqual([]);
  });

  it("loads a single template with PARAMS.yml", () => {
    writeTemplateFiles(playbookDir, "asset-spec", {
      "TASK.md": "---\nid: {{assetId}}\n---\n# spec for {{assetName}}\n",
      "PARAMS.yml":
        "params:\n  assetId:    { type: string, required: true }\n  assetName:  { type: string, required: true }\n  width:      { type: number, default: 1600 }\n",
    });

    const templates = loadTemplates(playbookDir);
    expect(templates).toHaveLength(1);
    const t = templates[0]!;
    expect(t.name).toBe("asset-spec");
    expect(t.taskMdPath.endsWith("/asset-spec/TASK.md")).toBe(true);
    expect(t.params).toEqual({
      assetId: { type: "string", required: true },
      assetName: { type: "string", required: true },
      width: { type: "number", default: 1600 },
    });
  });

  it("infers params from {{...}} when PARAMS.yml is absent", () => {
    writeTemplateFiles(playbookDir, "prose-task", {
      "TASK.md":
        "---\nid: {{taskId}}\n---\n# {{title}}\n\nWrite to {{outputPath}}.\n",
    });

    const templates = loadTemplates(playbookDir);
    expect(templates).toHaveLength(1);
    const t = templates[0]!;
    expect(t.params).toEqual({
      // taskId is reserved (provided by the framework) and should be excluded
      title: { type: "string", required: true },
      outputPath: { type: "string", required: true },
    });
  });

  it("loads multiple templates; only directories with TASK.md count", () => {
    writeTemplateFiles(playbookDir, "alpha", {
      "TASK.md": "---\nid: a\n---\n",
    });
    writeTemplateFiles(playbookDir, "beta", {
      "TASK.md": "---\nid: b\n---\n",
    });
    // a stray file (not a directory) — should be ignored
    mkdirSync(join(playbookDir, "templates"), { recursive: true });
    writeFileSync(join(playbookDir, "templates", "stray.txt"), "x", "utf-8");
    // a directory without TASK.md — should be ignored
    mkdirSync(join(playbookDir, "templates", "no-taskmd"), { recursive: true });

    const templates = loadTemplates(playbookDir);
    const names = templates.map((t) => t.name).sort();
    expect(names).toEqual(["alpha", "beta"]);
  });

  it("loads EXAMPLES.yml when present", () => {
    writeTemplateFiles(playbookDir, "asset-spec", {
      "TASK.md": "---\nid: x\n---\n# {{assetId}}\n",
      "PARAMS.yml": "params:\n  assetId: { type: string, required: true }\n",
      "EXAMPLES.yml":
        "examples:\n  - name: hero\n    when_to_pick: a hero asset\n    params:\n      assetId: hero-knight\n",
    });
    const templates = loadTemplates(playbookDir);
    expect(templates[0]!.examples).toEqual({
      examples: [
        {
          name: "hero",
          when_to_pick: "a hero asset",
          params: { assetId: "hero-knight" },
        },
      ],
    });
  });

  it("findTemplate matches by exact name and returns undefined otherwise", () => {
    writeTemplateFiles(playbookDir, "asset-spec", {
      "TASK.md": "---\nid: x\n---\n",
    });
    const templates = loadTemplates(playbookDir);
    expect(findTemplate("asset-spec", templates)?.name).toBe("asset-spec");
    expect(findTemplate("nope", templates)).toBeUndefined();
  });
});
