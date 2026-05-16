/**
 * Playbook sync — detectFileChanges with per-file content hashing.
 *
 * Before iter-11, the `modified` array was always empty because
 * PlaybookHashInfo only carried file paths. Operators got a misleading
 * change report: added/deleted accurate, modified silently broken.
 *
 * What's under test:
 *   - calculatePlaybookHash populates fileHashes
 *   - detectFileChanges identifies content changes via fileHashes
 *   - Same path + same content yields same per-file hash (determinism)
 *   - Legacy snapshots without fileHashes degrade gracefully (no throw,
 *     modified stays empty, add/delete still accurate)
 *   - Top-level rollup hash still flips on any content change
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  calculatePlaybookHash,
  type PlaybookHashInfo,
} from "../../src/playbook/hash.ts";
import {
  checkPlaybookStatus,
  detectFileChanges,
  syncJournalHash,
} from "../../src/playbook/sync.ts";

function plant(dir: string, rel: string, content: string): void {
  const full = join(dir, rel);
  mkdirSync(full.substring(0, full.lastIndexOf("/")), { recursive: true });
  writeFileSync(full, content, "utf-8");
}

describe("playbook sync — per-file content hashing", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-pbsync-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("calculatePlaybookHash populates fileHashes for every file", async () => {
    plant(workspace, "playbook.yml", "name: test\n");
    plant(workspace, "tasks/001/TASK.md", "---\nid: 001\n---\n");
    plant(workspace, "tasks/002/TASK.md", "---\nid: 002\n---\n");

    const info = await calculatePlaybookHash(workspace);
    expect(info.files.sort()).toEqual([
      "playbook.yml",
      "tasks/001/TASK.md",
      "tasks/002/TASK.md",
    ]);
    expect(info.fileHashes).toBeDefined();
    for (const f of info.files) {
      expect(typeof info.fileHashes![f]).toBe("string");
      expect(info.fileHashes![f]).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("same content → same per-file hash; different content → different hash", async () => {
    plant(workspace, "a.txt", "hello");
    plant(workspace, "b.txt", "hello");
    plant(workspace, "c.txt", "world");

    const info = await calculatePlaybookHash(workspace);
    // a.txt and b.txt share content but differ in path → different
    // per-file hash (path is part of the digest input by design).
    expect(info.fileHashes!["a.txt"]).not.toBe(info.fileHashes!["b.txt"]);
    expect(info.fileHashes!["a.txt"]).not.toBe(info.fileHashes!["c.txt"]);

    // Recomputing yields the same hashes (determinism).
    const again = await calculatePlaybookHash(workspace);
    expect(again.fileHashes).toEqual(info.fileHashes);
  });

  it("detectFileChanges identifies modified files via fileHashes", async () => {
    plant(workspace, "task.md", "v1");
    const oldInfo = await calculatePlaybookHash(workspace);

    // Edit in place — path unchanged, content changed.
    writeFileSync(join(workspace, "task.md"), "v2-modified", "utf-8");
    const newInfo = await calculatePlaybookHash(workspace);

    const changes = detectFileChanges(oldInfo, newInfo);
    expect(changes.added).toEqual([]);
    expect(changes.deleted).toEqual([]);
    expect(changes.modified).toEqual(["task.md"]);
  });

  it("detectFileChanges separates added, deleted, and modified into the right buckets", async () => {
    plant(workspace, "stable.md", "unchanged");
    plant(workspace, "edit-me.md", "v1");
    plant(workspace, "remove-me.md", "doomed");
    const oldInfo = await calculatePlaybookHash(workspace);

    // Modify, delete, and add files.
    writeFileSync(join(workspace, "edit-me.md"), "v2", "utf-8");
    rmSync(join(workspace, "remove-me.md"));
    plant(workspace, "added.md", "new");
    const newInfo = await calculatePlaybookHash(workspace);

    const changes = detectFileChanges(oldInfo, newInfo);
    expect(changes.added).toEqual(["added.md"]);
    expect(changes.deleted).toEqual(["remove-me.md"]);
    expect(changes.modified).toEqual(["edit-me.md"]);
  });

  it("legacy snapshots without fileHashes degrade gracefully (modified stays empty, no throw)", async () => {
    plant(workspace, "task.md", "v1");
    const oldInfo = await calculatePlaybookHash(workspace);
    // Strip fileHashes to simulate a snapshot written before iter-11.
    const legacyOld: PlaybookHashInfo = {
      hash: oldInfo.hash,
      timestamp: oldInfo.timestamp,
      files: oldInfo.files,
      // fileHashes intentionally omitted
    };

    writeFileSync(join(workspace, "task.md"), "v2", "utf-8");
    const newInfo = await calculatePlaybookHash(workspace);

    // No throw, modified empty, but add/delete still works.
    const changes = detectFileChanges(legacyOld, newInfo);
    expect(changes.added).toEqual([]);
    expect(changes.deleted).toEqual([]);
    expect(changes.modified).toEqual([]); // graceful degradation
  });

  it("top-level rollup hash still flips when any content changes", async () => {
    plant(workspace, "task.md", "v1");
    const v1 = await calculatePlaybookHash(workspace);

    writeFileSync(join(workspace, "task.md"), "v2", "utf-8");
    const v2 = await calculatePlaybookHash(workspace);

    expect(v1.hash).not.toBe(v2.hash);
    // And the per-file hash for the changed file also differs.
    expect(v1.fileHashes!["task.md"]).not.toBe(v2.fileHashes!["task.md"]);
  });
});

describe("playbook sync — checkPlaybookStatus corruption resilience", () => {
  let workspace: string;
  let playbookDir: string;
  let journalDir: string;
  let warnSpy: ReturnType<typeof spyConsoleWarn>;

  function spyConsoleWarn() {
    const original = console.warn;
    const calls: string[] = [];
    console.warn = (...args: unknown[]) => {
      calls.push(args.map(String).join(" "));
    };
    return {
      calls,
      restore: () => {
        console.warn = original;
      },
    };
  }

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-pbcorrupt-"));
    playbookDir = join(workspace, "playbook");
    journalDir = join(workspace, "journal");
    mkdirSync(playbookDir, { recursive: true });
    mkdirSync(journalDir, { recursive: true });
    plant(playbookDir, "task.md", "v1");
    warnSpy = spyConsoleWarn();
  });

  afterEach(() => {
    warnSpy.restore();
    rmSync(workspace, { recursive: true, force: true });
  });

  it("returns status: 'new' when .playbook-hash is missing", async () => {
    const result = await checkPlaybookStatus(playbookDir, journalDir);
    expect(result.status).toBe("new");
    expect(result.journalHash).toBeNull();
  });

  it("returns status: 'up-to-date' when .playbook-hash matches current", async () => {
    await syncJournalHash(playbookDir, journalDir);
    const result = await checkPlaybookStatus(playbookDir, journalDir);
    expect(result.status).toBe("up-to-date");
    expect(result.journalHash).toBe(result.currentHash);
  });

  it("returns status: 'outdated' when playbook content changes after sync", async () => {
    await syncJournalHash(playbookDir, journalDir);
    writeFileSync(join(playbookDir, "task.md"), "v2-changed", "utf-8");
    const result = await checkPlaybookStatus(playbookDir, journalDir);
    expect(result.status).toBe("outdated");
    expect(result.changes?.modified).toEqual(["task.md"]);
  });

  it("treats corrupted JSON as 'new' rather than throwing", async () => {
    // Plant a corrupt .playbook-hash (truncated mid-write, e.g.).
    writeFileSync(
      join(journalDir, ".playbook-hash"),
      "{ this is not valid json",
      "utf-8",
    );
    // Must not throw.
    const result = await checkPlaybookStatus(playbookDir, journalDir);
    expect(result.status).toBe("new");
    expect(result.journalHash).toBeNull();
    // Warning surfaced so the operator sees the degradation.
    expect(warnSpy.calls.some((c) => /unreadable/.test(c))).toBe(true);
  });

  it("treats shape-mismatched JSON (no `hash` field) as 'new'", async () => {
    writeFileSync(
      join(journalDir, ".playbook-hash"),
      JSON.stringify({ unrelated: "payload" }),
      "utf-8",
    );
    const result = await checkPlaybookStatus(playbookDir, journalDir);
    expect(result.status).toBe("new");
    expect(warnSpy.calls.some((c) => /shape mismatch|unreadable/.test(c))).toBe(true);
  });

  it("recovers cleanly after corruption: next syncJournalHash makes it up-to-date again", async () => {
    writeFileSync(
      join(journalDir, ".playbook-hash"),
      "garbage",
      "utf-8",
    );
    // Read returns 'new', operator runs sync, next read should be up-to-date.
    let result = await checkPlaybookStatus(playbookDir, journalDir);
    expect(result.status).toBe("new");
    await syncJournalHash(playbookDir, journalDir);
    result = await checkPlaybookStatus(playbookDir, journalDir);
    expect(result.status).toBe("up-to-date");
  });
});
