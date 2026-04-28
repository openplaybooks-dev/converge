# Progressive Decomposition

> Design principle for the next iteration of the Converge interface.
>
> Status: proposal. Branch: `claude/simplify-converge-interface-GIZtD`.
>
> **Scope: mental model only.** No breaking changes. A TASK.md *is* the
> delegation contract today — `title`/`description` is the goal, `outputs` +
> `checks` are what proves it's done, the parent's `wbs:` script writing this
> TASK.md *is* the act of decomposition, and `vars` interpolated into the
> template body *is* the scope packet. Nothing in this doc proposes a new
> schema or runtime change. What we're shipping is (a) the framing in this
> document, and (b) a **`converge-planning`** skill that operationalizes it.

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
  every TASK.md: goal (title/description), scope (vars + parent-supplied
  body), checks (frontmatter `checks`), children (the `wbs:` script that will
  emit them, when this task decomposes).
- **Information only flows through contracts.** Parent → child = contract
  (the TASK.md the parent's WBS materializes). Child → parent = artifact +
  the implicit receipt that its `checks` passed. No grandparent reads, no
  sibling peeks, no descendant lookahead.
- **Planning happens one layer at a time.** A planner writing a new playbook
  drafts only its direct children — it does *not* sketch grandchildren. Each
  child, when it runs, will plan its own children. Recursively. This is what
  the `converge-planning` skill enforces.

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

## A task is its own delegation contract

We don't introduce a new "Contract" type. The TASK.md you write today already
*is* the contract. Read the four fields off the existing format:

| Contract field | Where it already lives in TASK.md |
|---|---|
| **Goal** | `title:` + `description:` (and the markdown body, when prose is needed). What I was asked to deliver. |
| **Scope** | `vars` interpolated into the TASK.md when the parent's `wbs:` script materialized it, plus any catalog refs the parent embedded in the body. The packet my parent handed me. |
| **Checks** | `outputs:` and `checks:` in the frontmatter. What proves I delivered. |
| **Children** | The `wbs:` script (or `tasks:` list, for static fan-out). When I decompose, this is how I write contracts for my direct children. |

That's it. Nothing new gets added; what changes is the *discipline* of how
parents write each field. Specifically:

1. **Goal**: written by the parent in its own words. Not a paste of the
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

## Decomposition: plan one layer, recursively

The single biggest change is in *how planning happens*. Today, a planner —
human or LLM — sits down with the brief and tries to design the whole tree:
phases, sub-phases, leaves, the works. That's combinatorial, hard to verify,
and produces playbooks where deep leaves carry assumptions the planner
guessed at three layers up.

Under progressive decomposition, the planner's job at any node is purely:

> Given my contract, draft 3–7 direct child contracts whose deliverables
> collectively satisfy mine. Stop there.

No lookahead into how children will themselves decompose — that's the child's
problem, recursively. No siblings to consult. No grandparent to defer to.

When the playbook starts running, each child task either does its own work
(if it's a leaf) or runs the same "draft 3–7 children" exercise itself. The
tree grows lazily, one layer per parent execution. Complex problems get
solved by **layered simple todos**: at every level, the agent only ever sees
a flat list of 3–7 things to figure out, *its own*.

This is what `converge-planning` (next section) operationalizes.

The 3–7 bound is an editorial constraint, not a hard limit. If a node would
fan to 50 children, it should usually split first into 5 groupings of 10.
The bound exists because:

- Decomposition quality drops when a single agent has to hold 50 distinct
  child contracts in working memory.
- Debugging contract-chain walks (below) stay shallow when fan-out is small.

WBS-style runtime fan-out (one task per item in a discovered list) is the
allowed exception: the parent decomposes into a *single* fixed-shape
"per-item" contract template plus an iterator. The framework instantiates
the contracts; the agent doesn't have to draft 50 by hand. From the
planner's perspective, this still counts as "one child shape to think
about," not 50.

## The `converge-planning` skill

This is the concrete deliverable that pairs with the framing. Today,
planning a playbook is freeform: the user describes a goal, an LLM tries to
imagine the whole task tree, and the result lands as a sprawling set of
TASK.md files that the user then has to read end-to-end.

`converge-planning` is a skill (in the Claude Code "skill" sense — invokable
via `/converge-planning` or by name) that enforces layered planning. Its
contract with the user:

1. **It only ever plans one layer.** Given the current contract — at the
   first call, that's the root contract derived from the user's brief — the
   skill drafts 3–7 direct children. It does not write grandchildren. It
   does not sketch leaves. It produces TASK.md files for the immediate next
   layer and stops.
2. **It works from scope, not from the world.** Inputs to the skill are:
   - The current task's goal (user brief at the root; parent's contract
     otherwise).
   - The scope packet (vars + artifacts the parent threaded in).
   That's it. The skill does not read sibling tasks, does not traverse the
   tree, does not pull in arbitrary project files unless they're explicitly
   in scope.
3. **It outputs four-field children.** Each child the skill produces is a
   TASK.md whose four contract fields are filled out:
   - `title` + `description` (goal).
   - `vars` and any inlined catalog refs the parent pre-bakes (scope).
   - `outputs` + `checks` (deterministic verification).
   - Either `wbs:` (this child will decompose further when run) or no `wbs:`
     (this child is a leaf).
4. **It is recursive by being re-invokable.** When a non-leaf child later
   runs, *the same skill* gets called inside that child's `wbs:`, with that
   child's contract as the new root. Same prompt, smaller problem. The
   recursion is a property of *when* the skill is called, not of the skill's
   internal structure.

Skill structure (concrete sketch — fits the existing `skills/` layout):

```
skills/
  converge-planning/
    SKILL.md            # invocation contract & prompt
    rubric.md           # checklist the planner self-applies
    examples/
      asset-library.md  # worked example: root → 6 children
      doc-site.md       # worked example: section → 4 sub-sections
```

The `SKILL.md` prompt (sketch):

```
You are planning ONE layer of a Converge task tree.

You will be given:
  - GOAL: what this node was asked to deliver.
  - SCOPE: the packet handed to this node by its parent (vars + inlined refs).

Your job: draft 3–7 child TASK.md files whose deliverables collectively
satisfy GOAL. Each child must have:
  - title + description (the child's goal, in your words)
  - outputs + checks (what proves it delivered)
  - vars (the scope you are handing this child)
  - either a `wbs:` pointer (the child will plan further when it runs) or
    no `wbs:` (the child is a leaf and will do work directly)

Hard rules:
  - Do NOT plan grandchildren. Stop at one layer.
  - Do NOT reference siblings. Each child's scope is self-contained — if
    child B needs child A's output, declare a dependency and let the runtime
    thread A's artifact into B's scope at run time.
  - Do NOT read project files outside SCOPE. If you need something not in
    scope, that's a contract bug to flag, not a license to wander.
  - Prefer 3–7 children. If a single shape repeats (one per character, one
    per command), use a `wbs:` script with a per-item template — that
    counts as one child.

Apply rubric.md to your draft before returning.
```

The rubric is a small checklist: every child has measurable checks, no
child's `vars` references the literal string "TODO," no two children
deliver the same artifact, etc. The skill self-grades against it before
returning.

A user planning a new playbook ends up running `/converge-planning` *once*
to get the root layer, then `converge run` from then on — and the same
skill fires inside each non-leaf task to plan its own next layer, just in
time, with full context of what its parent actually packed.

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

- **Planning is layered.** A TASK.md author — or `converge-planning` — drafts
  only direct children. Grandchildren are the children's problem.
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

## Worked example: game-assets, reframed in the same data model

`examples/game-assets` already runs. The reframing is purely about *who
plans what, when, and what they look at while planning*. No file moves.

**Root layer.** A user runs `/converge-planning` against `idea.md`. The
skill reads the brief and the playbook's vars, and drafts six TASK.md files
under `.converge/playbooks/default/tasks/` — exactly the existing list:

```
01-setup-art-style/   (leaf — produces art-style packet + manifests)
02-asset-breakdown/   (leaf — extends manifests)
03-characters/        (decomposes — has wbs:)
04-tile-maps/         (decomposes — has wbs:)
05-backgrounds/       (decomposes — has wbs:)
06-props/             (decomposes — has wbs:)
07-export/            (leaf — aggregates atlases)
```

The skill stops here. It does *not* draft anything inside `03-characters/`,
because that's not its layer.

**Layer 2: characters.** When `03-characters` runs, its `wbs:` invokes
`converge-planning` (or a deterministic Node script — author's choice). The
planner now has *only* the characters contract: produce all character
spritesheets matching the catalog + art style. Its scope is the slice of
the manifests for characters plus the art-style packet — the parent
inlined those before invoking the planner. It drafts three children:
`01-analysis`, `02-shared-references`, `03-generation`. It doesn't draft
per-character pipelines yet — those are `03-generation`'s problem.

**Layer 3: per-character generation.** When `03-characters/03-generation`
runs, *its* `wbs:` plans again. Now the input is "produce all character
spritesheets" with hero-knight, forest-elf, etc. in scope. The script
(today already a deterministic JS WBS) emits per-character pipelines.

**Leaf.** The `hero-knight-spritesheet-walk` TASK.md gets materialized with
its parent threading in: art-style packet, character canonical ref, class
style guide, walk-state keyframe spec. The leaf agent reads its own
TASK.md, runs the work, and the framework verifies its checks. It has *no
idea* that backgrounds, tile maps, or props exist. It doesn't need to.

Same files, same tree, same runtime. What changed is that no single
planning step ever had to think about more than one layer at a time.

## Open questions

1. **`converge-planning` rubric.** What's the minimum checklist that catches
   most bad layered plans? Candidates: every child has at least one
   deterministic check; no two children deliver the same artifact; if one
   child shape repeats, it's a single `wbs:` not N hand-written siblings;
   no child's vars contain unresolved placeholders. Needs to be tightened
   against real playbooks.
2. **When the planner is wrong.** If the user reads the drafted layer and
   wants to override it, what's the minimum-friction loop? Probably just:
   edit the TASK.md files and re-run. But we should make sure the skill
   doesn't keep regenerating over user edits — easy to get wrong.
3. **Recursive invocation.** Should a non-leaf TASK.md's `wbs:` literally
   call the `converge-planning` skill, or should we let authors choose
   between "skill-driven decomposition" (LLM) and "deterministic
   decomposition" (a normal Node WBS script)? Probably both — the skill is
   for when the planner needs to think; a deterministic script is for when
   the children are a mechanical fan-out (one per character).
4. **Catalog refs by value vs. by reference.** The art-style packet, engine
   target list, etc. get inlined into every child's vars today. That's
   fine at small scale. At large scale, a single content-addressed pointer
   that the framework resolves on read would be cheaper. Not urgent, but
   worth a name when we hit it.
5. **Debug CLI.** A `converge explain <task-id>` that prints exactly *me,
   my contract, my parent's decomposition* — three frames, stop — would
   make the contract-chain walk a one-command operation. Today's
   `converge status` keeps showing the framework view; the new command
   would show the agent view.
6. **Migration.** No migration is required — playbooks keep working. We do
   want to *encourage* moving toward parent-mediated scope. A linter that
   flags TASK.md bodies which read project files outside their declared
   vars would be a gentle nudge, not a hard rule.

## Next steps

No code changes required. The deliverables are:

1. **Land this doc.** It's the framing — once teammates and the planner
   itself can point to it, the discipline becomes legible.
2. **Build the `converge-planning` skill** under `skills/converge-planning/`:
   `SKILL.md` (the prompt above), `rubric.md` (the checklist), and a couple
   of worked examples (asset-library, doc-site). The skill should be
   invokable both interactively (`/converge-planning`) and from a TASK.md's
   `wbs:` (so non-leaf tasks can plan their own next layer).
3. **Document the discipline once.** A short page under `docs/concepts/`
   that says: a TASK.md is its own delegation contract; planning is one
   layer at a time; agents see one level up and one level down. Link from
   `docs/concepts/dynamic-work-breakdown.md`.
4. **Optional later.** A `converge explain <task-id>` debug command that
   prints the three-frame contract chain. A linter that flags TASK.md
   bodies which read project files outside their declared vars. Neither
   blocks shipping the framing.

## One-line recap

> The framework runs a tree; the agents run an org chart. Same data, two
> views. Agents see exactly one level up and one level down — never more.
> A TASK.md *is* the contract; `converge-planning` is how we plan one
> layer at a time, recursively.
