/**
 * RFC 0004 — Tests for the partitioned-journal pure helpers.
 */
import { describe, it, expect } from "vitest";
import {
  partitionForTimestamp,
  shouldRotate,
  indexRow,
  DEFAULT_ROTATION_POLICY,
  type JournalEvent,
} from "../../src/journal/partition.ts";

const DAY = 24 * 60 * 60 * 1000;
const T_2026_05_19 = Date.UTC(2026, 4, 19, 12, 0, 0); // May 19 noon UTC
const T_2026_05_20 = T_2026_05_19 + DAY;
const T_2026_05_19_LATE = Date.UTC(2026, 4, 19, 23, 59, 59);

describe("partitionForTimestamp", () => {
  it("returns YYYY-MM-DD.jsonl in UTC", () => {
    expect(partitionForTimestamp(T_2026_05_19)).toBe("2026-05-19.jsonl");
  });

  it("rolls over at UTC midnight", () => {
    expect(partitionForTimestamp(T_2026_05_19_LATE)).toBe("2026-05-19.jsonl");
    expect(partitionForTimestamp(T_2026_05_19_LATE + 1000)).toBe("2026-05-20.jsonl");
  });

  it("pads single-digit month/day to two digits", () => {
    const t = Date.UTC(2026, 0, 3, 0, 0, 0); // 2026-01-03
    expect(partitionForTimestamp(t)).toBe("2026-01-03.jsonl");
  });

  it("throws on NaN / invalid ts", () => {
    expect(() => partitionForTimestamp(Number.NaN)).toThrow();
  });
});

describe("shouldRotate", () => {
  it("returns false when active.jsonl is empty (first write)", () => {
    expect(shouldRotate({
      activeBytes: 0,
      activeFirstTs: null,
      nextEventTs: T_2026_05_19,
    })).toBe(false);
  });

  it("rotates when activeBytes >= maxBytes", () => {
    expect(shouldRotate({
      activeBytes: DEFAULT_ROTATION_POLICY.maxBytes,
      activeFirstTs: T_2026_05_19,
      nextEventTs: T_2026_05_19 + 1000,
    })).toBe(true);
  });

  it("does not rotate when below maxBytes and same UTC day", () => {
    expect(shouldRotate({
      activeBytes: 1024,
      activeFirstTs: T_2026_05_19,
      nextEventTs: T_2026_05_19_LATE,
    })).toBe(false);
  });

  it("rotates on UTC day boundary when rotateDaily is true (default)", () => {
    expect(shouldRotate({
      activeBytes: 1024,
      activeFirstTs: T_2026_05_19,
      nextEventTs: T_2026_05_20,
    })).toBe(true);
  });

  it("does NOT rotate on day boundary when rotateDaily is false", () => {
    expect(shouldRotate({
      activeBytes: 1024,
      activeFirstTs: T_2026_05_19,
      nextEventTs: T_2026_05_20,
      policy: { maxBytes: 50_000_000, rotateDaily: false },
    })).toBe(false);
  });

  it("supports a custom maxBytes ceiling", () => {
    expect(shouldRotate({
      activeBytes: 1024,
      activeFirstTs: T_2026_05_19,
      nextEventTs: T_2026_05_19 + 1000,
      policy: { maxBytes: 1024, rotateDaily: false },
    })).toBe(true);
  });
});

describe("indexRow", () => {
  const ev: JournalEvent = {
    ts: T_2026_05_19,
    taskId: "002-foo",
    eventType: "TASK_ATTEMPT_START",
  };

  it("builds a row with required fields", () => {
    const row = indexRow(ev, "2026-05-19.jsonl", 0, 100);
    expect(row).toEqual({
      ts: T_2026_05_19,
      taskId: "002-foo",
      eventType: "TASK_ATTEMPT_START",
      partition: "2026-05-19.jsonl",
      offset: 0,
      length: 100,
    });
  });

  it("includes errorClass when present", () => {
    const row = indexRow(
      { ...ev, eventType: "CLAUDEFN_FAILED", errorClass: "transient" },
      "active.jsonl",
      100,
      80,
    );
    expect(row.errorClass).toBe("transient");
  });

  it("rejects negative offset", () => {
    expect(() => indexRow(ev, "active.jsonl", -1, 1)).toThrow(/offset/);
  });

  it("rejects non-positive length", () => {
    expect(() => indexRow(ev, "active.jsonl", 0, 0)).toThrow(/length/);
    expect(() => indexRow(ev, "active.jsonl", 0, -5)).toThrow(/length/);
  });
});
