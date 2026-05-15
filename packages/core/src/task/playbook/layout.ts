import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";

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
export const MARKDOWN_EXTENSIONS = [".md", ".markdown"] as const;

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
