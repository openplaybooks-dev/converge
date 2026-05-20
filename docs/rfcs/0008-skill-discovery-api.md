---
rfc: 0008
title: Skill discovery API
status: draft
type: feat
source: human
priority_tier: tier1
estimate: "2-3 days"
backwards_compatible: yes
risk: low
---
# RFC 0008: Skill discovery API

## Problem

A spawned task gets its skills via filesystem junctions to `.claude/skills/<name>/`. The AI agent doesn't know which skills are available without reading every directory. At spawn time, the runtime knows exactly which skills are in scope, but it doesn't surface this as a queryable index.

## Proposal

Two surfaces:

### 1. A static `SKILLS.json` written alongside the task TASK.md

When the runtime renders a task's working dir, also write `.SKILLS.json`:

```json
{
  "task": "001-home-03-convert",
  "playbook": "default",
  "skills": [
    {
      "name": "stitch-flutter",
      "description": "Convert constrained HTML to pixel-perfect Flutter widgets (1:1 mapping)",
      "path": ".claude/skills/stitch-flutter/SKILL.md",
      "whenToUse": "When converting design.html to a Flutter screen widget"
    },
    ...
  ]
}
```

The agent's prompt can include a one-line `Available skills: see .SKILLS.json`. The agent reads when needed.

### 2. A `converge skill list` CLI subcommand

```
$ converge skill list --task 001-home-03-convert
NAME              DESCRIPTION                                          WHEN TO USE
stitch-flutter    Tailwind HTML → Pixel-Perfect Flutter                Converting design.html
flutter-building-layouts   ...                                          Layout structure issues
...
```

JSON output via `--json`. Useful for sub-agents and tooling.

## Code-level design

- New module: `packages/core/src/skills/discovery.ts`.
- Hook into the task working-dir writer (alongside CHECK.md / NEEDS.md).
- New CLI subcommand `converge skill list` (lives next to `converge skills list` — the latter is global, the new one is task-scoped).

## Implementation steps

1. Parse SKILL.md frontmatter once at task setup, write `.SKILLS.json`.
2. Add CLI subcommand reading the same index.
3. Document in the cli-seed prompt: "Skills are indexed in `.SKILLS.json` — read this first before any work."

## Test plan

1. Task with 5 skills → SKILLS.json has 5 entries with correct fields.
2. Skill with no description in frontmatter → entry has `description: null`, no crash.
3. CLI returns same content as the JSON file.

## Out of scope

- MCP server exposing skills (could come later, e.g. via an Anthropic MCP wrapper).
- Cross-playbook skill catalog.
