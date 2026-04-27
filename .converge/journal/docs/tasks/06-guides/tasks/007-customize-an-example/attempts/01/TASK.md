# Task: 06-guides/007-customize-an-example

# Write `docs/guides/customize-an-example.md`

Operationalizes the gallery. The reader has copied an example; this
page tells them exactly what to edit first, in what order, and how to
verify each change.

## Required frontmatter

```yaml
---
title: "Customize an example"
description: "You've copied an example — now what? The 4-5 files most readers edit first, in order."
sources:
  - docs/_examples.json
  - examples/cinematic-video-production/README.md
  - examples/data-pipeline/.converge/playbooks/default/playbook.yml
sidebar:
  order: 7
---
```

## Required structure

1. **Mental model first** (1 short paragraph). Examples are starting
   points, not templates to reverence. Every example has 3-5 "input
   surface" files that determine what gets generated. Editing those is
   90% of customization.

2. **The five edit targets** (the bulk of the page). For each, explain
   what it is, what to look for, and what to change. Order matters:

   ### A. The project root input file (if any)
   Many examples have an `idea.md`, `topic.md`, `target.md`, or similar
   at the project root. Replace its contents with your topic / brief /
   target spec. **Edit first.** This often determines everything
   downstream.

   ### B. The top-level `playbook.yml`
   Open `examples/<your-copy>/.converge/playbooks/default/playbook.yml`.
   Tweak:
   - `name:` — rename to your project.
   - `description:` — describe your goal.
   - `run.maxIterations:` — bump if your problem is bigger than the
     example's.

   ### C. The first phase's `outputs:` and `checks:`
   Open the first phase's `TASK.md`. The `outputs:` and `checks:` lists
   describe what "done" means for that phase. Adjust them to your
   target shape.

   ### D. Per-item template inputs (for fan-out examples)
   If the example uses WBS (e.g.
   `cinematic-video-production` fans out per shot), there's usually a
   manifest file the WBS reads — `shots.json`, `screens.json`,
   `topics.json`. Replace its contents with your list.

   ### E. Provider config in `.converge/project.yml`
   Optional but worth a look: pick the provider / model that matches
   your budget. Link to [Switch providers](/guides/switch-providers).

3. **Verify-as-you-go.** Encourage the reader to:
   - Run `converge run` after each change.
   - Watch the journal (link to [Read the journal](/guides/read-the-journal)).
   - Stop when something unexpected happens — ask "did my change cause
     this?" before changing more.

4. **What NOT to edit (yet).**
   - The TS files under `packages/` — that's framework code.
   - The WBS scripts (`wbs/index.js`) — usually you change the manifest,
     not the spawn logic.
   - The check `cmd:` strings — unless the check itself is wrong, the
     check is the contract.

5. **Where to go next.**
   - [Troubleshooting](/troubleshooting/) — when an edit causes a stuck
     run.
   - [Reference: playbook.yml](/reference/playbook-yml) — for the
     schema-level detail of any field you're editing.
   - [Reference: TASK.md](/reference/task-md) — for the leaf vs WBS
     distinction.

## Read first

- `docs/_examples.json` — pick 1-2 examples to ground the "edit
  targets" with concrete file names.
- `examples/cinematic-video-production/README.md` — for the canonical
  fan-out shape.
- `examples/data-pipeline/.converge/playbooks/default/playbook.yml` —
  for the canonical pipeline shape.

## Banned

- A 50-step walkthrough. Five edit targets, in order, max.
- Telling the reader to "just understand the schema". The point of this
  page is they shouldn't have to.
- Code-level deep dives. Link to Reference for those.