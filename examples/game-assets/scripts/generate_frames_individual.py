#!/usr/bin/env python3
"""
generate_frames_individual.py — Generate sprite frames individually, then composite into sheet.

Standard game dev pipeline:
1. Generate each frame separately (no grid, clean sprites)
2. Composite frames into sprite sheet
3. Output sheet + atlas JSON

Usage:
  python scripts/generate_frames_individual.py <char_id> <state> [--resolution 256] [--frames 4]

Outputs:
  spritesheets/{char_id}/{state}.png     # Clean sprite sheet (no grid)
  spritesheets/{char_id}/{state}.atlas.json  # Frame coords
  spritesheets/{char_id}/{state}/{frame}.png  # Individual frames (optional)
"""

from __future__ import annotations

import argparse
import json
import sys
import io
from pathlib import Path

from PIL import Image

from lib.image_api import generate_image
from lib.sprite import find_project_root


def build_frame_prompt(
    info_path: Path,
    char_name: str,
    state: str,
    frame_index: int,
    total_frames: int,
    palette: str,
    resolution: int,
) -> str:
    """Build prompt for a single frame. AI reads info file for context."""
    lines = []
    lines.append(f"INFO FILE: {info_path}")
    lines.append(f"")
    lines.append(f"ANIMATION: {state}")
    lines.append(f"  Frame {frame_index + 1} of {total_frames}")
    lines.append(f"  Character: {char_name}")
    lines.append(f"  Resolution: {resolution}x{resolution}")
    lines.append(f"  Palette: {palette}")
    lines.append(f"")
    lines.append(f"TASK: Generate ONE single sprite frame.")
    lines.append(f"OUTPUT: One {resolution}x{resolution} pixel art image. Nothing else.")

    return "\n".join(lines)


def write_frame_info(out_dir: Path, char_id: str, char_name: str, state: str, palette: str, resolution: int, frame_index: int, total_frames: int) -> Path:
    """Write frame info to JSON file for reference."""
    info = {
        "char_id": char_id,
        "char_name": char_name,
        "state": state,
        "frame_index": frame_index,
        "total_frames": total_frames,
        "resolution": resolution,
        "palette": palette,
    }
    info_path = out_dir / f"{state}_{frame_index:03d}.info.json"
    info_path.write_text(json.dumps(info, indent=2), encoding="utf-8")
    return info_path


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id", help="Character ID (e.g., hero-knight)")
    ap.add_argument("state", help="Animation state (e.g., idle, walk)")
    ap.add_argument("--resolution", type=int, default=256, help="Sprite resolution. Default: 256")
    ap.add_argument("--frames", type=int, default=4, help="Number of frames. Default: 4")
    ap.add_argument("--cols", type=int, default=4, help="Sprites per row. Default: 4")
    ap.add_argument("--seed", type=int, default=None, help="Random seed")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())

    # Load sprites.json
    sprites_file = project_root / "assets" / "sprites.json"
    if not sprites_file.exists():
        sprites_file = project_root / "sprites.json"

    sprites_data = []
    if sprites_file.exists():
        sprites_data = json.loads(sprites_file.read_text(encoding="utf-8"))

    char_info = None
    for sprite in sprites_data:
        if sprite.get("id") == args.char_id:
            char_info = sprite
            break

    if not char_info:
        print(f"Error: Character '{args.char_id}' not found in sprites.json", file=sys.stderr)
        return 1

    char_name = char_info.get("name", args.char_id)
    palette = char_info.get("palette", "16-bit retro pixel art")
    frame_count = args.frames
    resolution = args.resolution
    cols = args.cols
    rows = (frame_count + cols - 1) // cols

    # Find character ref and pose for animation angle
    ref_path = None
    pose_path = None
    for p in [
        project_root / "assets" / "characters" / args.char_id / "ref" / "ref.png",
        project_root / "assets" / "characters" / args.char_id / "ref.png",
        project_root / "characters" / args.char_id / "ref.png",
    ]:
        if p.exists():
            ref_path = p
            break

    # Select pose based on animation state
    pose_angle = "side" if args.state == "walk" else "front"
    pose_path = project_root / "assets" / "characters" / args.char_id / "poses" / f"{pose_angle}.png"

    if not ref_path:
        print(f"Error: Character ref not found for {args.char_id}", file=sys.stderr)
        return 1

    # Use pose as additional reference if available
    reference_paths = [ref_path]
    if pose_path.exists():
        reference_paths.append(pose_path)

    # Output directories
    out_dir = project_root / "spritesheets" / args.char_id
    frames_dir = out_dir / args.state / "frames"
    out_dir.mkdir(parents=True, exist_ok=True)
    frames_dir.mkdir(parents=True, exist_ok=True)

    print(f"Generating {frame_count} frames for {char_name} / {args.state}...")

    frame_images = []
    for i in range(frame_count):
        info_path = write_frame_info(frames_dir, args.char_id, char_name, args.state, palette, resolution, i, frame_count)
        prompt = build_frame_prompt(info_path, char_name, args.state, i, frame_count, palette, resolution)

        print(f"  Frame {i + 1}/{frame_count}...")
        img_bytes, seed_used = generate_image(
            prompt,
            reference_paths=reference_paths,
            seed=args.seed,
            resolution=resolution,
            resize_to_resolution=True,
        )

        frame_path = frames_dir / f"{args.state}_{i:03d}.png"
        frame_path.write_bytes(img_bytes)
        print(f"    wrote {frame_path.name} seed={seed_used}")

        frame_images.append(Image.open(io.BytesIO(img_bytes)))

    # Composite into sprite sheet
    sheet_w = cols * resolution
    sheet_h = rows * resolution
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    for i, frame in enumerate(frame_images):
        row = i // cols
        col = i % cols
        x = col * resolution
        y = row * resolution
        sheet.paste(frame, (x, y))

    # Save sprite sheet
    sheet_path = out_dir / f"{args.state}.png"
    sheet.save(sheet_path, "PNG", optimize=True)
    print(f"wrote {sheet_path} ({sheet_w}x{sheet_h})")

    # Save atlas JSON
    atlas = {
        "frame_count": frame_count,
        "sprites_per_row": cols,
        "sprite_resolution": resolution,
        "sheet_dimensions": {"width": sheet_w, "height": sheet_h},
        "animation_state": args.state,
        "frames": [
            {
                "index": i,
                "row": i // cols,
                "col": i % cols,
                "x": (i % cols) * resolution,
                "y": (i // cols) * resolution,
            }
            for i in range(frame_count)
        ],
    }
    atlas_path = out_dir / f"{args.state}.atlas.json"
    atlas_path.write_text(json.dumps(atlas, indent=2), encoding="utf-8")
    print(f"wrote {atlas_path}")

    # Save frames.json for compatibility
    frames_data = {
        "frames": [
            {
                "filename": f"{args.state}_{i:03d}.png",
                "frame": {
                    "x": (i % cols) * resolution,
                    "y": (i // cols) * resolution,
                    "w": resolution,
                    "h": resolution,
                }
            }
            for i in range(frame_count)
        ]
    }
    frames_json_path = frames_dir / "frames.json"
    frames_json_path.write_text(json.dumps(frames_data, indent=2), encoding="utf-8")
    print(f"wrote {frames_json_path}")

    print(f"\nDone! Generated clean sprite sheet with {frame_count} frames.")
    return 0


if __name__ == "__main__":
    sys.exit(main())