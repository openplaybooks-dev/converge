/**
 * Run Converger Action — RFC 0022 `mode: converger`.
 *
 * Drives the multi-wave loop:
 *
 *   For each wave (1-indexed, persisted across re-leases):
 *     1. Run the body via the existing skill/executor dispatcher.
 *     2. If the body wrote `$CONVERGE_TASK_DIR/spawn.plan.jsonl`,
 *        call `applyManifest` to ingest the per-wave children.
 *     3. Compute the wave outcome via `runConvergerWave`:
 *          - halt.marker present → halt, success.
 *          - all halt_when checks pass → halt, success.
 *          - wave_check exits 0 → halt, success; 2 → halt, fail.
 *          - exit 1 or other → continue, bump wave counter.
 *     4. If halt → `done` (success/failure per the outcome).
 *        Else → bump `wave.counter` and signal `continue`; the runtime
 *        re-leases the unit and the loop resumes from step 1.
 *
 * Wave-state persistence: the wave counter lives in
 * `$CONVERGE_TASK_DIR/wave.counter` so it survives crashes,
 * re-leases, and worker restarts. It's a single line of text
 * containing the integer.
 *
 * The body executes through the standard skill / executor chain
 * (dispatched in `run-executor.ts`). This handler runs AFTER the body
 * returns; the wave loop re-fires the body by returning `continue`,
 * which the navigator interprets as "schedule another iteration."
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ActionHandler } from "../../types.ts";
import type {
  WaveExecutor,
  ModeCheck,
} from "../../../../task/mode/index.ts";
import { runSkill } from "./run-skill.ts";
import { resolveTaskMdPath, runPassthroughBody } from "./passthrough.ts";

const MANIFEST_NAME = "spawn.plan.jsonl";
const WAVE_COUNTER_NAME = "wave.counter";
const VIOLATION_NAME = "mode-violation.json";

export const runConverger: ActionHandler = async (snap, graph) => {
  const { applyManifest } = await import("../../../../task/spawn/index.ts");
  const { runConvergerWave, validatePostBody } = await import(
    "../../../../task/mode/index.ts"
  );

  const unit = snap.unit;
  const execDir = process.env.CONVERGE_TASK_DIR;
  if (!execDir) {
    return {
      action: "bail",
      success: false,
      reason: "CONVERGE_TASK_DIR not set; run-converger cannot drive waves",
    };
  }
  if (!unit.modeConverge) {
    return {
      action: "bail",
      success: false,
      reason: "mode: converger declared without converge: config",
    };
  }

  // Step 0: run the body for this wave. The body's job is to do the
  // wave's work (write halt.marker, mutate state, optionally write a
  // per-wave spawn.plan.jsonl) and then return. We re-fire it across
  // re-leases until the halt condition triggers or max_waves is hit.
  const { resolveSkill } = await import("../../../../task/unit/resolve.ts");
  if (resolveSkill(unit)) {
    const bodyResult = await runSkill(snap, graph);
    if (bodyResult.action === "bail") {
      return bodyResult;
    }
  } else {
    // Passthrough fallback: extract ```bash fences from TASK.md and execute.
    // Mirrors the same pattern used by run-spawner.ts.
    const { parseTaskMd } = await import("../../../../config/task-md-definition.ts");
    const taskMdPath = resolveTaskMdPath(unit);
    if (taskMdPath && existsSync(taskMdPath)) {
      const parsed = await parseTaskMd(taskMdPath);
      const isPassthrough = unit.passthrough ?? parsed?.def?.passthrough ?? false;
      if (isPassthrough) {
        const bodyRan = parsed ? await runPassthroughBody(snap, parsed, "converger") : false;
        if (!bodyRan) {
          return {
            action: "bail",
            success: false,
            reason: "converger passthrough body failed or has no shell commands",
          };
        }
      }
    }
  }

  // Apply any per-wave manifest the body wrote. Convergers (like spawners)
  // produce a manifest per wave when they need to fan out children; the
  // framework ingests it before checking halt conditions.
  const manifestPath = join(execDir, MANIFEST_NAME);
  if (existsSync(manifestPath)) {
    try {
      await applyManifest({
        manifestPath,
        workspace: snap.projectDir,
      });
    } catch (err) {
      console.error(
        `[run-converger] applyManifest crashed: ${(err as Error).message}`,
      );
    }
  }

  // Read the wave counter; default to 1 for the first invocation.
  const waveNumber = readWaveCounter(execDir);

  // Build a WaveExecutor that runs ModeCheck cmds. We use the same
  // exit-code semantics as lifecycle/after.ts:runCheck — 0 = pass,
  // non-zero = fail, special wave_check codes (0/1/2) flow through.
  const exec: WaveExecutor = {
    runCheck: async (check: ModeCheck) => runModeCheck(check, snap.projectDir),
  };

  const outcome = await runConvergerWave(
    {
      execDir,
      waveNumber,
      config: unit.modeConverge,
    },
    exec,
  );

  // Post-body validator picks up per-wave manifest failures (any
  // ok:false in spawn.plan.result.jsonl). Halt-signal logic is
  // owned by runConvergerWave above.
  const validation = validatePostBody(
    {
      taskId: unit.id,
      mode: "converger",
      outputs: unit.outputs,
      converge: unit.modeConverge,
    },
    { execDir, childCount: 0 },
  );
  if (!validation.ok) {
    writeViolation(execDir, validation, "converger");
    return {
      action: "bail",
      success: false,
      reason: `mode-violation: ${validation.errorCode} — ${validation.message}`,
    };
  }

  if (outcome.halt) {
    if (outcome.success === false && outcome.errorCode) {
      // Contract violation (max_waves exceeded, no halt signal). Surface
      // as a bail so the repair loop sees an addressable error code
      // rather than a "task done but unsuccessful" silent state.
      writeViolation(
        execDir,
        {
          errorCode: outcome.errorCode,
          message: `converger halted: ${outcome.errorCode}`,
          fixHint:
            "Inspect halt signals — adjust max_waves, halt_when, or wave_check.",
        },
        "converger",
      );
      return {
        action: "bail",
        success: false,
        reason: `mode-violation: ${outcome.errorCode}`,
      };
    }
    // wave_check exit 2 ("give up") is a clean halt with success: false —
    // the body decided to stop, not a contract violation. Returned as
    // bail still, but without an errorCode in the violation file.
    if (outcome.success === false) {
      return {
        action: "bail",
        success: false,
        reason: outcome.reason ?? "converger gave up",
      };
    }
    return {
      action: "done",
      success: true,
      reason: outcome.reason ?? "converger halted",
    };
  }

  // Continue: bump the wave counter and let the runtime re-fire.
  writeWaveCounter(execDir, waveNumber + 1);
  return { action: "continue", reason: `wave ${waveNumber} continuing` };
};

function readWaveCounter(execDir: string): number {
  const p = join(execDir, WAVE_COUNTER_NAME);
  if (!existsSync(p)) return 1;
  try {
    const raw = readFileSync(p, "utf-8").trim();
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 1 ? n : 1;
  } catch {
    return 1;
  }
}

function writeWaveCounter(execDir: string, n: number): void {
  try {
    writeFileSync(join(execDir, WAVE_COUNTER_NAME), `${n}\n`, "utf-8");
  } catch {
    // Best-effort — a missed write means we re-run wave N once more,
    // which is bounded by max_waves anyway.
  }
}

async function runModeCheck(
  check: ModeCheck,
  projectDir: string,
): Promise<number> {
  // AI checks are not supported as halt signals — the wave loop expects
  // deterministic exit codes (0 = pass, 1 = continue, 2 = give up). A
  // converger needing AI-based halt should script it as a `cmd:` that
  // delegates.
  if (!check.cmd) return 1;
  const { spawn } = await import("node:child_process");
  const shell = process.platform === "win32" ? "bash" : "/bin/bash";
  const timeoutMs = check.timeoutMs ?? 60_000;
  return new Promise<number>((resolve) => {
    let settled = false;
    const child = spawn(shell, ["-lc", check.cmd!], {
      cwd: projectDir,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // process already exited
      }
      resolve(1);
    }, timeoutMs);
    child.on("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(1);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(typeof code === "number" ? code : 1);
    });
  });
}

function writeViolation(
  execDir: string,
  validation: {
    errorCode?: string;
    message?: string;
    fixHint?: string;
    expectedArtefacts?: string[];
    actualArtefacts?: string[];
  },
  declaredMode: string,
): void {
  try {
    const payload = {
      errorCode: validation.errorCode,
      declaredMode,
      message: validation.message,
      fixHint: validation.fixHint,
      expectedArtefacts: validation.expectedArtefacts,
      actualArtefacts: validation.actualArtefacts,
    };
    writeFileSync(
      join(execDir, VIOLATION_NAME),
      JSON.stringify(payload, null, 2),
      "utf-8",
    );
  } catch {
    // Best-effort.
  }
}
