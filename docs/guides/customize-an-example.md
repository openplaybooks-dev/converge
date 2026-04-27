---
title: "Customize an example"
description: "You've copied an example — now what? The 4-5 files most readers edit first, in order."
sidebar:
  order: 7
---
Examples are starting points, not templates to reverence. Every example has 3-5 "input surface" files that determine what gets generated. Editing those is 90% of customization. The order matters — start at the top and work down.

## The five edit targets

### A. The project root input file

Many examples have an `idea.md`, `topic.md`, `target.md`, or similar at the project root. Replace its contents with your topic / brief / target spec. **Edit first.** This often determines everything downstream.

For example, `cinematic-video-production` expects an `idea.md` at its root — that's your story concept. Replace it with your pitch. The `data-pipeline` example uses a similar pattern: the root file defines what data you're processing and why.

When you change the root input, watch what changes downstream. If nothing moves, double-check the playbook's first phase to confirm it reads that file.

### B. The top-level `playbook.yml`

Open `examples/<your-copy>/.converge/playbooks/default/playbook.yml`. Tweak:

- `name:` — rename to your project
- `description:` — describe your goal
- `run.maxIterations:` — bump if your problem is bigger than the example's

This is where you signal that this is *your* run, not a repeat of the example's intent. The `maxIterations` setting is especially worth checking if you're working on a larger problem than the example was designed for — running out of iterations mid-pipeline is a common frustration.

### C. The first phase's `outputs:` and `checks:`

Open the first phase's `TASK.md`. The `outputs:` and `checks:` lists describe what "done" means for that phase. Adjust them to your target shape.

For pipeline examples like `data-pipeline`, the first phase outputs define the data source and format you'll work from. For fan-out examples like `cinematic-video-production`, the first phase establishes the story structure you'll build on.

The outputs list controls which artifacts get created. If your version needs a different artifact, add it. The checks list is a contract — if the check passes, the phase is done. Don't disable checks to make a phase "pass" faster; fix the underlying issue instead.

### D. Per-item template inputs (for fan-out examples)

If the example uses WBS (Work Breakdown Structure) — like `cinematic-video-production` fans out per shot — there's usually a manifest file the WBS reads: `shots.json`, `screens.json`, `topics.json`. Replace its contents with your list.

The manifest file is the contract between you and the spawner. Change the manifest, change what gets generated. Leave the spawn logic alone.

When editing a manifest, keep the structure intact — same keys, same types — just change the values. If the WBS script can't parse your manifest, it will fail loudly. That's intentional: it means your input doesn't match what the example expected.

### E. Provider config in `.converge/project.yml`

Optional but worth a look: pick the provider / model that matches your budget and latency requirements. Each model has different capabilities and cost profiles. See [Switch providers](/guides/switch-providers) for the full list of options and tradeoffs.

## Verify as you go

After each change:

1. Run `converge run`
2. Watch the journal for unexpected artifacts or missing outputs — see [Read the journal](/guides/read-the-journal) for how to interpret what you see
3. When something unexpected happens, ask "did my change cause this?" before changing more

Stop when the output matches your intent. Don't keep editing to "fix" something that isn't broken. If a check fails, the question isn't "how do I make the check pass" — it's "why is the output wrong, and is my change the cause?"

## What NOT to edit (yet)

- The TS files under `packages/` — that's framework code, not user input
- The WBS scripts (`wbs/index.js`) — usually you change the manifest, not the spawn logic. The spawner is designed to be generic; the manifest is the specific part
- The check `cmd:` strings — unless the check itself is wrong, the check is the contract. A failing check is information, not an inconvenience to remove

## Where to go next

- [Troubleshooting](/troubleshooting/) — when an edit causes a stuck run
- [Reference: playbook.yml](/reference/playbook-yml) — schema-level detail of any field you're editing
- [Reference: TASK.md](/reference/task-md) — the leaf vs WBS distinction

See the [Examples gallery](/docs/examples/) for the full list of examples you can copy, run, and customize.
