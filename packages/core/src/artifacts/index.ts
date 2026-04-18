/**
 * Artifacts Module
 *
 * Manages named file artifacts with flat layout by default.
 * set() overwrites directly; put() moves existing to _history first.
 *
 * Layout: .converge/artifacts/<keyDir>/<file>.md          (current)
 *         .converge/artifacts/<keyDir>/_history/<ts>/<file>.md  (previous)
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ArtifactAPI {
  /**
   * Return the absolute path for a key.
   * Returns undefined if the key has never been set.
   */
  getPath(key: string): string | undefined;

  /**
   * Return the relative path (relative to projectDir) for a key.
   * Portable across machines — safe to embed in TASK.md files.
   * Returns undefined if the key has never been set.
   */
  getRelPath(key: string): string | undefined;

  /**
   * Write content directly, overwriting any existing file.
   * Returns the absolute path of the written file.
   */
  set(key: string, content: string): string;

  /**
   * Write content, moving any existing file to _history/<timestamp>/ first.
   * Returns the absolute path of the written file.
   */
  put(key: string, content: string): string;

  /**
   * Return all keys mapped to their latest absolute path.
   */
  list(): Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Implementation                                                     */
/* ------------------------------------------------------------------ */

const ARTIFACTS_ROOT = ".converge/artifacts";

/** Convert a key basename to a filename. Append .md only if no extension present. */
function toFileName(keyFile: string): string {
  return keyFile.includes(".") ? keyFile : `${keyFile}.md`;
}

export class ArtifactStore implements ArtifactAPI {
  constructor(private readonly projectDir: string) {}

  getPath(key: string): string | undefined {
    const relPath = this.getRelPath(key);
    return relPath ? join(this.projectDir, relPath) : undefined;
  }

  getRelPath(key: string): string | undefined {
    const relPath = join(
      ARTIFACTS_ROOT,
      dirname(key),
      toFileName(basename(key)),
    );
    return existsSync(join(this.projectDir, relPath))
      ? relPath.replace(/\\/g, "/")
      : undefined;
  }

  set(key: string, content: string): string {
    const relPath = join(
      ARTIFACTS_ROOT,
      dirname(key),
      toFileName(basename(key)),
    );
    const absPath = join(this.projectDir, relPath);
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, content, "utf8");
    return absPath;
  }

  put(key: string, content: string): string {
    const keyDir = dirname(key);
    const fileName = toFileName(basename(key));
    const relPath = join(ARTIFACTS_ROOT, keyDir, fileName);
    const absPath = join(this.projectDir, relPath);

    // Move existing file to _history/<timestamp>/
    if (existsSync(absPath)) {
      const histDir = join(
        this.projectDir,
        ARTIFACTS_ROOT,
        keyDir,
        "_history",
        String(Date.now()),
      );
      mkdirSync(histDir, { recursive: true });
      renameSync(absPath, join(histDir, fileName));
    }

    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, content, "utf8");
    return absPath;
  }

  list(): Record<string, string> {
    const result: Record<string, string> = {};
    const rootDir = join(this.projectDir, ARTIFACTS_ROOT);
    if (!existsSync(rootDir)) return result;
    this.scanDir(rootDir, "", result);
    return result;
  }

  /* ---------------------------------------------------------------- */
  /*  Internal helpers                                                 */
  /* ---------------------------------------------------------------- */

  /** Recursively scan artifact dirs for .md files, skipping _history */
  private scanDir(
    absDir: string,
    relKeyDir: string,
    result: Record<string, string>,
  ): void {
    let entries;
    try {
      entries = readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === "_history") continue;
        const childRel = relKeyDir
          ? `${relKeyDir}/${entry.name}`
          : entry.name;
        this.scanDir(join(absDir, entry.name), childRel, result);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const keyFile = entry.name.replace(/\.md$/, "");
        const key = relKeyDir ? `${relKeyDir}/${keyFile}` : keyFile;
        result[key] = join(absDir, entry.name);
      }
    }
  }
}
