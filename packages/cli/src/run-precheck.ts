/**
 * `converge run` precheck — refuse to silently override prior run state.
 *
 * When the user invokes `converge run` and the target playbook already has
 * journal state on disk, we stop and ask. Explicit `--resume` (or the `retry`
 * alias which sets `resume = true`) bypasses the prompt entirely.
 *
 * Non-TTY shells (CI) abort with a remediation message instead of guessing —
 * the whole point of this gate is to eliminate silent defaults.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const EXIT_FLAG_CONFLICT = 2;
const EXIT_NON_TTY = 2;
const EXIT_USER_ABORT = 130;

export interface PrecheckResult {
  /** Resume flag to thread downstream into the run invocation. */
  resume: boolean;
}

export interface PrecheckOptions {
  projectDir: string;
  playbookDir: string;
  playbookName: string;
  /** `--resume` (or set true by the `retry` alias). */
  resume: boolean;
  /**
   * Injected hash provider — defaults to a dynamic import of
   * `@openplaybooks/converge-core/playbook`. Tests pass a stub.
   */
  hashProvider?: HashProvider;
  /**
   * Injected prompt provider — defaults to a dynamic import of
   * `@clack/prompts`. Tests pass a stub that scripts the selection.
   */
  promptProvider?: PromptProvider;
  /** Override TTY detection (tests). */
  isTTY?: boolean;
}

export interface HashProvider {
  calculate(dir: string): Promise<{ hash: string; fileHashes?: Record<string, string> }>;
  readSnapshot(dir: string): Promise<{ fileHashes?: Record<string, string> } | null>;
}

export interface PromptProvider {
  intro(message: string): void;
  log: { info(message: string): void };
  cancel(message: string): void;
  isCancel(value: unknown): boolean;
  select(opts: {
    message: string;
    initialValue: string;
    options: Array<{ value: string; label: string; hint?: string }>;
  }): Promise<string | symbol>;
}

/**
 * Sentinel thrown when the run must not proceed. The caller catches,
 * releases the run lock, and `process.exit(err.exitCode)`. Distinct from
 * generic errors so callers don't print a misleading stack trace.
 */
export class PrecheckExitError extends Error {
  readonly exitCode: number;
  constructor(exitCode: number, message: string = "precheck exit") {
    super(message);
    this.name = "PrecheckExitError";
    this.exitCode = exitCode;
  }
}

export interface FileDiff {
  added: string[];
  removed: string[];
  modified: string[];
}

export function diffFileHashes(
  prev: Record<string, string> | undefined,
  curr: Record<string, string>,
): FileDiff {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  if (!prev) return { added, removed, modified };
  for (const f of Object.keys(curr).sort()) {
    if (!(f in prev)) added.push(f);
    else if (prev[f] !== curr[f]) modified.push(f);
  }
  for (const f of Object.keys(prev).sort()) {
    if (!(f in curr)) removed.push(f);
  }
  return { added, removed, modified };
}

function formatDiff(diff: FileDiff, maxItems = 5): string {
  const lines: string[] = [];
  for (const f of diff.modified.slice(0, maxItems)) lines.push(`  M ${f}`);
  for (const f of diff.added.slice(0, maxItems)) lines.push(`  + ${f}`);
  for (const f of diff.removed.slice(0, maxItems)) lines.push(`  - ${f}`);
  const shown =
    Math.min(diff.modified.length, maxItems) +
    Math.min(diff.added.length, maxItems) +
    Math.min(diff.removed.length, maxItems);
  const total = diff.modified.length + diff.added.length + diff.removed.length;
  if (total > shown) lines.push(`  … and ${total - shown} more`);
  return lines.join("\n");
}

function runstatePath(projectDir: string, playbookName: string): string {
  return join(projectDir, ".converge", "journal", playbookName, "runstate.json");
}

function readPrevRunHash(projectDir: string, playbookName: string): string | undefined {
  const p = runstatePath(projectDir, playbookName);
  if (!existsSync(p)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(p, "utf-8"));
    const h = parsed?.metadata?.playbook_hash;
    return typeof h === "string" && h.length > 0 ? h : undefined;
  } catch {
    return undefined;
  }
}

async function defaultHashProvider(): Promise<HashProvider> {
  const mod = (await import("@openplaybooks/converge-core")) as unknown as {
    calculatePlaybookHash: (dir: string) => Promise<{ hash: string; fileHashes?: Record<string, string> }>;
    readPlaybookHash: (dir: string) => Promise<{ fileHashes?: Record<string, string> } | null>;
  };
  return {
    calculate: mod.calculatePlaybookHash,
    readSnapshot: mod.readPlaybookHash,
  };
}

async function defaultPromptProvider(): Promise<PromptProvider> {
  return (await import("@clack/prompts")) as unknown as PromptProvider;
}

/**
 * Decide what `converge run` should do when prior journal state exists.
 *
 * Returns `{ resume }` for the caller to merge into options.
 * Throws `PrecheckExitError` when the run should not proceed (non-TTY without
 * explicit intent, or user-selected abort).
 */
export async function precheckRunState(opts: PrecheckOptions): Promise<PrecheckResult> {
  const { projectDir, playbookDir, playbookName } = opts;

  // 1. Explicit intent — no prompt.
  if (opts.resume) return { resume: true };

  // 2. No prior state — brand-new run.
  if (!existsSync(runstatePath(projectDir, playbookName))) {
    return { resume: false };
  }

  // 4. Prior state exists; compare hashes.
  const prevHash = readPrevRunHash(projectDir, playbookName);

  const hashProvider = opts.hashProvider ?? (await defaultHashProvider());
  let currHash: string | undefined;
  let currFileHashes: Record<string, string> = {};
  try {
    const fresh = await hashProvider.calculate(playbookDir);
    currHash = fresh.hash;
    currFileHashes = fresh.fileHashes ?? {};
  } catch {
    // Playbook unreadable — treat as "changed", recommend wipe.
  }

  const unchanged =
    prevHash !== undefined && currHash !== undefined && prevHash === currHash;

  // 5. Non-TTY → abort with remediation.
  const tty = opts.isTTY ?? Boolean(process.stdin.isTTY && process.stdout.isTTY);
  if (!tty) {
    // Detect zombie runstate to suggest reconcile
    let isZombie = false;
    try {
      const parsed = JSON.parse(readFileSync(runstatePath(projectDir, playbookName), "utf-8"));
      const nodes = parsed?.dag?.nodes ?? {};
      const nodeCount = Object.keys(nodes).length;
      if (nodeCount === 0) isZombie = true;
    } catch {
      isZombie = true;
    }

    const staleHint = isZombie
      ? `\n   ⚠️  Runstate appears stale (0 active DAG nodes). Clean first:\n` +
        `      converge clean --all --playbook=${playbookName}  # reset playbook state\n`
      : "";

    process.stderr.write(
      `\n❌ Existing run state found at ${runstatePath(projectDir, playbookName)}.\n` +
        `   This is a non-interactive shell — re-run with an explicit intent:${reconcileHint}\n\n` +
        `      converge run --resume         # continue prior run\n` +
        `      converge clean --select '<task>+'   # reset specific tasks\n` +
        `      converge retry                # alias for --resume\n\n` +
        `   (In an interactive terminal, converge will prompt instead.)\n\n`,
    );
    throw new PrecheckExitError(EXIT_NON_TTY, "non-interactive shell, prior state exists");
  }

  // 6. Per-file diff (only when changed) for prompt body.
  let bodyExtra = "";
  if (!unchanged) {
    try {
      const prevSnap = await hashProvider.readSnapshot(playbookDir);
      const diff = diffFileHashes(prevSnap?.fileHashes, currFileHashes);
      const total = diff.modified.length + diff.added.length + diff.removed.length;
      if (total > 0) bodyExtra = `\n${formatDiff(diff, 5)}`;
    } catch {
      // ignore — rollup compare already told us it changed
    }
  }

  // 7. Prompt.
  const p = opts.promptProvider ?? (await defaultPromptProvider());
  const initialValue = "resume";

  let body: string;
  if (prevHash === undefined) {
    body =
      `Previous run state found for "${playbookName}".\n` +
      `Cannot verify whether the playbook changed — runstate pre-dates hash tracking.`;
  } else if (unchanged) {
    body =
      `Previous run state found for "${playbookName}".\n` +
      `Playbook unchanged since that run.`;
  } else {
    body =
      `Previous run state found for "${playbookName}".\n` +
      `Playbook has changed since that run:${bodyExtra || " (per-file diff unavailable)"}`;
  }

  p.intro(`converge run — ${playbookName}`);
  p.log.info(body);

  const choice = await p.select({
    message: "How do you want to proceed?",
    initialValue,
    options: [
      {
        value: "resume",
        label: "Resume — keep progress from last run",
        hint: unchanged ? "default" : "RISKY — playbook changed",
      },
      { value: "abort", label: "Abort — exit without running" },
    ],
  });

  if (p.isCancel(choice) || choice === "abort") {
    p.cancel("Aborted by user.");
    throw new PrecheckExitError(EXIT_USER_ABORT, "user abort");
  }

  return { resume: true };
}
