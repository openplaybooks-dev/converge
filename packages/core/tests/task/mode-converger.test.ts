/**
 * RFC 0022 — Converger wave loop tests.
 *
 * `runConvergerWave` decides halt-or-continue after each wave. The five
 * signals, in priority order:
 *
 *   1. $CONVERGE_TASK_DIR/halt.marker exists → halt, success.
 *   2. every check in halt_when passes       → halt, success.
 *   3. wave_check exits 0                    → halt, success.
 *   4. wave_check exits 2                    → halt, give up.
 *   5. wave_check exits 1                    → continue, next wave.
 *
 * Tests exercise each rung, plus the structural backstop (`max_waves`).
 * The check executor is injected so tests are deterministic — no
 * subprocesses, no scripts on disk.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runConvergerWave } from "../../src/task/mode/converger.ts";
import type { ConvergerConfig } from "../../src/task/mode/schema.ts";

function makeExecDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "converge-converger-"));
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("runConvergerWave — halt priority", () => {
  let execDir: string;
  beforeEach(() => {
    execDir = makeExecDir();
  });
  afterEach(() => {
    rmSync(execDir, { recursive: true, force: true });
  });

  it("halts with halt-marker reason when $CONVERGE_TASK_DIR/halt.marker exists", async () => {
    writeFileSync(join(execDir, "halt.marker"), "");
    const cfg: ConvergerConfig = {
      max_waves: 10,
      halt_when: [{ id: "h", cmd: "false" }],
      wave_check: { id: "w", cmd: "exit 1" },
    };
    const outcome = await runConvergerWave(
      { execDir, waveNumber: 1, config: cfg },
      {
        runCheck: async () => 1, // would say continue, but marker wins
      },
    );
    expect(outcome).toEqual({
      halt: true,
      success: true,
      reason: "halt-marker",
    });
  });

  it("halts when all halt_when checks pass", async () => {
    const cfg: ConvergerConfig = {
      max_waves: 10,
      halt_when: [
        { id: "a", cmd: "true" },
        { id: "b", cmd: "true" },
      ],
    };
    const outcome = await runConvergerWave(
      { execDir, waveNumber: 3, config: cfg },
      { runCheck: async () => 0 },
    );
    expect(outcome.halt).toBe(true);
    expect(outcome.success).toBe(true);
    expect(outcome.reason).toBe("halt-when");
  });

  it("does not halt when any halt_when check fails (and no wave_check)", async () => {
    const cfg: ConvergerConfig = {
      max_waves: 10,
      halt_when: [
        { id: "a", cmd: "true" },
        { id: "b", cmd: "false" },
      ],
    };
    const exitCodes = [0, 1]; // first check passes, second fails
    let i = 0;
    const outcome = await runConvergerWave(
      { execDir, waveNumber: 1, config: cfg },
      { runCheck: async () => exitCodes[i++] ?? 1 },
    );
    expect(outcome.halt).toBe(false);
  });

  it("halts success when wave_check exits 0", async () => {
    const cfg: ConvergerConfig = {
      max_waves: 10,
      wave_check: { id: "w", cmd: "scripts/decide.sh" },
    };
    const outcome = await runConvergerWave(
      { execDir, waveNumber: 2, config: cfg },
      { runCheck: async () => 0 },
    );
    expect(outcome.halt).toBe(true);
    expect(outcome.success).toBe(true);
    expect(outcome.reason).toBe("wave-check-pass");
  });

  it("halts failure when wave_check exits 2 (give up)", async () => {
    const cfg: ConvergerConfig = {
      max_waves: 10,
      wave_check: { id: "w", cmd: "scripts/decide.sh" },
    };
    const outcome = await runConvergerWave(
      { execDir, waveNumber: 2, config: cfg },
      { runCheck: async () => 2 },
    );
    expect(outcome.halt).toBe(true);
    expect(outcome.success).toBe(false);
    expect(outcome.reason).toBe("wave-check-give-up");
  });

  it("continues when wave_check exits 1", async () => {
    const cfg: ConvergerConfig = {
      max_waves: 10,
      wave_check: { id: "w", cmd: "scripts/decide.sh" },
    };
    const outcome = await runConvergerWave(
      { execDir, waveNumber: 2, config: cfg },
      { runCheck: async () => 1 },
    );
    expect(outcome.halt).toBe(false);
  });

  it("treats unknown wave_check exit codes as continue (forward-compat)", async () => {
    const cfg: ConvergerConfig = {
      max_waves: 10,
      wave_check: { id: "w", cmd: "scripts/decide.sh" },
    };
    const outcome = await runConvergerWave(
      { execDir, waveNumber: 2, config: cfg },
      { runCheck: async () => 42 },
    );
    expect(outcome.halt).toBe(false);
  });
});

describe("runConvergerWave — max_waves backstop", () => {
  let execDir: string;
  beforeEach(() => {
    execDir = makeExecDir();
  });
  afterEach(() => {
    rmSync(execDir, { recursive: true, force: true });
  });

  it("halts failure with converger-max-waves when waveNumber > max_waves", async () => {
    const cfg: ConvergerConfig = {
      max_waves: 5,
      halt_when: [{ id: "h", cmd: "false" }],
    };
    const outcome = await runConvergerWave(
      { execDir, waveNumber: 6, config: cfg },
      { runCheck: async () => 1 },
    );
    expect(outcome.halt).toBe(true);
    expect(outcome.success).toBe(false);
    expect(outcome.errorCode).toBe("converger-max-waves");
  });

  it("permits the final wave (waveNumber == max_waves)", async () => {
    const cfg: ConvergerConfig = {
      max_waves: 5,
      halt_when: [{ id: "h", cmd: "true" }],
    };
    const outcome = await runConvergerWave(
      { execDir, waveNumber: 5, config: cfg },
      { runCheck: async () => 0 },
    );
    expect(outcome.halt).toBe(true);
    expect(outcome.success).toBe(true);
  });
});

describe("runConvergerWave — config defenses", () => {
  let execDir: string;
  beforeEach(() => {
    execDir = makeExecDir();
  });
  afterEach(() => {
    rmSync(execDir, { recursive: true, force: true });
  });

  it("halts failure with converger-no-halt-signal when both signals absent", async () => {
    // Schema rejects this at parse time, but the wave loop defends in
    // case a caller bypassed it (e.g., scripted task definitions).
    const cfg: ConvergerConfig = { max_waves: 5 };
    const outcome = await runConvergerWave(
      { execDir, waveNumber: 1, config: cfg },
      { runCheck: async () => 0 },
    );
    expect(outcome.halt).toBe(true);
    expect(outcome.success).toBe(false);
    expect(outcome.errorCode).toBe("converger-no-halt-signal");
  });
});
