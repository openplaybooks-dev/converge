import { EventEmitter } from "node:events";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { claudefn } from "../src/index.js";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  const spawn = vi.fn(() => {
    const proc = new EventEmitter() as any;
    proc.pid = 4242;
    proc.stdout = new Readable({ read() {} });
    proc.stderr = new Readable({ read() {} });
    proc.stdin = { write: vi.fn(), end: vi.fn() };
    proc.kill = vi.fn(() => {
      proc.emit("close", null, "SIGTERM");
      return true;
    });
    return proc;
  });

  return { ...actual, spawn };
});

const mockChildProcess = (await import("node:child_process")) as any;

describe("claudefn timeout termination", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("kills the detached process group when a Claude invocation times out", async () => {
    const processKill = vi
      .spyOn(process, "kill")
      .mockImplementation((() => true) as typeof process.kill);
    const logDir = mkdtempSync(join(tmpdir(), "claudefn-timeout-test-"));

    const fn = claudefn({ prompt: "hang", timeoutMs: 10, logDir });

    await expect(fn()).rejects.toThrow(/timeout/i);

    const [, , options] = mockChildProcess.spawn.mock.calls[0];
    expect(options.detached).toBe(process.platform !== "win32");
    if (process.platform !== "win32") {
      expect(processKill).toHaveBeenCalledWith(-4242, "SIGTERM");
    }
    expect(
      mockChildProcess.spawn.mock.results[0].value.kill,
    ).toHaveBeenCalledWith("SIGTERM");
  });
});
