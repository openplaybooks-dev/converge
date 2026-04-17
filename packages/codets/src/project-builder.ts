/**
 * ProjectBuilder — virtual file tree manager with disk flush.
 *
 * Collects generated files in memory (Map<path, content>). Each file
 * is built using a builder of type B (any CoreBuilder subclass)
 * created by a factory function.
 *
 * File tree operations (file, rawFile, dir, remove, rename, merge)
 * are all in-memory. Call `flush(rootDir)` to write everything to disk.
 *
 * @example
 * ```ts
 * const project = new ProjectBuilder(() => new ReactBuilder());
 * project.file('src/app/page.tsx', b => {
 *   b.useClient().fn('Page', '', b => b.returnJsx(b => b.line('<h1>Hi</h1>')),
 *     { exported: true, default: true });
 * });
 * project.flush('/path/to/output');
 * ```
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { CoreBuilder } from './core-builder.ts';
import { SemanticBuilder } from './semantic/index.ts';

// ── Flush types ──────────────────────────────────────────────────────

export interface FlushOptions {
  /** When true, don't write — just return what would be written. */
  dryRun?: boolean;
  /** Remove the target directory before writing. */
  clean?: boolean;
  /** File encoding (default: 'utf-8'). */
  encoding?: BufferEncoding;
  /** Callback invoked for each file written. */
  onWrite?: (relPath: string, content: string) => void;
  /** Callback invoked for each directory created. */
  onMkdir?: (relPath: string) => void;
  /** Only write files whose content differs from what's on disk. */
  diffOnly?: boolean;
}

export interface FlushResult {
  /** Files written (relative paths). */
  files: string[];
  /** Directories created. */
  dirs: string[];
  /** Files skipped because content was unchanged (diffOnly mode). */
  unchanged: string[];
}

// ── ProjectBuilder ───────────────────────────────────────────────────

export class ProjectBuilder<B extends CoreBuilder = CoreBuilder> {
  private _files = new Map<string, string>();
  private _rawFiles = new Map<string, string>();
  private _dirs = new Set<string>();
  protected _factory: () => B;

  constructor(factory: () => B) {
    this._factory = factory;
  }

  // ── File operations ──────────────────────────────────────────

  /**
   * Add a generated file. The callback receives a fresh builder
   * of type B to populate the file content.
   */
  file(path: string, build: (b: B) => void): this {
    const b = this._factory();
    build(b);
    this._files.set(path, b.toString());
    this._ensureParentDirs(path);
    return this;
  }

  /**
   * Add a file with raw string content (no builder).
   * Useful for JSON, CSS, config files, etc.
   */
  rawFile(path: string, content: string): this {
    this._rawFiles.set(path, content);
    this._ensureParentDirs(path);
    return this;
  }

  // ── Typed file helpers ─────────────────────────────────────

  /**
   * Add a CSS file with raw content.
   */
  css(path: string, content: string): this {
    return this.rawFile(path, content);
  }

  /**
   * Add a JSON file from a JavaScript value.
   * Serializes with 2-space indentation and a trailing newline.
   */
  json(path: string, data: unknown): this {
    return this.rawFile(path, JSON.stringify(data, null, 2) + '\n');
  }

  /**
   * Add a TypeScript source file using the SemanticBuilder (v2).
   * The callback receives a fresh SemanticBuilder — no manual commas,
   * braces, or quotes needed.
   */
  semantic(path: string, build: (b: SemanticBuilder) => void): this {
    const sb = new SemanticBuilder();
    build(sb);
    return this.rawFile(path, sb.toString());
  }

  // ── Directory operations ──────────────────────────────────

  /**
   * Register a directory to be created (even if empty).
   */
  dir(path: string): this {
    this._dirs.add(path);
    return this;
  }

  /**
   * Remove a file from the virtual tree.
   * Removes from both built and raw file maps.
   */
  remove(path: string): this {
    this._files.delete(path);
    this._rawFiles.delete(path);
    return this;
  }

  /**
   * Rename a file in the virtual tree.
   * Moves content from oldPath to newPath, updating parent dirs.
   */
  rename(oldPath: string, newPath: string): this {
    const content = this._files.get(oldPath);
    if (content !== undefined) {
      this._files.delete(oldPath);
      this._files.set(newPath, content);
    }
    const rawContent = this._rawFiles.get(oldPath);
    if (rawContent !== undefined) {
      this._rawFiles.delete(oldPath);
      this._rawFiles.set(newPath, rawContent);
    }
    this._ensureParentDirs(newPath);
    return this;
  }

  /**
   * Merge another ProjectBuilder's files into this one.
   * Files from `other` overwrite files at the same path.
   */
  merge(other: ProjectBuilder<any>): this {
    for (const [path, content] of other.files()) {
      this._rawFiles.set(path, content);
      this._ensureParentDirs(path);
    }
    for (const d of other.dirPaths) {
      this._dirs.add(d);
    }
    return this;
  }

  // ── Query operations ─────────────────────────────────────────

  /** Check if a file has been registered (built or raw). */
  has(path: string): boolean {
    return this._files.has(path) || this._rawFiles.has(path);
  }

  /** Get the content of a registered file, or undefined. */
  getContent(path: string): string | undefined {
    return this._files.get(path) ?? this._rawFiles.get(path);
  }

  /** Get all registered file paths (built + raw). */
  get filePaths(): string[] {
    return [...new Set([...this._files.keys(), ...this._rawFiles.keys()])];
  }

  /** Get all registered directory paths. */
  get dirPaths(): string[] {
    return [...this._dirs];
  }

  /** Iterate all files as [path, content] pairs. */
  *files(): IterableIterator<[string, string]> {
    for (const [path, content] of this._files) {
      yield [path, content];
    }
    for (const [path, content] of this._rawFiles) {
      if (!this._files.has(path)) {
        yield [path, content];
      }
    }
  }

  /** Total number of registered files. */
  get fileCount(): number {
    return new Set([...this._files.keys(), ...this._rawFiles.keys()]).size;
  }

  /** Iterate each file — convenience for side-effecting operations. */
  forEach(fn: (path: string, content: string) => void): void {
    for (const [path, content] of this.files()) {
      fn(path, content);
    }
  }

  // ── Builder access ───────────────────────────────────────────

  /** Create a new builder instance (useful for building content outside of file()). */
  createBuilder(): B {
    return this._factory();
  }

  // ── Disk operations ──────────────────────────────────────────

  /**
   * Write all collected files and directories to disk.
   *
   * @param rootDir — Absolute path to the output directory.
   * @param opts — Flush options (dryRun, clean, diffOnly, callbacks).
   * @returns FlushResult with files written, dirs created, and unchanged files.
   */
  flush(rootDir: string, opts: FlushOptions = {}): FlushResult {
    const {
      dryRun = false,
      clean = false,
      encoding = 'utf-8',
      onWrite,
      onMkdir,
      diffOnly = false,
    } = opts;

    const result: FlushResult = { files: [], dirs: [], unchanged: [] };

    // Clean target directory if requested
    if (clean && !dryRun && existsSync(rootDir)) {
      rmSync(rootDir, { recursive: true, force: true });
    }

    // Create all registered directories
    const sortedDirs = [...this._dirs].sort();
    for (const relDir of sortedDirs) {
      const absDir = join(rootDir, relDir);
      if (!dryRun) {
        mkdirSync(absDir, { recursive: true });
      }
      result.dirs.push(relDir);
      onMkdir?.(relDir);
    }

    // Write all files
    for (const [relPath, content] of this.files()) {
      const absPath = join(rootDir, relPath);

      // Ensure parent directory exists (safety net beyond registered dirs)
      if (!dryRun) {
        mkdirSync(dirname(absPath), { recursive: true });
      }

      // Skip unchanged files in diffOnly mode
      if (diffOnly && existsSync(absPath)) {
        try {
          const existing = readFileSync(absPath, encoding);
          if (existing === content) {
            result.unchanged.push(relPath);
            continue;
          }
        } catch {
          // File exists but can't read — write anyway
        }
      }

      if (!dryRun) {
        writeFileSync(absPath, content, encoding);
      }
      result.files.push(relPath);
      onWrite?.(relPath, content);
    }

    return result;
  }

  // ── Internals ────────────────────────────────────────────────

  /** Auto-register parent directories for a file path. */
  private _ensureParentDirs(filePath: string): void {
    const parts = filePath.split('/');
    for (let i = 1; i < parts.length; i++) {
      this._dirs.add(parts.slice(0, i).join('/'));
    }
  }
}
