# Task: 06-guides/001-articulate-your-goal

# Write `docs/guides/articulate-your-goal.md`

The non-technical "I have a vague idea, how do I shape it" guide. Sits
deeper than `getting-started/from-problem-to-playbook.md`: that page
points the reader at the gallery; this page teaches them to think in
target states.

## Required frontmatter

```yaml
---
title: "Articulating a goal (non-technical)"
description: "Turn a vague idea into a target state Converge can converge on. Discovery questions, anti-patterns, when to split into multiple playbooks."
sources:
  - docs/_examples.json
  - examples/hello-world/.converge/playbooks/default/playbook.yml
sidebar:
  order: 1
---
```

## Required structure

1. **Why this matters** (1 short paragraph). Converge converges on a
   *target state* you declare. If your goal is fuzzy, the agent will
   either over-deliver (build the wrong thing thoroughly) or under-deliver
   (call something done that wasn't).

2. **The three discovery questions.** Walk through each in plain
   English with one example:
   - **What outputs should exist when this is done?** (files, folders,
     a database row, a sent email).
   - **How will you know each output is good enough?** (file exists,
     contains a section heading, validates against a schema, has at
     least N lines, opens without errors).
   - **What's the input?** (a topic file, a configuration file, no
     input — runs on a schedule).

3. **A worked example.** Take a vague goal ("I want a weekly market
   summary email") and walk it down to:
   - outputs: `out/<date>-summary.md`, `out/<date>-summary.html`.
   - checks: file exists; contains the date; ≥3 sections; HTML
     validates.
   - input: `topics.txt` (one ticker per line).
   ~150 words. Tight.

4. **Anti-patterns.** Three or four short ones:
   - **Goal-in-prose-only.** "Make it really good" isn't a check.
   - **Goal-with-no-checks.** Outputs without checks ship whatever the
     agent generates.
   - **Goal too big.** "Build a marketing site, run user research, and
     publish a launch plan" — three playbooks, not one.
   - **Goal that needs the agent to be a person.** "Decide if this
     looks professional" — that's a manual review step the *playbook*
     produces a checklist for, not a check the runtime evaluates.

5. **When to split into multiple playbooks.** Two or three signals:
   - Different inputs / different cadences (research-once vs publish-weekly).
   - Different review owners.
   - Different "done" definitions.

6. **Where to go next.**
   - "Pick the closest example" → [Examples gallery](/examples/).
   - "Walk it through end-to-end" → [From your problem to a playbook](/getting-started/from-problem-to-playbook).
   - "Concept" → [Gap-driven model](/concepts/gap-driven-model).

## Voice

- Plain English. The reader may not have written code in years.
- No yaml in the body until step 3. Even then, only `outputs:` and
  `checks:` — not full frontmatter.
- First-person plural ("we ask three questions").

## Read first

- `docs/_examples.json` — quick scan to ground anti-pattern fixes in
  real examples.
- `examples/hello-world/.converge/playbooks/default/playbook.yml` — the
  simplest possible "outputs + checks" shape.

## Banned

- TypeScript. The reader may have never opened a `.ts` file.
- Schema deep-dives. That's `/reference/playbook-yml`.
- Telling the reader to "just be more specific" without showing how.
  The whole page is the how.