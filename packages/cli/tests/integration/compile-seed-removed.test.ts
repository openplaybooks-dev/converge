import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

describe("converge compile --seed", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge build' first.`,
      );
    }
  });

  it("fails with a migration error", () => {
    try {
      execFileSync("node", [CLI, "compile", "--dir", FIXTURE, "--seed"], {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      throw new Error("expected compile --seed to fail");
    } catch (err: any) {
      expect(err.status).toBe(1);
      expect(err.stderr?.toString()).toMatch(/compile --seed.*removed/i);
    }
  });
});
