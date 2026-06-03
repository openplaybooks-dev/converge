import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JournalStore } from "../../src/workers/journal-store.js";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("JournalStore", () => {
  let store: JournalStore;
  let journalDir: string;

  beforeEach(() => {
    journalDir = join(tmpdir(), `journal-test-${Date.now()}`);
    store = new JournalStore(journalDir);
  });

  afterEach(() => {
    if (existsSync(journalDir)) {
      rmSync(journalDir, { recursive: true, force: true });
    }
  });

  describe("append", () => {
    it("should append an event to the tasks journal", async () => {
      await store.append("tasks", {
        taskId: "task-1",
        status: "running",
        timestamp: Date.now(),
      });

      const events = await store.readAll("tasks");
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ taskId: "task-1", status: "running" });
    });

    it("should append events in order", async () => {
      await store.append("tasks", {
        taskId: "task-1",
        status: "pending",
        ts: 1,
      });
      await store.append("tasks", {
        taskId: "task-2",
        status: "running",
        ts: 2,
      });
      await store.append("tasks", {
        taskId: "task-1",
        status: "completed",
        ts: 3,
      });

      const events = await store.readAll("tasks");
      expect(events).toHaveLength(3);
      expect(events.map((e: any) => e.ts)).toEqual([1, 2, 3]);
    });

    it("should append to different journals", async () => {
      await store.append("tasks", { taskId: "task-1", status: "running" });
      await store.append("leases", { leaseId: "lease-1", taskId: "task-1" });
      await store.append("workers", { workerId: "worker-1", status: "active" });

      expect((await store.readAll("tasks")).length).toBe(1);
      expect((await store.readAll("leases")).length).toBe(1);
      expect((await store.readAll("workers")).length).toBe(1);
    });
  });

  describe("readAll", () => {
    it("should return empty array for non-existent journal", async () => {
      const events = await store.readAll("nonexistent");
      expect(events).toEqual([]);
    });

    it("should parse JSONL correctly", async () => {
      await store.append("tasks", { a: 1 });
      await store.append("tasks", { b: 2 });

      const events = await store.readAll("tasks");
      expect(events).toEqual([{ a: 1 }, { b: 2 }]);
    });
  });

  describe("replay", () => {
    it("should derive current state from journal entries", async () => {
      // Simulate a task lifecycle
      await store.append("tasks", {
        taskId: "task-1",
        status: "pending",
        ts: 1,
      });
      await store.append("tasks", {
        taskId: "task-1",
        status: "running",
        ts: 2,
      });
      await store.append("tasks", {
        taskId: "task-1",
        status: "completed",
        ts: 3,
      });

      const state = await store.replay("tasks", "taskId");

      expect((state as Map<string, any>).get("task-1")?.status).toBe(
        "completed",
      );
    });

    it("should handle multiple tasks", async () => {
      await store.append("tasks", {
        taskId: "task-1",
        status: "completed",
        ts: 1,
      });
      await store.append("tasks", {
        taskId: "task-2",
        status: "running",
        ts: 2,
      });

      const state = await store.replay("tasks", "taskId");

      expect((state as Map<string, any>).get("task-1")?.status).toBe(
        "completed",
      );
      expect((state as Map<string, any>).get("task-2")?.status).toBe("running");
    });
  });

  describe("persistence", () => {
    it("should persist events to disk and survive reload", async () => {
      await store.append("tasks", { taskId: "task-1", status: "running" });

      // Create a new store pointing to the same directory
      const store2 = new JournalStore(journalDir);
      const events = await store2.readAll("tasks");

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ taskId: "task-1", status: "running" });
    });

    it("should create journal directory if it doesn't exist", async () => {
      const freshDir = join(tmpdir(), `journal-fresh-${Date.now()}`);

      expect(existsSync(freshDir)).toBe(false);

      const freshStore = new JournalStore(freshDir);
      await freshStore.append("tasks", { test: true });

      expect(existsSync(freshDir)).toBe(true);

      rmSync(freshDir, { recursive: true, force: true });
    });
  });

  describe("deriveManifest", () => {
    it("should derive a manifest from journal state", async () => {
      await store.append("tasks", {
        taskId: "task-1",
        status: "completed",
        ts: 1,
      });
      await store.append("tasks", {
        taskId: "task-2",
        status: "running",
        ts: 2,
      });
      await store.append("leases", {
        leaseId: "lease-1",
        taskId: "task-2",
        workerId: "worker-1",
      });

      const manifest = await store.deriveManifest({
        tasksKey: "taskId",
        leasesKey: "leaseId",
      });

      expect(manifest.tasks.get("task-1")?.status).toBe("completed");
      expect(manifest.tasks.get("task-2")?.status).toBe("running");
      expect(manifest.leases.get("lease-1")?.workerId).toBe("worker-1");
    });
  });
});
