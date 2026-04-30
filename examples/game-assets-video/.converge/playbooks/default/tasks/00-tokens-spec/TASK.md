---
title: Tokens Spec
description: Verify that TOKENS_SPEC.md (the principles doc) exists. The spec is hand-written once per project; this task is a fitness gate — it doesn't author or generate anything.
dependencies:
  - "01-art-bible"
inputs:
  - "assets/tokens/SCHEMA.md"
outputs:
  - "assets/tokens/TOKENS_SPEC.md"
checks:
  - id: tokens-spec-exists
    cmd: test -s assets/tokens/TOKENS_SPEC.md
    description: TOKENS_SPEC.md is present and non-empty
  - id: tokens-schema-cross-references-spec
    cmd: |
      grep -q "TOKENS_SPEC.md" assets/tokens/SCHEMA.md
    description: assets/tokens/SCHEMA.md cross-references TOKENS_SPEC.md
tags:
  - planning
  - tokens
---

# 00-tokens-spec — Verify principles doc exists

`assets/tokens/TOKENS_SPEC.md` is the **principles document** for design-token
authoring. It explains:

- what a token is and isn't
- the six categories (ground / hazard / platform / decoration /
  background / marker) and the per-category folder layout
- footprint sizing and when to fork width-variants
- layer eligibility rules
- the sketch contract (suggestive shape, not finished art)
- gameplay-vs-visual responsibility split
- biome forking rules
- an authoring checklist

It is **hand-written once per project**. This task does not invoke
AI; it's a gate that checks the spec exists before downstream tasks
(00-tokens, 05-scenes) try to read it.

If `assets/tokens/TOKENS_SPEC.md` is missing, write it by hand. The
existing example at `examples/game-assets-video/assets/tokens/TOKENS_SPEC.md`
is a good reference template — adapt its structure to your game's
biome set.

## Why this is a separate task

Two concerns:

1. **Cache.** Authoring the spec once and caching it (on file
   existence) means subsequent runs don't re-think principles every
   time we add a biome.
2. **Distinct from `assets/tokens/SCHEMA.md`.** SCHEMA is the file format
   reference (what fields, what enums, validation rules); SPEC is the
   why (principles, design heuristics). Two docs, two concerns. Both
   are inputs to downstream tasks that author tokens (00-tokens)
   or visual mappings (05-scenes).
