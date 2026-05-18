/**
 * `converge reset` — journal as source of truth.
 *
 * Deletes journal state at one of three scopes:
 *   --all                       → .converge/journal/
 *   <playbook>                  → .converge/journal/<playbook>/
 *   <playbook> <taskPath>       → .converge/journal/<playbook>/tasks/<taskPath>/
 *
 * Spawned descendants live inside the task dir and go with it.
 * Paths are guarded: no traversal, no structural markers, no outside-journal targets.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

let ROOT: string;

function plant(path: string, body: string) {
  mkdirSync(path.substring(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, body);
}

function runCli(
  args: string[],
): { ok: boolean; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, stdout, stderr: "" };
  } catch (err: any) {
    return {
      ok: false,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
    };
  }
}

function seedFixture(root: string) {
  // pb-a: parent (with spawned descendants) + lone
  plant(
    join(root, ".converge/journal/pb-a/tasks/parent/checkpoint.json"),
    "{}",
  );
  plant(
    join(
      root,
      ".converge/journal/pb-a/tasks/parent/spawned/spawn-a/checkpoint.json",
    ),
    "{}",
  );
  plant(
    join(
      root,
      ".converge/journal/pb-a/tasks/parent/spawned/spawn-b/checkpoint.json",
    ),
    "{}",
  );
  plant(
    join(root, ".converge/journal/pb-a/tasks/lone/checkpoint.json"),
    "{}",
  );
  // pb-b: unrelated — should survive pb-a operations
  plant(
    join(root, ".converge/journal/pb-b/tasks/other/checkpoint.json"),
    "{}",
  );
}

describe("converge reset", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge build' first.`,
      );
    }
  });

  beforeEach(() => {
    ROOT = join(
      tmpdir(),
      `converge-reset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    rmSync(ROOT, { recursive: true, force: true });
    mkdirSync(ROOT, { recursive: true });
    seedFixture(ROOT);
  });

  it("--all wipes the entire journal root", () => {
    const r = runCli(["reset", "--all", "--dir", ROOT]);
    expect(r.ok).toBe(true);
    expect(existsSync(join(ROOT, ".converge/journal"))).toBe(false);
  });

  it("<playbook> wipes only that playbook's journal", () => {
    const r = runCli(["reset", "pb-a", "--dir", ROOT]);
    expect(r.ok).toBe(true);
    expect(existsSync(join(ROOT, ".converge/journal/pb-a"))).toBe(false);
    // pb-b untouched
    expect(
      existsSync(join(ROOT, ".converge/journal/pb-b/tasks/other/checkpoint.json")),
    ).toBe(true);
  });

  it("<playbook> <taskPath> wipes the task subtree including spawned descendants", () => {
    const r = runCli(["reset", "pb-a", "parent", "--dir", ROOT]);
    expect(r.ok).toBe(true);
    // The parent dir and everything under it (including spawned/*) is gone
    expect(
      existsSync(join(ROOT, ".converge/journal/pb-a/tasks/parent")),
    ).toBe(false);
    // Sibling task in the same playbook survives
    expect(
      existsSync(join(ROOT, ".converge/journal/pb-a/tasks/lone/checkpoint.json")),
    ).toBe(true);
    // Unrelated playbook survives
    expect(
      existsSync(join(ROOT, ".converge/journal/pb-b/tasks/other/checkpoint.json")),
    ).toBe(true);
  });

  it("task-level reset targets a nested spawn directly (parent/child)", () => {
    // Seed a deeper nest: pb-a/parent2 with a spawned-of-spawned grandchild.
    plant(
      join(
        ROOT,
        ".converge/journal/pb-a/tasks/parent2/spawned/child/checkpoint.json",
      ),
      "{}",
    );
    plant(
      join(
        ROOT,
        ".converge/journal/pb-a/tasks/parent2/spawned/child/spawned/grand/checkpoint.json",
      ),
      "{}",
    );

    const r = runCli(["reset", "pb-a", "parent2/child", "--dir", ROOT]);
    expect(r.ok).toBe(true);
    // The targeted subtree (child + its spawned grand) is gone.
    expect(
      existsSync(
        join(ROOT, ".converge/journal/pb-a/tasks/parent2/spawned/child"),
      ),
    ).toBe(false);
    // parent2 itself survives (task-level reset is precise to the chosen level).
    expect(
      existsSync(join(ROOT, ".converge/journal/pb-a/tasks/parent2")),
    ).toBe(true);
  });

  it("refuses paths containing the structural markers 'tasks' or 'spawned'", () => {
    const r1 = runCli(["reset", "pb-a", "tasks/parent", "--dir", ROOT]);
    expect(r1.ok).toBe(false);
    expect(r1.stderr).toMatch(/Structural marker "tasks"/);

    const r2 = runCli(["reset", "pb-a", "parent/spawned/spawn-a", "--dir", ROOT]);
    expect(r2.ok).toBe(false);
    expect(r2.stderr).toMatch(/Structural marker "spawned"/);

    // And the fixture was NOT touched.
    expect(
      existsSync(join(ROOT, ".converge/journal/pb-a/tasks/parent/checkpoint.json")),
    ).toBe(true);
  });

  it("refuses path traversal in taskPath", () => {
    const r = runCli(["reset", "pb-a", "../../etc", "--dir", ROOT]);
    expect(r.ok).toBe(false);
    // Anything outside journal root must be refused — fixture intact.
    expect(
      existsSync(join(ROOT, ".converge/journal/pb-a/tasks/parent/checkpoint.json")),
    ).toBe(true);
  });

  it("refuses a playbook name containing a slash", () => {
    const r = runCli(["reset", "pb/a", "--dir", ROOT]);
    expect(r.ok).toBe(false);
    expect(r.stderr).toMatch(/Invalid playbook name/);
  });

  it("treats missing targets as a no-op (graceful message, exit 0)", () => {
    const r1 = runCli(["reset", "ghost-playbook", "--dir", ROOT]);
    expect(r1.ok).toBe(true);
    expect(r1.stdout).toMatch(/nothing to reset/);

    const r2 = runCli(["reset", "pb-a", "ghost-task", "--dir", ROOT]);
    expect(r2.ok).toBe(true);
    expect(r2.stdout).toMatch(/nothing to reset/);
  });

  it("requires an explicit scope (no args prints usage, exits non-zero)", () => {
    const r = runCli(["reset", "--dir", ROOT]);
    expect(r.ok).toBe(false);
    expect(r.stderr).toMatch(/Usage:/);
  });
});
