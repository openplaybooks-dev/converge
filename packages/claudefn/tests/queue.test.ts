import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GlobalQueue, setDefaultQueue, getDefaultQueue } from "../src/index.js";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "claudefn-queue-test-"));
  setDefaultQueue(null);
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  setDefaultQueue(null);
});

// ─── Construction ────────────────────────────────────────────

describe("GlobalQueue — construction", () => {
  it("creates with default options", () => {
    const q = new GlobalQueue({ stateDir: tempDir });
    expect(q.maxConcurrent).toBe(5);
    expect(q.maxPerMinute).toBe(60);
    expect(q.acquireTimeoutMs).toBe(300_000);
    expect(q.pollIntervalMs).toBe(250);
  });

  it("accepts custom options", () => {
    const q = new GlobalQueue({
      maxConcurrent: 3,
      maxPerMinute: 10,
      stateDir: tempDir,
      acquireTimeoutMs: 5_000,
      pollIntervalMs: 100,
    });
    expect(q.maxConcurrent).toBe(3);
    expect(q.maxPerMinute).toBe(10);
    expect(q.acquireTimeoutMs).toBe(5_000);
    expect(q.pollIntervalMs).toBe(100);
  });

  it("creates state directory if it doesn't exist", () => {
    const dir = join(tempDir, "nested", "queue");
    new GlobalQueue({ stateDir: dir });
    expect(existsSync(dir)).toBe(true);
  });
});

// ─── Acquire / Release ──────────────────────────────────────

describe("GlobalQueue — acquire/release", () => {
  it("acquires and releases a single slot", async () => {
    const q = new GlobalQueue({ stateDir: tempDir, maxConcurrent: 2 });
    const slotId = await q.acquire();
    expect(typeof slotId).toBe("string");
    expect(slotId.length).toBeGreaterThan(0);

    const status = q.status();
    expect(status.activeSlots).toBe(1);

    q.release(slotId);
    const afterRelease = q.status();
    expect(afterRelease.activeSlots).toBe(0);
  });

  it("acquires multiple slots up to maxConcurrent", async () => {
    const q = new GlobalQueue({
      stateDir: tempDir,
      maxConcurrent: 3,
      maxPerMinute: 100,
    });
    const slot1 = await q.acquire();
    const slot2 = await q.acquire();
    const slot3 = await q.acquire();

    const status = q.status();
    expect(status.activeSlots).toBe(3);

    q.release(slot1);
    q.release(slot2);
    q.release(slot3);

    const afterRelease = q.status();
    expect(afterRelease.activeSlots).toBe(0);
  });

  it("blocks when maxConcurrent is reached, unblocks on release", async () => {
    const q = new GlobalQueue({
      stateDir: tempDir,
      maxConcurrent: 1,
      maxPerMinute: 100,
      pollIntervalMs: 20,
      acquireTimeoutMs: 2_000,
    });

    const slot1 = await q.acquire();

    // Start acquiring a second slot — should block
    let slot2Acquired = false;
    const slot2Promise = q.acquire().then((id) => {
      slot2Acquired = true;
      return id;
    });

    // Give it a tick to confirm it's blocked
    await sleep(100);
    expect(slot2Acquired).toBe(false);

    // Release slot1 — slot2 should now acquire
    q.release(slot1);
    const slot2 = await slot2Promise;
    expect(slot2Acquired).toBe(true);

    q.release(slot2);
  });

  it("times out when no slot becomes available", async () => {
    const q = new GlobalQueue({
      stateDir: tempDir,
      maxConcurrent: 1,
      maxPerMinute: 100,
      pollIntervalMs: 20,
      acquireTimeoutMs: 200,
    });

    const slot1 = await q.acquire();

    await expect(q.acquire()).rejects.toThrow(/timed out/i);

    q.release(slot1);
  });

  it("releasing an unknown slotId is safe (no-op)", () => {
    const q = new GlobalQueue({ stateDir: tempDir });
    // Should not throw
    q.release("nonexistent-slot-id");
  });
});

// ─── Rate Limiting ──────────────────────────────────────────

describe("GlobalQueue — rate limiting", () => {
  it("tracks request timestamps for rate limiting", async () => {
    const q = new GlobalQueue({
      stateDir: tempDir,
      maxConcurrent: 10,
      maxPerMinute: 100,
    });

    const slot = await q.acquire();
    const status = q.status();
    expect(status.recentRequests).toBe(1);
    q.release(slot);
  });

  it("blocks when rate limit is reached", async () => {
    const q = new GlobalQueue({
      stateDir: tempDir,
      maxConcurrent: 10,
      maxPerMinute: 2,
      pollIntervalMs: 20,
      acquireTimeoutMs: 500,
    });

    // Exhaust the rate limit
    const slot1 = await q.acquire();
    q.release(slot1);
    const slot2 = await q.acquire();
    q.release(slot2);

    // Third request should block/timeout because 2 per minute is exhausted
    await expect(q.acquire()).rejects.toThrow(/timed out/i);
  });

  it("rate limit counter resets after 60 seconds", async () => {
    const q = new GlobalQueue({
      stateDir: tempDir,
      maxConcurrent: 10,
      maxPerMinute: 2,
      pollIntervalMs: 20,
    });

    // Manually write state with old timestamps
    const statePath = join(tempDir, "queue-state.json");
    const oldState = {
      slots: [],
      timestamps: [Date.now() - 61_000, Date.now() - 61_000],
    };
    const { writeFileSync } = await import("node:fs");
    writeFileSync(statePath, JSON.stringify(oldState));

    // Should be able to acquire since old timestamps are pruned
    const slot = await q.acquire();
    expect(typeof slot).toBe("string");
    q.release(slot);
  });
});

// ─── wrap() ─────────────────────────────────────────────────

describe("GlobalQueue — wrap()", () => {
  it("wraps an async function with acquire/release", async () => {
    const q = new GlobalQueue({
      stateDir: tempDir,
      maxConcurrent: 2,
      maxPerMinute: 100,
    });

    const result = await q.wrap(async () => {
      const status = q.status();
      expect(status.activeSlots).toBe(1);
      return 42;
    });

    expect(result).toBe(42);
    const afterStatus = q.status();
    expect(afterStatus.activeSlots).toBe(0);
  });

  it("releases slot even when wrapped function throws", async () => {
    const q = new GlobalQueue({
      stateDir: tempDir,
      maxConcurrent: 2,
      maxPerMinute: 100,
    });

    await expect(
      q.wrap(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const status = q.status();
    expect(status.activeSlots).toBe(0);
  });

  it("enforces concurrency limit with wrap()", async () => {
    const q = new GlobalQueue({
      stateDir: tempDir,
      maxConcurrent: 2,
      maxPerMinute: 100,
      pollIntervalMs: 20,
    });

    let peakConcurrency = 0;
    let currentConcurrency = 0;

    const task = async (delay: number) => {
      return q.wrap(async () => {
        currentConcurrency++;
        peakConcurrency = Math.max(peakConcurrency, currentConcurrency);
        await sleep(delay);
        currentConcurrency--;
      });
    };

    // Run 5 tasks concurrently — only 2 should run at a time
    await Promise.all([
      task(50),
      task(50),
      task(50),
      task(50),
      task(50),
    ]);

    expect(peakConcurrency).toBeLessThanOrEqual(2);
  });
});

// ─── status() ───────────────────────────────────────────────

describe("GlobalQueue — status()", () => {
  it("returns current queue status", async () => {
    const q = new GlobalQueue({
      stateDir: tempDir,
      maxConcurrent: 5,
      maxPerMinute: 60,
    });

    const status = q.status();
    expect(status).toEqual({
      activeSlots: 0,
      recentRequests: 0,
      maxConcurrent: 5,
      maxPerMinute: 60,
    });
  });

  it("reflects active slots accurately", async () => {
    const q = new GlobalQueue({
      stateDir: tempDir,
      maxConcurrent: 5,
      maxPerMinute: 100,
    });

    const slot1 = await q.acquire();
    expect(q.status().activeSlots).toBe(1);

    const slot2 = await q.acquire();
    expect(q.status().activeSlots).toBe(2);

    q.release(slot1);
    expect(q.status().activeSlots).toBe(1);

    q.release(slot2);
    expect(q.status().activeSlots).toBe(0);
  });
});

// ─── Singleton ──────────────────────────────────────────────

describe("GlobalQueue — singleton", () => {
  it("getDefaultQueue returns the same instance on repeated calls", () => {
    const q1 = getDefaultQueue({ stateDir: tempDir });
    const q2 = getDefaultQueue();
    expect(q1).toBe(q2);
  });

  it("setDefaultQueue replaces the singleton", () => {
    const custom = new GlobalQueue({ stateDir: tempDir, maxConcurrent: 7 });
    setDefaultQueue(custom);
    const q = getDefaultQueue();
    expect(q).toBe(custom);
    expect(q.maxConcurrent).toBe(7);
  });

  it("setDefaultQueue(null) clears the singleton", () => {
    getDefaultQueue({ stateDir: tempDir });
    setDefaultQueue(null);
    const newQ = getDefaultQueue({ stateDir: tempDir, maxConcurrent: 99 });
    expect(newQ.maxConcurrent).toBe(99);
  });
});

// ─── Cross-process safety (state file) ──────────────────────

describe("GlobalQueue — state file", () => {
  it("persists state to disk", async () => {
    const q = new GlobalQueue({
      stateDir: tempDir,
      maxConcurrent: 5,
      maxPerMinute: 100,
    });

    const slot = await q.acquire();
    const statePath = join(tempDir, "queue-state.json");
    expect(existsSync(statePath)).toBe(true);

    const state = JSON.parse(readFileSync(statePath, "utf-8"));
    expect(state.slots).toHaveLength(1);
    expect(state.slots[0].pid).toBe(process.pid);
    expect(state.slots[0].id).toBe(slot);

    q.release(slot);
  });

  it("two GlobalQueue instances share the same state", async () => {
    const q1 = new GlobalQueue({
      stateDir: tempDir,
      maxConcurrent: 2,
      maxPerMinute: 100,
    });
    const q2 = new GlobalQueue({
      stateDir: tempDir,
      maxConcurrent: 2,
      maxPerMinute: 100,
    });

    const slot1 = await q1.acquire();

    // q2 should see q1's slot
    const status = q2.status();
    expect(status.activeSlots).toBe(1);

    q1.release(slot1);
    expect(q2.status().activeSlots).toBe(0);
  });

  it("cleans up lock directory after operations", async () => {
    const q = new GlobalQueue({ stateDir: tempDir });
    const slot = await q.acquire();
    q.release(slot);

    const lockPath = join(tempDir, ".lock");
    expect(existsSync(lockPath)).toBe(false);
  });
});

// ─── Helpers ────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
