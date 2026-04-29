#!/usr/bin/env python3
"""extract_bg_far.py — Extract the FAR parallax layer from a scene concept.

The far layer is the BACK WALL of the parallax stack: a fully-opaque
distant landscape (sky → distant mountains → horizon line). It has no
transparency, no chroma-key, and no green pixels.

Reads:
  - assets/concept/style-sheet.png       (universal style anchor)
  - assets/scenes/{scene_id}/concept.png (scene anchor)

Writes:
  - assets/scenes/{scene_id}/extracted/bg-far.png         (fully-opaque RGB)
  - assets/scenes/{scene_id}/extracted/bg-far.prompt.txt
  - assets/scenes/{scene_id}/extracted/bg-far.seed.txt

Usage:
  python scripts/extract_bg_far.py <scene_id> [--seed N]
"""

from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

from PIL import Image

from lib import budget
from lib.image_api import generate_image_with_edit, active_backend
from lib.sprite import find_project_root


# Hand-written prompt. No builder, no template substitution. The literal
# text is the contract. Edit it here when behavior needs to change.
FAR_PROMPT = """\
You are decomposing a 2D action-scroller concept painting into parallax
layers. The concept is ONE painting where nearer layers occlude farther
ones. Your job is amodal completion — repaint the FAR layer as a
COMPLETE, FULLY-OPAQUE standalone landscape, as if the mid and near
layers were lifted away and you could see the entire back wall in full.

THE FAR LAYER IS THE BACK WALL:
  - It fills the ENTIRE canvas, edge to edge, top to bottom.
  - It is FULLY OPAQUE — solid painted color in every pixel.
  - It has NO transparent regions. NO holes. NO chroma-key.
  - There is no green of any kind in the output. No #00FF00, no
    chroma-key fills, no marker colors. Output is ordinary RGB.

LAYER DEFINITION (FAR) — defined by visual depth cues, NOT canvas position:
The MOST DISTANT plane. Defined by atmospheric perspective: desaturated,
blue-shifted, low-contrast, hazy edges. Sky, distant mountains, far
horizon line, distant tree-line as a single low-contrast band. The far
layer is the BACK WALL — it fills the canvas edge-to-edge. There is NO
'transparent' part of the far layer; even sky is opaque painted color.
If you see crisp edges or full saturation in the input, that pixel does
NOT belong to far.

DOES NOT BELONG TO FAR (when you see it in the concept, INFER what is
behind it and paint that — do NOT keep it in your output):
Anything with sharp edges, full saturation, or fine detail — those are
mid or near. Specifically: foreground tree trunks, individual leaves,
ground texture, grass blades, foreground rocks, dirt path, mid-distance
tree clumps with visible canopy mass. If a tree shows any leaf detail,
it is NOT far.

UNIVERSAL EXCLUSIONS (when present, infer what is behind and paint that):
  - The PLAYER CHARACTER, hero, or any human/humanoid figure.
  - Any character armor, weapon, cape, sword, shield, or held item.
  - UI elements, text, labels, captions, watermarks.
  - Any pickup (potions, keys, coins).

PRODUCTION TASK:
  1. AMODAL COMPLETION: paint the far layer as one continuous landscape
     that fills the canvas. Where mid/near content currently occludes
     the far layer, INFER and PAINT the distant landscape that would be
     visible without the occluder (continuing the sky, the horizon
     line, and the distant mountain or treeline silhouettes through
     that region). Match the original's palette, brush style, and
     lighting.
  2. Output SAME dimensions and SAME aspect ratio as the input.
  3. Match the input's painterly style exactly — same line weight, same
     palette saturation curve, same brush feel.

ANTI-PATTERNS (DO NOT DO):
  - Do NOT produce a horizontal band-slice of the original canvas. Your
    output must be a complete painting of the far layer, not "rows 0..N
    of the original with rows N..bottom blanked out."
  - Do NOT include mid or near content because it was painted at the
    same height as the far layer in the original. Atmospheric
    perspective and contrast — not Y position — decide what belongs.
  - Do NOT leave any transparent regions or holes. The far layer is the
    BACK WALL and must be completely painted edge to edge.
  - Do NOT introduce any green pixels of any kind. No #00FF00, no
    chroma key, no marker fills.
  - Do NOT redraw or stylize. Preserve the original far-layer
    silhouettes and palette where they are visible; infer plausible
    matching content where they were occluded.

Output ONE fully-opaque RGB image, same dimensions as the input,
painterly style matched, no transparency, no green.
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    concept_path = scene_dir / "concept.png"
    if not concept_path.exists():
        raise SystemExit(f"{concept_path} not found — run scene/01-concept first")

    out_dir = scene_dir / "extracted"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_png = out_dir / "bg-far.png"
    out_prompt = out_dir / "bg-far.prompt.txt"
    out_seed = out_dir / "bg-far.seed.txt"

    # Use the style sheet as a secondary reference if available — keeps
    # the painterly style consistent across the scene.
    style_sheet = project_root / "assets" / "concept" / "style-sheet.png"
    extra_refs: list[Path] = []
    if style_sheet.exists():
        extra_refs.append(style_sheet)

    backend = active_backend()
    cost = budget.cost_for_image(backend)

    # Match the concept's resolution.
    with Image.open(concept_path) as im:
        target_w, target_h = im.size

    sys.stderr.write(
        f"[extract-far {args.scene_id}] backend={backend} cost={cost}c "
        f"target={target_w}x{target_h}\n"
    )

    with budget.charged(
        project_root, cost, f"image-{backend}",
        note=f"extract-{args.scene_id}/far",
    ):
        img_bytes, seed_used = generate_image_with_edit(
            FAR_PROMPT,
            concept_path,
            extra_refs,
            seed=args.seed,
            aspect_ratio="16:9",
            resolution=(target_w, target_h),
        )

    raw = Image.open(io.BytesIO(img_bytes))
    if raw.size != (target_w, target_h):
        raw = raw.resize((target_w, target_h), Image.LANCZOS)
    # Far is the back wall — no chroma-key, save as opaque RGB. Force
    # RGBA with alpha=255 everywhere so the output format matches the
    # other layers' RGBA convention but every pixel is fully opaque.
    if raw.mode != "RGBA":
        raw = raw.convert("RGBA")
    pixels = raw.load()
    w, h = raw.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = pixels[x, y]
            pixels[x, y] = (r, g, b, 255)
    raw.save(out_png, format="PNG")
    out_prompt.write_text(FAR_PROMPT, encoding="utf-8")
    out_seed.write_text(str(seed_used), encoding="utf-8")

    sys.stderr.write(
        f"  wrote {out_png.relative_to(project_root)} "
        f"({raw.size[0]}x{raw.size[1]}, fully opaque, seed={seed_used})\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
