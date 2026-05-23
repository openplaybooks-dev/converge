/**
 * Check Stall Action
 * 
 * Detect stall conditions.
 */

import type { ActionHandler } from "../../types.ts";
import { join } from "node:path";

export const checkStall: ActionHandler = async (snap) => {
  const { hasStalled } = await import("../../../../task/unit/helpers.ts");

  // Intentional loop: tasks with converge prompt re-run on purpose.
  // Don't count their repeats as stalls.
  const hasConvergeLoop = snap.gaps.some(
    (g) => g.metadata?.taskConvergePrompt !== undefined,
  );
  if (hasConvergeLoop) {
    return {
      action: "continue",
      stallCount: 0, // reset — intentional loop, not a failure
      previousGaps: [],
    };
  }

  const before = snap.previousGaps.length;
  const after = snap.gaps.length;
  const actualResolved = before - after;

  if (
    actualResolved === 0 &&
    hasStalled([...snap.gaps], [...snap.previousGaps])
  ) {
    const newStallCount = snap.stallCount + 1;
    snap.taskContext?.logStall(snap.iteration, newStallCount);
    // Surface what's actually wedged so operators can act without spelunking.
    const sample = snap.gaps.slice(0, 3).map((g) => `  - ${g.id}: ${g.description}`).join("\n");
    const more = snap.gaps.length > 3 ? `  …and ${snap.gaps.length - 3} more` : "";
    console.log(
      `\n⚠️  Stalled — identical failure on consecutive attempts (${newStallCount}/3).`,
    );
    console.log(`   Failing gap(s):`);
    console.log(sample);
    if (more) console.log(more);

    if (newStallCount >= 3) {
      // If the AI agent never wrote any files across all 3 attempts,
      // this is likely a crash (TDZ, timeout, config error) rather than
      // a genuine inability to solve the problem. Bail is terminal and
      // kills the task branch — but if the agent never wrote anything,
      // a direct retry with the full prompt might succeed once the crash
      // is fixed. Instead of bailing, return continue and let the
      // navigator re-emit the gap so a fresh agent invocation runs.
      const attemptDir = process.env.CONVERGE_TASK_ATTEMPT_DIR;
      let wroteAnything = false;
      if (attemptDir) {
        const { existsSync, readdirSync } = await import("node:fs");
        const spawnDir = join(attemptDir, "spawn");
        if (existsSync(spawnDir)) {
          for (const d of readdirSync(spawnDir, { withFileTypes: true })) {
            if (!d.isDirectory()) continue;
            const spawnAttemptDir = join(spawnDir, d.name, "attempts");
            if (existsSync(spawnAttemptDir)) {
              for (const ad of readdirSync(spawnAttemptDir, { withFileTypes: true })) {
                if (!ad.isDirectory()) continue;
                const logsDir = join(spawnAttemptDir, ad.name, "logs");
                const eventsPath = join(logsDir, "events.jsonl");
                if (existsSync(eventsPath)) {
                  const { readFileSync } = await import("node:fs");
                  const events = readFileSync(eventsPath, "utf-8");
                  if (events.includes('"type":"tool_call"') && events.includes('"name":"Write"')) {
                    wroteAnything = true;
                  }
                }
              }
            }
          }
        }
      }

      if (!wroteAnything) {
        console.log(
          `\n⚠️  Repeat-failure detector: AI issued no Write calls in 3 attempts.`,
        );
        console.log(
          `   This looks like a crash (e.g. TDZ, timeout) not a genuine failure.`,
        );
        console.log(
          `   Re-emitting gap for a fresh agent invocation instead of bailing.`,
        );
        // Reset stall state and let the navigator re-run the repair loop.
        // With the TDZ fix in place the agent will now spawn successfully.
        return {
          action: "continue",
          stallCount: 0,
          previousGaps: [],
        };
      }

      console.log(
        `\n❌ Repeat-failure detector: same gap(s) for 3 attempts in a row — AI cannot make progress alone.`,
      );
      console.log(
        `   This is usually a structural issue (broken check command, stale outputs:, missing tool, type drift in vendored code).`,
      );
      console.log(
        `   Inspect: converge inspect --task <taskId>   then patch TASK.md and resume.`,
      );
      return {
        action: "bail",
        success: false,
        reason: "Repeat-failure detector tripped (same gap on 3 attempts)",
        stallCount: newStallCount,
      };
    }

    console.log(`   Retrying... (attempt ${newStallCount + 1})`);
    return {
      action: "continue",
      stallCount: newStallCount,
      previousGaps: [...snap.gaps],
    };
  }

  const newStallCount = actualResolved > 0 ? 0 : snap.stallCount;
  return {
    action: "continue",
    stallCount: newStallCount,
    previousGaps: [...snap.gaps],
  };
};
