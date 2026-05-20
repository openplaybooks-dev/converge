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

**One concept. The best one. Spawner says *what* to spawn, never *how*.**

A spawner today must teach the AI four framework concepts —
`$CONVERGE_TASK_DIR`, `spawn.plan.jsonl`, `converge apply`, and the
template+`vars:` indirection — before it can break work down. None of
those are intrinsic to "decompose this work into N sub-tasks." They
are footprints of how the runtime ingests children.

This RFC collapses the AI-facing surface to exactly one primitive:
**write a child `TASK.md` file**. There is no second way to spawn. No
manifest authoring escape hatch, no template syntax, no var-injection
DSL, no env var the body has to expand. The spawner body computes
*which* children exist; the act of expressing each child is the same
file the AI already writes for every static task.

RFC 0021's JSONL manifest survives, but only as the framework's
**internal intermediate representation**. It is not a second authoring
path. The AI never writes one, never reads one, never repairs one.

## Principle: one concept, locked

The spawner's only job is to declare *what to spawn*. Every "how" — where
the file lands, how the framework ingests it, how failures surface, how
the ledger updates — is the framework's job, not the author's.

Concretely, this means:

- One file format for a child: `TASK.md`. Same format as every static
  task. No `.task.md` flat form, no manifest row, no template file
  type.
- One location: the spawner body's `cwd`. The framework sets it; the
  AI writes relative paths.
- One failure signal: an `EVIDENCE.json` sibling next to the broken
  `TASK.md`. The repair primitive is "edit that file."
- One mechanism for shared shape across N children: the body is code,
  so the body loops. The framework provides no templating, no `vars:`
  injection, no `extends:` field. If the AI wants 50 children sharing
  95% of their frontmatter, it writes a shell loop with a heredoc —
  the same way it would write any code. Templating is a programming
  problem, not a framework problem.

Anything that could become a second concept is rejected in this RFC.
The Anti-goals section lists the rejections explicitly.

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
3. After the body exits, scans the cwd for any `<id>/TASK.md`. For
   each one, reads its frontmatter as the contract and compiles it
   to one row of the RFC 0021 manifest internally.
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
| Homogeneous fan-out from data | Natural (template + vars) | Natural (loop + heredoc — body is code) |
| Mix of templated + custom children | Awkward (templates assume contract in `.template.md`) | Natural; the body emits whichever shape per child |
| Child contracts the planner invents | Awkward; needs ad-hoc template file first | Natural; the contract *is* the file |
| Per-child override of one field | Hard (must extend manifest schema) | Trivial; edit one line in the file |
| Repair after partial failure | Read 3 files, patch manifest line | Read 1 file's sibling `EVIDENCE.json`, edit the file |
| Re-running with one child changed | Idempotent via manifest hash | Idempotent via file hash |
| Cross-wave fan-in (converger) | New manifest each wave | Files accumulate; framework picks up the new ones |

The file-as-primitive surface dominates because it **subsumes**
the manifest's expressivity: anything you can express as a manifest
row, you can express as a TASK.md frontmatter. The reverse is not
true (a TASK.md can carry an entire instruction body; a manifest
row can carry only fields the schema declares). The manifest is
necessarily a subset of what a TASK.md can say. We're removing the
narrower surface from the AI's authoring path, not the engine's
internal path.

### Shared shape across N children is a programming problem

The framework does not template. There is no `template:` field, no
`vars:` injection, no `extends:`, no `converge render`. If the AI
wants 50 children that share 95% of their frontmatter, the body
loops over the data and writes 50 TASK.md files. The shared shape
is expressed by the program emitting the files — a heredoc inside
a `for` loop, a Node script with a string template, a Python script
with `f""`-strings. All of those are ordinary code the AI writes
fluently; none of them are framework concepts.

The runtime sees only the files. Whether they came from a heredoc,
a `cp`, an `envsubst`, or `jq -n` is invisible and irrelevant. This
is the lock: no second concept can leak in here because the
framework offers nothing to leak. If templating ergonomics ever
become painful enough to justify sugar, the answer is to write a
non-framework script the playbook author owns — not to add a knob.

### Layout

The body's cwd is:

```
.converge/journal/<playbook>/tasks/<spawner-id>/spawn/
```

(Sibling to `attempts/`, `logs/`, `exec/` — same neighbourhood the
framework already owns under `tasks/<id>/`.)

Exactly one shape is a child:

```
spawn/
  hero-spec/TASK.md         ← a child
  hero-generate/TASK.md     ← a child
  _scratch/                 ← ignored ("_"-prefix is "not a child")
```

Rules:

1. **A directory with a `TASK.md` inside ⇒ one child.** Directory
   name **is** the child id; the frontmatter's `id:` field must
   match or be omitted. This is the only child shape; there is no
   flat-file form, no manifest row, no second way.
2. Subdirectories whose name begins with `_` are skipped (scratch
   space for the body if it wants it).
3. Discovery is **non-recursive** at the spawn root. Nested
   `hero-spec/sub/TASK.md` is not a grandchild. Grandchildren are
   spawned by their own parent at runtime, the same way they are
   today.
4. There are no other reserved names. The framework writes its
   own evidence files using the `EVIDENCE.json` name inside the
   child directory (next to the broken `TASK.md`), so nothing at
   the spawn root needs reservation.

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

### The manifest is framework internals, not a second authoring path

RFC 0021's `spawn.plan.jsonl` is regenerated each apply from the
discovered files. It still exists on disk at
`$CONVERGE_TASK_DIR/spawn.plan.jsonl` for `converge inspect`
debugging — anyone tracing what was compiled can read it — but
**it is not a writable surface for the AI**.

A body that writes its own `spawn.plan.jsonl` is treated as a
malformed body: the framework ignores the file and emits a
`SPAWN_MANIFEST_AUTHORED_BY_BODY` warning pointing at this RFC.
This is deliberate. Two authoring paths invite drift, divergent
mental models, and the exact "which concept do I reach for now?"
question the principle exists to eliminate. There is one concept.
The manifest is not it.

`converge apply` survives as an internal-only verb. The planning
skill does not mention it. `converge spawn` (RFC 0002 era) is
removed from the AI authoring guidance entirely.

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

### 7. What stays

- RFC 0021's `applyManifest`, `SpawnRow`, `SpawnResult`,
  `errorCode` taxonomy — internal IR.
- `mode: spawner` / `mode: converger` task-mode contract (RFC 0022).
- Static-task discovery, `tasks.jsonl`, all journal layout outside
  the new `spawn/` directory.

## Migration

**Phase 1 (this RFC):**

- Land the executor cwd change, the discovery pass, the
  compile-to-manifest step.
- AI-authored `spawn.plan.jsonl` is **rejected from day one** with
  the `SPAWN_MANIFEST_AUTHORED_BY_BODY` warning, even before any
  example migrates. Old playbooks still in the tree don't break
  because they continue to be apply-driven through the engine —
  they just need to be on the new authoring shape before their
  next edit. There is no "support both" window; that is the
  principle.
- Migrate every existing spawner in `examples/` in the same
  release. `examples/app-builder/.../002-generate-per-asset/TASK.md`
  is the regression target; the rest follow the same pattern.
- Update the planning skill to teach only this one shape.

**Phase 2:**

- Remove the legacy `mode: spawner` + body-emits-JSONL code path
  from the runtime once no example uses it. The internal apply
  step remains; only the AI-authored manifest entry point goes
  away.

There is no "phase 3." Two phases, no parallel surfaces, no
indefinite deprecation window.

## Test plan

New tests under `packages/core/src/task/spawn/__tests__/`:

1. **Single child** — body creates `hero/TASK.md`; framework
   discovers, applies, ledger has one new row. Exit 0.
2. **Multiple heterogeneous children** — body creates 5 children
   with different `outputs` / `checks` shapes; all 5 discovered,
   ledger has 5 rows.
3. **Per-file parse error** — one child's TASK.md has malformed
   YAML; framework writes `EVIDENCE.json` next to it; other
   children apply cleanly; post-body check finds the evidence
   and the parent's check fails.
4. **Repair loop** — same as test 3, then convergence prompt
   edits the broken file, re-runs body (a no-op for ok children
   because the files are unchanged), apply re-runs, ledger now
   has all rows, evidence gone.
5. **Id mismatch** — `hero/TASK.md` has `id: villain` in
   frontmatter; framework writes `EVIDENCE.json` with
   `errorCode: id-mismatch`. The fix is a file edit either way
   (rename dir or change frontmatter).
6. **Reserved-prefix skip** — body creates `_scratch/TASK.md`;
   not discovered as a child.
7. **Nested file not a grandchild** — body creates
   `hero/sub/TASK.md`; the nested file is ignored.
8. **Idempotent re-run** — body re-runs with identical files;
   apply is a full no-op; no journal churn.
9. **Force re-spawn** — body deletes `hero/` then re-creates it
   with different content; ledger reflects the new content per
   RFC 0021's duplicate-id discipline.
10. **Manifest-authored bodies rejected** — body writes
    `$CONVERGE_TASK_DIR/spawn.plan.jsonl` directly; framework
    ignores the file and emits
    `SPAWN_MANIFEST_AUTHORED_BY_BODY`. The post-body check sees
    zero discovered children and fails the parent. (Enforces the
    "one concept" principle.)
11. **Unicode + quoting regression** — child TASK.md frontmatter
    contains `title: "週次"`, body contains `"it's a test \"value\""`.
    Round-trips. The bug class RFC 0002 was written to fix is
    impossible: the AI never quotes anything for the framework —
    it writes file content directly.
12. **Shared shape via loop** — body uses a `for`-loop with a
    heredoc to write 20 children that share frontmatter shape
    differing only by `id` and `outputs`. All 20 apply cleanly.
    (Verifies the "templating is just programming" claim.)

Integration test under `tests/test-ai-native-spawn/`:

- A 4-children spawner whose body uses pure heredoc authoring,
  one child with a malformed checks block, the repair loop
  fixing it, the parent converging. End-to-end without humans.

## Anti-goals

These are all things that, if added, would introduce a second
concept. Each is explicitly out of scope so future PRs have a
fixed point to push back against.

- **No second authoring surface.** The framework does not accept
  body-authored manifests, JSONL files, YAML files, or any other
  spawn-input shape. A child is a TASK.md in a directory. Period.
- **No flat-file child form.** `hero.task.md` is not a child.
  Only `hero/TASK.md` is. One shape.
- **No templating engine, no `template:` field, no `vars:`
  injection, no `extends:`.** Shared shape across N children is
  achieved by writing code that emits N files. The framework
  provides nothing here.
- **No CLI rendering helper (`converge render` or similar).**
  Sugar is a second concept by another name. If the body needs
  substitution, it uses ordinary shell or scripting.
- **No env var the AI must learn.** `$CONVERGE_TASK_DIR` still
  exists for framework-internal callers and `converge inspect`,
  but the AI authoring guidance does not name it. The body uses
  cwd-relative paths only.
- **No auto-derived deps** from filename ordering, lexical order,
  or anything else surprising. `depends_on:` is the only way
  deps are expressed; same as static tasks.
- **No workspace-wide scanning.** Discovery is `spawn/` (the
  body's cwd), one level deep. The framework does not look
  anywhere else for things that look like TASK.md.
- **No change to TASK.md schema.** `id`, `depends_on`, `outputs`,
  `checks`, `vars`, `tags`, `mode` keep their meaning. Children
  use the same schema as static tasks because they are the same
  primitive.
- **No removal of the internal manifest.** RFC 0021's IR survives
  unchanged inside the framework. We are removing only the AI's
  exposure to it.

## Open questions

The "one concept" principle settles most prior open questions by
construction. Remaining items:

1. **Side effects outside cwd.** Spawner bodies today sometimes
   write to `.stitch/` or workspace areas alongside spawning.
   That continues to work — cwd is set, but absolute paths still
   resolve. Convention: "spawn output goes in cwd; everything
   else uses its own path." Not a framework constraint; just a
   readability nudge in the planning skill.
2. **Interaction with RFC 0017 (successor contract).** A
   successor generated by repair is just another child TASK.md
   file. The discovery pass handles it identically. No
   special-case logic.
3. **`mode: converger` cross-wave semantics.** Each wave's body
   runs in the same `spawn/` cwd or a wave-scoped subdir? Lean:
   same cwd, with the file-hash idempotency from RFC 0021
   ensuring re-emitted identical files are no-ops. A wave that
   wants to retract a prior child deletes its directory; the
   framework treats the absence as "this child is no longer
   declared" and surfaces it for the converger's halt logic.
   Final shape to be confirmed during Phase 1.

Settled by the principle (not open):

- *Spawn root name* — `spawn/`. There is one name.
- *Child file form* — `<id>/TASK.md`. There is one shape.
- *Authoring path* — write the file. There is one path.
- *Templating* — none in the framework. The body is code.

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

One change. One concept. Reduce the AI's framework vocabulary to
zero. Keep the engine.

The spawner answers *what to spawn*. The framework owns *how*.
