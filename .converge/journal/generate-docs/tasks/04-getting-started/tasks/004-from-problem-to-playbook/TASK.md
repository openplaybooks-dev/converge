---
id: 004-from-problem-to-playbook
title: Write docs/getting-started/from-problem-to-playbook.md
inputs:
  - docs/_examples.json
  - examples
outputs:
  - docs/getting-started/from-problem-to-playbook.md
checks:
  - id: page-exists
    cmd: "test -f docs/getting-started/from-problem-to-playbook.md"
    description: page exists
  - id: page-frontmatter
    cmd: "head -10 docs/getting-started/from-problem-to-playbook.md | grep -q '^title:' && head -10 docs/getting-started/from-problem-to-playbook.md | grep -q '^sources:'"
    description: title + sources frontmatter
  - id: links-to-examples-gallery
    cmd: "grep -qE '\\(/examples/|\\(\\.\\./examples/' docs/getting-started/from-problem-to-playbook.md"
    description: links to the examples gallery
  - id: shows-three-questions
    cmd: "grep -qiE 'what.*done|what.*success|what.*output' docs/getting-started/from-problem-to-playbook.md"
    description: page asks the reader to define what 'done' looks like
  - id: word-count-ok
    cmd: "test -f docs/getting-started/from-problem-to-playbook.md && wc -w docs/getting-started/from-problem-to-playbook.md | awk '{exit ($1>=500&&$1<=1500?0:1)}'"
    description: 500-1500 words
---

# Write `docs/getting-started/from-problem-to-playbook.md`

The non-coder onramp. A reader who has a real-world problem (not a coding
project) lands here after `your-first-playbook.md` and figures out:

1. How to articulate their goal in a way Converge can use.
2. Which example is the closest match.
3. How to copy it and tweak it without touching code beyond editing
   markdown files.

The page is written in **plain English**. No yaml in the body until step
3 (and even then, only the bare minimum). Code blocks should be
shell-only or markdown — no TypeScript.

## Required frontmatter

```yaml
---
title: "From your problem to a playbook"
description: "Turn a real-world goal into a working playbook by picking the closest example and tweaking it. Written for non-technical readers."
sources:
  - docs/_examples.json
  - examples/hello-world/README.md
  - examples/deep-research/README.md
sidebar:
  order: 4
---
```

## Required structure

### 1. Who this page is for (1 paragraph)

"You have a real problem you want to solve repeatedly — research a topic,
generate a report each week, simulate a scenario, build a thing. You're
not a software engineer. This page shows you how to turn that problem
into a Converge playbook by starting from a working example."

### 2. Step 1 — Define what "done" looks like (3 questions, ~150 words)

Three concrete questions the reader answers in a paragraph each:

- **What do you want to *exist* when this is done?** (a folder of reports,
  a simulation log, a styled marketing page, a security findings file).
- **How will you know it's good enough?** (file exists, has a certain
  shape, references the right sources, passes a manual review checklist).
- **How often do you want to run it?** (once, weekly, every time the
  source data changes).

Frame these as the same three things every Converge playbook declares:
**outputs** (what exists), **checks** (how you verify it), and the
**run mode** (oneoff vs continuous).

### 3. Step 2 — Find the closest example (~200 words)

Send the reader to the [Examples gallery](/examples/). Walk them through
the categories (Learning, Building software, Research, Creative + simulation,
Security, Agent protocol) and what kind of problem each category fits.

Use 3-4 example "if your goal is X, start from Y" mappings drawn from
`docs/_examples.json`. For instance:

- "I want to research a topic deeply each week" → start from
  [`deep-research`](/examples/research/deep-research).
- "I want to generate a stylized one-page site" → start from
  [`fullstack-app`](/examples/software/fullstack-app) or
  [`stitch-to-flutter`](/examples/software/stitch-to-flutter).
- "I want to simulate a social scenario" → start from
  [`social-sim`](/examples/creative/social-sim).
- "I want to test a website's security" → start from
  [`autonomous-pentest`](/examples/security/autonomous-pentest).

### 4. Step 3 — Copy and tweak (~200 words)

Concrete walk:

1. `cp -r examples/<example>/ my-project/` (or download from GitHub).
2. Open `my-project/<example>/.converge/playbooks/default/playbook.yml`
   and rename it.
3. Find the `outputs:` and `checks:` sections of the top-level tasks and
   adjust them to *your* outputs.
4. Replace any topic-specific input files (e.g. `idea.md`,
   `topic.md`, `target.txt`) with your own.
5. Run `converge run` from inside `my-project/`.

Keep the explanation tight — the reader is replacing nouns, not writing
code.

### 5. Step 4 — When you get stuck (~100 words)

Three sign-posts:

- "If the run errors out" → [Troubleshooting](/troubleshooting/).
- "If you're not sure what a setting does" → [Reference](/reference/playbook-yml).
- "If you want to understand the model" → [Gap-driven model](/concepts/gap-driven-model).

### 6. The "you don't need to code" promise (1 short paragraph)

The reader is editing markdown and yaml. The agent writes the actual
work. If they find themselves opening TypeScript files, they've gone past
the non-technical track — link forward to [Build a software project](/guides/build-a-software-project).

## Read first

- `docs/_examples.json` — the canonical list of examples with categories
  and taglines. Mappings in step 3 must reference real entries.
- `examples/hello-world/README.md` and `examples/deep-research/README.md` —
  use these to ground the "closest example" recommendations.

## Banned

- TypeScript snippets in the body. The reader is non-technical.
- Long YAML walkthroughs. Step 3 says "find outputs/checks and replace" —
  not "here is the playbook.yml schema".
- A patronizing tone. The reader is smart, just not a programmer.
- Telling the reader to "just install the framework" without linking back
  to [Install](/getting-started/install).
- Inventing examples that aren't in `docs/_examples.json`.
