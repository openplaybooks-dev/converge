# Progressive Decomposition (per-layer planner)

## Mission

Plan **one layer** of a converge playbook at a time. Run as the body of
`converge plan <path>`. The CLI invokes you once per node (a playbook root or
a task directory). You **propose** a plan for that node — the user disposes.

> See the design doc: `docs/design/progressive-decomposition.md`.

**Hard rules** (do not bend):

- Do **not** plan grandchildren. Stop at one layer.
- Do **not** read sibling tasks or any node's descendants. The scope packet
  below is exhaustive.
- If something is missing from the scope packet that you'd need to plan
  well, write it under "Open questions" in PLAN.md — do not invent it. The
  parent's planner will see it and can repack.
- Prefer 3–7 children. If a single shape repeats (one per character, one
  per command), use **a single WBS child**, not N hand-written ones.

---

## Inputs

The CLI passes you these as task vars or in the TASK.md body:

- `nodePath` — absolute path to the node being planned.
- `nodeKind` — `"playbook-root"` or `"task"`.
- `playbookRoot` — absolute path to the playbook root (`.converge/playbooks/<name>/`).
- `prompt` (optional) — user-supplied `-p "<prompt>"` argument.
- `mode` — `"fresh"` | `"fill-in"` | `"update"`.

---

## Phase 1 — Read the scope packet, write `PLAN.md`

Read these files in this order. Skip any that don't exist.

1. **Project brief**: `idea.md` (or equivalent) at the project root + the
   playbook's `playbook.yml`. If neither exists and `prompt` was passed,
   the prompt substitutes for the brief.
2. **Root analysis**: `<playbookRoot>/PLAN.md`, if it exists.
3. **Ancestor chain**: for each directory along `<playbookRoot> → ... → <nodePath>`
   (excluding the node itself), read its `PLAN.md` and `TASK.md`.
4. **My own contract**: `<nodePath>/TASK.md`, if my parent already wrote
   one. (The parent's phase 2 wrote it before recursing in.)
5. **User prompt** (`prompt`), appended as "additional intent for this
   invocation."

That is the **scope packet**. It is `O(depth)` — root + ancestors + me.
Never read siblings, cousins, or any node's descendants.

Write `PLAN.md` at `<nodePath>`. It must contain:

- **Goal restatement** — my goal in my own words. (Sanity-check what the
  parent actually asked for.)
- **Decision** — am I a `LEAF EXECUTABLE TASK` or a `CONTAINER`?
- If `CONTAINER`: a list of **3–7 direct children**. Each child has:
  - `id` (kebab-case slug)
  - `title` (one line)
  - `kind` — `executable` | `wbs`
  - `goal` — one sentence
  - `scope` — short sketch of what the parent (me) will pack into the
    child's TASK.md (vars, refs, inlined slices)
  - `outputs` (for executable children) — file paths the child produces
  - `checks` (for executable children) — deterministic predicates
  - `wbs` (for WBS children) — what data drives the fan-out (e.g. "one
    per character in `assets/sprites.json`")
- If `LEAF EXECUTABLE TASK`: a one-paragraph plan for how the work gets
  done, plus the deterministic checks that gate it.
- **Open questions** — anything missing from the scope packet that the
  parent should have packed. These bubble up to the parent's planner.

`PLAN.md` is the analysis surface — auditable and re-runnable. Keep it
*separate* from `TASK.md`; they don't overwrite each other.

---

## Phase 2 — Materialize children

For each child the plan defined, create the directory and write its
`TASK.md`. Use the existing TASK.md schema (see
`preferences/plan-schema.md`):

```
<nodePath>/<child-id>/TASK.md
```

Two child shapes:

| Shape | TASK.md frontmatter | Recursion |
|---|---|---|
| **Executable** | `outputs:` + `checks:` + body. No `wbs:`. | None. The child is ready to run. |
| **WBS** | `wbs:` pointer (script or template). | None *now*. The runtime will plan each spawned child when it expands. |

For **static container** children (children that themselves decompose
into 3–7 hand-written sub-children), recursively invoke the planner on
each. Run this from the project root via Bash:

```bash
converge plan <nodePath>/<child-id>${UPDATE_FLAG:-}
```

…where `UPDATE_FLAG` is `--update` if the current invocation ran with
update mode, else empty. This is how the tree grows — one layer at a
time, breadth-first.

**Do not recurse into**:

- Leaf executable children (no further decomposition).
- WBS children (recursion deferred to runtime — when the WBS spawns a
  child, the runtime invokes `converge plan` on it then).

---

## Modes

The CLI passes `mode` to you. Behavior:

### `fresh`

Nothing at `<nodePath>` yet. Plan from scratch using the brief. Write a
new `PLAN.md`. Phase 2 writes everything new.

### `fill-in` (default re-run)

A `PLAN.md` already exists; some child TASK.md files exist, some don't.
Re-analysis is cheap — overwrite `PLAN.md`. Phase 2 *fills missing*
child TASK.md files. **Do not overwrite existing TASK.md files.** Skip
recursion into children that already have a `PLAN.md`.

### `update`

Treat the existing `PLAN.md` and child set as **drafts to revise**, not
facts to preserve. Be explicit in the new PLAN.md about what changed
and why, so phase 2 can compute a sensible diff:

- *New* children → materialize TASK.md, recurse normally.
- *Removed* children → rename their directory to `_deprecated/<id>/`
  rather than delete. Never silently drop user-touched files.
- *Modified* children whose TASK.md still matches the previous PLAN.md
  → re-materialize with the new contract, recurse with `--update`.
- *Modified* children whose TASK.md has diverged from the previous
  PLAN.md (i.e. a human edited it) → leave the file untouched, write a
  short conflict note in PLAN.md describing the proposed update so the
  user can decide.

> **`converge plan` proposes; the user disposes.**

---

## Apply the rubric

Before declaring done, check `rubric.md`:

- Every executable child has at least one deterministic check.
- No two children deliver the same artifact.
- If a single shape repeats, it's one WBS child (not N).
- No child's vars contain unresolved placeholders.
- Open questions are surfaced, not invented.

---

## Success Criteria

- `<nodePath>/PLAN.md` exists, written in my own words.
- For container nodes: 3–7 direct children, each with a `TASK.md`.
- For leaf nodes: my own `TASK.md` is finalized as executable (with
  outputs + checks).
- For static-container children: `converge plan <child-path>` was
  invoked recursively.
- For WBS / leaf children: no recursion (correctly).
- No grandchildren were planned. No siblings were read.
