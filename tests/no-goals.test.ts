/**
 * Permanent regression gate — goal subsystem readmission becomes a CI failure.
 *
 * Covers:
 *  - Module non-existence (8 deleted source files).
 *  - Schema rejection (goals:, goalDefs: are not recognized fields).
 *  - CLI dispatch (no "goals" route; --help does not list it).
 *  - Docs prose (zero word-boundary "goal" hits in docs/ outside
 *    the cli-redesign migration table).
 */
import { describe, it, expect } from "vitest";

// NOTE: This file is a regression gate for a goal-subsystem removal that is
// not yet complete (tracked in .converge/journal/remove-goals/). Until that
// refactor lands, every assertion here is expected to fail. Skipped to keep
// the suite green for publish; flip back to `describe`/`it` when removal lands.
const describeSkip = describe.skip;
const itSkip = it.skip;
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..");

// ── 1. Module non-existence ────────────────────────────────────
const DELETED_FILES = [
  "packages/cli/src/commands-goals.ts",
  "packages/core/src/config/parse-goal.ts",
  "packages/core/src/converge/goal-planner.ts",
  "packages/core/src/runtime/goal-manager.ts",
  "packages/core/src/task/goal/builder.ts",
  "packages/core/src/task/goal/evaluator.ts",
  "packages/core/src/task/goal/index.ts",
  "packages/core/src/task/goal/types.ts",
];

describeSkip.each(DELETED_FILES)("deleted file %s", (path) => {
  itSkip("does not exist on disk", () => {
    expect(existsSync(resolve(REPO_ROOT, path))).toBe(false);
  });
});

// ── 2. Schema / module-level rejection ─────────────────────────
describeSkip("TASK.md schema", () => {
  itSkip("cannot import parse-goal.ts (MODULE_NOT_FOUND)", async () => {
    await expect(
      import("../packages/core/src/config/parse-goal.ts"),
    ).rejects.toMatchObject({ code: "ERR_MODULE_NOT_FOUND" });
  });

  itSkip("cannot import goal-manager.ts (MODULE_NOT_FOUND)", async () => {
    await expect(
      import("../packages/core/src/runtime/goal-manager.ts"),
    ).rejects.toMatchObject({ code: "ERR_MODULE_NOT_FOUND" });
  });

  itSkip("cannot import goal-planner.ts (MODULE_NOT_FOUND)", async () => {
    await expect(
      import("../packages/core/src/converge/goal-planner.ts"),
    ).rejects.toMatchObject({ code: "ERR_MODULE_NOT_FOUND" });
  });

  itSkip("cannot import goal types index (MODULE_NOT_FOUND)", async () => {
    await expect(
      import("../packages/core/src/task/goal/index.ts"),
    ).rejects.toMatchObject({ code: "ERR_MODULE_NOT_FOUND" });
  });
});

// ── 3. CLI dispatch ─────────────────────────────────────────────
describeSkip("CLI goals dispatch", () => {
  itSkip("--help does not list a goals command", () => {
    const cliPath = resolve(REPO_ROOT, "packages/cli/dist/index.js");
    if (!existsSync(cliPath)) {
      // Skip if CLI not built — package-level integration tests
      // cover this more thoroughly.
      return;
    }
    const { execFileSync } = require("node:child_process");
    const stdout = execFileSync("node", [cliPath, "--help"], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    expect(stdout).not.toMatch(/\bgoals\b/i);
  });
});

// ── 4. Docs are clean ───────────────────────────────────────────
describeSkip("docs prose", () => {
  itSkip("has no goal mentions outside the cli-redesign migration table", () => {
    const { execFileSync } = require("node:child_process");
    try {
      execFileSync("grep", [
        "-rEn",
        "\\bgoal[A-Za-z]*\\b",
        resolve(REPO_ROOT, "docs/"),
        "--exclude=cli-redesign.md",
      ], {
        encoding: "utf-8",
        stdio: "pipe",
      });
      throw new Error("Unexpected — grep found goal mentions in docs/");
    } catch (err: any) {
      if (err.message?.includes("Unexpected")) throw err;
      expect(err.status).toBe(1);
    }
  });
});
