---
rfc: 0026
title: Sibling-output collision detector for spawn manifests
status: draft
type: feat
source: human
priority_tier: tier1
estimate: "1-2 days"
backwards_compatible: yes
risk: low
breaks_existing: no
---
# RFC 0026: Sibling-output collision detector for spawn manifests

## Problem

When a parent task spawns N children from the same template, each child gets the template's `outputs:` rendered with the child's vars. If those rendered outputs collapse to the *same* path across siblings, two failures follow:

1. **The cache predicate cannot distinguish completion per-child.** The runner's check at `packages/core/src/run/index.ts:738` is `outputs.every(existsSync)`. Once any one sibling writes the shared path, every other sibling's predicate trips true, and the runner marks them all cached on the next pass — even though they did no work.
2. **Concurrent siblings race on the same file.** RFC 0027 handles the runtime race; this RFC catches the design-time mistake that makes the race possible.

Concrete case observed in `mezon-bot-ai/.converge/playbooks/mezon-portal/templates/screen-{04,05,06,07}-*` on 2026-05-20:

```yaml
# templates/screen-04-components/TASK.md
outputs:
  - apps/portal/src/features    # ← parent dir, not per-screen
  - apps/portal/src/routes
```

The spawner produced 19 × 4 = 76 children, all declaring the same two parent directories. The cache predicate became meaningless for steps 04–07; once one screen's `04-components` ran, all 19 screens' `04-components` would be judged cached on the next pass. The author had to manually scope to `features/{{screenId}}` to fix it.

The framework had every signal needed to detect this at spawn-apply time: it sees the rendered manifest, it can resolve `{{screenId}}` substitutions, it can compare sibling rows. It just doesn't.

## Proposal

Add a structural check inside `applySpawnManifest` (`packages/core/src/task/spawn/apply.ts`) that, after rendering every row's `TASK.md`, walks the resulting `outputs` arrays and flags rows whose **post-substitution** outputs are identical to one or more sibling rows.

### Detection rule

Two siblings collide when:

- Both spawn from the same template (same `template:` path) AND
- After var substitution, their `outputs:` sets are exactly equal AND
- Both children are still `ok:true` after the existing validation (template found, frontmatter valid).

Rendered outputs that contain no `{{var}}` references are the smoking gun — the template never intended to scope per-child, so every sibling produces the same string. Outputs that contain `{{var}}` references but render identically (e.g. `{{feature_area}}` resolves to the same string across all 19 screens) are caught by the same equality check.

### Severity

- **Error** (per-row `ok:false`, `errorCode: "sibling-output-collision"`) when:
  - All outputs collide AND
  - The colliding rows are more than 1 (i.e. genuine fan-out).
- **Warning** (`kind: "log", level: "warn"`) when:
  - Some but not all outputs collide. Some legitimate templates produce both per-child artefacts AND touch a shared parent (a route registry index, a barrel file). A warning surfaces the partial collision without blocking.

The error case maps onto the existing per-row result file (RFC 0021) so the parent's repair loop can read `spawn.plan.result.jsonl` and patch the template.

### Result-file shape

```jsonc
{
  "id": "screen-landing-04-components",
  "ok": false,
  "errorCode": "sibling-output-collision",
  "error": "all declared outputs collide with 18 other siblings spawned from screen-04-components/TASK.md. The cache predicate cannot distinguish per-child completion. Add per-child scope to the template's `outputs:`, e.g. `apps/portal/src/features/{{screenId}}` instead of `apps/portal/src/features`.",
  "template": ".converge/playbooks/mezon-portal/templates/screen-04-components/TASK.md",
  "siblings": ["screen-login-04-components", "screen-chat-04-components", "..."],
  "colliding_outputs": ["apps/portal/src/features", "apps/portal/src/routes"]
}
```

The error message names the offending template and suggests the fix — the most common fix is adding `{{childId}}` or `{{screenId}}` (or whatever per-child var is conventional in that playbook) to a directory segment.

### Opt-out

Some templates legitimately write to a shared registry (e.g. `apps/portal/src/routeTree.gen.ts` that every screen-03-react regenerates from scratch via TanStack's codegen). Add a per-template opt-out:

```yaml
# templates/screen-03-react/TASK.md
outputs:
  - apps/portal/src/routes
output_scope: shared    # opt out of sibling-collision detector
```

`output_scope: shared` is a deliberate annotation that says "this template's outputs are meant to be shared across all siblings; the cache predicate's per-child weakness is accepted." The detector skips collision checks for these.

Default is `output_scope: per-child` (the safe default — what 99% of fan-out templates want).

## Composition with other RFCs

| RFC | Relationship |
|---|---|
| **0021 (declarative spawn apply)** | This RFC extends 0021's per-row validation. The result-file shape is the same; we just add a new `errorCode`. |
| **0027 (output-overlap concurrency guard)** | Sibling: 0026 catches the structural mistake at apply time; 0027 catches the runtime race even when authors got it right. |
| **0028 (preflight spawner dry-run)** | Preflight runs spawners in dry mode; the dry-run output goes through this detector. So collisions are caught **before any AI call**, not after the spawner has run. |
| **0012 (doctor preflight)** | The detector can also be invoked from `converge doctor` as a static check (without running spawners) — it walks every template under `templates/`, inspects `outputs:`, and warns if there's no `{{var}}` segment AND the parent's spawn pattern suggests fan-out. Less precise than runtime detection but free at compile time. |

## Code-level design

### New module: `packages/core/src/task/spawn/collision.ts`

```ts
export interface CollisionReport {
  groupKey: string;             // shared template path
  rows: Array<{ id: string; outputs: string[] }>;
  collidingOutputs: string[];   // outputs all rows in the group share
  severity: "error" | "warning";
}

export function detectSiblingOutputCollisions(
  applied: ApplyRowResult[],
  templates: Map<string, TaskMdShape>,
): CollisionReport[];
```

### Hook into `apply.ts`

After the existing row-rendering loop (around `apply.ts:520`), call `detectSiblingOutputCollisions`. For each `severity: "error"` group, downgrade every row in the group to `ok:false` with `errorCode: "sibling-output-collision"`. For warnings, emit a reporter event.

### Template frontmatter — `output_scope`

Add an optional field to `TaskMdShape`:

```ts
output_scope?: "per-child" | "shared";
```

Default to `"per-child"` when omitted. Parsed by `task-md-definition.ts:parseTaskMdString`.

## Verification

1. **Unit**: Hand-craft an `ApplyRowResult[]` with 3 rows from the same template, all with identical outputs. Assert detector returns one error group. Same fixture with different per-child outputs — assert no error.
2. **Unit (warning)**: 3 rows where one output collides but the other is per-child. Assert detector returns a warning group, not an error.
3. **Unit (opt-out)**: Same fixture as test 1, but the template has `output_scope: shared`. Assert no collision reported.
4. **Integration**: Synthesise a parent task whose `spawn.plan.jsonl` produces 5 sibling rows with shared outputs from a template that omits `output_scope`. Run `converge run`. Assert the parent's check fails with the structured error and `spawn.plan.result.jsonl` carries the detail.

## Anti-goals

- **Not** preventing the AI from authoring a template with shared outputs. The opt-out exists so legitimate shared-output templates compile fine.
- **Not** auto-fixing the template. The error names the offending file and the convention; the author or repair loop edits the template.
- **Not** running this check on non-spawned tasks. Static DAG tasks have unique ids by construction; collisions don't arise.

## Why now

The mezon-portal portal-screen run was the second time this class of bug bit us (the first was `examples/baby-app` — different details but the same shape). Both surfaced after AI tokens had been spent. The fix is a 100-line detector that turns a multi-hour debugging session into a compile-time error message naming the file and the line.
