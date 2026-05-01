# Playbook chain — drift map and integration contract

This file is project-level documentation. It is owned by no single
playbook. Each playbook's `PLAN.md` links back here.

## The chain

```
cli-redesign → remove-goals → dbt-paradigm → declarative-discovery
```

Each arrow means "the right side has hard-prerequisite checks against
the left side." Predecessors must be merged on `main` before the
downstream playbook's phase 01 will pass.

`remove-epic` is a separate, earlier deletion playbook. It has no live
dependents in this chain but its tombstones may be observed by
`dbt-paradigm` phase 01 (which surveys "any remaining `epic`
references").

## Per-edge contract

What each downstream playbook reads from each upstream. If the upstream
implementer changes any item below during implementation, the
downstream playbook's contracts go stale and need to be revised before
the downstream playbook starts.

### cli-redesign exports (read by all three downstream playbooks)

| Surface | Used by | Notes |
|---|---|---|
| `packages/core/src/select/` (selector AST + grammar) | dbt-paradigm phase 03; declarative-discovery — none directly | dbt-paradigm extends grammar with `seed:<name>`, `test:<name>` |
| `packages/core/src/manifest/*` (manifest writer + format) | dbt-paradigm phase 03 (adds `libraries:` section); declarative-discovery phase 04 (parent/child edges from declarations) | The `state` field (`concrete`/`expected`/`frontier`) is load-bearing for both downstream playbooks |
| `packages/core/src/hash/` | dbt-paradigm — none directly; declarative-discovery — none | But `state:modified.*` selectors must keep working after both downstream playbooks |
| `target/manifest.json` shape | dbt-paradigm extends; declarative-discovery rewrites `parent_map` / `child_map` source | Schema must remain forward-compatible across additions |
| `target/run_results.json` | dbt-paradigm — none; declarative-discovery — none | But the staleness ladder must keep working |
| Verb set: `run/build/test/compile/list/clean/retry/...` | dbt-paradigm — uses `compile --seed`; declarative-discovery — uses `compile` for parity | No new top-level verbs added downstream |
| `--select` syntax: `+`/`@`/`*`/`name:`/`tag:`/etc. | dbt-paradigm extends with `seed:`/`test:`; declarative-discovery — no new selectors | Existing methods must keep working unchanged |
| Migration table at `docs/design/cli-redesign.md` §10 | remove-goals removes the `goals → build` row; dbt-paradigm phase 06 adds a `seed →` follow-up note; declarative-discovery — does not edit | Sequential edits to the same doc — last writer wins per section |
| `packages/cli/tests/fixtures/minimal-playbook/` | dbt-paradigm phase 02 (adds `seeds/`, `tests/`); declarative-discovery phase 02 (adds `children:` decls) | Three playbooks extend the same fixture in sequence |

### remove-goals exports (read by dbt-paradigm and declarative-discovery)

| Surface | Used by | Notes |
|---|---|---|
| Absence of `packages/core/src/runtime/goal-manager.ts` | dbt-paradigm phase 01 predecessor check; declarative-discovery phase 01 predecessor check | File-existence assertion |
| Absence of `goals` / `goalDefs` schema fields | dbt-paradigm phase 02 (when widening the `checks:` union — must not collide with reintroducing goal logic) | Behavioral implication |
| Migration table at `docs/design/cli-redesign.md` row removed | Read by dbt-paradigm phase 06 | dbt-paradigm phase 06 must not re-add a `goals` row |

### dbt-paradigm exports (read by declarative-discovery)

| Surface | Used by | Notes |
|---|---|---|
| `packages/core/src/runtime/child-synthesizer.ts` | declarative-discovery phase 04 (integration point for spawning-seed children with custom paths) | Must export a `synthesize(parent, entry, path?)` function |
| `packages/core/src/runtime/seed-spawner.ts` | declarative-discovery phase 04 (extends to register children in the path registry) | Must produce children whose path can be overridden by an entry's `path` field |
| `packages/core/src/runtime/seed-resolver.ts` | declarative-discovery — none directly | But context-seed semantics must keep working under the declarative loader |
| `packages/core/src/config/seed-md-definition.ts` | declarative-discovery phase 02 (the `from_seed:` field on a parent references a name in this registry) | The `name:` field on a seed must be the lookup key |
| `packages/core/src/config/test-md-definition.ts` | declarative-discovery — none directly | But the test-reference check type must keep working under the declarative loader |
| Absence of `packages/core/src/executor/wbs-executor.ts` | declarative-discovery phase 01 predecessor check | File-existence assertion |
| Absence of the `wbs:` frontmatter field in `task-md-definition.ts` | declarative-discovery phase 02 (no need to handle `wbs:` in the new schema) | Behavioral implication |
| `seeds/` and `tests/` library shape (per-playbook directories with `<name>.seed.md` / `<name>.test.md`) | declarative-discovery — preserves shape; the declarative loader still scans these libraries (small) | Library scanning is fine; only the *task DAG* scan is replaced |
| Manifest's `libraries:` section | declarative-discovery phase 04 — keeps writing it; just doesn't read it for DAG construction | Must remain the source of truth for tooling |

## Files touched by multiple playbooks

These files have multiple writers. The last-writer-wins per-section, but
conflicts are invisible until tests run. Each downstream playbook's
phase 02 should read the file post-predecessor-merge before editing.

| File | Order of writers |
|---|---|
| `packages/core/src/config/task-md-definition.ts` | cli-redesign (no change) → remove-goals (strips `goals`/`goalDefs`/`goal-defs` fields) → dbt-paradigm (widens `checks:` union; adds `seeds:`; strips `wbs:`) → declarative-discovery (adds `children:`, `from_seed:`) |
| `packages/core/src/config/loader.ts` | cli-redesign (no change) → remove-goals (no change) → dbt-paradigm (extends to walk `seeds/` and `tests/`) → declarative-discovery (routes through declarative loader; phase 06 deletes folder-scan branch) |
| `packages/core/src/manifest/*` | cli-redesign (creates) → dbt-paradigm (adds `libraries:` section; spawning-seed states) → declarative-discovery (rewrites `parent_map` / `child_map` source) |
| `packages/core/src/select/*` | cli-redesign (creates) → dbt-paradigm (adds `seed:`, `test:` methods) → declarative-discovery (no change; reads same grammar) |
| `packages/core/src/runtime/runtime.ts` | cli-redesign (touches via `compile`/`run` wiring) → dbt-paradigm (adds `seed-resolver` + `seed-spawner` calls) → declarative-discovery (consumes declarative loader output) |
| `docs/design/cli-redesign.md` (the spec doc itself) | cli-redesign creates → remove-goals removes the `goals` row from §10 → dbt-paradigm phase 06 adds a `seed →` note to §10 → declarative-discovery — no edit |
| `packages/cli/tests/fixtures/minimal-playbook/` | cli-redesign phase 06 creates → dbt-paradigm phase 02 adds `seeds/` and `tests/` → declarative-discovery phase 02 adds `children:` declarations |
| `packages/cli/src/main.ts` and `packages/cli/src/commands.ts` | cli-redesign restructures heavily → remove-goals removes the `goals` dispatch case → dbt-paradigm — no new top-level verb (per design); does not edit |
| `packages/cli/src/autonomous-run.ts` | cli-redesign may restructure (functions related to `run`); dbt-paradigm phase 04 deletes the file (functions absorbed into `commands-run.ts`) | If cli-redesign already moved the functions, dbt-paradigm phase 04 just deletes the empty file |

## Drift checklist

Before merging an upstream playbook to `main`, run through this list to
confirm downstream playbooks' contracts still hold. If any item fails,
update the affected downstream playbook's contracts before proceeding.

### When merging `cli-redesign`

- [ ] `packages/core/src/{select,manifest,hash}/` exist as named.
- [ ] `target/manifest.json` shape matches dbt-paradigm phase 03's
      assumption (top-level `nodes:`, `parent_map`, `child_map`, plus a
      `state` field per node).
- [ ] `--select 'frontier:'` and `--select 'concrete:'` both work.
- [ ] `converge compile --seed` exists and runs.
- [ ] The migration table at §10 of the spec doc still has the `goals`
      row at the moment cli-redesign merges (remove-goals will remove
      it on its merge).
- [ ] `packages/cli/tests/fixtures/minimal-playbook/` is committed and
      loadable.

### When merging `remove-goals`

- [ ] `packages/core/src/runtime/goal-manager.ts` does not exist.
- [ ] `packages/core/src/converge/goal-planner.ts` does not exist.
- [ ] `packages/core/src/config/parse-goal.ts` does not exist.
- [ ] `packages/cli/src/commands-goals.ts` does not exist.
- [ ] No `goals:` / `goalDefs:` / `goal-defs:` field in
      `packages/core/src/config/task-md-definition.ts`.
- [ ] `converge goals` exits non-zero with "unknown command."

### When merging `dbt-paradigm`

- [ ] `packages/core/src/runtime/child-synthesizer.ts` exists and
      exports a callable `synthesize(parent, entry, path?)`.
- [ ] `packages/core/src/runtime/seed-spawner.ts` exists and respects
      an entry's optional `path:` override.
- [ ] `packages/core/src/runtime/seed-resolver.ts` exists.
- [ ] `packages/core/src/config/seed-md-definition.ts` exists and
      parses `name:`, `kind:`, `args:`, optional `preview_manifest:`.
- [ ] `packages/core/src/config/test-md-definition.ts` exists and
      parses `name:`, `args:`, body / `cmd:`.
- [ ] `packages/core/src/executor/wbs-executor.ts` does not exist.
- [ ] `packages/core/src/executor/wbs-target-utils.ts` does not exist.
- [ ] No `wbs:` field in `packages/core/src/config/task-md-definition.ts`.
- [ ] `--select 'seed:<name>'` and `--select 'test:<name>'` both work.
- [ ] `packages/cli/tests/fixtures/minimal-playbook/seeds/` and
      `tests/` exist with at least one entry each.

### When merging `declarative-discovery`

- [ ] `packages/core/src/config/declarative-loader.ts` does not exist
      under that name only because phase 06 inlined it back into
      `loader.ts` — verify the current `loader.ts` does declarative
      walking, not folder-scan.
- [ ] No `walkTasksDirectory` or `scanTaskDirectories` symbol exists
      anywhere under `packages/`.
- [ ] No `CONVERGE_DECLARATIVE_DISCOVERY` env-var reference under
      `packages/`.
- [ ] Every parent `TASK.md` in every live playbook declares
      `children:` or `from_seed:`.

## How to use this file

When implementing playbook N:

1. Read this file's "Per-edge contract" sections for every upstream
   surface playbook N touches.
2. Run playbook N's phase-01 contract probe (the `00-contract-probe/`
   leaf that each downstream playbook adds) — it asserts the upstream
   surfaces match what playbook N's later phases assume.
3. If the probe fails, the upstream surface drifted during
   implementation. Update playbook N's TASK.md contracts before
   proceeding to phase 02.
4. After playbook N merges, walk the matching "When merging" checklist
   above. Update this file if any item is now stale (the contract
   shifted in a way the next downstream playbook needs to know about).

This file is the single place to look when "playbook N+1 was written
six weeks ago and the world has moved on" — which it will, every time.
