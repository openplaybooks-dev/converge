import { exec } from "node:child_process";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const execAsync = promisify(exec);

export interface TaskFileChange {
  file: string;
  status: "added" | "modified" | "deleted" | "renamed";
  diff?: string;
}

export interface TaskChangeSummary {
  iteration: number;
  timestamp: string;
  hasChanges: boolean;
  files: TaskFileChange[];
}

/**
 * Check if task definitions have changed using git diff
 */
export async function detectTaskChanges(
  projectDir: string,
): Promise<TaskChangeSummary> {
  const tasksDir = ".converge/tasks";
  const summary: TaskChangeSummary = {
    iteration: 0,
    timestamp: new Date().toISOString(),
    hasChanges: false,
    files: [],
  };

  try {
    // Check if we're in a git repo
    const { stdout: isGitRepo } = await execAsync(
      "git rev-parse --is-inside-work-tree",
      {
        cwd: projectDir,
      },
    );

    if (isGitRepo.trim() !== "true") {
      // Not a git repo, can't detect changes
      return summary;
    }

    // Get status of task files (staged + unstaged changes)
    const { stdout: statusOutput } = await execAsync(
      `git status --porcelain ${tasksDir}`,
      { cwd: projectDir },
    );

    if (!statusOutput.trim()) {
      // No changes detected
      return summary;
    }

    summary.hasChanges = true;

    // Parse git status output
    const lines = statusOutput.trim().split("\n");
    for (const line of lines) {
      const status = line.substring(0, 2);
      const file = line.substring(3);

      let changeStatus: TaskFileChange["status"];
      if (status.includes("A")) {
        changeStatus = "added";
      } else if (status.includes("D")) {
        changeStatus = "deleted";
      } else if (status.includes("R")) {
        changeStatus = "renamed";
      } else {
        changeStatus = "modified";
      }

      // Get diff for modified/added files
      let diff: string | undefined;
      if (changeStatus === "modified" || changeStatus === "added") {
        try {
          const { stdout: diffOutput } = await execAsync(
            `git diff HEAD -- "${file}"`,
            { cwd: projectDir },
          );
          diff = diffOutput;
        } catch {
          // If file is new and not committed, try diff against /dev/null
          try {
            const { stdout: diffOutput } = await execAsync(
              `git diff --no-index /dev/null "${file}" || true`,
              { cwd: projectDir },
            );
            diff = diffOutput;
          } catch {
            // Ignore diff errors
          }
        }
      }

      summary.files.push({
        file,
        status: changeStatus,
        diff,
      });
    }
  } catch (error: any) {
    // Git command failed, likely not a git repo or no changes
    // Return empty summary
  }

  return summary;
}

/**
 * Save change summary to journal
 */
export async function saveChangeSummary(
  projectDir: string,
  iteration: number,
  summary: TaskChangeSummary,
): Promise<void> {
  const snapshotsDir = join(projectDir, ".converge/journal/project/snapshots");

  if (!existsSync(snapshotsDir)) {
    mkdirSync(snapshotsDir, { recursive: true });
  }

  summary.iteration = iteration;

  const filename = `task-changes-${iteration.toString().padStart(3, "0")}.json`;
  await writeFile(
    join(snapshotsDir, filename),
    JSON.stringify(summary, null, 2),
    "utf-8",
  );
}
