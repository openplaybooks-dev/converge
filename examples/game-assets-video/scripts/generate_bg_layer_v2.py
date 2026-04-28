#!/usr/bin/env python3
"""generate_bg_layer_v2.py — Direct single-call bg layer generation.

Replaces the multi-segment feather-blend pipeline (`generate_scene_background.py`)
with a single image-gen call per layer at the target size declared in
`scene-plan.json`. The previous pipeline's stitched 4096px output had
visible black bars / white gaps where segments failed to blend; one
direct call produces a coherent layer image.

For wider-than-native targets, the layer's `extend` block in
`scene-plan.json` declares `left_px`/`right_px` and a follow-up
`extend_bg_layer.py` task can outpaint those edges as a separate
focused call. (Not implemented in this script — kept as its own task.)

Reads:
  - assets/scenes/{scene_id}/scene-plan.json[bg.layers[layer]]
  - assets/concept/style-sheet.png        (universal anchor)
  - assets/scenes/{scene_id}/concept.png  (scene anchor)
  - assets/scenes/{scene_id}/extracted/bg-{layer}.png (slice anchor, if exists)
  - assets/scenes/{scene_id}/bg-{below}.png  (sibling layer below, if blend_with_above)

Writes:
  - assets/scenes/{scene_id}/bg-{layer}.png         (RGBA if transparent)
  - assets/scenes/{scene_id}/bg-{layer}.atlas.json  (single-frame sheet-mode atlas)
  - assets/scenes/{scene_id}/bg-{layer}.prompt.txt
  - assets/scenes/{scene_id}/bg-{layer}.seed.txt

Usage:
  python scripts/generate_bg_layer_v2.py <scene_id> <layer> [--seed N]
"""

from __future__ import annotations

import argparse
import io
import json
import sys
from pathlib import Path

from PIL import Image

from lib import budget, stitch
from lib.image_api import generate_image_with_edit, active_backend
from lib.sprite import find_project_root
from lib.style_anchor import attach_style_anchor


# Gemini native-supported sizes — generation rounds the requested target_size to
# the nearest supported one and then resizes if needed. Pinning to (1536, 1024)
# stays inside Gemini's stable region; downstream we'll resize to plan's
# target_size if it differs.
NATIVE_W = 1536
NATIVE_H = 1024
API_ASPECT = "3:2"


def load_scene_plan(project_root: Path, scene_id: str) -> dict:
    p = project_root / "assets" / "scenes" / scene_id / "scene-plan.json"
    if not p.exists():
        raise SystemExit(
            f"{p} not found — run scene/02-decompose first to produce scene-plan.json"
        )
    return json.loads(p.read_text(encoding="utf-8"))


def find_layer(plan: dict, layer_id: str) -> dict:
    for layer in (plan.get("bg") or {}).get("layers", []):
        if layer.get("id") == layer_id:
            return layer
    raise SystemExit(
        f"layer {layer_id!r} not found in scene-plan.json bg.layers"
    )


def build_prompt(layer: dict, transparent: bool) -> str:
    layer_id = layer.get("id")
    palette = layer.get("palette", "")
    regions = layer.get("regions") or []
    region_text = (
        "\n".join(
            f"  - x range {r.get('x_norm', [0,1])}: {r.get('content', '')}"
            for r in regions
        )
        or "  - (single coherent layer, no region split)"
    )
    target_size = layer.get("target_size") or [NATIVE_W, NATIVE_H]
    blend_with = layer.get("blend_with_above")

    bg_rule = (
        "Pure chroma green (#00FF00) for sky / negative space — every pixel that is "
        "NOT the foreground content of this layer must be exactly #00FF00 so the keyer "
        "converts it to transparency cleanly. NO blue sky, NO clouds, NO gradients in "
        "non-content areas."
        if transparent
        else "The full canvas is filled with this layer's content (sky, distant features, "
             "atmospheric color). No transparency required."
    )

    blend_rule = (
        f"\n\nBLEND WITH SIBLING LAYER:\n"
        f"The {blend_with!r} layer is rendered behind this one. The supplied reference "
        f"image of the {blend_with!r} layer shows the colors and silhouette at the seam. "
        f"Match palette and lighting at the boundary so parallax depth feels continuous."
        if blend_with
        else ""
    )

    return f"""ONE wide parallax background layer for a 2D game scene. Single image, no grid, no animation, no segments.

Layer id: bg-{layer_id}
Target size: {target_size[0]}x{target_size[1]} px (this is the in-game render target; the API native size will be {NATIVE_W}x{NATIVE_H} and we'll resize after).

Content (left-to-right, normalized x ranges):
{region_text}

Palette: {palette}

Background fill:
{bg_rule}{blend_rule}

CRITICAL CONSISTENCY RULES:
- The supplied style-sheet anchor + scene concept image define the rendering style. Match line weight, palette, and shading exactly. Do NOT invent a different style.
- The whole image must read as ONE coherent scene at this depth — same lighting, same palette, same level of detail edge-to-edge.
- Edges (left and right) should be soft / featureless enough that the layer can be tiled horizontally by the renderer. Avoid hard discontinuities at the canvas edges.
- No characters, no UI, no text, no captions, no frame numbers. Just the bg layer content.
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("layer")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    plan = load_scene_plan(project_root, args.scene_id)
    layer = find_layer(plan, args.layer)
    transparent = bool(layer.get("transparent", False))

    out_dir = project_root / "assets" / "scenes" / args.scene_id
    out_dir.mkdir(parents=True, exist_ok=True)
    png_path = out_dir / f"bg-{args.layer}.png"
    atlas_path = out_dir / f"bg-{args.layer}.atlas.json"
    prompt_path = out_dir / f"bg-{args.layer}.prompt.txt"
    seed_path = out_dir / f"bg-{args.layer}.seed.txt"

    extracted = out_dir / "extracted" / f"bg-{args.layer}.png"
    base_ref: Path
    caller_refs: list[Path] = []
    if extracted.exists():
        base_ref = extracted
    else:
        # Fall back to the scene concept; style-anchor will still be prepended by attach_style_anchor.
        concept = out_dir / "concept.png"
        if not concept.exists():
            raise SystemExit(
                f"need either {extracted} or {concept} as a base reference"
            )
        base_ref = concept

    blend_with = layer.get("blend_with_above")
    if blend_with:
        sibling_png = out_dir / f"bg-{blend_with}.png"
        if sibling_png.exists():
            caller_refs.append(sibling_png)

    extra_refs = attach_style_anchor(
        caller_refs, project_root, scene_id=args.scene_id
    )

    prompt = build_prompt(layer, transparent)
    backend = active_backend()
    cost = budget.cost_for_image(backend)

    sys.stderr.write(
        f"[bg-{args.layer} {args.scene_id}] backend={backend} cost={cost}c "
        f"transparent={transparent} blend_with={blend_with} "
        f"base={base_ref.relative_to(project_root)}\n"
    )

    with budget.charged(
        project_root, cost, f"image-{backend}",
        note=f"{args.scene_id}/bg-{args.layer}",
    ):
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            base_ref,
            extra_refs,
            seed=args.seed,
            aspect_ratio=API_ASPECT,
            resolution=(NATIVE_W, NATIVE_H),
        )

    img = Image.open(io.BytesIO(img_bytes))
    target_size = layer.get("target_size") or [NATIVE_W, NATIVE_H]
    if img.size != tuple(target_size):
        img = img.resize(tuple(target_size), Image.LANCZOS)

    if transparent:
        rgba = stitch.chroma_green_to_alpha(img)
        rgba.save(png_path, format="PNG")
    else:
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        img.save(png_path, format="PNG")

    prompt_path.write_text(prompt, encoding="utf-8")
    seed_path.write_text(str(seed_used), encoding="utf-8")

    w, h = target_size
    atlas = {
        "image": png_path.name,
        "meta": {
            "scene_id": args.scene_id,
            "layer_id": args.layer,
            "transparent": transparent,
            "blend_with_above": blend_with,
            "rows": 1,
            "cols": 1,
            "frame_count": 1,
            "frame_size": {"w": w, "h": h},
            "sheet_size": {"w": w, "h": h},
            "frame_order": "single",
            "seed": seed_used,
        },
        "frames": [
            {
                "filename": f"bg-{args.layer}_000.png",
                "frame": {"x": 0, "y": 0, "w": w, "h": h},
                "anchor": None,
            }
        ],
    }
    atlas_path.write_text(json.dumps(atlas, indent=2), encoding="utf-8")

    sys.stderr.write(
        f"  wrote {png_path.relative_to(project_root)} ({w}x{h}, "
        f"transparent={transparent}, seed={seed_used})\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
