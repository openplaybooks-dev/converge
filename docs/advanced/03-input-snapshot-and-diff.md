---
title: "Input snapshot and file diff"
description: "How the framework grounds agent claims in filesystem truth. Agents lie about what they wrote; mtime and size don't."
sidebar:
  order: 3
---

## Agents lie. Filesystems don't.

Every agent framework that's been in production for more than a quarter has learned this lesson: agents will tell you they did things they didn't do.

Sometimes it's hallucination — the agent generates a plausible "I wrote `output.json`" message because the conversation flow expected one. Sometimes it's misattribution — the file existed before the agent ran, but the agent assumes it was its own work. Sometimes it's rounding — the agent produces a partial file and reports completion.

The naive workaround is to scrape the agent's tool-call log and trust *that* instead of trusting natural-language claims. This is better but still wrong: tool calls can be reordered in the log, can fail silently after reporting success, can target the wrong path while logging a different one. The agent surface — even at the structured level — is fakeable.

The non-fakeable surface is the filesystem. Files exist or they don't. Their mtime is what it is. Their size is what it is. If you snapshot the state before the agent runs and check the state after, you can prove what changed regardless of what the agent says happened.

That's what Converge does. It's the discipline that makes the rest of the framework's contracts real — declared outputs, dependency tracking, repair routing — because every one of those contracts ultimately reduces to "did this file appear, with these properties, since the agent started?"

## The before snapshot

Before the agent runs, the before phase walks the task's declared inputs and captures a snapshot of every matching file. Each file is captured as:

```typescript
// packages/core/src/task/lifecycle/before.ts:28
export interface InputFile {
  path: string;
  sizeBytes: number;
  mtimeMs: number;
}
```

Path, size, mtime. Three primitives the OS records and that the agent cannot retroactively change without leaving evidence (a write changes mtime; an append changes size; a delete makes `stat` fail).

The full snapshot wraps a list of these per input pattern, plus a hash of the aggregate state:

```typescript
// before.ts:41
export interface InputSnapshot {
  capturedAt: string;
  hash: string; // SHA-256 of { totalFiles, totalBytes, lastMtime }
  inputs: InputPatternResult[];
}
```

The hash construction (lines 383–391):

```typescript
function buildSnapshot(inputs: InputPatternResult[]): InputSnapshot {
  const allFiles = inputs.flatMap((i) => i.files);
  const totalFiles = allFiles.length;
  const totalBytes = allFiles.reduce((n, f) => n + f.sizeBytes, 0);
  const lastMtime = allFiles.reduce((m, f) => Math.max(m, f.mtimeMs), 0);
  const hash = createHash("sha256")
    .update(JSON.stringify({ totalFiles, totalBytes, lastMtime }))
    .digest("hex");
  return { capturedAt: new Date().toISOString(), hash, inputs };
}
```

Three observations on this hash:

1. **It's coarse on purpose.** It doesn't hash file contents. That would make it correctness-equivalent to a Bazel-style content-addressed cache but enormously more expensive to compute on every task entry. The framework doesn't need content equivalence — it needs change detection. mtime + size is a reliable proxy for "did anything plausibly change?"
2. **It rolls up all input patterns into one number.** Two tasks with the same input glob get the same hash if and only if they see the same files in the same state. That's the comparison the framework needs for "are the inputs to this task in the same state as last attempt?"
3. **The aggregate properties are the right ones.** Total file count catches additions and deletions. Total bytes catches size changes. Max mtime catches modifications even if size happens to match. A change to any input flips at least one of the three.

The snapshot is written to `attempts/<NN>/data/before.json`. It's a plain object, durable, comparable across attempts.

## The after diff

After the agent runs, `runAfterPhase` (after.ts:183) computes a diff between the snapshot and current filesystem state:

```typescript
// after.ts:432
async function computeDiff(
  projectDir: string,
  inputSnapshot: InputSnapshot,
  declaredOutputs: string[],
): Promise<FileDiff> {
  const knownFiles = new Map<string, InputFile>();
  for (const inp of inputSnapshot.inputs) {
    for (const f of inp.files) {
      knownFiles.set(f.path, f);
    }
  }

  const filesToCheck = new Set<string>([
    ...knownFiles.keys(),
    ...declaredOutputs,
  ]);

  const created: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];

  for (const rel of filesToCheck) {
    const absPath = join(projectDir, rel);
    const wasKnown = knownFiles.has(rel);
    try {
      const s = await stat(absPath);
      if (!s.isFile()) continue;
      if (!wasKnown) {
        created.push(rel);
      } else {
        const prev = knownFiles.get(rel)!;
        if (s.mtimeMs > prev.mtimeMs || s.size !== prev.sizeBytes) {
          modified.push(rel);
        }
      }
    } catch {
      if (wasKnown) deleted.push(rel);
    }
  }

  return { capturedAt: new Date().toISOString(), created, modified, deleted };
}
```

The classification logic is four lines:

- `!wasKnown && file.exists` → **created** (didn't exist before, exists now).
- `wasKnown && (mtime > prev.mtime || size !== prev.size)` → **modified** (existed before, changed since).
- `wasKnown && stat throws` → **deleted** (existed before, doesn't now).
- Anything else (was known, exists, unchanged) — implicitly *unchanged* and not in any list.

The set of files to check (line 446) is the union of "files that were in the snapshot" and "files the task declared as outputs." That second source matters: it lets the framework detect that a declared output *wasn't* created — the file is in `filesToCheck` but `stat` throws and it wasn't in the input snapshot, so it lands in none of the three lists. The check phase will then fail with "missing output: X" because the declared output doesn't exist on disk.

The diff is written to `attempts/<NN>/data/after.json`. It's the structured record of what the agent actually did, derived purely from filesystem state, used by the after phase to populate `TaskOutcome.filesCreated` and `filesModified` (after.ts:152).

## What this lets the framework do

**Reject false claims of completion.** The check phase doesn't trust the agent's "done" message. It runs the declared checks against the filesystem. If a check is `test -f outputs/report.md`, the agent's claim that it created the file is irrelevant — the check command runs against the actual filesystem and the file is there or it isn't.

**Detect partial work.** A task that was supposed to produce three files and produced only two will have the third in `filesToCheck` but not in `created`. The check that asserts `test -f outputs/file3.md` will fail. The framework knows what's missing without parsing agent output.

**Route repair correctly.** The repair pipeline reads `diff` and `failedChecks` to decide what kind of failure this is. A check failed because `outputs/report.md` doesn't exist — but `created` shows the agent created `outputs/report.html`. That's a path-mismatch class of failure, distinct from "agent didn't write anything." Different repair strategy applies.

**Know when an attempt is genuinely fresh.** If the input snapshot's hash differs between two consecutive attempts, the inputs *changed* between attempts — possibly because a sibling task that produces this task's input ran. The framework can tell "the agent's previous failure may have been valid given old inputs; let's give it a fresh attempt against the new inputs" from the hash alone.

## The cost

This whole machinery is essentially free. `stat` is a fast syscall. The hash is over three integers. The data structures are small enough to write as JSON without compression. None of this is on the critical path for a long-running task; it adds milliseconds per attempt against multi-second or multi-minute agent runs.

The cost it does impose is *discipline*: the framework has to know what files to track. That comes from the task's declared inputs and outputs. Tasks that don't declare them get less of this benefit — the diff still works for declared outputs, but the framework doesn't have the input snapshot to detect upstream changes.

This is one of the reasons declared inputs and outputs are first-class fields in TASK.md, not just documentation. They're the contract the framework needs to do truth-grounding.

## How this compares

**Git's index + `git status`.** Git stores file stats in the index after each commit. `git status` works by `stat`'ing the working tree and comparing against the index entries — no content reads, just metadata. Same trick: filesystem stats are the source of truth, the index is the snapshot, the diff is the comparison. The Converge equivalent is the input snapshot + post-run diff. A different domain (per-task instead of per-repo), the same pattern.

**Bazel's content-based action cache.** Bazel hashes file contents to determine cache validity. Stronger guarantee than mtime+size — if an attacker swaps a file with one of identical mtime and size, mtime-based detection misses it. But for the agent-orchestration case, attacker-grade adversarial inputs aren't the threat model; agents-being-agents is. mtime+size is sufficient and cheap. (If the threat model ever calls for content hashing, swapping in `xxhash` or `sha256` of file contents would be a localized change to `buildSnapshot`.)

**Make's mtime-based recompilation.** `make` decides what to rebuild by comparing target mtime against source mtimes. The Converge before/after diff is the same comparison applied to "what did this run change?" instead of "what needs to be rebuilt?" The lineage of treating mtime as the trustworthy clock goes back decades; Converge inherits it for a related but different question.

## When this matters for your work

You'll feel this every time the framework rejects an agent's "I'm done" claim and the check actually catches it. You'll feel it more when a task reports `filesCreated: [output.json]` and you can `cat .converge/journal/<playbook>/tasks/<task>/attempts/01/data/after.json` to see exactly what changed — without reading any agent transcript.

You'll appreciate it most when an agent confidently reports success and the framework calmly disagrees, citing a missing file. The agent is wrong; the filesystem isn't.

## Where this lives

- `packages/core/src/task/lifecycle/before.ts` — `InputFile` (line 28), `InputSnapshot` (line 41), `buildSnapshot` (line 383).
- `packages/core/src/task/lifecycle/after.ts` — `FileDiff` (line 135), `computeDiff` (line 432), `runAfterPhase` (line 183) which wires it all together.
- The on-disk artifacts: `.converge/journal/<playbook>/tasks/<task>/attempts/<NN>/data/before.json` and `after.json` for any task you've run.

For the next layer — what happens when those checks fail and the framework needs to decide what to do about it — see [The strategy catalog](./04-strategy-catalog).
