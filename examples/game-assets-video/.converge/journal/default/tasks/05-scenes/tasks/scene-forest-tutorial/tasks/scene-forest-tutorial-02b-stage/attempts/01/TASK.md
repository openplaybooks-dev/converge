# Task: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02b-stage

# Scene `forest-tutorial` — stage blueprint

## Role

You are a **paid-API operator**. Run the script and report its real result. Do **NOT** hand-author the JSON — the script's whole point is to use the model's understanding of the scene description and biome to design a coherent playable layout that other tasks downstream consume.

## What this produces

`assets/scenes/forest-tutorial/stage.json` — the **blueprint everyone downstream reads**. It defines:

- `world.width_tiles` × `world.height_tiles` — the playable area, in tile units. This is the source of truth for canvas dimensions across the rest of the pipeline.
- `chunks[]` — the scene split into contiguous left-to-right sections. Each chunk has its own `ground_type` (which tile family covers the floor), narrative (used to prompt per-segment background generation later), and `scene_props[]` (which collectibles/decorations live in this chunk and at what tile coords).
- `background.{target_width_px, target_height_px, segment_width_px, overlap_px}` — derived from world dimensions × tile size; consumed by `02c-background` to compute segment count.
- `tilemap_chunks[]` — per-chunk tile-set hints, consumed by `03-tiles` to spawn the right tile variants.

## Why this exists

Without a stage blueprint:
- Background segment count is computed from an arbitrary `target_size`, not from "this scene is N tiles wide".
- Tilemap layout is an undifferentiated grid rather than per-chunk biome variants.
- Scene props (key, potion, etc.) have no declared (x_tiles, y_tiles) — they get composited at random.

This task fixes the planning gap: it commits the scene's playable layout to disk before any pixels are generated.

## Run

```bash
python scripts/generate_stage.py forest-tutorial
```

The script reads `scene-plan.json` (which already has the per-layer art direction), `SPEC.md` (the scene's narrative spec), `scenes.json[forest-tutorial]` (declared characters / shared props / bg layer config), and `game.json` (tile size, view mode, world size hints). It calls Gemini text-out once with a structured prompt: "design this scene's playable area as N chunks". Output is one JSON object.

The post-execution check `stage-json-has-required-shape` rejects any output where chunks don't tile the world width cleanly (no gaps, no overlaps) or the world dimensions are missing.

## What to do if the script fails

1. Load `.env` (`set -a && . ./.env && set +a`) and re-run.
2. If the model returned malformed JSON, the script saves the raw text to `stage.raw.txt` and exits non-zero. Re-run; the model usually self-corrects on a second attempt.
3. If still failing, surface the exact error and exit. Do not patch around it locally.