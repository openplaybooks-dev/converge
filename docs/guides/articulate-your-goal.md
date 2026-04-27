---
title: "Articulating a goal (non-technical)"
description: "Turn a vague idea into a target state Converge can converge on. Discovery questions, anti-patterns, when to split into multiple playbooks."
sidebar:
  order: 1
---
# Articulating a goal (non-technical)

## Why this matters

Converge converges on a *target state* you declare. If your goal is fuzzy, the agent will either over-deliver — build the wrong thing thoroughly — or under-deliver — call something done that wasn't. Getting the goal crisp means the system can actually tell you when it's finished.

## The three discovery questions

When we work with a new playbook, we ask three questions before writing anything else.

**What outputs should exist when this is done?** Think files, folders, a database row, a sent email. Not "a report" — more like "a PDF named `out/<date>-report.pdf` that contains a summary section." Be specific about the artifact and its location.

**How will you know each output is good enough?** This is the check. "File exists" is a start. But often you need more: the file contains a section heading, validates against a schema, has at least 20 lines, or opens without errors. These checks are what Converge runs to confirm the work is done — not just started.

**What's the input?** Where does the playbook start? A topic file? A configuration? Or nothing — it runs on a schedule and generates output from nothing. Knowing the input shape tells you whether the playbook is one-shot (same input each run) or continuous (input changes over time).

## A worked example

Vague goal: "I want a weekly market summary email."

Worked down, the outputs are:
- `out/<date>-summary.md` — plain text version
- `out/<date>-summary.html` — HTML version

Checks for each:
- File exists at the expected path
- File contains the run date in the body
- File has at least 3 sections (market overview, sector breakdown, outlook)
- HTML version passes a basic tag-closure check

Input: `topics.txt` — one ticker symbol per line. The playbook reads this on each run.

That's it. From "weekly summary" to "reads topics.txt, produces two files with those four checks." The work is bounded and the finish line is visible.

## Anti-patterns

**Goal-in-prose-only.** "Make it really good" or "clean up the output" isn't a check. The agent will do its best, but you won't know if it succeeded until you read the output manually — and even then, "good enough" is subjective. Replace prose with a concrete condition: "contains a top-5 section" or "no broken links."

**Goal with no checks.** Outputs without checks ship whatever the agent generates the first time. If the first run produces garbage, the playbook is broken — you just don't know it yet. Every output needs at least one check that runs automatically.

**Goal too big.** "Build a marketing site, run user research, and publish a launch plan" is three separate playbooks. One playbook = one input, one cadence, one "done." If the goal has multiple independent threads, split them.

**Goal that needs the agent to be a person.** "Decide if this looks professional" is a judgment call no runtime can evaluate. If something requires human eyes, that's a manual review step the playbook produces a checklist for — not a check the runtime runs. Build the checklist, not the judgment.

## When to split into multiple playbooks

Different inputs or different cadences are the clearest signal. A research-once playbook and a publish-weekly playbook should not be the same file — the done states are different, the review cadences are different, the cost of re-running is different.

Different review owners also warrant separation. If one team's review gate is in the loop and another's is after, splitting lets each team move at their own pace without blocking the other.

Different "done" definitions are the third signal. If one stakeholder thinks "done" means the file exists while another thinks "done" means it passed legal review, those are separate playbooks with separate check thresholds — even if they share the same input.

## Where to go next

- Pick the closest example → [Examples gallery](/docs/examples/)
- Walk it through end-to-end → [From your problem to a playbook](/getting-started/from-problem-to-playbook)
- Concept → [Deterministic checks](/concepts/deterministic-checks)
