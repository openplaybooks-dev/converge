#!/usr/bin/env python3
"""decompose_scene_background.py — substage 01 of the new 02-background WBS.

Owns the "look at the concept and figure out what the background needs"
phase. For one scene:

  1. Per-layer extraction (paid). For each parallax layer in
     scenes.json[<id>].background.layers, ask the model to render the
     concept image with everything OUTSIDE that layer replaced by pure
     chroma-green (#00FF00). Run chroma_green_to_alpha → save to
     `assets/scenes/<id>/extracted/bg-<layer>.png` (alpha-keyed).

     Reuses extract_concept_layers.extract_one_layer() — same logic the
     old `01b-extract` stage used.

  2. Plan (free). For each layer, compute an alternating chunk schedule
     covering target_width:
         chunk 0    : seed     (paste extracted layer crop at x=0)
         chunk 1    : trans    (model-filled gap between chunk 0 and chunk 2)
         chunk 2    : seed     (extracted layer crop again at x=chunk_width*2)
         chunk 3    : trans
         ...
     Write `assets/scenes/<id>/bg/<layer>/plan.json`.

  3. Prepare transition inputs (free). For each transition chunk, build
     a chunk-sized canvas via stitch.build_transition_input where the
     left ~25% is the right edge of the previous seed, the right ~25%
     is the left edge of the next seed, and the middle ~50% is pure
     chroma-green. The next stage (fill_bg_transition.py) will ask the
     model to fill ONLY the green region.
     Output: `assets/scenes/<id>/bg/<layer>/transitions/chunk_NN.input.png`.

Cost: 1 image-gen per layer (~5¢ each). Planning + prep are local PIL
work, $0.

Usage:
  python scripts/decompose_scene_background.py <scene_id>
  python scripts/decompose_scene_background.py <scene_id> --layers far,mid
  python scripts/decompose_scene_background.py <scene_id> --force-extract
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

from lib import stitch
from lib.sprite import find_project_root

# Reuse the existing extraction primitive.
from extract_concept_layers import (
    extract_one_layer,
    load_scenes,
    merge_into_scenes_json,
    normalize_layer_cfg,
)

# Game-type manifest — drives whether to skip / which layers to use.
from lib.game import (
    background_layers as game_bg_layers,
    is_category_enabled,
    load_game_manifest,
    transparent_bg_layers as game_transparent_layers,
)


# ── Plan computation ────────────────────────────────────────────────────────

def _alternating_schedule(target_width: int, chunk_width: int) -> list[dict]:
    """Build alternating seed/transition chunk list spanning target_width.

    The schedule starts AND ends with a seed (so the wide map's left and
    right edges are pixel-identical to the extracted concept layer crop)
    with transitions filling every gap between consecutive seeds:
        seed | trans | seed | trans | seed | ...

    To guarantee a seed-end, total chunk count is always odd (1, 3, 5, ...).
    chunk_width is chosen by ceil(target_width / desired_chunks) when needed
    so all chunks have nominally equal width. The final chunk may be
    slightly narrower if target_width isn't an even multiple.

    Returns a list of dicts with keys: index, x, width, role.
    """
    if target_width <= chunk_width:
        return [{"index": 0, "x": 0, "width": target_width, "role": "seed"}]

    # Pick the smallest odd N >= 3 such that N chunks of <=chunk_width
    # cover the target. With chunk_width fixed, we may need to make the
    # chunks slightly smaller to fit an odd count cleanly.
    raw_n = math.ceil(target_width / chunk_width)
    n_chunks = raw_n if raw_n % 2 == 1 else raw_n + 1
    # Recompute the actual per-chunk width so all N chunks span the
    # target uniformly (last one may round down by 1px).
    actual_chunk_w = math.ceil(target_width / n_chunks)

    chunks: list[dict] = []
    cursor = 0
    for i in range(n_chunks):
        x = cursor
        # Last chunk eats whatever's left so the schedule sums to exactly
        # target_width.
        if i == n_chunks - 1:
            w = target_width - x
        else:
            w = min(actual_chunk_w, target_width - x)
        if w <= 0:
            break
        role = "seed" if i % 2 == 0 else "transition"
        chunks.append({"index": i, "x": x, "width": w, "role": role})
        cursor += w
    return chunks


def build_layer_plan(
    scene_id: str,
    layer_id: str,
    target_width: int,
    target_height: int,
    chunk_width: int,
    seed_path: str,
    side_strip_px: int,
    transparent: bool,
    transition_below: str | None,
    subject_height_tiles: float | None,
) -> dict:
    chunks = _alternating_schedule(target_width, chunk_width)
    # Annotate each chunk with the resolved seed_path (same for every
    # seed in this iteration; per-chunk seed override comes later).
    for c in chunks:
        if c["role"] == "seed":
            c["source"] = seed_path
        else:  # transition
            # Find adjacent seed indices.
            left = c["index"] - 1
            right = c["index"] + 1
            # If we're past the last chunk somehow, fall back to wrap-0.
            c["left_seed_idx"] = max(0, left)
            c["right_seed_idx"] = right
    return {
        "scene_id": scene_id,
        "layer_id": layer_id,
        "target_width": target_width,
        "target_height": target_height,
        "chunk_width": chunk_width,
        "side_strip_px": side_strip_px,
        "transparent": transparent,
        "transition_below": transition_below,
        "subject_height_tiles": subject_height_tiles,
        "chunks": chunks,
    }


# ── Transition-input prep ───────────────────────────────────────────────────

def prepare_transition_inputs(
    project_root: Path, scene_id: str, layer_id: str, plan: dict, out_dir: Path,
) -> list[Path]:
    """For each transition chunk, build a side-strips+green canvas. Returns
    the list of generated input paths."""
    out_dir.mkdir(parents=True, exist_ok=True)
    seeds_by_idx = {c["index"]: c for c in plan["chunks"] if c["role"] == "seed"}
    written: list[Path] = []
    for chunk in plan["chunks"]:
        if chunk["role"] != "transition":
            continue
        left_seed = seeds_by_idx.get(chunk["left_seed_idx"]) or next(iter(seeds_by_idx.values()))
        right_seed = seeds_by_idx.get(chunk["right_seed_idx"]) or next(iter(seeds_by_idx.values()))
        left_path = (project_root / left_seed["source"]).resolve()
        right_path = (project_root / right_seed["source"]).resolve()
        out_path = out_dir / f"chunk_{chunk['index']:02d}.input.png"
        stitch.build_transition_input(
            left_seed_path=left_path,
            right_seed_path=right_path,
            chunk_width=chunk["width"],
            chunk_height=plan["target_height"],
            side_strip_px=plan["side_strip_px"],
            out_path=out_path,
        )
        written.append(out_path)
    return written


# ── Main ────────────────────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("--layers", default=None,
                    help="Comma-separated subset of layer ids (default: all)")
    ap.add_argument("--force-extract", action="store_true",
                    help="Re-run layer extraction even if extracted/bg-<layer>.png exists")
    ap.add_argument("--seed", type=int, default=None,
                    help="Seed for the extraction calls (deterministic-ish across re-runs)")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scenes = load_scenes(project_root)
    scene = next((s for s in scenes if s.get("id") == args.scene_id), None)
    if scene is None:
        raise SystemExit(f"scene '{args.scene_id}' not found in scenes.json")

    concept_path = project_root / "assets" / "scenes" / args.scene_id / "concept.png"
    if not concept_path.exists():
        raise SystemExit(
            f"{concept_path} missing — run scripts/generate_scene_concept.py {args.scene_id}"
        )

    # Read the project-wide game manifest. If background is disabled
    # (e.g. top-down RPG, top-down shooter), bail early — these games
    # don't have parallax bgs at all.
    game = load_game_manifest(project_root)
    if not is_category_enabled(game, "background"):
        sys.stderr.write(
            f"  ⏭  game.json says asset_categories.background.enabled=false "
            f"(game_type={game.get('game_type')}) — skipping bg decomposition.\n"
        )
        return 0

    bg_cfg = scene.get("background") or {}
    target_w = int(bg_cfg.get("target_width") or bg_cfg.get("width_px") or 1920)
    target_h = int(bg_cfg.get("target_height") or bg_cfg.get("height_px") or 1080)
    chunk_w = int(bg_cfg.get("segment_width") or bg_cfg.get("chunk_width") or 1024)
    side_strip_px = int(bg_cfg.get("side_strip_px") or chunk_w // 4)

    # Layer list: prefer scenes.json (per-scene override) but fall back
    # to game.json's project-wide default. This lets a game.json with
    # `background.layers: ["far","mid"]` apply across every scene that
    # didn't bother to declare its own.
    raw_layers = bg_cfg.get("layers") or []
    if not raw_layers:
        layer_ids_from_game = game_bg_layers(game)
        transparent_ids = game_transparent_layers(game)
        # Synthesize structured layer entries with transparency derived
        # from the game manifest.
        raw_layers = [
            {
                "id": lid,
                "transparent": lid in transparent_ids,
                "transition_below": (
                    layer_ids_from_game[i - 1] if i > 0 else None
                ),
            }
            for i, lid in enumerate(layer_ids_from_game)
        ]
        if raw_layers:
            sys.stderr.write(
                f"  scenes.json has no background.layers — using game.json default: "
                f"{[c['id'] for c in raw_layers]}\n"
            )
    all_layer_cfgs = [normalize_layer_cfg(e) for e in raw_layers]
    if args.layers:
        wanted = {x.strip() for x in args.layers.split(",") if x.strip()}
        layer_cfgs = [c for c in all_layer_cfgs if c["id"] in wanted]
    else:
        layer_cfgs = all_layer_cfgs
    if not layer_cfgs:
        raise SystemExit(f"scene '{args.scene_id}' has no layers to process")

    # Output roots.
    extracted_dir = project_root / "assets" / "scenes" / args.scene_id / "extracted"
    extracted_dir.mkdir(parents=True, exist_ok=True)
    bg_root = project_root / "assets" / "scenes" / args.scene_id / "bg"

    layer_results: dict[str, Path] = {}

    # ── Step 1 — extract per-layer chroma-keyed PNG ────────────────────────
    for cfg in layer_cfgs:
        if not cfg.get("use_extraction", True):
            sys.stderr.write(f"  ⏭  skipping {cfg['id']} (use_extraction=false)\n")
            continue
        out_png = extracted_dir / f"bg-{cfg['id']}.png"
        if out_png.exists() and not args.force_extract:
            sys.stderr.write(
                f"  ⏭  {out_png.relative_to(project_root)} exists — pass --force-extract to redo\n"
            )
            layer_results[cfg["id"]] = out_png
            continue
        sys.stderr.write(
            f"[decompose:{args.scene_id}/{cfg['id']}] extracting from concept\n"
        )
        try:
            out = extract_one_layer(
                project_root=project_root,
                scene_id=args.scene_id,
                layer_id=cfg["id"],
                concept_path=concept_path,
                out_dir=extracted_dir,
                art_bible_path=None,
                seed=args.seed,
            )
            layer_results[cfg["id"]] = out
        except Exception as exc:
            sys.stderr.write(f"  ⚠ extract failed for {cfg['id']}: {exc}\n")

    if not layer_results:
        sys.stderr.write("  no layers extracted — exiting\n")
        return 1

    # Persist scene.json enrichment so downstream scripts see the
    # extracted_layer_path. (Manifest text-out is not done here — that
    # was the optional metadata pass; left to extract_concept_layers.py
    # if the user wants it.)
    merge_into_scenes_json(project_root, args.scene_id, layer_results, manifest={})

    # ── Step 2 + 3 — plan + prep transition inputs per layer ───────────────
    for cfg in layer_cfgs:
        if cfg["id"] not in layer_results:
            continue
        seed_rel = str(layer_results[cfg["id"]].relative_to(project_root))
        plan = build_layer_plan(
            scene_id=args.scene_id,
            layer_id=cfg["id"],
            target_width=target_w,
            target_height=target_h,
            chunk_width=chunk_w,
            seed_path=seed_rel,
            side_strip_px=side_strip_px,
            transparent=cfg["transparent"],
            transition_below=cfg.get("transition_below"),
            subject_height_tiles=cfg.get("subject_height_tiles"),
        )
        layer_dir = bg_root / cfg["id"]
        layer_dir.mkdir(parents=True, exist_ok=True)
        plan_path = layer_dir / "plan.json"
        plan_path.write_text(json.dumps(plan, indent=2), encoding="utf-8")

        n_seeds = sum(1 for c in plan["chunks"] if c["role"] == "seed")
        n_trans = sum(1 for c in plan["chunks"] if c["role"] == "transition")
        sys.stderr.write(
            f"  plan({cfg['id']}): {len(plan['chunks'])} chunks total — "
            f"{n_seeds} seed(s), {n_trans} transition(s) → {plan_path.relative_to(project_root)}\n"
        )

        trans_dir = layer_dir / "transitions"
        written = prepare_transition_inputs(
            project_root, args.scene_id, cfg["id"], plan, trans_dir,
        )
        sys.stderr.write(
            f"  prep({cfg['id']}): wrote {len(written)} transition-input PNG(s) → "
            f"{trans_dir.relative_to(project_root)}\n"
        )

    sys.stderr.write(
        f"\n[decompose:{args.scene_id}] done — "
        f"{len(layer_results)}/{len(layer_cfgs)} layer(s) ready for fill stage\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
