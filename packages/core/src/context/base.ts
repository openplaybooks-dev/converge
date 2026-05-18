/**
 * Base Context Implementation
 *
 * Provides common functionality for all context levels.
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  rmSync,
  cpSync,
} from "node:fs";
import { join } from "node:path";
import { execSync, spawn } from "node:child_process";
import { glob } from "glob";
import type {
  FileSystemAPI,
  ShellAPI,
  ShellExecOptions,
  ShellResult,
  GitAPI,
  LoggerAPI,
} from "./types.ts";

/* ------------------------------------------------------------------ */
/*  Filesystem API Implementation                                     */
/* ------------------------------------------------------------------ */

export class FileSystemAPIImpl implements FileSystemAPI {
  constructor(private projectDir: string) {}

  async read(path: string): Promise<string> {
    const absPath = join(this.projectDir, path);
    if (!existsSync(absPath)) {
      throw new Error(`File not found: ${path}`);
    }
    return readFileSync(absPath, "utf8");
  }

  async write(path: string, content: string): Promise<void> {
    const absPath = join(this.projectDir, path);
    writeFileSync(absPath, content, "utf8");
  }

  async exists(path: string): Promise<boolean> {
    const absPath = join(this.projectDir, path);
    return existsSync(absPath);
  }

  async list(path: string, pattern?: string): Promise<string[]> {
    const absPath = join(this.projectDir, path);
    if (!existsSync(absPath)) {
      return [];
    }

    if (pattern) {
      const matches = await glob(pattern, { cwd: absPath });
      return matches;
    }

    return readdirSync(absPath);
  }

  async mkdir(path: string): Promise<void> {
    const absPath = join(this.projectDir, path);
    mkdirSync(absPath, { recursive: true });
  }

  async rm(path: string, recursive?: boolean): Promise<void> {
    const absPath = join(this.projectDir, path);
    if (!existsSync(absPath)) {
      return;
    }
    rmSync(absPath, { recursive });
  }

  async copy(src: string, dest: string): Promise<void> {
    const absSrc = join(this.projectDir, src);
    const absDest = join(this.projectDir, dest);
    cpSync(absSrc, absDest, { recursive: true });
  }
}

/* ------------------------------------------------------------------ */
/*  Shell API Implementation                                          */
/* ------------------------------------------------------------------ */

export class ShellAPIImpl implements ShellAPI {
  constructor(private projectDir: string) {}

  async exec(
    command: string,
    options?: ShellExecOptions,
  ): Promise<ShellResult> {
    const cwd = options?.cwd
      ? join(this.projectDir, options.cwd)
      : this.projectDir;
    const timeout = options?.timeout || 120000; // 2 minutes default

    try {
      const stdout = execSync(command, {
        cwd,
        env: { ...process.env, ...options?.env },
        timeout,
        encoding: "utf8",
        stdio: options?.capture !== false ? "pipe" : "inherit",
      });

      return {
        exitCode: 0,
        stdout: typeof stdout === "string" ? stdout : "",
        stderr: "",
        success: true,
      };
    } catch (error: any) {
      return {
        exitCode: error.status || 1,
        stdout: error.stdout?.toString() || "",
        stderr: error.stderr?.toString() || error.message,
        success: false,
      };
    }
  }

  async stream(command: string, options?: ShellExecOptions): Promise<void> {
    const cwd = options?.cwd
      ? join(this.projectDir, options.cwd)
      : this.projectDir;

    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        cwd,
        env: { ...process.env, ...options?.env },
        shell: true,
        stdio: "inherit",
      });

      if (options?.timeout) {
        setTimeout(() => {
          child.kill();
          reject(new Error(`Command timed out after ${options.timeout}ms`));
        }, options.timeout);
      }

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on("error", reject);
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Git API Implementation                                            */
/* ------------------------------------------------------------------ */

export class GitAPIImpl implements GitAPI {
  constructor(private projectDir: string) {}

  async getCurrentCommit(): Promise<string> {
    const result = execSync("git rev-parse HEAD", {
      cwd: this.projectDir,
      encoding: "utf8",
    });
    return result.trim();
  }

  async getCurrentBranch(): Promise<string> {
    const result = execSync("git branch --show-current", {
      cwd: this.projectDir,
      encoding: "utf8",
    });
    return result.trim();
  }

  async isClean(): Promise<boolean> {
    const result = execSync("git status --porcelain", {
      cwd: this.projectDir,
      encoding: "utf8",
    });
    return result.trim() === "";
  }

  async getModifiedFiles(): Promise<string[]> {
    const result = execSync("git status --porcelain", {
      cwd: this.projectDir,
      encoding: "utf8",
    });

    return result
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => line.substring(3)); // Remove status prefix
  }

  async getDiff(file: string): Promise<string> {
    const result = execSync(`git diff HEAD -- ${file}`, {
      cwd: this.projectDir,
      encoding: "utf8",
    });
    return result;
  }

  async commit(message: string): Promise<void> {
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
      cwd: this.projectDir,
      stdio: "inherit",
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Logger API Implementation                                         */
/* ------------------------------------------------------------------ */

export class LoggerAPIImpl implements LoggerAPI {
  constructor(private prefix?: string) {}

  debug(message: string, meta?: Record<string, unknown>): void {
    const prefixed = this.prefix ? `[${this.prefix}] ${message}` : message;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    console.debug(`[DEBUG] ${prefixed}${metaStr}`);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    const prefixed = this.prefix ? `[${this.prefix}] ${message}` : message;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    console.info(`[INFO] ${prefixed}${metaStr}`);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    const prefixed = this.prefix ? `[${this.prefix}] ${message}` : message;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    console.warn(`[WARN] ${prefixed}${metaStr}`);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    const prefixed = this.prefix ? `[${this.prefix}] ${message}` : message;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    console.error(`[ERROR] ${prefixed}${metaStr}`);
  }

  child(prefix: string): LoggerAPI {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new LoggerAPIImpl(childPrefix);
  }
}
