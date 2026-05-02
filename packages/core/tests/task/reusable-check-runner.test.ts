import { describe, it, expect } from "vitest";
import { runReusableCheck } from "../../src/task/checks/reusable-check-runner.ts";
import type { TestDef } from "../../src/config/test-md-definition.ts";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function makeTempDir(): string {
  const dir = join(tmpdir(), `converge-test-runner-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("reusable-check-runner", () => {
  describe("cmd type", () => {
    it("passes when command exits 0", async () => {
      const test: TestDef = {
        name: "always-pass",
        type: "cmd",
        args: {},
        script: "true",
      };

      const result = await runReusableCheck(test, { inputs: [], vars: {} });
      expect(result.passed).toBe(true);
    });

    it("fails when command exits non-zero", async () => {
      const test: TestDef = {
        name: "always-fail",
        type: "cmd",
        args: {},
        script: "exit 1",
      };

      const result = await runReusableCheck(test, { inputs: [], vars: {} });
      expect(result.passed).toBe(false);
      expect(result.message).toBeDefined();
    });

    it("substitutes args from vars", async () => {
      const projectDir = makeTempDir();
      try {
        const filePath = join(projectDir, "test-output.txt");
        writeFileSync(filePath, "hello", "utf-8");

        const test: TestDef = {
          name: "file-check",
          type: "cmd",
          args: { path: { type: "string" } },
          script: "test -f {{ args.path }}",
        };

        const result = await runReusableCheck(test, {
          inputs: [],
          vars: { path: filePath },
        });
        expect(result.passed).toBe(true);
      } finally {
        rmSync(projectDir, { recursive: true, force: true });
      }
    });
  });

  describe("js type", () => {
    it("passes when all assertions pass", async () => {
      const test: TestDef = {
        name: "js-pass",
        type: "js",
        args: {},
        script: 'context.assert(true, "should pass");',
      };

      const result = await runReusableCheck(test, { inputs: [], vars: {} });
      expect(result.passed).toBe(true);
    });

    it("fails when an assertion fails", async () => {
      const test: TestDef = {
        name: "js-fail",
        type: "js",
        args: {},
        script: 'context.assert(false, "expected failure");',
      };

      const result = await runReusableCheck(test, { inputs: [], vars: {} });
      expect(result.passed).toBe(false);
      expect(result.message).toContain("expected failure");
    });

    it("fails when script throws an error", async () => {
      const test: TestDef = {
        name: "js-throw",
        type: "js",
        args: {},
        script: "throw new Error('unexpected error');",
      };

      const result = await runReusableCheck(test, { inputs: [], vars: {} });
      expect(result.passed).toBe(false);
      expect(result.message).toContain("unexpected error");
    });

    it("has access to context.inputs", async () => {
      const test: TestDef = {
        name: "inputs-check",
        type: "js",
        args: {},
        script: 'context.assert(context.inputs.includes("file-a.ts"), "missing file-a");',
      };

      const result = await runReusableCheck(test, {
        inputs: ["file-a.ts", "file-b.ts"],
        vars: {},
      });
      expect(result.passed).toBe(true);
    });

    it("has access to context.vars", async () => {
      const test: TestDef = {
        name: "vars-check",
        type: "js",
        args: {},
        script: 'context.assert(context.vars.expectedCount === 3, "wrong count");',
      };

      const result = await runReusableCheck(test, {
        inputs: [],
        vars: { expectedCount: 3 },
      });
      expect(result.passed).toBe(true);
    });
  });
});
