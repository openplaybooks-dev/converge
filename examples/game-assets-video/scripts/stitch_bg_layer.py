#!/usr/bin/env python3
"""stitch_bg_layer.py — Concatenate per-segment PNGs into one wide bg-{layer}.png.

Reads:
  - assets/scenes/{scene_id}/bg-{layer}/seg-NNN.png   (every segment)
  - assets/scenes/{scene_id}/scene-plan.json[bg.layers[layer]]  (target_size)

Writes:
  - assets/scenes/{scene_id}/bg-{layer}.png        (wide RGBA, feather-blended)
  - assets/scenes/{scene_id}/bg-{layer}.atlas.json (single-frame sheet-mode atlas)

Usage:
  python scripts/stitch_bg_layer.py <scene_id> <layer> [--overlap-px N]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

from lib.sprite import find_project_root
from lib import stitch as stitch_lib


# Default per-layer overlap. Near is busier so we feather more aggressively.
DEFAULT_OVERLAP_PX = {
    "mid":  128,
    "near": 256,
    "far":  128,  # not segmented today, but kept for parity if ever used
}


def load_layer(project_root: Path, scene_id: str, layer_id: str) -> dict:
    p = project_root / "assets" / "scenes" / scene_id / "scene-plan.json"
    if not p.exists():
        raise SystemExit(f"{p} not found — run scene/02-decompose first")
    plan = json.loads(p.read_text(encoding="utf-8"))
    for entry in (plan.get("bg") or {}).get("layers", []):
        if entry.get("id") == layer_id:
            return entry
    raise SystemExit(f"layer {layer_id!r} not found in {p}")


def load_stage(project_root: Path, scene_id: str) -> dict:
    p = project_root / "assets" / "scenes" / scene_id / "stage.json"
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("layer")
    ap.add_argument("--overlap-px", type=int, default=None,
                    help="Pixels of overlap between adjacent segments (default per layer).")
    ap.add_argument("--no-inpaint", action="store_true",
                    help="Skip the AI seam-inpaint pass and feather-blend only. Use when "
                         "per-chunk paint already pre-aligns seams (e.g. the SVG-skeleton "
                         "+ inpaint-on-paint flow used by bg-near).")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    layer = load_layer(project_root, args.scene_id, args.layer)

    # Prefer stage.json's background dimensions (the per-scene blueprint
    # written by 02-stage). Fall back to scene-plan's per-layer target_size.
    stage = load_stage(project_root, args.scene_id)
    bg = (stage or {}).get("background") or {}
    if isinstance(bg.get("target_width_px"), int) and isinstance(bg.get("target_height_px"), int):
        target_w, target_h = bg["target_width_px"], bg["target_height_px"]
    else:
        target_w, target_h = layer.get("target_size") or [4096, 1152]

    layer_dir = project_root / "assets" / "scenes" / args.scene_id / f"bg-{args.layer}"
    seg_dir = layer_dir / "segments"
    if not seg_dir.is_dir():
        raise SystemExit(f"{seg_dir} not found — segments must be generated before stitching")

    # Match seg-NNN.png only — exclude sidecar files like seg-NNN.right-edge.png
    # that the segment generator writes as seam-anchor references.
    seg_paths = sorted(p for p in seg_dir.glob("seg-*.png")
                       if p.stem.removeprefix("seg-").isdigit())
    if not seg_paths:
        raise SystemExit(f"no seg-*.png files in {seg_dir}")

    overlap = args.overlap_px
    if overlap is None:
        overlap = DEFAULT_OVERLAP_PX.get(args.layer, 128)

    # Open segments and resize each to a common segment width so the math
    # is predictable. Per-segment width = target_w / N + overlap to allow
    # feathered blends. We work in the output target's coordinate system.
    n = len(seg_paths)
    seg_w = (target_w + overlap * (n - 1)) // n
    sys.stderr.write(
        f"[stitch bg-{args.layer} {args.scene_id}] segments={n} target=({target_w}x{target_h}) "
        f"per-seg-width={seg_w} overlap={overlap}\n"
    )

    # Resize each segment to (seg_w, target_h).
    resized: list[Image.Image] = []
    for p in seg_paths:
        im = Image.open(p).convert("RGBA")
        if im.size != (seg_w, target_h):
            im = im.resize((seg_w, target_h), Image.LANCZOS)
        resized.append(im)

    # Stitching strategy:
    #   - far : fully opaque. Use content-aware seam cut along low-cost
    #           columns (sky, flat horizon). Single output, no inpainting.
    #   - mid / near : transparent layers with seams that the eye picks up.
    #           Use the void-carving stitcher to leave a chroma-green band
    #           in each overlap region, then run AI inpainting per seam to
    #           fill those bands with bridge content. The model sees both
    #           sides of the seam at once — much better continuity than
    #           per-segment "match the previous edge" continuation.
    # Output layout: bg-{layer}/final.png + final.atlas.json. Pairwise
    # debug snapshots land in bg-{layer}/merge-steps/. Validator
    # critique (when run) lives in bg-{layer}/critique/.
    out_png = layer_dir / "final.png"
    atlas_path = layer_dir / "final.atlas.json"

    if args.layer == "far" or args.no_inpaint:
        canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        x = 0
        for i, im in enumerate(resized):
            ov = overlap if i > 0 else 0
            stitch_lib.paste_with_seam_cut(canvas, im, x, ov)
            x += seg_w - overlap
        canvas.save(out_png, format="PNG")
    else:
        # Pairwise progressive merge via AI inpainting. Each pair of
        # adjacent segments is merged one at a time: place side-by-side,
        # carve a chroma-green void in the middle of their overlap, send
        # to the model with a "fill the void" prompt. Repeat for every
        # adjacent pair. Each call only needs to bridge two segments,
        # not reason about the entire wide canvas.
        sys.stderr.write(f"  invoking inpaint_seams.py {args.scene_id} {args.layer}...\n")
        import subprocess
        rc = subprocess.run(
            ["python3", "scripts/inpaint_seams.py", args.scene_id, args.layer],
            cwd=str(project_root),
        ).returncode
        if rc != 0:
            raise SystemExit(
                f"inpaint_seams.py exited {rc} — bg-{args.layer}/final.png not written"
            )

    # Single-frame sheet-mode atlas covering the whole stitched image.
    atlas = {
        "image": "final.png",
        "frame_count": 1,
        "meta": {"mode": "sheet", "cols": 1, "rows": 1, "frame_w": target_w, "frame_h": target_h},
        "frames": [{"x": 0, "y": 0, "w": target_w, "h": target_h, "duration_ms": 0}],
    }
    atlas_path.write_text(json.dumps(atlas, indent=2), encoding="utf-8")

    sys.stderr.write(f"  wrote {out_png.relative_to(project_root)} ({target_w}x{target_h})\n")
    sys.stderr.write(f"  wrote {atlas_path.relative_to(project_root)}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
