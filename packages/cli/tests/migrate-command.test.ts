/**
 * `converge migrate --rfc=0030` — drop legacy inventory copies once the
 * canonical EXPANDED.md counterpart exists per RFC 0030.
 *
 * This suite tests the `migrate0030` core directly (the public
 * function the CLI dispatches to), without spawning a subprocess.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { migrate0030 } from "../src/commands-migrate.ts";

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "converge-migrate-test-"));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

/** Seed a legacy inventory copy + (optionally) its EXPANDED.md counterpart. */
function seedChild(
  workspace: string,
  playbook: string,
  parent: string,
  childId: string,
  withExpanded: boolean,
): void {
  // Legacy inventory copy
  const legacyDir = join(workspace, ".converge/inventory", playbook, "spawned", childId);
  mkdirSync(legacyDir, { recursive: true });
  writeFileSync(join(legacyDir, "TASK.md"), `---\nid: ${childId}\n---\nlegacy\n`);

  if (withExpanded) {
    // The execDir for the parent task lives at
    // .converge/journal/<pb>/tasks/<parent>/exec/. spawn/<childId>/
    // EXPANDED.md is the canonical contract per RFC 0024.
    const execSpawnDir = join(
      workspace,
      ".converge/journal",
      playbook,
      "tasks",
      parent,
      "exec",
      "spawn",
      childId,
    );
    mkdirSync(execSpawnDir, { recursive: true });
    writeFileSync(
      join(execSpawnDir, "EXPANDED.md"),
      `---\nid: ${childId}\n---\ncanonical\n`,
    );
  }
}

describe("migrate0030", () => {
  it("deletes legacy copies whose EXPANDED.md counterpart exists", async () => {
    seedChild(workspace, "pb1", "parent-1", "child-a", true);
    seedChild(workspace, "pb1", "parent-1", "child-b", true);

    const reports = await migrate0030(workspace, null, false);

    expect(reports).toHaveLength(1);
    expect(reports[0].playbook).toBe("pb1");
    expect(reports[0].inspected).toBe(2);
    expect(reports[0].deleted.sort()).toEqual(["child-a", "child-b"]);
    expect(reports[0].orphans).toHaveLength(0);

    // Legacy copies gone.
    expect(
      existsSync(
        join(workspace, ".converge/inventory/pb1/spawned/child-a/TASK.md"),
      ),
    ).toBe(false);
    expect(
      existsSync(
        join(workspace, ".converge/inventory/pb1/spawned/child-b/TASK.md"),
      ),
    ).toBe(false);
    // EXPANDED.md counterparts untouched.
    expect(
      existsSync(
        join(
          workspace,
          ".converge/journal/pb1/tasks/parent-1/exec/spawn/child-a/EXPANDED.md",
        ),
      ),
    ).toBe(true);
  });

  it("refuses to delete orphans (legacy copy with no EXPANDED.md counterpart)", async () => {
    // child-a has both; child-b is an orphan (legacy-only).
    seedChild(workspace, "pb1", "parent-1", "child-a", true);
    seedChild(workspace, "pb1", "parent-1", "child-b", false);

    const reports = await migrate0030(workspace, null, false);

    expect(reports[0].inspected).toBe(2);
    expect(reports[0].deleted).toEqual(["child-a"]);
    expect(reports[0].orphans).toEqual(["child-b"]);

    // The orphan stays on disk — would be data loss to delete it
    // without a counterpart contract.
    expect(
      existsSync(
        join(workspace, ".converge/inventory/pb1/spawned/child-b/TASK.md"),
      ),
    ).toBe(true);
  });

  it("dry mode reports but does not mutate", async () => {
    seedChild(workspace, "pb1", "parent-1", "child-a", true);

    const reports = await migrate0030(workspace, null, true);

    expect(reports[0].deleted).toEqual(["child-a"]);
    // Despite the "deleted" count, the file is still on disk.
    expect(
      existsSync(
        join(workspace, ".converge/inventory/pb1/spawned/child-a/TASK.md"),
      ),
    ).toBe(true);
  });

  it("scope: --playbook filter limits the scan to one playbook", async () => {
    seedChild(workspace, "pb1", "parent-1", "child-a", true);
    seedChild(workspace, "pb2", "parent-1", "child-b", true);

    const reports = await migrate0030(workspace, "pb1", false);

    // pb2 was excluded by filter.
    expect(reports.map((r) => r.playbook)).toEqual(["pb1"]);
    expect(reports[0].deleted).toEqual(["child-a"]);
    // pb2's legacy copy untouched (was outside the filter).
    expect(
      existsSync(
        join(workspace, ".converge/inventory/pb2/spawned/child-b/TASK.md"),
      ),
    ).toBe(true);
  });

  it("treats an empty EXPANDED.md as an orphan (no real counterpart)", async () => {
    // The migration must not silently lose contracts to zero-byte
    // counterparts — those signal a partial/failed expansion, not a
    // valid contract file.
    seedChild(workspace, "pb1", "parent-1", "child-a", true);
    // Truncate the counterpart.
    writeFileSync(
      join(
        workspace,
        ".converge/journal/pb1/tasks/parent-1/exec/spawn/child-a/EXPANDED.md",
      ),
      "",
    );

    const reports = await migrate0030(workspace, null, false);

    expect(reports[0].orphans).toEqual(["child-a"]);
    expect(reports[0].deleted).toEqual([]);
  });

  it("returns empty when there's no inventory dir at all", async () => {
    const reports = await migrate0030(workspace, null, false);
    expect(reports).toEqual([]);
  });
});
