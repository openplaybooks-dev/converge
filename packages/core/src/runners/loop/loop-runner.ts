/**
 * Loop Runner — endless convergence wrapper.
 *
 * Repeatedly runs converge (evolveRun) cycles until:
 *   - maxIterations reached
 *   - maxRunDurationMs exceeded
 *
 * On stall (converge didn't converge), applies backoff delay before retrying.
 * Default stall config for loop: maxConsecutive=0 (never stop on stall).
 */

import { evolveRun } from "../evolve/evolve-runner.ts";
import type { EvolveRunConfig } from "../evolve/evolve-runner.ts";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

export interface LoopRunConfig extends Omit<EvolveRunConfig, "stall"> {
  /** Max cycles (each cycle is one full converge run). Default: Infinity. */
  maxCycles?: number;
  /** Stall config for the loop level */
  stall?: {
    maxConsecutive?: number;
    backoffMs?: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Result                                                             */
/* ------------------------------------------------------------------ */

export interface LoopResult {
  cycles: number;
  totalConverged: number;
  totalStalled: number;
  stoppedReason: "max-cycles" | "timeout" | "stall-limit";
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export async function loopRun(config: LoopRunConfig): Promise<LoopResult> {
  const maxCycles = config.maxCycles ?? config.maxIterations ?? Infinity;
  const backoffMs = config.stall?.backoffMs ?? 30000;
  const maxConsecutiveStalls = config.stall?.maxConsecutive ?? 0; // 0 = never stop
  const startTime = Date.now();

  console.log(`🔁 Starting loop run (max ${maxCycles === Infinity ? "∞" : maxCycles} cycles, backoff ${backoffMs}ms)\n`);

  let cycle = 0;
  let totalConverged = 0;
  let totalStalled = 0;
  let consecutiveStalls = 0;

  while (cycle < maxCycles) {
    // Check timeout
    if (config.maxRunDurationMs && (Date.now() - startTime) >= config.maxRunDurationMs) {
      console.log("⛔ Loop timeout reached. Stopping.\n");
      return { cycles: cycle, totalConverged, totalStalled, stoppedReason: "timeout" };
    }

    cycle++;
    console.log(`\n╔══ Loop Cycle ${cycle}/${maxCycles === Infinity ? "∞" : maxCycles} ══════════════════════════════════\n`);

    const result = await evolveRun({
      ...config,
      // For each converge cycle within loop, use its own stall config
      // Default: maxConsecutive=2 per cycle (standard converge behavior)
      stall: { maxConsecutive: 2 },
    });

    if (result.converged) {
      totalConverged++;
      consecutiveStalls = 0;
      console.log(`\n✅ Cycle ${cycle}: converged in ${result.epochs} epoch(s).\n`);
    } else {
      totalStalled++;
      consecutiveStalls++;
      console.log(`\n⚠️  Cycle ${cycle}: did not converge (stall ${consecutiveStalls}${maxConsecutiveStalls > 0 ? `/${maxConsecutiveStalls}` : ""}).\n`);

      // Check stall limit
      if (maxConsecutiveStalls > 0 && consecutiveStalls >= maxConsecutiveStalls) {
        console.log(`⛔ Loop stall limit reached (${maxConsecutiveStalls} consecutive). Stopping.\n`);
        return { cycles: cycle, totalConverged, totalStalled, stoppedReason: "stall-limit" };
      }

      // Backoff before next cycle
      console.log(`   💤 Backing off ${backoffMs}ms before next cycle...\n`);
      await sleep(backoffMs);
    }
  }

  console.log("═══════════════════════════════════════════════════════");
  console.log("  LOOP SUMMARY");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Cycles:     ${cycle}`);
  console.log(`  Converged:  ${totalConverged}`);
  console.log(`  Stalled:    ${totalStalled}`);
  console.log("");

  return { cycles: cycle, totalConverged, totalStalled, stoppedReason: "max-cycles" };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
