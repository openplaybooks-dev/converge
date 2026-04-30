---
title: Token Concepts
description: Render concept.png for every token by reading its prompt.md verbatim and dispatching to the image-gen backend. Strict text-to-image — no reference images, no hidden config injection. The chroma-green background is matted out post-gen to produce an RGBA result.
dependencies:
  - "00-tokens-prompts"
inputs:
  - "assets/tokens/{biome}/{category}/{id}/token.md"
  - "assets/tokens/{biome}/{category}/{id}/prompt.md"
outputs:
  - "assets/tokens/{biome}/{category}/{id}/concept.png"
  - "assets/tokens/{biome}/{category}/{id}/seed.txt"
  - "assets/tokens/{biome}/index.json"
checks:
  - id: tokens-concepts-present
    cmd: |
      python -c "
      from pathlib import Path
      missing = []
      for md in Path('assets/tokens').rglob('token.md'):
          concept = md.with_name('concept.png')
          if not concept.exists():
              missing.append(str(concept))
      assert not missing, f'missing concept.png: {missing[:5]} ... ({len(missing)} total)'
      "
    description: Every token has a sibling concept.png
  - id: tokens-compile-clean
    cmd: python scripts/tokens_compile.py --check
    description: Every authored token compiles against the schema (PNG dimensions, alpha, aspect)
  - id: tokens-biome-index-nonempty
    cmd: |
      python -c "
      import json
      from pathlib import Path
      biomes = [d for d in Path('assets/tokens').iterdir() if d.is_dir()]
      assert biomes, 'no biome subdirectories under assets/tokens/'
      for d in biomes:
          idx = d / 'index.json'
          assert idx.exists(), f'missing {idx} — run scripts/tokens_compile.py'
          data = json.loads(idx.read_text())
          assert len(data.get('tokens', [])) >= 8, f'{idx}: only {len(data.get(\"tokens\", []))} tokens (need ≥8)'
      "
    description: Every biome has a compiled index.json with at least 8 tokens
tags:
  - planning
  - tokens
---

# 00-tokens-concepts — Render painted concept.png from prompt.md

For every token with a `prompt.md`, render its `concept.png`. The
generator reads `prompt.md` byte-for-byte and sends it as the sole
prompt to the image-gen backend. No reference images attach; no
config is injected; no `build_prompt()` assembly happens. **What's in
`prompt.md` is exactly what the model receives.**

After image-gen, the chroma-green background is keyed out via
`lib.matting.matte_in_place`, producing an RGBA `concept.png`. The
token's `token.md` frontmatter is updated with the actual rendered
size in `sketch.size_px`.

## Workflow

```bash
python3 scripts/generate_token_concepts.py {biome}              # all tokens in biome
python3 scripts/generate_token_concepts.py {biome} {token} --force  # one token, re-render
python3 scripts/tokens_compile.py {biome}                       # validates and emits index.json
```

The script:

1. Walks every `token.md` under `assets/tokens/{biome}/`.
2. Reads `{token}/prompt.md` (FAILS LOUD if missing).
3. Computes target dimensions from the token's footprint
   (long side 1024 px; short side scaled to footprint aspect).
4. Calls `lib.image_api.generate_image(prompt, reference_paths=None,
   aspect_ratio, resolution)` — strict text-to-image.
5. Validates output (size + aspect within ±2 px / ±5%).
6. Mattes the chroma-green background out (skipped if model returned
   alpha already).
7. Writes `concept.png` + `seed.txt`; rewrites `token.md` so
   `sketch.file: concept.png` and `sketch.size_px: [W, H]` reflect
   actual dimensions.

Then `tokens_compile.py` walks every token, validates the PNG against
the schema, and emits `assets/tokens/{biome}/index.json`.

## Cost

- ~5¢ per token × ~24 tokens = ≈$1.20 per biome (Gemini 2.5 Flash Image).
- Cached on `concept.png` existence; pass `--force` to re-render.

## Iteration

When a token's painted concept is wrong:
1. Edit `{token}/prompt.md` to fix the issue (this is the lever).
2. `python scripts/generate_token_concepts.py {biome} {token} --force`.
3. `python scripts/tokens_compile.py {biome}` to refresh the index.
