/**
 * Playbook Journal Tests
 *
 * Tests for playbook journal initialization, trend aggregation, and queries.
 * No separate "executions" — sessions ARE the execution records.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  initPlaybookJournal,
  appendTrend,
  readTrends,
  getPlaybookJournalDir,
} from "../../../src/playbook/journal.ts";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(
    tmpdir(),
    `converge-pj-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

/* ------------------------------------------------------------------ */
/*  Path Helpers                                                       */
/* ------------------------------------------------------------------ */

describe("path helpers", () => {
  it("getPlaybookJournalDir returns journal/{playbook}", () => {
    const dir = getPlaybookJournalDir("/project", "react-app");
    expect(dir).toBe(join("/project", ".converge", "journal", "react-app"));
  });

  it('default playbook uses "default" as name', () => {
    const dir = getPlaybookJournalDir("/project", "default");
    expect(dir).toBe(join("/project", ".converge", "journal", "default"));
  });
});

/* ------------------------------------------------------------------ */
/*  initPlaybookJournal                                                */
/* ------------------------------------------------------------------ */

describe("initPlaybookJournal", () => {
  it("creates playbook journal directory and returns context", async () => {
    const ctx = await initPlaybookJournal(tmpDir, "react-app");

    expect(ctx.playbook).toBe("react-app");

    const pbDir = getPlaybookJournalDir(tmpDir, "react-app");
    expect(existsSync(pbDir)).toBe(true);
  });

  it("creates playbook.json", async () => {
    await initPlaybookJournal(tmpDir, "react-app");

    const playbookJsonPath = join(
      getPlaybookJournalDir(tmpDir, "react-app"),
      "playbook.json",
    );
    expect(existsSync(playbookJsonPath)).toBe(true);

    const json = JSON.parse(await readFile(playbookJsonPath, "utf8"));
    expect(json.name).toBe("react-app");
    expect(json.created).toBeDefined();
  });

  it("does not overwrite existing playbook.json", async () => {
    await initPlaybookJournal(tmpDir, "react-app");
    const path = join(
      getPlaybookJournalDir(tmpDir, "react-app"),
      "playbook.json",
    );
    const first = JSON.parse(await readFile(path, "utf8"));

    await initPlaybookJournal(tmpDir, "react-app");
    const second = JSON.parse(await readFile(path, "utf8"));

    expect(second.created).toBe(first.created);
  });
});

/* ------------------------------------------------------------------ */
/*  appendTrend                                                        */
/* ------------------------------------------------------------------ */

describe("appendTrend", () => {
  it("creates trends.jsonl and appends entry", async () => {
    await initPlaybookJournal(tmpDir, "react-app");

    await appendTrend(tmpDir, "react-app", {
      sessionId: "sess-001",
      timestamp: "2026-04-12T05:00:00Z",
      tasksTotal: 5,
      tasksComplete: 5,
      tasksFailed: 0,
      totalAttempts: 7,
      durationMs: 60000,
    });

    const trendsPath = join(
      getPlaybookJournalDir(tmpDir, "react-app"),
      "trends.jsonl",
    );
    expect(existsSync(trendsPath)).toBe(true);

    const content = await readFile(trendsPath, "utf8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(1);

    const entry = JSON.parse(lines[0]);
    expect(entry.sessionId).toBe("sess-001");
    expect(entry.tasksTotal).toBe(5);
  });

  it("appends multiple entries", async () => {
    await initPlaybookJournal(tmpDir, "react-app");

    await appendTrend(tmpDir, "react-app", {
      sessionId: "sess-001",
      timestamp: "2026-04-12T05:00:00Z",
      tasksTotal: 5,
      tasksComplete: 3,
      tasksFailed: 2,
      totalAttempts: 7,
      durationMs: 60000,
    });

    await appendTrend(tmpDir, "react-app", {
      sessionId: "sess-002",
      timestamp: "2026-04-12T06:00:00Z",
      tasksTotal: 5,
      tasksComplete: 5,
      tasksFailed: 0,
      totalAttempts: 5,
      durationMs: 45000,
    });

    const trendsPath = join(
      getPlaybookJournalDir(tmpDir, "react-app"),
      "trends.jsonl",
    );
    const content = await readFile(trendsPath, "utf8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);
  });

  it("updates playbook.json lastRun and totalRuns", async () => {
    await initPlaybookJournal(tmpDir, "react-app");

    await appendTrend(tmpDir, "react-app", {
      sessionId: "sess-001",
      timestamp: "2026-04-12T05:00:00Z",
      tasksTotal: 1,
      tasksComplete: 1,
      tasksFailed: 0,
      totalAttempts: 1,
      durationMs: 5000,
    });

    const path = join(
      getPlaybookJournalDir(tmpDir, "react-app"),
      "playbook.json",
    );
    const json = JSON.parse(await readFile(path, "utf8"));
    expect(json.lastRun).toBe("2026-04-12T05:00:00Z");
    expect(json.totalRuns).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/*  readTrends                                                         */
/* ------------------------------------------------------------------ */

describe("readTrends", () => {
  it("returns empty array when no trends", async () => {
    const trends = await readTrends(tmpDir, "nonexistent");
    expect(trends).toEqual([]);
  });

  it("reads trend entries", async () => {
    await initPlaybookJournal(tmpDir, "react-app");

    await appendTrend(tmpDir, "react-app", {
      sessionId: "sess-001",
      timestamp: "2026-04-12T05:00:00Z",
      tasksTotal: 5,
      tasksComplete: 3,
      tasksFailed: 2,
      totalAttempts: 7,
      durationMs: 60000,
    });

    const trends = await readTrends(tmpDir, "react-app");
    expect(trends).toHaveLength(1);
    expect(trends[0].sessionId).toBe("sess-001");
    expect(trends[0].tasksTotal).toBe(5);
  });
});
