#!/usr/bin/env python3
"""extract_bg_mid.py — Extract the MID parallax layer from a scene concept.

The mid layer is a transparent silhouette band: tree clumps, hill
ridges, distant foliage between far and near. Outside the silhouette
content the model paints pure #00FF00, which we chroma-key to alpha
after.

Reads:
  - assets/concept/style-sheet.png            (universal style anchor)
  - assets/scenes/{scene_id}/concept.png      (scene anchor)
  - assets/scenes/{scene_id}/extracted/bg-far.png (sibling-below, palette anchor)

Writes:
  - assets/scenes/{scene_id}/extracted/bg-mid.png         (chroma-keyed RGBA)
  - assets/scenes/{scene_id}/extracted/bg-mid.prompt.txt
  - assets/scenes/{scene_id}/extracted/bg-mid.seed.txt

Usage:
  python scripts/extract_bg_mid.py <scene_id> [--seed N]
"""

from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from lib import budget, stitch
from lib.image_api import generate_image_with_edit, active_backend
from lib.sprite import find_project_root


MID_PROMPT = """\
You are decomposing a 2D action-scroller concept painting into parallax
layers. The concept is ONE painting where nearer layers occlude farther
ones; your job is amodal completion — repaint the MID layer as a
COMPLETE standalone image, as if the nearer layers were lifted away
and you could see the mid layer in full.

THE STACKING MODEL (read this first — it determines the fill rule):
  - FAR is the back wall: fully opaque, fills the entire canvas.
  - MID sits on top of FAR. It covers the bottom HALF of the canvas
    completely (no transparent gaps), and is fully transparent in the
    top half so FAR shows through above the mid horizon.
  - NEAR sits on top of MID. It covers the bottom ~30-45% of the canvas
    completely, and is transparent above so MID + FAR show through.
  - Each layer covers its own depth band AND everything below it. The
    closer layer always hides the farther layer's bottom edge in the
    composite, so we don't need transparent gaps at the bottom of any
    layer — that's wasted complexity.

LAYER YOU ARE EXTRACTING (MID) — defined by visual depth cues, NOT canvas position:
The MID-DISTANCE plane. Mid-saturation painterly silhouettes: tree
clumps with visible canopy mass but no individual leaves; hill ridges;
mid-distance structures. Soft contrast, atmospheric softening but less
than far. NOT the back wall (do not include sky); NOT foreground (do
not include individual leaves or sharp grass blades).

DOES NOT BELONG TO MID:
The sky and far horizon (atmospheric, hazy → that's far). Individual
leaves, sharp grass blades, foreground rocks (crisp, saturated → that's
near). Mid is the silhouette mass between the back wall and the
foreground.

UNIVERSAL EXCLUSIONS (always remove, regardless of layer):
  - The PLAYER CHARACTER, hero, or any human/humanoid figure.
  - Any character armor, weapon, cape, sword, shield, or held item.
  - UI elements, text, labels, captions, watermarks.
  - Any pickup (potions, keys, coins).

PRODUCTION TASK (read carefully):
  1. AMODAL COMPLETION: paint the mid layer's silhouette mass that
     would be visible if the near foreground were lifted away. Match
     the original's palette, brush style, and lighting. Do NOT
     introduce a new visual style.

  2. FILL RULE — mid covers the bottom half down:
     - The TOP HALF (roughly the top 40-55% of the canvas) is PURE
       #00FF00 (RGB 0,255,0). This is where the far layer shows
       through. The boundary between #00FF00 and mid content must be
       an irregular organic silhouette — tree canopies poking up at
       varied heights, hill ridges rising and falling — NOT a flat
       horizontal line. The transition zone (band of canvas where
       each row contains BOTH chroma and content) should span at
       least 20% of canvas height.
     - The BOTTOM HALF (roughly the bottom 45-60% of the canvas) is
       SOLID mid-distance content — fully painted, no chroma green,
       no transparent gaps. Whether the player's foreground will
       cover it later in compositing is not your concern; just fill
       it. The keyer will only key the top-half chroma green and
       leave the bottom solid mass alone.

  3. Output SAME dimensions and SAME aspect ratio as the input.
  4. Match the input's painterly style exactly — same line weight,
     same palette saturation curve, same brush feel.

ANTI-PATTERNS (DO NOT DO):
  - Do NOT leave a transparent strip at the bottom of the canvas.
    The bottom is filled mid-distance content edge-to-edge. The near
    layer will cover it; you don't need to "leave room" for near.
  - Do NOT band-slice the original canvas. Your output is a complete
    painting of the mid layer, with chroma-green ONLY above the mid
    horizon line.
  - Do NOT paint a flat horizontal boundary. The mid horizon is an
    organic silhouette of canopies and ridges with varied heights.
  - Do NOT include nearer-layer content because it was painted at the
    same height as this layer in the original. Depth cues — not Y
    position — decide what belongs.
  - Do NOT leave green holes inside the mid silhouette mass. The
    bottom half is continuous painted content.
  - Do NOT redraw or stylize. Preserve the original silhouettes and
    palette where they are visible.

DEPTH CUES (use these to decide what belongs to which layer):
  - FAR layer: strong atmospheric perspective. Desaturated, blue-shifted,
    low-contrast, hazy edges. Distance objects: sky, distant mountain or
    cliff silhouettes, far horizon tree-line as a single hazy band.
  - MID layer: mid-distance silhouettes. Mid-saturation, painterly, soft
    contrast. Tree clumps and hill ridges with visible canopy mass but
    no individual leaf detail. THIS IS WHAT YOU PAINT.
  - NEAR layer: foreground detail. Full saturation, sharp edges, highest
    contrast, individual leaves / grass blades / pebbles visible. The
    plane the player walks on.

Output ONE image, same dimensions as the input, painterly style matched.
The image will read as: top half chroma green (key to alpha=0) above an
irregular organic horizon, bottom half solid mid-distance painting.
"""


def _enforce_bottom_fill(arr: np.ndarray) -> np.ndarray:
    chroma = (arr[:, :, 0] < 60) & (arr[:, :, 1] > 180) & (arr[:, :, 2] < 60)
    h, w = chroma.shape
    for x in range(w):
        painted = np.where(~chroma[:, x])[0]
        if painted.size == 0:
            continue
        last = painted[-1]
        if last < h - 1:
            arr[last + 1 :, x, :3] = arr[last, x, :3]
            chroma[last + 1 :, x] = False
    empty_cols = np.where(np.all(chroma, axis=0))[0]
    filled_cols = np.where(~np.all(chroma, axis=0))[0]
    if empty_cols.size and filled_cols.size:
        for x in empty_cols:
            src = filled_cols[np.argmin(np.abs(filled_cols - x))]
            arr[h // 2 :, x, :3] = arr[h // 2 :, src, :3]
    return arr


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
    out_png = out_dir / "bg-mid.png"
    out_prompt = out_dir / "bg-mid.prompt.txt"
    out_seed = out_dir / "bg-mid.seed.txt"

    # References: style sheet (universal), bg-far (sibling-below palette
    # anchor — mid silhouettes should sit on top of far's color story).
    extra_refs: list[Path] = []
    style_sheet = project_root / "assets" / "concept" / "style-sheet.png"
    if style_sheet.exists():
        extra_refs.append(style_sheet)
    far_png = out_dir / "bg-far.png"
    if far_png.exists():
        extra_refs.append(far_png)

    backend = active_backend()
    cost = budget.cost_for_image(backend)

    with Image.open(concept_path) as im:
        target_w, target_h = im.size

    sys.stderr.write(
        f"[extract-mid {args.scene_id}] backend={backend} cost={cost}c "
        f"target={target_w}x{target_h}\n"
    )

    with budget.charged(
        project_root, cost, f"image-{backend}",
        note=f"extract-{args.scene_id}/mid",
    ):
        img_bytes, seed_used = generate_image_with_edit(
            MID_PROMPT,
            concept_path,
            extra_refs,
            seed=args.seed,
            aspect_ratio="16:9",
            resolution=(target_w, target_h),
        )

    raw = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    if raw.size != (target_w, target_h):
        raw = raw.resize((target_w, target_h), Image.LANCZOS)

    # Green-screen RGBA: fully-opaque alpha, #00FF00 marks "show-through"
    # zones as RGB content. Chroma keying is deferred to composition time
    # so segments stitch cleanly across seams.
    #
    # Stacking enforcement: the model often returns a silhouette band
    # with chroma above AND below. The mid layer's contract is that it
    # covers everything from the horizon down — no chroma at the canvas
    # floor. Extend each column's lowest painted pixel through any
    # chroma below it.
    arr = _enforce_bottom_fill(np.array(raw))
    arr[:, :, 3] = 255
    Image.fromarray(arr, "RGBA").save(out_png, format="PNG")
    out_prompt.write_text(MID_PROMPT, encoding="utf-8")
    out_seed.write_text(str(seed_used), encoding="utf-8")

    sys.stderr.write(
        f"  wrote {out_png.relative_to(project_root)} "
        f"({raw.size[0]}x{raw.size[1]}, green-screen RGBA, seed={seed_used})\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
