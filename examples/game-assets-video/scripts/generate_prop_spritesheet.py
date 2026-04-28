#!/usr/bin/env python3
"""
generate_prop_spritesheet.py — Single image-gen call draws a 4x4 prop sheet.

Analog of generate_spritesheet.py for items / hazards / interactive props
defined in assets/objects.json. Draws all 16 frames in one image for inter-
frame consistency.

Differences from the character version:
  - No canonical-angle character reference. Uses a green-screen template
    PNG (.templates/green_<size>.png) as base ref.
  - No lazy variant-pose pipeline (props don't have action variants).
  - State="idle" prefers the `prop_idle` keyframe table over `idle` so
    items hover/shimmer instead of breathing like characters.

Usage:
  python scripts/generate_prop_spritesheet.py <obj_id> <state> [--seed N]

Outputs:
  assets/objects/{obj_id}/spritesheets/{state}/{state}.png
  assets/objects/{obj_id}/spritesheets/{state}/{state}.atlas.json
  assets/objects/{obj_id}/spritesheets/{state}/{state}.prompt.txt
  assets/objects/{obj_id}/spritesheets/{state}/{state}.seed.txt
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib import budget
from lib.image_api import generate_image_with_edit, active_backend
from lib.keyframes import KEYFRAMES, get_keyframes, keyframes_for_prop, playback_for_state
from lib.prompts import build_grid_prompt
from lib.sprite import align_frames_in_sheet, detect_grid_layout, find_project_root
from lib.style_anchor import attach_style_anchor


# Same 4×2 grid as character sheets — see generate_spritesheet.py header
# for why we settled on this layout (gpt-image-1 silently dropped a row at
# 4×4). Sheet maps to a native gpt-image-1 size (1536×1024 = 3:2) so no
# resize/distortion happens.
COLS = 4
ROWS = 2
SHEET_W = 1536
SHEET_H = 1024
FRAME_W = SHEET_W // COLS  # 384
FRAME_H = SHEET_H // ROWS  # 512
EXPECTED_FRAMES = COLS * ROWS  # 8
API_ASPECT = "4:3"


DEFAULT_PALETTE = "16-bit retro pixel art, limited to 16 colors"
DEFAULT_PALETTE_CONSTRAINTS = (
    "Use a tight 16-color palette appropriate for the prop's material "
    "(metal, glass, wood, stone). No green pixels in the prop itself "
    "(green is the chroma-key background)."
)


def load_prop(project_root: Path, obj_id: str, scene_id: str | None = None) -> dict:
    """Find a prop manifest entry.

    Lookup order:
      1. If `scene_id` is given, look in `scenes.json[scene].scene_props`
         (per-scene scene-only props).
      2. Otherwise try `objects-shared.json` (new layout for shared/cross-
         scene props), then `objects.json` (legacy fallback).
    """
    if scene_id:
        scenes_file = project_root / "assets" / "scenes.json"
        if scenes_file.exists():
            scenes = json.loads(scenes_file.read_text(encoding="utf-8"))
            scene = next((s for s in scenes if s.get("id") == scene_id), None)
            if scene is None:
                raise SystemExit(f"scene '{scene_id}' not found in scenes.json")
            for obj in scene.get("scene_props", []):
                if obj.get("id") == obj_id:
                    return obj
            raise SystemExit(
                f"Prop '{obj_id}' not found in scene '{scene_id}' scene_props"
            )

    for fname in ("objects-shared.json", "objects.json"):
        path = project_root / "assets" / fname
        if not path.exists():
            continue
        objects_data = json.loads(path.read_text(encoding="utf-8"))
        for obj in objects_data:
            if obj.get("id") == obj_id:
                return obj
    raise SystemExit(
        f"Prop '{obj_id}' not found in objects-shared.json or objects.json"
    )


def keyframes_for_prop_state(state: str) -> list[str]:
    """Pick the right pose table for a prop state.

    `idle` maps to the prop-specific `prop_idle` cycle when available;
    everything else uses get_keyframes(state) directly (which raises if
    the state has no entry — so a typo fails loudly).
    """
    if state == "idle" and "prop_idle" in KEYFRAMES:
        return KEYFRAMES["prop_idle"]
    return get_keyframes(state)


def load_catalog_entry(project_root: Path, obj_id: str) -> dict | None:
    """Find the prop's entry in `assets/catalog.json`, if it exists.

    Catalog is canonical for `animation_type` + `keyframes_id` once
    01c-catalog-spec has run. Returns None if catalog absent or entry
    missing — caller falls back to manifest fields / category defaults.
    """
    cat_path = project_root / "assets" / "catalog.json"
    if not cat_path.exists():
        return None
    try:
        cat = json.loads(cat_path.read_text(encoding="utf-8"))
    except Exception:
        return None
    for entry in cat.get("shared_props", []):
        if entry.get("id") == obj_id:
            return entry
    return None


_CATEGORY_ANIMATION_DEFAULTS = {
    "hazard": ("trigger", None),
    "interactive": ("trigger", "activate"),
    "item": ("loop", "prop_idle"),
    "decoration": ("static", None),
    "ui": ("static", None),
}


def resolve_animation_intent(
    obj: dict, catalog_entry: dict | None, state: str,
) -> tuple[str, str | None]:
    """Determine (animation_type, keyframes_id) for this prop.

    Resolution order (first non-None wins):
      1. catalog.json[shared_props[id]] — canonical
      2. obj["animation_type"] / obj["keyframes_id"] — manual override
         in objects.json
      3. category-based defaults — hazard→trigger, item→loop,
         decoration/ui→static

    The state string influences the fallback only — for non-idle states
    we trust whatever keyframes_id the manifest declares (or get_keyframes
    via the keyframes_for_prop helper).
    """
    atype: str | None = None
    kf: str | None = None
    if catalog_entry:
        atype = catalog_entry.get("animation_type")
        kf = catalog_entry.get("keyframes_id")
    if not atype:
        atype = obj.get("animation_type")
    if not kf:
        kf = obj.get("keyframes_id")
    if not atype:
        category = obj.get("category", obj.get("type", "item"))
        default_atype, default_kf = _CATEGORY_ANIMATION_DEFAULTS.get(
            category, ("loop", "prop_idle")
        )
        atype = default_atype
        if not kf:
            kf = default_kf
    return atype, kf


def find_green_template(project_root: Path, working_resolution: int) -> Path:
    """Locate a green-screen template at-or-above the working resolution.

    The 03-characters pipeline produces .templates/green_128x128.png and
    green_256x256.png via scripts/create_green_template.py. We pick the
    smallest template >= working_resolution (matching the per-frame size,
    not the full sheet — the model upscales as needed).
    """
    templates_dir = project_root / ".templates"
    if not templates_dir.exists():
        raise SystemExit(
            f"No .templates/ directory at {templates_dir}. "
            f"Run scripts/create_green_template.py first."
        )
    candidates = sorted(templates_dir.glob("green_*.png"))
    if not candidates:
        raise SystemExit(f"No green_*.png templates in {templates_dir}")
    for p in candidates:
        # Filename pattern: green_<W>x<H>.png
        try:
            wh = p.stem.split("_", 1)[1]
            w_str = wh.split("x", 1)[0]
            if int(w_str) >= working_resolution:
                return p
        except (IndexError, ValueError):
            continue
    return candidates[-1]  # fall back to the largest available


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("obj_id", help="Prop ID (must exist in objects manifest)")
    ap.add_argument("state", help="Animation state (must exist in lib/keyframes.py)")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument(
        "--scene-concept", default=None,
        help="Path to a scene concept image, added as a secondary reference so the prop matches the scene's palette and depth.",
    )
    ap.add_argument(
        "--out-root", default=None,
        help="Override output root. Default: assets/objects/{obj_id}. Pass e.g. assets/scenes/{scene_id}/props/{obj_id} for per-scene props.",
    )
    ap.add_argument(
        "--scene-id", default=None,
        help="When set, look up the prop in scenes.json[scene].scene_props instead of objects-shared.json/objects.json.",
    )
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    obj = load_prop(project_root, args.obj_id, scene_id=args.scene_id)

    obj_name = obj["name"]
    obj_description = obj.get("description", obj_name)
    category = obj.get("category", obj.get("type", "item"))
    palette = obj.get("palette", "")  # empty → preset's palette_guidance fills in
    palette_constraints = obj.get("palette_constraints", DEFAULT_PALETTE_CONSTRAINTS)
    art_style = obj.get("art_style")

    catalog_entry = load_catalog_entry(project_root, args.obj_id)
    animation_type, keyframes_id = resolve_animation_intent(obj, catalog_entry, args.state)

    if animation_type == "static":
        return _generate_static_sheet(
            args, obj, project_root,
            obj_name=obj_name, obj_description=obj_description,
            category=category, palette=palette,
            palette_constraints=palette_constraints, art_style=art_style,
        )

    keyframes = keyframes_for_prop(keyframes_id, animation_type, args.state)
    if not keyframes:
        raise SystemExit(f"No keyframes resolved for prop '{args.obj_id}' state '{args.state}'")
    if len(keyframes) != EXPECTED_FRAMES:
        raise SystemExit(
            f"Prop '{args.obj_id}' state '{args.state}' resolved to {len(keyframes)} keyframes "
            f"(keyframes_id={keyframes_id!r}, animation_type={animation_type!r}) but the "
            f"{COLS}×{ROWS} sheet layout needs exactly {EXPECTED_FRAMES}. "
            f"Update scripts/lib/keyframes.py."
        )
    n = len(keyframes)

    base_ref_path = find_green_template(project_root, FRAME_W)

    if args.out_root:
        out_dir = Path(args.out_root) / "spritesheets" / args.state
    else:
        out_dir = project_root / "assets" / "objects" / args.obj_id / "spritesheets" / args.state
    out_dir.mkdir(parents=True, exist_ok=True)
    sheet_path = out_dir / f"{args.state}.png"
    atlas_path = out_dir / f"{args.state}.atlas.json"
    prompt_path = out_dir / f"{args.state}.prompt.txt"
    seed_path = out_dir / f"{args.state}.seed.txt"

    caller_refs: list[Path] = []
    if args.scene_concept:
        caller_refs.append(Path(args.scene_concept))
    # Concept-driven asset extraction: scene props sit on the ground in the
    # foreground, so the extracted near-layer crop is the closest match.
    # Attaching it as a reference makes the prop's lighting and texture
    # match whatever the concept image actually showed at ground level.
    if args.scene_id:
        extracted_near = (
            project_root / "assets" / "scenes" / args.scene_id
            / "extracted" / "bg-near.png"
        )
        if extracted_near.exists():
            caller_refs.append(extracted_near)
    # Universal style anchor (style-sheet + scene concept) takes precedence:
    # this is the project-wide reference that locks every prop to the same
    # rendering style. Without it, parallel prop calls produce wildly
    # different art (3D metal, photoreal stone, cartoon ink, painted).
    extra_refs = attach_style_anchor(caller_refs, project_root, scene_id=args.scene_id)

    height_tiles = obj.get("height_tiles")  # may be None if author didn't declare

    # Subject string includes the description so the model has enough to
    # draw the prop without a real reference image (the base ref is just
    # a green template). Category hints animation behavior.
    subject = f"{obj_name} ({category}) — {obj_description}"

    extra_critical = [
        "The subject is a small game prop, not a character — no face, no limbs unless described",
        "Frame the prop centered in each cell with consistent scale and ground-shadow placement",
    ]
    if category == "hazard":
        extra_critical.append(
            "Active states must read as DANGEROUS at a glance (sharp silhouette, warning colors)"
        )
    # NOTE: prop scale is enforced post-process via lib.scale.lock_subject_height
    # (called after generation, before atlas write — see end of main()). We do
    # NOT ask the model to match a specific tile height in the prompt;
    # instructing image-gen on pixel sizes is unreliable.

    playback = playback_for_state(args.state)

    prompt = build_grid_prompt(
        subject=subject,
        state=args.state,
        palette=palette,
        palette_constraints=palette_constraints,
        keyframes=keyframes,
        frame_width=FRAME_W,
        frame_height=FRAME_H,
        cols=COLS,
        rows=ROWS,
        viewing_angle=None,  # props have no canonical angle
        art_style=art_style,
        frame_rate=playback["frameRate"],
        extra_critical_instructions=extra_critical,
    )

    print(
        f"[{args.obj_id}] generating {args.state} prop sheet at {SHEET_W}x{SHEET_H} "
        f"({COLS}x{ROWS} grid of {FRAME_W}x{FRAME_H}) base={base_ref_path.relative_to(project_root)}",
        file=sys.stderr,
    )

    # Retry on layout drift, same shape as generate_spritesheet.py.
    MAX_RETRIES = 2
    img_bytes = None
    seed_used = None
    layout = None
    backend = active_backend()
    cost = budget.cost_for_image(backend)
    for attempt in range(MAX_RETRIES + 1):
        with budget.charged(project_root, cost, f"image-{backend}",
                            note=f"{args.obj_id}/prop-{args.state} attempt {attempt + 1}"):
            img_bytes, seed_used = generate_image_with_edit(
                prompt,
                base_ref_path,
                extra_refs,
                seed=args.seed if attempt == 0 else None,
                aspect_ratio=API_ASPECT,
                resolution=(SHEET_W, SHEET_H),
            )
        layout = detect_grid_layout(img_bytes, expected_cols=COLS, expected_rows=ROWS)
        if (layout["cols"], layout["rows"]) == (COLS, ROWS):
            break
        if attempt < MAX_RETRIES:
            print(
                f"  ⚠ attempt {attempt + 1}: model produced {layout['cols']}×{layout['rows']} "
                f"(requested {COLS}×{ROWS}). Retrying with a fresh seed…",
                file=sys.stderr,
            )

    prompt_path.write_text(prompt, encoding="utf-8")
    seed_path.write_text(str(seed_used), encoding="utf-8")

    actual_cols = layout["cols"]
    actual_rows = layout["rows"]
    actual_n = actual_cols * actual_rows
    if not layout["detected"]:
        print(
            f"  ⚠ grid detection found no opacity bands — falling back to "
            f"{actual_cols}×{actual_rows} hint",
            file=sys.stderr,
        )
    elif (actual_cols, actual_rows) != (COLS, ROWS):
        print(
            f"  ⚠ requested {COLS}×{ROWS} but model produced {actual_cols}×{actual_rows} "
            f"({actual_n} frames). Atlas will match the detected layout.",
            file=sys.stderr,
        )

    aligned_bytes, anchors = align_frames_in_sheet(img_bytes, actual_cols, actual_rows)
    sheet_path.write_bytes(aligned_bytes)

    atlas = {
        "image": sheet_path.name,
        "meta": {
            "obj_id": args.obj_id,
            "state": args.state,
            "category": category,
            "rows": actual_rows,
            "cols": actual_cols,
            "frame_count": actual_n,
            "frame_size": layout["frame_size"],
            "sheet_size": layout["sheet_size"],
            "frame_order": "left-to-right, top-to-bottom",
            "requested_cols": COLS,
            "requested_rows": ROWS,
            "detected": layout["detected"],
            "aligned": True,
            "frameRate": playback["frameRate"],
            "yoyo": playback["yoyo"],
            "seed": seed_used,
        },
        "frames": [
            {
                "filename": f"{args.state}_{i:03d}.png",
                "frame": f["frame"],
                "anchor": anchors[i] if i < len(anchors) else None,
            }
            for i, f in enumerate(layout["frames"])
        ],
    }
    atlas_path.write_text(json.dumps(atlas, indent=2), encoding="utf-8")

    print(
        f"  wrote {sheet_path.relative_to(project_root)} + {atlas_path.name} (seed={seed_used})",
        file=sys.stderr,
    )
    return 0


# Static sheet layout (for animation_type="static"). One frame on a
# square canvas the model can draw at native size.
STATIC_SHEET_W = 1024
STATIC_SHEET_H = 1024
STATIC_API_ASPECT = "1:1"


def _build_static_prompt(
    *, subject: str, palette: str, palette_constraints: str,
    art_style: str | None, extra_critical: list[str],
) -> str:
    """One-frame static prop prompt. No grid, no animation cycle —
    just the prop centered on chroma green, ready to be keyed."""
    from lib.art_styles import get_preset
    preset = get_preset(art_style)
    style_desc = preset["style_description"]
    palette_text = palette or preset["palette_guidance"]
    negatives = preset.get("negative_directives", [])
    negatives_block = "\n".join(f"- {n}" for n in negatives) if negatives else "- (none)"
    extra_block = "\n".join(f"- {c}" for c in extra_critical) if extra_critical else "- (none)"
    return f"""Single static game prop, ONE subject centered on a pure chroma-green (#00FF00) background.
NOT an animation cycle. NOT a grid. NOT multiple frames. ONE prop, ONE pose, ONE image.

Subject:
{subject}

Art style (mandatory):
{style_desc}

Palette:
{palette_text}

{palette_constraints}

Composition:
- Centered in the frame, occupying ~70% of the canvas.
- Soft drop shadow on the ground beneath the prop.
- Pure #00FF00 background — no gradients, no scenery, no other objects.
- Top-left soft key light (consistent with the style-sheet anchor).

Critical:
{extra_block}

Negative directives:
{negatives_block}
- Do NOT draw a grid, multiple cells, frame numbers, captions, or animation phases.
- Do NOT draw any background scenery — the bg is pure chroma green only.
"""


def _generate_static_sheet(
    args, obj: dict, project_root: Path, *,
    obj_name: str, obj_description: str, category: str,
    palette: str, palette_constraints: str, art_style: str | None,
) -> int:
    """Static-prop branch: 1×1 sheet, single image-gen call.

    Same output shape as the 4×2 path so downstream consumers don't
    branch — atlas declares `meta.cols=1, rows=1, frame_count=1` and
    the PNG is `{state}.png` with a single frame rect covering the
    full canvas.
    """
    if args.out_root:
        out_dir = Path(args.out_root) / "spritesheets" / args.state
    else:
        out_dir = project_root / "assets" / "objects" / args.obj_id / "spritesheets" / args.state
    out_dir.mkdir(parents=True, exist_ok=True)
    sheet_path = out_dir / f"{args.state}.png"
    atlas_path = out_dir / f"{args.state}.atlas.json"
    prompt_path = out_dir / f"{args.state}.prompt.txt"
    seed_path = out_dir / f"{args.state}.seed.txt"

    caller_refs: list[Path] = []
    if args.scene_concept:
        caller_refs.append(Path(args.scene_concept))
    if args.scene_id:
        extracted_near = (
            project_root / "assets" / "scenes" / args.scene_id
            / "extracted" / "bg-near.png"
        )
        if extracted_near.exists():
            caller_refs.append(extracted_near)
    extra_refs = attach_style_anchor(caller_refs, project_root, scene_id=args.scene_id)

    subject = f"{obj_name} ({category}) — {obj_description}"
    extra_critical = [
        "The subject is a small game prop, not a character — no face, no limbs unless described",
        "Frame the prop centered with consistent scale and ground-shadow placement",
    ]

    prompt = _build_static_prompt(
        subject=subject,
        palette=palette,
        palette_constraints=palette_constraints,
        art_style=art_style,
        extra_critical=extra_critical,
    )

    base_ref_path = find_green_template(project_root, STATIC_SHEET_W)
    backend = active_backend()
    cost = budget.cost_for_image(backend)

    print(
        f"[{args.obj_id}] generating {args.state} STATIC prop (1x1) at "
        f"{STATIC_SHEET_W}x{STATIC_SHEET_H} backend={backend} cost={cost}c",
        file=sys.stderr,
    )

    with budget.charged(
        project_root, cost, f"image-{backend}",
        note=f"{args.obj_id}/static-{args.state}",
    ):
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            base_ref_path,
            extra_refs,
            seed=args.seed,
            aspect_ratio=STATIC_API_ASPECT,
            resolution=(STATIC_SHEET_W, STATIC_SHEET_H),
        )

    sheet_path.write_bytes(img_bytes)
    prompt_path.write_text(prompt, encoding="utf-8")
    seed_path.write_text(str(seed_used), encoding="utf-8")

    playback = playback_for_state(args.state)
    atlas = {
        "image": sheet_path.name,
        "meta": {
            "obj_id": args.obj_id,
            "state": args.state,
            "category": category,
            "rows": 1,
            "cols": 1,
            "frame_count": 1,
            "frame_size": {"w": STATIC_SHEET_W, "h": STATIC_SHEET_H},
            "sheet_size": {"w": STATIC_SHEET_W, "h": STATIC_SHEET_H},
            "frame_order": "single",
            "requested_cols": 1,
            "requested_rows": 1,
            "detected": False,
            "aligned": False,
            "animation_type": "static",
            "frameRate": playback["frameRate"],
            "yoyo": False,
            "seed": seed_used,
        },
        "frames": [
            {
                "filename": f"{args.state}_000.png",
                "frame": {"x": 0, "y": 0, "w": STATIC_SHEET_W, "h": STATIC_SHEET_H},
                "anchor": None,
            }
        ],
    }
    atlas_path.write_text(json.dumps(atlas, indent=2), encoding="utf-8")
    print(
        f"  wrote {sheet_path.relative_to(project_root)} + {atlas_path.name} "
        f"(static, 1 frame, seed={seed_used})",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
