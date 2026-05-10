import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(__dirname, "..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

describe("CLI help", () => {
  it("prints the top-level help contract from the built executable", () => {
    const result = spawnSync("node", [CLI, "--help"], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const output = `${result.stdout || ""}${result.stderr || ""}`;

    expect(result.status, output).toBe(0);
    expect(output).toContain("USAGE");
    expect(output).toContain("EXECUTE");
    expect(output).toContain("INSPECT");
    expect(output).toContain("GLOBAL OPTIONS");
  });
});
