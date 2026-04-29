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


def _region_text(layer: dict) -> str:
    regions = layer.get("regions") or []
    if not regions:
        return "  - (single coherent layer, no region split)"
    return "\n".join(
        f"  - x range {r.get('x_norm', [0,1])}: {r.get('content', '')}"
        for r in regions
    )


def build_prompt_far(layer: dict, scene: dict) -> str:
    """The back wall: distant landscape, fully opaque, no transparency.

    Far is the **continuous backdrop**: sky → distant mountains/structures →
    horizon tree-line / cityscape silhouette. It must fill the entire canvas
    edge-to-edge with NO transparent regions, because everything else
    (mid, near, characters) composites on top of it. The biggest failure
    mode for this layer is including foreground trees or mid-distance
    silhouettes — those belong to other layers.
    """
    palette = layer.get("palette", "")
    target_size = layer.get("target_size") or [NATIVE_W, NATIVE_H]
    biome = scene.get("biome", "")
    description = (scene.get("description") or "").strip()
    return f"""ONE wide FAR-DISTANCE BACKDROP for a 2D game scene — the sky and distant landscape only. Single image, no grid, no segments.

Role of this layer:
This is the **back wall** of the scene. Everything else (mid-distance silhouettes, foreground props, characters) will be composited on top of this image. It must read as the most distant plane — what the player sees on the horizon.

If a `map.silhouette.png` reference is provided, treat it as the binding macro layout: match its horizon line, its biome bands, and its overall mood. Your output is the high-detail far-backdrop version of that same map's distant geometry.

Scene context:
- Biome: {biome}
- Description: {description}

Composition (top-to-bottom, conceptually):
- Top ~50%: sky. Soft gradient appropriate to the time-of-day / biome.
- Middle ~30%: most-distant geometry (e.g. mountain range, distant cityscape, sea horizon, far cliff face). Heavy atmospheric perspective — desaturated, hazy, low contrast.
- Bottom ~20%: a faint silhouette horizon line of the most-distant objects (e.g. distant tree-line for grassland, distant building roofline for urban, distant dune line for desert). Still hazy and far-recede.

Region hints (left-to-right):
{_region_text(layer)}

Palette: {palette}

Layer fill rule (CRITICAL):
- The whole canvas must be filled with this far-landscape content. Sky AT THE TOP, distant landscape AT THE MIDDLE, faint horizon line AT THE BOTTOM.
- NO transparency, NO chroma green, NO white gaps. RGB output, fully opaque.
- NO foreground or mid-distance objects. NO close trees, NO bushes, NO grass, NO rocks, NO path, NO water bodies the player can walk into. Those belong to mid/near layers.
- NO characters, no UI, no text.

Style:
- The supplied style-sheet anchor + scene concept image define the rendering style. Match line weight, palette, and shading. Do NOT invent a different style.
- Edges (left and right) must be soft/featureless so the layer can be tiled horizontally. Avoid hard discontinuities at the canvas edges.
- Atmospheric perspective is the dominant cue — distant elements are desaturated and lighter, never crisp.

Target size: {target_size[0]}x{target_size[1]} px (API native: {NATIVE_W}x{NATIVE_H}; resize after).
"""


def build_prompt_mid(layer: dict, scene: dict) -> str:
    """Mid-distance silhouettes: tree clumps, hills, distant foliage.

    Mid is a **transparent overlay** that lives between far and near. Its
    content occupies a horizontal band roughly in the middle of the canvas
    (above the foreground edge, below the horizon). Everything outside that
    band is pure chroma green so the keyer converts it to alpha=0.
    """
    palette = layer.get("palette", "")
    target_size = layer.get("target_size") or [NATIVE_W, NATIVE_H]
    biome = scene.get("biome", "")
    description = (scene.get("description") or "").strip()
    return f"""ONE wide MID-DISTANCE SILHOUETTE LAYER for a 2D game scene — clumps and silhouettes in the middle distance, transparent everywhere else. Single image, no grid, no segments.

Role of this layer:
This is the **mid-distance plane** that sits between the far backdrop and the foreground. It must read as objects that are closer than the horizon but farther than where the player walks. Examples by biome: clumps of mid-distance trees, distant rooftops, low hill ridges, mid-range stone outcrops, mid-distance fog-lit silhouettes.

Scene context:
- Biome: {biome}
- Description: {description}

Composition:
- Content occupies a horizontal BAND, roughly the middle 40-60% of the canvas height. The exact position should match the scene-plan's `subject_height_tiles` cue.
- Above the band: pure chroma green (#00FF00). The far layer shows through here.
- Below the band: pure chroma green (#00FF00). The near layer / characters show through here.
- Across the band: the silhouettes/clumps with NATURAL irregular spacing — gaps between clumps are also #00FF00.

Region hints (left-to-right within the band):
{_region_text(layer)}

Palette: {palette}

Layer fill rule (CRITICAL):
- Everything that is NOT mid-distance content must be EXACTLY #00FF00 (pure chroma green). The keyer converts #00FF00 to fully transparent alpha=0.
- NO blue sky, NO clouds, NO gradients, NO faint green tints in non-content areas. Pure flat #00FF00.
- The mid-distance content itself should NOT touch the top edge or bottom edge of the canvas — leave at least 10-15% chroma green at top and bottom so far/near can show through.
- NO foreground props the player walks into (grass strips, path, pickups). NO horizon-line landscape (those belong to far). NO characters.

Style:
- Follow the style-sheet anchor + scene concept image. Match line weight and shading.
- Atmospheric perspective: less hazy than far, more solid than near. Mid-saturation.
- Edges (left and right) must be soft so the layer tiles horizontally.

Target size: {target_size[0]}x{target_size[1]} px (API native: {NATIVE_W}x{NATIVE_H}; resize after).
"""


def build_prompt_near(layer: dict, scene: dict) -> str:
    """Foreground edge: grass strip, ground props, foreground foliage.

    Near is a **transparent overlay** concentrated at the bottom of the
    canvas. The player walks across or in front of this layer. Above the
    foreground edge is pure chroma green.
    """
    palette = layer.get("palette", "")
    target_size = layer.get("target_size") or [NATIVE_W, NATIVE_H]
    biome = scene.get("biome", "")
    description = (scene.get("description") or "").strip()
    return f"""ONE wide FOREGROUND EDGE LAYER for a 2D game scene — the foreground strip the player walks on or past. Single image, no grid, no segments.

Role of this layer:
This is the **foreground plane**, the closest visual element to the camera. It defines where the playable ground meets the camera. Examples by biome: grass strip with flowers, dirt path, sand strip, stone-tiled floor, snow strip with footprints, water edge, leaf-litter foliage. Plus optional foreground silhouettes hanging in from the very top (e.g. tree branches), if the biome supports them.

Scene context:
- Biome: {biome}
- Description: {description}

Composition:
- The bottom 30-45% of the canvas is the foreground content (ground texture + low foreground props like rocks, foliage, edge-of-pond, etc.).
- The remaining 55-70% above is pure chroma green (#00FF00). Far + mid layers show through there.
- Optional: a thin band at the very top (5-10%) may contain hanging foreground silhouettes (tree canopy edge, vine drape, cave-mouth shadow) — but only if scene-plan.json explicitly mentions them. Default: no top band, just bottom strip.

Region hints (left-to-right within the bottom strip):
{_region_text(layer)}

Palette: {palette}

Layer fill rule (CRITICAL):
- The bottom strip is the foreground content. Above it is EXACTLY #00FF00 (pure chroma green).
- NO blue sky, NO clouds, NO mid-distance silhouettes, NO horizon line. Those belong to far/mid layers.
- Within the foreground strip, content is rich and detailed (this is what the player sees up close). Use the scene's full near-palette saturation.
- NO characters, NO interactive pickups (potions, keys), NO UI. Those are separate. Static ground props only.

Style:
- Follow the style-sheet anchor + scene concept image. Match line weight and shading.
- Highest level of detail of any layer (closest to camera).
- Edges (left and right) must be soft so the layer tiles horizontally.

Target size: {target_size[0]}x{target_size[1]} px (API native: {NATIVE_W}x{NATIVE_H}; resize after).
"""


# Dispatch table — keep the `build_prompt(layer, transparent)` signature
# alive for backward-compat callers, but route to the layer-specific builder.
_LAYER_BUILDERS = {
    "far": build_prompt_far,
    "mid": build_prompt_mid,
    "near": build_prompt_near,
}


def build_prompt(layer: dict, transparent: bool, scene: dict | None = None) -> str:
    layer_id = (layer.get("id") or "").lower()
    builder = _LAYER_BUILDERS.get(layer_id)
    if builder is None:
        raise SystemExit(
            f"unsupported layer id {layer_id!r} — expected one of {list(_LAYER_BUILDERS)}"
        )
    return builder(layer, scene or {})


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

    # Load the scene entry so the per-layer prompt builders can use biome,
    # description, etc. as context.
    scenes_path = project_root / "assets" / "scenes.json"
    scene: dict = {}
    if scenes_path.exists():
        for s in json.loads(scenes_path.read_text(encoding="utf-8")):
            if s.get("id") == args.scene_id:
                scene = s
                break

    # New layout: every layer gets its own bg-{layer}/ directory with
    # final.png + final.atlas.json + sidecar prompt/seed at the top
    # level. (Mid/near additionally have segments/ + merge-steps/ but
    # those are produced by the segmented pipeline.) bg-far is
    # single-image so it just needs final.* + sidecars.
    out_dir = project_root / "assets" / "scenes" / args.scene_id
    layer_dir = out_dir / f"bg-{args.layer}"
    layer_dir.mkdir(parents=True, exist_ok=True)
    png_path = layer_dir / "final.png"
    atlas_path = layer_dir / "final.atlas.json"
    prompt_path = layer_dir / "final.prompt.txt"
    seed_path = layer_dir / "final.seed.txt"

    # Per-layer base-reference selection.
    # - far  : the extracted slice is misleading (it's contaminated with
    #          mid-distance trees from the concept). Use concept.png + style
    #          anchor and let the prompt drive the look. Optionally use
    #          visual-target.png as a secondary ref.
    # - mid  : extracted slice is helpful — it shows the concept's actual
    #          mid-distance silhouette content.
    # - near : extracted slice is helpful — the concept's foreground edge
    #          is the most direct anchor.
    layer_id_norm = (args.layer or "").lower()
    extracted = out_dir / "extracted" / f"bg-{args.layer}.png"
    concept = out_dir / "concept.png"
    visual_target = project_root / "assets" / "visual-target.png"

    base_ref: Path
    caller_refs: list[Path] = []

    if layer_id_norm == "far":
        if not concept.exists():
            raise SystemExit(f"need {concept} as far-layer base reference")
        base_ref = concept
        if visual_target.exists():
            caller_refs.append(visual_target)
    else:
        if extracted.exists():
            base_ref = extracted
        elif concept.exists():
            base_ref = concept
        else:
            raise SystemExit(
                f"need either {extracted} or {concept} as a base reference"
            )

    # The macro silhouette (from 02-stage) anchors the entire map's
    # elevation profile and biome bands. Pass it as a secondary reference
    # whenever it exists so the back wall matches the silhouette's horizon
    # line and the playable area's terrain shape.
    silhouette_png = out_dir / "map.silhouette.png"
    if silhouette_png.exists():
        caller_refs.append(silhouette_png)

    blend_with = layer.get("blend_with_above")
    if blend_with:
        sibling_png = out_dir / f"bg-{blend_with}" / "final.png"
        if sibling_png.exists():
            caller_refs.append(sibling_png)

    extra_refs = attach_style_anchor(
        caller_refs, project_root, scene_id=args.scene_id
    )

    prompt = build_prompt(layer, transparent, scene)
    backend = active_backend()
    cost = budget.cost_for_image(backend)

    sys.stderr.write(
        f"[bg-{args.layer} {args.scene_id}] backend={backend} cost={cost}c "
        f"transparent={transparent} blend_with={blend_with} "
        f"base={base_ref.relative_to(project_root)}\n"
    )

    # Resolve target size from stage.json first, scene-plan second, API
    # native last. Used both to set the API aspect ratio (so we don't
    # generate a 3:2 image for a 13:1 wide map) and to resize after.
    stage_path = project_root / "assets" / "scenes" / args.scene_id / "stage.json"
    target_size = None
    if stage_path.exists():
        try:
            stage = json.loads(stage_path.read_text(encoding="utf-8"))
            bg = (stage or {}).get("background") or {}
            tw = bg.get("target_width_px")
            th = bg.get("target_height_px")
            if isinstance(tw, int) and isinstance(th, int) and tw > 0 and th > 0:
                target_size = [tw, th]
        except Exception:
            target_size = None
    if target_size is None:
        target_size = layer.get("target_size") or [NATIVE_W, NATIVE_H]

    # Pick the closest stable Gemini native size for our target's aspect.
    # Gemini's stable region is 1024-1536 wide, 768-1024 tall. Going wider
    # than 16:9 by a lot causes drift; cap at 16:9 and rely on the post-
    # generation resize for the rest. For very wide maps (>2× native), the
    # one-shot far layer is upscaled — the validator catches the drift
    # and a regen with the wider aspect ratio usually fixes it.
    aspect = target_size[0] / max(target_size[1], 1)
    if aspect >= 13 / 9 and aspect <= 17 / 9:
        api_w, api_h, api_aspect = 1536, 864, "16:9"
    elif aspect >= 17 / 9:
        api_w, api_h, api_aspect = 1536, 768, "16:9"  # Gemini caps wide
    elif aspect >= 11 / 9:
        api_w, api_h, api_aspect = 1536, 1024, "3:2"
    else:
        api_w, api_h, api_aspect = NATIVE_W, NATIVE_H, API_ASPECT

    with budget.charged(
        project_root, cost, f"image-{backend}",
        note=f"{args.scene_id}/bg-{args.layer}",
    ):
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            base_ref,
            extra_refs,
            seed=args.seed,
            aspect_ratio=api_aspect,
            resolution=(api_w, api_h),
        )

    img = Image.open(io.BytesIO(img_bytes))
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
