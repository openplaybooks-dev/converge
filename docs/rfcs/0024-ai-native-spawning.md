---
rfc: 0024
title: AI-native spawning — write child TASK.md files, not manifests
status: draft
type: feat
source: human
priority_tier: tier1
estimate: "5–7 days"
backwards_compatible: yes
risk: medium
supersedes_surface_of: 0021
---
# RFC 0024: AI-native spawning — write child TASK.md files, not manifests

## TL;DR

A spawner task today must teach the AI four framework concepts —
`$CONVERGE_TASK_DIR`, `spawn.plan.jsonl`, `converge apply`, and the
template+`vars:` indirection — before it can break work down. None of
those are intrinsic to "decompose this work into N sub-tasks." They
are footprints of how the runtime ingests children.

This RFC collapses the AI-facing surface to a single primitive the AI
already uses fluently: **write a TASK.md file**. A spawner body's job is
no longer to author a manifest; it is to populate a working directory
with child `TASK.md` files. The framework discovers them, compiles them
to the RFC 0021 manifest internally, and applies it. Failure repair is
the same primitive in reverse: edit the offending file.

RFC 0021's JSONL manifest stays — it remains the framework's internal
intermediate representation. What changes is the **AI authoring
surface**: from "emit a manifest with framework-specific schema" to
"write children the way you'd write any TASK.md."

## Problem

Look at what the AI must currently learn to write a competent spawner
body (`examples/app-builder/.../002-generate-per-asset/TASK.md:29-53`,
`skills/converge-planning/SKILL.md:82-97`, RFC 0021):

| Concept | What the AI must learn |
|---|---|
| Exec dir | `$CONVERGE_TASK_DIR` is the per-task scratch; manifest goes there |
| Manifest format | One JSON object per line, fields `id`/`template`/`vars`/`after`/`no_inherit`, strict-mode rejects unknown fields |
| Apply lifecycle | Framework runs `converge apply` after the body when `mode: spawner`; result lands in `spawn.plan.result.jsonl` |
| Template resolution | `template: "<name>"` resolves under `templates/`; paths vs. names differ subtly |
| Var passing | `vars` is a map<string, string|number|bool>; strict-mode templates reject unknown keys and require declared ones |
| Result protocol | Repair reads `spawn.plan.result.jsonl`, finds rows with `"ok": false`, patches the offending lines in `spawn.plan.jsonl`, then the framework re-applies |

Six framework-specific concepts. The AI does **work breakdown** well —
"this asset needs a spec → generation → wiring pipeline" is natural
reasoning. It does **manifest authoring** badly: it forgets the
`$CONVERGE_TASK_DIR` prefix, picks `--var` syntax when it should write
JSONL, drops template indirection it didn't need (`template:` pointing
at a sibling that mostly inlines vars verbatim into a body it could
have written directly), or invents fields the strict schema rejects.

The fundamental mismatch: **the AI thinks in tasks; the framework
makes it think in manifests of tasks.** Every concept in the table
above is "indirection that exists for the runtime, not the author."

Costs observed:

- **Authoring friction.** A new playbook's first spawner body takes
  multiple iterations before the manifest format is correct, even
  with the planning skill. Migration comments in
  `examples/app-builder/.../002-generate-per-asset/TASK.md:16-25`
  document this directly: a *human* had to leave a TODO telling
  future AI authors how to rewrite the body from `converge spawn`
  calls into JSONL.
- **Repair stalls.** When `spawn.plan.result.jsonl` shows a per-row
  failure, the AI must reason across three files (the manifest, the
  result, the EVIDENCE) and a structured error taxonomy
  (`errorCode: missing-vars | template-not-found | …`) to patch a
  single line. The minimum patch is "fix the manifest row"; the
  context required to identify it is much larger.
- **Templates pay rent even when unused.** The template+`vars:`
  indirection is essential when the same child shape repeats 50×.
  It is overhead when the AI is spawning 3 heterogeneous children —
  but the runtime requires it for every dynamic child today.
- **Framework leaks into authoring.** Every spawner body has
  framework vocabulary (`CONVERGE_TASK_DIR`, `spawn.plan.jsonl`,
  `converge apply`, `mode: spawner`) in the body itself, not in the
  contract frontmatter. A reader can't tell at a glance which parts
  are "the work" and which are "the protocol."

The four mainstream playbooks (`app-builder`, `social-sim`,
`deep-research`, `flutter-app`) all have spawner bodies that are
mostly protocol and very little work.

## Proposal

A spawner body has exactly one job: **produce child TASK.md files
in its working directory.**

The framework:

1. Sets the spawner body's `cwd` to a fresh, empty directory the
   framework owns.
2. Runs the body. The body creates whatever child TASK.md files it
   wants, by any means — `cat > child-01/TASK.md <<EOF`, `cp
   templates/X child-N/TASK.md && sed -i …`, `mkdir + Write tool`,
   even a Node script. The framework does not care **how** the
   files appeared; only that they did.
3. After the body exits, scans the cwd for any `<id>/TASK.md` (or
   bare `<id>.task.md` — see "Layout" below). For each one, reads
   its frontmatter as the contract and compiles it to one row of
   the RFC 0021 manifest internally.
4. Runs `converge apply` on the compiled manifest. Per-row failures
   become structured `EVIDENCE.json` files **placed next to the
   offending TASK.md** — same path, same name discipline as the
   source file the AI wrote. Repair = "edit the file with the
   sibling EVIDENCE.json next to it."

What the AI sees:

```
parent TASK.md (mode: spawner)
└─ body:
     write child files in cwd:
       hero-spec/TASK.md
       hero-generate/TASK.md
       hero-wire/TASK.md
       villain-spec/TASK.md
       …
```

That's the entire AI-facing protocol. No env var name. No JSONL.
No `converge apply`. No template path. No `vars:` injection.
Just the format the AI already authors for every static task.

### What the parent body becomes

Today (`examples/app-builder/.../002-generate-per-asset/TASK.md`):

```bash
TEMPLATES=".converge/playbooks/default/templates"
MANIFEST=".stitch/assets/manifest.json"
# … 20 lines of jq + shell + converge spawn template --var k=v …
```

Tomorrow:

```bash
MANIFEST=".stitch/assets/manifest.json"
COUNT=$(jq 'length' "$MANIFEST")

for I in $(seq 0 $((COUNT - 1))); do
  A=$(jq -c ".[$I]" "$MANIFEST")
  AID=$(echo "$A" | jq -r '.id')
  NAME=$(echo "$A" | jq -r '.name')
  OUT=$(echo "$A" | jq -r '.output')

  mkdir -p "$AID-spec" "$AID-generate" "$AID-wire"

  cat > "$AID-spec/TASK.md" <<EOF
---
id: $AID-spec
depends_on: []
outputs:
  - .stitch/assets/$AID/SPEC.md
checks:
  - id: spec-exists
    cmd: test -f .stitch/assets/$AID/SPEC.md
---
Write the spec for asset "$NAME" → .stitch/assets/$AID/SPEC.md.
Cover: subject, palette, composition, lighting, target output $OUT.
EOF

  cat > "$AID-generate/TASK.md" <<EOF
---
id: $AID-generate
depends_on: [$AID-spec]
outputs: [$OUT]
checks:
  - id: image-exists
    cmd: test -f $OUT
---
Generate the image at $OUT from .stitch/assets/$AID/SPEC.md.
EOF

  cat > "$AID-wire/TASK.md" <<EOF
---
id: $AID-wire
depends_on: [$AID-generate]
outputs: [src/assets/$AID.ts]
checks:
  - id: wired
    cmd: grep -q "$AID" src/assets/index.ts
---
Wire $OUT into src/assets/index.ts as export "$AID".
EOF
done
```

Every concept in the body is now *the work itself*. There is no
framework vocabulary. A reader who has never seen Converge can read
this body and understand what it spawns. Crucially: a reader who
*has* seen Converge can compare it against a static `tasks/`
subtree and observe **they use the same primitive**. The mental
model "what a TASK.md is" stops branching at static vs dynamic.

### Why this is the most flexible surface

A flexibility check across the design space:

| Capability | Manifest (RFC 0021) | This RFC |
|---|---|---|
| One-off heterogeneous children | Possible; one manifest row per shape | Natural; just write the file |
| Homogeneous fan-out from data | Natural (template + vars) | Natural (loop + heredoc, or `cp` template) |
| Mix of templated + custom children | Awkward (templates assume the contract is in a `.template.md`) | Natural; just write whichever shape per child |
| Child contracts the planner invents | Awkward; needs ad-hoc template file first | Natural; the contract *is* the file |
| Per-child override of one field | Hard (must extend manifest schema) | Trivial; edit one line in the file |
| Repair after partial failure | Read 3 files, patch manifest line | Read 1 file's sibling EVIDENCE.json, edit the file |
| Re-running with one child changed | Idempotent via manifest hash | Idempotent via file hash |
| Cross-wave fan-in (converger) | New manifest each wave | Files keep accumulating, framework picks up new ones |

The file-as-primitive surface dominates because it **subsumes**
the manifest's expressivity: anything you can express as a manifest
row, you can express as a TASK.md frontmatter. The reverse is not
true (a TASK.md can carry an entire instruction body; a manifest
row can carry only fields the schema declares). The manifest is
necessarily a subset of what a TASK.md can say. We're removing the
narrower surface from the AI's authoring path, not the engine's
internal path.

### Templates are not removed — they are demoted to "files"

Templates remain valuable when:

- The same contract shape repeats N×.
- A common change to all N should be a single edit.

They lose framework status. A "template" becomes just a TASK.md file
sitting somewhere convenient (`templates/asset-spec.task.md`). The
spawner body uses ordinary file operations to instantiate it:

```bash
for AID in $(jq -r '.[].id' "$MANIFEST"); do
  cp "$WORKSPACE/.converge/playbooks/default/templates/asset-spec.task.md" \
     "$AID-spec/TASK.md"
  sed -i "s/{{assetId}}/$AID/g" "$AID-spec/TASK.md"
done
```

No `template:` field on the manifest. No `vars:` strict-mode. No
`converge spawn template`. The AI does `cp` + `sed`, or uses
`envsubst`, or writes a heredoc, or shells out to a Node script.
The framework neither knows nor cares.

If the editorial pattern proves common enough to warrant ergonomics,
we add a tiny **non-framework** helper that is just file copy +
substitution (no manifest, no ledger touch, no env var):

```bash
converge render \
  --from templates/asset-spec.task.md \
  --to $AID-spec/TASK.md \
  --set assetId=$AID --set assetName="$NAME"
```

This is `cp + sed` with structured flag parsing. It does not
register anything; the framework still discovers the resulting
TASK.md after the body exits. The helper is a convenience for the
human reading the body, not a framework concept the AI must learn
to use. A spawner body that never calls `converge render` is
equally valid.

### Layout

The body's cwd is:

```
.converge/journal/<playbook>/tasks/<spawner-id>/spawn/
```

(Sibling to `attempts/`, `logs/`, `exec/` — same neighbourhood the
framework already owns under `tasks/<id>/`.)

Any of the following shapes is a child:

```
spawn/
  hero-spec/TASK.md         ← directory form
  hero-generate/TASK.md
  villain.task.md           ← flat form (id derived from filename)
  templates/                ← ignored; reserved prefix for staging
  _scratch/                 ← ignored; "_"-prefix is "not a child"
  EVIDENCE.json             ← ignored; reserved for repair
```

Rules:

1. A directory with a `TASK.md` inside ⇒ one child. Directory name
   is the child id unless the frontmatter overrides with `id:`.
2. A file matching `*.task.md` at the top of `spawn/` ⇒ one child.
   Filename without `.task.md` is the id.
3. Subdirectories whose name begins with `_` or matches the
   reserved set (`templates/`, `_scratch/`) are skipped.
4. `EVIDENCE.json` and `EVIDENCE-*.json` at the top are reserved
   for repair output; not children.
5. Discovery is non-recursive at the spawn root: nested
   `child/child/TASK.md` is **not** a grandchild. (Grandchildren
   are spawned by their own parent at runtime, the same way they
   are today. Discovery looks one level deep only.)

The shape of `spawn/` is what the AI sees as its world; the
framework imposes that shape but never names it in the AI's prompt
preamble — the cwd *is* the spawn root. The AI only needs to know
"create files relative to where my body is running."

### Repair: sibling EVIDENCE.json, edit the file

When `converge apply` (internal) finds a problem with a compiled
row, the framework writes `EVIDENCE.json` **next to** the source
file the AI created:

```
spawn/
  hero-spec/
    TASK.md           ← what the AI wrote
    EVIDENCE.json     ← why it failed
  hero-generate/
    TASK.md           ← ok, no sibling EVIDENCE.json
```

`EVIDENCE.json` schema:

```ts
type SpawnFileEvidence = {
  ok: false;
  errorCode:
    | "malformed-frontmatter"
    | "duplicate-id"
    | "unsafe-id"
    | "missing-required-field"   // outputs or checks missing
    | "id-mismatch"              // dir/file name disagrees with id:
    | "internal";
  error: string;        // human-readable
  hint?: string;        // optional fix suggestion
};
```

The post-body check the parent declares is the same shape used
today:

```yaml
checks:
  - id: children-clean
    cmd: ! find spawn -name 'EVIDENCE*.json' | grep -q .
```

The repair loop is unchanged in mechanics — `converge`'s built-in
fail-fix-pass cycle — but the **primitive being repaired is a
file**, not a JSONL line. The AI's natural primitive.

### Idempotency

The framework hashes each compiled child row. Re-runs with
identical files are no-ops. Files whose content changed produce a
duplicate-id error unless the AI also deleted the prior journal
entry — the same RFC 0021 contract, simply addressed by file
identity.

To force re-spawn of one child:

```bash
rm -rf spawn/hero-spec/   # body deletes its own prior output
# … re-write the file with new content
```

The body fully owns its cwd. The framework treats the body as the
source of truth on what to spawn this attempt.

### Where does the JSONL manifest go?

RFC 0021's `spawn.plan.jsonl` becomes the framework's **internal
IR**, regenerated each apply from the discovered files. It still
exists on disk at `$CONVERGE_TASK_DIR/spawn.plan.jsonl` for
debugging — anyone running `converge inspect` can see exactly
what was compiled — but the AI never opens it, never edits it,
and it is never referenced in the planning skill's authoring
guidance.

The CLI verb `converge apply` survives as an internal verb. It
is no longer documented in the planning skill except as
"framework internals." `converge spawn` (RFC 0002 era) is fully
deprecated for AI authoring.

## Code-level design

### 1. Executor cwd

`packages/core/src/executor/seed-executor.ts`: when the task's
`mode` is `spawner` or `converger`, set the body's `cwd` to
`<taskDir>/spawn/` and ensure the directory exists and is empty
before each attempt (preserve `EVIDENCE.json` from prior attempts
only when the converge prompt is the next runner — i.e. repair
loops keep evidence visible).

Static tasks and leaf tasks: no cwd change.

### 2. Discovery pass

`packages/core/src/task/spawn/discover.ts` (new):

```ts
export type DiscoveredChild = {
  id: string;
  taskMdPath: string;       // absolute
  frontmatter: TaskFrontmatter;
  body: string;
};

export function discoverChildren(spawnRoot: string): {
  children: DiscoveredChild[];
  evidence: SpawnFileEvidence[]; // per-file parse failures
};
```

Walks the spawn root one level deep, applies the layout rules
above, parses each TASK.md with the existing TASK.md parser
(`packages/core/src/task/markdown.ts`), collects per-file errors
without throwing.

### 3. Compile to manifest

`packages/core/src/task/spawn/compile.ts` (new):

```ts
export function compileChildrenToManifest(
  children: DiscoveredChild[],
  parentCtx: ParentContext,
): { rows: SpawnRow[]; rejections: SpawnFileEvidence[] };
```

Each `DiscoveredChild` becomes one `SpawnRow` per RFC 0021's
schema. The row's `taskMdContent` is the file the AI wrote
verbatim; the framework does **not** template-render it (the
body already did whatever interpolation it wanted via heredoc /
sed / envsubst — that's its prerogative).

Per-row rejections (duplicate id within the spawn batch,
unsafe-id, id-mismatch) become `SpawnFileEvidence` entries that
end up alongside the offending file.

### 4. Apply hook

The post-body apply step (already wired in RFC 0021 for `mode:
spawner` / `converger` with `apply: auto`):

```ts
const { children, evidence: parseEvidence } = discoverChildren(spawnRoot);
const { rows, rejections } = compileChildrenToManifest(children, ctx);
const evidenceAll = [...parseEvidence, ...rejections];
writeFileEvidence(spawnRoot, evidenceAll); // next-to-the-file write
if (rows.length > 0) {
  await applyManifest({ rows, workspace });
}
return { applied: rows.length, rejected: evidenceAll.length };
```

The framework keeps a debug-only dump of the compiled manifest at
`$CONVERGE_TASK_DIR/spawn.plan.jsonl` for `converge inspect`,
plainly labelled "compiled from spawn/".

### 5. Result/evidence shape

`writeFileEvidence` places each error as a `EVIDENCE.json` sibling
to the source file. If the source file failed to parse at all,
the evidence lands at `spawn/EVIDENCE-<sanitised-name>.json` so
it isn't orphaned.

### 6. Planning skill update

`skills/converge-planning/SKILL.md`:

- Replace §3.7 / §10 spawn-manifest references with the
  file-based authoring contract.
- Add one worked example: a 3-children spawner whose body is a
  triple-heredoc. ~20 lines.
- Remove all mentions of `$CONVERGE_TASK_DIR`,
  `spawn.plan.jsonl`, `converge apply` from the AI authoring
  surface. Move those to a new "Framework internals (for debug)"
  section the AI is told not to use.
- Demote the "template" concept to "a TASK.md you copy."

### 7. CLI helper (optional, low priority)

`converge render --from <file> --to <file> [--set k=v]…` — a
substitution helper that does not touch the ledger. Pure file
operation. Ship after the core change.

### 8. What stays

- RFC 0021's `applyManifest`, `SpawnRow`, `SpawnResult`,
  `errorCode` taxonomy — internal IR.
- `mode: spawner` / `mode: converger` task-mode contract (RFC 0022).
- Static-task discovery, `tasks.jsonl`, all journal layout outside
  the new `spawn/` directory.

## Migration

**Phase 1 (this RFC):**

- Land the executor cwd change, the discovery pass, the
  compile-to-manifest step.
- Keep `$CONVERGE_TASK_DIR/spawn.plan.jsonl` authoring as a
  **fully supported alternative path**: if a body chooses to
  write the manifest directly, the framework still picks it up
  (existing RFC 0021 code path). Discovery runs first; manifest
  authoring is the explicit-opt-in escape hatch.
- Migrate one example end-to-end: `examples/app-builder/.../002-generate-per-asset/TASK.md`.
  Use it as the regression target.
- Update the planning skill.

**Phase 2:**

- Sweep remaining example spawners onto the file-based shape.
- Add `converge render` if usage patterns demand it.

**Phase 3:**

- Deprecate (not remove) AI authoring of `spawn.plan.jsonl`. The
  manifest stays as internal IR forever; AI-authored manifests
  emit a warning pointing at this RFC.

No existing playbook breaks at any phase.

## Test plan

New tests under `packages/core/src/task/spawn/__tests__/`:

1. **Single child via directory form** — body creates
   `hero/TASK.md`; framework discovers, applies, ledger has one
   new row. Exit 0.
2. **Single child via flat form** — body creates `hero.task.md`;
   discovered with id `hero`. Exit 0.
3. **Mixed shapes** — body creates 5 children: 3 dir-form, 2
   flat-form. All discovered, ledger has 5 rows.
4. **Per-file parse error** — one child's TASK.md has malformed
   YAML; framework writes `EVIDENCE.json` next to it; other
   children apply cleanly; post-body check finds the evidence
   and the parent's check fails.
5. **Repair loop** — same as test 4, then convergence prompt
   edits the broken file, re-runs body (which is a no-op for the
   ok children because the files are unchanged), apply re-runs,
   ledger now has all rows, evidence gone.
6. **Id mismatch** — `hero/TASK.md` has `id: villain` in
   frontmatter; framework writes EVIDENCE with `errorCode:
   id-mismatch`. The AI fix is to either rename the directory or
   change the frontmatter — both are file edits.
7. **Reserved-prefix skip** — body creates `_scratch/TASK.md`;
   not discovered as a child.
8. **Templates dir skip** — body creates `templates/asset.task.md`;
   not discovered. (`templates/` is a reserved staging dir.)
9. **Nested file not a grandchild** — body creates
   `hero/sub/TASK.md`; the nested file is ignored. (Only `hero/TASK.md`
   counts.)
10. **Idempotent re-run** — body re-runs with identical files;
    apply is a full no-op; no journal churn.
11. **Force re-spawn** — body deletes `hero/` then re-creates it
    with different content; ledger reflects the new content,
    previous row reset per RFC 0021's duplicate-id discipline.
12. **Coexistence with `spawn.plan.jsonl`** — body writes both
    a manifest *and* files. Discovery takes precedence; the
    manifest entries get a warning but apply if they don't
    conflict by id. (Documents the escape hatch.)
13. **Unicode + quoting regression** — child TASK.md frontmatter
    contains `title: "週次"`, body contains "it's a test \"value\"".
    Round-trips. (The bug class RFC 0002 was written to fix is
    now impossible because the AI never quotes anything for the
    framework — it writes file content directly.)

Integration test under `tests/test-ai-native-spawn/`:

- A 4-children spawner whose body uses pure heredoc authoring,
  one child with a malformed checks block, the repair loop
  fixing it, the parent converging. End-to-end without humans.

## Anti-goals

- **Not** removing the manifest as internal IR. It is the
  framework's natural ledger shape; we are removing it from the
  AI's authoring surface only.
- **Not** changing the TASK.md schema. `id`, `depends_on`,
  `outputs`, `checks`, `vars`, `tags`, `mode` keep their meaning.
- **Not** introducing a new "child schema." A child is just a
  TASK.md. Period.
- **Not** building a templating engine. `cp + sed` and `envsubst`
  already exist. `converge render` is sugar only.
- **Not** auto-deriving deps from filename ordering or anything
  surprising. Deps live in `depends_on:` like they do today.
- **Not** scanning anywhere except the spawn cwd. The framework
  does not walk the workspace looking for things that look like
  TASK.md.

## Open questions

1. **Spawn root naming.** `spawn/` is short and obvious; an
   alternative is `children/`. `spawn/` is more honest about the
   directory's role (it is the body's cwd, owned by the
   framework). Lean: `spawn/`.
2. **Body cwd vs explicit path.** Setting the body's cwd makes
   `cat > foo/TASK.md` work without any path the AI has to
   learn. The alternative — exporting `$CONVERGE_TASK_DIR` and
   requiring `cat > "$CONVERGE_TASK_DIR/spawn/foo/TASK.md"` —
   leaks the env var back into authoring. Lean: cwd.
3. **What if the body has side effects outside cwd?** Today
   spawner bodies sometimes write to `.stitch/` or other
   workspace areas. That continues to work; cwd is set but the
   process can still write absolute paths. The convention is
   "use cwd for spawn output; other paths for everything else."
4. **Frontmatter inheritance.** Today templates can declare
   `vars:` that the manifest fills in. Without the
   template+vars indirection, what happens when the AI wants 50
   children that share 95% of frontmatter? Answer: the AI uses
   a template file and `cp`. If we discover this is painful,
   consider an `extends:` frontmatter field in a follow-up RFC.
   Not in scope here.
5. **EVIDENCE.json location for parse failures.** If the file
   couldn't be parsed at all, where does evidence go? Tentative:
   sibling file `EVIDENCE-<filename>.json` at the spawn root.
6. **Interaction with RFC 0017 (successor contract).** A
   successor task generated by repair is also a child file; the
   discovery pass handles it identically. No special-case.

## Why now

- RFC 0021 landed the right *engine* — declarative apply with
  per-row evidence. What it didn't fix is the **authoring
  surface**: the AI still has to learn the manifest schema,
  the exec dir, and the apply lifecycle to write a competent
  spawner. The framework's internal IR doesn't have to be the
  AI's interface.
- The progressive-decomposition design doc
  (`docs/design/progressive-decomposition.md`) makes the same
  argument from the other end: "a TASK.md *is* the contract."
  This RFC is the spawning corollary: if a TASK.md is the
  contract, then **spawning is writing TASK.md files** — not
  authoring a different artifact that the framework then
  rewrites into TASK.md files.
- The planning skill's spawner guidance is the longest section
  in `skills/converge-planning/SKILL.md` and the one most
  frequently misapplied. Collapsing it to "write child TASK.md
  files in your cwd" cuts that section by ~70%.
- Every recent AI-authored spawner bug traces to manifest
  vocabulary: missing `$CONVERGE_TASK_DIR` prefix, wrong
  template path, `vars:` key mismatch, JSONL quoting. None of
  those failure modes exist in the file-based surface — the AI
  is writing the file the framework would have rendered
  anyway.

One change. Reduce the AI's framework vocabulary to zero.
Keep the engine.
