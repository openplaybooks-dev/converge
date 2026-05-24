---
rfc: 0030
title: Single source of truth for spawned-child contracts
status: shipped
type: refactor
source: human
priority_tier: tier1
estimate: "3-4 days"
backwards_compatible: yes
risk: medium
breaks_existing: no
---
**Deprecated:** References to `spawn.yml` in this RFC reflect the pre-RFC 0031 design. The `spawn.yml` file-based invocation surface was superseded by RFC 0031 (unified `tasks.jsonl` / `converge spawn` CLI command). This RFC is kept for historical reference only.

# RFC 0030: Single source of truth for spawned-child contracts

## Problem

After RFC 0024 (AI-native spawning) landed, a single spawned child now has its **contract** persisted in three places at once:

| Location | Author | Substituted? | Read by |
|---|---|---|---|
| `.converge/inventory/<pb>/spawned/<id>/TASK.md` | `applyManifest` → `renderChildTaskMd` (`apply.ts:325`) | partial (was buggy; fixed by commit c16cfb3aa) | `declarative-loader.ts:172-205` — to add the child to the DAG on the next compile |
| `<execDir>/spawn/<id>/EXPANDED.md` | `ingestSpawnDir` → `expandInvocation` → `renderMustache` (`expand.ts:104-114`) | full | the AI, via `converge inspect`; humans, via `cat` |
| `.converge/inventory/<pb>/tasks.jsonl` (one row per child) | `appendTaskUpsert` (`runtime-ledger.ts:380`) | n/a — row carries id/status/fingerprint, not contract text | the runner's cache check; the inventory hydrate (RFC 0025) |

Per child, three files; per playbook of N children, 3N files. They drift:

1. **EXPANDED.md was substituted correctly** at the moment of apply (every `{{var}}` resolved against the row's `params`).
2. **The inventory's TASK.md** went through a separate render path that until just now (commit `c16cfb3aa`) silently skipped inputs/outputs/tags — a real bug we burned hours chasing on `mezon-bot-ai/mezon-portal`. That bug only surfaced because we audited the files; nothing in the runner read inputs/outputs from this copy *as substituted strings*, it loaded the raw file via `declarative-loader.ts` and the substitution silently rotted.
3. **tasks.jsonl** carries identity but not contract — so it's authoritative for *which* children exist, but cannot answer *what each one is supposed to do*.

The RFC 0024 ingest pipeline already publishes a clean, fully-substituted contract per child (EXPANDED.md). Persisting a second copy under `inventory/spawned/` is byte-level duplication with a render path that has historically diverged. This RFC consolidates.

## Proposal

**Three artefacts, three jobs, no overlap.** Make each layer answer one question and stop writing the other layers' content.

| Layer | Job | What it stores |
|---|---|---|
| `<execDir>/spawn/<id>/EXPANDED.md` | The **contract**. Fully-substituted TASK.md the runner compiles, the AI reads, humans `cat` and `git blame`. | One file per spawned child, mirrors the template's TASK.md with `{{var}}` resolved. |
| `tasks.jsonl` (one row per child) | The **catalogue**. Identity + status + fingerprint + provenance — the durable cross-machine signal RFC 0025 added. | id, template name, params (the row's input), depends_on, parent, status, fingerprint, completedAt. No contract text. |
| *(deleted)* `inventory/<pb>/spawned/<id>/TASK.md` | — | Removed. Was a redundant, lossy second render of EXPANDED.md. |

The `declarative-loader.ts` walker switches from reading `inventory/spawned/<id>/TASK.md` to reading `<journal>/<pb>/tasks/<parent>/exec/spawn/<id>/EXPANDED.md`. That preserves the runner's DAG-compile path; we just changed which file it reads.

Why not the maximally-thin option (drop EXPANDED.md too, embed contract text into tasks.jsonl rows)? Three reasons that turn out to matter:

1. **`cat` and `grep` are the human-debug story.** When a task fails, the operator's first move is `cat .converge/.../EXPANDED.md` to see what was *supposed* to happen. Burying contracts in JSONL fields makes that a `jq` invocation; not impossible, just hostile.
2. **Git diff of a contract is legible.** When the template changes between runs, `git diff` over `EXPANDED.md` shows the contract delta cleanly. JSONL fields don't diff as well.
3. **Backwards compat is cheaper.** Existing tooling (RFC 0019 snapshots, `converge inspect`, the navigator) walks files, not JSONL fields. Keeping a real file at a predictable path means we don't churn that surface.

## Composition with other RFCs

| RFC | Relationship |
|---|---|
| **0021** | `applyManifest` keeps existing — it still writes EXPANDED.md and tasks.jsonl rows. We just stop the third write (inventory/spawned/TASK.md). |
| **0024** | EXPANDED.md is already the canonical AI-facing contract per RFC 0024. This RFC promotes it to "the contract" full-stop. |
| **0025** | The thin tasks.jsonl ledger carries the cross-machine resume signal. We keep that shape; this RFC reduces what *else* is on disk. |
| **0019** | Per-attempt snapshot bundles already capture TASK.md + outputs into a single tarball. They keep reading from the canonical contract path (EXPANDED.md after this RFC; was inventory/spawned/<id>/TASK.md before). One-line change. |
| **0026 / 0027** | Sibling-output detection and concurrency guard both read declared outputs. They consume from `taskDef.outputs` which the loader derives from EXPANDED.md after this RFC, same as today. No change. |

## Code-level design

### Step 1 — Add EXPANDED.md-aware loader path

`declarative-loader.ts:172-205` currently scans `inventory/<pb>/spawned/` for TASK.md files. Add a parallel scanner that walks `<journal>/<pb>/tasks/*/exec/spawn/<id>/EXPANDED.md` and registers each as a DAG node. The two scanners coexist during the migration window.

### Step 2 — Stop writing inventory/spawned/<id>/TASK.md

`applyManifest` at `apply.ts:530-575` writes to `inventoryPath = .converge/inventory/<pb>/spawned/<id>`. Gate this write behind a feature flag `CONVERGE_LEGACY_SPAWNED_INVENTORY=1` (default off after the loader change lands). Tooling that depends on the file (none in the framework; check examples gallery) gets a clear deprecation path.

### Step 3 — Migration verb

`converge migrate --rfc=0030` walks `inventory/<pb>/spawned/`, confirms each entry has a counterpart under `<journal>/<pb>/tasks/<parent>/exec/spawn/<id>/EXPANDED.md`, and deletes the inventory copy. Refuses to delete when the EXPANDED.md is missing (the case where a spawned child predates this RFC and only the inventory copy exists). Operator can opt in to `--strategy=re-render` which re-runs `expandInvocation` against the row's stored params to produce a fresh EXPANDED.md.

### Step 4 — Update RFC 0019 (snapshots) to read from EXPANDED.md

The per-attempt snapshot writer in `packages/core/src/journal/snapshot.ts` (when implemented per RFC 0019) reads the contract from the inventory path. Switch to EXPANDED.md.

## What changes for users

- **Operators** see one contract file per child instead of two. `cat .converge/journal/.../EXPANDED.md` replaces `cat .converge/inventory/.../TASK.md` in muscle memory; `converge inspect <id>` already shows the right path.
- **Playbook authors** see no change. The template surface is unchanged; they still author `templates/<name>/TASK.md` + `PARAMS.yml`.
- **AI** sees no change. The convergence loop reads its TASK.md from the path the loader resolves; the path just changed.
- **CI** sees one fewer place to grep for stale `{{var}}` placeholders.

## Verification

1. **Loader-from-EXPANDED.md test**: synthesise a workspace with one EXPANDED.md at the new path and no inventory copy. Run `converge run --dry`. Assert the spawned child appears in the DAG.
2. **No-inventory-copy regression**: synthesise a workspace with both paths populated, set `CONVERGE_LEGACY_SPAWNED_INVENTORY=0`, run `converge run`. Assert the inventory copy is *not* refreshed by the run, and that the run completes successfully.
3. **Migration verb**: synthesise a workspace with 5 inventory copies and 5 matching EXPANDED.md files. Run `converge migrate --rfc=0030`. Assert 5 deletions, 0 errors. Re-run on a fixture missing one EXPANDED.md: assert 4 deletions, 1 refusal.
4. **End-to-end on mezon-portal**: after this RFC ships, run mezon-portal's 02-spawn → expect 133 EXPANDED.md files, 133 tasks.jsonl rows, 0 inventory/spawned/ files, every per-screen child compiles and runs.

## Anti-goals

- **NOT** embedding contracts into tasks.jsonl. The catalogue-row shape stays thin (identity + status + fingerprint).
- **NOT** moving EXPANDED.md to a new location. It already sits next to `spawn.yml` per RFC 0024 conventions; that's the right home.
- **NOT** changing the runner's DAG-compile path beyond switching which file the loader reads. The DAG shape, the topological sort, the cache predicate — all unchanged.
- **NOT** dropping `inventory/<pb>/tasks.jsonl`. That's the cross-machine resume signal RFC 0025 added; this RFC only consolidates the *contract* files, not the catalogue.

## Open questions

1. **What about hand-spawned children?** Some playbooks use `converge spawn task --task-file <tpl> --var k=v` (legacy CLI) which writes to inventory/spawned/<id>/TASK.md directly without going through RFC 0024's `ingestSpawnDir`. Those have no EXPANDED.md counterpart. Lean: the migration verb refuses to delete these, surfaces them as "needs re-spawn via RFC 0024", and a follow-up RFC migrates the spawn-template CLI to write EXPANDED.md at the new location.

2. **What does `converge inspect <child-id>` show?** Today it reads the inventory copy. Lean: switch to EXPANDED.md when present, fall back to the inventory copy during the migration window. One-line change.

3. **Snapshot tarballs (RFC 0019).** Per-attempt snapshots currently include TASK.md. After this RFC, snapshots include EXPANDED.md at the canonical path. Existing snapshots remain readable (different path) but won't be produced going forward. No replay-compat shim needed because RFC 0019 is still draft.

4. **Bytes saved.** Each spawned child sheds ~3 KB of duplicated TASK.md. For a 133-child run like mezon-portal, that's ~400 KB. Trivial compared to the journal logs, but tracking it because it's the kind of accumulated cruft that makes `.converge/` feel "heavy" for ops.

## Why now

The `mezon-portal` RFC 0024 migration today surfaced a real, latent, multi-month-old bug: `renderChildTaskMd` silently dropped substitutions in three frontmatter fields. We patched the renderer (commit `c16cfb3aa`), but the duplicate-file architecture made the bug invisible until 133 spawned children all had identically-broken outputs. With EXPANDED.md as the single source of truth, that class of bug becomes impossible to introduce — the AI-native render path is the only render path.
