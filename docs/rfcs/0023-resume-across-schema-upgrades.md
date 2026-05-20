---
rfc: 0023
title: Resume across schema upgrades — migrate the journal, don't wipe it
status: draft
type: fix
source: human
priority_tier: tier2
estimate: "2-3 days"
backwards_compatible: yes
risk: low
---
# RFC 0023: Resume across schema upgrades — migrate the journal, don't wipe it

## Problem

Converge pitches durable execution: a run that paid for 64 of 198 tasks should not have to repay if a later run resumes. But today, a CLI upgrade that removes a frontmatter field silently turns every prior journal into a parse-time landmine.

Concrete scenario, observed in `examples/baby-app` on 2026-05-20:

1. A run on the 2026-05-18 CLI completed phases 01 and 02 plus per-screen spec/design/convert/analyze for all 13 screens. 64 tasks recorded in `.converge/journal/default/`, every spawned child's TASK.md rendered with `seed: { mode: cli }` at the top.
2. RFCs 0021 + 0022 land. The 2026-05-20 CLI rejects `seed:` at parse time (`packages/core/src/config/task-md-definition.ts:parseSeedMode`).
3. The user fixes their playbook *source* templates (the eight files under `.converge/playbooks/default/tasks/` and `.converge/playbooks/default/templates/`) to use `spawn: { min_children: N }` per the new contract.
4. They run `converge run --resume`. It throws on the first journal-rendered child it tries to re-parse and refuses to start.
5. Their only working option is `./scripts/clean.sh`, which wipes `.converge/journal/`, costing them every completed task. They re-pay ~30–60 minutes and ~$1 in LLM tokens to get back to the same DAG position.

The cause is not the schema removal — that was correct. The cause is that nothing in the framework recovers a journal entry whose contract becomes obsolete. Once the parser rejects it, there is no second path.

A removal RFC without a migration story is a destructive change in framework clothing.

## Proposal

Two pieces:

1. **`converge migrate`** — a new CLI verb that scans the journal, classifies parse failures, and re-renders or quarantines stale entries per a user-selected strategy. Default behaviour preserves outputs and recovers the journal in place.

2. **A migration stanza in every removal RFC**. Future RFCs that remove fields from `TaskMdFrontmatterSchema` must (a) name the failure existing journals will hit, (b) specify the parser signal `converge migrate` uses to detect it, and (c) declare the default migration strategy. RFC merge is blocked until `converge migrate --strategy=re-render` handles the removal.

A small runtime patch (already landed; see Composition) catches the parse error during `--resume` and lets the run continue with the affected nodes re-marked pending. `converge migrate` is the *explicit*, *auditable* surface; the patch is the *automatic* backstop.

### `converge migrate` — surface

```
converge migrate --playbook=<name>
                 [--dry-run]
                 [--strategy=re-render|preserve|quarantine]
                 [--include-attempts]
                 [--output=<path>]
```

| Flag | Meaning |
|---|---|
| `--playbook=<name>` | Required. Scopes the migration to one playbook's journal under `.converge/journal/<name>/`. |
| `--dry-run` | Don't write anything; print the report and exit. |
| `--strategy=re-render` *(default)* | For each stale entry, re-render the rendered child from its source template + the vars recovered from runstate. The child's prior `status`, `output_hashes`, and check results are preserved — only the TASK.md text changes. |
| `--strategy=preserve` | Don't modify any TASK.md. Just produce the report. Equivalent to `--dry-run` but emits `MIGRATION.json` for tooling. |
| `--strategy=quarantine` | Move each stale TASK.md to `TASK.md.stale-schema-<isoDate>.bak` and mark the runstate node `status: stale-quarantined`. The next `--resume` re-spawns from scratch. |
| `--include-attempts` | Also scan `attempts/*/TASK.md` snapshots, not just the current `TASK.md`. Default off — attempt snapshots are historical, not load-bearing. |
| `--output=<path>` | Where to write `MIGRATION.json`. Defaults to `.converge/journal/<name>/MIGRATION.json`. |

Exit codes:
- `0` — clean (no stale entries, or all migrated successfully).
- `2` — stale entries found and not migrated (with `--dry-run` or `--strategy=preserve`).
- `3` — migration attempted but at least one entry could not be re-rendered (e.g. parent's spawn manifest itself is stale). The remaining entries are still migrated; this is a partial success.
- `64` — usage error.

### `MIGRATION.json` schema

```ts
type MigrationReport = {
  schemaVersion: 1;
  playbook: string;
  startedAt: string;             // ISO timestamp
  cliVersion: string;
  strategy: "re-render" | "preserve" | "quarantine";
  dryRun: boolean;
  totals: {
    scanned: number;
    stale: number;
    migrated: number;
    failed: number;
    quarantined: number;
  };
  entries: MigrationEntry[];
};

type MigrationEntry = {
  taskId: string;
  journalPath: string;           // .converge/journal/<name>/tasks/<id>/TASK.md
  sourceTemplate?: string;       // from runstate node.source_path
  parentTaskId?: string;         // from runstate node.from_seed
  prevStatus: string;            // pass | error | seeded | ...
  errorCode: MigrationErrorCode; // see classification below
  errorMessage: string;          // first line of thrown Error.message
  action: "re-rendered" | "quarantined" | "preserved" | "failed";
  failureReason?: string;        // present iff action === "failed"
};

type MigrationErrorCode =
  | "schema-removed"             // entire block removed (e.g. seed: { mode: cli })
  | "schema-renamed-field"       // field name changed (foo: → bar:)
  | "schema-changed-type"        // string-to-object, etc.
  | "malformed-yaml"             // parser couldn't even tokenise
  | "unknown";                   // future-proofing
```

### Detection algorithm

For each `tasks/*/TASK.md` (and `attempts/*/TASK.md` if `--include-attempts`):

1. `parseTaskMdString(raw)` — if it returns, the entry is current. Skip.
2. If it throws an Error with `errorCode: "schema-removed"` (or any other tagged `errorCode`), record the entry with that code.
3. If it throws an untagged Error, record with `errorCode: "unknown"` and `errorMessage` set to the first line. The migrator does not attempt re-render for unknown codes; it requires `--strategy=quarantine` or human review.

The classification leans on the **tagged-error convention** introduced by the runtime patch (see Composition §1): the parser attaches an `errorCode` string to every `throw` for a known schema-evolution case. New removals must add a new code; the migrator gets the new case for free.

### Re-render path

For a node with `action: "re-rendered"`:

1. Resolve the source template via `rsNode.source_path`. Refuse if it's missing — fall back to `--strategy=quarantine` for that node.
2. Recover render-time vars:
   - First-preference: read the parent's `$CONVERGE_TASK_DIR/spawn.plan.jsonl` (RFC 0021) and find the row whose `id` matches this node. Use its `vars`.
   - Fallback: read `rsNode.vars` from runstate (if present — older runstate versions may not have it).
   - If neither yields vars: refuse to re-render; mark `action: "failed"` with `failureReason: "vars-unrecoverable"`.
3. Re-render via the same primitive `apply` uses (`packages/core/src/task/spawn/apply.ts:renderChildTaskMd` or equivalent). The output replaces the on-disk `TASK.md`.
4. Verify the new file parses. If it doesn't, that's a bug in the migrator or in the source template — abort with `action: "failed"`, don't ship a worse file than we found.
5. Preserve `attempts/`, `logs/`, `data/`, `checkpoint.json`, and every other sibling file. Only `TASK.md` changes.

### Why not just auto-migrate on resume?

The runtime patch (Composition §1) already does a soft version of this — catches the error, marks the node pending, lets the parent re-spawn. That's automatic and silent except for one stderr summary.

The reason for the explicit verb:

1. **Re-spawning re-runs the body.** A stale `pass` child whose body produced expensive outputs (an SVG via an image API, 90s of dart analyze) will re-run those outputs on resume. `converge migrate --strategy=re-render` preserves the outputs and only rewrites the contract. For showcase repos that commit their journal, this matters.

2. **Auditability.** A `MIGRATION.json` committed alongside the journal makes the upgrade legible: "between CLI 0.20 and 0.22, these 22 entries were re-rendered from these source templates." A silent runtime fallback gives no such artefact.

3. **Dry-run is a first-class need.** A user inspecting an inherited repo wants to know "what would I lose if I upgrade?" before they upgrade. The runtime patch only triggers if they already upgraded.

4. **Quarantine.** Some users want the bad entries set aside, not rewritten. The runtime patch can't offer that — it has no on-disk effect.

## Composition with other RFCs

| RFC | Relationship |
|---|---|
| **RFC 0021** | Removed `seed: { mode: cli }` and introduced `spawn.plan.jsonl`. 0023's re-render path reuses 0021's render primitive. 0021 is the *first* removal RFC that 0023 retroactively covers. |
| **RFC 0022** | Removed `passthrough: true` semantics in favour of `mode:`. Same migration class — 0023 handles it. |
| **RFC 0012 (doctor)** | `converge doctor` addresses parse-failures-at-spawn-time (`.rejected` files, EVIDENCE.json). `converge migrate` is its sibling for parse-failures-at-resume-time. They don't overlap. |
| **RFC 0005 (frontier checkpoint)** | Resume optimisation assumes the DAG compiles. The patch in §1 below + the migrate verb in §2 make that assumption survivable. |
| **RFC 0009 (structured retry context)** | The repair loop can read `MIGRATION.json` to surface "this node was re-rendered between attempts" — useful context for the repair agent. Cross-link, no API change. |

### 1. Runtime patch (already landed)

`packages/core/src/run/index.ts:582–615` now wraps `parseTaskMdString(raw)` in try/catch. On `errorCode === "schema-removed"`:

- The node is added to the DAG with `taskDef` reconstructed from runstate metadata (title, inputs, outputs, checks already in `rsNode`).
- `status` is forced to `"pending"` regardless of the prior runstate status. This guarantees the parent's spawner regenerates the child on the next wave.
- A `staleSchemaNodes[]` accumulator collects affected ids; an end-of-resume `kind: "log", level: "warn"` event reports the count and first five ids.
- Any other thrown error (`malformed-yaml`, unknown) is re-thrown — we don't paper over genuine bugs.

`packages/core/src/config/task-md-definition.ts:parseSeedMode` attaches `errorCode: "schema-removed"` to its thrown Error so callers don't string-match.

This is the *backstop*: it makes `--resume` survivable even if the user never runs `converge migrate`. Tests under `packages/core/tests/unit/parse-seed-mode.test.ts` lock the contract.

### 2. The verb (this RFC proposes; not yet implemented)

New module: `packages/core/src/migrate/` with `index.ts` exporting `migrateJournal(opts: MigrateOptions): Promise<MigrationReport>`.

New CLI command: `packages/cli/src/commands-migrate.ts`, registered alongside `commands-doctor.ts` and `commands-apply.ts` in the CLI surface.

Reuses:
- `parseTaskMdString` for detection (no edits — relies on tagged errors).
- The render primitive from `task/spawn/apply.ts` for re-rendering.
- The journal walker pattern from `commands-doctor.ts` for scanning.

## Migration-stanza requirement for future removal RFCs

Add to whatever doc gates RFC review (likely `docs/rfcs/README.md` or a `_template.md`):

> ### Migration (required for any RFC that removes or renames a frontmatter field or block)
>
> 1. **Failure mode.** What will an existing journal entry that uses the old shape look like to the new parser? Quote the exact thrown error.
> 2. **Detection signal.** What `errorCode` will the parser attach to that error? (Add a new constant if needed.)
> 3. **Default strategy.** Should `converge migrate` re-render, quarantine, or refuse? Justify.
> 4. **Variable recovery.** Where will the migrator find the vars needed to re-render? (Runstate, parent's `spawn.plan.jsonl`, or new source.) If none, the strategy must be `quarantine` and the RFC must document the user-visible cost.
>
> An RFC that removes a field without filling in this stanza is non-mergeable. The reviewer's checklist must include "is the migration stanza complete and is `converge migrate` updated to handle it?"

Retroactive coverage: 0021 and 0022 each get a one-paragraph addendum (a `Migration` section appended) when 0023 lands. The addendum points back here.

## Test plan

Unit tests, new under `packages/core/tests/migrate/`:

1. **classify-schema-removed** — fixture TASK.md with `seed: { mode: cli }`. Call the classifier; expect `errorCode: "schema-removed"`.
2. **classify-malformed-yaml** — fixture with broken YAML. Expect `errorCode: "malformed-yaml"`, no re-render attempted.
3. **classify-clean** — fixture with current-shape TASK.md. Expect not-stale.
4. **re-render-happy** — fixture journal with one stale entry whose parent has a current `spawn.plan.jsonl` row. Run `migrate --strategy=re-render`. Assert the on-disk TASK.md is rewritten, the new file parses, and `MIGRATION.json` records `action: "re-rendered"`.
5. **re-render-vars-unrecoverable** — same fixture but parent's manifest is missing the row. Expect `action: "failed"`, `failureReason: "vars-unrecoverable"`. Exit 3.
6. **quarantine** — stale entry, `--strategy=quarantine`. Assert `.bak` file exists, original is gone, runstate node has `status: "stale-quarantined"`.
7. **dry-run** — none of the above mutate disk; only `MIGRATION.json` (or the report file) is written.
8. **include-attempts** — stale entry under `attempts/02/TASK.md`. With the flag off, ignored; with it on, included in the report.

Integration test under `tests/test-migrate-flow/`: a synthetic project with mixed-shape journal (4 stale, 6 current), runs `converge migrate --strategy=re-render` end-to-end, then runs `converge run --resume` and asserts only the pending nodes execute, not the recovered ones.

## Anti-goals

- **Not** removing the runtime patch. The patch (§1) is the safety net for users who haven't run `migrate`. It stays even after the verb ships.
- **Not** auto-running `migrate` on `--resume`. The verb is explicit on purpose — silent on-disk migrations are scary.
- **Not** broadening to general "convert TASK.md from version X to version Y". The scope is narrow: removed/renamed schema fields that the current parser rejects. Not type changes that the parser silently coerces.
- **Not** versioning the journal format itself. The runstate's existing fields (`source_path`, `from_seed`, `spawn.plan.jsonl`) are enough; no schema version stamp needed.

## Open questions

1. **What about a parent that itself is stale-schema?** Today's example (baby-app, 22 stale `05-split`/`06-lift` children) had this exact shape: the *templates* were healed but the rendered files were stale. The parent's source templates already migrated, so re-render works against the new template. But what if the parent's `runstate` source_path points at a template that has since been deleted? Lean: `--strategy=re-render` fails for that node with `failureReason: "source-template-missing"`; user must hand-quarantine or re-author. Document this case explicitly.

2. **Should `MIGRATION.json` be committed in showcase repos?** It would make upgrade history legible. Lean: yes — recommend committing alongside the journal, no enforcement. Examples gallery (`baby-app`, `deep-research`, `cinematic-video-production`) should set the precedent.

3. **Interaction with hot-reload (RFC 0015).** Hot-reload updates the in-memory DAG from edited source. Should it also trigger a `migrate` pass against the journal? Lean: no — hot-reload is a dev-loop convenience; migrate is a deliberate upgrade step. Don't conflate.

4. **What about an `errorCode` registry?** Tagging errors with `errorCode: "schema-removed"` works fine for one removal, but if 0024 introduces `errorCode: "field-renamed"` we need a canonical list. Lean: a `packages/core/src/config/schema-errors.ts` constants file enumerating known codes, with each RFC's migration stanza required to point at the constant it adds. Defer to follow-up RFC if it bloats.

## Why now

The baby-app incident is the first observed case of a user being forced to wipe their journal because of a schema upgrade. It will not be the last — RFCs 0021 and 0022 are recent, and future removals (RFC 0017 successor contract, RFC 0019 attempt snapshots) will introduce more. Without 0023, every schema RFC carries a hidden cost: every user with a journal on the prior shape pays the rebuild cost on upgrade.

The cheap fix (the runtime patch) is already in. The verb is the surface that turns the cheap fix into an auditable upgrade ritual. The process change is the backstop that keeps future RFCs from re-introducing the gap.
