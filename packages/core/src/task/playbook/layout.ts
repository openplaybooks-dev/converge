import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";

export const PLAYBOOK_ROOT_DIRS = [
  "scripts",
  "checks",
  "seeds",
  "tasks",
  "templates",
  "goals",
] as const;

export type PlaybookRootDir = typeof PLAYBOOK_ROOT_DIRS[number];

export const EXECUTABLE_EXTENSIONS = [".js", ".mjs", ".cjs", ".py", ".sh"] as const;
export const MARKDOWN_EXTENSIONS = [".md", ".markdown", ".tpl"] as const;
/**
 * Structured-data file extensions that may live under `tasks/` as
 * per-task input data (consumed by the task's body or by a sibling
 * seed script). They are not declarative markdown but they are not
 * executable either — they're data the framework happily ignores.
 */
export const TASK_DATA_EXTENSIONS = [
  ".json",
  ".yaml",
  ".yml",
  ".csv",
  ".txt",
] as const;

export interface PlaybookLayout {
  root: string;
  scriptsDir: string;
  checksDir: string;
  seedsDir: string;
  tasksDir: string;
  templatesDir: string;
  goalsDir: string;
}

export interface PlaybookExecutable {
  name: string;
  path: string;
  relativePath: string;
  language: "js" | "py" | "sh";
}

export function getPlaybookLayout(root: string): PlaybookLayout {
  return {
    root,
    scriptsDir: join(root, "scripts"),
    checksDir: join(root, "checks"),
    seedsDir: join(root, "seeds"),
    tasksDir: join(root, "tasks"),
    templatesDir: join(root, "templates"),
    goalsDir: join(root, "goals"),
  };
}

export function isExecutableFile(path: string): boolean {
  return EXECUTABLE_EXTENSIONS.includes(extname(path) as typeof EXECUTABLE_EXTENSIONS[number]);
}

export function isMarkdownFile(path: string): boolean {
  return MARKDOWN_EXTENSIONS.includes(extname(path) as typeof MARKDOWN_EXTENSIONS[number]);
}

/**
 * Folder-name segments that act as executable namespaces when nested
 * anywhere under `tasks/`. Every shipping playbook uses this pattern:
 * `tasks/<id>/seeds/<name>.seed.js`, `tasks/<id>/scripts/<name>.sh`,
 * `tasks/<id>/<subid>/checks/<name>.mjs`. These remain executable even
 * though they live underneath the "declarative" tasks/ tree.
 */
const EXECUTABLE_NAMESPACES = ["seeds", "scripts", "checks"] as const;

/**
 * True when a path under `tasks/` is allowed to be a non-markdown
 * executable. Four patterns documented inline below; only files
 * matching at least one pattern are considered valid.
 *
 * The rule's purpose: enforce that the `tasks/` tree is the
 * authoritative declarative description of work, while allowing the
 * routine accompanying executables (seed scripts, check scripts,
 * helper scripts) that every shipping playbook puts alongside its
 * TASK.md files.
 *
 * Returns false for stray files (random `.exe`, unrelated scripts
 * inside task dirs without a sibling TASK.md, etc.).
 */
export function isAllowedExecutableInTasks(
  path: string,
  tasksDir: string,
): boolean {
  if (!isExecutableFile(path)) return false;

  // Strip the tasksDir prefix so we look only at the path *inside* tasks/.
  const relPath = relative(tasksDir, path);
  if (relPath.startsWith("..") || relPath === "" || relPath === ".") {
    return false; // path isn't actually under tasksDir
  }
  const segments = relPath.split(/[\\/]/);
  const file = segments[segments.length - 1];

  // Pattern 1: `seed.<ext>` or `*.seed.<ext>`
  // Shorthand for a seed alongside the TASK.md it owns
  // (e.g. tasks/scaffold/seed.js, tasks/03-build-screens/build-screens.seed.js).
  const base = basename(file, extname(file));
  if (base === "seed" || /\.seed$/.test(base)) {
    return true;
  }

  // Pattern 2: ancestor folder is one of EXECUTABLE_NAMESPACES
  // (`seeds/`, `scripts/`, `checks/`) at any nesting depth.
  for (let i = 0; i < segments.length - 1; i++) {
    if ((EXECUTABLE_NAMESPACES as readonly string[]).includes(segments[i])) {
      return true;
    }
  }

  // Pattern 3: executable file lives in the same directory as a
  // sibling TASK.md (iter-28). Playbooks like baby-app declare check
  // scripts in TASK.md's `checks:` block with the script alongside —
  // e.g. tasks/06-wire-screens/004-verify/{TASK.md, check-all-handlers.mjs}.
  // The dirname-level co-location signals "this file is owned by the
  // task here" and not stray clutter.
  if (segments.length >= 2) {
    const parentDir = dirname(path);
    if (existsSync(join(parentDir, "TASK.md"))) {
      return true;
    }
  }

  return false;
}

/**
 * True when a path under `tasks/` is structured task-data — JSON,
 * YAML, CSV, or plain text consumed by a task's body or seed script.
 * These files are first-class task-private inputs (e.g. baby-app's
 * `tasks/<id>/requirements.json`); rejecting them as "not markdown"
 * is a false positive against the real authoring convention.
 *
 * To stay strict, we only allow data files when they sit in the same
 * directory as a TASK.md — that signals "owned by this task" and
 * prevents stray .json files from passing the gate.
 */
export function isAllowedDataInTasks(
  path: string,
  tasksDir: string,
): boolean {
  const ext = extname(path).toLowerCase();
  if (!(TASK_DATA_EXTENSIONS as readonly string[]).includes(ext)) {
    return false;
  }
  const relPath = relative(tasksDir, path);
  if (relPath.startsWith("..") || relPath === "" || relPath === ".") {
    return false;
  }
  const parentDir = dirname(path);
  return existsSync(join(parentDir, "TASK.md"));
}

export function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files.sort();
}

export function listMarkdownFiles(dir: string): string[] {
  return listFilesRecursive(dir).filter(isMarkdownFile);
}

export function listExecutableFiles(dir: string): PlaybookExecutable[] {
  return listFilesRecursive(dir)
    .filter(isExecutableFile)
    .map((path) => {
      const ext = extname(path);
      const rawName = basename(path, ext).replace(/\.(check|test|seed|script)$/, "");
      return {
        name: rawName,
        path,
        relativePath: relative(dir, path),
        language: ext === ".py" ? "py" : ext === ".sh" ? "sh" : "js",
      };
    });
}

export function readTextFile(path: string): string {
  return readFileSync(path, "utf8");
}
