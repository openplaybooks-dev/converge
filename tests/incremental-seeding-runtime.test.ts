import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..");
const FIXTURE_DIR = resolve(__dirname, "test-incremental-seeding");

describe("test-incremental-seeding runtime fixture", () => {
  it("runs all three playbooks end-to-end", () => {
    const result = spawnSync("bash", ["run-test.sh"], {
      cwd: FIXTURE_DIR,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    const out = (result.stdout || "") + (result.stderr || "");
    expect(result.status, out).toBe(0);
    expect(out).toContain("RESULTS:");
    expect(out).toContain("0 failed");
  });
});
