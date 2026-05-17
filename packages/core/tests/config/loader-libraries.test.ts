import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DiscoveryScanner } from "../../src/task/discovery/scanner.ts";

function makeTempDir(): string {
  const dir = join(
    tmpdir(),
    `converge-test-loader-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("loader-libraries", () => {
  it("ignores playbook-local .test.md files during discovery", async () => {
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
      expect(result.files).toEqual([]);
      expect(result.errors).toEqual([]);
      expect("testRegistry" in result).toBe(false);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
