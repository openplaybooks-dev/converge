---
title: "Progressive Decomposition"
description: "Design principle for the next iteration of the Converge interface."
---

# Progressive Decomposition

> Design principle for the next iteration of the Converge interface.
>
> Status: proposal. Branch: `claude/simplify-converge-interface-GIZtD`.
>
> **Scope: mental model + one CLI command.** No breaking changes to the
> runtime, the TASK.md schema, WBS, or storage. A TASK.md *is* the
> delegation contract today — `title`/`description` is the objective, `outputs`
> + `checks` are what proves it's done, the parent's `wbs:` script writing
> this TASK.md *is* the act of decomposition, and `vars` interpolated into
> the template body *is* the scope packet. What we're shipping is (a) the
> framing in this document, and (b) a recursive **`converge plan <path>`**
> command that grows playbooks one layer at a time.

## TL;DR

Today, an agent running a Converge task can — and is implicitly expected to —
see the whole task tree: the playbook, sibling phases, parent WBS scaffolding,
shared references generated three folders away. That's the source of two
recurring pains:

1. **Planning is hard.** Authors of new playbooks try to design the whole
   tree up front, decide what every leaf will need, and physically arrange
   shared state so leaves can find it. That's combinatorial — and it's the
   wrong job for the planner.
2. **Debugging is hard.** When a leaf fails, the question "what context did
   this agent actually have?" requires walking up *and* across the tree.

Progressive decomposition flips the model — without changing the data:

- **The tree is operational, not epistemic.** It exists in storage so the
  framework can schedule, persist, resume, and replay. Agents never traverse
  it.
- **A task is its own delegation contract.** The four fields are already on
  every TASK.md: objective (title/description), scope (vars + parent-supplied
  body), checks (frontmatter `checks`), children (the `wbs:` script that will
  emit them, when this task decomposes).
- **Information only flows through contracts.** Parent → child = contract
  (the TASK.md the parent's WBS materializes). Child → parent = artifact +
  the implicit receipt that its `checks` passed. No grandparent reads, no
  sibling peeks, no descendant lookahead.
- **Planning happens one layer at a time, recursively.** `converge plan
  <path>` runs at any node — a playbook root or a task. Phase 1 reads the
  chain root → ancestors → me, then writes a `PLAN.md` analyzing what
  direct children this node owes. Phase 2 materializes those children's
  TASK.md files and recursively spawns `converge plan` for each child that
  itself decomposes. Every planner only ever drafts its own *direct*
  children — never grandchildren. The tree grows lazily, breadth-first,
  one layer per plan invocation. With 6 children at depth 5, that's
  ~7,800 tasks; no single planner ever holds more than 6 in mind.

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
A CEO doesn't read every engineer's ticket; they hand a objective to a VP. The VP
doesn't peek at sibling departments; they hand objectives to managers. The
manager doesn't read the CEO's strategy doc; they have a contract from the VP
that already includes whatever from the strategy doc was relevant.

The asymmetry is the point: humans (and the framework's audit views) can see
everything. Agents can't, by design.

## A task is its own delegation contract

We don't introduce a new "Contract" type. The TASK.md you write today already
*is* the contract. Read the four fields off the existing format:

| Contract field | Where it already lives in TASK.md |
|---|---|
| **Objective** | `title:` + `description:` (and the markdown body, when prose is needed). What I was asked to deliver. |
| **Scope** | `vars` interpolated into the TASK.md when the parent's `wbs:` script materialized it, plus any catalog refs the parent embedded in the body. The packet my parent handed me. |
| **Checks** | `outputs:` and `checks:` in the frontmatter. What proves I delivered. |
| **Children** | The `wbs:` script (or `tasks:` list, for static fan-out). When I decompose, this is how I write contracts for my direct children. |

That's it. Nothing new gets added; what changes is the *discipline* of how
parents write each field. Specifically:

1. **Objective**: written by the parent in its own words. Not a paste of the
   project brief; not a paste of grandparent reasoning. "Produce X with
   property Y."
2. **Scope**: everything the child needs is in the `vars` and the templated
   body. If a child needs a sibling's output, the parent threads it in after
   the sibling completes — same way `wbs:` scripts already wait for
   dependencies and read produced files. The new rule is just: *the parent
   reads the file and packs it into the child's contract*, instead of
   asking the child agent to go find it.
3. **Checks**: deterministic predicates, as today.
4. **Children**: when this task itself decomposes (i.e. it has a `wbs:`
   script), the script's job is to draft 3–7 child TASK.md files — and only
   3–7. It does *not* sketch grandchildren. Each child, when run, will write
   its own `wbs:` if it decomposes further.

Two example sketches showing the shape (these are illustrative — not new
syntax):

```yaml
# leaf TASK.md — checks gate completion, body is what the parent packed
---
title: Walk spritesheet for hero-knight
outputs:
  - assets/characters/hero-knight/spritesheets/walk/walk.png
checks:
  - id: sheet-is-4x4
    cmd: python scripts/check_4x4.py assets/characters/hero-knight/spritesheets/walk/walk.png
  - id: viewport-locked
    cmd: python scripts/check_viewport.py assets/characters/hero-knight/spritesheets/walk
---

Generate the walk animation as a 4x4 spritesheet using:
- canonical ref: assets/characters/hero-knight/ref/canonical/canonical.png
- class style guide (warrior, metallic_blue, heavy armor): {inlined by parent}
- palette: {inlined by parent}
- keyframes for "walk": contact, recoil, passing, high
```

```yaml
# decomposing TASK.md — `wbs:` is the children field
---
title: Characters
wbs:
  type: nodejs
  path: ./wbs/index.js
checks:
  - id: every-character-has-spritesheets
    cmd: python scripts/check_characters_complete.py
---
```

The `wbs/index.js` reads scope (the parent's vars + any artifacts produced by
upstream siblings) and emits 3–7 children. *That's the entire decomposition
act.*

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

## The `converge plan` protocol

The whole framing reduces to one recursive command:

```bash
converge plan <path> [-p "<prompt>"] [--update]
```

`<path>` points at either a playbook root (where `playbook.yml` lives) or
any task directory inside it (where a `TASK.md` lives). The command does
exactly the same thing at every level — that's what makes the protocol
scale.

The two flags cover the seeding and steering cases:

- **`-p "<prompt>"`** — supply or augment the brief inline. At a fresh
  playbook root with no `idea.md`, `-p` *is* the brief: phase 1 treats
  the prompt string as the project context. At a task node, `-p` adds
  intent the planner should weight ("focus on the warrior class first,"
  "skip the export step for this run") on top of the existing scope
  chain. Without `-p`, the planner uses only the on-disk chain.
- **`--update`** — re-plan in place. By default, `converge plan`
  preserves existing child TASK.md files (idempotent fill-in). With
  `--update`, the planner is told its existing PLAN.md and child set
  are *drafts to revise*, not facts to preserve. It can rewrite the
  PLAN.md and modify, add, or mark-for-removal the children based on
  the new prompt or new ancestor context. The runtime still won't
  delete user edits silently — see the update semantics below.

Three common entry points:

```bash
# 1. Fresh project, no idea.md yet.
converge plan .converge/playbooks/default -p "platformer asset library, fantasy theme, godot+unity export"

# 2. Existing project with an idea.md. Standard layered planning.
converge plan .converge/playbooks/default

# 3. Existing playbook needs a course correction.
converge plan .converge/playbooks/default --update -p "switch art style from fantasy to cyberpunk; drop unity export"
```

All three trigger the same two-phase loop below.

### Two phases per invocation

**Phase 1 — analyze the context, write `PLAN.md`.**

Read the chain of context, top-down: the project's brief (`idea.md` or
equivalent), the playbook's `playbook.yml`, every ancestor's `PLAN.md`
and `TASK.md` along the path from the playbook root down to *me*. That's
it — only the path. No siblings, no descendants. Then write a `PLAN.md`
sitting alongside `playbook.yml` (at the playbook root) or alongside
`TASK.md` (at a task node).

`PLAN.md` is the planner's analysis surface. It captures:

- A restatement of *my objective*, in the planner's own words. (Sanity check
  on what the parent actually asked for.)
- The decision: am I a **leaf** (executable task) or a **container**
  (decomposes further)?
- If container: 3–7 direct children — each with a one-line objective, a
  short scope sketch, and the kind of child it is (executable or WBS).
- If leaf: a one-paragraph plan for how the work gets done, plus the
  checks that gate it.
- Open questions or unresolved scope (things the parent didn't pack
  that this planner thinks should have been packed). These bubble up;
  the parent gets a chance to repack and replan.

`PLAN.md` is *separate* from `TASK.md` on purpose: the plan is the
analysis (auditable, re-runnable), the task is the contract (the thing
the runtime executes against). They don't overwrite each other.

**Phase 2 — implement the plan.**

For each child the plan defined, materialize its `TASK.md` in the right
subdirectory, then **spawn `converge plan <child-path>` recursively** to
plan that child's own next layer. Phase 2 stops two ways:

- A child the planner declared as a *leaf executable task*: TASK.md is
  finalized with `outputs` + `checks` and an instruction body. No
  recursion — this child is ready to run.
- A child the planner declared as a *WBS task*: TASK.md is finalized
  with a `wbs:` pointer (script or template). No recursion *now* — the
  WBS expands at run time, and `converge plan` is invoked on each
  spawned child *then*.

That's the entire algorithm. Static decomposition recurses immediately;
WBS decomposition defers recursion to runtime. Both end up at the same
place: every node along every path eventually has a `PLAN.md` + a
finalized `TASK.md`.

### Layout

```
playbook-root/
  idea.md                        # project brief (root scope)
  .converge/playbooks/default/
    playbook.yml
    PLAN.md                      # written by `converge plan` at root
    tasks/
      03-characters/
        TASK.md                  # parent (root's) phase 2 wrote this
        PLAN.md                  # written by `converge plan tasks/03-characters/`
        01-analysis/
          TASK.md                # leaf — `converge plan` finalized it
          PLAN.md                # one-paragraph leaf plan
        02-shared-references/
          TASK.md                # WBS — `wbs:` points to ./wbs/index.js
          PLAN.md                # decided this is per-class fan-out
          wbs/index.js
        03-generation/
          TASK.md                # WBS — per-character fan-out
          PLAN.md
          wbs/index.js
```

### The reading rule, made precise

Phase 1 of `converge plan <path>` reads, in order:

1. The playbook root's brief (`idea.md`) and `playbook.yml`. If neither
   exists and `-p` was passed, the prompt string substitutes for the
   brief.
2. The root `PLAN.md`, if it exists.
3. For each directory along `playbook-root → ... → path`, the
   `PLAN.md` and `TASK.md` at that directory.
4. The current node's own `TASK.md`, if it already exists (the parent's
   phase 2 wrote it before recursing in).
5. Any `-p "<prompt>"` argument, appended as "additional intent from the
   user for this invocation."

That's the **scope packet**. It is `O(depth)` — root + ancestors + me.
Never siblings (`tasks/04-tile-maps/`), never cousins, never any node's
descendants. The reading rule is what makes the protocol composable: a
planner at depth 5 has the same shape of context as a planner at depth
1, just longer.

`-p` does not let the planner cheat the reading rule — it doesn't
unlock sibling reads or descendant traversal. It just gives the user a
direct channel to inject intent at *this* node's planner, in the
planner's own input.

### Two child shapes, three node states

Phase 1's central decision for each direct child is one of two shapes:

| Shape | TASK.md | When to pick |
|---|---|---|
| **Executable task** | `outputs` + `checks` + instruction body, no `wbs:` | The work is small enough to be done in one agent invocation. The planner can write deterministic checks today. |
| **WBS task** | `wbs:` pointer to a script or template | The set of children is data-dependent (one per character in `sprites.json`, one per CLI command, etc.) and won't be known until runtime. |

The current node itself is in one of three states after `converge plan`
finishes:

- **Leaf executable** — its own `TASK.md` is finalized as executable;
  phase 2 was a no-op (no children).
- **Static container** — phase 2 wrote N child TASK.md files and
  invoked `converge plan` on each.
- **WBS container** — its own `TASK.md` got a `wbs:` and phase 2
  stopped; recursion happens at runtime.

### Why scale works

With fan-out F at every level and depth D, the tree has roughly F^D
nodes. F is bounded (3–7 by editorial rule). D is bounded by the
problem's actual complexity. No single `converge plan` invocation ever
reasons about more than F children, regardless of how big the full tree
gets. F=6, D=5 gives ~7,800 leaves; F=6, D=6 gives ~47,000. The planners
don't notice.

Compare to the "plan the whole tree up front" approach: a single
planning step that has to think about thousands of leaves at once. It
doesn't fit in any context window, can't be reviewed, can't be debugged.

### Idempotency and replanning: three modes

`converge plan <path>` is safe to re-run. Behavior depends on flags and
on what's already on disk:

**Mode A — fresh.** Nothing at `<path>` yet (no `PLAN.md`, no child
TASK.md files). Phase 1 plans from scratch using the brief
(`idea.md` + `playbook.yml`, or `-p`). Phase 2 writes everything new.
This is the typical first run.

**Mode B — fill-in (default re-run).** A `PLAN.md` exists; some child
TASK.md files exist, some don't. Phase 1 re-runs and overwrites
`PLAN.md` (re-analysis is cheap and explicit). Phase 2 *fills missing*
child TASK.md files and *recurses only into children that don't yet
have a `PLAN.md`*. Existing TASK.md files are preserved as-is. Useful
for resuming a partial decomposition without disturbing user edits.

**Mode C — update (`--update`).** Phase 1 is told its existing
`PLAN.md` and child set are *drafts to revise* in light of new context
(typically a `-p` prompt, or freshly edited ancestor PLAN.md). Phase 2
applies the diff:

- *New* children listed in the revised PLAN.md → materialize TASK.md,
  recurse normally.
- *Removed* children → mark deprecated (rename to `_deprecated/` rather
  than delete; user reviews). Never silently drop user-touched files.
- *Modified* children whose TASK.md still matches what the previous
  PLAN.md asked for → re-materialize with the new contract, recurse
  with `--update`.
- *Modified* children whose TASK.md has diverged from the previous
  PLAN.md (i.e. a human edited it) → flagged for the user with a diff
  summary; left untouched. The user decides whether to accept the
  proposed update or keep their edit.

The principle: **`converge plan` proposes; the user disposes.**
`--update` lets the planner reason about changes; the runtime keeps
human edits visible and reversible. To force a full replan that
discards everything, the user deletes the subtree and re-runs without
`--update`.

Re-running `--update` at the root cascades: each child whose contract
changed gets `converge plan --update` invoked recursively. Children
whose contract didn't change are skipped. This is how a single
prompt-edit at the root propagates only as far as it needs to.

### The skill that powers phase 1

Phase 1 is an LLM call. We package its prompt, rubric, and worked
examples as a Claude Code skill at `skills/converge-planning/`:

```
skills/converge-planning/
  SKILL.md            # invocation contract + the prompt below
  rubric.md           # self-grading checklist
  examples/
    asset-library.md  # root → 6 children
    doc-site.md       # section → 4 sub-sections
```

`SKILL.md` prompt (sketch):

```
You are running phase 1 of `converge plan <path>`.

INPUTS (already gathered for you, the scope packet):
  - PROJECT brief: idea.md + playbook.yml. If the project is fresh,
    this may be empty and a USER PROMPT (-p) substitutes for it.
  - The PLAN.md + TASK.md at every ancestor directory along the path
  - This node's own TASK.md, if its parent already wrote one
  - Optional USER PROMPT (-p) — additional intent for this invocation
  - MODE: "fresh" | "fill-in" | "update"

OUTPUT: write PLAN.md at <path>. Decide one of:
  (a) This node is a LEAF EXECUTABLE TASK — give a one-paragraph plan
      and the deterministic checks that gate it. Phase 2 will finalize
      this node's own TASK.md as executable and stop.
  (b) This node is a CONTAINER — list 3-7 direct children. For each,
      give a one-line objective, a short scope sketch, and tag it as
      "executable" or "wbs". Phase 2 will materialize each child's
      TASK.md and recurse into the executable ones.

If MODE is "update", the existing PLAN.md and child set are drafts to
revise, not facts to preserve. Be explicit in the new PLAN.md about
what changed and why, so phase 2 can compute a sensible diff.

HARD RULES:
  - Do NOT plan grandchildren. Stop at one layer.
  - Do NOT read sibling tasks or any node's descendants. The scope
    packet you were given is exhaustive.
  - If something is missing from your scope packet that you'd need to
    plan well, write it under "Open questions" in PLAN.md — do not
    invent it. The parent's planner will see this and can repack.
  - Prefer 3-7 children. If a single shape repeats (one per character,
    one per command), use a single WBS child, not N hand-written ones.

Apply rubric.md before finalizing.
```

The CLI command (`converge plan <path>`) is the wrapper that gathers
the scope packet, invokes the skill, then runs phase 2.

## Debugging: walk the contract chain, not the tree

When a leaf fails, the diagnostic question is never "what does the tree look
like." It's:

1. **Was my contract well-formed?** Objective clear? Checks deterministic? Scope
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

## What stays the same, what changes

**No breaking changes.** Every existing playbook continues to run. The
runtime, the TASK.md schema, WBS, journals, repair strategies, providers —
all untouched. What we're shipping is *framing* + *one new skill*.

What stays the same:

- **TASK.md schema.** Same frontmatter. `title`, `description`, `outputs`,
  `checks`, `wbs`, `vars`, `dependencies`, `tags` — all of them.
- **The tree on disk.** Same layout. Same journals. Same checkpoints.
- **WBS scripts.** `wbs/index.js` still spawns children at runtime via
  `ctx.spawn`. The semantics don't change.
- **Deterministic checks.** The verification surface is the same.
- **Repair pipelines, multi-provider agentfn, CLI commands.** Untouched.

What changes (in author/agent behavior, not in code):

- **Planning is layered and recursive.** `converge plan <path>` drafts
  only direct children, then recurses into each. Grandchildren are the
  children's problem.
- **Agents stop tree-walking.** A leaf's prompt is what its parent packed
  into the materialized TASK.md, full stop. If something's missing, that's
  a parent-level decomposition bug, not a "go look harder" instruction.
- **Cross-tree reads become parent-mediated.** Today a TASK.md body might say
  "read `assets/sprites.json` and process it." That still works
  mechanically. The new discipline is: the parent's WBS reads
  `assets/sprites.json` and inlines the relevant slice into the child's
  vars, so the child doesn't have to know where it lives.
- **Debugging is contract-first.** When a leaf fails, ask three questions in
  order: was my contract well-formed, was my scope sufficient, was my
  parent's decomposition coherent. *Then* (and only then) consider whether
  it's an execution bug.

What we gain:

- **Bounded per-agent context.** `O(depth)`, not `O(tree)`.
- **Plannable decomposition.** "Draft 3–7 child TASK.md files" is a much
  sharper task for an LLM than "design a phase tree." Same shape at every
  level → specialized prompts, measurable quality, small-model routine
  decomposition.
- **Shallow debugging.** Three-frame walks instead of tree archaeology.
- **Reusable subtrees.** A well-formed TASK.md is portable. A
  character-spritesheet task that works in `game-assets` drops into a new
  playbook by being handed different vars.
- **Honest planning.** Authors stop encoding information routing in the
  filesystem layout. The tree shape becomes purely about scheduling.

## Worked example: game-assets via `converge plan`

`examples/game-assets` already runs. The reframing is purely about *who
plans what, when, and what they look at while planning*. No file moves.

**The user kicks it off.** No `idea.md`, just an empty playbook
scaffold:

```bash
converge plan .converge/playbooks/default \
  -p "platformer asset library, fantasy theme, godot+unity export, 3 starter characters"
```

(Alternative if `idea.md` already exists: `converge plan
.converge/playbooks/default` with no `-p`. The brief is read from
`idea.md`. To layer extra intent on top of `idea.md`, pass `-p` as
well — it gets appended as user intent for this invocation.)

**Phase 1 at the root.** Reads `idea.md` and `playbook.yml`. There are no
ancestors, this is the top. Writes `.converge/playbooks/default/PLAN.md`
deciding: this node is a *static container* with six children:

```
01-setup-art-style/   (executable — produces art-style packet + manifests)
02-asset-breakdown/   (executable — extends manifests)
03-characters/        (static container — will plan further)
04-tile-maps/         (static container — will plan further)
05-backgrounds/       (static container — will plan further)
06-props/             (static container — will plan further)
07-export/            (executable — aggregates atlases)
```

**Phase 2 at the root.** Materializes a `TASK.md` in each of those seven
subdirectories, then **recursively spawns** `converge plan` on the four
container children:

```bash
converge plan .../tasks/03-characters
converge plan .../tasks/04-tile-maps
converge plan .../tasks/05-backgrounds
converge plan .../tasks/06-props
```

(The three executables get no recursive invocation — their TASK.md is
already final.)

**Phase 1 at `03-characters`.** Reads, in order: `idea.md`,
`playbook.yml`, root `PLAN.md`, root TASK.md (the synthesized parent
contract — actually the playbook itself), then *its own* `TASK.md` that
the root just wrote. It does **not** read sibling tasks (`04-tile-maps/`,
`02-asset-breakdown/`, etc.). Writes `tasks/03-characters/PLAN.md`
deciding three children:

```
01-analysis/             (executable — analyze characters from sprites.json)
02-shared-references/    (WBS task — one per class, set known at runtime)
03-generation/           (WBS task — one per character, set known at runtime)
```

**Phase 2 at `03-characters`.** Writes the three child TASK.md files. The
two WBS children get `wbs:` pointers, no recursion *now* — they'll plan
their grandchildren when the runtime expands them. The one executable
child needs no recursion.

**Runtime expansion.** When the playbook runs and `03-characters/03-generation`
fires its WBS, `ctx.spawn` materializes per-character TASK.md files
(`hero-knight-pipeline/`, `forest-elf-pipeline/`, …). For each, the
runtime invokes `converge plan` on the spawned path — *which plans its
own next layer the same way*. Recursion deferred to runtime, but
identical in shape to static recursion.

**Leaf.** Eventually `converge plan` is invoked at
`hero-knight-spritesheet-walk/`. Phase 1 reads the chain root → 03 → 03/03
→ hero-knight → walk, decides "this is a leaf executable," writes a
short PLAN.md with the four checks it cares about (4×4, viewport,
palette, file presence), and phase 2 finalizes the TASK.md as
executable. No recursion. The leaf agent that runs this task later sees
*only* its own TASK.md — same data the planner left for it.

Same files, same tree, same runtime. What changed is: every planning
step ever made decisions about at most 6 children, with at most O(depth)
context to read.

**Course correction with `--update`.** Two weeks later the user wants
to switch art style and drop one engine target. They run:

```bash
converge plan .converge/playbooks/default --update \
  -p "switch art style from fantasy to cyberpunk; drop unity export"
```

Phase 1 at the root re-analyses with the prompt and rewrites root
`PLAN.md`. Phase 2 computes a diff against the previous root plan:

- `01-setup-art-style/` contract changes (style differs) → re-materialize
  TASK.md, recurse with `--update`.
- `06-props/`, `04-tile-maps/`, `05-backgrounds/`: scope changes
  (cyberpunk catalog) → re-materialize, recurse with `--update`.
- `07-export/`: no longer exports Unity → checks shrink → re-materialize.
- `02-asset-breakdown/`, `03-characters/`: no contract change at this
  level (catalog will change but the children are still "analyse +
  generate") → skip recursion at this layer; the recursion they
  themselves trigger will pick up the cyberpunk catalog naturally
  through the new ancestor PLAN.md when their own `--update` runs.

If the user had hand-edited `01-setup-art-style/TASK.md`, the runtime
flags the proposed update as a conflict and leaves the file untouched
until the user resolves it. No silent overwrites of human work.

## Open questions

1. **Rubric for phase 1.** What's the minimum checklist that catches most
   bad layered plans? Candidates: every executable child has at least one
   deterministic check; no two children deliver the same artifact; if one
   child shape repeats it's a single WBS child not N hand-written ones;
   no child's vars contain unresolved placeholders. Needs to be tightened
   against real playbooks.
2. **Idempotency contract.** Tentative: re-running `converge plan <path>`
   overwrites that path's `PLAN.md` (re-analysis is cheap), only fills in
   *missing* child TASK.md files, and does not recurse into children that
   already have a `PLAN.md`. To force a deeper replan, the user deletes
   the subtree's `PLAN.md`s. Needs validation against real edit loops.
3. **When the user wants to override.** A user reading a drafted layer
   may want to edit children. Do they edit TASK.md directly? PLAN.md
   first and re-run? Both, with a flag? The minimum-friction story
   matters because users *will* edit.
4. **WBS planning recursion at runtime.** When a WBS spawns N children
   at runtime, who runs `converge plan` on each — the runtime
   automatically, or the WBS script explicitly via `ctx.plan(child)`?
   Auto is simpler; explicit gives WBS authors control over ordering and
   skipping.
5. **Catalog refs by value vs. by reference.** The art-style packet,
   engine target list, etc. get inlined into every child's vars today.
   Fine at small scale. At large scale, content-addressed pointers the
   framework resolves on read are cheaper. Not urgent, but worth a name.
6. **Debug CLI.** A `converge explain <path>` that prints *me, my
   PLAN.md, my parent's PLAN.md* — three frames, stop — would make the
   contract-chain walk a one-command operation. Complements `converge
   plan`; same path argument.
7. **Migration.** No migration required — existing playbooks keep
   working. New playbooks default to `converge plan`. A linter that flags
   TASK.md bodies reading project files outside their declared vars
   would be a gentle nudge, not a hard rule.

## Next steps

The deliverables are minimal and stack cleanly:

1. **Land this doc.** It's the framing — once teammates and the planner
   itself can point to it, the discipline becomes legible.
2. **Build the `converge-planning` skill** at `skills/converge-planning/`:
   `SKILL.md` (the phase 1 prompt), `rubric.md` (the self-grading
   checklist), and two worked examples (asset-library, doc-site).
3. **Implement `converge plan <path> [-p "<prompt>"] [--update]`** in
   the CLI:
   - Phase 1: gather scope packet (root → ancestors → me, plus the
     optional `-p` prompt), invoke the skill, write `PLAN.md`. If no
     `idea.md` exists, `-p` substitutes for the brief — that's the
     fresh-project flow.
   - Phase 2: materialize child `TASK.md` files; for static-container
     children, recursively invoke `converge plan` on each child path
     (propagating `--update` if the parent ran with it).
   - For WBS children, just write the `wbs:` TASK.md and stop —
     recursion happens at runtime when the WBS spawns its children.
   - `--update` mode: revise existing PLAN.md, diff against previous
     children, re-materialize changed contracts, mark removed children
     `_deprecated/`, flag user-edited divergences without overwriting.
4. **Wire runtime-driven recursion.** When a WBS task expands at run
   time, the runtime auto-invokes `converge plan` on each spawned child
   path before the runner picks it up.
5. **Document once.** A short page under `docs/concepts/` covering the
   protocol. Link from `docs/concepts/dynamic-work-breakdown.md`.
6. **Optional later.** A `converge explain <path>` debug command that
   prints the three-frame contract chain. A linter for TASK.md bodies
   reading project files outside their declared vars. Neither blocks
   shipping.

## One-line recap

> The framework runs a tree; the agents run an org chart. Same data, two
> views. Agents see exactly one level up and one level down — never more.
> A TASK.md *is* the contract; `converge plan <path>` grows the tree
> one layer at a time, recursively, with each planner reading only root
> → ancestors → me.
