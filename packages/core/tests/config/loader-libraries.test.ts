import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DiscoveryScanner } from "../../src/task/discovery/scanner.ts";
import { expandTestRefs } from "../../src/config/test-expander.ts";

function makeTempDir(): string {
  const dir = join(tmpdir(), `converge-test-loader-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeTestMd(dir: string, relPath: string, content: string): string {
  const fullPath = join(dir, relPath);
  mkdirSync(join(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, content, "utf-8");
  return fullPath;
}

const CMD_TEST_MD = [
  "---",
  "name: freshness",
  "description: Assert file is non-empty",
  "type: cmd",
  "args:",
  "  path: string",
  "---",
  "test -s \"{{ args.path }}\"",
].join("\n");

describe("loader-libraries", () => {
  it("expandTestRefs resolves test refs using registry from DiscoveryScanner", async () => {
    const projectDir = makeTempDir();
    try {
      writeTestMd(projectDir, ".converge/playbooks/my-playbook/tests/freshness.test.md", CMD_TEST_MD);

      const scanner = new DiscoveryScanner(
        { tests: [".converge/playbooks/*/tests/*.test.md"] },
        projectDir,
      );
      const result = await scanner.scan();

      // The scanner must produce a testRegistry
      expect(result.testRegistry).toBeDefined();
      expect(result.testRegistry!.has("freshness")).toBe(true);

      // expandTestRefs must resolve test refs using the registry
      const task = {
        id: "my-task",
        checks: [
          { type: "test" as const, name: "freshness", args: { path: "out.txt" } },
        ],
      };
      const expanded = expandTestRefs(task, result.testRegistry!);
      expect(expanded.checks).toHaveLength(1);
      expect(expanded.checks[0]).toHaveProperty("cmd", 'test -s "out.txt"');
      expect(expanded._testRefs).toEqual(["freshness"]);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("expandTestRefs is callable and resolves correctly", () => {
    const registry = new Map();
    registry.set("freshness", {
      name: "freshness",
      type: "cmd" as const,
      args: { path: { type: "string" } },
      script: "test -s {{ args.path }}",
    });

    const task = {
      id: "my-task",
      checks: [
        { type: "test" as const, name: "freshness", args: { path: "out.txt" } },
      ],
    };

    const expanded = expandTestRefs(task, registry);
    expect(expanded.checks).toHaveLength(1);
    expect(expanded.checks[0]).toHaveProperty("cmd", "test -s out.txt");
  });
});
