/**
 * Artifacts Module
 *
 * Manages named file artifacts with folder-based versioning.
 * Each set() writes into a timestamped folder; getPath() returns the latest.
 *
 * Layout: .harness/artifacts/<keyDir>/<timestamp>/<file>.md
 *         .harness/artifacts/<keyDir>/<timestamp>/manifest.json
 *
 * Folder names are epoch-millis timestamps (e.g. 1712764800000).
 * Largest number = latest version. No central manifest, no sequential
 * counters — parallel writers to different keyDirs never conflict.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ArtifactRevision {
  revision: number;
  /** Path relative to projectDir */
  path: string;
  createdAt: string;
}

export interface ArtifactEntry {
  /** Latest revision number */
  revision: number;
  /** Latest file path, relative to projectDir */
  path: string;
  updatedAt: string;
  history: ArtifactRevision[];
}

export type ArtifactManifest = Record<string, ArtifactEntry>;

/** Per-version manifest stored alongside artifact files */
interface VersionManifest {
  createdAt: string;
  files: Record<string, string>; // fileBasename → relative path
}

export interface ArtifactAPI {
  /**
   * Return the absolute path for a key (latest version).
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
   * Write content into a timestamped version folder.
   * Returns the absolute path of the written file.
   */
  set(key: string, content: string): string;

  /**
   * Register an existing file under key as a new version.
   * Path is relative to projectDir.
   */
  register(key: string, relativePath: string): void;

  /**
   * Return all keys mapped to their latest absolute path.
   */
  list(): Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Implementation                                                     */
/* ------------------------------------------------------------------ */

const ARTIFACTS_ROOT = '.harness/artifacts';

/** Regex matching timestamp folder names (epoch millis, 13+ digits) */
const TS_DIR_RE = /^\d{13,}$/;

/** Convert a key basename to a filename. Append .md only if no extension present. */
function toFileName(keyFile: string): string {
  return keyFile.includes('.') ? keyFile : `${keyFile}.md`;
}

export class ArtifactStore implements ArtifactAPI {
  constructor(private readonly projectDir: string) {}

  getPath(key: string): string | undefined {
    const relPath = this.getRelPath(key);
    return relPath ? join(this.projectDir, relPath) : undefined;
  }

  getRelPath(key: string): string | undefined {
    const keyDir = dirname(key);
    const keyFile = basename(key);
    const latest = this.latestFolder(keyDir);
    if (!latest) return undefined;

    const relPath = join(ARTIFACTS_ROOT, keyDir, latest, toFileName(keyFile)).replace(/\\/g, '/');
    const absPath = join(this.projectDir, relPath);
    if (!existsSync(absPath)) return undefined;
    return relPath;
  }

  set(key: string, content: string): string {
    const keyDir = dirname(key);
    const keyFile = basename(key);
    const fileName = `${keyFile}.md`;

    // Reuse the latest folder if this file isn't in it yet.
    // This lets multiple keys with the same keyDir (e.g. report + report.json)
    // land in the same version folder within a single run.
    const latest = this.latestFolder(keyDir);
    let folder: string;
    if (latest) {
      const existingPath = join(this.projectDir, ARTIFACTS_ROOT, keyDir, latest, fileName);
      folder = existsSync(existingPath) ? String(Date.now()) : latest;
    } else {
      folder = String(Date.now());
    }

    const relPath = join(ARTIFACTS_ROOT, keyDir, folder, fileName).replace(/\\/g, '/');
    const absPath = join(this.projectDir, relPath);
    const versionDir = dirname(absPath);

    mkdirSync(versionDir, { recursive: true });
    writeFileSync(absPath, content, 'utf8');

    // Write per-version manifest
    this.writeVersionManifest(versionDir, fileName, relPath);

    return absPath;
  }

  register(key: string, relativePath: string): void {
    const keyDir = dirname(key);
    const keyFile = basename(key);
    const fileName = `${keyFile}.md`;
    const relPath = relativePath.replace(/\\/g, '/');

    // Reuse latest folder if this file isn't in it yet
    const latest = this.latestFolder(keyDir);
    let folder: string;
    if (latest) {
      const vManifest = this.loadVersionManifest(
        join(this.projectDir, ARTIFACTS_ROOT, keyDir, latest, 'manifest.json'),
      );
      folder = vManifest?.files[fileName] ? String(Date.now()) : latest;
    } else {
      folder = String(Date.now());
    }

    const versionDir = join(this.projectDir, ARTIFACTS_ROOT, keyDir, folder);
    mkdirSync(versionDir, { recursive: true });

    this.writeVersionManifest(versionDir, fileName, relPath);
  }

  list(): Record<string, string> {
    const result: Record<string, string> = {};
    const rootDir = join(this.projectDir, ARTIFACTS_ROOT);
    if (!existsSync(rootDir)) return result;
    this.scanDir(rootDir, '', result);
    return result;
  }

  /* ---------------------------------------------------------------- */
  /*  Internal helpers                                                 */
  /* ---------------------------------------------------------------- */

  /** Return the name of the latest timestamp folder under keyDir, or undefined. */
  private latestFolder(keyDir: string): string | undefined {
    const dir = join(this.projectDir, ARTIFACTS_ROOT, keyDir);
    if (!existsSync(dir)) return undefined;

    let max = '';
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (TS_DIR_RE.test(entry.name) && entry.name > max) {
        max = entry.name;
      }
    }
    return max || undefined;
  }

  /** Write or merge a per-version manifest.json */
  private writeVersionManifest(versionDir: string, fileName: string, relPath: string): void {
    const manifestPath = join(versionDir, 'manifest.json');
    const existing = this.loadVersionManifest(manifestPath);
    const now = new Date().toISOString();
    const manifest: VersionManifest = {
      createdAt: existing?.createdAt ?? now,
      files: { ...(existing?.files ?? {}), [fileName]: relPath },
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  }

  /** Recursively scan artifact dirs for timestamp folders with manifest.json */
  private scanDir(absDir: string, relKeyDir: string, result: Record<string, string>): void {
    let entries;
    try { entries = readdirSync(absDir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      if (TS_DIR_RE.test(entry.name)) {
        // This is a version folder — read its manifest
        const manifestPath = join(absDir, entry.name, 'manifest.json');
        const vm = this.loadVersionManifest(manifestPath);
        if (!vm) continue;

        for (const [fileName] of Object.entries(vm.files)) {
          const keyFile = fileName.replace(/\.md$/, '');
          const key = relKeyDir ? `${relKeyDir}/${keyFile}` : keyFile;
          const existingTs = result[key] ? this.tsFromPath(result[key]) : '';
          if (entry.name > existingTs) {
            result[key] = join(this.projectDir, ARTIFACTS_ROOT, relKeyDir, entry.name, fileName);
          }
        }
      } else {
        // Recurse into non-version subdirectory
        const childRel = relKeyDir ? `${relKeyDir}/${entry.name}` : entry.name;
        this.scanDir(join(absDir, entry.name), childRel, result);
      }
    }
  }

  /** Extract timestamp folder name from an absolute path */
  private tsFromPath(absPath: string): string {
    const m = absPath.match(/\/(\d{13,})\//);
    return m ? m[1] : '';
  }

  private loadVersionManifest(manifestPath: string): VersionManifest | undefined {
    if (!existsSync(manifestPath)) return undefined;
    try {
      return JSON.parse(readFileSync(manifestPath, 'utf8')) as VersionManifest;
    } catch {
      return undefined;
    }
  }
}
