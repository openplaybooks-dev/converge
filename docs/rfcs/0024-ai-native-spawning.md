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
  asset-generate/
    TASK.md
    PARAMS.yml
  asset-wire/
    TASK.md
```

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

The planning skill teaches the AI to:

1. `ls .converge/playbooks/<playbook>/templates/` — discover what
   exists.
2. `cat templates/<name>/PARAMS.yml` (or the template TASK.md if no
   PARAMS) — discover what params the template wants.
3. Write `spawn/<id>/spawn.yml` invocations.

If a needed template doesn't exist, the AI surfaces that as an
unresolved decomposition, not as a license to invent a contract on
the fly. (Future work — `converge plan` or a "template authoring"
skill — covers template creation. This RFC scopes only invocation.)

### What the parent body becomes

Today (`examples/app-builder/.../002-generate-per-asset/TASK.md`,
~25 lines of shell, framework vocabulary throughout):

```bash
TEMPLATES=".converge/playbooks/default/templates"
# … jq + shell + converge spawn template --var k=v --var k2=v2 …
```

Tomorrow:

```bash
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

Every concept in the body is either *the work decision* (which
templates, with what params) or *ordinary shell* (the loop, the
heredoc). There is no framework vocabulary, no TASK.md schema, no
outputs/checks the AI has to invent or validate. A reader who has
never seen Converge can follow it. A reader who has seen Converge
sees one primitive: write `spawn.yml`.

### Why this is the right surface

A surface check across what an AI does well vs poorly:

| Skill | AI strength | Mapped to |
|---|---|---|
| Pick the right template | Strong (pattern match against a list) | `template: <name>` |
| Order children by dependency | Strong (reasoning about prerequisites) | `depends_on: [...]` |
| Supply params from data | Strong (substitution from JSON / variables) | `params: { … }` |
| Author a contract | Weak (writes non-deterministic checks, mismatched outputs) | **Not on the AI's path** — template owns it |
| Compose JSONL with quoting | Weak (the RFC 0002 bug class) | **Not on the AI's path** — framework owns it |
| Sequence apply lifecycle | Weak (forgets the exec dir, mis-names files) | **Not on the AI's path** — framework owns it |

Everything left on the AI's path is something it does well.
Everything it does poorly is moved to the framework or the template
author.

### Why this is also the most flexible surface

Counterintuitively, narrowing the AI's surface increases overall
flexibility, because the template surface is **separately as
expressive as TASK.md**:

| Capability | This RFC |
|---|---|
| One-off heterogeneous children | Author a one-off template; invoke it once. Trivial. |
| Homogeneous fan-out from data | One template, N invocations. The native pattern. |
| Per-child override of one field | Add a param to the template; pass it per-invocation. |
| Repair after partial failure | Edit `spawn.yml` params or template name. One file. |
| Cross-wave fan-in (converger) | Each wave writes more `spawn.yml` files in cwd. |
| Bespoke contract for a single child | Author the template, invoke it. Templates are cheap. |
| Changing all children's checks at once | Edit the template. One edit, N children re-apply. |

The "templates are cheap" property is the key: templates are just
TASK.md files. Authoring one is exactly as much work as authoring
one child contract today — but the result is reusable, validated,
and owned by a different role than the spawner. The cost of
introducing a template is paid by the template author **once**; the
cost of authoring a child contract is paid by the spawner **every
time it runs**.

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

### Repair: sibling EVIDENCE.json, edit the file

When discovery + expansion fails for a child, the framework writes
`EVIDENCE.json` next to the offending `spawn.yml`:

```
spawn/
  hero-spec/
    spawn.yml         ← what the AI wrote
    EVIDENCE.json     ← why it failed
  hero-generate/
    spawn.yml         ← ok, no sibling EVIDENCE.json
```

`EVIDENCE.json` schema:

```ts
type SpawnFileEvidence = {
  ok: false;
  errorCode:
    | "template-not-found"        // template: name doesn't resolve
    | "missing-required-param"    // template declared, invocation omitted
    | "unknown-param"             // invocation passed param template doesn't declare
    | "param-type-mismatch"       // string passed where number expected
    | "duplicate-id"              // dir name conflicts with existing ledger row
    | "unsafe-id"                 // dir name fails id validation
    | "malformed-spawn-yml"       // YAML parse error
    | "circular-depends-on"       // depends_on chain forms a cycle within this batch
    | "internal";
  error: string;        // human-readable
  hint?: string;        // optional fix suggestion ("did you mean: assetId?")
  template?: string;    // when applicable
  expectedParams?: string[];  // when missing-required-param or unknown-param
};
```

The parent's post-body check:

```yaml
checks:
  - id: spawn-clean
    cmd: ! find spawn -name 'EVIDENCE.json' | grep -q .
```

The repair loop is the existing framework primitive — edit the
offending file, re-run the body, framework re-applies. The
**primitive being repaired is `spawn.yml`**: 3 fields. The patch is
almost always one line.

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

### 4. Apply hook

Post-body in the spawner/converger executor:

```ts
const templates = loadTemplates(playbookDir);
const { invocations, evidence: discoveryEvidence } = discoverInvocations(spawnRoot);
const evidence: SpawnFileEvidence[] = [...discoveryEvidence];
const rows: SpawnRow[] = [];

for (const inv of invocations) {
  const result = expandInvocation(inv, templates);
  if ("row" in result) rows.push(result.row);
  else evidence.push({ ...result.evidence, spawnYmlPath: inv.spawnYmlPath });
}

writeFileEvidence(spawnRoot, evidence);
detectStrayManifests(spawnRoot);       // emits SPAWN_MANIFEST_AUTHORED_BY_BODY
detectStrayTaskMd(spawnRoot);          // emits SPAWN_TASKMD_AUTHORED_BY_BODY
if (rows.length > 0) await applyManifest({ rows, workspace });

return { applied: rows.length, rejected: evidence.length };
```

`detectStrayTaskMd` flags any `<id>/TASK.md` in the spawn root as a
malformed-body signal — the AI tried to author a contract directly.
The hook still expands sibling `spawn.yml` files if present; the
stray `TASK.md` becomes its own EVIDENCE entry.

### 5. Interpolation engine

Mustache-style `{{paramName}}` only — no conditionals, no loops,
no helpers. Renderable by `String.prototype.replaceAll` over the
template TASK.md text. Undeclared `{{...}}` references in templates
are caught at template-load time (warning) and at expansion time
(error if a referenced param has no value).

### 6. Planning skill update

`skills/converge-planning/SKILL.md`:

- Replace all spawn-manifest references with the `spawn.yml`
  invocation contract.
- Add a worked example: a 3-child spawner using three pre-existing
  templates, body is 20 lines of jq + heredoc. The example body
  contains no `outputs:`, `checks:`, or framework vocabulary.
- New subsection: **"Discover available templates first."** Tells
  the AI to `ls .converge/playbooks/<pb>/templates/` and read
  PARAMS.yml before writing invocations.
- Remove every mention of `$CONVERGE_TASK_DIR`, `spawn.plan.jsonl`,
  `converge apply`, TASK.md frontmatter authoring from the
  spawner authoring guidance. Move debug-only references to a
  "Framework internals (do not author)" appendix.
- Add a section on what to do when no template fits: surface the
  gap as an unresolved decomposition, do not invent a contract.

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

Integration test under `tests/test-ai-native-spawn/`:

- A 3-asset, 9-child spawner using `*-spec`, `*-generate`,
  `*-wire` templates. One invocation has a typo'd param; repair
  loop fixes it; parent converges. End-to-end without humans.

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

One change. One concept. The AI names what to spawn.
The template carries the contract. The framework owns ingestion.

The spawner says *what*. The template says *what done means*.
The framework says *how*.
