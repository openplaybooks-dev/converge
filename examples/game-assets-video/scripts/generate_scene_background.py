#!/usr/bin/env python3
"""generate_scene_background.py — Wide stitched parallax background per scene.

For each parallax layer in the scene's `background.layers` list:
  1. Compute segment count from target width + segment width + overlap.
  2. Generate segment 1 with concept.png + ART_BIBLE as references.
  3. Generate segments 2..N each using the previous segment's right slice
     as a reference (continuation), plus concept.png + ART_BIBLE.
  4. Composite segments into a wide canvas with feather-blended overlap.
  5. (Optional) Close the horizontal loop so the background tiles seamlessly.

Outputs per layer:
  assets/scenes/{scene_id}/bg-{layer}.png         — wide composite
  assets/scenes/{scene_id}/bg-{layer}.atlas.json  — single-frame atlas (so master atlas picks it up)
  assets/scenes/{scene_id}/bg-{layer}.prompt.txt  — segment 1 prompt
  assets/scenes/{scene_id}/bg-{layer}/segments/   — per-segment intermediates (debug)

Usage:
  python scripts/generate_scene_background.py <scene_id> <layer> [--seed N]

Configuration knobs (env vars):
  - SCENE_BG_SEGMENT_WIDTH   default 1024
  - SCENE_BG_OVERLAP         default 256
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import textwrap
from pathlib import Path

from PIL import Image

from lib import budget, stitch
from lib.image_api import generate_image_with_edit, active_backend
from lib.sprite import find_project_root


DEFAULT_SEGMENT_WIDTH = int(os.environ.get("SCENE_BG_SEGMENT_WIDTH", "1024"))
DEFAULT_OVERLAP = int(os.environ.get("SCENE_BG_OVERLAP", "256"))


def load_scene(project_root: Path, scene_id: str) -> dict:
    scenes_path = project_root / "assets" / "scenes.json"
    scenes = json.loads(scenes_path.read_text(encoding="utf-8"))
    for s in scenes:
        if s.get("id") == scene_id:
            return s
    raise SystemExit(f"scene '{scene_id}' not found")


def build_segment_prompt(
    scene: dict,
    layer: str,
    segment_index: int,
    total_segments: int,
    art_bible: str,
    is_continuation: bool,
) -> str:
    biome = scene.get("biome", "")
    name = scene.get("name", scene.get("id", ""))
    layer_descriptions = {
        "far": "Far layer: distant silhouettes, muted desaturated palette, atmospheric haze. No foreground detail. Soft edges. Reads as 'background depth'.",
        "mid": "Mid layer: middle-distance trees / structures, full saturation, semi-transparent against the far layer. Some readable shape but no fine detail.",
        "near": "Near layer: foreground hints — tall grass, ground, rocks. Closest to camera. Most detail. Sits in front of mid layer.",
    }
    layer_note = layer_descriptions.get(layer, f"Parallax layer: {layer}.")

    if is_continuation:
        intent = textwrap.dedent(f"""\
            CONTINUE the supplied reference image's right edge to the right.
            The reference is the previous segment of this background — its
            right edge becomes this segment's left edge. Match palette,
            depth, and feature density EXACTLY where the seam is. Don't
            shift parallax depth between segments.

            This is segment {segment_index + 1} of {total_segments} for the {layer} layer.
            Forward motion only — extend rightward; don't redraw what's
            already on the left.
        """)
    else:
        intent = textwrap.dedent(f"""\
            Render the FIRST segment of a wide horizontally-scrolling
            parallax background. This is segment 1 of {total_segments}
            for the {layer} layer. Its right edge will become the seed
            for segment 2's continuation.

            Use the supplied reference (the scene's concept image) to anchor
            palette, lighting direction, and parallax depth.
        """)

    return textwrap.dedent(f"""\
        {intent.strip()}

        SCENE: {name}
        BIOME: {biome}
        LAYER: {layer} — {layer_note}

        ART BIBLE (mandatory):

        {art_bible.strip()[:1500]}

        Composition rules:
        - 16:9 aspect, no character, no UI, no text.
        - Pure environment. No props the player would interact with.
        - Edges must be paint-loose (no hard frame). The left and right
          edges of this segment will be blended with neighboring segments,
          so don't draw vignettes, frames, or borders.
        - Match the parallax depth signature of the reference (this layer's
          color saturation, atmospheric haze, and feature density).
        - Top and bottom of the image should not have hard horizons that
          would tile poorly when stacked under different scenes.

        No off-bible colors. No motion blur. No lens flare.
    """).strip()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("layer")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--segment-width", type=int, default=DEFAULT_SEGMENT_WIDTH)
    ap.add_argument("--overlap", type=int, default=DEFAULT_OVERLAP)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scene = load_scene(project_root, args.scene_id)

    bg_cfg = scene.get("background", {})
    if args.layer not in (bg_cfg.get("layers") or []):
        raise SystemExit(
            f"layer '{args.layer}' not declared in scene '{args.scene_id}' "
            f"(layers: {bg_cfg.get('layers')})"
        )

    target_w = int(bg_cfg.get("width_px", 1920))
    target_h = int(bg_cfg.get("height_px", 1080))
    tile_seamless = bool(bg_cfg.get("tile_seamless", False))

    seg_w = int(args.segment_width)
    overlap = int(args.overlap)
    if seg_w <= overlap:
        raise SystemExit(f"segment_width ({seg_w}) must exceed overlap ({overlap})")
    # total_segments such that 1 full + (n-1) (seg_w - overlap) >= target_w
    if target_w <= seg_w:
        n_segments = 1
    else:
        n_segments = 1 + (target_w - seg_w + (seg_w - overlap) - 1) // (seg_w - overlap)
    sys.stderr.write(
        f"[scene-bg:{args.scene_id}/{args.layer}] target {target_w}×{target_h}, "
        f"{n_segments} segment(s) of {seg_w} with {overlap}px overlap\n"
    )

    # References
    bible_path = project_root / "assets" / "ART_BIBLE.md"
    concept_path = project_root / "assets" / "scenes" / args.scene_id / "concept.png"
    if not bible_path.exists():
        raise SystemExit("ART_BIBLE.md missing (run 01-art-bible)")
    if not concept_path.exists():
        raise SystemExit(f"{concept_path} missing (run scene-concept first)")
    art_bible = bible_path.read_text(encoding="utf-8")

    # Output layout
    out_dir = project_root / "assets" / "scenes" / args.scene_id
    out_dir.mkdir(parents=True, exist_ok=True)
    final_png = out_dir / f"bg-{args.layer}.png"
    final_atlas = out_dir / f"bg-{args.layer}.atlas.json"
    final_prompt = out_dir / f"bg-{args.layer}.prompt.txt"
    seg_dir = out_dir / f"bg-{args.layer}" / "segments"
    seg_dir.mkdir(parents=True, exist_ok=True)

    backend = active_backend()
    cost_per_call = budget.cost_for_image(backend)

    canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    last_seed = None
    for i in range(n_segments):
        is_continuation = i > 0
        prompt = build_segment_prompt(
            scene, args.layer, i, n_segments, art_bible, is_continuation,
        )
        if i == 0:
            final_prompt.write_text(prompt, encoding="utf-8")

        ref_image = concept_path
        # For segments 2..N, use the previous segment's right slice as the
        # primary reference so Gemini sees the seam edge.
        if is_continuation:
            slice_path = seg_dir / f"slice_for_{i:02d}.png"
            stitch.extract_right_slice(seg_dir / f"segment_{i-1:02d}.png", overlap, slice_path)
            ref_image = slice_path

        seg_path = seg_dir / f"segment_{i:02d}.png"
        sys.stderr.write(
            f"  segment {i + 1}/{n_segments} (continuation={is_continuation}) "
            f"backend={backend} cost={cost_per_call}¢\n"
        )
        with budget.charged(
            project_root, cost_per_call, f"image-{backend}",
            note=f"scene-{args.scene_id}/bg-{args.layer}/seg{i}",
        ):
            img_bytes, seed_used = generate_image_with_edit(
                prompt,
                ref_image,
                [],
                seed=args.seed if i == 0 else None,
                aspect_ratio="16:9",
                resolution=(seg_w, target_h),
            )
        last_seed = seed_used
        seg_path.write_bytes(img_bytes)

        # Paste into canvas with overlap blending
        seg_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
        if seg_img.size != (seg_w, target_h):
            seg_img = seg_img.resize((seg_w, target_h), Image.LANCZOS)
        paste_x = i * (seg_w - overlap)
        # Final segment may extend past target_w; clamp by taking only what fits
        if paste_x + seg_w > target_w:
            crop_w = target_w - paste_x
            seg_img = seg_img.crop((0, 0, crop_w, target_h))
        stitch.paste_with_feather(canvas, seg_img, paste_x, overlap if i > 0 else 0)

    if tile_seamless and n_segments > 1:
        canvas = stitch.close_horizontal_loop(canvas, overlap)
        sys.stderr.write(f"  closed horizontal loop with {overlap}px blend\n")

    canvas.save(final_png, format="PNG")

    # Single-frame atlas so the master-atlas builder picks it up
    atlas = {
        "image": final_png.name,
        "meta": {
            "scene_id": args.scene_id,
            "bg_layer": args.layer,
            "rows": 1,
            "cols": 1,
            "frame_count": 1,
            "frame_size": {"w": target_w, "h": target_h},
            "sheet_size": {"w": target_w, "h": target_h},
            "frame_order": "single",
            "n_segments": n_segments,
            "segment_width": seg_w,
            "overlap_px": overlap,
            "tile_seamless": tile_seamless,
            "seed": last_seed,
        },
        "frames": [{
            "filename": final_png.name,
            "frame": {"x": 0, "y": 0, "w": target_w, "h": target_h},
        }],
    }
    final_atlas.write_text(json.dumps(atlas, indent=2), encoding="utf-8")

    sys.stderr.write(
        f"  wrote {final_png.relative_to(project_root)} "
        f"({target_w}×{target_h}, {n_segments} segments)\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
