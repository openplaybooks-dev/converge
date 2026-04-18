import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  resolveSkillDependencies,
  validateSkillsExist,
  loadSkillMetadata,
  getSkillSummary,
  collectAllowedTools,
} from "../src/executor/skill-resolver.ts";

describe("skill-resolver", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `skill-resolver-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  function createSkill(name: string, meta: Record<string, any>): void {
    const skillDir = join(testDir, name);
    mkdirSync(skillDir, { recursive: true });

    const frontmatter = Object.entries(meta)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}:\n${value.map((v) => `  - ${v}`).join("\n")}`;
        }
        return `${key}: ${value}`;
      })
      .join("\n");

    const content = `---
${frontmatter}
---

# ${name}

Skill content here.
`;

    writeFileSync(join(skillDir, "TASK.md"), content, "utf-8");
  }

  describe("loadSkillMetadata", () => {
    it("should load skill metadata from TASK.md", () => {
      createSkill("test-skill", {
        name: "test-skill",
        description: "A test skill",
        version: "1.0.0",
      });

      const meta = loadSkillMetadata(testDir, "test-skill");
      expect(meta).not.toBeNull();
      expect(meta?.name).toBe("test-skill");
      expect(meta?.description).toBe("A test skill");
      expect(meta?.version).toBe("1.0.0");
    });

    it("should return null for non-existent skill", () => {
      const meta = loadSkillMetadata(testDir, "non-existent");
      expect(meta).toBeNull();
    });

    it("should parse array dependencies", () => {
      createSkill("skill-with-deps", {
        name: "skill-with-deps",
        dependencies: ["dep1", "dep2", "dep3"],
      });

      const meta = loadSkillMetadata(testDir, "skill-with-deps");
      expect(meta?.dependencies).toEqual(["dep1", "dep2", "dep3"]);
    });

    it("should parse inline array syntax", () => {
      mkdirSync(join(testDir, "inline-array"), { recursive: true });
      writeFileSync(
        join(testDir, "inline-array", "TASK.md"),
        `---
name: inline-array
related-skills: [dep-a, dep-b, dep-c]
---

Content`,
        "utf-8",
      );

      const meta = loadSkillMetadata(testDir, "inline-array");
      expect(meta?.["related-skills"]).toEqual(["dep-a", "dep-b", "dep-c"]);
    });
  });

  describe("validateSkillsExist", () => {
    it("should pass when all skills exist", () => {
      createSkill("skill-a", { name: "skill-a" });
      createSkill("skill-b", { name: "skill-b" });

      expect(() => {
        validateSkillsExist(testDir, ["skill-a", "skill-b"]);
      }).not.toThrow();
    });

    it("should throw when skills are missing", () => {
      createSkill("skill-a", { name: "skill-a" });

      expect(() => {
        validateSkillsExist(testDir, ["skill-a", "missing-skill"]);
      }).toThrow(/missing-skill/);
    });
  });

  describe("resolveSkillDependencies", () => {
    it("should resolve single skill with no dependencies", () => {
      createSkill("simple", { name: "simple" });

      const result = resolveSkillDependencies(testDir, ["simple"]);
      expect(result.skills).toEqual(["simple"]);
      expect(result.warnings).toHaveLength(0);
    });

    it("should resolve linear dependency chain", () => {
      createSkill("base", { name: "base" });
      createSkill("middle", { name: "middle", dependencies: ["base"] });
      createSkill("top", { name: "top", dependencies: ["middle"] });

      const result = resolveSkillDependencies(testDir, ["top"]);
      expect(result.skills).toEqual(["base", "middle", "top"]);
    });

    it("should handle multiple dependency fields", () => {
      createSkill("dep1", { name: "dep1" });
      createSkill("dep2", { name: "dep2" });
      createSkill("dep3", { name: "dep3" });

      createSkill("multi", {
        name: "multi",
        dependencies: ["dep1"],
        requires: ["dep2"],
        "related-skills": ["dep3"],
      });

      const result = resolveSkillDependencies(testDir, ["multi"]);
      expect(result.skills).toContain("dep1");
      expect(result.skills).toContain("dep2");
      expect(result.skills).toContain("dep3");
      expect(result.skills).toContain("multi");
    });

    it("should handle diamond dependency graph", () => {
      createSkill("base", { name: "base" });
      createSkill("left", { name: "left", dependencies: ["base"] });
      createSkill("right", { name: "right", dependencies: ["base"] });
      createSkill("top", { name: "top", dependencies: ["left", "right"] });

      const result = resolveSkillDependencies(testDir, ["top"]);
      expect(result.skills).toContain("base");
      expect(result.skills).toContain("left");
      expect(result.skills).toContain("right");
      expect(result.skills).toContain("top");

      // Base should come before left and right
      const baseIdx = result.skills.indexOf("base");
      const leftIdx = result.skills.indexOf("left");
      const rightIdx = result.skills.indexOf("right");
      expect(baseIdx).toBeLessThan(leftIdx);
      expect(baseIdx).toBeLessThan(rightIdx);
    });

    it("should detect circular dependencies", () => {
      createSkill("a", { name: "a", dependencies: ["b"] });
      createSkill("b", { name: "b", dependencies: ["c"] });
      createSkill("c", { name: "c", dependencies: ["a"] });

      expect(() => {
        resolveSkillDependencies(testDir, ["a"], { throwOnMissing: true });
      }).toThrow(/circular dependency/i);
    });

    it("should warn on missing dependencies when throwOnMissing=false", () => {
      createSkill("has-missing", {
        name: "has-missing",
        dependencies: ["does-not-exist"],
      });

      const result = resolveSkillDependencies(testDir, ["has-missing"], {
        throwOnMissing: false,
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("does-not-exist"))).toBe(
        true,
      );
    });

    it("should throw on missing dependencies when throwOnMissing=true", () => {
      createSkill("has-missing", {
        name: "has-missing",
        dependencies: ["does-not-exist"],
      });

      expect(() => {
        resolveSkillDependencies(testDir, ["has-missing"], {
          throwOnMissing: true,
        });
      }).toThrow(/does-not-exist/);
    });

    it("should enforce max depth limit", () => {
      createSkill("level-0", { name: "level-0", dependencies: ["level-1"] });
      createSkill("level-1", { name: "level-1", dependencies: ["level-2"] });
      createSkill("level-2", { name: "level-2", dependencies: ["level-3"] });
      createSkill("level-3", { name: "level-3" });

      expect(() => {
        resolveSkillDependencies(testDir, ["level-0"], {
          maxDepth: 2,
          throwOnMissing: true,
        });
      }).toThrow(/maximum dependency depth/i);
    });
  });

  describe("getSkillSummary", () => {
    it("should generate summary of skills", () => {
      createSkill("skill-a", { name: "skill-a", description: "First skill" });
      createSkill("skill-b", { name: "skill-b", description: "Second skill" });

      const summary = getSkillSummary(testDir, ["skill-a", "skill-b"]);
      expect(summary).toContain("skill-a");
      expect(summary).toContain("First skill");
      expect(summary).toContain("skill-b");
      expect(summary).toContain("Second skill");
    });

    it("should indicate missing skills", () => {
      createSkill("exists", { name: "exists" });

      const summary = getSkillSummary(testDir, ["exists", "missing"]);
      expect(summary).toContain("exists");
      expect(summary).toContain("missing");
      expect(summary).toContain("NOT FOUND");
    });
  });

  describe("collectAllowedTools", () => {
    it("should include default tools", () => {
      createSkill("simple", { name: "simple" });

      const tools = collectAllowedTools(testDir, ["simple"]);
      expect(tools).toContain("Skill");
      expect(tools).toContain("Read");
      expect(tools).toContain("Write");
      expect(tools).toContain("Edit");
      expect(tools).toContain("Bash");
    });

    it("should merge tools from skill metadata", () => {
      createSkill("custom-tools", {
        name: "custom-tools",
        "allowed-tools": ["CustomTool", "AnotherTool"],
      });

      const tools = collectAllowedTools(testDir, ["custom-tools"]);
      expect(tools).toContain("Skill");
      expect(tools).toContain("Read");
      expect(tools).toContain("CustomTool");
      expect(tools).toContain("AnotherTool");
    });

    it("should deduplicate tools from multiple skills", () => {
      createSkill("skill-a", {
        name: "skill-a",
        "allowed-tools": ["Read", "SpecialTool"],
      });
      createSkill("skill-b", {
        name: "skill-b",
        "allowed-tools": ["Write", "SpecialTool"],
      });

      const tools = collectAllowedTools(testDir, ["skill-a", "skill-b"]);
      const specialToolCount = tools.filter((t) => t === "SpecialTool").length;
      expect(specialToolCount).toBe(1); // No duplicates
      expect(tools).toContain("SpecialTool");
    });

    it("should handle inline array syntax for allowed-tools", () => {
      mkdirSync(join(testDir, "inline-tools"), { recursive: true });
      writeFileSync(
        join(testDir, "inline-tools", "TASK.md"),
        `---
name: inline-tools
allowed-tools: [Tool1, Tool2, Tool3]
---

Content`,
        "utf-8",
      );

      const tools = collectAllowedTools(testDir, ["inline-tools"]);
      expect(tools).toContain("Tool1");
      expect(tools).toContain("Tool2");
      expect(tools).toContain("Tool3");
    });

    it("should always include Skill tool even if not specified", () => {
      createSkill("no-skill-tool", {
        name: "no-skill-tool",
        "allowed-tools": ["OnlyCustomTool"],
      });

      const tools = collectAllowedTools(testDir, ["no-skill-tool"]);
      expect(tools).toContain("Skill"); // Always included
      expect(tools).toContain("OnlyCustomTool");
    });
  });
});
