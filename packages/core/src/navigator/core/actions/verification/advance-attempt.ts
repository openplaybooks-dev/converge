/**
 * Advance Attempt Action
 * 
 * Move to next attempt directory.
 */

import type { ActionHandler } from "../../types.ts";

export const advanceAttempt: ActionHandler = async (snap) => {
  const { existsSync, readdirSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");

  const currentDir = process.env.CONVERGE_TASK_ATTEMPT_DIR;
  if (!currentDir || !existsSync(currentDir)) return { action: "continue" };

  const logsDir = join(currentDir, "logs");
  if (
    !existsSync(logsDir) ||
    !readdirSync(logsDir).some((f) => f.endsWith(".log"))
  ) {
    return { action: "continue" };
  }

  const attemptsDir = dirname(currentDir);
  const existingNums = readdirSync(attemptsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
    .map((d) => parseInt(d.name, 10));
  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
  const nextPadded = String(nextNum).padStart(2, "0");
  const nextDir = join(attemptsDir, nextPadded);

  const { mkdir } = await import("node:fs/promises");
  await mkdir(nextDir, { recursive: true });

  process.env.CONVERGE_TASK_ATTEMPT_DIR = nextDir;
  snap.taskContext?.logAttemptAdvanced(snap.iteration, nextPadded);
  console.log(`   📁 Next attempt → attempts/${nextPadded}/`);

  return { action: "continue" };
};
