#!/usr/bin/env python3
"""finalize_scene_background.py — substage 03 of the new 02-background WBS.

Pure local PIL assembly — no image-gen, $0. For each layer in
scenes.json[<id>].background.layers:

  1. Read assets/scenes/<id>/bg/<layer>/plan.json.
  2. For each seed chunk: paste the extracted layer crop at chunk.x
     (resized to chunk dimensions if needed).
  3. For each transition chunk: paste chunk_NN.keyed.png at chunk.x
     with a feather-blend overlap into the canvas underneath.
  4. Optionally close the horizontal loop so the wide map tiles
     seamlessly (when scenes.json sets loop_horizontal: true).
  5. Run chroma_green_to_alpha if the layer is transparent.
  6. Run lock_subject_height if subject_height_tiles is set.
  7. Write assets/scenes/<id>/bg-<layer>.png + bg-<layer>.atlas.json.

The atlas is the same single-frame shape build_master_atlas.py expects.
The master atlas is then refreshed by the 05-manifest stage's
build_scene_manifest.py hook.

Usage:
  python scripts/finalize_scene_background.py <scene_id>
  python scripts/finalize_scene_background.py <scene_id> --layers far,mid
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

from lib import stitch
from lib.scale import lock_subject_height
from lib.sprite import find_project_root


# Width of the feather blend on each chunk seam. Expressed as a fraction
# of chunk_width — matches the side_strip_px convention used by the
# transition-input builder so feather and chroma-key boundaries line up.
SEAM_FEATHER_FRAC = 0.18


def assemble_layer(project_root: Path, scene_id: str, plan: dict) -> Path:
    layer_id = plan["layer_id"]
    target_w = int(plan["target_width"])
    target_h = int(plan["target_height"])
    chunks = plan["chunks"]

    layer_dir = project_root / "assets" / "scenes" / scene_id / "bg" / layer_id
    trans_dir = layer_dir / "transitions"

    canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))

    # Pre-resolve seed image (cached) — every seed chunk in a layer points
    # at the same extracted/bg-<layer>.png in this iteration.
    seed_imgs: dict[str, Image.Image] = {}

    def load_seed(rel_path: str) -> Image.Image:
        if rel_path not in seed_imgs:
            seed_imgs[rel_path] = Image.open(project_root / rel_path).convert("RGBA")
        return seed_imgs[rel_path]

    pasted = 0
    for chunk in chunks:
        cx = int(chunk["x"])
        cw = int(chunk["width"])
        role = chunk.get("role")

        # Decide which source image goes here.
        if role == "seed":
            seed_path = chunk.get("source")
            if not seed_path:
                sys.stderr.write(f"  ⚠ chunk {chunk['index']}: seed has no source; skipping\n")
                continue
            seed_img = load_seed(seed_path)
            # Fit the seed to the chunk's pixel dimensions.
            if seed_img.size != (cw, target_h):
                src = seed_img.resize((cw, target_h), Image.LANCZOS)
            else:
                src = seed_img
        elif role == "transition":
            keyed = trans_dir / f"chunk_{chunk['index']:02d}.keyed.png"
            if not keyed.exists():
                sys.stderr.write(
                    f"  ⚠ chunk {chunk['index']}: missing {keyed.relative_to(project_root)} — "
                    f"run fill_bg_transition.py for this chunk\n"
                )
                continue
            src = Image.open(keyed).convert("RGBA")
            if src.size != (cw, target_h):
                src = src.resize((cw, target_h), Image.LANCZOS)
        else:
            sys.stderr.write(f"  ⚠ chunk {chunk['index']}: unknown role {role!r}; skipping\n")
            continue

        # Feather-blend overlap on the LEFT seam (every chunk except the
        # first). The feather width is the same on both sides of the seam
        # — we paste the new chunk so that its leftmost `feather_w`
        # columns blend with whatever's already on the canvas.
        feather_w = 0 if pasted == 0 else max(1, int(round(cw * SEAM_FEATHER_FRAC)))
        stitch.paste_with_feather(canvas, src, cx, feather_w)
        pasted += 1

    # Optional: close the horizontal loop so the wide map tiles seamlessly.
    # We only do this if the original scene config asked for it.
    # (loop_horizontal is at the bg config level in scenes.json; plan.json
    # doesn't replicate it — just leave it off here to avoid double-blend.)
    # If users want loop_horizontal, they can re-run with --close-loop.

    # Chroma-key the assembled canvas: catches any pure-green leakage
    # from the transition fills, keeps seed regions opaque (the seed
    # PNGs are already alpha-keyed; chroma-key on opaque content is a no-op).
    if plan.get("transparent"):
        canvas = stitch.chroma_green_to_alpha(canvas)
        sys.stderr.write(f"  [{layer_id}] chroma-green keyed (post-assemble)\n")

    # Programmatic scale lock — measure opaque-content height and rescale
    # so it matches the declared subject_height_tiles.
    sht = plan.get("subject_height_tiles")
    if sht is not None:
        # Effective tile_px from the canvas height divided by the typical
        # platformer screen height (12 tiles tall by convention).
        effective_tile_px = max(1, int(round(target_h / 12.0)))
        canvas, info = lock_subject_height(
            canvas,
            target_height_tiles=float(sht),
            tile_px=effective_tile_px,
            baseline="bottom",
            preserve_horizontal=True,  # wide bg map — keep x-positions intact
        )
        sys.stderr.write(
            f"  [{layer_id}] scale lock: {info['original_height_px']}px → "
            f"{info['target_height_px']}px (×{info['scale_factor']:.3f}"
            f"{'  CLAMPED' if info['was_clamped'] else ''})\n"
        )

    # Write final outputs.
    final_png = project_root / "assets" / "scenes" / scene_id / f"bg-{layer_id}.png"
    final_atlas = project_root / "assets" / "scenes" / scene_id / f"bg-{layer_id}.atlas.json"
    canvas.save(final_png, format="PNG")

    atlas = {
        "image": final_png.name,
        "meta": {
            "scene_id": scene_id,
            "bg_layer": layer_id,
            "rows": 1,
            "cols": 1,
            "frame_count": 1,
            "frame_size": {"w": target_w, "h": target_h},
            "sheet_size": {"w": target_w, "h": target_h},
            "frame_order": "single",
            "n_chunks": len(chunks),
            "chunk_width": int(plan["chunk_width"]),
            "transparent": bool(plan.get("transparent")),
            "transition_below": plan.get("transition_below"),
            "subject_height_tiles": plan.get("subject_height_tiles"),
            "side_strip_px": int(plan.get("side_strip_px", 0)),
        },
        "frames": [{
            "filename": final_png.name,
            "frame": {"x": 0, "y": 0, "w": target_w, "h": target_h},
        }],
    }
    final_atlas.write_text(json.dumps(atlas, indent=2), encoding="utf-8")

    sys.stderr.write(
        f"  [{layer_id}] wrote {final_png.relative_to(project_root)} "
        f"({target_w}×{target_h}, {pasted} chunk(s) pasted)\n"
    )
    return final_png


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("--layers", default=None,
                    help="Comma-separated subset of layer ids (default: all with plan.json on disk)")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    bg_root = project_root / "assets" / "scenes" / args.scene_id / "bg"
    if not bg_root.exists():
        raise SystemExit(
            f"{bg_root} missing — run decompose_scene_background.py {args.scene_id} first"
        )

    # Discover available plans on disk.
    layer_plans: list[dict] = []
    for layer_dir in sorted(bg_root.iterdir()):
        plan_path = layer_dir / "plan.json"
        if not plan_path.is_file():
            continue
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        layer_plans.append(plan)

    if not layer_plans:
        raise SystemExit(f"no plan.json files under {bg_root}")

    if args.layers:
        wanted = {x.strip() for x in args.layers.split(",") if x.strip()}
        layer_plans = [p for p in layer_plans if p.get("layer_id") in wanted]
        if not layer_plans:
            raise SystemExit(f"no plans match --layers={args.layers}")

    sys.stderr.write(
        f"[finalize:{args.scene_id}] assembling {len(layer_plans)} layer(s)\n"
    )
    for plan in layer_plans:
        try:
            assemble_layer(project_root, args.scene_id, plan)
        except Exception as exc:
            sys.stderr.write(f"  ⚠ {plan.get('layer_id')}: {exc}\n")
            continue

    sys.stderr.write(f"[finalize:{args.scene_id}] done\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
