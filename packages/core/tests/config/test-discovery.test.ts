import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DiscoveryScanner, createDiscoveryScanner } from "../../src/task/discovery/scanner.ts";

function makeTempDir(): string {
  const dir = join(
    tmpdir(),
    `converge-test-discovery-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("discovery scanner", () => {
  it("does not build a playbook test registry from .test.md files", async () => {
    const projectDir = makeTempDir();
    try {
      const testFile = join(
        projectDir,
        ".converge/playbooks/my-playbook/tests/freshness.test.md",
      );
      mkdirSync(join(testFile, ".."), { recursive: true });
      writeFileSync(
        testFile,
        ["---", "name: freshness", "type: cmd", "---", "test -s out.txt"].join("\n"),
        "utf-8",
      );

      const result = await new DiscoveryScanner({}, projectDir).scan();
      expect("testRegistry" in result).toBe(false);
      expect(result.errors).toEqual([]);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});

describe("createDiscoveryScanner", () => {
  it("creates a scanner with the current discovery defaults", () => {
    const scanner = createDiscoveryScanner({}, "/tmp/test-project");
    expect(scanner).toBeInstanceOf(DiscoveryScanner);
  });
});
