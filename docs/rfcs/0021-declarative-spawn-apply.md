# RFC 0021: Declarative spawn manifests + per-task execution directory

**Status**: Draft
**Backwards-compatible**: Yes (additive; existing spawn paths keep working through deprecation)
**Estimate**: 4–5 days
**Supersedes (in spirit)**: most of RFC 0002 (structured spawn protocol). Apply is the structured protocol, expressed as a file the AI edits rather than a JSON payload it emits.

## Problem

Today there are four ways to add a task to the runtime ledger, and the AI has to pick:

1. **Positional CLI** — `converge spawn <id> <template>` (`packages/cli/src/commands-spawn.ts:739`). Smart env-driven defaults.
2. **Flag CLI** — `converge spawn task --id ... --task-file ... --depends-on ... --var k=v`. The shape `examples/deep-research/.../000-bootstrap/TASK.md` actually emits.
3. **`seed: { mode: cli }`** — task body returns `{ commands: string[] }`; the framework re-tokenises each string (`packages/core/src/seed/cli-spawn.ts`). RFC 0002 already documents this as "shell quoting as an API." The baby-app `--var title=Cycle Tracking` outage came from a missing pair of quotes.
4. **`converge spawn --batch <file.jsonl>`** (`commands-spawn.ts:624`). Declarative, almost ideal — and almost never used because nothing in the planning skill points at it.

All four converge on the same `spawnOne` core (`commands-spawn.ts:450`) which already returns structured per-row results. The problem is not the engine; it is that the **surface** is four-headed and three of those heads are textual.

Costs observed:

- **AI confusion at plan time.** The planning skill (`skills/converge-planning/SKILL.md` §10) lists *both* `converge spawn template ...` and `converge spawn task ...` shapes; agents pick inconsistently across waves of the same playbook.
- **Quoting bugs at run time.** Shell-string commands re-tokenised by the framework are fragile to spaces, single quotes, backslashes, dollar signs, non-ASCII (RFC 0002 §1).
- **Failure is not addressable.** When a row fails today, the only signal is a stderr line. The repair agent has to re-emit the whole spawn block instead of patching one row.
- **Parent task bodies look like shell scripts.** `000-bootstrap/TASK.md` is six lines of fragile shell. The body is doing two jobs at once: deciding *what* to spawn, and *how* to phrase the spawn. The AI is good at the first, bad at the second.

## Proposal

Make spawning a **declarative apply step**, not a command-emission step.

A parent task writes one artefact — a JSONL **spawn manifest** — describing the children it wants. A new verb `converge apply` ingests it: validates each row, renders the inventory `TASK.md`, upserts into `tasks.jsonl`. Apply is the only mutator. Per-row failures are written to a structured **result file** the parent's repair loop can read and patch.

The fail-fix-pass loop emerges from the existing post-body `converge` prompt: the parent's check fails until the result file shows all rows ok, the convergence prompt sees the diff between manifest and result and patches the offending lines, re-applies, check passes.

To make manifests easy for the AI to find and address, every task gets a stable **execution directory** exposed as `CONVERGE_TASK_DIR` and the convention `vars.exec_dir`. The manifest lives at `${exec_dir}/spawn.plan.jsonl`; results land at `${exec_dir}/spawn.plan.result.jsonl`. The AI never has to derive a path; the path is in the env.

### What the parent body becomes

Today (`000-bootstrap/TASK.md`):

```
converge spawn task --id "initial-search" --task-file ".converge/playbooks/.../001-initial-search/TASK.md" --var "questionDir=<QDIR>"
converge spawn task --id "initial-gather" --task-file ".converge/playbooks/.../002-initial-gather/TASK.md" --depends-on "initial-search" --var "questionDir=<QDIR>"
... 4 more lines, each a quoting hazard ...
```

Tomorrow:

```bash
QDIR=$(cat .converge/.question-dir)

# Write the plan as JSONL — one line per child, no shell quoting.
cat > "$CONVERGE_TASK_DIR/spawn.plan.jsonl" <<JSON
{"id":"initial-search","template":"001-initial/initial-search","vars":{"questionDir":"$QDIR"}}
{"id":"initial-gather","template":"001-initial/initial-gather","vars":{"questionDir":"$QDIR"},"after":["initial-search"]}
{"id":"scope-identification","template":"001-initial/scope-identification","vars":{"questionDir":"$QDIR"},"after":["initial-gather"]}
{"id":"initial-aggregation","template":"001-initial/initial-aggregation","vars":{"questionDir":"$QDIR"},"after":["scope-identification"]}
{"id":"deep-research","template":"002-research-x/deep-research","vars":{"questionDir":"$QDIR"},"after":["initial-aggregation"]}
{"id":"final-report","template":"003-report/final-report","vars":{"questionDir":"$QDIR"},"after":["deep-research"]}
JSON

converge apply "$CONVERGE_TASK_DIR/spawn.plan.jsonl"
```

Or — for a planner that reasons over JSON natively — the AI just writes `spawn.plan.jsonl` directly with a single-shot edit and calls `converge apply` once.

### Manifest schema

`spawn.plan.jsonl` — one JSON object per line. Comments (`//` lines) and blank lines tolerated, mirroring `--batch` today.

```ts
type SpawnRow = {
  id: string;                             // required — kebab-case, ledger-unique
  template: string;                       // required — name (templates/<name>) or path
  vars?: Record<string, string | number | boolean>;
  after?: string[];                       // sibling depends_on
  no_inherit?: boolean;                   // skip CONVERGE_VAR_* inheritance
  // Reserved for future: title, tags, body override, checks override.
  // Anything not recognised is rejected with an explicit "unknown field" error.
};
```

The shape is identical to today's `--batch` JSONL plus an explicit field allow-list. Rejecting unknown fields is deliberate: the AI gets a clear error instead of a silently dropped option.

### Result schema

`spawn.plan.result.jsonl` — one line per manifest row, in input order, written atomically when apply finishes:

```ts
type SpawnResult =
  | {
      id: string;
      ok: true;
      taskMdPath: string;
      template: string;
      appliedAt: string;        // ISO timestamp
    }
  | {
      id: string;
      ok: false;
      error: string;            // human-readable
      errorCode: SpawnErrorCode; // see classification below
      template: string;
      missing?: string[];       // present when errorCode === "missing-vars"
      evidencePath?: string;    // present when frontmatter validation failed
    };

type SpawnErrorCode =
  | "duplicate-id"           // id already in tasks.jsonl
  | "template-not-found"     // resolveTemplate failed
  | "missing-vars"           // strict-mode contract violation
  | "malformed-frontmatter"  // YAML / shape error in rendered TASK.md
  | "unsafe-id"              // assertSafeId threw
  | "unknown-field"          // manifest row has fields not in schema
  | "internal";              // anything else
```

This is the structured retry context (RFC 0009) for spawning, scoped narrowly. The AI doesn't need a generic taxonomy; it needs a row id, a code, and a fix hint.

### Per-task execution directory

Every task — static, spawned, template-rendered — gets a stable directory the runtime guarantees exists before the body runs:

```
.converge/journal/<playbook>/tasks/<task-id>/exec/
```

(Co-located with `attempts/` and `logs/` that already live under the task's journal directory; `seed-executor.ts:201` already creates `logs/` next to it.)

The runtime exposes it three ways:

| Surface | How it appears | Where |
|---|---|---|
| Env var | `CONVERGE_TASK_DIR=<absolute path>` | set by the executor before `runTaskBody` |
| Auto-injected var | `vars.exec_dir` (relative to workspace) | set in the rendered `TASK.md` frontmatter when the task is materialised |
| Help string | `Available env: CONVERGE_TASK_DIR — scratch + manifest dir for this task` | shown in the seed/repair prompt preamble |

The AI no longer has to guess where a manifest goes. The directory is empty at the start of each attempt body but **persists across attempts within the same task**, so a partially built manifest survives a body crash and the repair attempt can patch it instead of regenerating.

The execution dir is the right home for everything per-task and per-attempt-stable:

- `spawn.plan.jsonl` and `spawn.plan.result.jsonl`
- `retry-context.json` (RFC 0009)
- `EVIDENCE.json` files for rejected children
- arbitrary scratch the body wants to keep across attempts

### `converge apply` semantics

```
converge apply <manifest.jsonl> [--dry] [--no-inherit]
```

Behaviour:

1. **Resolve the playbook** from `CONVERGE_PLAYBOOK` (same as `spawn` today). Refuse if unset and not invoked under a task.
2. **Parse and validate** the manifest. Schema violations halt apply with an error per offending line written to the result file; nothing is upserted.
3. **For each row, in input order**, call the existing `spawnOne` core. The result file is appended after each row so a crash leaves a partial but parseable record.
4. **Idempotency**: re-applying with rows whose `id` is already in `tasks.jsonl` returns `{ ok: true, idempotent: true }` if the rendered TASK.md content matches what's on disk byte-for-byte; returns `{ ok: false, errorCode: "duplicate-id" }` if it differs. This lets the AI safely re-run apply after fixing a subset of failures.
5. **Exit code**: 0 if every row is `ok: true`, 3 if any row failed. Mirrors today's `spawn`'s exit-3-on-failure.
6. **Atomic result write**: the result file is written via the same atomic-rename path `runtime-ledger.ts` uses for `tasks.jsonl`, so a check script reading it never sees a half-finished file.

### The fail-fix-pass loop, end to end

```
parent body runs
  └─ writes $CONVERGE_TASK_DIR/spawn.plan.jsonl
  └─ runs: converge apply $CONVERGE_TASK_DIR/spawn.plan.jsonl
        ├─ row ok → upsert into tasks.jsonl, write inventory TASK.md
        └─ row fail → append to spawn.plan.result.jsonl, write EVIDENCE.json
parent post-body check runs
  └─ scripts/spawn-results-clean.sh $CONVERGE_TASK_DIR
        ├─ all rows ok → exit 0 → parent converges
        └─ any fail   → exit 1 → triggers correction
parent converge prompt sees:
  - $CONVERGE_TASK_DIR/spawn.plan.jsonl       (what was attempted)
  - $CONVERGE_TASK_DIR/spawn.plan.result.jsonl (what failed and why, per row)
  - $CONVERGE_TASK_DIR/EVIDENCE.json files     (per-row detail)
  → edits offending lines in spawn.plan.jsonl
  → re-runs converge apply
loop until clean, then mark parent done
```

The loop is the same one the framework already runs for any failing check. We're not adding a control plane; we're shaping the artefacts so the existing converge loop can operate on a structured surface.

## Code-level design

### 1. New module: `packages/core/src/task/spawn/apply.ts`

```ts
export interface ApplyOptions {
  manifestPath: string;
  workspace: string;
  dry?: boolean;
  noInheritDefault?: boolean;
}

export interface ApplyReport {
  manifestPath: string;
  resultPath: string;
  ok: number;
  failed: number;
  rows: SpawnResult[];
}

export async function applyManifest(opts: ApplyOptions): Promise<ApplyReport>;
```

Wraps the existing `spawnOne` (extract from `commands-spawn.ts:450`) and the existing batch reader (`commands-spawn.ts:624`). Result file write is atomic via `atomicWriteFileSync` from the runtime-ledger module.

Refactor `commands-spawn.ts`'s `spawnOne` and `runBatch` into this module so `converge spawn --batch` and `converge apply` share one code path. `spawn --batch` becomes a thin alias for `apply` that prints the same one-line-per-row stdout.

### 2. New CLI verb: `commands-apply.ts`

```
converge apply <manifest.jsonl> [--dry] [--no-inherit]
```

Parses positional + flags, calls `applyManifest`, prints a one-line summary, exits 0 or 3.

### 3. Execution-directory plumbing

Two changes in the executor (`packages/core/src/executor/seed-executor.ts` and the static-task executor):

a. Resolve `taskDir` (already done; line 193) → ensure `${taskDir}/exec/` exists before invoking the body.

b. Augment the body's env with `CONVERGE_TASK_DIR=${taskDir}/exec` alongside the existing `CONVERGE_PLAYBOOK`, `CONVERGE_CURRENT_TASK_PATH`, `CONVERGE_VAR_*` vars (`commands-spawn.ts:457`–462 documents the existing set).

c. When rendering a child TASK.md from a template (`renderChildTaskMd`, `commands-spawn.ts:382`), inject `vars.exec_dir` automatically with the workspace-relative path. Strict-mode templates that don't declare `exec_dir` continue to reject it (existing behaviour); to opt in they declare `exec_dir:` in `vars:` with no default.

### 4. Manifest schema validator

`packages/core/src/task/spawn/manifest.ts`:

```ts
export const SpawnRowSchema = z.object({
  id: z.string().min(1),
  template: z.string().min(1),
  vars: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  after: z.array(z.string()).optional(),
  no_inherit: z.boolean().optional(),
}).strict();   // .strict() → unknown fields throw
```

Strict mode is what gives the AI the clear "unknown field" error instead of silent drops.

### 5. Result-clean helper

`packages/cli/scripts/spawn-results-clean.sh` (or a dedicated `converge apply --check` flag):

```bash
#!/usr/bin/env bash
# exits 0 iff every row in $1/spawn.plan.result.jsonl has "ok":true
RESULT="${1:-$CONVERGE_TASK_DIR}/spawn.plan.result.jsonl"
[ -f "$RESULT" ] || { echo "no result file at $RESULT" >&2; exit 1; }
! grep -q '"ok":false' "$RESULT"
```

Cheap, deterministic, exactly the check shape the planning skill recommends.

### 6. Planning-skill update

`skills/converge-planning/SKILL.md`:

- §1 *Three task shapes* — replace the third bullet ("dynamic container") with: "Dynamic container — a passthrough parent writes `$CONVERGE_TASK_DIR/spawn.plan.jsonl` and runs `converge apply`; a result-clean check decides done/not-done; the converge prompt patches the manifest on failure."
- §10 *CLI commands* — replace the `converge spawn template / converge spawn task` row with `converge apply <manifest.jsonl>`. Move the textual `spawn` verb to a "Legacy" subsection.
- New §3.7 *Spawn manifests* — schema, the exec-dir convention, the failure loop. Three lines of example JSONL.

### 7. Deprecation, not removal

- `seed: { mode: cli }` with shell-string commands → marked deprecated in `cli-seed-executor.ts`'s prompt preamble; emits a one-line warning at parse time pointing at this RFC. Removal in a later RFC.
- `converge spawn task --id ... --task-file ...` flag form → keeps working; `converge spawn --help` adds "Prefer `converge apply <manifest.jsonl>` for multi-row spawning."
- `converge spawn --batch` → kept as an alias for `converge apply`. No behaviour change; the implementation is the same code path.

## Migration

Phase 1 (this RFC):
- Land `converge apply` and `CONVERGE_TASK_DIR`.
- Update one example to the new shape: `examples/deep-research/.../000-bootstrap/TASK.md` becomes a 10-line JSONL writer + `converge apply`. Use it as the regression target.
- Update the planning skill.

Phase 2 (follow-up RFC):
- Sweep examples (`examples/baby-app`, `examples/flutter-app`, `examples/cinematic-video-production`) onto the manifest pattern.
- Generate-manifest helpers (`converge plan --to-manifest`) for ergonomic authoring.

Phase 3 (later):
- Deprecate the shell-string `seed: { mode: cli }` path.

Existing playbooks keep running on every phase. The four-headed surface narrows by example-following, not by removal.

## Test plan

New tests under `packages/core/src/task/spawn/__tests__/apply.test.ts`:

1. **Happy path** — 3-row manifest applies cleanly, `tasks.jsonl` has 3 new rows, result file has 3 `ok: true`, exit 0.
2. **Per-row fail** — 3-row manifest where row 2 references an unknown template; rows 1 and 3 succeed, row 2 fails with `errorCode: "template-not-found"`, exit 3.
3. **Strict-mode missing var** — template declares `vars: { sprint_id: }`, manifest row omits it; result row has `errorCode: "missing-vars"`, `missing: ["sprint_id"]`.
4. **Idempotent re-apply** — apply once, then apply again with the same manifest; second run produces all `ok: true, idempotent: true`, no duplicate rows in `tasks.jsonl`.
5. **Idempotent re-apply with diff** — apply once, change one row's vars, re-apply; that row gets `errorCode: "duplicate-id"`; other rows stay idempotent.
6. **Unknown field** — manifest row has `tags: [...]` (not yet in schema); apply rejects with `errorCode: "unknown-field"` pointing at the offending key.
7. **Crash mid-apply** — kill the process between rows; result file is parseable up to the last completed row; re-apply finishes the rest.
8. **Unicode and quoting regression** — `vars.title = "Cycle Tracking"`, `vars.title = "週次"`, `vars.title = "it's a \"test\""` all round-trip (the bug class RFC 0002 was written to fix).
9. **`CONVERGE_TASK_DIR` exists and is writable** before the body runs; persists across attempts; gets `exec/` subdir auto-created.
10. **`vars.exec_dir`** auto-injected into rendered child TASK.md when the template's strict-mode `vars:` declares it.

Integration test under `tests/test-apply-loop/`:
- A passthrough parent that writes a 3-row manifest where row 2 is missing a required var, runs `converge apply`, fails its check, the converge prompt patches row 2, re-applies, succeeds, marks done. Verifies the loop end-to-end without humans.

## Anti-goals

- **Not** introducing a new task shape. The contract (`inputs`, `outputs`, `checks`, `vars`, `depends_on`) is unchanged.
- **Not** removing the textual paths in this RFC. Deprecation lands; removal is its own RFC after the migration sweep.
- **Not** generalising to a manifest that mutates anything other than spawning. `apply` writes ledger rows and inventory `TASK.md` files. It does not run tasks, mark them done, or modify outputs.
- **Not** replacing seed scripts (`seed: { script: ... }` JS-style; `docs/concepts/dynamic-work-breakdown.md`). Those continue to work and are arguably the cleanest way to express programmatic spawning. Manifests are the answer for AI-authored bodies that today write shell strings.

## Open questions

1. **Should `converge apply` be invocable outside a task?** Useful for one-shot operator workflows; risks divorcing manifests from the task they belong to. Lean: allow with `--playbook=<name>`, document as "operator escape hatch."
2. **Should the result file be JSONL or a single JSON object?** JSONL matches the input shape (easy line-pair diffing) and supports streaming. Pick JSONL.
3. **Should `vars.exec_dir` be relative or absolute?** Relative to workspace root, matching every other path the framework writes into TASK.md. The env var `CONVERGE_TASK_DIR` is absolute; the frontmatter var is relative.
4. **Manifest evolution.** When we add `tags`, `body`, or `checks` overrides (RFC 0002 anticipates these), they extend `SpawnRowSchema`. The `.strict()` rejection on unknown fields means old runtimes refuse new manifests with a clean error rather than dropping fields silently — desirable.

## Why now

- RFC 0002 is the structured-spawn proposal's first draft; it solves the quoting bug but keeps the AI emitting JSON strings inside a JSON object inside a `commands` array. Writing a file is one less indirection and aligns with how the AI already operates on the workspace.
- RFC 0009 (structured retry context) and RFC 0019 (attempt snapshots) are converging on "the task gets a stable directory of structured artefacts the repair loop can address." `CONVERGE_TASK_DIR` is the missing primitive that lets all of these write to one well-known place.
- The bug catalogued in RFC 0020 (container convergence infinite loop) is downstream of containers having too many ways to "say I'm done." Apply gives containers exactly one signal — the result file — that a check script can read.

One small surface change. The engine already does the work.
