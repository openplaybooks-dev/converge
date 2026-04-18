/**
 * Journal Navigator
 *
 * Helps AI navigate the hierarchical journal structure.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Gap } from "../gap/types.ts";
import {
  getJournalStructure,
  getJournalFilePath,
  getEpicsDir,
  getEpicTasksDir,
  type Breadcrumb,
  getBreadcrumbs,
} from "./structure.ts";
import { readGaps, readGapSummary } from "./reader.ts";

/* ------------------------------------------------------------------ */
/*  Navigation Types                                                  */
/* ------------------------------------------------------------------ */

export interface JournalLocation {
  /** Current level */
  level: "project" | "epic" | "task";

  /** Breadcrumb trail */
  breadcrumbs: Breadcrumb[];

  /** Current directory */
  path: string;

  /** Available files at this level */
  files: {
    gaps: string;
    events: string;
    log: string;
    summary: string;
  };

  /** Child items (epics or tasks) */
  children: {
    id: string;
    name: string;
    path: string;
    gapCount: number;
  }[];

  /** Parent location (if not at project level) */
  parent?: {
    level: "project" | "epic";
    path: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Navigation Functions                                              */
/* ------------------------------------------------------------------ */

/**
 * Get current location in journal hierarchy
 */
export async function getLocation(
  projectDir: string,
  projectName: string,
  epicId?: string,
  epicName?: string,
  taskId?: string,
  taskName?: string,
): Promise<JournalLocation> {
  const structure = getJournalStructure(projectDir, epicId, taskId);
  const breadcrumbs = getBreadcrumbs(
    projectDir,
    projectName,
    epicId,
    epicName,
    taskId,
    taskName,
  );

  let level: "project" | "epic" | "task";
  let currentPath: string;
  let parentLevel: "project" | "epic" | undefined;
  let parentPath: string | undefined;

  if (taskId && epicId) {
    level = "task";
    currentPath = structure.task!;
    parentLevel = "epic";
    parentPath = structure.epic!;
  } else if (epicId) {
    level = "epic";
    currentPath = structure.epic!;
    parentLevel = "project";
    parentPath = structure.project;
  } else {
    level = "project";
    currentPath = structure.project;
  }

  // Get file paths
  const files = {
    gaps: getJournalFilePath(projectDir, level, "gaps", epicId, taskId),
    events: getJournalFilePath(projectDir, level, "events", epicId, taskId),
    log: getJournalFilePath(projectDir, level, "log", epicId, taskId),
    summary: getJournalFilePath(projectDir, level, "summary", epicId, taskId),
  };

  // Get children
  const children = await getChildren(projectDir, level, epicId);

  const location: JournalLocation = {
    level,
    breadcrumbs,
    path: currentPath,
    files,
    children,
  };

  if (parentLevel && parentPath) {
    location.parent = {
      level: parentLevel,
      path: parentPath,
    };
  }

  return location;
}

/**
 * Get children at current level.
 * For epics, recurses into task subdirectories so that deeply nested tasks
 * (e.g. 003-step/001-screen/001-leaf) are discovered at any depth.
 */
async function getChildren(
  projectDir: string,
  level: "project" | "epic" | "task",
  epicId?: string,
): Promise<
  Array<{ id: string; name: string; path: string; gapCount: number }>
> {
  const children: Array<{
    id: string;
    name: string;
    path: string;
    gapCount: number;
  }> = [];

  try {
    if (level === "project") {
      // Get all epics (shallow — epics are never nested)
      const epicsDir = getEpicsDir(projectDir);
      const entries = await readdir(epicsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const epicPath = join(epicsDir, entry.name);
          const gapCount = await getGapCount(projectDir, "epic", entry.name);
          children.push({
            id: entry.name,
            name: entry.name,
            path: epicPath,
            gapCount,
          });
        }
      }
    } else if (level === "epic" && epicId) {
      // Get all tasks at any depth — recurse into subdirectories.
      const tasksDir = getEpicTasksDir(projectDir, epicId);
      const found = await scanTaskDirsDeep(projectDir, tasksDir, epicId, "");
      children.push(...found);
    }
  } catch {
    // Directory doesn't exist yet — return empty
  }

  return children;
}

/**
 * Recursively scan a directory for task journal entries at any depth.
 * A directory is considered a task node if it contains a gaps.yml file
 * (gap count > 0). Intermediate grouping directories without their own
 * gaps are not included, but their children are still traversed.
 *
 * @param projectDir - project root
 * @param dir        - current filesystem directory to scan
 * @param epicId     - parent epic ID (for scope construction)
 * @param relPrefix  - accumulated relative task path (e.g. "003-step/001-screen")
 */
async function scanTaskDirsDeep(
  projectDir: string,
  dir: string,
  epicId: string,
  relPrefix: string,
): Promise<
  Array<{ id: string; name: string; path: string; gapCount: number }>
> {
  const result: Array<{
    id: string;
    name: string;
    path: string;
    gapCount: number;
  }> = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const relId = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    const entryPath = join(dir, entry.name);
    const gapCount = await getGapCount(
      projectDir,
      "task",
      `${epicId}.${relId}`,
    );

    if (gapCount > 0) {
      // This directory has its own gap journal — include it as a task node
      result.push({ id: relId, name: relId, path: entryPath, gapCount });
    }

    // Always recurse — children may have gaps even when the parent doesn't
    const deeper = await scanTaskDirsDeep(projectDir, entryPath, epicId, relId);
    result.push(...deeper);
  }

  return result;
}

/**
 * Get gap count at a specific level
 */
async function getGapCount(
  projectDir: string,
  level: "project" | "epic" | "task",
  scope: string,
): Promise<number> {
  try {
    const summary = await readGapSummary(projectDir, level, scope);
    return summary?.total || 0;
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Quick Access Functions for AI                                     */
/* ------------------------------------------------------------------ */

/**
 * Get overview of entire project journal
 */
export async function getProjectOverview(
  projectDir: string,
  projectName: string,
): Promise<{
  location: JournalLocation;
  gaps: Gap[];
  epicCount: number;
  totalTaskCount: number;
}> {
  const location = await getLocation(projectDir, projectName);
  const gaps = await readGaps(projectDir, "project", "project");

  let totalTaskCount = 0;
  for (const epic of location.children) {
    const epicLocation = await getLocation(projectDir, projectName, epic.id);
    totalTaskCount += epicLocation.children.length;
  }

  return {
    location,
    gaps,
    epicCount: location.children.length,
    totalTaskCount,
  };
}

/**
 * Get overview of an epic
 */
export async function getEpicOverview(
  projectDir: string,
  projectName: string,
  epicId: string,
  epicName?: string,
): Promise<{
  location: JournalLocation;
  gaps: Gap[];
  taskCount: number;
}> {
  const location = await getLocation(projectDir, projectName, epicId, epicName);
  const gaps = await readGaps(projectDir, "epic", epicId);

  return {
    location,
    gaps,
    taskCount: location.children.length,
  };
}

/**
 * Get overview of a task
 */
export async function getTaskOverview(
  projectDir: string,
  projectName: string,
  epicId: string,
  taskId: string,
  epicName?: string,
  taskName?: string,
): Promise<{
  location: JournalLocation;
  gaps: Gap[];
}> {
  const location = await getLocation(
    projectDir,
    projectName,
    epicId,
    epicName,
    taskId,
    taskName,
  );
  const gaps = await readGaps(projectDir, "task", `${epicId}.${taskId}`);

  return {
    location,
    gaps,
  };
}

/**
 * List all epics with gap counts
 */
export async function listEpics(
  projectDir: string,
  projectName: string,
): Promise<Array<{ id: string; gapCount: number; taskCount: number }>> {
  const location = await getLocation(projectDir, projectName);

  const epics = await Promise.all(
    location.children.map(async (epic) => {
      const epicLocation = await getLocation(projectDir, projectName, epic.id);
      return {
        id: epic.id,
        gapCount: epic.gapCount,
        taskCount: epicLocation.children.length,
      };
    }),
  );

  return epics;
}

/**
 * List all tasks in an epic with gap counts
 */
export async function listTasks(
  projectDir: string,
  projectName: string,
  epicId: string,
): Promise<Array<{ id: string; gapCount: number }>> {
  const location = await getLocation(projectDir, projectName, epicId);

  return location.children.map((task) => ({
    id: task.id,
    gapCount: task.gapCount,
  }));
}

/**
 * Find all items with gaps (for AI to focus on)
 */
export async function findItemsWithGaps(
  projectDir: string,
  projectName: string,
): Promise<{
  project: { gapCount: number };
  epics: Array<{ id: string; gapCount: number }>;
  tasks: Array<{ epicId: string; taskId: string; gapCount: number }>;
}> {
  const result = {
    project: { gapCount: 0 },
    epics: [] as Array<{ id: string; gapCount: number }>,
    tasks: [] as Array<{ epicId: string; taskId: string; gapCount: number }>,
  };

  // Check project
  const projectGaps = await readGaps(projectDir, "project", "project");
  result.project.gapCount = projectGaps.length;

  // Check all epics and tasks
  const epics = await listEpics(projectDir, projectName);

  for (const epic of epics) {
    if (epic.gapCount > 0) {
      result.epics.push({ id: epic.id, gapCount: epic.gapCount });
    }

    // Check tasks in this epic
    const tasks = await listTasks(projectDir, projectName, epic.id);
    for (const task of tasks) {
      if (task.gapCount > 0) {
        result.tasks.push({
          epicId: epic.id,
          taskId: task.id,
          gapCount: task.gapCount,
        });
      }
    }
  }

  return result;
}
