# Progressive Decomposition

> Design principle for the next iteration of the Converge interface.
>
> Status: proposal. Branch: `claude/simplify-converge-interface-GIZtD`.

## TL;DR

Today, an agent running a Converge task can — and is implicitly expected to —
see the whole task tree: the playbook, sibling phases, parent WBS scaffolding,
shared references generated three folders away. That's the source of two
recurring pains:

1. **Planning is hard.** Authors of new playbooks have to design the whole
   tree up front, decide what every leaf will need, and physically arrange
   shared state so leaves can find it.
2. **Debugging is hard.** When a leaf fails, the question "what context did
   this agent actually have?" requires walking up *and* across the tree.

Progressive decomposition flips the model:

- **The tree is operational, not epistemic.** It exists in storage so the
  framework can schedule, persist, resume, and replay. Agents never traverse
  it.
- **Agents see a delegation contract — nothing else.** Four fields: goal,
  scope, checks, child contracts.
- **Information only flows through contracts.** Parent → child = contract.
  Child → parent = artifact + receipt. No grandparent reads, no sibling peeks,
  no descendant lookahead.

In one line:

> **The framework runs a tree; the agents run an org chart.** Same data, two
> views. The agent view is always *one level up* + *one level down*.

## Why we want this

Look at `examples/game-assets`. The default playbook today has roughly this
shape:

```
01-setup-art-style/
02-asset-breakdown/
03-characters/
  01-analysis/
  02-shared-references/   (WBS)
  03-generation/          (WBS) → spawns per-character pipelines
                                    → spawns per-state spritesheet leaves
04-tile-maps/             (WBS)
05-backgrounds/           (WBS)
06-props/                 (WBS)
07-export/                (WBS)
```

A spritesheet leaf for `hero-knight-spritesheet-walk` needs:

- The art-style packet from `01-setup-art-style`.
- The character's canonical reference from `03-characters/03-generation/.../02-angles`.
- The class style guide from `03-characters/02-shared-references`.
- Animation-state keyframe rules from a Python lib in `scripts/`.
- The output contract for its parent (`03-characters`) — a 4×4 atlas at the
  configured resolution.

Today the leaf agent gets all of that *because the tree is on disk* and
because TASK.md prompts implicitly point at sibling/grandparent state. The
agent's job is partly "read everything you can find that looks relevant."
That's the deep-context problem.

A new author building a playbook hits the same problem from the other side:
they have to physically lay out the tree so the right files end up where the
right leaf can `Read` them. The tree shape is doing two unrelated jobs:
*scheduling order* and *information routing*.

We want to separate them.

## The mental model

### The tree is for the framework

The framework needs the tree for things humans and agents don't:

- **Scheduling** — what's runnable now, what's blocked.
- **Persistence** — checkpoints, journals, the ability to crash and resume.
- **Replay & audit** — show a human "the whole plan," diff two runs, attribute
  cost to a subtree.
- **Repair** — when a leaf fails, the navigator needs to know the chain of
  parents so it can decide where to retry, where to relax a check, where to
  re-decompose.

All of that is internal. None of it is something an agent needs to reason
about while doing work.

### The agent runs an org chart

When an agent is asked to do something, it sees the layer above (what it
owes) and the layer below (what's owed to it, if it decomposes). Nothing else.
A CEO doesn't read every engineer's ticket; they hand a goal to a VP. The VP
doesn't peek at sibling departments; they hand goals to managers. The
manager doesn't read the CEO's strategy doc; they have a contract from the VP
that already includes whatever from the strategy doc was relevant.

The asymmetry is the point: humans (and the framework's audit views) can see
everything. Agents can't, by design.

## The delegation contract

A delegation contract has exactly four fields:

| Field | What it is | Source |
|---|---|---|
| **Goal** | What I was asked to deliver, in my parent's words. | Written by parent. |
| **Scope** | The packet my parent handed me — catalog refs, style decisions, references already produced upstream, locked invariants. *Not a tree pointer.* A self-contained packet. | Composed by parent from its own scope + what it adds. |
| **Checks** | What proves I delivered. Deterministic predicates the framework runs. | Written by parent (with input from the child during decomposition negotiation, if needed). |
| **Children** | The contracts I owe my direct children, when I decompose. | Written by me, the current node, when I decide to decompose. |

That's it. The agent at any node sees exactly these four things. No tree
walking, no grandparent reasoning, no sibling internals, no descendant
details.

```yaml
# A contract, materialized
goal: |
  Produce a 4x4 spritesheet for the "walk" animation of hero-knight,
  matching the locked viewport in the canonical reference.

scope:
  art_style:
    palette: [...]
    silhouette_rules: [...]
    line_weight: 2
  character:
    id: hero-knight
    canonical_ref: artifacts/hero-knight-canonical.png
    locked_viewport: { w: 256, h: 256, anchor: feet }
  class_style_guide:
    armor: heavy_metallic
    color_theme: metallic_blue
  state_spec:
    name: walk
    keyframes: [contact, recoil, passing, high]
    variant_ref: null   # resting state: edit canonical directly

checks:
  - id: sheet-is-4x4
    cmd: python scripts/check_4x4.py {output_path}
  - id: viewport-locked
    cmd: python scripts/check_viewport.py {output_path}
  - id: palette-respected
    cmd: python scripts/check_palette.py {output_path} {scope.art_style.palette}

children: []   # leaf — no decomposition
```

Compare to a non-leaf contract:

```yaml
goal: |
  Produce a complete asset library for the platformer described in idea.md,
  exporting to Godot, Unity, and raw atlases.

scope:
  idea: <packet from project root, freeform>
  vars: { sprite_resolution: 128, ... }

checks:
  - id: master-atlas-frame-count
    cmd: python scripts/check_master_atlas.py
  - id: every-engine-export-present
    cmd: python scripts/check_engine_exports.py godot unity raw

children:
  - goal: "Define art style + global catalog (characters, props, tiles, bgs)"
    delivers: [art_style_packet, sprites.json, objects.json, tile_maps.json, backgrounds.json]
  - goal: "Produce all character spritesheets per the catalog"
    delivers: [assets/characters/**/*.png, assets/characters/**/*.atlas.json]
    receives_from_sibling_0: [art_style_packet, sprites.json]
  - goal: "Produce all tile maps per the catalog"
    receives_from_sibling_0: [art_style_packet, tile_maps.json]
  # ...
```

Critically, `receives_from_sibling_0` is *not* "go read sibling 0's outputs."
It's a declaration that the parent must include sibling 0's outputs in the
scope packet it hands to this child *after* sibling 0 has produced its
artifact + receipt. Resolution happens in the parent, not in the child.

## Information flow rules

Three rules. They are the whole interface.

### 1. Parent → child: a contract

The parent writes the contract. The contract is a packet on disk in the
child's journal. The child reads its own contract — that's a local read of
its own scope. It does not read the parent's contract, the parent's scope,
the parent's other children, or any ancestor.

### 2. Child → parent: an artifact + a receipt

When the child finishes (checks pass), it emits an artifact (the file(s) the
contract said it would produce) and a receipt — a small structured record:
"checks X, Y, Z passed; here are the artifact paths; here is metadata I
discovered that my parent might want to thread into a sibling's scope."

The receipt is what enables the parent to fan results across siblings without
the children ever reading each other.

### 3. Scope is the only inheritance mechanism

A node receives scope from its parent. It can add to scope. It passes the
larger packet down to its children. Scope grows monotonically along a
root-to-leaf path. Reading scope is local (a packet on disk in this node's
journal). **Reading the tree is forbidden in the agent surface.**

This is what makes the model scale: the size of the context an agent needs
is `O(depth from root)`, never `O(tree size)`. A 2000-task playbook with
depth 5 costs the same per-agent as a 20-task playbook with depth 5.

## Decomposition is "write four contracts"

When an agent decomposes, its job is purely:

> Given my contract, draft 3–7 child contracts whose deliverables collectively
> satisfy mine, and hand each child its scope packet.

That's the entire surface. No lookahead into how children will themselves
decompose — that's the child's problem, recursively. No siblings to consult.
No grandparent to defer to.

The 3–7 bound is an editorial constraint, not a hard limit. If a node would
fan to 50 children, it should usually split first into 5 groupings of 10. The
bound exists because:

- Decomposition quality drops when a single agent has to hold 50 distinct
  child contracts in working memory.
- Debugging contract-chain walks (below) stay shallow when fan-out is small.

WBS-style runtime fan-out (one task per item in a discovered list) is a
specific allowed exception: the parent decomposes into a fixed-shape
"per-item" contract template plus an iterator. The framework instantiates the
contracts; the agent doesn't have to draft 50 by hand.

## Debugging: walk the contract chain, not the tree

When a leaf fails, the diagnostic question is never "what does the tree look
like." It's:

1. **Was my contract well-formed?** Goal clear? Checks deterministic? Scope
   complete enough that I could have succeeded?
2. **Was my scope sufficient?** Did my parent include everything I needed,
   or did I need something they didn't pack?
3. **Was my parent's decomposition coherent?** If my contract was malformed
   or my scope was insufficient, that's a parent-level bug.

Three frames, max: *me*, *my contract*, *my parent's decomposition*. The CLI
should show you the chain, not the tree. If the answer is "my parent's
decomposition was bad," then we recurse — but the new question is about the
parent's contract, not its descendants.

This is the inverse of today's debug experience, where a failing leaf
usually triggers a tree walk to find the relevant context.

## What we keep, what we lose, what we gain

### Keep

- **The tree on disk.** Storage layout doesn't have to change much. WBS
  spawning, journal, checkpoints, all preserved.
- **Deterministic checks as the verification surface.** Checks don't move.
- **Repair pipelines.** Navigator strategies still apply, but they now reason
  about contracts (was the contract wrong?) instead of about prompts.
- **Multi-provider `agentfn`.** Untouched.

### Lose

- **Implicit cross-tree reads.** A TASK.md today can casually reference
  `assets/sprites.json` produced two phases ago. Under the new model, that
  reference must be *in the scope packet* the parent handed down. If it isn't,
  the agent cannot reach for it.
  - This is a feature, but it's also a migration cost: existing playbooks
    will need their scope packets explicitly populated.
- **Free-form prompts that incidentally describe the whole project.** Goal
  and scope are now structured. Authors can't dump the entire `idea.md` into
  every leaf.

### Gain

- **Bounded per-agent context.** `O(depth)`, not `O(tree)`.
- **Plannable decomposition.** "Draft 3–7 child contracts" is a much sharper
  task for an LLM than "design a phase." It's the same shape at every level,
  which lets us specialize prompts, evaluate quality, and even use small
  models for routine decomposition.
- **Shallow debugging.** Three-frame walks instead of tree archaeology.
- **Reusable subtrees.** A well-formed contract is portable. A
  `produce-character-spritesheet` contract that works in `game-assets` should
  drop into a new playbook by handing it a different scope packet.
- **Honest planning.** Authors stop encoding information routing in the
  filesystem layout. The tree shape becomes purely about scheduling.

## How this maps to Converge today

The goal is *evolutionary, not a rewrite*. Existing primitives map cleanly:

| Today | Under progressive decomposition |
|---|---|
| `TASK.md` frontmatter `outputs`, `checks` | The `checks` field of the contract. Output paths are part of the goal/scope. |
| `TASK.md` body (markdown prose) | The `goal` field — kept, but disciplined: it's "what I was asked," not a freeform README. |
| `wbs:` script that spawns children | The `decompose` step that emits 3–7 child contracts (or N templated contracts in the per-item case). |
| `vars:` interpolated into templates | Part of the scope packet. |
| Filesystem siblings reading each other | **Removed.** Replaced by parent-mediated scope threading. |
| `LEARN.md` repair memory | Becomes per-contract: stored next to the child's contract, scoped to that node. |

Concretely, a TASK.md becomes (sketch):

```markdown
---
contract:
  goal: |
    Produce a 4x4 spritesheet for the "walk" animation of hero-knight.
  scope_ref: scope.json     # written by parent; read-only to me
  checks:
    - id: sheet-is-4x4
      cmd: python scripts/check_4x4.py {output_path}
  children: []
---

(Optional) Implementation notes the parent wants to leave for the agent —
but only things in scope. Anything outside scope is a contract bug.
```

The runtime change is in *how scope is constructed*. Today, `vars` are
threaded through templates and the rest is "agent finds it on disk." The new
runtime has a `scope.json` per task, written atomically by the parent's
decompose step, and a hard rule that the agent's working tools are sandboxed
to: its own scope packet, the project's declared catalog roots, and explicit
tool allowlists.

## Worked example: game-assets, reframed

Root contract:

```
goal: Produce a platformer asset library matching idea.md, exported to Godot/Unity/raw.
scope: { idea.md contents, vars block, engine_targets }
checks: master-atlas integrity, engine-export presence
children:
  - C1: art-style + catalog
  - C2: characters
  - C3: tile maps
  - C4: backgrounds
  - C5: props
  - C6: export
```

C1 (art-style + catalog) is the only child whose contract receives raw
`idea.md`. It produces:

- art-style packet (palette, silhouette rules, line-weight, etc.)
- `sprites.json`, `objects.json`, `tile_maps.json`, `backgrounds.json`

…and these become *artifacts the root threads into C2–C6's scope packets*.
C2 doesn't read `idea.md`. C2 reads its scope packet, which contains the
art-style packet and the slice of catalog relevant to characters.

C2 (characters) decomposes to:

- C2.a: per-class shared references (one contract per class)
- C2.b: per-character pipelines

C2.a's outputs become artifacts that C2 threads into each C2.b's scope
packet. Each C2.b leaf agent doing `hero-knight-spritesheet-walk` sees:

- Its goal: produce the walk spritesheet.
- Its scope: art-style packet, hero-knight canonical ref, warrior class style
  guide, walk state keyframe spec.
- Its checks: 4×4, viewport locked, palette respected.
- No children.

That agent has *no idea* that backgrounds, tile maps, or props exist. It
doesn't need to.

The depth of the tree is unchanged. The depth of the *context* the agent
holds is bounded.

## Open questions

1. **Scope schema.** Do we standardize the shape of scope packets, or let
   playbooks define their own? Strong argument for typed packets per
   "domain" (asset-library, doc-site, research-report) so contracts are
   reusable. Weak argument: lets playbook authors stay agile.
2. **Receipt format.** What does the child's "here is metadata my parent might
   want" look like? Free-form JSON? A typed manifest? This is the place
   sibling-routing actually lives, so it deserves care.
3. **WBS decomposition.** Today's WBS scripts often `Read` the file system to
   discover units. Under the new model, that data must come through scope.
   Practically: the parent's decompose step *is* what runs the WBS — the
   parent's agent (or a deterministic script) inspects scope and emits N
   child contracts. The split between "agent decomposes" and "script
   decomposes" is unchanged; what changes is that decomposition no longer
   reads siblings.
4. **Catalog refs.** Some scope content is genuinely global (the art-style
   packet, the engine-target list). Do we represent these by value (copied
   into every child packet) or by reference (a content-addressed pointer the
   framework resolves on read)? By-reference is cheaper but introduces a
   "this is the only kind of tree-walk allowed" exception. Probably worth it;
   needs a name.
5. **CLI surface for debugging.** The contract-chain walk needs a command:
   `converge explain <task-id>` should print *me, my contract, my parent's
   decomposition*, and stop. Today's tree-status views stay for human audit
   but are clearly labeled "framework view."
6. **Migration.** Existing playbooks won't satisfy the no-cross-reads rule
   on day one. We probably need a "loose mode" that allows current behavior
   with a warning, plus a migration tool that infers scope packets from
   today's implicit reads.

## Next steps

1. **Spike**: take one slice of `examples/game-assets` (say, characters
   only) and hand-rewrite it as contracts + scope packets. See whether the
   per-leaf packet stays manageable in size.
2. **Schema sketch**: propose a `Contract` type and `ScopePacket` type in
   `packages/core/src/config/`. Don't ship — just see what fields fall out
   naturally.
3. **CLI sketch**: design `converge explain <task-id>` against the spike.
4. **ADR**: once the spike validates the shape, lift this doc into
   `docs/adr/` as a numbered decision record.

## One-line recap

> The framework runs a tree; the agents run an org chart. Same data, two
> views. Agents see exactly one level up and one level down — never more.
