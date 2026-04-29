#!/usr/bin/env python3
"""extract_bg_near.py — Extract the NEAR (foreground) parallax layer.

The near layer is a transparent foreground edge: the strip the player
walks on or in front of. Outside the foreground content the model
paints pure #00FF00, which we chroma-key to alpha after.

Reads:
  - assets/concept/style-sheet.png             (universal style anchor)
  - assets/scenes/{scene_id}/concept.png       (scene anchor)
  - assets/scenes/{scene_id}/extracted/bg-mid.png (sibling-above, palette anchor)

Writes:
  - assets/scenes/{scene_id}/extracted/bg-near.png         (chroma-keyed RGBA)
  - assets/scenes/{scene_id}/extracted/bg-near.prompt.txt
  - assets/scenes/{scene_id}/extracted/bg-near.seed.txt

Usage:
  python scripts/extract_bg_near.py <scene_id> [--seed N]
"""

from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

from PIL import Image

from lib import budget, stitch
from lib.image_api import generate_image_with_edit, active_backend
from lib.sprite import find_project_root


NEAR_PROMPT = """\
You are decomposing a 2D action-scroller concept painting into parallax
layers. The concept is ONE painting where nearer layers occlude farther
ones; your job is amodal completion — repaint the NEAR layer as a
COMPLETE standalone image, as if the nearer layers were lifted away
and you could see the near layer in full. Do NOT band-slice the canvas.
Do NOT leave holes inside the near content. Do NOT keep nearer-layer
content just because it falls inside this layer's typical canvas band.

LAYER YOU ARE EXTRACTING (NEAR) — defined by visual depth cues, NOT canvas position:
The FOREGROUND plane. Defined by full saturation, sharp edges, highest
contrast, individual leaf / grass blade / pebble detail. The plane the
player walks on or in front of: ground texture, foreground rocks, fern
fronds, foreground tree trunk bases, edge-of-water. NOT mid-distance
silhouettes; NOT sky.

DOES NOT BELONG TO NEAR (mark with the fill rule below):
Sky, distant mountains, mid-distance tree clumps. Keep ONLY the
foreground plane content — ground texture, the immediate leaves /
rocks / tufts the player would walk through, the base of any
foreground tree trunk that is right at camera distance.

UNIVERSAL EXCLUSIONS (always remove, regardless of layer):
  - The PLAYER CHARACTER, hero, or any human/humanoid figure.
  - Any character armor, weapon, cape, sword, shield, or held item.
  - UI elements, text, labels, captions, watermarks.
  - Any pickup (potions, keys, coins).

PRODUCTION TASK (read carefully):
  1. AMODAL COMPLETION: paint the near layer as one continuous painting
     that fills the canvas where this layer's content belongs. Where
     nearer-layer content currently occludes the near layer, INFER and
     PAINT what is behind. Match the original's palette, brush style,
     and lighting. Do NOT introduce a new visual style.
  2. FILL RULE for non-near regions:
     Replace any region that is NOT foreground content with PURE
     #00FF00 (RGB 0,255,0). The foreground content sits in the lower
     ~30-45% of the canvas; everything above is #00FF00. The keyer
     converts #00FF00 to alpha=0 after this step. No green gradients,
     no soft halos, no faint green tint inside foreground content.
     ABSOLUTELY CRITICAL — irregular silhouette requirement:
     The boundary between foreground and #00FF00 MUST be a tall,
     jagged organic silhouette, NOT a flat horizontal line. Tall
     individual fern fronds, grass blades, leaf clusters, branch tips,
     and rock crowns must rise high into the green region — some
     reaching as high as the upper third of the canvas. Likewise,
     pockets of #00FF00 must dip down between foreground elements
     (gaps between fronds, sky visible through grass tufts). The
     transition zone — the band of canvas where each row contains
     BOTH foreground pixels AND #00FF00 pixels — must span at least
     35% of the canvas height. If you paint a clean horizontal
     boundary anywhere, the output is wrong. Imagine looking at tall
     grass and ferns from a low camera angle: the silhouette against
     the sky is dense and irregular, with stems poking up at varied
     heights.
  3. Output SAME dimensions and SAME aspect ratio as the input.
  4. Match the input's painterly style exactly — same line weight, same
     palette saturation curve, same brush feel.

ANTI-PATTERNS (DO NOT DO):
  - Do NOT produce a horizontal band-slice of the original canvas. Your
    output must be a complete painting of the near layer, not "rows 0..N
    of the original with rows N..bottom replaced by green."
  - Do NOT include nearer-layer content because it was painted at the
    same height as this layer in the original. Depth cues — not Y
    position — decide what belongs.
  - Do NOT leave large green holes in the middle of foreground content.
    The layer is continuous; complete it. Green only fills the regions
    that genuinely contain no near content.
  - Do NOT redraw or stylize. Preserve the original silhouettes and
    palette where they are visible.

DEPTH CUES (use these to decide what belongs to which layer):
  - FAR layer: strong atmospheric perspective. Desaturated, blue-shifted,
    low-contrast, hazy edges. Distance objects: sky, distant mountain or
    cliff silhouettes, far horizon tree-line as a single hazy band.
  - MID layer: mid-distance silhouettes. Mid-saturation, painterly, soft
    contrast. Tree clumps and hill ridges with visible canopy mass but
    no individual leaf detail.
  - NEAR layer: foreground detail. Full saturation, sharp edges, highest
    contrast, individual leaves / grass blades / pebbles visible. The
    plane the player walks on. THIS IS WHAT YOU PAINT.

Output ONE image, same dimensions as the input, painterly style matched.
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
    out_png = out_dir / "bg-near.png"
    out_prompt = out_dir / "bg-near.prompt.txt"
    out_seed = out_dir / "bg-near.seed.txt"

    # References: style sheet, bg-mid (sibling-above palette anchor).
    extra_refs: list[Path] = []
    style_sheet = project_root / "assets" / "concept" / "style-sheet.png"
    if style_sheet.exists():
        extra_refs.append(style_sheet)
    mid_png = out_dir / "bg-mid.png"
    if mid_png.exists():
        extra_refs.append(mid_png)

    backend = active_backend()
    cost = budget.cost_for_image(backend)

    with Image.open(concept_path) as im:
        target_w, target_h = im.size

    sys.stderr.write(
        f"[extract-near {args.scene_id}] backend={backend} cost={cost}c "
        f"target={target_w}x{target_h}\n"
    )

    with budget.charged(
        project_root, cost, f"image-{backend}",
        note=f"extract-{args.scene_id}/near",
    ):
        img_bytes, seed_used = generate_image_with_edit(
            NEAR_PROMPT,
            concept_path,
            extra_refs,
            seed=args.seed,
            aspect_ratio="16:9",
            resolution=(target_w, target_h),
        )

    raw = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    if raw.size != (target_w, target_h):
        raw = raw.resize((target_w, target_h), Image.LANCZOS)

    # Keep the chroma-green screen end-to-end: save fully-opaque RGBA
    # with #00FF00 representing transparent zones as RGB content.
    # Keying is deferred to composition time.
    pixels = raw.load()
    w, h = raw.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = pixels[x, y]
            pixels[x, y] = (r, g, b, 255)
    raw.save(out_png, format="PNG")
    out_prompt.write_text(NEAR_PROMPT, encoding="utf-8")
    out_seed.write_text(str(seed_used), encoding="utf-8")

    sys.stderr.write(
        f"  wrote {out_png.relative_to(project_root)} "
        f"({raw.size[0]}x{raw.size[1]}, green-screen RGBA, seed={seed_used})\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
