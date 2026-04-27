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

from lib.image_api import generate_image_with_edit
from lib.keyframes import KEYFRAMES, get_keyframes, playback_for_state
from lib.prompts import build_grid_prompt
from lib.sprite import align_frames_in_sheet, detect_grid_layout, find_project_root


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


def load_prop(project_root: Path, obj_id: str) -> dict:
    objects_file = project_root / "assets" / "objects.json"
    objects_data = json.loads(objects_file.read_text(encoding="utf-8"))
    for obj in objects_data:
        if obj.get("id") == obj_id:
            return obj
    raise SystemExit(f"Prop '{obj_id}' not found in {objects_file}")


def keyframes_for_prop_state(state: str) -> list[str]:
    """Pick the right pose table for a prop state.

    `idle` maps to the prop-specific `prop_idle` cycle when available;
    everything else uses get_keyframes(state) directly (which raises if
    the state has no entry — so a typo fails loudly).
    """
    if state == "idle" and "prop_idle" in KEYFRAMES:
        return KEYFRAMES["prop_idle"]
    return get_keyframes(state)


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
    ap.add_argument("obj_id", help="Prop ID (must exist in assets/objects.json)")
    ap.add_argument("state", help="Animation state (must exist in lib/keyframes.py)")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    obj = load_prop(project_root, args.obj_id)

    obj_name = obj["name"]
    obj_description = obj.get("description", obj_name)
    category = obj.get("category", obj.get("type", "item"))
    palette = obj.get("palette", "")  # empty → preset's palette_guidance fills in
    palette_constraints = obj.get("palette_constraints", DEFAULT_PALETTE_CONSTRAINTS)
    art_style = obj.get("art_style")

    base_keyframes = keyframes_for_prop_state(args.state)
    if not base_keyframes:
        raise SystemExit(f"No keyframes defined for state '{args.state}'")
    if len(base_keyframes) != EXPECTED_FRAMES:
        raise SystemExit(
            f"Prop state '{args.state}' has {len(base_keyframes)} keyframes but "
            f"the {COLS}×{ROWS} sheet layout needs exactly {EXPECTED_FRAMES}. "
            f"Update scripts/lib/keyframes.py."
        )
    keyframes = base_keyframes
    n = len(keyframes)

    base_ref_path = find_green_template(project_root, FRAME_W)

    out_dir = project_root / "assets" / "objects" / args.obj_id / "spritesheets" / args.state
    out_dir.mkdir(parents=True, exist_ok=True)
    sheet_path = out_dir / f"{args.state}.png"
    atlas_path = out_dir / f"{args.state}.atlas.json"
    prompt_path = out_dir / f"{args.state}.prompt.txt"
    seed_path = out_dir / f"{args.state}.seed.txt"

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
    for attempt in range(MAX_RETRIES + 1):
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            base_ref_path,
            [],
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


if __name__ == "__main__":
    sys.exit(main())
