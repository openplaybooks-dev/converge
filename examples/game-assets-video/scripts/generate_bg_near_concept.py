#!/usr/bin/env python3
"""generate_bg_near_concept.py — one-shot bg-near concept painter.

Builds a composed base canvas (chroma + painted concept anchor on left +
terrain tilemap sketch in the chroma area) and asks Gemini to extend the
painted scene rightward, replacing the schematic terrain markers with
biome-appropriate painted scenery.

Inputs:
  - assets/scenes/<id>/concept.png             (style anchor)
  - assets/scenes/<id>/bg-near/scene-spec.json (canvas dims + chunk metadata)
  - assets/scenes/<id>/bg-near/SPEC.md         (optional prose grounding)
  - assets/scenes/<id>/terrain.json            (standalone tilemap grid)

Outputs:
  - assets/scenes/<id>/bg-near/concept.png         (final painted concept)
  - assets/scenes/<id>/bg-near/concept.base.png    (composed input fed to AI)
  - assets/scenes/<id>/bg-near/concept.prompt.txt
  - assets/scenes/<id>/bg-near/concept.seed.txt

Usage:
  python scripts/generate_bg_near_concept.py <scene_id> [--seed N] [--long-side 1536]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

from lib import budget
from lib.image_api import generate_image_with_edit, active_backend
from lib.sprite import find_project_root


# Gemini's stable long-side cap. Beyond this, single-call output collapses
# into blur or repetition. Override with --long-side if you have evidence.
DEFAULT_LONG_SIDE = 1536

# Hard floor on the short side. Below this the model can't paint legible
# detail. We warn but do not refuse.
SHORT_SIDE_WARN = 96

# Anchor right-edge alpha fade — fraction of anchor width that fades from
# fully opaque to fully transparent. Eliminates the visible seam between
# the painted anchor and the AI-extended void: instead of seeing a hard
# "painted | void" boundary, the model sees a gradient that it can
# naturally extend rightward.
ANCHOR_FADE_FRAC = 0.25

# Base canvas color — pure black. Vast/void cells in the terrain schematic
# remain this color in the AI output; painter fills land/water/etc. cells
# with biome scenery.
BASE_BG_COLOR = (0, 0, 0, 255)


def load_json(path: Path) -> dict:
    if not path.exists():
        raise SystemExit(f"missing input: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def _palette_lines(palette: dict) -> str:
    return "\n".join(f"  - {role}: {hexv}" for role, hexv in palette.items())


def build_base_canvas(
    api_w: int,
    api_h: int,
    chroma_hex: str,  # kept for API compat; base is now black
    concept_path: Path,
    terrain_block: dict | None = None,
    src_w: int | None = None,
    src_h: int | None = None,
    tile_size_px: int | None = None,
) -> tuple[Image.Image, int]:
    """Compose the base canvas: full-black background, painted concept
    anchor scaled to full canvas height pasted at the LEFT, and (if a
    terrain block is provided) the tilemap sketch composited over the
    black area to the right of the anchor.

    Returns (base_image, anchor_width_px)."""
    base = Image.new("RGBA", (api_w, api_h), BASE_BG_COLOR)

    concept = Image.open(concept_path).convert("RGBA")
    # Scale FULL concept to canvas FULL height, preserving aspect.
    scale = api_h / concept.size[1]
    target_w = max(1, int(round(concept.size[0] * scale)))
    target_h = api_h
    anchor = concept.resize((target_w, target_h), Image.LANCZOS)

    # Cap anchor width at half the canvas — keep enough chroma room on
    # the right for the model to paint narrative variation across the rest.
    max_anchor_w = api_w // 2
    if anchor.size[0] > max_anchor_w:
        anchor = anchor.resize((max_anchor_w, target_h), Image.LANCZOS)

    # Right-edge alpha fade — the rightmost ANCHOR_FADE_FRAC of the
    # anchor smoothly fades from opaque to fully transparent, so the
    # painted anchor blends into the chroma instead of meeting it at a
    # hard seam. The model then has a gradient to continue, not a wall.
    fade_w = max(8, int(round(anchor.size[0] * ANCHOR_FADE_FRAC)))
    fade_w = min(fade_w, anchor.size[0] - 1)
    mask = Image.new("L", anchor.size, 255)
    md = ImageDraw.Draw(mask)
    fade_start = anchor.size[0] - fade_w
    for i in range(fade_w):
        alpha = int(round(255 * (1 - (i + 1) / fade_w)))
        md.line([(fade_start + i, 0), (fade_start + i, anchor.size[1] - 1)],
                fill=alpha)
    base.paste(anchor, (0, 0), mask)

    # Effective anchor width = the fully-opaque region. Beyond this point
    # the painting fades to chroma, so the model needs to paint there too.
    effective_anchor_w = anchor.size[0] - fade_w

    # Composite the terrain schematic over the chroma area (right of
    # anchor's effective edge). Markers begin INSIDE the fade region so
    # they overlap the gradient — gives the model a smooth handoff:
    # painted anchor → fading anchor + appearing sketch → chroma + sketch.
    if terrain_block is not None and src_w and src_h and tile_size_px:
        from lib.terrain_sketch import build_terrain_sketch
        sketch = build_terrain_sketch(
            terrain_block, src_w, src_h, api_w, api_h,
            tile_size_px=tile_size_px,
            skip_left_px=effective_anchor_w,
        )
        base = Image.alpha_composite(base, sketch)

    return base, effective_anchor_w


def _terrain_features_block(terrain: dict | None) -> str:
    """Render the terrain as a flat list of distinct contiguous features
    — one per pond / platform / hazard / land-band — with x% and y%
    positions. Replaces the dense per-char text grid; this format gives
    the painter a small, exact list of footprints to honor."""
    if not terrain or not terrain.get("rows"):
        return "(no terrain features)"
    from lib.terrain_sketch import extract_feature_regions
    regions = extract_feature_regions(terrain)
    if not regions:
        return "(no terrain features)"
    # Sort by kind (so "land" bands come first as overall ground band, then
    # waters, platforms, hazards), then by x position.
    kind_order = {"land": 0, "water": 1, "platform": 2, "hazard": 3}
    regions.sort(key=lambda r: (kind_order.get(r["kind"], 99), r["x_lo"]))
    out = []
    for r in regions:
        rng_x_tile = f"[{r['x_lo']}..{r['x_hi']}]"
        rng_y_tile = f"[{r['y_lo']}..{r['y_hi']}]"
        rng_x_pct = f"{r['x_lo_pct']}-{r['x_hi_pct']}%"
        rng_y_pct = f"{r['y_lo_pct']}-{r['y_hi_pct']}%"
        out.append(
            f"  - {r['kind']:<10} x_tile={rng_x_tile:<14} y_tile={rng_y_tile:<10}  "
            f"(x={rng_x_pct:<14} y={rng_y_pct} of canvas)"
        )
    return "\n".join(out)


def build_prompt(spec: dict, api_w: int, api_h: int, anchor_w: int, terrain_legend: str = "", terrain: dict | None = None) -> str:
    canvas = spec["canvas"]
    palette = spec["palette"]
    canvas_w = int(canvas["width_px"])
    canvas_h = int(canvas["height_px"])
    canvas_aspect = canvas_w / canvas_h
    anchor_pct = round(100.0 * anchor_w / api_w, 1)

    return f"""You are TILING the painted reference (the LEFT region of image #1) rightward across the whole canvas, using the colored skeleton grid as a layout guide. The output must look like the SAME ARTIST drew the entire {api_w}x{api_h} canvas in ONE pass with the SAME brushes, palette, and style — every part of the output must be visually indistinguishable in technique from the leftmost painted region.

# Two roles, two different things to copy

The canvas (image #1) has two distinct parts. They serve DIFFERENT purposes and you must treat them differently:

**PART A — THE LEFT PAINTED REGION (the first ~{anchor_pct}% of the canvas, columns 0 to ~{anchor_w}):**
This is the STYLE REFERENCE. It is the ONLY source of truth for: brush feel, color saturation, level of detail, rendering technique, line softness, how trees are drawn, how mountains are drawn, how foliage clumps look, how the ground band is shaded, how lighting falls. Study it. Match it EXACTLY. Do NOT add more detail than it has. Do NOT make mountains more rugged, foliage more textured, or shading more dramatic than what is shown there. If the reference looks soft, simple, hand-painted, and uncluttered, your extension MUST be equally soft, simple, hand-painted, and uncluttered. Do NOT borrow style from your training data — the only style permitted is what is shown in PART A.

**PART B — THE LAYOUT MARKERS (colored outline boxes with semi-transparent fills, on the rest of the canvas):**
This is the LAYOUT GUIDE — and the FOOTPRINT IS PRECISE. Each colored marker is a rectangle with a clear outline; the rectangle's footprint (x and y range) is EXACTLY where its kind of terrain feature must be painted in your output. The painter is NOT free to shift features for aesthetic reasons. Honor every footprint within ±5% of its position.

Inside each footprint you have CREATIVE freedom — paint reeds and lily pads in a water footprint however you like, paint grass tufts and wood detail on a platform footprint however you like — but the OUTER BOUNDARIES of each painted feature must align with the markers. A water footprint paints as a pond whose shoreline matches the marker's rectangle; a platform footprint paints as a raised ledge whose top edge matches the marker's top row; a land footprint paints as ground whose top edge matches the marker's topmost row.

The marker outline + fill colors do NOT survive into the output — paint OVER them. Only the painted features remain.

# Style fidelity — non-negotiable

The painter / rendering style across the whole output must be IDENTICAL to PART A:
- Same color saturation and value range as PART A — if PART A looks pastel, the extension is pastel; if PART A looks rich and warm, the extension matches that exact saturation.
- Same level of detail and complexity as PART A. Do NOT add more rocks, more bushes, more grass blades, more cloud detail, more mountain ridges than PART A shows.
- Same brush technique. PART A's edges look soft? Yours must look soft. PART A's foliage clumps as round shapes? Yours must too.
- Same horizon line height as PART A's mountain band, same atmospheric haze level, same lighting direction (soft top-down / upper-left).
- Same TYPE of trees, mountains, ground material, and foliage as PART A. If PART A shows broadleaf trees, do not introduce conifers. If PART A's ground is grassy soil, do not switch to rocky terrain.

A viewer should NOT be able to tell where PART A ends and your painting begins. Not by style, not by detail, not by color, not by brush feel.

# Naturalism inside fixed footprints

The output must look like a real painted landscape — but with EVERY feature placed where its marker says:
- The OUTLINE of a feature matches its marker rectangle (footprint fidelity ≥ 95%). Don't shift, don't drop, don't merge with neighbors.
- INSIDE each footprint, the painted detail is creative and natural — soft pond banks with reeds, mossy boulder lips, undulating grass tops on the ground band. Internal detail is hand-painted style.
- NO marker colors visible in the output. NO outlines, no rectangles, no diagrammatic lines.
- NO unauthorized features — only paint what the marker list says. Don't invent a pond between two existing ponds; don't invent a cliff because the area looks empty.
- Transitions BETWEEN features are gradual (e.g. land bordering water has muddy/reedy bank), but feature CENTERS are exactly where their markers point.

# Anchor handoff (no seam)

The painted reference's right edge fades smoothly to BLACK over a gradient zone. Paint OVER the gradient with continuation — do not preserve the fade. The output must show ZERO vertical line, seam, or compositional break anywhere.

# Output technical contract

- Output one image at EXACTLY {api_w}x{api_h} px. Do not crop, resize, or letterbox.
- The output represents the ENTIRE scene canvas of {canvas_w}x{canvas_h} px (tile range 0-{canvas_w // canvas['tile_size_px']} horizontally).
- LEFT REFERENCE REGION (cols 0 to ~{anchor_w}): preserve the painted content as-is.
- EXTENSION REGION (cols ~{anchor_w} to {api_w - 1}): replace the black background + soft colored markers with painted continuation IN THE EXACT STYLE OF PART A. The soft hint markers must NOT remain visible as colors in the output — paint over them. The black background is just an empty placeholder canvas — paint over it too.
- The output is a SINGLE FULLY-PAINTED background image containing all background layers combined (sky / mountains / mid-foliage / foreground bg-near band), exactly like PART A but extended across the full canvas. NO black should remain anywhere in the final output. NO transparent areas, NO chroma keys.
- VAST cells in the grid become SKY / atmosphere / mid-distance painted scenery (whatever PART A shows in those vertical rows) — they are NOT empty; they ARE the painted upper portion of the scene.
- Do NOT paint: text, UI, characters, gameplay icons, or anything not present in PART A.

# Skeleton legend (layout only — style comes from PART A)

{terrain_legend}

# Feature list (exact footprints — paint inside each)

The canvas grid is {(terrain or {}).get('grid_size', [0,0])[0]} columns × {(terrain or {}).get('grid_size', [0,0])[1]} rows of concept tiles. Each contiguous block of same-kind cells is ONE feature in your painting. Below is the complete list of features to paint, with their exact x-tile / y-tile bounding boxes AND the equivalent canvas % positions:

{_terrain_features_block(terrain)}

When painting:
- For EACH feature in the list, paint that kind in its exact footprint. The painted feature's outer boundary must align with the listed x and y range.
- Adjacent same-kind features may visually merge (e.g. two water rectangles touching at an edge become one larger pond), but the OUTER footprint of the merged feature must still cover all listed cells.
- Painted feature INTERIORS are creative — natural curves, vegetation, brush detail in PART A's style.
- Empty regions (vast cells, marked with the ".") become continuation of PART A's sky/atmosphere/mid-distance painting in those rows.

# Canonical palette (locked across the whole image — same as PART A)

{_palette_lines(palette)}

# Layout cues from terrain grid

- The ground horizon is the topmost row of land cells. Match the painted band's upper edge to that row.
- Vast cells = the upper portion of the scene; paint them as SKY / mountains / atmospheric mid-distance matching PART A's upper region.
- Water cells form ponds / wetland bands at the marked footprint.
- Platform cells are raised wood/grass-topped lips above the local ground.

# Acceptance

The whole strip looks like ONE painting by ONE artist using ONE brush and ONE palette. A SINGLE FULLY-PAINTED background combining all layers. No seam at the anchor boundary. No style shift between PART A and the extension. No new motifs, textures, or detail levels introduced beyond what PART A demonstrates. The skeleton has been painted over completely — no marker colors visible. NO black anywhere in the output. NO transparent or empty areas."""


def plan_dims(canvas_w: int, canvas_h: int, long_side: int) -> tuple[int, int]:
    """One-shot dimensions preserving canvas aspect EXACTLY. Long axis
    pinned to `long_side`; short axis scales to match aspect."""
    canvas_aspect = canvas_w / canvas_h
    if canvas_w >= canvas_h:
        api_w = long_side
        api_h = max(8, int(round(long_side / canvas_aspect)))
    else:
        api_h = long_side
        api_w = max(8, int(round(long_side * canvas_aspect)))
    return api_w, api_h


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("scene_id")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--long-side", type=int, default=DEFAULT_LONG_SIDE,
                    help="Long-axis pixel count (default 1536, Gemini stable cap).")
    ap.add_argument("--out-name", default="concept.png")
    args = ap.parse_args()

    project_root = find_project_root(Path(__file__).resolve())
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    bg_near_dir = scene_dir / "bg-near"

    spec_path = bg_near_dir / "scene-spec.json"
    md_path = bg_near_dir / "SPEC.md"
    concept_ref = scene_dir / "concept.png"
    terrain_path = scene_dir / "terrain.json"

    spec = load_json(spec_path)
    terrain = load_json(terrain_path) if terrain_path.exists() else None
    if not concept_ref.exists():
        raise SystemExit(f"missing scene concept reference: {concept_ref}")

    canvas_w = int(spec["canvas"]["width_px"])
    canvas_h = int(spec["canvas"]["height_px"])
    canvas_aspect = canvas_w / canvas_h

    api_w, api_h = plan_dims(canvas_w, canvas_h, args.long_side)
    short_side = min(api_w, api_h)
    if short_side < SHORT_SIDE_WARN:
        print(
            f"  WARNING: short side = {short_side} px (canvas aspect {canvas_aspect:.2f}:1, "
            f"long-side cap {args.long_side}). Model may struggle to paint legible "
            f"detail at this height. Consider raising --long-side or splitting the scene."
        )

    backend = active_backend()
    cost = budget.IMAGE_GEMINI_CENTS_PER_CALL if backend == "gemini" else budget.IMAGE_OPENAI_CENTS_PER_CALL

    print(f"  scene:    {args.scene_id}")
    print(f"  canvas:   {canvas_w}x{canvas_h}  aspect {canvas_aspect:.2f}:1")
    print(f"  api:      {api_w}x{api_h}  aspect {api_w/api_h:.2f}:1  ({backend})  cost ~{cost}c")
    print(f"  refs:     concept.png (style anchor)")

    bg_near_dir.mkdir(parents=True, exist_ok=True)
    out_png = bg_near_dir / args.out_name
    out_prompt = bg_near_dir / args.out_name.replace(".png", ".prompt.txt")
    out_seed = bg_near_dir / args.out_name.replace(".png", ".seed.txt")
    base_path = bg_near_dir / "concept.base.png"

    chroma_hex = spec["palette"].get("chroma", "#00FF00")
    tile_size_px = (terrain or {}).get("tile_size_px") or spec["canvas"]["tile_size_px"]
    base_img, anchor_w = build_base_canvas(
        api_w, api_h, chroma_hex, concept_ref, terrain_block=terrain,
        src_w=canvas_w, src_h=canvas_h,
        tile_size_px=tile_size_px,
    )
    base_img.save(base_path, format="PNG")

    from lib.terrain_sketch import build_legend
    terrain_legend = build_legend(terrain) if terrain else "(no terrain in this scene)"
    prompt = build_prompt(spec, api_w, api_h, anchor_w, terrain_legend, terrain=terrain)

    if terrain and terrain.get("rows"):
        gw, gh = terrain.get("grid_size", [0, 0])
        n_kinds = len(terrain.get("legend", {}))
        terrain_summary = f"grid {gw}x{gh}, {n_kinds} kinds"
    else:
        terrain_summary = "no terrain"
    print(f"  base:     anchor at left ({anchor_w} px), chroma+sketch right ({api_w - anchor_w} px), terrain = {terrain_summary}")

    with budget.charged(
        project_root, cost, f"image-{backend}",
        note=f"{args.scene_id}/bg-near/concept",
    ):
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            base_path,
            reference_paths=None,
            seed=args.seed,
            aspect_ratio="16:9",
            resolution=(api_w, api_h),
        )

    out_png.write_bytes(img_bytes)
    out_prompt.write_text(prompt, encoding="utf-8")
    out_seed.write_text(str(seed_used), encoding="utf-8")

    print(f"  [done] wrote {out_png.relative_to(project_root)}  ({api_w}x{api_h}, seed={seed_used})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
