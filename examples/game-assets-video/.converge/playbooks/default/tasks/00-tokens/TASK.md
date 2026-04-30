---
title: Tokens
description: AI authors a vocabulary of named design tokens (frontmatter spec only — id, footprint, layers, gameplay, visual attributes) into per-asset folders. Concept images and image-gen prompts are produced by separate downstream tasks (00-tokens-prompts, 00-tokens-concepts).
dependencies:
  - "01-art-bible"
  - "00-tokens-spec"
inputs:
  - "idea.md"
  - "assets/ART_BIBLE.md"
  - "assets/game.json"
  - "assets/tokens/SCHEMA.md"
  - "assets/tokens/TOKENS_SPEC.md"
outputs:
  - "assets/tokens/{biome}/{category}/{id}/token.md"
checks:
  - id: tokens-schema-present
    cmd: test -s assets/tokens/SCHEMA.md
    description: Tokens schema doc exists
  - id: token-mds-authored
    cmd: |
      python -c "
      import json
      from pathlib import Path
      biomes = [d for d in Path('assets/tokens').iterdir() if d.is_dir()]
      assert biomes, 'no biome subdirectories under assets/tokens/'
      for d in biomes:
          mds = list(d.rglob('token.md'))
          assert len(mds) >= 8, f'{d.name}: only {len(mds)} token.md authored (need ≥8)'
      "
    description: Every biome has at least 8 token.md files authored
tags:
  - planning
  - tokens
---

# 00-tokens — Per-Biome Token Frontmatter Authoring

Author the named-token vocabulary every scene composes from.
A token is a **named, reusable visual element** with three things:

- a **body** (footprint + anchor)
- a **concept image** (a painted PNG showing the token in the project's style)
- **visual attributes** (color, material, layer eligibility, art notes)

**This task only authors `token.md` (the frontmatter spec) for each token.**
The concept image and the image-gen prompt are produced by the two
downstream tasks `00-tokens-prompts` and `00-tokens-concepts`.

This task runs **once per game** and is cached per biome — biomes
whose `assets/tokens/{biome}/` already contain the expected number of
authored `token.md` files are skipped on subsequent runs.

See `MODERN_SIDE_SCROLL_SPEC.md` §3 and `assets/tokens/SCHEMA.md`.

## Workflow

```bash
python3 scripts/author_tokens.py
```

The script:

1. Reads `assets/game.json` to discover declared biomes.
2. For each biome whose `assets/tokens/{biome}/` is empty:
   - Loads `idea.md`, `assets/ART_BIBLE.md`, `assets/tokens/SCHEMA.md`,
     `assets/tokens/TOKENS_SPEC.md`, and (if present) the existing
     `assets/tokens/grassland/{cat}/{id}/token.md` exemplars.
   - Calls AI (one text call per biome) to produce 15–30 token MDs
     covering ground / hazard / platform / decoration / background /
     marker categories.
   - Writes each token's frontmatter to
     `assets/tokens/{biome}/{category}/{id}/token.md`.

Every paid AI call is gated through `lib.budget.charged`.

## Cost

- ≈1 AI text call per biome (≈1¢). Validation is free.

## Re-authoring

To re-author a biome's tokens from scratch, delete its
`assets/tokens/{biome}/` subdirectory and re-run.
