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
# the painted anchor and the AI-extended chroma area: instead of seeing
# a hard "painted | chroma" boundary, the model sees a gradient that it
# can naturally extend rightward.
ANCHOR_FADE_FRAC = 0.25


def load_json(path: Path) -> dict:
    if not path.exists():
        raise SystemExit(f"missing input: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def _palette_lines(palette: dict) -> str:
    return "\n".join(f"  - {role}: {hexv}" for role, hexv in palette.items())


def _chunks_compact(chunks: list[dict]) -> str:
    """Run-length-collapsed list of chunks by biome+ground. Spatial layout
    comes from the visible anchor + terrain sketch, not the prompt."""
    if not chunks:
        return "(no chunks)"
    runs: list[tuple[int, int, str, str]] = []
    for c in chunks:
        i = c["chunk_index"]
        bio = c.get("biome_variant", "?")
        gnd = c.get("ground_type", "?")
        if runs and runs[-1][2] == bio and runs[-1][3] == gnd:
            runs[-1] = (runs[-1][0], i, bio, gnd)
        else:
            runs.append((i, i, bio, gnd))
    out = []
    for lo, hi, bio, gnd in runs:
        rng = f"c{lo}" if lo == hi else f"c{lo}-c{hi}"
        out.append(f"  - {rng}: biome={bio}, ground={gnd}")
    return "\n".join(out)


def build_base_canvas(
    api_w: int,
    api_h: int,
    chroma_hex: str,
    concept_path: Path,
    terrain_block: dict | None = None,
    src_w: int | None = None,
    src_h: int | None = None,
    tile_size_px: int | None = None,
) -> tuple[Image.Image, int]:
    """Compose the base canvas: full-chroma background, painted concept
    anchor scaled to full canvas height pasted at the LEFT, and (if a
    terrain block is provided) the tilemap sketch composited over the
    chroma area to the right of the anchor.

    Returns (base_image, anchor_width_px)."""
    def _hex(h: str) -> tuple[int, int, int, int]:
        h = h.lstrip("#")
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)

    base = Image.new("RGBA", (api_w, api_h), _hex(chroma_hex))

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


def build_prompt(spec: dict, api_w: int, api_h: int, anchor_w: int, terrain_legend: str = "") -> str:
    canvas = spec["canvas"]
    palette = spec["palette"]
    chroma = palette.get("chroma", "#00FF00")
    canvas_w = int(canvas["width_px"])
    canvas_h = int(canvas["height_px"])
    canvas_aspect = canvas_w / canvas_h
    anchor_pct = round(100.0 * anchor_w / api_w, 1)

    return f"""You are given a partially-painted canvas (image #1). EXTEND the existing painting rightward to fill the chroma-green area.

# What's already on the canvas (image #1)

- Canvas size: {api_w}x{api_h} px, aspect {canvas_aspect:.2f}:1.
- The LEFTMOST {anchor_w} px (columns 0 to {anchor_w - 1}, ~{anchor_pct}% of width) is ALREADY PAINTED at FULL CANVAS HEIGHT — this is the bg-near visual reference (sky / mountains / mid foliage / foreground ground band, all in the canonical palette). It defines the style, palette, brushwork, AND the layout (sky on top, painted bg-near band on bottom).
- The remaining region (columns {anchor_w} to {api_w - 1}) is solid chroma green {chroma}, with a TILEMAP GRID of colored outline+X markers describing terrain features (see legend below).

# Your job

EXTEND the painted scene rightward into the chroma area. The output must look like ONE continuous painted scene from x=0 to x={api_w - 1}, NOT two halves with a seam:

  - Match the anchor's layout exactly: same sky/mountain/mid horizon position, same ground band height, same palette, same brushwork.
  - Replace each terrain marker with painted scenery that VISUALLY READS as that marker's kind in this biome (see legend).
  - The seam at x={anchor_w} must be invisible — palette, foliage density, ground level, and atmospheric tones flow continuously from the anchor into your extension.

# Output technical contract

- Output one image at EXACTLY {api_w}x{api_h} px. Do not crop, resize, or letterbox.
- The output represents the ENTIRE scene canvas of {canvas_w}x{canvas_h} px (tile range 0-{canvas_w // canvas['tile_size_px']} horizontally). Relative x positions in the chunk plan map to fractional positions across the output width.
- LEFT ANCHOR REGION (columns 0 to {anchor_w - 1}): keep the existing painted content as-is. Do not erase, recolor, or restyle it.
- EXTENSION REGION (columns {anchor_w} to {api_w - 1}): replace the chroma + outline+X markers with painted continuation. NO chroma green AND NO outline/X colors should remain anywhere in the final output (except in cells whose legend color is "(no fill — chroma stays)" — those keep chroma green).
- Do NOT paint: text, UI, characters, gameplay icons.

# Terrain schematic (colored outline + X per tile cell)

The extension region of the canvas has a TILEMAP GRID drawn on top of the chroma. Each cell is shown as a colored OUTLINE BOX with a diagonal X through it. The cell's color identifies its kind; the outline + X are pure schematic markers (NOT painted content). Replace each cell with painted scenery that VISUALLY READS as that kind in this biome.

Legend (cell char -> outline color -> what to paint there):

{terrain_legend}

Match each cell's footprint: the painted scenery for a cell should occupy the same tile rectangle as the marker. Adjacent same-kind cells form contiguous painted features (e.g. a 5-tile-wide water span paints as ONE pond, not 5 ponds). Cells whose color is "(no fill — chroma stays)" must remain solid chroma green — paint nothing in those cells.

# Canonical palette (locked across the whole image)

{_palette_lines(palette)}

# Ground horizon

The ground horizon is implicit in the terrain grid — the top edge of the painted band must follow the topmost row of land cells (visible as the brown outline+X cluster's upper boundary in the schematic). Land cells = land/foliage; vast cells (chroma) = sky / behind-the-scene void.

# Per-chunk biome rhythm (left -> right; spatial layout comes from the visible anchor + sketch)

{_chunks_compact(spec.get('chunks', []))}

# Continuity rules

- Same palette throughout — no biome shift, no lighting shift across the strip.
- Lighting: soft top-down / upper-left, matches the anchor.
- No vertical seams between chunks; transitions happen smoothly inside chunks.

# Acceptance

Top half follows the anchor's sky/mid layout; bottom half is a continuous painted forest foreground following the terrain grid; palette matches canonical hexes; per-chunk biome cues visible without breaking palette continuity; whole scene reads as one coherent painted strip end-to-end (no visible seam at the anchor boundary, no obvious repetition)."""


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
    prompt = build_prompt(spec, api_w, api_h, anchor_w, terrain_legend)

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
