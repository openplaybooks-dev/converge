# Task: 01c-catalog-spec

# 01c-catalog-spec — Asset Catalog

The canonical declaration of every prop's animation behavior. Downstream
prop generators read `assets/catalog.json` instead of inferring intent
from heuristics — so a static prop (ladder, sign post, UI element) is
generated as a 1-frame sheet, a cyclic prop (potion shimmer) gets the
right 8-frame loop cycle, and a trigger prop (spike trap, bounce
spring) gets a coherent state-machine cycle anchored to one position.

Without this catalog, every prop got an 8-frame "idle" cycle regardless
of whether it animated semantically. That produced spike-trap sheets
where 8 unrelated stones replaced an animation, and ladder sheets with
8 near-identical wasted frames.

## How it works

```bash
python3 scripts/decompose_catalog.py
```

1. Reads `idea.md`, `assets/game.json`, `assets/sprites.json`, and
   `assets/objects.json` (or `objects-shared.json`).
2. Calls Gemini text-out with the brief + existing manifests asking for
   one structured JSON catalog (animation_type per prop, keyframes_id
   per prop, tile families per game biome).
3. Validates the response (every prop has `animation_type ∈ {static,
   loop, trigger}`; `keyframes_id` is a known cycle).
4. Writes `assets/catalog.json` plus `assets/catalog.raw.txt` (debug
   sidecar with the raw model response).

## Re-running

`assets/catalog.json` is treated as canonical once produced. The script
short-circuits if the file exists; pass `--force` to regenerate. Editing
`catalog.json` after generation always wins — every downstream prop
task re-reads it.

## Cost

- 1 text-out call (~5¢ on Gemini)

## Outputs

- `assets/catalog.json` — canonical catalog read by every prop generator
- `assets/catalog.raw.txt` — raw model response (debug sidecar)