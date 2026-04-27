#!/usr/bin/env python3
"""
generate_spritesheet.py — Single image-gen call draws a 4×2 sprite sheet.

The animation pipeline used to draw frames individually and composite
them, which produced jittery, drifting cycles. Drawing the whole sheet in
one call gives the model full inter-frame consistency for free.

Layout: 4 columns × 2 rows = 8 frames, each pose drawn once. Sheet is
1536×1024 (the closest 3:2 size gpt-image-1 supports natively); cells are
384×512 each. We landed on 4×2 after observing that gpt-image-1 silently
dropped a row when asked for 4×4 — the model lays out 8 cells reliably
but loses track at 16. The 8 unique-pose cycle plays smoother than the
old 16-cell layout that just tiled 4 poses 4× anyway.

Reads char_name / palette / palette_constraints / canonical_angle from
`assets/sprites.json`. Pose descriptions for the state come from
`lib/keyframes.py` (must be exactly 8 entries per state for the new
layout — `working_resolution` is no longer used for sheet sizing).

Usage:
  python scripts/generate_spritesheet.py <char_id> <state> [--seed N]

Outputs:
  assets/characters/{char_id}/spritesheets/{state}/{state}.png        # 1536×1024
  assets/characters/{char_id}/spritesheets/{state}/{state}.atlas.json # 4×2 frame coords
  assets/characters/{char_id}/spritesheets/{state}/{state}.prompt.txt
  assets/characters/{char_id}/spritesheets/{state}/{state}.seed.txt
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib import budget
from lib.image_api import generate_image_with_edit, active_backend
from lib.keyframes import get_keyframes, playback_for_state, variant_for_state, variant_description
from lib.prompts import build_grid_prompt
from lib.sprite import align_frames_in_sheet, detect_grid_layout, find_project_root
from generate_secondary_refs import ensure_variant_ref


# Sheet layout. Locked to one of gpt-image-1's native sizes (1536×1024 = 3:2)
# so we never resize and never distort. 4 cols × 2 rows = 8 cells of 384×512.
COLS = 4
ROWS = 2
SHEET_W = 1536
SHEET_H = 1024
FRAME_W = SHEET_W // COLS  # 384
FRAME_H = SHEET_H // ROWS  # 512
EXPECTED_FRAMES = COLS * ROWS  # 8
API_ASPECT = "4:3"  # 1536×1024 in image_api_openai mapping


def build_sheet_prompt(
    char_name: str,
    state: str,
    palette: str,
    palette_constraints: str,
    canonical_angle: str,
    keyframes: list[str],
    art_style: str | None = None,
    frame_rate: int = 8,
) -> str:
    """Character-specific grid prompt.

    Adds character-only critical instructions ("same face, same armor, same
    weapon") on top of the shared grid prompt builder. `art_style` is a
    preset name from lib/art_styles — None falls back to project default.
    `frame_rate` is the playback fps the model should assume; passed
    through so the smoothness paragraph can compute inter-frame timing.
    """
    return build_grid_prompt(
        subject=char_name,
        state=state,
        palette=palette,
        palette_constraints=palette_constraints,
        keyframes=keyframes,
        frame_width=FRAME_W,
        frame_height=FRAME_H,
        cols=COLS,
        rows=ROWS,
        viewing_angle=canonical_angle,
        art_style=art_style,
        frame_rate=frame_rate,
        extra_critical_instructions=[
            "All frames share identical character identity (same face, same armor, same weapon, same colors)",
        ],
    )


def load_character(project_root: Path, char_id: str) -> dict:
    sprites_file = project_root / "assets" / "sprites.json"
    sprites_data = json.loads(sprites_file.read_text(encoding="utf-8"))
    for sprite in sprites_data:
        if sprite.get("id") == char_id:
            return sprite
    raise SystemExit(f"Character '{char_id}' not found in {sprites_file}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id", help="Character ID (must exist in assets/sprites.json)")
    ap.add_argument("state", help="Animation state (must exist in lib/keyframes.py)")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    char = load_character(project_root, args.char_id)

    char_name = char["name"]
    # palette / palette_constraints are optional now — when absent the active
    # art-style preset (lib/art_styles) supplies sensible defaults.
    palette = char.get("palette", "")
    palette_constraints = char.get("palette_constraints", "")
    canonical_angle = char.get("canonical_angle", "side_right")
    art_style = char.get("art_style")  # None → use project default preset

    base_keyframes = get_keyframes(args.state)
    if not base_keyframes:
        raise SystemExit(f"No keyframes defined for state '{args.state}'")
    if len(base_keyframes) != EXPECTED_FRAMES:
        raise SystemExit(
            f"State '{args.state}' has {len(base_keyframes)} keyframes but "
            f"the {COLS}×{ROWS} sheet layout needs exactly {EXPECTED_FRAMES}. "
            f"Update scripts/lib/keyframes.py."
        )
    keyframes = base_keyframes
    n = len(keyframes)

    # Base reference: usually the canonical (downsized) PNG, but for action
    # states (attack, defend, ...) we lazily build a per-pose variant ref so
    # the model has a closer starting point. variant_for_state returns None
    # for resting states (idle/walk/run) — those edit the canonical directly,
    # which keeps the per-character cost at 1 + N for N animation states.
    canonical_path = project_root / "assets" / "characters" / args.char_id / "ref" / "canonical" / "canonical.png"
    if not canonical_path.exists():
        raise SystemExit(
            f"Canonical reference not found: {canonical_path}\n"
            f"Run first: python scripts/generate_character_angles.py {args.char_id}"
        )

    variant_pose = variant_for_state(args.state)
    if variant_pose:
        base_ref_path = ensure_variant_ref(
            project_root,
            args.char_id,
            variant_pose,
            variant_description(variant_pose),
            seed=args.seed,
        )
    else:
        base_ref_path = canonical_path

    out_dir = project_root / "assets" / "characters" / args.char_id / "spritesheets" / args.state
    out_dir.mkdir(parents=True, exist_ok=True)
    sheet_path = out_dir / f"{args.state}.png"
    atlas_path = out_dir / f"{args.state}.atlas.json"
    prompt_path = out_dir / f"{args.state}.prompt.txt"
    seed_path = out_dir / f"{args.state}.seed.txt"

    # Per-state playback hints (frameRate, yoyo) — used by the prompt
    # smoothness paragraph AND written into the atlas so the showcase
    # picks the right Phaser playback policy without hardcoding.
    playback = playback_for_state(args.state)

    prompt = build_sheet_prompt(
        char_name, args.state, palette, palette_constraints, canonical_angle, keyframes,
        art_style=art_style,
        frame_rate=playback["frameRate"],
    )

    print(
        f"[{args.char_id}] generating {args.state} sprite sheet at {SHEET_W}x{SHEET_H} "
        f"({COLS}x{ROWS} grid of {FRAME_W}x{FRAME_H}) base={base_ref_path.relative_to(project_root)}",
        file=sys.stderr,
    )

    # Generate, then check the detected layout. If the model produced a
    # smaller grid than requested (e.g. 3×2 instead of 4×2), retry up to
    # MAX_RETRIES times — a smaller grid means missing keyframes, which
    # causes a jagged loop. Different seed each retry to break the model's
    # bias toward the same layout.
    MAX_RETRIES = 2
    img_bytes = None
    seed_used = None
    layout = None
    backend = active_backend()
    cost = budget.cost_for_image(backend)
    for attempt in range(MAX_RETRIES + 1):
        with budget.charged(project_root, cost, f"image-{backend}",
                            note=f"{args.char_id}/spritesheet-{args.state} attempt {attempt + 1}"):
            img_bytes, seed_used = generate_image_with_edit(
                prompt,
                base_ref_path,
                [],
                seed=args.seed if attempt == 0 else None,  # let later retries pick a fresh seed
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
            f"  ⚠ accepted {actual_cols}×{actual_rows} after {MAX_RETRIES} retries "
            f"(requested {COLS}×{ROWS}). Atlas will match the detected layout.",
            file=sys.stderr,
        )

    # Re-align each cell so the character is centered horizontally and
    # feet sit at the cell's bottom edge. Without this every frame jitters
    # in x and floats in y by 30–150 px because the model places the pose
    # at a slightly different (x, y) inside each cell.
    aligned_bytes, anchors = align_frames_in_sheet(img_bytes, actual_cols, actual_rows)
    sheet_path.write_bytes(aligned_bytes)

    atlas = {
        "image": sheet_path.name,
        "meta": {
            "char_id": args.char_id,
            "state": args.state,
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
                # Original bbox + shift recorded for debugging / engines
                # that prefer per-frame anchors over visual alignment.
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
