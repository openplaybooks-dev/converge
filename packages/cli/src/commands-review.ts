import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  appendHumanReview,
  type HumanReviewDecision,
} from "@openplaybooks/converge-core/task/review";

export interface ReviewOptions {
  taskId: string;
  decision: HumanReviewDecision;
  feedback?: string;
  playbook?: string;
  dir: string;
}

function findProjectRoot(start: string): string {
  let dir = resolve(start);
  while (!existsSync(join(dir, ".converge"))) {
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
  return dir;
}

function taskInInventory(
  projectDir: string,
  playbook: string,
  taskId: string,
): boolean {
  const path = join(
    projectDir,
    ".converge",
    "inventory",
    playbook,
    "tasks.jsonl",
  );
  if (!existsSync(path)) return false;
  try {
    const lines = readFileSync(path, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        if (row?.kind === "task" && row?.id === taskId) return true;
      } catch {
        /* skip malformed */
      }
    }
  } catch {
    /* unreadable */
  }
  return false;
}

export async function reviewCommand(options: ReviewOptions): Promise<void> {
  if (!options.taskId) {
    console.error("converge review: missing <task-id>");
    process.exitCode = 1;
    return;
  }
  if (
    (options.decision === "revise" || options.decision === "reject") &&
    !options.feedback?.trim()
  ) {
    console.error(
      `converge review: --${options.decision} requires a non-empty feedback string`,
    );
    process.exitCode = 1;
    return;
  }

  const projectDir = findProjectRoot(options.dir);
  const playbook =
    options.playbook ?? process.env.CONVERGE_PLAYBOOK ?? "default";

  if (!taskInInventory(projectDir, playbook, options.taskId)) {
    console.error(
      `converge review: task "${options.taskId}" not found in inventory for playbook "${playbook}". ` +
        `Run \`converge compile --playbook=${playbook}\` first if you added the task on disk.`,
    );
    process.exitCode = 1;
    return;
  }

  // (validation order above is intentional: argument-shape errors take
  // precedence over project-state errors so misuse is reported cleanly
  // even outside a Converge workspace.)

  await appendHumanReview(
    projectDir,
    playbook,
    options.taskId,
    options.decision,
    {
      feedback: options.feedback ?? "",
    },
  );

  console.log(
    `✅ Recorded ${options.decision} for ${options.taskId}. Run \`converge run --resume\` to continue.`,
  );
}
