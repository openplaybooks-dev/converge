---
title: "Runtime hygiene"
description: "The boring code that makes everything else trustworthy. Atomic writes, per-attempt isolation, PID-based playbook locks, atomic Seed spawn."
sidebar:
  order: 5
---

## The boring code

Most of what makes a framework production-grade isn't the user-facing model. It's the unglamorous code that prevents corruption when the OS misbehaves, two processes race, or a power cable gets kicked.

You won't notice this code when it's working. You'll notice the *absence* of these primitives when a long-running playbook gets corrupted at hour eight and the next resume fails with `Unexpected end of JSON input`: and then you'll spend a day learning what the framework should have done to prevent it.

This page collects the four primitives that establish Converge's claim to "crash-safe by design." Each section opens with the specific failure mode the primitive prevents, then shows the implementation.

## 1. Atomic checkpoint writes

**The failure mode.** A checkpoint write happens in two stages on most filesystems: the kernel buffers the data, then flushes to disk. If a process is killed (or the machine crashes) between buffer and flush, the file on disk is partial: `JSON.parse` throws on the next resume. There's no way to recover; the data that was supposed to land never did.

The naïve `writeFile(path, data)` is exactly this two-stage process. It looks safe: single function call, no obvious window: but the race lives inside the kernel.

**The fix.** `packages/core/src/checkpoint/atomic-write.ts` wraps every checkpoint write in a write-then-rename pattern:

```typescript
// atomic-write.ts:31
export async function atomicWriteFile(
  finalPath: string,
  data: string | Uint8Array,
): Promise<void> {
  const tmp = tempPath(finalPath);
  let fd: Awaited<ReturnType<typeof open>> | null = null;
  try {
    fd = await open(tmp, "w");
    await fd.writeFile(data);
    await fd.sync();           // ← fsync: data is actually on disk
    await fd.close();
    fd = null;
    await rename(tmp, finalPath);  // ← POSIX atomic rename
  } catch (err) {
    if (fd) await fd.close().catch(() => {});
    await unlink(tmp).catch(() => {});
    throw err;
  }
}
```

Three properties make this correct:

1. **Temp file with collision-free name.** `tempPath` (line 18) generates `.{name}.tmp.{pid}.{rand}`: the random suffix prevents two writers from picking the same temp file. Two concurrent writers within one process is still a contract violation, but accidental collisions across processes are eliminated.
2. **`fsync` before rename.** Without `fd.sync()`, the data might be in the kernel page cache but not yet on disk. A power loss between rename and flush would leave the final path pointing at empty content. `fsync` forces the data out before the rename happens.
3. **POSIX atomic rename.** `rename()` is guaranteed atomic on the same filesystem: readers see either the old file or the new file, never a partial. Combined with `fsync`, this means the final path always points at a fully-written file.

Both an async path (line 31) for hot-path use and a sync path (line 60) for process-exit handlers are exported. The sync path matters because exit handlers can't `await`: if you want to checkpoint on `SIGTERM`, you need `writeSync` semantics.

**The lineage.** This is the same pattern SQLite uses for its WAL writes and that PostgreSQL uses for its checkpoint protocol. It's not novel: it's the right pattern, applied wherever `JSON.parse` failures could lose progress.

## 2. Per-attempt directory isolation

**The failure mode.** Cross-attempt contamination. Attempt 1 writes a `LEARN.md` at the task's root directory. Attempt 2 starts and inherits the LEARN.md from attempt 1, blurring the line between "what the agent learned this time" and "what was carried over." Or worse: attempt 1 writes a `wip/` directory, attempt 2 reuses it without cleaning, and the new attempt sees stale state.

**The fix.** Every attempt gets its own directory. `packages/core/src/journal/structure.ts:77`:

```typescript
export function getTaskAttemptDir(
  projectDir: string,
  epicId: string,
  taskId: string,
  attemptNumber: number | string,
): string {
  const padded =
    typeof attemptNumber === "number"
      ? String(attemptNumber).padStart(2, "0")
      : attemptNumber;
  const structure = getJournalStructure(projectDir, epicId, taskId);
  return join(structure.task!, "attempts", padded);
}
```

Attempt N writes to `tasks/<task>/attempts/<NN>/`. Padding is two-digit (`01`, `02`, …) so directory listings are lexicographically ordered: `ls attempts/` shows the run history in chronological order without parsing.

**The env-var trick.** Spawned child processes (the agent runtime, sub-tools, the AI executor) need to know their attempt directory without parameter threading through every API. Converge sets `CONVERGE_TASK_ATTEMPT` (line 71):

```typescript
function getActiveAttemptNumber(): string | undefined {
  return process.env.CONVERGE_TASK_ATTEMPT;
}
```

Any code that needs to write to "the current attempt's directory" reads the env var and constructs the path. The runner sets it once at the start of an attempt; everything downstream picks it up automatically. CI systems use the same pattern (env vars for build context); applying it to per-attempt isolation lets the framework spawn agents without changing their call signature.

**The fileset routing.** Per-attempt files (`events`, `log`, `gaps`) go to `attempts/<NN>/`; task-level aggregates (`status`, `summary`) stay at the task root (line 95). This means `cat tasks/<task>/status.json` always shows current task state regardless of attempt; `cat tasks/<task>/attempts/03/log.log` shows what happened in attempt 3 specifically.

## 3. Playbook lockfile via PID + alive-check

**The failure mode.** Two `converge run` processes started against the same playbook. They both write to the same checkpoint files, the same journal, the same wip directory. The result is silent corruption: partial JSON in checkpoint.json, dual-write races on downstream artifacts, "marked complete but missing outputs" errors that have no obvious cause.

**The fix.** `packages/cli/src/playbook-lock.ts` enforces single-runner-per-playbook via a lockfile at `.converge/journal/<playbook>/.lock`:

```typescript
// playbook-lock.ts:19
interface LockData {
  pid: number;
  startedAt: string;
  command: string;
}
```

`acquirePlaybookLock` (line 52) checks for an existing lock, decides whether it's stale, and either acquires or fails fast.

**The alive-check.** The cleverness is in `isProcessAlive` (line 34):

```typescript
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    return code === "EPERM";
  }
}
```

`kill(pid, 0)` doesn't actually signal the process: it just checks whether the kernel knows about a process with that PID. Three outcomes:

- Returns successfully → PID is alive, lock is held by a real process.
- Throws `ESRCH` → no such process, lock is stale, safe to reclaim.
- Throws `EPERM` → process exists but we lack signal permission. Treat as alive (line 42): the process is real even if we can't signal it.

The `EPERM` handling matters in shared-host scenarios (containers with reduced capabilities, runs as different users) where the bare PID check might falsely report "no process" when the process actually exists.

**Stale-lock reclaim.** If the lock exists but its PID is dead, the lock is reclaimed automatically with a warning (line 87). This is what makes the lockfile resilient to hard kills (`kill -9`): the killed process can't run its cleanup handler, but the next runner sees a stale lock, confirms the PID is gone, and proceeds.

**Cleanup on signals.** Lines 118–137 register handlers for `SIGINT`, `SIGTERM`, and `exit`. Each removes the lockfile synchronously (the async API isn't safe inside `process.exit`). The cost: if the process is hard-killed (`kill -9`), the lockfile leaks: but the alive-check on the next runner reclaims it within milliseconds.

**The lineage.** PID-file conventions in classical Unix daemons (sshd, postfix) used the same pattern: PID in a file, check on startup. Those daemons pre-date `kill(pid, 0)` semantics being widely-known correct, so they often had quirks. Converge inherits the pattern, gets the alive-check right, and adds stale-reclaim: making the same idea actually robust.

## 4. Seed atomic spawn (commit-after-success)

**The failure mode.** A Seed function spawns child tasks one at a time. If the function throws halfway: say, after spawning 17 of 49 children: the system is left in a partial state. The 17 children exist on disk; the next runner picks them up; the missing 32 silently disappear. The Seed function would re-run on a retry but it might not be deterministic; the original 17 are now orphans.

**The fix.** `packages/core/src/executor/seed-executor.ts` doesn't write child tasks during the Seed function call. It *stages* them in memory and writes them in a single batch *after* the function returns successfully:

```typescript
// seed-executor.ts:189
// Staged spawns: written to disk only after seed() returns successfully.
// If seed() throws part-way through, no children are committed and the
// system is left in the same state as before the Seed attempt.
const stagedSpawns: Array<{
  shape: any;
  writeToPath: string;
  target: WbsSpawnTarget;
  opts?: WbsSpawnOptions;
  label?: string;
}> = [];
```

Inside the Seed context's `spawn` method (line 236), the staging happens in-memory:

```typescript
// seed-executor.ts:269
spawnedTasks.push({ id: shape.id, writeToPath });
stagedSpawns.push({ shape, writeToPath, target, opts, label: opts?.label });
```

After the user's Seed function returns, `commitStagedSpawns` (line 351) walks the staging array and writes each child's TASK.md to its final journal path. If the Seed function threw, `commitStagedSpawns` is never called and no files appear on disk.

The semantic is all-or-nothing: either all of the Seed function's spawns land, or none do. A partial run leaves the system bit-for-bit identical to its pre-Seed state.

**Why staging in memory, not on disk.** A disk-based staging area would solve the same problem but introduce a different race: the directory contents would have to be moved atomically into the final layout, which on most filesystems means a directory rename: and POSIX guarantees atomic file rename, not atomic directory rename. In-memory staging avoids that class of issue: the only durable write is the final `writeFile` for each child, and that itself can use atomic-write primitives if the workload requires.

## A bonus: transient remote error recognition

The same `seed-executor.ts` file has a smaller-but-related discipline: distinguishing "the user's Seed script has a bug" from "the model is rate-limited." Lines 57–80 declare a regex set:

```typescript
const TRANSIENT_REMOTE_PATTERNS: RegExp[] = [
  /\b429\b/, /\b50[234]\b/, /\bRESOURCE_EXHAUSTED\b/i, /\bquota\b/i,
  /\brate[ -]?limit/i, /\boverloaded\b/i, /\bservice unavailable\b/i,
  /\bECONNRESET\b/, /\bECONNREFUSED\b/, /\bETIMEDOUT\b/, /\bENOTFOUND\b/,
  /\bsocket hang up\b/i,
  /\bcredits?\s+(?:are\s+)?depleted\b/i,
  /\bbilling\b.*\b(?:exhausted|expired)\b/i,
];

function isTransientRemoteError(error: Error): boolean {
  const haystack = `${error.name}\n${error.message}\n${error.stack ?? ""}`;
  return TRANSIENT_REMOTE_PATTERNS.some((rx) => rx.test(haystack));
}
```

If a Seed error matches one of these, the framework backs off and retries instead of triggering the AI repair pipeline. The repair pipeline can't fix a 429; trying to "fix" it would burn tokens on a problem that resolves by waiting. This is the same discipline as the broader "trust filesystem state, not agent claims" principle: don't engage expensive repair machinery for problems that aren't actually about the code.

## Why this matters

These four primitives: atomic writes, per-attempt isolation, playbook lockfiles, atomic spawn: are the difference between a framework that works on a happy-path demo and one you'd run for six hours unattended on a production playbook.

You will not notice them when they work. You will notice them every time you've used a framework that *didn't* have them, when you've recovered from "Unexpected end of JSON" or "checkpoint conflict" or "phantom orphan tasks." The cost of getting these right is paid once at design time. The cost of not having them is paid forever in operator pain.

## Where this lives

- `packages/core/src/checkpoint/atomic-write.ts`: async (`atomicWriteFile`, line 31) and sync (`atomicWriteFileSync`, line 60) atomic write primitives. `tempPath` (line 18) for collision-free temp names.
- `packages/core/src/journal/structure.ts`: `getTaskAttemptDir` (line 77) for per-attempt directories. `CONVERGE_TASK_ATTEMPT` env var read at line 71. `PER_ATTEMPT_FILE_TYPES` set at line 95 routing per-attempt vs task-aggregated files.
- `packages/cli/src/playbook-lock.ts`: `acquirePlaybookLock` (line 52), `isProcessAlive` (line 34) with `kill(pid, 0)` semantics, signal cleanup at lines 118–137.
- `packages/core/src/executor/seed-executor.ts`: `stagedSpawns` array (line 192), `spawn` method that stages instead of writes (line 236), `commitStagedSpawns` batch write (line 351). Transient-error detection at lines 57–80.

For the next layer: how each attempt lives in its own folder that the agent can read, write, and look back across to learn from prior runs: see [Task execution context](./06-attempt-folder).
