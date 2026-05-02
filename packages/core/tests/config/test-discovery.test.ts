import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DiscoveryScanner, createDiscoveryScanner } from "../../src/task/discovery/scanner.ts";

function makeTempDir(): string {
  const dir = join(tmpdir(), `converge-test-discovery-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

const JS_TEST_MD = [
  "---",
  "name: api-check",
  "type: js",
  "args:",
  "  endpoint: string",
  "---",
  "context.assert(context.inputs.length > 0, \"No input files\");",
].join("\n");

describe("test-discovery", () => {
  it("discovers .test.md files and builds a test registry", async () => {
    const projectDir = makeTempDir();
    try {
      writeTestMd(projectDir, ".converge/playbooks/my-playbook/tests/freshness.test.md", CMD_TEST_MD);

      const scanner = new DiscoveryScanner(
        { tests: [".converge/playbooks/*/tests/*.test.md"] },
        projectDir,
      );
      const result = await scanner.scan();

      expect(result.testRegistry).toBeDefined();
      expect(result.testRegistry!.has("freshness")).toBe(true);
      expect(result.testRegistry!.get("freshness")!.type).toBe("cmd");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("detects duplicate test names", async () => {
    const projectDir = makeTempDir();
    try {
      writeTestMd(projectDir, ".converge/playbooks/my-playbook/tests/freshness.test.md", CMD_TEST_MD);
      writeTestMd(projectDir, ".converge/playbooks/other-playbook/tests/freshness.test.md", CMD_TEST_MD);

      const scanner = new DiscoveryScanner(
        { tests: [".converge/playbooks/*/tests/*.test.md"] },
        projectDir,
      );
      const result = await scanner.scan();

      // Registry should still contain the first definition
      expect(result.testRegistry!.has("freshness")).toBe(true);
      // But an error should be recorded for the duplicate
      const dupErrors = result.errors.filter((e) => e.error.includes("Duplicate test name"));
      expect(dupErrors.length).toBe(1);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("parses js test definitions", async () => {
    const projectDir = makeTempDir();
    try {
      writeTestMd(projectDir, ".converge/playbooks/my-playbook/tests/api-check.test.md", JS_TEST_MD);

      const scanner = new DiscoveryScanner(
        { tests: [".converge/playbooks/*/tests/*.test.md"] },
        projectDir,
      );
      const result = await scanner.scan();

      expect(result.testRegistry!.has("api-check")).toBe(true);
      expect(result.testRegistry!.get("api-check")!.type).toBe("js");
      expect(result.testRegistry!.get("api-check")!.args).toEqual({ endpoint: { type: "string" } });
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("records parse errors for invalid .test.md files", async () => {
    const projectDir = makeTempDir();
    try {
      writeTestMd(projectDir, ".converge/playbooks/my-playbook/tests/bad.test.md", [
        "---",
        "type: cmd",
        "---",
        "echo no name field",
      ].join("\n"));

      const scanner = new DiscoveryScanner(
        { tests: [".converge/playbooks/*/tests/*.test.md"] },
        projectDir,
      );
      const result = await scanner.scan();

      const parseErrors = result.errors.filter((e) => e.file.endsWith(".test.md"));
      expect(parseErrors.length).toBe(1);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});

describe("loader-libraries", () => {
  it("expandTestRefs wires test registry into the load pipeline", async () => {
    // This test verifies the integration point: when a task has type:"test"
    // checks and a test registry is available, the expander resolves them.
    // The actual wire-in happens in TaskTree.load() which calls
    // expandUnitTestRefs on each unit after discovery.
    //
    // We verify by checking that the expander function exists and
    // correctly resolves test refs when given a registry, and that
    // DiscoveryScanner now produces a testRegistry in its results.
    const { expandTestRefs } = await import("../../src/config/test-expander.ts");
    expect(expandTestRefs).toBeDefined();

    // Verify that the scanner produces testRegistry when .test.md files exist
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
      expect(result.testRegistry!.size).toBeGreaterThan(0);

      // The testRegistry must be usable with expandTestRefs
      const task = {
        id: "my-task",
        checks: [
          { type: "test" as const, name: "freshness", args: { path: "out.txt" } },
        ],
      };
      const expanded = expandTestRefs(task, result.testRegistry!);
      expect(expanded.checks).toHaveLength(1);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});

describe("createDiscoveryScanner", () => {
  it("creates a scanner with default test patterns", () => {
    const scanner = createDiscoveryScanner({}, "/tmp/test-project");
    expect(scanner).toBeInstanceOf(DiscoveryScanner);
  });
});
