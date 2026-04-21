---
id: 002-synopsis
title: Write Synopsis
description: Expand logline into a one-page synopsis covering act structure.
dependencies:
  - 001-logline
inputs:
  - idea.md
  - logline.md
outputs:
  - synopsis.md
checks:
  - id: synopsis-exists
    cmd: test -s synopsis.md
    description: Synopsis file written and non-empty
  - id: synopsis-has-acts
    cmd: grep -E '^##? (Act|ACT) [1-3]' synopsis.md
    description: Synopsis covers all three acts
---

# Write Synopsis

Expand the logline into a one-page synopsis.

## Required sections

```markdown
# Synopsis

## Act 1 — Setup
<ordinary world, protagonist, inciting incident, decision to act — 4-6 sentences>

## Act 2 — Confrontation
<escalating attempts, midpoint reversal, lowest point — 6-10 sentences>

## Act 3 — Resolution
<climax, resolution, new equilibrium — 3-5 sentences>

## Theme
<what the film is really about, in one sentence>
```

## Constraints

- Preserve every concrete detail from `idea.md` — don't drop named props, settings, or character traits.
- Do not invent new characters yet (cast extraction happens in 02-cast).
- Keep the tone described in `idea.md`.
