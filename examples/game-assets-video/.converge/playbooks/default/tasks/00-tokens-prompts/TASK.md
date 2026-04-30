---
title: Token Prompts
description: For each authored token (token.md), produce a per-token image-gen prompt at {token}/prompt.md. The prompt is the SOLE input to the concept-image generator — no reference images, no hidden game.json/ART_BIBLE injection. Authoring this prompt is the lever that controls visual output.
dependencies:
  - "00-tokens"
inputs:
  - "assets/tokens/{biome}/{category}/{id}/token.md"
  - "assets/tokens/SCHEMA.md"
  - "assets/tokens/TOKENS_SPEC.md"
outputs:
  - "assets/tokens/{biome}/{category}/{id}/prompt.md"
checks:
  - id: prompt-mds-present
    cmd: |
      python -c "
      from pathlib import Path
      missing = []
      for d in Path('assets/tokens').iterdir():
          if not d.is_dir():
              continue
          for md in d.rglob('token.md'):
              prompt = md.with_name('prompt.md')
              if not prompt.exists():
                  missing.append(str(prompt))
      assert not missing, f'missing prompt.md: {missing[:5]} ... ({len(missing)} total)'
      "
    description: Every token has a sibling prompt.md
  - id: prompt-mds-nonempty
    cmd: |
      python -c "
      from pathlib import Path
      empty = [str(p) for p in Path('assets/tokens').rglob('prompt.md') if p.stat().st_size < 50]
      assert not empty, f'prompt.md too short (likely placeholder): {empty[:5]}'
      "
    description: Every prompt.md is non-trivially populated (>50 bytes)
tags:
  - planning
  - tokens
---

# 00-tokens-prompts — Author per-token image-gen prompts

For every token authored in `00-tokens`, produce the **image-gen prompt
that will be sent verbatim** to the concept image generator. One file
per token: `{token-folder}/prompt.md`.

This is the **single source of truth** for what the AI paints. The
downstream concept generator reads `prompt.md` byte-for-byte and
dispatches to the API with NO reference images, NO build-time prompt
assembly, NO injection of game.json / ART_BIBLE / camera config.
Whatever you author here is what gets sent.

If the token's painted concept doesn't look right, the fix is here —
not in the script, not in `token.md`, not in `ART_BIBLE.md`. Edit the
prompt and re-run `00-tokens-concepts`.

## What goes in prompt.md

A self-contained image-gen prompt covering at minimum:

- **What the subject is** (e.g. "a 5-tile-wide horizontal slab of
  grassland earth — grass top, dirt body, painted side profile").
- **The rendering style** (painterly 2D / cartoon / pixel-art /
  whatever the project targets — explicitly named, not implied).
- **The viewing angle** (e.g. "strict flat 2D side view; do NOT
  show top surfaces or 3D dimensionality").
- **The palette** (specific hex codes from the project palette, not
  just a vibe — e.g. "Bright Grass Green #76B44F top, Dirt Path Brown
  #A58052 body, Leather Brown #876041 shadow").
- **Background expectation** (chroma-green #00FF00 unless the model
  produces alpha; the downstream matter chroma-keys).
- **Constraints** (size, aspect, no text/UI/extras).

The prompt is markdown but most of it gets sent to the model as plain
text — markdown headings/lists are fine, the model handles them.

## Workflow

The agent running this task walks every `token.md` under
`assets/tokens/{biome}/`, reads the token's footprint, fill, material,
art_notes, and writes a `prompt.md` next to it. The agent applies
the project's art-direction sensibility (consistent style across all
tokens) but does NOT pull from any global config — the prompt content
is decided here, in this task, per token.

If a token already has a `prompt.md` that looks right, skip it.

## Cost

- No paid AI calls in the typical agent-driven flow (the agent uses
  its own context to write the prompts). If you wire up an automated
  AI authoring step instead, expect ~1 cheap text call per token
  (~1¢ each at Gemini text rates).

## Iteration

When you don't like a token's painted concept:
1. Edit its `prompt.md` to fix the issue (be specific).
2. Run `python scripts/generate_token_concepts.py {biome} {token} --force`
   to re-render just that token (~5¢).
3. Eyeball; iterate.
