#!/usr/bin/env python3
"""
generate_background_layer.py — One image-gen call produces one parallax layer.

Each entry in assets/backgrounds.json is one parallax layer at a specific
depth (far / mid / near). For a complete forest scene you typically have
three entries (forest-far, forest-mid, forest-near) and run this script
three times.

Unlike sprite generation, backgrounds:
  - Have no chroma-key green background. The prompt asks for a sky color
    (mid/near layers explicitly use #7EB6FF for downstream alpha keying).
    The chroma keyer in image_api keys on green dominance, so a blue or
    painterly-green background passes through untouched.
  - Use full manifest resolution (e.g. 1920x1080), not a square sprite size.
  - Don't use a base reference image (no canonical character to match).

Usage:
  python scripts/generate_background_layer.py <bg_id> [--seed N]

Outputs:
  assets/backgrounds/{bg_id}/{bg_id}.png
  assets/backgrounds/{bg_id}/{bg_id}.atlas.json    # trivial single-frame atlas
  assets/backgrounds/{bg_id}/{bg_id}.prompt.txt
  assets/backgrounds/{bg_id}/{bg_id}.seed.txt
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib.image_api import generate_image
from lib.art_styles import get_preset
from lib.sprite import find_project_root


def load_background(project_root: Path, bg_id: str) -> dict:
    bg_file = project_root / "assets" / "backgrounds.json"
    bg_data = json.loads(bg_file.read_text(encoding="utf-8"))
    for bg in bg_data:
        if bg.get("id") == bg_id:
            return bg
    raise SystemExit(f"Background '{bg_id}' not found in {bg_file}")


def build_background_prompt(bg: dict) -> str:
    bg_name = bg.get("name", bg["id"])
    description = bg.get("description", "")
    parallax_layer = bg.get("parallax_layer", "mid")
    width, height = bg.get("resolution", [1920, 1080])
    # `art_style` in the manifest now references a preset name. Free-form
    # legacy strings are still accepted (fall through to free-form below)
    # but the preset path takes priority when a known name is supplied.
    preset = get_preset(bg.get("art_style"))
    art_style_name = preset["style_name"]
    art_style_description = preset["style_description"]
    palette_constraints = bg.get("palette_constraints", "") or preset["palette_guidance"]

    layer_guidance = {
        "far": (
            "Far layer: distant background, slowest parallax. Soft silhouettes, low contrast, "
            "atmospheric perspective (cooler tones, hazy detail). Fully opaque — fills the whole canvas."
        ),
        "mid": (
            "Mid layer: mid-ground elements, medium parallax. Moderate detail, mid-saturation. "
            "Sky pixels (everywhere not occupied by mid-ground objects) must be a flat solid sky-blue (#7EB6FF) "
            "so a downstream pass can chroma-key them out for compositing over the far layer."
        ),
        "near": (
            "Near layer: foreground elements, fastest parallax. High contrast, high saturation, "
            "near-silhouette darks for the closest objects. Mostly empty so the mid and far layers show through — "
            "non-foreground pixels must be a flat solid sky-blue (#7EB6FF) for downstream alpha keying."
        ),
    }
    layer_text = layer_guidance.get(parallax_layer, layer_guidance["mid"])

    spec = {
        "task": "generate_parallax_background_layer",
        "background": bg_name,
        "parallax_layer": parallax_layer,
        "resolution": [width, height],
        "art_style": art_style_name,
        "art_style_description": art_style_description,
        "palette": preset["palette_guidance"],
        "palette_constraints": palette_constraints,
        "critical_instructions": [
            f"Output is ONE image at exactly {width}x{height} pixels — no grid, no frames",
            "No characters, no UI, no text, no watermarks",
            "Wide aspect ratio composition; horizontal scrolling will tile this layer",
            "Edges should loop or feather cleanly so horizontal repeat doesn't show seams",
            *preset.get("negative_directives", []),
        ],
    }
    spec_json = json.dumps(spec, indent=2)

    return f"""Generate the {parallax_layer} parallax layer for the "{bg_name}" background.

ART STYLE (mandatory): {art_style_description}

{description}

The output is ONE image, exactly {width}×{height} pixels. No grid, no frames, no character. Composition is designed to scroll horizontally; left and right edges should be feathered or content-matched so the layer can repeat without a visible seam.

Layer guidance:
{layer_text}

Palette discipline (mandatory):
{palette_constraints}

Structured spec for reference:

{spec_json}
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("bg_id", help="Background ID (must exist in assets/backgrounds.json)")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    bg = load_background(project_root, args.bg_id)

    width, height = bg.get("resolution", [1920, 1080])

    out_dir = project_root / "assets" / "backgrounds" / args.bg_id
    out_dir.mkdir(parents=True, exist_ok=True)
    png_path = out_dir / f"{args.bg_id}.png"
    atlas_path = out_dir / f"{args.bg_id}.atlas.json"
    prompt_path = out_dir / f"{args.bg_id}.prompt.txt"
    seed_path = out_dir / f"{args.bg_id}.seed.txt"

    prompt = build_background_prompt(bg)

    print(
        f"[{args.bg_id}] generating {bg.get('parallax_layer', 'mid')} parallax layer at {width}x{height}",
        file=sys.stderr,
    )
    img_bytes, seed_used = generate_image(
        prompt,
        reference_paths=None,
        seed=args.seed,
        resolution=(width, height),
    )

    png_path.write_bytes(img_bytes)
    prompt_path.write_text(prompt, encoding="utf-8")
    seed_path.write_text(str(seed_used), encoding="utf-8")

    # Trivial single-frame atlas — one frame covering the full sheet, so the
    # master-atlas aggregator finds backgrounds the same way it finds sheets.
    atlas = {
        "image": png_path.name,
        "meta": {
            "bg_id": args.bg_id,
            "parallax_layer": bg.get("parallax_layer", "mid"),
            "rows": 1,
            "cols": 1,
            "frame_count": 1,
            "frame_size": {"w": width, "h": height},
            "sheet_size": {"w": width, "h": height},
            "frame_order": "single",
            "seed": seed_used,
        },
        "frames": [
            {
                "filename": f"{args.bg_id}.png",
                "frame": {"x": 0, "y": 0, "w": width, "h": height},
            }
        ],
    }
    atlas_path.write_text(json.dumps(atlas, indent=2), encoding="utf-8")

    print(
        f"  wrote {png_path.relative_to(project_root)} + {atlas_path.name} (seed={seed_used})",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
