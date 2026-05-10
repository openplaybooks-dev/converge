---
id: 00-taste-calibration
title: Taste Calibration for Premium Dev-Tool Naming
description: Build a taste model from excellent developer brands before generating names.
outputs:
  - artifacts/name-exploration/taste-calibration.md
  - artifacts/name-exploration/taste-principles.json
checks:
  - id: taste-md-exists
    cmd: test -s artifacts/name-exploration/taste-calibration.md
    description: Taste calibration memo exists
  - id: taste-json-valid
    cmd: jq empty artifacts/name-exploration/taste-principles.json
    description: Taste principles JSON is valid
  - id: has-patterns
    cmd: jq -e '.patterns | length >= 12' artifacts/name-exploration/taste-principles.json
    description: At least 12 positive naming patterns captured
  - id: has-kill-rules
    cmd: jq -e '.kill_rules | length >= 12' artifacts/name-exploration/taste-principles.json
    description: At least 12 rejection rules captured
---

# Taste Calibration

Before naming, analyze why excellent developer-tool names work: Vite, Linear, Stripe, Prisma, Temporal, Dagster, Vercel, Svelte, Bun, Raycast, Tailscale, Fly, Supabase, Turborepo, and Playwright.

Write `taste-calibration.md` with:

- what makes each reference name strong, weak, or risky;
- phonetic patterns: length, syllables, consonant shape, CLI feel;
- semantic patterns: concrete nouns, altered real words, technical primitives, craft metaphors, motion, proof, speed, clarity;
- what makes a name feel premium rather than random SaaS coinage;
- examples of names to reject and why.

Write `taste-principles.json`:

```json
{
  "patterns": ["short concrete real word with product metaphor"],
  "anti_patterns": ["Agent/AI/Lang/Chain/Crew prefix"],
  "kill_rules": ["reject names that need a paragraph to justify"],
  "preferred_shapes": ["4-8 letters", "1-2 syllables", "easy shell command"],
  "reference_lessons": [{"name":"Vite","lesson":"..."}]
}
```
