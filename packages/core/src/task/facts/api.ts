/**
 * Facts API - Bash-based validation with zero parsing fragility
 *
 * Philosophy: Use shell commands directly instead of complex abstractions.
 * Every fact is a simple boolean: exit 0 = true, exit 1 = false.
 */

import { exec, spawn } from "child_process";
import { promisify } from "util";
import { appendFile, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { getJournalStructure } from "../../journal/structure.js";

const execAsync = promisify(exec);

/**
 * Exec a check command in its own process group so background processes
 * the check spawns (e.g. `pnpm preview &`) get killed along with it.
 *
 * Without this, checks that spawn long-running children leak orphans
 * across attempts — orphans hold ports/files and cause subsequent runs
 * to false-fail (lighthouse hits port 4321 already-bound by orphan; new
 * preview can't start; lighthouse scores 0; check fails despite the page
 * being correct).
 *
 * On Windows: falls back to plain exec (no process-group concept).
 */
async function execInProcessGroup(
  cmd: string,
  opts: { cwd: string; timeoutMs: number },
): Promise<{ stdout: string; stderr: string; exitCode: number; killed?: boolean }> {
  if (process.platform === "win32") {
    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: opts.cwd,
        timeout: opts.timeoutMs,
        shell: "bash",
      });
      return { stdout, stderr, exitCode: 0 };
    } catch (err: any) {
      return {
        stdout: err.stdout ?? "",
        stderr: err.stderr ?? "",
        exitCode: typeof err.code === "number" ? err.code : 1,
        killed: !!err.killed,
      };
    }
  }

  return new Promise((resolve) => {
    const child = spawn("/bin/bash", ["-c", cmd], {
      cwd: opts.cwd,
      detached: true, // become process-group leader
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const killGroup = (signal: NodeJS.Signals = "SIGTERM") => {
      if (typeof child.pid === "number") {
        try {
          // Negative PID → kill entire process group.
          process.kill(-child.pid, signal);
        } catch {
          // Group already gone or never spawned. Best-effort.
        }
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killGroup("SIGTERM");
      // SIGKILL backstop in case child traps SIGTERM and stalls.
      setTimeout(() => killGroup("SIGKILL"), 1500).unref();
    }, opts.timeoutMs);
    timer.unref();

    const finalize = (exitCode: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Belt-and-braces: kill any group survivors (background `&` jobs)
      // even on a clean exit. The check might have launched a daemon and
      // returned 0; we still want the daemon dead so the next attempt's
      // check can claim the same port.
      killGroup("SIGTERM");
      setTimeout(() => killGroup("SIGKILL"), 250).unref();
      resolve({ stdout, stderr, exitCode, killed: timedOut });
    };

    child.on("error", (err) => {
      stderr += `\n[converge] spawn error: ${err.message}`;
      finalize(1);
    });
    // Use `exit` (foreground process ended) not `close` (all stdio drained).
    // When a check spawns `cmd &` the backgrounded child inherits the
    // parent's stdout/stderr pipes, so `close` never fires until that
    // grandchild exits — defeating the whole point of the timeout +
    // cleanup. `exit` fires as soon as the shell command itself returns,
    // and our `killGroup` in finalize() then kills any backgrounded
    // grandchildren that are still holding the pipes open.
    child.on("exit", (code) => {
      // Detach our pipe readers so the kill below isn't blocked by
      // backgrounded grandchildren still writing to them.
      try {
        child.stdout?.destroy();
        child.stderr?.destroy();
      } catch {
        /* ignore */
      }
      finalize(code ?? 1);
    });
  });
}

/**
 * Result of a fact check
 */
export interface FactResult {
  /** Whether the check passed (exit code 0) */
  ok: boolean;
  /** stdout/stderr output from the command */
  output: string;
  /** Exit code from the command (124 = timeout) */
  exitCode: number;
  /** How long the command took in milliseconds */
  durationMs?: number;
}

/**
 * A recorded fact with metadata
 */
export interface Fact {
  /** Unique identifier for this fact */
  id: string;
  /** Type of fact (file-exists, file-valid, check, etc.) */
  type: string;
  /** Shell command that was executed */
  cmd: string;
  /** Whether the check passed */
  ok: boolean;
  /** Command output */
  output: string;
  /** Exit code */
  exitCode: number;
  /** When this fact was collected */
  collectedAt: string;
  /** Additional metadata */
  [key: string]: any;
}

/**
 * Dead simple file checks using bash commands
 *
 * @param cmd - Shell command to run
 * @param cwd - Working directory
 * @param timeoutMs - Optional timeout override (default: 15000ms)
 * @returns Result with ok (boolean), output (string), exitCode, and durationMs
 */
export async function check(
  cmd: string,
  cwd: string,
  timeoutMs = 60_000,
): Promise<FactResult> {
  const start = Date.now();
  // Run in its own process group so background processes spawned by the
  // check (e.g. `pnpm preview &`) get killed when the check exits.
  // Default 60s — long enough for a preview-server-boot + lighthouse run,
  // short enough that a wedged check doesn't stall the whole run.
  const result = await execInProcessGroup(cmd, { cwd, timeoutMs });
  const ok = result.exitCode === 0;
  const output =
    [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join("\n") ||
    (result.killed ? `Command timed out after ${timeoutMs}ms` : "");
  return {
    ok,
    output,
    exitCode: result.killed ? 124 : result.exitCode,
    durationMs: Date.now() - start,
  };
}

/**
 * Common file check patterns
 */
export const FileChecks = {
  /** Check if file exists */
  exists: (path: string) => `test -f "${path}"`,

  /** Check if file exists and is non-empty */
  nonEmpty: (path: string) => `test -s "${path}"`,

  /** Check if directory exists */
  dirExists: (path: string) => `test -d "${path}"`,

  /** Check PNG magic bytes (first 8 bytes: 89 50 4E 47 0D 0A 1A 0A) */
  isPNG: (path: string) =>
    `node -e "const b=require('fs').readFileSync('${path}');if(b[0]!==0x89||b[1]!==0x50||b[2]!==0x4E||b[3]!==0x47)process.exit(1)"`,

  /** Check JPEG magic bytes (first 2 bytes: FF D8) */
  isJPEG: (path: string) =>
    `node -e "const b=require('fs').readFileSync('${path}');if(b[0]!==0xFF||b[1]!==0xD8)process.exit(1)"`,

  /** Check if JSON is valid */
  isValidJSON: (path: string) =>
    `node -e "JSON.parse(require('fs').readFileSync('${path}','utf8'))"`,

  /** Count lines in file */
  lineCount: (path: string) => `wc -l < "${path}"`,

  /** Get file size in bytes */
  fileSize: (path: string) =>
    `stat -f%z "${path}" 2>/dev/null || stat -c%s "${path}" 2>/dev/null`,
};

/**
 * JSON query patterns using jq
 */
export const JSONChecks = {
  /** Extract value from JSON path */
  getValue: (path: string, jsonPath: string) =>
    `jq -r '${jsonPath}' "${path}" 2>/dev/null`,

  /** Check if JSON contains key with expected value */
  hasValue: (path: string, jsonPath: string, expected: string) =>
    `jq -e '${jsonPath} == "${expected}"' "${path}" >/dev/null 2>&1`,

  /** Count array length */
  arrayLength: (path: string, jsonPath: string) =>
    `jq '${jsonPath} | length' "${path}" 2>/dev/null`,

  /** Check if key exists */
  hasKey: (path: string, jsonPath: string) =>
    `jq -e '${jsonPath}' "${path}" >/dev/null 2>&1`,
};

/**
 * Content search patterns using grep
 */
export const ContentChecks = {
  /** Check if file contains pattern */
  contains: (path: string, pattern: string) => `grep -q "${pattern}" "${path}"`,

  /** Check if file contains pattern (case insensitive) */
  containsIgnoreCase: (path: string, pattern: string) =>
    `grep -iq "${pattern}" "${path}"`,

  /** Count matches */
  countMatches: (path: string, pattern: string) =>
    `grep -c "${pattern}" "${path}"`,

  /** Extract matching lines */
  extractMatches: (path: string, pattern: string) =>
    `grep "${pattern}" "${path}"`,
};

/**
 * Portable check commands — pure Node.js, no shell dependencies.
 *
 * Use these in TASK.md check commands and TypeScript task files wherever:
 *  - The file path contains shell-special chars like ( ) [ ] spaces
 *  - The pattern contains chars that are hard to shell-quote like < > '
 *  - grep may not be installed (Windows)
 *
 * The generated commands are self-contained `node -e "..."` one-liners that
 * bash runs without issues — both path and pattern are JSON-encoded with inner
 * double-quotes escaped as \" so they're safe inside the outer bash double quotes.
 *
 * TypeScript task files — use the builders directly:
 *   checks: [{ id: 'has-router', cmd: PortableChecks.contains('src/pages/(home)/Page.tsx', 'react-router-dom') }]
 *
 * TASK.md YAML — the generated string can be pasted as-is into a YAML double-quoted scalar:
 *   cmd: "node -e \"const f=require('fs').readFileSync(\\\"src/pages/(home)/Page.tsx\\\",'utf8');if(!f.includes(\\\"react-router-dom\\\"))process.exit(1)\""
 *
 * Or use a YAML single-quoted scalar (no escaping needed):
 *   cmd: 'node -e "const f=require(''fs'').readFileSync(\"src/pages/(home)/Page.tsx\",''utf8'');if(!f.includes(\"react-router-dom''))process.exit(1)"'
 *
 * For YAML, the easiest option is to just let the auto-healer fix broken grep commands automatically.
 */

/**
 * JSON-encode a value and escape inner double-quotes for use inside a bash double-quoted string.
 * JSON.stringify gives "value" — we need \"value\" so bash doesn't end the outer "..." early.
 */
function jss(value: string): string {
  return JSON.stringify(value).replace(/"/g, '\\"');
}

export const PortableChecks = {
  /**
   * File contains the given text (exact substring, case-sensitive).
   * Handles any path or pattern including ( ) [ ] < > spaces.
   */
  contains: (file: string, text: string) =>
    `node -e "const f=require('fs').readFileSync(${jss(file)},'utf8');if(!f.includes(${jss(text)}))process.exit(1)"`,

  /**
   * File does NOT contain the given text.
   */
  notContains: (file: string, text: string) =>
    `node -e "const f=require('fs').readFileSync(${jss(file)},'utf8');if(f.includes(${jss(text)}))process.exit(1)"`,

  /**
   * File content matches a regex pattern.
   * @param flags - Optional regex flags ('i' = case-insensitive, 'm' = multiline)
   */
  matches: (file: string, pattern: string, flags = "") =>
    `node -e "const f=require('fs').readFileSync(${jss(file)},'utf8');if(!new RegExp(${jss(pattern)},${jss(flags)}).test(f))process.exit(1)"`,

  /**
   * File content does NOT match a regex pattern.
   */
  notMatches: (file: string, pattern: string, flags = "") =>
    `node -e "const f=require('fs').readFileSync(${jss(file)},'utf8');if(new RegExp(${jss(pattern)},${jss(flags)}).test(f))process.exit(1)"`,

  /**
   * File exists (any size, including empty).
   */
  exists: (file: string) => `node -e "require('fs').statSync(${jss(file)})"`,

  /**
   * Directory exists.
   */
  dirExists: (dir: string) =>
    `node -e "const s=require('fs').statSync(${jss(dir)});if(!s.isDirectory())process.exit(1)"`,

  /**
   * File exists and is non-empty (size > 0).
   */
  nonEmpty: (file: string) =>
    `node -e "const s=require('fs').statSync(${jss(file)});if(s.size===0)process.exit(1)"`,

  /**
   * JSON file parses without errors.
   */
  jsonValid: (file: string) =>
    `node -e "JSON.parse(require('fs').readFileSync(${jss(file)},'utf8'))"`,

  /**
   * JSON file has a top-level key (and optionally a specific string value).
   */
  jsonHas: (file: string, key: string, value?: string) => {
    if (value === undefined) {
      return `node -e "const o=JSON.parse(require('fs').readFileSync(${jss(file)},'utf8'));if(!(${jss(key)} in o))process.exit(1)"`;
    }
    return `node -e "const o=JSON.parse(require('fs').readFileSync(${jss(file)},'utf8'));if(String(o[${jss(key)}])!==${jss(value)})process.exit(1)"`;
  },
};

/**
 * Facts logger - persists facts to task logs.
 *
 * Structure:
 *   Task level (time-series log):
 *     .converge/journal/tasks/{epic}/tasks/{task}/logs/facts.jsonl
 *
 *   Attempt level (snapshot object for easy access via facts.x.y):
 *     .converge/journal/tasks/{epic}/tasks/{task}/attempts/{N}/data/facts.json
 *
 * Facts are task properties living in the task's directory structure.
 */
export class FactsLogger {
  /** In-memory accumulator for attempt-level snapshot — keyed by fact.id */
  private facts: Record<string, Fact> = {};

  constructor(
    private projectDir: string,
    private epicId: string,
    private taskId: string,
    private attemptNumber?: number,
  ) {}

  /**
   * Get the task-level facts log path (append-only JSONL).
   */
  private getTaskFactsLogPath(): string {
    const structure = getJournalStructure(
      this.projectDir,
      this.epicId,
      this.taskId,
    );
    return join(structure.task!, "logs", "facts.jsonl");
  }

  /**
   * Get the attempt-level facts snapshot path (JSON object, if attemptNumber is set).
   */
  private getAttemptFactsSnapshotPath(): string | null {
    if (this.attemptNumber === undefined) return null;
    const structure = getJournalStructure(
      this.projectDir,
      this.epicId,
      this.taskId,
    );
    return join(
      structure.task!,
      "attempts",
      String(this.attemptNumber).padStart(2, "0"),
      "data",
      "facts.json",
    );
  }

  /**
   * Log a fact to the task logs.
   *
   * Writes to:
   * 1. Task-level facts.jsonl (append-only log of all facts across attempts)
   * 2. Attempt-level facts.json (snapshot object for this attempt, if attemptNumber set)
   */
  async logFact(fact: Fact): Promise<void> {
    // Always append to task-level facts log (time-series)
    const taskFactsLogPath = this.getTaskFactsLogPath();
    await mkdir(join(taskFactsLogPath, ".."), { recursive: true });
    await appendFile(taskFactsLogPath, JSON.stringify(fact) + "\n");

    // Also update attempt-level facts snapshot if we're in an attempt context
    const attemptSnapshotPath = this.getAttemptFactsSnapshotPath();
    if (attemptSnapshotPath) {
      // Accumulate in memory
      this.facts[fact.id] = fact;

      // Write as JSON object snapshot for easy access (facts.x.y)
      await mkdir(join(attemptSnapshotPath, ".."), { recursive: true });
      await writeFile(attemptSnapshotPath, JSON.stringify(this.facts, null, 2));
    }
  }

  /**
   * Collect a fact and log it
   */
  async collectFact(params: {
    type: string;
    cmd: string;
    [key: string]: any;
  }): Promise<Fact> {
    const result = await check(params.cmd, this.projectDir);

    // Prefer a stable semantic key over the raw command string.
    // Priority: explicit params.id > params.checkId > params.ruleId > cmd (fallback)
    const keySlug = params.id ?? params.checkId ?? params.ruleId ?? params.cmd;
    const fact: Fact = {
      ...params,
      id: `${params.type}:${keySlug}`,
      type: params.type,
      cmd: params.cmd,
      ok: result.ok,
      output: result.output,
      exitCode: result.exitCode,
      collectedAt: new Date().toISOString(),
    };

    await this.logFact(fact);

    return fact;
  }
}

/**
 * Validation rules for common checks
 */
export interface ValidationRule {
  /** Check ID */
  id: string;
  /** Description of what this checks */
  description: string;
  /** Shell command to run */
  cmd: string;
  /** Whether this check is required (default: true) */
  required?: boolean;
}

/**
 * Validate a file against multiple rules
 */
export async function validateFile(
  path: string,
  rules: ValidationRule[],
  cwd: string,
  logger?: FactsLogger,
): Promise<{ valid: boolean; failures: ValidationRule[] }> {
  const failures: ValidationRule[] = [];

  for (const rule of rules) {
    const result = await check(rule.cmd, cwd);

    if (logger) {
      await logger.collectFact({
        type: "validation",
        ruleId: rule.id,
        path,
        description: rule.description,
        cmd: rule.cmd,
        ...result,
      });
    }

    if (!result.ok && rule.required !== false) {
      failures.push(rule);
    }
  }

  return {
    valid: failures.length === 0,
    failures,
  };
}

/**
 * Pre-defined validation rule sets
 */
export const ValidationRuleSets = {
  /** PNG file validation */
  png: (path: string): ValidationRule[] => [
    {
      id: "exists",
      description: "File exists",
      cmd: FileChecks.exists(path),
    },
    {
      id: "non-empty",
      description: "File is non-empty",
      cmd: FileChecks.nonEmpty(path),
    },
    {
      id: "valid-png",
      description: "File has PNG magic bytes",
      cmd: FileChecks.isPNG(path),
    },
  ],

  /** HTML file validation */
  html: (path: string): ValidationRule[] => [
    {
      id: "exists",
      description: "File exists",
      cmd: FileChecks.exists(path),
    },
    {
      id: "non-empty",
      description: "File is non-empty",
      cmd: FileChecks.nonEmpty(path),
    },
    {
      id: "has-html-tag",
      description: "Contains <html> tag",
      cmd: ContentChecks.containsIgnoreCase(path, "<html"),
      required: false,
    },
  ],

  /** JSON file validation */
  json: (path: string): ValidationRule[] => [
    {
      id: "exists",
      description: "File exists",
      cmd: FileChecks.exists(path),
    },
    {
      id: "non-empty",
      description: "File is non-empty",
      cmd: FileChecks.nonEmpty(path),
    },
    {
      id: "valid-json",
      description: "Valid JSON syntax",
      cmd: FileChecks.isValidJSON(path),
    },
  ],
};
