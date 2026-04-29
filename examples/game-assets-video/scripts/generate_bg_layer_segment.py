#!/usr/bin/env python3
"""generate_bg_layer_segment.py — One segment of a wide parallax layer.

The wide-map background pipeline splits each parallax layer (mid, near)
into a sequence of fixed-width segments. Each segment is one paid image-gen
call; segment N+1 is anchored on segment N's right edge so seams match.

Reads:
  - assets/scenes/{scene_id}/scene-plan.json[bg.layers[layer]]
  - assets/concept/style-sheet.png        (universal anchor)
  - assets/scenes/{scene_id}/concept.png  (scene anchor)
  - assets/scenes/{scene_id}/bg-{below}.png   (sibling below — palette/lighting at the seam)
  - assets/scenes/{scene_id}/bg-{layer}/seg-{prev_idx:03d}.png  (previous segment for anchored continuation; empty on segment 0)

Writes:
  - assets/scenes/{scene_id}/bg-{layer}/seg-{idx:03d}.png        (chroma-keyed RGBA when transparent)
  - assets/scenes/{scene_id}/bg-{layer}/seg-{idx:03d}.prompt.txt
  - assets/scenes/{scene_id}/bg-{layer}/seg-{idx:03d}.seed.txt

Usage:
  python scripts/generate_bg_layer_segment.py <scene_id> <layer> <segment_index> <segment_count> [--seed N]
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


# Gemini-friendly native generation size.
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


def load_scene(project_root: Path, scene_id: str) -> dict:
    p = project_root / "assets" / "scenes.json"
    if not p.exists():
        return {}
    for s in json.loads(p.read_text(encoding="utf-8")):
        if s.get("id") == scene_id:
            return s
    return {}


def find_layer(plan: dict, layer_id: str) -> dict:
    for layer in (plan.get("bg") or {}).get("layers", []):
        if layer.get("id") == layer_id:
            return layer
    raise SystemExit(
        f"layer {layer_id!r} not found in scene-plan.json bg.layers"
    )


def load_stage(project_root: Path, scene_id: str) -> dict:
    """Load the per-scene blueprint written by 02-stage. Returns empty dict if absent."""
    p = project_root / "assets" / "scenes" / scene_id / "stage.json"
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def chunks_in_range(stage: dict, x_lo: float, x_hi: float) -> str:
    """Pull chunk narratives from stage.json whose x_tiles overlap [x_lo, x_hi] (normalized)."""
    world = (stage.get("world") or {})
    w_tiles = world.get("width_tiles")
    if not isinstance(w_tiles, int) or w_tiles <= 0:
        return ""
    chunks = stage.get("chunks") or []
    hits = []
    for ch in chunks:
        xr = ch.get("x_tiles") or [0, w_tiles]
        c_lo = xr[0] / w_tiles
        c_hi = xr[1] / w_tiles
        if c_hi < x_lo or c_lo > x_hi:
            continue
        elev = ch.get("elevation_range") or []
        elev_str = f", floor y={elev[0]}..{elev[1]}" if len(elev) == 2 else ""
        hits.append(
            f"  - chunk {ch.get('id')!r} (x_tiles {xr}, ground={ch.get('ground_type')}{elev_str}): {ch.get('narrative', '')}"
        )
    return "\n".join(hits) or "  - (no stage chunks for this segment range)"


def platforms_in_range(stage: dict, x_lo: float, x_hi: float) -> str:
    """Pull platform geometry whose x_tiles overlap the segment's x range."""
    world = (stage.get("world") or {})
    w_tiles = world.get("width_tiles")
    if not isinstance(w_tiles, int) or w_tiles <= 0:
        return ""
    platforms = stage.get("platforms") or []
    hits = []
    for p in platforms:
        xr = p.get("x_tiles") or [0, w_tiles]
        if not isinstance(xr, list) or len(xr) != 2:
            continue
        p_lo = xr[0] / w_tiles
        p_hi = xr[1] / w_tiles
        if p_hi < x_lo or p_lo > x_hi:
            continue
        hits.append(
            f"  - {p.get('kind', '?')} platform x_tiles={xr}, top y_tile={p.get('y_tile', '?')}: {p.get('label', '')}"
        )
    return "\n".join(hits) or "  - (no platforms in this segment range)"


def hazards_in_range(stage: dict, x_lo: float, x_hi: float) -> str:
    """Pull hazard placements whose x_tile lands in this segment's range."""
    world = (stage.get("world") or {})
    w_tiles = world.get("width_tiles")
    if not isinstance(w_tiles, int) or w_tiles <= 0:
        return ""
    hazards = stage.get("hazards") or []
    hits = []
    for h in hazards:
        xt = h.get("x_tile")
        if not isinstance(xt, int):
            continue
        nx = xt / w_tiles
        if x_lo <= nx <= x_hi:
            hits.append(f"  - {h.get('kind', '?')} at x_tile={xt}: {h.get('label', '')}")
    return "\n".join(hits) or "  - (no hazards in this segment range)"


def elevation_summary(stage: dict, x_lo: float, x_hi: float) -> str:
    """Compact summary of the ground silhouette across this segment's x range."""
    world = (stage.get("world") or {})
    w_tiles = world.get("width_tiles")
    if not isinstance(w_tiles, int) or w_tiles <= 0:
        return ""
    elev = stage.get("elevation") or []
    samples = []
    for e in elev:
        xt = e.get("x_tile")
        yt = e.get("y_tile")
        if not isinstance(xt, int) or not isinstance(yt, int):
            continue
        nx = xt / w_tiles
        if x_lo <= nx <= x_hi:
            samples.append((xt, yt))
    if not samples:
        return "  - (no elevation samples in this segment range)"
    pairs = ", ".join(f"({xt},{yt})" for xt, yt in samples)
    ys = [yt for _, yt in samples]
    return f"  - samples (x_tile, y_tile): {pairs}\n  - y range across segment: {min(ys)}..{max(ys)}"


def beats_in_range(stage: dict, x_lo: float, x_hi: float) -> str:
    """Pull beats whose x_tile falls inside [x_lo, x_hi] (normalized)."""
    world = (stage.get("world") or {})
    w_tiles = world.get("width_tiles")
    if not isinstance(w_tiles, int) or w_tiles <= 0:
        return ""
    beats = stage.get("beats") or []
    hits = []
    for b in beats:
        xt = b.get("x_tile")
        if not isinstance(xt, int):
            continue
        nx = xt / w_tiles
        if x_lo <= nx <= x_hi:
            hits.append(f"  - x_tile={xt} {b.get('kind')}: {b.get('label')}")
    return "\n".join(hits) or "  - (no beats in this segment range)"


def regions_in_range(layer: dict, x_lo: float, x_hi: float) -> str:
    """Pull the prose hints from `regions[]` whose x_norm overlaps [x_lo, x_hi]."""
    regions = layer.get("regions") or []
    hits = []
    for r in regions:
        rx = r.get("x_norm") or [0.0, 1.0]
        if rx[1] < x_lo or rx[0] > x_hi:
            continue
        hits.append(f"  - x_norm overlap with {[round(x_lo, 3), round(x_hi, 3)]}: {r.get('content', '')}")
    return "\n".join(hits) or "  - (no scene-plan region hints for this segment range)"


def build_prompt_segment_mid(
    layer: dict,
    scene: dict,
    stage: dict,
    seg_idx: int,
    seg_count: int,
    x_lo: float,
    x_hi: float,
    has_prev: bool,
    section_label: str = "",
    section_kind: str = "",
) -> str:
    palette = layer.get("palette", "")
    biome = scene.get("biome", "")
    description = (scene.get("description") or "").strip()
    region_text = regions_in_range(layer, x_lo, x_hi)
    chunk_text = chunks_in_range(stage, x_lo, x_hi)
    beat_text = beats_in_range(stage, x_lo, x_hi)
    elev_text = elevation_summary(stage, x_lo, x_hi)
    section_block = (
        f"Section: {section_label} (kind: {section_kind})\n"
        if section_label or section_kind
        else ""
    )
    seam_block = (
        "SEAM ANCHOR (CRITICAL):\n"
        "One of the supplied reference images is the RIGHT-EDGE STRIP of the previous segment "
        "(the rightmost ~12% of the previous segment, NOT the whole image). Treat it as the "
        "exact pixels your output's leftmost ~12% must continue. Match the silhouette outlines, "
        "tree positions, palette, and lighting at the seam down to the pixel. NO hard "
        "discontinuity. Do NOT include the strip's content as the central feature of your "
        "segment — it only describes the very-left boundary.\n"
        if has_prev
        else "First segment — no left-seam anchor. The leftmost edge should be soft / featureless "
             "so the segment can also start a horizontally-tiling sequence.\n"
    )
    return f"""ONE SEGMENT of a wide MID-DISTANCE LAYER for a 2D game scene. Single image, no grid, no animation.

THE STACKING MODEL (read this first — it determines the fill rule):
- FAR is the back wall: fully opaque, fills the entire canvas.
- MID sits on top of FAR. It covers the BOTTOM HALF of the canvas
  with solid mid-distance content (no transparent gaps), and is
  fully transparent in the top half so FAR shows through above the
  mid horizon.
- NEAR sits on top of MID. It covers the bottom ~30-45% completely.
- Each layer covers its own depth band AND everything below it.
  The closer layer hides the farther layer's bottom edge in the
  composite, so do NOT leave a transparent strip at the bottom of
  this segment — near will cover it.

Role of this layer:
Mid-distance silhouette mass — tree clumps, hill ridges, distant
foliage — that sit between the back wall (bg-far) and the foreground
(bg-near). The bottom half of the canvas is solid mid content; the
top half is chroma-keyed so far shows through.

If a `map.silhouette.png` reference is provided, treat it as the binding macro layout. The silhouette covers the WHOLE map left-to-right; your segment covers the x-range below. Look at the silhouette's content INSIDE that x-range and produce the high-detail mid-distance version of it.

Scene context:
- Biome: {biome}
- Description: {description}

This segment:
- Segment index: {seg_idx + 1} of {seg_count}
- Map x-range covered (normalized): [{round(x_lo, 3)}, {round(x_hi, 3)}]
- Render target: {NATIVE_W}x{NATIVE_H} px (covers exactly this x-range of the wide map)

{section_block}Region hints from scene-plan covering this x-range:
{region_text}

Stage chunks (from stage.json) covering this x-range:
{chunk_text}

Elevation profile across this segment (the mid horizon should sit ABOVE this ground line — the bottom half of your output is solid mid content covering down to the canvas bottom; near will visually frame the actual playable ground later):
{elev_text}

Beats (gameplay rhythm) inside this x-range:
{beat_text}

Composition:
- TOP HALF (~40-55% of canvas): pure chroma green (#00FF00). FAR shows through here.
- The boundary between chroma and mid content is an irregular organic silhouette — tree canopies poking up at varied heights, hill ridges rising and falling. NOT a flat horizontal line. The transition zone (rows containing BOTH chroma and content) spans at least 20% of canvas height.
- BOTTOM HALF (~45-60% of canvas): solid mid-distance content. NO chroma gaps. Filled edge-to-edge down to the canvas bottom.
- Gaps BETWEEN tree clumps in the upper canopy region ARE chroma green (so far shows through narrow gaps).

{seam_block}
Palette: {palette}

Layer fill rule (CRITICAL):
- TOP HALF: pure #00FF00 above the irregular mid horizon. The keyer converts #00FF00 to alpha=0.
- BOTTOM HALF: SOLID mid-distance painting. No chroma green at the bottom of the canvas; do not "leave room" for near.
- NO blue sky, NO clouds, NO faint green tints in non-content areas. Pure flat #00FF00 for chroma.
- NO horizon-line landscape with atmospheric haze (that's far). NO sharp individual leaves / grass blades / foreground props (that's near). NO characters.

Style:
- Follow the style-sheet anchor + scene concept image. Match line weight and shading.
- Atmospheric perspective: less hazy than far, more solid than near. Mid-saturation.
"""


def build_prompt_segment_near(
    layer: dict,
    scene: dict,
    stage: dict,
    seg_idx: int,
    seg_count: int,
    x_lo: float,
    x_hi: float,
    has_prev: bool,
    section_label: str = "",
    section_kind: str = "",
) -> str:
    palette = layer.get("palette", "")
    biome = scene.get("biome", "")
    description = (scene.get("description") or "").strip()
    region_text = regions_in_range(layer, x_lo, x_hi)
    chunk_text = chunks_in_range(stage, x_lo, x_hi)
    beat_text = beats_in_range(stage, x_lo, x_hi)
    elev_text = elevation_summary(stage, x_lo, x_hi)
    platforms_text = platforms_in_range(stage, x_lo, x_hi)
    hazards_text = hazards_in_range(stage, x_lo, x_hi)
    world = (stage.get("world") or {})
    world_w = world.get("width_tiles", "?")
    world_h = world.get("height_tiles", "?")
    section_block = (
        f"Section: {section_label} (kind: {section_kind})\n"
        if section_label or section_kind
        else ""
    )
    seam_block = (
        "SEAM ANCHOR (CRITICAL):\n"
        "The PREVIOUS segment to the LEFT of this one is supplied as a reference image. "
        "Match its right-edge content seamlessly: the leftmost ~10% of THIS segment must "
        "continue the foreground strip from the right edge of the previous segment — same ground "
        "texture, same palette, same level of detail, no visible seam, no repeating a prop the "
        "previous segment already showed at its right edge.\n"
        if has_prev
        else "First segment — no left-seam anchor. The leftmost edge should be soft / featureless "
             "so the segment can also start a horizontally-tiling sequence.\n"
    )
    return f"""ONE SEGMENT of a wide FOREGROUND EDGE LAYER for a 2D game scene. Single image, no grid, no animation.

Role of this layer:
The foreground plane — the closest visual element to the camera. The player walks across or in front of it. Examples by biome: grass strip with flowers, dirt path, sand strip, stone-tiled floor, snow strip with footprints.

If a `map.silhouette.png` reference is provided, treat it as the binding macro layout. The silhouette covers the WHOLE map left-to-right and shows the elevation profile of the playable ground. Your segment covers the x-range below — look at the silhouette's ground line INSIDE that x-range and ensure your foreground edge matches its slope, height, and biome variant. The painted near layer must frame the same playable terrain the silhouette implies.

Scene context:
- Biome: {biome}
- Description: {description}
- World: {world_w} tiles wide × {world_h} tiles tall

This segment:
- Segment index: {seg_idx + 1} of {seg_count}
- Map x-range covered (normalized): [{round(x_lo, 3)}, {round(x_hi, 3)}]
- Render target: {NATIVE_W}x{NATIVE_H} px (covers exactly this x-range of the wide map)

{section_block}Region hints from scene-plan covering this x-range:
{region_text}

Stage chunks (from stage.json) covering this x-range:
{chunk_text}

Elevation profile across this segment (each (x_tile, y_tile) sample is a ground-floor height — your foreground silhouette MUST follow this curve):
{elev_text}

Platforms in this segment's x range (each platform is a real walkable surface — your foreground content must visually frame these without occluding their tops):
{platforms_text}

Hazards in this segment's x range (each hazard occupies real space in the playable area — render its base in the foreground strip so the player sees what to avoid):
{hazards_text}

Beats (gameplay rhythm — pickups should be visible as foreground elements when their x_tile lands in this segment) inside this x-range:
{beat_text}

Composition:
- The bottom 30-45% of the canvas is the foreground content (ground texture + low foreground props like rocks, foliage, edge-of-pond, tufts of grass).
- The foreground silhouette MUST follow the elevation profile listed above — the ground line is NOT flat; it rises and falls to match the (x_tile, y_tile) samples and to leave room for the platforms / hazards.
- The remaining 55-70% above is pure chroma green (#00FF00). Far + mid layers show through.
- Optional: a thin band at the very top (5-10%) may contain hanging foreground silhouettes (tree canopy edge, vine drape, cave-mouth shadow) — only when scene-plan explicitly mentions them.

{seam_block}
Palette: {palette}

Layer fill rule (CRITICAL):
- The bottom strip is foreground content. Above it is EXACTLY #00FF00 (pure chroma green).
- NO blue sky, NO clouds, NO mid-distance silhouettes, NO horizon line. Those belong to far/mid layers.
- Within the foreground strip, content is rich and detailed (this is what the player sees up close). Use the scene's full near-palette saturation.
- NO characters, NO interactive pickups (potions, keys), NO UI. Static ground props only.

Style:
- Follow the style-sheet anchor + scene concept image. Match line weight and shading.
- Highest level of detail of any layer (closest to camera).
"""


_BUILDERS = {
    "mid":  build_prompt_segment_mid,
    "near": build_prompt_segment_near,
}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("layer", choices=list(_BUILDERS.keys()))
    ap.add_argument("segment_index", type=int)
    ap.add_argument("segment_count", type=int)
    ap.add_argument("--seed", type=int, default=None)
    # Section-driven extras: when the WBS slices by stage.beats[] instead
    # of by equal width, it passes the exact x-range and section label
    # so the prompt can describe a meaningful gameplay section instead of
    # a generic fraction of the map.
    ap.add_argument("--x-lo", type=float, default=None,
                    help="normalized lower x bound of this segment (0..1)")
    ap.add_argument("--x-hi", type=float, default=None,
                    help="normalized upper x bound of this segment (0..1)")
    ap.add_argument("--section-label", default=None,
                    help="human-readable label for this gameplay section, e.g. 'spawn → first-jump'")
    ap.add_argument("--section-kind", default=None,
                    help="kind transition for this section, e.g. 'spawn → platform-up'")
    args = ap.parse_args()

    if args.segment_count <= 0:
        raise SystemExit("segment_count must be > 0")
    if not (0 <= args.segment_index < args.segment_count):
        raise SystemExit(f"segment_index {args.segment_index} out of range [0, {args.segment_count})")

    project_root = find_project_root(Path.cwd())
    plan = load_scene_plan(project_root, args.scene_id)
    layer = find_layer(plan, args.layer)
    scene = load_scene(project_root, args.scene_id)
    transparent = bool(layer.get("transparent", True))

    # Layer assets live under a single `bg-{layer}/` directory with
    # subfolders by purpose:
    #   final.png / preview.png / final.atlas.json   (top-level products)
    #   segments/seg-NNN.png + sidecars              (raw model outputs)
    #   merge-steps/step-NN.png                      (pairwise debug snapshots)
    #   critique/critique.json                       (validator artifacts)
    layer_dir = project_root / "assets" / "scenes" / args.scene_id / f"bg-{args.layer}"
    out_dir = layer_dir / "segments"
    out_dir.mkdir(parents=True, exist_ok=True)
    seg_png = out_dir / f"seg-{args.segment_index:03d}.png"
    seg_prompt = out_dir / f"seg-{args.segment_index:03d}.prompt.txt"
    seg_seed = out_dir / f"seg-{args.segment_index:03d}.seed.txt"

    # x-range for this segment (normalized 0..1 across the map width).
    # Section-driven runs pass --x-lo / --x-hi explicitly. Width fallback
    # uses equal slices.
    if args.x_lo is not None and args.x_hi is not None and args.x_hi > args.x_lo:
        x_lo = float(args.x_lo)
        x_hi = float(args.x_hi)
    else:
        x_lo = args.segment_index / args.segment_count
        x_hi = (args.segment_index + 1) / args.segment_count
    section_label = args.section_label or f"segment {args.segment_index + 1}/{args.segment_count}"
    section_kind = args.section_kind or "width-slice"

    # Anchored continuation: pass an EDGE STRIP of the previous segment as a
    # reference. Passing the whole previous segment lets the model anchor
    # on something cosmetic at the previous segment's center; passing only
    # the rightmost ~12% gives it a tight "this exact strip must continue"
    # signal for the seam.
    has_prev = args.segment_index > 0
    prev_png = out_dir / f"seg-{args.segment_index - 1:03d}.png" if has_prev else None
    if has_prev and not prev_png.exists():
        raise SystemExit(
            f"segment {args.segment_index} expects previous segment at {prev_png} (not found); "
            "the runner should have produced it via the inputs: gate."
        )
    # Build / refresh the edge strip used as the seam reference.
    seam_ref_png: Path | None = None
    if has_prev and prev_png is not None:
        seam_ref_png = out_dir / f"seg-{args.segment_index - 1:03d}.right-edge.png"
        try:
            from lib import stitch as stitch_lib
            with Image.open(prev_png) as prev_img:
                w = prev_img.width
                edge_w = max(64, int(w * 0.12))
                stitch_lib.extract_right_slice(prev_png, edge_w, seam_ref_png)
        except Exception:
            # Fall back to the full previous segment if slicing fails.
            seam_ref_png = prev_png

    # Sibling-below reference (mid uses bg-far, near uses bg-mid).
    sibling_below = {"mid": "far", "near": "mid"}.get(args.layer)
    sibling_png = (
        project_root / "assets" / "scenes" / args.scene_id / f"bg-{sibling_below}" / "final.png"
        if sibling_below
        else None
    )

    concept_png = project_root / "assets" / "scenes" / args.scene_id / "concept.png"
    if not concept_png.exists():
        raise SystemExit(f"need {concept_png} as scene anchor")

    # Reference order: scene concept (base), prev-segment EDGE STRIP (seam
    # anchor), sibling-below (palette/lighting at the layer seam),
    # map.silhouette (macro layout). Style-sheet is prepended by
    # attach_style_anchor.
    base_ref = concept_png
    caller_refs: list[Path] = []
    if seam_ref_png is not None:
        caller_refs.append(seam_ref_png)
    if sibling_png is not None and sibling_png.exists():
        caller_refs.append(sibling_png)
    silhouette_png = project_root / "assets" / "scenes" / args.scene_id / "map.silhouette.png"
    if silhouette_png.exists():
        caller_refs.append(silhouette_png)

    extra_refs = attach_style_anchor(
        caller_refs, project_root, scene_id=args.scene_id
    )

    stage = load_stage(project_root, args.scene_id)
    builder = _BUILDERS[args.layer]
    prompt = builder(
        layer,
        scene,
        stage,
        args.segment_index,
        args.segment_count,
        x_lo,
        x_hi,
        has_prev,
        section_label=section_label,
        section_kind=section_kind,
    )
    # If a critique sidecar exists from a previous validate pass, append it
    # to the prompt so this regen attempt addresses the specific issues the
    # validator flagged. Delete it after reading — it shouldn't influence
    # any subsequent unrelated attempt.
    crit_path = out_dir / f"seg-{args.segment_index:03d}.critique.txt"
    is_regen = False
    if crit_path.exists():
        critique_text = crit_path.read_text(encoding="utf-8").strip()
        if critique_text:
            is_regen = True
            prompt = prompt + (
                "\n\nFEEDBACK FROM PREVIOUS ATTEMPT (a vision-judge flagged this segment "
                "as needing fixes — address every issue listed below in your regen):\n"
                + critique_text
                + "\n"
            )
        try:
            crit_path.unlink()
        except Exception:
            pass
    seg_prompt.write_text(prompt, encoding="utf-8")

    # On regen, force a fresh random seed so the output diverges from the
    # previously-flagged attempt. Otherwise nondeterministic backends often
    # land near the same failure mode and the loop wastes cost.
    effective_seed = args.seed
    if is_regen and effective_seed is None:
        import random
        effective_seed = random.randint(1, 2**31 - 1)

    backend = active_backend()
    cost = budget.cost_for_image(backend)

    sys.stderr.write(
        f"[bg-{args.layer} {args.scene_id} seg {args.segment_index + 1}/{args.segment_count}] "
        f"backend={backend} cost={cost}c x_norm=[{round(x_lo, 3)}, {round(x_hi, 3)}] "
        f"prev={prev_png.name if has_prev else 'none'} sibling={sibling_below or 'none'} "
        f"regen={is_regen} seed={effective_seed}\n"
    )

    with budget.charged(
        project_root, cost, f"image-{backend}",
        note=f"{args.scene_id}/bg-{args.layer}/seg-{args.segment_index:03d}",
    ):
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            base_ref,
            extra_refs,
            seed=effective_seed,
            aspect_ratio=API_ASPECT,
            resolution=(NATIVE_W, NATIVE_H),
        )

    img = Image.open(io.BytesIO(img_bytes))
    # Keep the chroma-green screen end-to-end. Segments save as
    # fully-opaque RGBA with #00FF00 representing transparent regions
    # as RGB content. The pairwise inpainter merges them without alpha
    # math; chroma keying is deferred to composition time.
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = pixels[x, y]
            pixels[x, y] = (r, g, b, 255)
    img.save(seg_png, format="PNG")
    seg_seed.write_text(str(seed_used), encoding="utf-8")

    sys.stderr.write(f"  wrote {seg_png.relative_to(project_root)} (seed={seed_used})\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
