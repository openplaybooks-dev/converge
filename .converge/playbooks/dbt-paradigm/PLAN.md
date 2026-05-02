# PLAN — dbt-paradigm

## Goal

Convert the framework to the dbt mental model. Runs after `cli-redesign`
and `remove-goals`.

1. **Rename WBS → seeds.** Same API, new names. wbs/ → seeds/. wbs: → seeds:.
2. **Add reusable checks.** tests/*.test.md files. test:<name>(args) references.
3. **Clean break.** Remove redirects, dead code, V1 compat, deprecated exports.

## Chain

```
01-survey → 02-rename → 03-checks → 04-clean-break
```

## Phases

| id | kind | goal | gating output |
|---|---|---|---|
| `01-survey-and-catalog` | container | Catalog every wbs/ dir, wbs: usage, and repeated check | Three inventories guide phases 02-03 |
| `02-rename-wbs-to-seeds` | container (5 children) | Rename types/files/folders; move scripts to seeds/; convert wbs: → seeds:; update CLI; migrate playbooks | Zero wbs: or wbs/ anywhere |
| `03-reusable-checks-api` | container (6 children) | .test.md schema; check union; expander; discovery; scripts; selectors; migrate repeated checks | Reusable checks on disk; test: selector works |
| `04-clean-break` | container (5 children) | Remove redirects, dead code, V1 checkpoint compat, deprecated exports; update help | CLI speaks only dbt vocabulary |

## Phase 02 detail

The WBS rename keeps the existing API intact. The `wbs:` object becomes a
`seeds:` array. Each entry is either an inline seed (same shape as WBS) or
a named reference to a reusable seed file.

```yaml
# Before (single WBS object):
seeds:
  - type: nodejs
    path: wbs/index.js

# After (array, inline form — same shape):
seeds:
  - type: nodejs
    path: seeds/per-verb.seed.js

# After (array, named reference — reusable):
seeds:
  - type: seed
    name: per-verb
```

| What | Before | After |
|---|---|---|
| Frontmatter field | `wbs: { type, path }` | `seeds: [{ type, path }]` or `seeds: [{ type: seed, name }]` |
| Script location | `tasks/<task>/wbs/index.js` | `seeds/<name>.seed.js` |
| Type names | `WbsContext`, `WbsFn`, `WbsExecutor` | `SeedContext`, `SeedFn`, `SeedExecutor` |
| File names | `wbs-executor.ts` | `seed-executor.ts` |
| CLI flag | `--wbs` | removed (seeds always on) |

`ctx.spawn()`, template-refs, journal output, child discovery — unchanged.

## Phase 03 detail

Tests are reusable check definitions. Two forms:

```yaml
# type: cmd (shell)
name: freshness
type: cmd
args: { path: string }
---
test -s "{{ args.path }}"

# type: js (JavaScript with context API)
name: api-check
type: js
args: { endpoint: string }
---
context.assert(context.inputs.length > 0, "No inputs");
```

Tasks reference them:
```yaml
checks:
  - id: typecheck
    cmd: pnpm typecheck
  - test:freshness(path=output.txt)
```

The loader expands `test:freshness(...)` to an inline check at parse time.
Runtime sees only inline checks.

## TDD discipline

Red-green-refactor for additions (phases 02-03). Inverted red-green for
deletions (phase 04).
