/**
 * Red — parameterized migration redirect test.
 * Each v1 command should exit non-zero with a v2 hint on stderr.
 * Most rows aren't yet wired through MIGRATION_REDIRECTS — this is the red slice.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const fixtureDir = resolve(__dirname, "../fixtures/minimal-playbook");

const MIGRATION_ROWS = [
  // spec §10 — v1 verify → v2 debug
  { oldCommand: ["verify"], hint: /use:?\s+converge\s+debug/i },
  {
    oldCommand: ["verify", "--fix"],
    hint: /use:?\s+converge\s+debug\s+--fix/i,
  },
  // spec §10 — v1 status → v2 list / show graph
  { oldCommand: ["status"], hint: /use:?\s+converge\s+(list|show graph)/i },
  {
    oldCommand: ["status", "--only-incomplete"],
    hint: /use:?\s+converge\s+list/i,
  },
  // spec §10 — v1 reset → v2 clean
  { oldCommand: ["reset", "pb", "task"], hint: /use:?\s+converge\s+clean/i },
  // spec §10 — v1 playbook → v2 list/inspect/show
  {
    oldCommand: ["playbook", "list"],
    hint: /use:?\s+converge\s+list\s+--playbooks/i,
  },
  {
    oldCommand: ["playbook", "info", "X"],
    hint: /use:?\s+converge\s+inspect\s+playbook/i,
  },
  {
    oldCommand: ["playbook", "history", "X"],
    hint: /use:?\s+converge\s+show\s+trend/i,
  },
  // spec §10 — v1 skills → v2 deps
  { oldCommand: ["skills", "list"], hint: /use:?\s+converge\s+deps\s+list/i },
  {
    oldCommand: ["skills", "install", "X"],
    hint: /use:?\s+converge\s+deps\s+install/i,
  },
  // spec §10 — v1 cleanup → v2 clean --orphaned
  { oldCommand: ["cleanup"], hint: /use:?\s+converge\s+clean\s+--orphaned/i },
  // spec §10 — v1 plan → v2 init --from-prompt / compile
  {
    oldCommand: ["plan", "goal text"],
    hint: /use:?\s+converge\s+init\s+--from-prompt/i,
  },
  // spec §10 — v1 checkpoint → v2 inspect checkpoint
  {
    oldCommand: ["checkpoint"],
    hint: /use:?\s+converge\s+inspect\s+checkpoint/i,
  },
  // spec §10 — v1 plugins → v2 deps list
  { oldCommand: ["plugins"], hint: /use:?\s+converge\s+deps\s+list/i },
];

describe.each(MIGRATION_ROWS)(
  "redirect for $oldCommand",
  ({ oldCommand, hint }) => {
    beforeAll(() => {
      if (!existsSync(CLI)) {
        throw new Error(
          `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge build' first.`,
        );
      }
    });

    it("exits non-zero with v2 hint on stderr", () => {
      const result = spawnSync("node", [CLI, ...oldCommand], {
        cwd: fixtureDir,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 15000,
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(hint);
    });
  },
);
