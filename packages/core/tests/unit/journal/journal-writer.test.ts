/**
 * Journal Writer Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  writeGaps,
  logTaskEvent,
  logEpicEvent,
  logProjectEvent,
  getJournalDir,
} from "../../../src/journal/writer.ts";
import {
  readGaps,
  readEvents,
  readGapSummary,
} from "../../../src/journal/reader.ts";
import type { Gap } from "../../../src/gap/types.ts";

describe("Journal Writer", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "journal-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("writeGaps", () => {
    it("should write gaps to YAML file", async () => {
      const gaps: Gap[] = [
        {
          id: "gap-001",
          type: "structural",
          level: "task",
          scope: "01-api.setup-db",
          description: "Database not initialized",
          detected: "2025-01-15T10:00:00.000Z",
          resolved: false,
          checks: ["check-db"],
          severity: "high",
        },
        {
          id: "gap-002",
          type: "semantic",
          level: "task",
          scope: "01-api.setup-db",
          description: "Missing error handling",
          detected: "2025-01-15T10:05:00.000Z",
          resolved: false,
          checks: ["check-error-handling"],
          severity: "medium",
        },
      ];

      await writeGaps(tempDir, "task", "01-api.setup-db", gaps);

      // Read back and verify
      const readGapsResult = await readGaps(tempDir, "task", "01-api.setup-db");
      expect(readGapsResult).toHaveLength(2);
      expect(readGapsResult[0].id).toBe("gap-001");
      expect(readGapsResult[1].id).toBe("gap-002");
    });

    it("should write gap summary with counts", async () => {
      const gaps: Gap[] = [
        {
          id: "gap-001",
          type: "structural",
          level: "epic",
          scope: "01-api",
          description: "Missing tests",
          detected: "2025-01-15T10:00:00.000Z",
          resolved: false,
          checks: ["check-tests"],
          severity: "critical",
        },
        {
          id: "gap-002",
          type: "structural",
          level: "epic",
          scope: "01-api",
          description: "Missing docs",
          detected: "2025-01-15T10:00:00.000Z",
          resolved: false,
          checks: ["check-docs"],
          severity: "low",
        },
      ];

      await writeGaps(tempDir, "epic", "01-api", gaps);

      // Read summary
      const summary = await readGapSummary(tempDir, "epic", "01-api");
      expect(summary).toBeDefined();
      expect(summary!.total).toBe(2);
      expect(summary!.byType.structural).toBe(2);
      expect(summary!.bySeverity.critical).toBe(1);
      expect(summary!.bySeverity.low).toBe(1);
    });

    it("should write empty gaps array", async () => {
      await writeGaps(tempDir, "project", "project", []);

      const readGapsResult = await readGaps(tempDir, "project", "project");
      expect(readGapsResult).toHaveLength(0);

      const summary = await readGapSummary(tempDir, "project", "project");
      expect(summary!.total).toBe(0);
    });
  });

  describe("logTaskEvent", () => {
    it("should log task events to JSONL and human-readable log", async () => {
      await logTaskEvent(
        tempDir,
        "01-api",
        "setup-db",
        "TASK_START",
        "Starting database setup",
        { attempt: 1 },
      );

      await logTaskEvent(
        tempDir,
        "01-api",
        "setup-db",
        "TASK_COMPLETE",
        "Database setup complete",
        { duration: 5000 },
      );

      // Read events
      const events = await readEvents(tempDir, "task", "01-api.setup-db");
      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe("TASK_START");
      expect(events[0].message).toBe("Starting database setup");
      expect(events[0].metadata?.attempt).toBe(1);
      expect(events[1].eventType).toBe("TASK_COMPLETE");
      expect(events[1].message).toBe("Database setup complete");
    });

    it("should log errors", async () => {
      await logTaskEvent(
        tempDir,
        "01-api",
        "setup-db",
        "ERROR",
        "Connection timeout",
        { stack: "Error: Connection timeout\n  at..." },
      );

      const events = await readEvents(tempDir, "task", "01-api.setup-db", {
        eventType: "ERROR",
      });

      expect(events).toHaveLength(1);
      expect(events[0].message).toBe("Connection timeout");
    });
  });

  describe("logEpicEvent", () => {
    it("should log epic events", async () => {
      await logEpicEvent(tempDir, "01-api", "EPIC_START", "Starting API epic");

      const events = await readEvents(tempDir, "epic", "01-api");
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe("EPIC_START");
      expect(events[0].level).toBe("epic");
    });
  });

  describe("logProjectEvent", () => {
    it("should log project events", async () => {
      await logProjectEvent(tempDir, "PROJECT_START", "Starting project");

      const events = await readEvents(tempDir, "project", "project");
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe("PROJECT_START");
      expect(events[0].level).toBe("project");
    });
  });

  describe("getJournalDir", () => {
    it("should return journal directory path", () => {
      const journalDir = getJournalDir("/project/root");
      expect(journalDir).toBe("/project/root/.converge/journal");
    });
  });
});
