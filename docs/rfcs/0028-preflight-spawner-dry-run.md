---
rfc: 0028
title: Preflight spawner dry-run
status: draft
type: feat
source: human
priority_tier: tier1
estimate: "2-3 days"
backwards_compatible: yes
risk: medium
breaks_existing: no
---
# RFC 0028: Preflight spawner dry-run

## Problem

RFC 0012 (doctor preflight) proposes running structural checks before every `converge run`: TASK.md parses, skills resolve, env vars set. It explicitly lists "every spawn template path is resolvable" as a check — but interpreted as **static**: walking declared `template:` references in source.

What it does **not** catch: bugs in the **spawner body itself**. The body is bash; the bash builds a `spawn.plan.jsonl`; the plan references templates. A bug in the bash that produces wrong template paths — or no plan at all — only surfaces when 02-spawn runs, after every upstream task in the DAG has executed and (often) burned LLM tokens.

Concrete cases observed in `mezon-bot-ai` on 2026-05-20:

1. **Template-path bug.** Spawner body passed `$(pwd)` as the templates dir, producing `template: <root>/screen-01-spec/TASK.md`. The framework's apply-time check (`apply.ts:resolveTemplate`) would have failed with `template-not-found` — but only after every preceding stage (01-foundation through 06-stores) had run. Hours of LLM time wasted on a 5-character bash fix.
2. **IFS join bug.** `"${STEPS[*]}"` joined with spaces, the Node script `.split(',')` produced a single-element array. Each child's template path became `screen-01-spec 02-design 03-react .../TASK.md` — one giant compound name. Same failure mode, same wasted preceding work.

The framework had every signal needed to catch this 30 seconds into preflight: run the spawner body in a sandbox, inspect the JSONL, validate each row. It just doesn't.

## Proposal

Add a preflight phase that **executes every spawner body in dry mode**, then validates the produced `spawn.plan.jsonl`. Runs before any AI call; aborts the run if any spawner produces a plan that would fail at apply time.

This extends RFC 0012's preflight; it does not replace it.

### Dry mode for spawners

A spawner body runs identically to a normal run except:

- `CONVERGE_TASK_DIR` points at a temp dir (`<workspace>/.converge/preflight/<playbook>/<spawner-id>/`).
- An env var `CONVERGE_PREFLIGHT=1` is set. The spawner body may inspect this to skip side effects (touching files outside `CONVERGE_TASK_DIR`, hitting external APIs, etc.) — but most spawner bodies are pure JSONL generators and need no special handling.
- Any file writes outside `CONVERGE_TASK_DIR` are detected (audit via `strace`/`dtrace`/`fs.watch` — see Code-level design) and surfaced as warnings, not errors. Authors who want side-effect-free dry-run can opt in.
- After the body exits, the framework reads the produced `spawn.plan.jsonl` and runs the existing per-row validation (`resolveTemplate`, `renderChildTaskMd`) **without applying** the result to the inventory.

### Validation surface

The preflight runs the same checks `apply.ts` runs at runtime, on the dry-rendered manifest:

| Check | Already in apply.ts? | New in preflight? |
|---|---|---|
| Template path resolves | yes (resolveTemplate) | re-uses |
| Template frontmatter parses | yes (renderChildTaskMd) | re-uses |
| Required vars supplied | yes (renderChildTaskMd) | re-uses |
| Sibling-output collision (RFC 0026) | yes (after 0026 lands) | re-uses |
| Cyclic `after:` deps | yes (apply-time topo sort) | re-uses |
| Plan is non-empty (spawner produced at least one row) | partial | **new** |
| Plan is well-formed JSONL | partial | **new** |
| Row count within `spawn.max_children` | yes | re-uses |
| Row count >= `spawn.min_children` | yes | re-uses |

The two "new" rows catch spawners that crash silently or produce malformed JSONL — both observed in mezon-portal.

### Output

```
$ converge run mezon-portal

Preflight checks (fast):
  ✓ playbook.yml parses
  ✓ 8 tasks, 21 templates
  ✓ 12 skills resolved
  ✓ All env vars set
  ✓ Spawner dry-run (1 spawner):
    ✗ 07-screens/02-spawn:
      - 133 rows produced (within [1, 200])
      - row 1 (screen-landing-01-spec): template path '/Users/.../mezon-bot-ai/screen-01-spec/TASK.md' not found
      - row 2..132 share the same template-path-not-found error
      Hint: spawner script passes process.argv[4] as the templates directory.
            Currently $(pwd) — should be the playbook's templates/ directory.

Run aborted: 1 preflight failure.
  Fix the spawner body or re-run with --skip-preflight (not recommended).
```

### Performance budget

Spawner bodies must complete in <5s for the preflight default. A spawner that's slow enough to need more than 5s is a code smell — most are pure JSONL generators that take <100ms. Configurable per-spawner via `spawn.preflight_timeout_ms: 30000` for legitimately slow generators (e.g. one that hits a tools API for catalog data).

### Opt-out

```yaml
# spawner TASK.md frontmatter
spawn:
  preflight: false    # skip dry-run for this spawner
```

For spawners whose bodies have side effects that can't be sandboxed (writing seed manifests to disk that downstream tasks consume), opt out. Authors accept that their spawner's bugs will surface at run time, not preflight.

## Composition with other RFCs

| RFC | Relationship |
|---|---|
| **0012 (doctor preflight)** | This RFC extends 0012's set of preflight checks with one specific new check: spawner dry-run. The preflight infrastructure (`packages/core/src/preflight/`) is shared. |
| **0026 (sibling-output collision detector)** | The dry-run output feeds 0026's detector — so collisions surface at preflight, not runtime. |
| **0021 (declarative spawn apply)** | Preflight reuses 0021's per-row validation. We're effectively running apply.ts in dry mode. |
| **0019 (per-attempt snapshots)** | Preflight failures could write a snapshot for forensics (the spawner body's stdout/stderr + the produced JSONL), making it easy to share repro context. |

## Code-level design

### New module: `packages/core/src/preflight/spawner-dry-run.ts`

```ts
export interface SpawnerDryRunResult {
  spawnerId: string;
  ok: boolean;
  rows: number;           // count of rows in produced JSONL
  errors: Array<{ row: number; errorCode: string; message: string }>;
  warnings: string[];     // out-of-sandbox writes, etc.
  durationMs: number;
}

export async function runSpawnerDryRun(
  spawner: TaskNode,
  ctx: PreflightContext,
): Promise<SpawnerDryRunResult>;
```

### Hook into preflight phase

After RFC 0012's static checks pass, walk every task with `mode: spawner` (RFC 0022) in topological order. For each:

1. Create `<workspace>/.converge/preflight/<playbook>/<spawner-id>/`.
2. Spawn the body with `CONVERGE_TASK_DIR` and `CONVERGE_PREFLIGHT=1` set.
3. Wait with `spawn.preflight_timeout_ms` timeout.
4. On exit non-zero, capture stderr → preflight error.
5. On exit zero, read `spawn.plan.jsonl` → run apply-time validation → emit a `SpawnerDryRunResult`.

Aggregate all `SpawnerDryRunResult` into the existing preflight output.

### Sandbox notes

The MVP **does not sandbox** — spawner bodies run with full FS write access. The `CONVERGE_PREFLIGHT=1` env var is the only signal authors get to alter behaviour. Out-of-sandbox writes are detected via a post-run mtime walk under common write locations (`apps/`, `.stitch/`, `docs/`) and surfaced as warnings, not failures.

A proper sandbox (containerised dry-run, copy-on-write FS) is a follow-up RFC. The 90% case — pure JSONL generators — needs no sandbox.

## Verification

1. **Unit**: synthesise a spawner with a deliberately broken template path. Run dry-run. Assert error count = row count.
2. **Unit**: synthesise a spawner that crashes (`exit 1` in the body). Assert dry-run result has `ok: false`, stderr captured.
3. **Unit**: synthesise a spawner that produces 0 rows. Assert error "spawner produced empty plan" when `min_children >= 1`.
4. **Integration**: copy `mezon-portal` fixture into temp dir with the buggy spawner. Run `converge run --dry-run` (preflight only). Assert it aborts with the template-not-found error before any AI call.
5. **Integration (negative)**: same fixture but with the spawner fixed. Assert preflight passes.

## Anti-goals

- **Not** sandboxing the spawner. MVP trusts authors; sandboxing is a follow-up.
- **Not** running non-spawner tasks in dry mode. Their bodies execute LLM calls — that's not free. This RFC is specifically about the cheap, deterministic spawner generators.
- **Not** mocking out filesystem calls in dry-run. The dry-run produces a real `spawn.plan.jsonl`; it just doesn't apply it.

## Why now

The mezon-portal bugs cost hours of LLM time before surfacing. The fix is a 30-second preflight that re-uses every primitive `apply.ts` already has. Net cost: a small `preflight/spawner-dry-run.ts` module and a hook in the run loop. Net benefit: every spawner bug surfaces with a precise error message before any token is spent.
