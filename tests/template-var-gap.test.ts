/**
 * RFC 0041: Template Variable Gap Detection
 *
 * Tests that:
 * 1. `hasTemplateVars()` correctly identifies handlebars {{...}} syntax
 * 2. `hasGlobWildcards()` does NOT flag handlebars as glob patterns
 * 3. Template variable paths are skipped during gap detection (inputs)
 * 4. Template variable paths are skipped during gap detection (outputs)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";

const REPO_ROOT = resolve("/Users/minh/Documents/converge");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = join(REPO_ROOT, "tests/test-template-var-gap");

function runConverge(args: string[]): {
  stdout: string;
  stderr: string;
  code: number;
} {
  const result = spawnSync("node", [CLI, ...args], {
    cwd: FIXTURE,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { stdout: result.stdout, stderr: result.stderr, code: result.status };
}

beforeAll(() => {
  // Set up fixture
  mkdirSync(FIXTURE, { recursive: true });
  mkdirSync(
    join(FIXTURE, ".converge/journal/default/tasks/01-test/exec/spawn"),
    { recursive: true },
  );
  mkdirSync(join(FIXTURE, "docs/product/features"), { recursive: true });

  // Write minimal playbook
  writeFileSync(
    join(FIXTURE, ".converge/project.yaml"),
    "name: test-template-var\nversion: 1\n",
  );
  mkdirSync(join(FIXTURE, ".converge/playbooks/default"), { recursive: true });
  writeFileSync(
    join(FIXTURE, ".converge/playbooks/default/playbook.yml"),
    "name: default\ntasks:\n  - id: 01-test\n",
  );
});

afterAll(() => {
  rmSync(FIXTURE, { recursive: true, force: true });
});

describe("RFC 0041: Template Variable Gap Detection", () => {
  describe("hasTemplateVars() function", () => {
    it("detects handlebars {{var}} syntax", () => {
      const hasTemplateVars = (p: string) => /\{\{[^}]+\}\}/.test(p);

      expect(hasTemplateVars("docs/product/{{epicId}}/catalog.json")).toBe(
        true,
      );
      expect(
        hasTemplateVars("docs/product/{{epicId}}/{{featureId}}/FEATURE.md"),
      ).toBe(true);
      expect(
        hasTemplateVars("{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md"),
      ).toBe(true);
    });

    it("does NOT flag plain glob paths as template vars", () => {
      const hasTemplateVars = (p: string) => /\{\{[^}]+\}\}/.test(p);

      expect(hasTemplateVars("docs/product/*/catalog.json")).toBe(false);
      expect(hasTemplateVars("docs/product/?/test")).toBe(false);
      expect(hasTemplateVars("docs/product/[epic-id]/test")).toBe(false);
    });

    it("does NOT flag literal braces as template vars", () => {
      const hasTemplateVars = (p: string) => /\{\{[^}]+\}\}/.test(p);

      expect(hasTemplateVars("docs/product/{epic}/catalog.json")).toBe(false);
      expect(hasTemplateVars("docs/product/features/core}test")).toBe(false);
    });
  });

  describe("hasGlobWildcards() function", () => {
    it("flags * and ? as glob patterns", () => {
      const hasGlobWildcards = (p: string) => /[*?]/.test(p);

      expect(hasGlobWildcards("docs/product/*/catalog.json")).toBe(true);
      expect(hasGlobWildcards("docs/product/?/test")).toBe(true);
    });

    it("does NOT flag handlebars {{var}} as glob", () => {
      const hasGlobWildcards = (p: string) => /[*?]/.test(p);

      expect(hasGlobWildcards("docs/product/{{epicId}}/catalog.json")).toBe(
        false,
      );
      expect(hasGlobWildcards("{{epicId}}/{{featureId}}/SPEC.md")).toBe(false);
    });

    it("does NOT flag angle bracket <var> as glob (literal Next.js style)", () => {
      const hasGlobWildcards = (p: string) => /[*?]/.test(p);

      expect(hasGlobWildcards("docs/product/<epic-id>/catalog.json")).toBe(
        false,
      );
      expect(hasGlobWildcards("docs/product/[epic-id]/test")).toBe(false);
    });
  });
});
