---
rfc: 0024
title: AI-native spawning — invoke templates, don't author tasks
status: draft
type: feat
source: human
priority_tier: tier1
estimate: "5–7 days"
backwards_compatible: yes
risk: medium
supersedes_surface_of: 0021
---
# RFC 0024: AI-native spawning — invoke templates, don't author tasks

## TL;DR

**One concept. The best one. Spawner says *what* to spawn — never *how*,
and never *the contract*.**

A spawner today must teach the AI four framework concepts —
`$CONVERGE_TASK_DIR`, `spawn.plan.jsonl`, `converge apply`, and the
template+`vars:` indirection — plus the entire TASK.md schema
(`outputs`, `checks`, `depends_on`, `vars`, `tags`, `mode`, …) before
it can break work down. None of those are intrinsic to "decompose this
work into N sub-tasks." They are footprints of how the runtime ingests
children, and they are unbounded surface for authoring contracts.

This RFC collapses the AI-facing surface to exactly one primitive: the
spawner writes a small **invocation file** that names which template to
spawn, what it depends on, and what parameters to pass. Three fields.
Nothing else.

The template author (a human, or an earlier planner pass) owns the
contract — `outputs`, `checks`, instruction body, retry policy. The
spawner consumes contracts; it does not author them. The framework
owns ingestion, validation, ledger, and repair. The spawner answers
*which template, with what params, in what order*. That is the whole
spawner surface.

RFC 0021's JSONL manifest survives, but only as the framework's
**internal IR**. It is not a writable surface for the AI.

## Principle: one concept, locked

The spawner's only job is to declare *what to spawn* in template
terms. Concretely:

- **One file**: `spawn/<id>/spawn.yml`. Three fields.
- **One ingestion path**: the framework discovers `spawn.yml`,
  resolves the named template, expands it with params, validates
  the result against the template's declared param contract,
  upserts into the ledger.
- **One failure signal**: an `EVIDENCE.json` next to the offending
  `spawn.yml`. The repair primitive is "edit `spawn.yml`."
- **One shape for shared children**: invoke the same template N
  times with different params. Shared shape is a template, not a
  loop-and-emit construction.

What the AI never sees:

- TASK.md frontmatter syntax. Authoring `outputs:` / `checks:` /
  `depends_on:` in a child contract is out of scope. Those live in
  the template, owned by the template author.
- JSONL manifests. The framework's internal IR is not on the
  spawner's path.
- Env vars. `$CONVERGE_TASK_DIR` is internal; the body uses cwd
  paths.
- The apply lifecycle. The framework runs it; the body never
  invokes `converge apply`.

Anything that could become a second authoring surface is rejected.
The Anti-goals section lists the rejections.

## Problem

What the AI must currently learn to write a competent spawner body
(`examples/app-builder/.../002-generate-per-asset/TASK.md:29-53`,
`skills/converge-planning/SKILL.md:82-97`, RFC 0021):

| Surface | The AI must learn |
|---|---|
| Exec dir | `$CONVERGE_TASK_DIR` is the per-task scratch |
| Manifest format | One JSON object per line; fields `id`/`template`/`vars`/`after`/`no_inherit`; strict-mode rejects unknown fields |
| Apply lifecycle | Framework runs `converge apply` after the body when `mode: spawner`; result lands in `spawn.plan.result.jsonl` |
| Template path resolution | `template: "<name>"` resolves under `templates/`; paths vs. names differ |
| Var-passing schema | `vars` is a typed map; strict-mode templates reject unknown keys, require declared ones |
| TASK.md schema | If a child is "custom," the AI must hand-author `id`, `depends_on`, `outputs`, `checks`, `vars`, `tags`, `mode`, instruction body |
| Result protocol | Repair reads `spawn.plan.result.jsonl`, finds `"ok": false` rows, patches `spawn.plan.jsonl`, framework re-applies |

Three sources of bugs, all observed in real playbooks:

1. **Manifest vocabulary errors.** The AI forgets the exec-dir prefix,
   picks `--var k=v` shell syntax when it should write JSONL, picks
   the wrong template name, mis-types a `vars:` key. These are
   framework-specific failures the AI doesn't notice until apply
   fails.
2. **Contract-authoring errors.** When the AI hand-writes a child
   contract — `outputs:`, `checks:`, the instruction body — it
   omits required fields, writes non-deterministic checks, declares
   `outputs:` paths that don't match what the child will actually
   produce. The AI is a fluent writer of *prose*, not a fluent
   writer of *contracts*. Contracts need to be authored once, by
   someone (a planner pass, a human) with the time to validate
   them, then re-used.
3. **Repair stalls.** Failure surfaces across three files (manifest,
   result, EVIDENCE) and a structured error taxonomy. The minimum
   patch is one field; the context required to find it is much
   larger.

The fundamental mismatch: **the AI is asked to be both planner
(decide what to spawn) and contract author (write the TASK.md). Those
are different skills.** Planning is fluent; contract authoring is
error-prone. We want to separate them: the spawner plans, the
template captures the contract. The AI does only the first.

## Proposal

A spawner body has exactly one job: **for each child, write a
`spawn/<id>/spawn.yml` invocation file naming a template, its
dependencies, and its params.**

The framework:

1. Sets the spawner body's `cwd` to a fresh, empty directory the
   framework owns (`<taskDir>/spawn/`).
2. Runs the body. The body produces `<id>/spawn.yml` files by
   whatever means — heredoc, `cp`, `jq -n`, Node script. The
   framework does not care **how** the files appeared, only that
   they did.
3. After the body exits, discovers every `<id>/spawn.yml` under
   the cwd. For each, resolves the named template, validates the
   provided params against the template's declared param contract,
   expands the template into a concrete TASK.md, and compiles it
   to one row of RFC 0021's internal manifest.
4. Runs apply on the compiled manifest. Per-file failures (missing
   template, missing required param, type mismatch, duplicate id)
   land as `EVIDENCE.json` next to the offending `spawn.yml`.
   Repair = edit `spawn.yml`.

What the AI sees:

```
parent TASK.md (mode: spawner)
└─ body:
     write invocation files in cwd:
       hero-spec/spawn.yml
       hero-generate/spawn.yml
       hero-wire/spawn.yml
       villain-spec/spawn.yml
       …
```

That's the entire AI-facing protocol. No env var. No JSONL. No
TASK.md frontmatter. No `outputs:`, no `checks:`, no `vars:` schema.
No template path resolution. Three fields per child.

### The spawn.yml schema

```yaml
template: <template-name>     # required — name only, no path
depends_on:                   # optional — sibling spawn ids
  - <other-id>
params:                       # required if template declares params
  <key>: <value>
  …
```

That is the entire schema. There is no `id` field (the directory
name *is* the id). There is no `outputs:` (the template owns
outputs). There is no `checks:` (the template owns checks). There is
no instruction body (the template owns the body). There is no
`vars:` (params is the var-equivalent; named to match template
authoring vocabulary, not to distinguish from `vars:` in TASK.md).

Three fields. The AI's whole spawn vocabulary.

### Templates are the contract source of truth

Templates live at a conventional location, discoverable by `ls`:

```
.converge/playbooks/<playbook>/templates/
  asset-spec/
    TASK.md          ← the template (a TASK.md with {{param}} placeholders)
    PARAMS.yml       ← optional: declared params + types
    EXAMPLES.yml     ← optional: canonical invocations + selection guidance
  asset-generate/
    TASK.md
    PARAMS.yml
    EXAMPLES.yml
  asset-wire/
    TASK.md
```

`EXAMPLES.yml` is described in the **Transparency layer** section
below — it's the surface the AI reads to pick the right template
by pattern-matching against canonical examples, rather than
reading PARAMS.yml as a schema.

A template's `TASK.md` is an ordinary TASK.md with `{{paramName}}`
interpolation in the frontmatter and body. A template's `PARAMS.yml`
declares which params it accepts, their types, and whether they are
required — exactly the data the framework needs to validate
invocations.

```yaml
# asset-spec/PARAMS.yml
params:
  assetId:        { type: string, required: true }
  assetName:      { type: string, required: true }
  outputPath:     { type: string, required: true }
  width:          { type: number, default: 1600 }
  height:         { type: number, default: 900 }
```

If `PARAMS.yml` is absent, the framework infers params by scanning
the template for `{{...}}` references and treating each as required.
The AI never edits `PARAMS.yml` while spawning — only when authoring
templates, which is out of scope for this RFC.

The planning skill teaches the AI a four-step loop (detailed in
the Transparency layer below):

1. **Discover** — `ls templates/`; read `EXAMPLES.yml` for
   candidates; pick by closest example, not by schema.
2. **Write** — `spawn/<id>/spawn.yml` with three fields, params
   copied from the chosen example and edited for the actual data.
3. **Read** — `spawn/STATUS.md` after the body runs.
4. **Repair** — for each `- [ ]` row, apply the `fix:` block
   verbatim or use it as a starting point.

If a needed template doesn't exist, the AI surfaces that as an
unresolved decomposition (see "When reasoning-driven needs a shape
no template covers" below), not as a license to invent a contract
on the fly.

### Three spawn patterns, one primitive

A spawn surface earns its keep by covering the three modes the AI
actually uses: **reasoning-driven** (small N, AI picks templates by
semantic fit), **data-driven** (large N, one template per row in a
source), and **nested** (templates that are themselves spawners,
recursing arbitrarily deep). The same three-field `spawn.yml`
covers all three; only the bash around it changes.

#### Pattern 1: Reasoning-driven (small N, heterogeneous)

The AI reasons about what the work needs and picks templates
accordingly. Typical for top-of-tree decomposition where the
planner is thinking semantically, not iterating over data.

```bash
# Body for "implement-user-auth": four heterogeneous children
mkdir -p design schema endpoints tests

cat > design/spawn.yml <<'EOF'
template: design-doc
params:
  topic: user auth (JWT, refresh tokens)
  outputPath: docs/auth.md
EOF

cat > schema/spawn.yml <<'EOF'
template: migration
depends_on: [design]
params:
  name: add_users_table
  outputPath: db/migrations/0042_users.sql
EOF

cat > endpoints/spawn.yml <<'EOF'
template: api-endpoint-set
depends_on: [schema]
params:
  routes: [POST /login, POST /refresh, POST /logout]
  outputPath: src/auth/routes.ts
EOF

cat > tests/spawn.yml <<'EOF'
template: api-tests
depends_on: [endpoints]
params:
  routesPath: src/auth/routes.ts
  outputPath: tests/auth.spec.ts
EOF
```

Four heredocs, no loop, no data source. The AI's reasoning *is*
the choice of templates and the dependency order. Templates own
the contract; the AI never writes `outputs:` or `checks:`.

#### Pattern 2: Data-driven (large N, homogeneous from a source)

Hundreds of tasks from a manifest, catalogue, schema, or any
other data file. One template invoked per row.

```bash
# Body for "generate-per-asset": 200 assets in manifest → 600 children
MANIFEST=".stitch/assets/manifest.json"

jq -c '.[]' "$MANIFEST" | while read -r A; do
  AID=$(echo "$A" | jq -r '.id')
  NAME=$(echo "$A" | jq -r '.name')
  OUT=$(echo "$A" | jq -r '.output')

  mkdir -p "$AID-spec" "$AID-generate" "$AID-wire"

  cat > "$AID-spec/spawn.yml" <<EOF
template: asset-spec
params:
  assetId: $AID
  assetName: "$NAME"
  outputPath: $OUT
EOF

  cat > "$AID-generate/spawn.yml" <<EOF
template: asset-generate
depends_on: [$AID-spec]
params:
  assetId: $AID
  outputPath: $OUT
EOF

  cat > "$AID-wire/spawn.yml" <<EOF
template: asset-wire
depends_on: [$AID-generate]
params:
  assetId: $AID
  outputPath: $OUT
EOF
done
```

600 invocation files for 200 assets. The framework's discovery
scan is `O(file count)` and trivially fast at this scale (file
I/O for a few hundred 100-byte YAML files is sub-second on any
filesystem).

**Why this scales better than a batch manifest.** When child
#137 fails, the AI's repair primitive is editing *one* file
(`asset-137-generate/spawn.yml`) — not locating and patching a
row inside a 600-row JSONL that has to be re-applied wholesale.
The filesystem gives per-child idempotency (file hash),
per-child evidence (sibling `EVIDENCE.json`), and per-child
addressing for free. A batch shape would have to re-implement
all three.

#### Pattern 3: Nested (template invokes a spawner template)

A template can itself be `mode: spawner`. When invoked, the
expanded TASK.md runs its own body and writes its own
`spawn.yml` files in its own `spawn/` cwd. Depth is unbounded.

```
templates/
  playbook-section/
    TASK.md          ← mode: spawner; body spawns subsections from outline
    PARAMS.yml
  subsection/
    TASK.md          ← leaf; renders one subsection
    PARAMS.yml
```

Root spawner invokes `playbook-section` once per top-level
section:

```bash
# Root body
for S in intro problem solution evaluation conclusion; do
  mkdir -p "$S"
  cat > "$S/spawn.yml" <<EOF
template: playbook-section
params:
  sectionId: $S
  outline: docs/outlines/$S.md
EOF
done
```

When the framework runs the expanded `intro/` task later, *that*
task's body (inherited from the `playbook-section` template) is
itself a spawner — it reads `docs/outlines/intro.md` and writes
its own `spawn.yml` files in its own `spawn/` cwd:

```bash
# Inside playbook-section template's body (interpolation at expand time)
jq -c '.subsections[]' < "{{outline}}" | while read -r SUB; do
  SID=$(echo "$SUB" | jq -r '.id')
  mkdir -p "$SID"
  cat > "$SID/spawn.yml" <<EOF
template: subsection
params:
  subsectionId: $SID
  topic: "$(echo "$SUB" | jq -r '.topic')"
EOF
done
```

**Nothing in the framework's logic is recursive.** Each spawner
task is independent: its own cwd, its own discovery pass, its own
`EVIDENCE.json`, its own idempotency hashes. The framework runs
the same expansion pipeline at each level. Recursion is achieved
because spawner-templates exist; the framework treats every level
identically.

Critically: **the AI at depth N writes the same thing as the AI
at depth 0** — a `spawn.yml` naming a template. The fact that
the named template is itself a spawner is invisible at the
calling level. That's an implementation detail of the template,
owned by whoever authored it. Progressive-decomposition (see
`docs/design/progressive-decomposition.md`) drops out as a free
property of the design, not a separate feature.

### When reasoning-driven needs a shape no template covers

Pattern 1 has an exit condition the other two don't: the AI may
reason its way to a child shape that no existing template
captures. The lock against body-authored TASK.md means the
spawner cannot invent a contract on the fly. Three legitimate
escapes, none of which reopen contract authoring inside the
spawner body:

1. **General-purpose templates.** Most playbooks ship a small
   set covering common shapes: `prose-task` (write a markdown
   file at a given path), `shell-task` (run a command, check
   exit code), `gather-task` (read inputs, summarise). These
   cover the long tail of one-off work via parameters.
2. **Template authoring as a separate step.** A new template is
   a TASK.md + a PARAMS.yml under `templates/<name>/`.
   Authoring one costs the same as hand-writing a single bespoke
   child contract — but the artefact is reusable, reviewable,
   and authored deliberately, not under spawner-body time
   pressure. The convergence loop's planner can be asked to
   author the missing template before re-running the spawner.
3. **Surface the gap as evidence.** A spawner that needs a
   template that doesn't exist writes `spawn/<id>/spawn.yml`
   with `template: __missing__` (or omits `template:` entirely);
   the framework produces `EVIDENCE.json` with
   `errorCode: template-not-found` plus a hint describing the
   needed shape (collected from a `note:` field in the
   invocation). The parent's repair loop routes the gap to the
   template-authoring flow, not back into bespoke contract
   authoring.

The lock is deliberate. The first time the AI is allowed to
"just write a TASK.md when no template fits" is the day every
spawner takes that path — it's faster than discovering, and
then discussing, templates. That regresses to the
contract-authoring failure mode this RFC was written to
eliminate.

### Why this is the right surface

Mapped against what the AI does well versus poorly:

| Skill | AI strength | This RFC's surface |
|---|---|---|
| Reasoning about what work is needed | Strong | Choice of template + dependency order |
| Iterating over data to drive fan-out | Strong | A bash loop emitting `spawn.yml` per row |
| Composing structured invocations | Strong (3 fields of YAML) | `spawn.yml` |
| Authoring a contract from scratch | Weak (bad checks, mismatched outputs) | **Not on the AI's path** — template owns it |
| Composing JSONL with quoting | Weak (RFC 0002 bug class) | **Not on the AI's path** — framework owns it |
| Sequencing apply lifecycle | Weak (wrong exec dir, missing prefix) | **Not on the AI's path** — framework owns it |

Everything left on the AI's path is something it does well.
Everything it does poorly is moved to the framework or the
template author. The three patterns above demonstrate the same
surface covers wildly different scale and shape.

### Layout

The body's cwd:

```
.converge/journal/<playbook>/tasks/<spawner-id>/spawn/
```

Sibling to `attempts/`, `logs/` — same neighbourhood under
`tasks/<id>/`.

Exactly one shape is a child:

```
spawn/
  hero-spec/spawn.yml         ← a child
  hero-generate/spawn.yml     ← a child
  _scratch/                   ← ignored (`_`-prefix is "not a child")
```

Rules:

1. **A directory containing `spawn.yml` ⇒ one child.** Directory
   name **is** the child id. This is the only child shape.
2. Subdirectories whose name begins with `_` are skipped (scratch
   for the body if it wants it).
3. Discovery is **non-recursive** at the spawn root.
4. Files other than `spawn.yml` and `EVIDENCE.json` inside a child
   directory are ignored by discovery (the body may use them as
   working scratch).

The AI only needs to know "create `<id>/spawn.yml` files relative
to where my body is running."

## Transparency layer — borrowed from systems that already solved this

The tension: the AI needs to *see what happened* to self-correct,
but seeing more must not expand what it has to *write*. Resolution:
keep the authoring surface narrow (`spawn.yml`, three fields), and
add a *separate*, AI-readable transparency surface that mirrors
patterns proven elsewhere — patterns the model was already trained
on. Nothing in this section is novel; every piece is a deliberate
borrow.

### From Claude's own tool-call discipline: spawning *is* a bulk tool call

Every Claude tool call is a structured round-trip — `tool_use`
(name + input) ⇄ `tool_result` (content, is_error) — and the
model self-corrects on errors by re-emitting a fixed `tool_use`.
That round-trip is **already in the AI's training distribution**.
Spawning maps onto it 1:1:

| Tool-call shape | Spawn equivalent |
|---|---|
| `tool_use.name` | `template:` |
| `tool_use.input` | `params:` |
| `tool_result.content` (ok) | the expanded TASK.md in the child dir |
| `tool_result.is_error` | child's row in `STATUS.md` marked `[ ]` |
| `tool_result.content` (error) | inline reason + suggested fix in `STATUS.md` |

The AI is repairing failing tool calls in every conversation. Bulk
spawning is the same loop at scale — no new self-correction
pattern to learn, just the one the model was trained on.

### From Terraform: preview before apply

Terraform's `plan`/`apply` split makes errors caught during plan
cheap and errors caught after apply expensive. Adopt the split:

- The framework runs **preview** automatically after the body
  exits and *before* any ledger mutation.
- Preview resolves every `spawn.yml`, validates params against
  the template, checks `depends_on` closure, renders the expanded
  TASK.md — but writes nothing to `tasks.jsonl`.
- Only if preview is clean does **apply** run.
- If preview fails, no journal mutation, no half-applied state.
  The AI repairs against `STATUS.md`; repair cycles are free
  because nothing was committed.

This collapses two of today's failure modes — "manifest applied
but one child was bad" and "had to roll back partial work" — into
a single pre-apply gate.

### From markdown task lists: `STATUS.md` is the single self-correction surface

GitHub-flavored markdown's `- [x]` / `- [ ]` is a convention the
model reads and writes fluently from training. After each
preview/apply, the framework writes `spawn/STATUS.md`:

```
# spawn — 2026-05-20T14:32:01Z — preview FAILED (2 of 4)

- [x] hero-spec        → ok (asset-spec)
- [x] hero-generate    → ok (asset-generate)
- [ ] hero-wire        → ✗ missing-required-param
      template: asset-wire declares `outputPath` as required.
      file: hero-wire/spawn.yml
      fix:  add under `params:`
              outputPath: src/assets/hero.ts
- [ ] villain-generate → ✗ template-not-found
      file: villain-generate/spawn.yml
      did you mean: `asset-generate` (typo: `asset-genrate`)?
      fix:  change `template: asset-genrate` → `template: asset-generate`
```

One file, plain text. The AI reads it like a TODO list, finds the
`[ ]` rows, opens the named `spawn.yml`, applies the suggested fix
(or composes its own). `STATUS.md` is the **only** artefact the AI
consults to know what to repair. It subsumes per-child JSON
evidence on the AI's path.

`EVIDENCE.json` files still exist as machine-readable detail for
`converge inspect` and the framework's internal repair plumbing —
they are not on the AI's path.

The post-body check becomes a single grep:

```yaml
checks:
  - id: spawn-clean
    cmd: ! grep -q '^- \[ \]' "$CONVERGE_TASK_DIR/spawn/STATUS.md"
```

(The exec-dir reference is in the *check*, not the AI's body. The
AI authoring the spawner never sees this line — it ships with the
spawner task mode.)

### From Storybook & dbt: examples next to templates

Storybook colocates "stories" — canonical examples of a component
in each state — with the component. dbt colocates tests with
models. Templates ship `EXAMPLES.yml`:

```
templates/asset-spec/
  TASK.md          ← the contract (with {{param}} placeholders)
  PARAMS.yml       ← param declarations (types, required, defaults)
  EXAMPLES.yml     ← canonical invocations + selection guidance
```

```yaml
# asset-spec/EXAMPLES.yml
examples:
  - name: a hero asset
    when_to_pick: character-style art for a named entity
    params:
      assetId: hero-knight
      assetName: Hero Knight
      outputPath: public/heroes/hero-knight.png

  - name: a background (uses defaults for size)
    when_to_pick: full-bleed scene art
    params:
      assetId: forest-bg
      assetName: Forest Background
      outputPath: public/bg/forest.png

not_for:
  - rasterising icons → pick `icon-spec` instead
  - per-frame animation → pick `sprite-frame-spec` instead
```

Pattern matching beats schema reading. The AI scans
`EXAMPLES.yml`, picks the closest example, customises params.
`when_to_pick` and `not_for` are borrowed from chain-of-thought's
"when not to use" reasoning — explicit guidance that biases
template *selection*, not just *invocation*.

### From LSP & compilers: suggestions, not just errors

Language Server Protocol diagnostics include a `quickFix` payload —
the corrected code the editor can apply in one keystroke. Every
`STATUS.md` failure row is a quick-fix in markdown:

- The file to edit (full path from spawn root).
- The exact line or block to change.
- The corrected content, formatted as the AI would write it.

A capable model applies the fix verbatim; a careful one uses it
as a starting point. Either is faster than reasoning from a bare
error code, which is exactly the bet IDEs made twenty years ago.

### What this changes about the AI's instructions

The planning skill's spawn section reduces to a single page:

1. **Discover templates.** `ls templates/`. For each candidate, read
   `EXAMPLES.yml`. Pick the closest example.
2. **Write `spawn/<id>/spawn.yml`.** Three fields. Copy the example
   `params:` shape; substitute your values.
3. **Read `STATUS.md` after the body runs.** Anything still
   `- [ ]` has a `fix:` block telling you which file to edit and
   what to put there.
4. **Repeat until `STATUS.md` is all `- [x]`.**

No `outputs:`, no `checks:`, no `vars:`, no `apply`, no exec dir,
no JSONL. The whole instruction set fits in the four bullets
above. Quality of the spawn — picking the right template, supplying
correct params, ordering deps — is what's left for the AI to focus
on. That is the only quality lever the spawner controls; the rest
is framework or template-author territory.

### Idempotency

The framework hashes each child's `spawn.yml` content. Re-runs with
identical invocation files are full no-ops. A `spawn.yml` whose
content changed (different params, different template) produces a
duplicate-id error unless the prior child was removed first — same
RFC 0021 contract, addressed by file identity.

To force re-spawn of one child:

```bash
rm -rf spawn/hero-spec/
# … re-write spawn.yml
```

### The manifest is framework internals, not a second authoring path

RFC 0021's `spawn.plan.jsonl` is regenerated each apply from the
discovered invocations. It still exists at
`$CONVERGE_TASK_DIR/spawn.plan.jsonl` for `converge inspect`, but
it is not a writable surface.

A body that writes its own `spawn.plan.jsonl` is treated as
malformed: the framework ignores the file and emits
`SPAWN_MANIFEST_AUTHORED_BY_BODY`. Two authoring paths invite drift
and "which concept now?" — explicitly rejected.

A body that writes a child's full `TASK.md` instead of `spawn.yml`
is also rejected with `SPAWN_TASKMD_AUTHORED_BY_BODY`. Authoring
contracts is the template author's role, not the spawner's. This
is the lock.

`converge apply` and `converge spawn` survive as internal-only
verbs. The planning skill does not mention them.

## Code-level design

### 1. Executor cwd

`packages/core/src/executor/seed-executor.ts`: when the task's
`mode` is `spawner` or `converger`, set the body's `cwd` to
`<taskDir>/spawn/`, ensure it exists. Preserve prior-attempt
`EVIDENCE.json` only when the repair prompt is the next runner.

### 2. Template registry

`packages/core/src/task/spawn/templates.ts` (new):

```ts
export type TemplateParam = {
  type: "string" | "number" | "boolean";
  required?: boolean;
  default?: string | number | boolean;
};

export type TemplateDef = {
  name: string;
  taskMdPath: string;       // absolute path to template TASK.md
  params: Record<string, TemplateParam>;
};

export function loadTemplates(playbookDir: string): TemplateDef[];
export function findTemplate(name: string, templates: TemplateDef[]): TemplateDef | undefined;
```

Loader reads `<playbook>/templates/*/`. For each subdir: reads
`PARAMS.yml` if present, otherwise infers params from `{{...}}`
references in the template TASK.md (all inferred params are
required, type `string`). Caches per playbook.

### 3. Invocation discovery + expansion

`packages/core/src/task/spawn/discover.ts` (new):

```ts
export type DiscoveredInvocation = {
  id: string;                            // dir name
  spawnYmlPath: string;                  // absolute
  invocation: {
    template: string;
    depends_on?: string[];
    params?: Record<string, unknown>;
  };
};

export function discoverInvocations(spawnRoot: string): {
  invocations: DiscoveredInvocation[];
  evidence: SpawnFileEvidence[];   // per-file YAML / shape errors
};
```

`packages/core/src/task/spawn/expand.ts` (new):

```ts
export function expandInvocation(
  inv: DiscoveredInvocation,
  templates: TemplateDef[],
): { row: SpawnRow } | { evidence: SpawnFileEvidence };
```

Resolves the template by name, validates params against the
template's declared contract, fills defaults, runs interpolation,
produces the RFC 0021 `SpawnRow` carrying the rendered TASK.md
content.

### 4. Preview-then-apply hook (Terraform-style split)

```ts
const templates = loadTemplates(playbookDir);
const { invocations, evidence: discoveryEvidence } = discoverInvocations(spawnRoot);
const evidence: SpawnFileEvidence[] = [...discoveryEvidence];
const rows: SpawnRow[] = [];

// --- preview: validate + expand, no journal writes ---
for (const inv of invocations) {
  const result = expandInvocation(inv, templates);
  if ("row" in result) {
    rows.push(result.row);
    writeExpandedTaskMd(inv.spawnYmlPath, result.row);  // EXPANDED.md sibling
  } else {
    evidence.push({ ...result.evidence, spawnYmlPath: inv.spawnYmlPath });
  }
}
detectStrayManifests(spawnRoot);  // SPAWN_MANIFEST_AUTHORED_BY_BODY
detectStrayTaskMd(spawnRoot);     // SPAWN_TASKMD_AUTHORED_BY_BODY

// AI-facing transparency artefact (the only thing the AI reads)
writeStatusMarkdown(spawnRoot, { invocations, rows, evidence, templates });

// Machine-readable detail (framework + `converge inspect` only)
writeFileEvidence(spawnRoot, evidence);

// --- apply: only if preview is clean ---
if (evidence.length === 0 && rows.length > 0) {
  await applyManifest({ rows, workspace });
  amendStatusMarkdownAfterApply(spawnRoot);
}

return { previewed: rows.length, rejected: evidence.length };
```

Two new helpers:

- **`writeStatusMarkdown`** renders the single STATUS.md view: one
  row per invocation, status (`ok` / error code), and a `fix:` block
  synthesised from the error type, offending file path, and the
  template's PARAMS.yml. "Did-you-mean" suggestions use
  Levenshtein matching against declared param/template names.
- **`writeExpandedTaskMd`** writes the rendered TASK.md to
  `<child>/EXPANDED.md` next to its `spawn.yml`. This is both the
  artefact the runner consumes *and* the side-by-side I/O view the
  AI can read to verify expansion (Jupyter-style adjacency).

Preview-vs-apply means no partial journal writes. If any child
fails preview, *nothing* mutates `tasks.jsonl`; the AI fixes
`STATUS.md`'s `[ ]` rows and re-runs the body. Repair cycles are
free of cleanup.

### 5. Interpolation engine

Mustache-style `{{paramName}}` only — no conditionals, no loops,
no helpers. Renderable by `String.prototype.replaceAll` over the
template TASK.md text. Undeclared `{{...}}` references in templates
are caught at template-load time (warning) and at expansion time
(error if a referenced param has no value).

### 6. Planning skill update

`skills/converge-planning/SKILL.md` shrinks to the four-step loop:

- **Discover → Write → Read → Repair.** Each step is one bullet,
  with one worked example per pattern (reasoning-driven,
  data-driven, nested).
- Spawner authoring instruction collapses from ~300 lines (current
  state) to roughly one page, because the AI's vocabulary is
  template names + params + `depends_on`. No `outputs:`, no
  `checks:`, no `vars:`, no exec-dir, no JSONL.
- Remove every mention of `$CONVERGE_TASK_DIR`, `spawn.plan.jsonl`,
  `converge apply`, TASK.md frontmatter authoring from the
  spawner authoring guidance. Move debug-only references to a
  "Framework internals (do not author)" appendix.
- Add a section on what to do when no template fits: surface the
  gap, do not invent a contract.

### 7. What stays

- RFC 0021's `applyManifest`, `SpawnRow`, `errorCode` taxonomy —
  internal IR, fed by the expansion step.
- `mode: spawner` / `mode: converger` task-mode contract (RFC 0022).
- Static-task discovery, `tasks.jsonl`, all journal layout outside
  the new `spawn/` directory.
- Existing template files under `examples/*/templates/` — they
  become first-class once they have a `PARAMS.yml` (or get
  params-inferred).

## Migration

**Phase 1 (this RFC):**

- Land the executor cwd change, template registry, invocation
  discovery + expansion, EVIDENCE writing.
- Author `PARAMS.yml` for every template currently used by
  `examples/`. Inferred-params mode covers the rest.
- Migrate every spawner in `examples/` in the same release.
  `examples/app-builder/.../002-generate-per-asset/TASK.md` is
  the regression target; the rest follow the same pattern.
- Body-authored `spawn.plan.jsonl` and body-authored
  `<id>/TASK.md` are **rejected from day one**. No "support both"
  window; the principle requires the lock.
- Update the planning skill to teach only `spawn.yml`.

**Phase 2:**

- Remove the legacy body-emits-JSONL code path from the runtime
  once no example uses it. The internal apply remains; only the
  body-authored manifest entry point goes away.

There is no Phase 3. Two phases, no parallel surfaces.

## Test plan

New tests under `packages/core/src/task/spawn/__tests__/`:

1. **Single invocation** — body writes `hero-spec/spawn.yml`
   naming an existing template; framework expands, applies,
   ledger has one new row. Exit 0.
2. **Multiple invocations of same template** — body writes 5
   directories each invoking `asset-spec` with different params;
   all 5 expand, ledger has 5 rows.
3. **Multiple invocations of different templates with deps** —
   `*-spec`, `*-generate`, `*-wire` triple per asset for 3
   assets; depends_on chains preserved.
4. **Missing required param** — `spawn.yml` omits a param the
   template declares required; framework writes
   `EVIDENCE.json` with `errorCode: missing-required-param`,
   `expectedParams: [...]`. No row applied for that child;
   others apply cleanly.
5. **Unknown param** — `spawn.yml` passes a param the template
   doesn't declare; `EVIDENCE.json` with
   `errorCode: unknown-param`, `hint` suggests nearest declared
   name.
6. **Param type mismatch** — string passed where PARAMS.yml
   declared `number`; `errorCode: param-type-mismatch`.
7. **Template not found** — `template: typo-name`;
   `errorCode: template-not-found`.
8. **Inferred params** — template has `{{x}}` but no
   `PARAMS.yml`; framework treats `x` as required string. Missing
   `x` ⇒ missing-required-param.
9. **Repair loop** — test 4 then convergence prompt edits the
   `spawn.yml` to supply the param, re-runs body (no-op for the
   ok children), apply re-runs, ledger complete, evidence gone.
10. **Body-authored TASK.md rejected** — body writes
    `hero-spec/TASK.md` directly; framework emits
    `SPAWN_TASKMD_AUTHORED_BY_BODY`; spawn-clean check fails.
11. **Body-authored manifest rejected** — body writes
    `$CONVERGE_TASK_DIR/spawn.plan.jsonl`; emits
    `SPAWN_MANIFEST_AUTHORED_BY_BODY`; spawn-clean check fails.
12. **Reserved-prefix skip** — `_scratch/spawn.yml` is not
    discovered.
13. **Idempotent re-run** — identical `spawn.yml` files; apply
    is a no-op.
14. **Force re-spawn** — body deletes `hero-spec/`, re-creates
    with different params; ledger reflects new content.
15. **Unicode + quoting regression** — `params.title: "週次"`,
    `params.note: "it's a test"`. Round-trips. (The bug class
    RFC 0002 was written to fix is impossible — the AI writes
    YAML values directly, never quotes for the framework.)
16. **Template edits propagate** — change `asset-spec` template's
    `checks:` and re-run a downstream spawner; new children
    apply with new checks; previously-applied children are
    unaffected (existing RFC 0021 idempotency).
17. **STATUS.md shape (ok case)** — 3 ok children produce a
    STATUS.md with three `- [x]` rows, no `- [ ]` rows,
    `spawn-clean` check passes.
18. **STATUS.md fix-block (typo case)** — invocation has
    `template: asset-genrate`; STATUS.md row contains
    `did you mean: asset-generate?` and a `fix:` block with the
    corrected `template:` line. Levenshtein hint correctness is
    asserted.
19. **STATUS.md fix-block (missing-param case)** — invocation
    omits a required param; STATUS.md `fix:` block contains the
    exact YAML to add under `params:`, indented correctly.
20. **Preview-then-apply atomicity** — 5 invocations, one with a
    typo: preview rejects all, `tasks.jsonl` is unchanged after
    the body runs. After repair, all 5 apply atomically.
21. **EXPANDED.md adjacency** — each ok child has both `spawn.yml`
    and `EXPANDED.md` in its directory; EXPANDED.md is the
    rendered template with params substituted.
22. **EXAMPLES.yml discovery** — `loadTemplates` exposes
    EXAMPLES.yml content alongside PARAMS.yml; the planning skill
    test reads an example and produces a matching spawn.yml.

Pattern coverage (one integration test per pattern under
`tests/test-ai-native-spawn/`):

- **Reasoning-driven** — a 4-children spawner with four
  different templates (`design-doc`, `migration`,
  `api-endpoint-set`, `api-tests`), dependency-chained. One
  template-not-found typo, repair loop fixes it, parent
  converges.
- **Data-driven** — a spawner reading a 200-row JSON manifest,
  emitting 600 `spawn.yml` files across three templates with
  per-row deps. Five rows have malformed params; the repair
  loop fixes each in turn (proves per-child addressability at
  scale); parent converges.
- **Nested** — a 3-section root spawner invoking
  `playbook-section`, which is itself `mode: spawner` and
  spawns 4 `subsection` children per section. Verifies that
  each level gets its own `spawn/` cwd, evidence is isolated
  per level, and a failure at depth 2 doesn't pollute depth 1's
  evidence.

## Anti-goals

Each item, if added, would introduce a second concept. Listed
explicitly so future PRs have a fixed point to push back against.

- **No body-authored TASK.md.** A child's contract lives in a
  template. Bodies that write `<id>/TASK.md` directly are
  rejected.
- **No body-authored manifest.** `spawn.plan.jsonl` is internal
  IR; bodies writing it are rejected.
- **No alternative invocation format.** YAML only, schema
  exactly 3 fields. No JSON variant, no `.spawn` extension, no
  inline-in-comment shape.
- **No template-author fields on the spawner side.** No
  `outputs:` override, no `checks:` override, no body override
  in `spawn.yml`. If a per-child override is needed, add a
  param to the template; the template chooses what is
  parameterizable.
- **No templating engine in spawn.yml itself.** The AI does not
  `{{...}}` inside `spawn.yml`; the body interpolates at write
  time (heredoc). Mustache lives in template TASK.md, not in the
  invocation file.
- **No template inheritance, no template composition.** A
  template is one TASK.md + one PARAMS.yml. If templates start
  needing to compose, that is a template-authoring problem
  solved in a different RFC.
- **No flat-file invocation form.** `hero-spec.spawn.yml` is not
  a child. Only `hero-spec/spawn.yml` is.
- **No env var the AI must learn.** `$CONVERGE_TASK_DIR` stays
  internal; the body uses cwd-relative paths.
- **No workspace-wide scanning.** Discovery is `spawn/` (cwd),
  one level deep.
- **No on-the-fly template creation from a spawner.** A spawner
  that needs a template that doesn't exist surfaces it as an
  unresolved decomposition. Template authoring is a different
  workflow, out of scope for this RFC.

## Open questions

Most prior questions are settled by the principle. Remaining:

1. **Where do templates ship?** `<playbook>/templates/` is the
   current convention and works. An alternative is a workspace-
   wide `.converge/templates/` shared across playbooks. Lean:
   per-playbook for now; cross-playbook reuse is a future RFC.
2. **PARAMS.yml or frontmatter declaration?** Two reasonable
   places to declare the param contract — a sibling `PARAMS.yml`
   (clear separation) or a `params:` block in the template's own
   frontmatter (one file). Lean: sibling `PARAMS.yml` so the
   template TASK.md remains a valid TASK.md that can be tested in
   isolation; revisit if the two-file overhead grates.
3. **Mustache vs. typed templating.** `{{paramName}}` is dumb-
   simple and AI-friendly. A typed templating engine (with
   conditionals, defaults, escaping) is more expressive but
   becomes its own learnable surface. Lean: Mustache only, accept
   the limit, push complexity into PARAMS.yml defaults if needed.
4. **`mode: converger` semantics across waves.** Each wave runs
   in the same `spawn/` cwd; identical `spawn.yml` content is a
   no-op via hash; a wave that wants to retract a child deletes
   its directory. Final confirmation during Phase 1
   implementation.
5. **Pattern-2 ergonomics at extreme N.** 600 `spawn.yml` files
   is sub-second on any normal filesystem; 60,000 might press
   inode and discovery-walk costs. Lean: accept this as the
   ceiling for the current design; if a real playbook needs more,
   the answer is a sharded parent (spawn N sub-spawners each
   handling a slice), not a batch shape in the AI's surface.
6. **Pattern-3 evidence isolation.** Confirm during Phase 1 that
   a failure in a nested spawner's `spawn/` doesn't surface as
   evidence at the parent level — parents only see their direct
   children's status, never grandchildren's internal evidence
   files.

Settled by the principle (not open):

- *Invocation file* — `spawn.yml`, exactly three fields.
- *Child identity* — directory name.
- *Contract authoring* — template author's role, not spawner's.
- *Authoring paths* — exactly one. Body-authored TASK.md and
  body-authored manifests are rejected.

## Why now

- RFC 0021 landed the right *engine*. It did not narrow the AI's
  surface; the AI still authors JSONL manifests and (when it
  chooses the "task" kind) full TASK.md schemas. This RFC
  finishes the surface narrowing the engine made possible.
- The progressive-decomposition design doc argues "a TASK.md
  *is* the contract." This RFC sharpens that: contracts are
  reusable artefacts authored deliberately (templates).
  Spawning is invocation of pre-authored contracts, not on-the-
  fly contract drafting.
- Recent AI-authored spawner bugs split cleanly between two
  classes: (a) framework vocabulary errors, and (b) bad
  contracts the AI hand-wrote. Class (a) is eliminated by RFC
  0021's manifest engine; class (b) requires moving contracts
  off the AI's authoring path. This RFC does the second.
- The planning skill's spawner guidance grew to dominate
  `SKILL.md`. Reducing the AI's surface to "name a template,
  list deps, pass params" lets that section shrink dramatically
  and lets template-authoring become its own focused skill.

One concept on the AI's write path (`spawn.yml`, three fields).
One concept on the AI's read path (`STATUS.md`, plain markdown
checklist with `fix:` blocks). The transparency layer is built
from patterns the model was already trained on:

- **Tool-call discipline** (`spawn.yml` ⇄ STATUS row) — repair is
  the same loop the AI runs for every failing tool call.
- **Terraform plan/apply** — preview validates everything before
  any journal mutation; repair cycles cost nothing to unwind.
- **Markdown task lists** — STATUS.md is a `- [x]`/`- [ ]`
  checklist the AI reads as a TODO and edits its way through.
- **Storybook + dbt** — templates ship `EXAMPLES.yml` with
  canonical invocations and `when_to_pick` / `not_for` guidance;
  picking is pattern matching, not schema reading.
- **LSP quick-fix** — every `[ ]` row carries the file to edit
  and the exact patch.

Three patterns naturally covered:

- **Reasoning-driven** — four heredocs, four template names.
- **Data-driven** — one loop, hundreds of `spawn.yml` files.
- **Nested** — invoke a spawner template; it spawns at its own
  level. Recursion is free.

The AI names *what* to spawn and focuses on the *quality* of that
choice. The template carries *what done means*. The framework
owns *how*. STATUS.md is the single thing the AI reads to
self-correct.
